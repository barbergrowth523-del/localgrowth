alter table public.perfis_barbearia
  add column if not exists data_inicio_assinatura timestamptz,
  add column if not exists data_vencimento timestamptz,
  add column if not exists renovacao_automatica boolean not null default false;

create index if not exists perfis_barbearia_data_vencimento_idx
  on public.perfis_barbearia (data_vencimento);
