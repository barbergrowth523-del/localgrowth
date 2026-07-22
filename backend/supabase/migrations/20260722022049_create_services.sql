create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  duracao_minutos integer not null default 30 check (duracao_minutos > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists servicos_user_idx on public.servicos(user_id, ativo);
alter table public.servicos enable row level security;
drop policy if exists "Users can view own services" on public.servicos;
create policy "Users can view own services" on public.servicos for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own services" on public.servicos;
create policy "Users can create own services" on public.servicos for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own services" on public.servicos;
create policy "Users can update own services" on public.servicos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own services" on public.servicos;
create policy "Users can delete own services" on public.servicos for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.clientes add column if not exists servico_preferido_id uuid references public.servicos(id) on delete set null;
alter table public.agendamentos add column if not exists servico_id uuid references public.servicos(id) on delete set null;
alter table public.agendamentos drop constraint if exists agendamentos_servico_check;
create index if not exists clientes_servico_preferido_idx on public.clientes(servico_preferido_id);
create index if not exists agendamentos_servico_idx on public.agendamentos(servico_id);