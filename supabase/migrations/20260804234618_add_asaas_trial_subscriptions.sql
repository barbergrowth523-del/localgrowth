-- Server-only ledger for subscriptions created with Asaas.
-- It lets webhooks be reconciled by provider subscription id as well as external reference.
create table if not exists public.asaas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_subscription_id text not null unique,
  provider_customer_id text not null,
  plan text not null check (plan in ('starter', 'pro', 'scale')),
  billing_period text not null check (billing_period in ('monthly', 'annual')),
  status text not null check (status in ('trial', 'active', 'cancelled', 'past_due')),
  trial_started_at timestamptz not null,
  trial_ends_at date not null,
  last_payment_id text,
  last_payment_confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists asaas_subscriptions_user_status_idx
  on public.asaas_subscriptions (user_id, status, created_at desc);

alter table public.asaas_subscriptions enable row level security;
revoke all on table public.asaas_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.asaas_subscriptions to service_role;

drop policy if exists asaas_subscriptions_no_direct_access on public.asaas_subscriptions;
create policy asaas_subscriptions_no_direct_access
on public.asaas_subscriptions
for all
to authenticated
using (false)
with check (false);

create or replace function private.touch_asaas_subscriptions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists asaas_subscriptions_touch_updated_at on public.asaas_subscriptions;
create trigger asaas_subscriptions_touch_updated_at
before update on public.asaas_subscriptions
for each row execute function private.touch_asaas_subscriptions_updated_at();

revoke all on function private.touch_asaas_subscriptions_updated_at() from public, anon, authenticated;
