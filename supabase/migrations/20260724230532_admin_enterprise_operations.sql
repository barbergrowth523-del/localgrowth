create table if not exists public.admin_plan_configs (
  plan text primary key check (plan in ('starter', 'pro', 'scale')),
  display_name text not null,
  price_monthly numeric(10,2) not null check (price_monthly >= 0),
  client_limit integer check (client_limit is null or client_limit > 0),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.admin_plan_configs (plan, display_name, price_monthly, client_limit, features)
values
  ('starter', 'Starter', 47, 150, '["QR Code", "Disparos manuais"]'::jsonb),
  ('pro', 'Pro', 97, null, '["Clientes ilimitados", "Resgate automatico", "Painel financeiro"]'::jsonb),
  ('scale', 'Scale', 197, null, '["Multiplos barbeiros", "Relatorios individuais", "Suporte prioritario"]'::jsonb)
on conflict (plan) do nothing;

create table if not exists public.admin_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  discount_percent smallint not null check (discount_percent between 1 and 100),
  duration_days integer not null default 30 check (duration_days between 1 and 365),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 100),
  message text not null check (char_length(message) between 3 and 1000),
  kind text not null default 'info' check (kind in ('info', 'success', 'warning', 'critical')),
  target_plan text check (target_plan is null or target_plan in ('starter', 'pro', 'scale')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('login', 'dashboard_view', 'whatsapp_open')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists admin_coupons_active_expiry_idx on public.admin_coupons (active, expires_at);
create index if not exists admin_broadcasts_delivery_idx on public.admin_broadcasts (status, published_at desc, expires_at);
create index if not exists account_activity_user_event_created_idx on public.account_activity_events (user_id, event_type, created_at desc);

alter table public.admin_plan_configs enable row level security;
alter table public.admin_coupons enable row level security;
alter table public.admin_broadcasts enable row level security;
alter table public.account_activity_events enable row level security;

revoke all on table public.admin_plan_configs, public.admin_coupons, public.admin_broadcasts, public.account_activity_events from anon, authenticated;
grant select, insert, update, delete on table public.admin_plan_configs, public.admin_coupons to authenticated;
grant select, insert, update, delete on table public.admin_broadcasts to authenticated;
grant select, insert on table public.account_activity_events to authenticated;
grant usage, select on sequence public.account_activity_events_id_seq to authenticated;

drop policy if exists admin_plan_configs_admin_all on public.admin_plan_configs;
create policy admin_plan_configs_admin_all on public.admin_plan_configs for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists admin_coupons_admin_all on public.admin_coupons;
create policy admin_coupons_admin_all on public.admin_coupons for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists admin_broadcasts_admin_all on public.admin_broadcasts;
create policy admin_broadcasts_admin_all on public.admin_broadcasts for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists admin_broadcasts_merchant_read on public.admin_broadcasts;
create policy admin_broadcasts_merchant_read on public.admin_broadcasts for select to authenticated
  using (
    status = 'published'
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      target_plan is null
      or target_plan = (select lower(coalesce(p.plano, 'starter')) from public.perfis_barbearia p where p.id = (select auth.uid()))
    )
  );

drop policy if exists account_activity_insert_own on public.account_activity_events;
create policy account_activity_insert_own on public.account_activity_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists account_activity_admin_select on public.account_activity_events;
create policy account_activity_admin_select on public.account_activity_events for select to authenticated
  using ((select private.is_super_admin()));

create or replace function private.prevent_activity_mutation()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  raise exception 'activity events are immutable';
end;
$$;
revoke all on function private.prevent_activity_mutation() from public, anon, authenticated;
drop trigger if exists account_activity_immutable on public.account_activity_events;
create trigger account_activity_immutable before update or delete on public.account_activity_events
for each row execute function private.prevent_activity_mutation();

alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check check (action in (
  'block_access', 'unblock_access', 'grant_courtesy', 'impersonate_preview_opened',
  'change_plan', 'update_support_status', 'update_plan_config', 'create_coupon',
  'bulk_extend_trial', 'publish_broadcast', 'archive_broadcast'
));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_broadcasts'
  ) then
    alter publication supabase_realtime add table public.admin_broadcasts;
  end if;
end $$;
