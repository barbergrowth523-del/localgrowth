alter table public.clientes add column if not exists data_nascimento date;
create index if not exists clientes_barbearia_nascimento_idx on public.clientes(barbearia_id, data_nascimento);
