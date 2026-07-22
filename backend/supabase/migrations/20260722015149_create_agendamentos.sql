create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barbearia_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  data_agendamento date not null,
  hora_agendamento time not null,
  servico text not null check (servico in ('Corte', 'Barba', 'Corte e Barba')),
  status text not null default 'Confirmado' check (status in ('Confirmado', 'Concluido', 'Cancelado')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists agendamentos_user_data_idx on public.agendamentos(user_id, data_agendamento, hora_agendamento);
alter table public.agendamentos enable row level security;

drop policy if exists "Users can view own appointments" on public.agendamentos;
create policy "Users can view own appointments" on public.agendamentos for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own appointments" on public.agendamentos;
create policy "Users can create own appointments" on public.agendamentos for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.clientes where clientes.id = cliente_id and clientes.user_id = (select auth.uid())));
drop policy if exists "Users can update own appointments" on public.agendamentos;
create policy "Users can update own appointments" on public.agendamentos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own appointments" on public.agendamentos;
create policy "Users can delete own appointments" on public.agendamentos for delete to authenticated using ((select auth.uid()) = user_id);