alter table public.clientes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists clientes_user_id_data_idx
  on public.clientes(user_id, data_ultimo_corte);

alter table public.clientes enable row level security;

drop policy if exists "Users can view clients by user id" on public.clientes;
create policy "Users can view clients by user id"
  on public.clientes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert clients by user id" on public.clientes;
create policy "Users can insert clients by user id"
  on public.clientes for insert to authenticated
  with check ((select auth.uid()) = user_id);
