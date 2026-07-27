-- Controlled self-service account erasure. The RPC is callable only by the server service role.

create or replace function private.prevent_activity_mutation()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if current_setting('app.allow_legal_erasure', true) = 'on' then
    return old;
  end if;
  raise exception 'activity events are immutable';
end;
$$;

create or replace function public.erase_merchant_account_data(p_owner_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_professional_auth_ids uuid[] := '{}'::uuid[];
begin
  if p_owner_id is null then
    raise exception 'owner id is required';
  end if;

  select coalesce(array_agg(auth_user_id) filter (where auth_user_id is not null), '{}'::uuid[])
    into v_professional_auth_ids
  from public.equipe
  where user_id = p_owner_id;

  perform set_config('app.allow_legal_erasure', 'on', true);

  delete from public.account_activity_events
  where user_id = p_owner_id or user_id = any(v_professional_auth_ids);

  delete from public.ai_usage_events where user_id = p_owner_id;
  delete from public.notificacoes where user_id = p_owner_id;
  delete from public.lojista_onboarding where user_id = p_owner_id;
  delete from public.payment_webhook_events where user_id = p_owner_id;
  delete from public.support_tickets where user_id = p_owner_id;
  delete from public.expedientes where user_id = p_owner_id;
  delete from public.clients where user_id = p_owner_id;

  delete from public.historico_disparos
  where barbearia_id = p_owner_id
     or cliente_id in (select id from public.clientes where user_id = p_owner_id or barbearia_id = p_owner_id);

  delete from public.agendamentos where user_id = p_owner_id or barbearia_id = p_owner_id;
  delete from public.clientes where user_id = p_owner_id or barbearia_id = p_owner_id;
  delete from public.servicos where user_id = p_owner_id;
  delete from public.barbeiros where user_id = p_owner_id;
  delete from public.equipe where user_id = p_owner_id;
  delete from public.perfis_barbearia where id = p_owner_id;

  return v_professional_auth_ids;
end;
$$;

revoke all on function public.erase_merchant_account_data(uuid) from public, anon, authenticated;
grant execute on function public.erase_merchant_account_data(uuid) to service_role;