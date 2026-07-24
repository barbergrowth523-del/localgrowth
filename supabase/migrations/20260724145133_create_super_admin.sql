alter table public.perfis_barbearia
  add column if not exists role text not null default 'owner'
    check (role in ('owner', 'admin')),
  add column if not exists acesso_bloqueado boolean not null default false,
  add column if not exists cortesia_ate timestamptz;

revoke all (role, acesso_bloqueado, cortesia_ate) on public.perfis_barbearia from anon, authenticated;

update public.perfis_barbearia
set role = 'owner'
where role = 'admin';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
where lower(coalesce(email, '')) <> 'barbergrowth523@gmail.com'
  and coalesce(raw_app_meta_data ->> 'role', '') = 'admin';
update public.perfis_barbearia as profile
set role = 'admin'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = 'barbergrowth523@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = 'barbergrowth523@gmail.com';

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.perfis_barbearia as profile
    where profile.id = (select auth.uid())
      and profile.role = 'admin'
      and profile.acesso_bloqueado = false
  );
$$;

revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated;

alter table public.perfis_barbearia enable row level security;
drop policy if exists perfis_admin_select on public.perfis_barbearia;
create policy perfis_admin_select
  on public.perfis_barbearia
  for select
  to authenticated
  using ((select private.is_super_admin()));

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('block_access', 'unblock_access', 'grant_courtesy', 'impersonate_preview_opened')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from anon, authenticated;

create index if not exists perfis_barbearia_admin_overview_idx
  on public.perfis_barbearia (acesso_bloqueado, plano, created_at desc);
create index if not exists admin_audit_log_admin_created_idx
  on public.admin_audit_log (admin_id, created_at desc);
