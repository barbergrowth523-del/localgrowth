-- Security and performance hardening for public booking and tenant data.

alter table public.agendamentos
  add column if not exists avaliacao_token uuid not null default gen_random_uuid();

create unique index if not exists agendamentos_avaliacao_token_key
  on public.agendamentos (avaliacao_token);

create index if not exists agendamentos_barbearia_id_idx
  on public.agendamentos (barbearia_id);

create index if not exists agendamentos_barbeiro_id_idx
  on public.agendamentos (barbeiro_id);

create index if not exists agendamentos_cliente_id_idx
  on public.agendamentos (cliente_id);

create index if not exists agendamentos_equipe_id_idx
  on public.agendamentos (equipe_id);

create unique index if not exists agendamentos_profissional_horario_confirmado_key
  on public.agendamentos (user_id, data_agendamento, hora_agendamento, equipe_id)
  where status = 'Confirmado' and equipe_id is not null;

alter table public.avaliacoes
  drop constraint if exists avaliacoes_estrelas_check;

alter table public.avaliacoes
  add constraint avaliacoes_estrelas_check
  check (estrelas between 1 and 5);

alter table public.agendamentos
  drop constraint if exists agendamentos_nota_avaliacao_check;

alter table public.agendamentos
  add constraint agendamentos_nota_avaliacao_check
  check (nota_avaliacao is null or nota_avaliacao between 1 and 5);

drop policy if exists "Users can view own appointments" on public.agendamentos;

drop policy if exists "Users can insert clients by user id" on public.clientes;
drop policy if exists "Users can view clients by user id" on public.clientes;
drop policy if exists "clientes_delete_own_barbearia" on public.clientes;
drop policy if exists "clientes_insert_own_barbearia" on public.clientes;
drop policy if exists "clientes_select_own_barbearia" on public.clientes;
drop policy if exists "clientes_update_own_barbearia" on public.clientes;
drop policy if exists "Clients are isolated by owner" on public.clientes;
drop policy if exists "Owners can create clients" on public.clientes;
drop policy if exists "Owners can update clients" on public.clientes;
drop policy if exists "Owners can delete clients" on public.clientes;

create policy "Clients are isolated by owner"
  on public.clientes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can create clients"
  on public.clientes
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (barbearia_id is null or barbearia_id = (select auth.uid()))
  );

create policy "Owners can update clients"
  on public.clientes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (barbearia_id is null or barbearia_id = (select auth.uid()))
  );

create policy "Owners can delete clients"
  on public.clientes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create unique index if not exists clientes_user_telefone_key
  on public.clientes (user_id, telefone);

create table if not exists public.api_rate_limits (
  bucket text primary key,
  hits integer not null default 1,
  window_started_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_public_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hits integer;
begin
  if p_bucket is null or length(p_bucket) < 16 or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.api_rate_limits as rate_limit (bucket, hits, window_started_at, updated_at)
  values (p_bucket, 1, now(), now())
  on conflict (bucket) do update
  set
    hits = case
      when rate_limit.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else rate_limit.hits + 1
    end,
    window_started_at = case
      when rate_limit.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else rate_limit.window_started_at
    end,
    updated_at = now()
  returning hits into current_hits;

  return current_hits <= p_limit;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_public_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_public_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;

drop policy if exists "Rate limits have no direct access" on public.api_rate_limits;
create policy "Rate limits have no direct access"
  on public.api_rate_limits
  for all
  to public
  using (false)
  with check (false);

revoke all on table public.api_rate_limits from anon;
revoke all on table public.api_rate_limits from authenticated;
