create table if not exists public.expedientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  aberto boolean not null default true,
  hora_inicio time not null default '09:00',
  hora_fim time not null default '19:00',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, dia_semana),
  check (hora_fim > hora_inicio)
);
create index if not exists expedientes_user_day_idx on public.expedientes(user_id, dia_semana);
alter table public.expedientes enable row level security;
drop policy if exists "Users can view own business hours" on public.expedientes;
create policy "Users can view own business hours" on public.expedientes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own business hours" on public.expedientes;
create policy "Users can create own business hours" on public.expedientes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own business hours" on public.expedientes;
create policy "Users can update own business hours" on public.expedientes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own business hours" on public.expedientes;
create policy "Users can delete own business hours" on public.expedientes for delete to authenticated using ((select auth.uid()) = user_id);