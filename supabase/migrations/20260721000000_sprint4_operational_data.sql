create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  barbearia_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  telefone text not null check (char_length(regexp_replace(telefone, '\\D', '', 'g')) >= 8),
  data_ultimo_corte date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists clientes_barbearia_data_idx on public.clientes(barbearia_id, data_ultimo_corte);
alter table public.clientes enable row level security;
drop policy if exists "Barbeiros podem ver seus clientes" on public.clientes;
create policy "Barbeiros podem ver seus clientes" on public.clientes for select to authenticated using ((select auth.uid()) = barbearia_id);
drop policy if exists "Barbeiros podem inserir seus clientes" on public.clientes;
create policy "Barbeiros podem inserir seus clientes" on public.clientes for insert to authenticated with check ((select auth.uid()) = barbearia_id);

create table if not exists public.historico_disparos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  barbearia_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mensagem_enviada text not null,
  status text not null default 'aberto' check (status in ('aberto', 'enviado', 'erro')),
  enviado_em timestamptz not null default timezone('utc', now())
);
create index if not exists historico_disparos_cliente_data_idx on public.historico_disparos(cliente_id, enviado_em desc);
alter table public.historico_disparos enable row level security;
drop policy if exists "Barbeiros podem ver seu historico" on public.historico_disparos;
create policy "Barbeiros podem ver seu historico" on public.historico_disparos for select to authenticated using ((select auth.uid()) = barbearia_id);
drop policy if exists "Barbeiros podem registrar disparos" on public.historico_disparos;
create policy "Barbeiros podem registrar disparos" on public.historico_disparos for insert to authenticated with check ((select auth.uid()) = barbearia_id and exists (select 1 from public.clientes where clientes.id = cliente_id and clientes.barbearia_id = (select auth.uid())));

create or replace view public.vw_clientes_status with (security_invoker = true) as
select c.id, c.barbearia_id, c.nome, c.telefone, c.data_ultimo_corte,
  case when c.data_ultimo_corte <= current_date - 35 then 'sumido' when c.data_ultimo_corte <= current_date - 25 then 'alerta' else 'em_dia' end as status_calculado
from public.clientes c;
grant select on public.vw_clientes_status to authenticated;
