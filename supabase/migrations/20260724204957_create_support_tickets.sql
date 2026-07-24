create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barbearia_nome text not null,
  user_email text,
  mensagem text not null check (char_length(trim(mensagem)) between 1 and 2000),
  categoria text not null default 'duvida_complexa',
  status text not null default 'aberto' check (status in ('aberto', 'em_atendimento', 'respondido', 'fechado')),
  contexto jsonb not null default '{}'::jsonb,
  resposta_admin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
revoke all on table public.support_tickets from anon;
grant select, insert on table public.support_tickets to authenticated;
drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own" on public.support_tickets for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own" on public.support_tickets for select to authenticated using ((select auth.uid()) = user_id);
create index if not exists support_tickets_user_created_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_created_idx on public.support_tickets (status, created_at desc);
