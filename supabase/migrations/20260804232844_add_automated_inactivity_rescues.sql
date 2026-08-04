-- Automated inactivity rescues are server-managed. Merchants can see their
-- own delivery history, but only the cron worker can enqueue or send messages.

alter table public.perfis_barbearia
  add column if not exists resgate_automatico_ativo boolean not null default false,
  add column if not exists resgate_automatico_cooldown_dias integer not null default 30
    check (resgate_automatico_cooldown_dias between 1 and 365);

revoke update on table public.perfis_barbearia from authenticated;
grant update (
  nome_estabelecimento,
  telefone_whatsapp,
  dias_para_alerta,
  dias_para_sumido,
  mensagem_template,
  cadeiras_simultaneas,
  nome_responsavel,
  notificacoes_painel,
  envio_assistido,
  resgate_automatico_ativo,
  resgate_automatico_cooldown_dias,
  updated_at
) on table public.perfis_barbearia to authenticated;

create table if not exists public.resgates_automaticos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  corte_referencia date not null,
  telefone text not null,
  mensagem text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'enviado', 'erro', 'ignorado')),
  tentativas smallint not null default 0 check (tentativas between 0 and 10),
  max_tentativas smallint not null default 3 check (max_tentativas between 1 and 10),
  agendado_para timestamptz not null default timezone('utc', now()),
  enviado_em timestamptz,
  provider_message_id text,
  provider_response jsonb,
  ultimo_erro text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint resgates_automaticos_cliente_corte_key unique (cliente_id, corte_referencia)
);

create index if not exists resgates_automaticos_worker_idx
  on public.resgates_automaticos (status, agendado_para, tentativas);
create index if not exists resgates_automaticos_owner_idx
  on public.resgates_automaticos (user_id, created_at desc);

alter table public.resgates_automaticos enable row level security;
revoke all on table public.resgates_automaticos from anon, authenticated;
grant select on table public.resgates_automaticos to authenticated;
grant select, insert, update, delete on table public.resgates_automaticos to service_role;

drop policy if exists resgates_automaticos_select_own on public.resgates_automaticos;
create policy resgates_automaticos_select_own
on public.resgates_automaticos
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.touch_resgates_automaticos_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists resgates_automaticos_touch_updated_at on public.resgates_automaticos;
create trigger resgates_automaticos_touch_updated_at
before update on public.resgates_automaticos
for each row execute function private.touch_resgates_automaticos_updated_at();

revoke all on function private.touch_resgates_automaticos_updated_at() from public, anon, authenticated;
