create table if not exists public.equipe (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  telefone text,
  ativo boolean not null default true,
  comissao_percentual numeric(5,2) not null default 50 check (comissao_percentual between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, nome)
);

create index if not exists equipe_user_idx on public.equipe(user_id, ativo);
alter table public.equipe enable row level security;
drop policy if exists "Users can view own team" on public.equipe;
create policy "Users can view own team" on public.equipe for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own team" on public.equipe;
create policy "Users can create own team" on public.equipe for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own team" on public.equipe;
create policy "Users can update own team" on public.equipe for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own team" on public.equipe;
create policy "Users can delete own team" on public.equipe for delete to authenticated using ((select auth.uid()) = user_id);

insert into public.equipe (user_id, nome, ativo, comissao_percentual)
select b.user_id, b.nome, b.ativo, b.comissao_percentual
from public.barbeiros b
where not exists (select 1 from public.equipe e where e.user_id = b.user_id and e.nome = b.nome);

alter table public.agendamentos add column if not exists equipe_id uuid references public.equipe(id) on delete set null;
create index if not exists agendamentos_equipe_idx on public.agendamentos(user_id, equipe_id, data_agendamento, hora_agendamento);

