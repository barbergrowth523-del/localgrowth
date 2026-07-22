alter table public.perfis_barbearia
  add column if not exists cadeiras_simultaneas integer not null default 1
  check (cadeiras_simultaneas between 1 and 50);

