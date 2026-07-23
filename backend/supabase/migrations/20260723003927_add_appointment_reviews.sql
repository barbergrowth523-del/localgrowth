alter table public.agendamentos add column if not exists nota_avaliacao smallint check (nota_avaliacao between 1 and 5);

alter table public.agendamentos add column if not exists comentario_avaliacao text;