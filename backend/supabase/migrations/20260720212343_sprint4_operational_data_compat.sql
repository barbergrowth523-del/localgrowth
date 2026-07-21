create index if not exists clientes_barbearia_data_idx on public.clientes(barbearia_id, data_ultimo_corte);
create index if not exists historico_disparos_cliente_data_idx on public.historico_disparos(cliente_id, enviado_em desc);
alter table public.clientes enable row level security;
alter table public.historico_disparos enable row level security;
grant select on public.vw_clientes_status to authenticated;
