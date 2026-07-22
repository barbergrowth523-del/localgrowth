alter table public.equipe add column if not exists email text;
alter table public.equipe add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.agendamentos add column if not exists lembrete_enviado_em timestamptz;

drop policy if exists "Team members can view own appointments" on public.agendamentos;
create policy "Team members can view own appointments" on public.agendamentos for select to authenticated using (
  (select auth.uid()) = user_id
  or exists (select 1 from public.equipe e where e.id = equipe_id and e.auth_user_id = (select auth.uid()))
);

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null unique references public.agendamentos(id) on delete cascade,
  estrelas smallint not null check (estrelas between 1 and 5),
  comentario text,
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.avaliacoes enable row level security;
drop policy if exists "Owners can view own reviews" on public.avaliacoes;
create policy "Owners can view own reviews" on public.avaliacoes for select to authenticated using (exists (select 1 from public.agendamentos a where a.id = agendamento_id and a.user_id = (select auth.uid())));
