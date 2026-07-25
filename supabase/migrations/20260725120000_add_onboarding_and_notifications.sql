create table if not exists public.lojista_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  tipo text not null default 'info' check (tipo in ('info', 'sucesso', 'alerta', 'critico')),
  lida_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notificacoes_user_created_idx on public.notificacoes(user_id, created_at desc);
create index if not exists notificacoes_user_unread_idx on public.notificacoes(user_id) where lida_em is null;

alter table public.lojista_onboarding enable row level security;
alter table public.notificacoes enable row level security;

drop policy if exists "onboarding own rows" on public.lojista_onboarding;
create policy "onboarding own rows" on public.lojista_onboarding
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications own rows" on public.notificacoes;
create policy "notifications own rows" on public.notificacoes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications own updates" on public.notificacoes;
create policy "notifications own updates" on public.notificacoes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.lojista_onboarding to authenticated;
grant select, update on public.notificacoes to authenticated;
