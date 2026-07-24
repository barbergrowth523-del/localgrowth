create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  payment_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  plan text not null,
  billing_period text not null,
  processed_at timestamp with time zone not null default now()
);

alter table public.payment_webhook_events enable row level security;
drop policy if exists "Payment events have no direct access" on public.payment_webhook_events;
create policy "Payment events have no direct access"
  on public.payment_webhook_events for all to public using (false) with check (false);
revoke all on table public.payment_webhook_events from anon;
revoke all on table public.payment_webhook_events from authenticated;

create or replace function public.process_asaas_subscription_event(
  p_event_id text,
  p_payment_id text,
  p_user_id uuid,
  p_plan text,
  p_billing_period text,
  p_confirmed_at timestamp with time zone
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
  expires_at timestamp with time zone;
begin
  if p_event_id is null or p_payment_id is null
     or p_plan not in ('starter','pro','scale')
     or p_billing_period not in ('monthly','annual') then
    raise exception using errcode = 'P0001', message = 'invalid_payment_event';
  end if;

  insert into public.payment_webhook_events (
    provider_event_id, payment_id, user_id, event_type, plan, billing_period
  )
  values (
    p_event_id, p_payment_id, p_user_id, 'PAYMENT_CONFIRMED', p_plan, p_billing_period
  )
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false;
  end if;

  expires_at := case
    when p_billing_period = 'annual' then p_confirmed_at + interval '1 year'
    else p_confirmed_at + interval '1 month'
  end;

  update public.perfis_barbearia
     set plano = p_plan,
         data_inicio_assinatura = p_confirmed_at,
         data_vencimento = expires_at,
         renovacao_automatica = true,
         updated_at = now()
   where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'subscription_profile_not_found';
  end if;

  return true;
end;
$$;

revoke all on function public.process_asaas_subscription_event(text,text,uuid,text,text,timestamp with time zone) from public;
revoke all on function public.process_asaas_subscription_event(text,text,uuid,text,text,timestamp with time zone) from anon;
revoke all on function public.process_asaas_subscription_event(text,text,uuid,text,text,timestamp with time zone) from authenticated;
grant execute on function public.process_asaas_subscription_event(text,text,uuid,text,text,timestamp with time zone) to service_role;
