create table if not exists public.barbeiros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  ativo boolean not null default true,
  comissao_percentual numeric(5,2) not null default 50 check (comissao_percentual between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, nome)
);

create index if not exists barbeiros_user_idx on public.barbeiros(user_id, ativo);
alter table public.barbeiros enable row level security;

drop policy if exists "Users can view own barbers" on public.barbeiros;
create policy "Users can view own barbers" on public.barbeiros for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own barbers" on public.barbeiros;
create policy "Users can create own barbers" on public.barbeiros for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own barbers" on public.barbeiros;
create policy "Users can update own barbers" on public.barbeiros for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own barbers" on public.barbeiros;
create policy "Users can delete own barbers" on public.barbeiros for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.agendamentos add column if not exists barbeiro_id uuid references public.barbeiros(id) on delete set null;
create index if not exists agendamentos_barber_idx on public.agendamentos(user_id, barbeiro_id, data_agendamento, hora_agendamento);

insert into public.barbeiros (user_id, nome)
select p.id, 'Atendimento geral'
from public.perfis_barbearia p
where not exists (select 1 from public.barbeiros b where b.user_id = p.id);

