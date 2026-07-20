create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  phone text not null check (char_length(phone) >= 8),
  last_cut_at date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists clients_user_id_last_cut_at_idx on public.clients(user_id, last_cut_at);
alter table public.clients enable row level security;
drop policy if exists "Users can view their own clients" on public.clients;
create policy "Users can view their own clients" on public.clients for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own clients" on public.clients;
create policy "Users can insert their own clients" on public.clients for insert to authenticated with check ((select auth.uid()) = user_id);

