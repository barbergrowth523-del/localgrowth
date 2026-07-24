create or replace function public.create_public_appointment(
  p_user_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_service_name text,
  p_date date,
  p_time time without time zone,
  p_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
  v_capacity integer := 1;
  v_active_team integer := 0;
  v_occupied integer := 0;
  v_schedule public.expedientes%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_date::text || ':' || p_time::text, 0)
  );

  if not exists (select 1 from public.clientes where id = p_client_id and user_id = p_user_id)
     or not exists (select 1 from public.servicos where id = p_service_id and user_id = p_user_id and ativo = true) then
    raise exception using errcode = 'P0001', message = 'invalid_tenant_reference';
  end if;

  select coalesce(cadeiras_simultaneas, 1)
    into v_capacity
    from public.perfis_barbearia
   where id = p_user_id;

  select count(*)
    into v_active_team
    from public.equipe
   where user_id = p_user_id and ativo = true;

  if v_active_team > 0 then
    v_capacity := least(v_capacity, v_active_team);
  end if;

  select *
    into v_schedule
    from public.expedientes
   where user_id = p_user_id
     and dia_semana = extract(dow from p_date)::integer;

  if found and (
    not v_schedule.aberto
    or p_time < v_schedule.hora_inicio
    or p_time >= v_schedule.hora_fim
  ) then
    raise exception using errcode = 'P0001', message = 'outside_business_hours';
  end if;

  if p_team_id is not null then
    if not exists (
      select 1 from public.equipe
       where id = p_team_id and user_id = p_user_id and ativo = true
    ) then
      raise exception using errcode = 'P0001', message = 'invalid_team_member';
    end if;

    if exists (
      select 1 from public.agendamentos
       where user_id = p_user_id
         and data_agendamento = p_date
         and hora_agendamento = p_time
         and equipe_id = p_team_id
         and status = 'Confirmado'
    ) then
      raise exception using errcode = 'P0001', message = 'team_member_unavailable';
    end if;
  end if;

  select count(*)
    into v_occupied
    from public.agendamentos
   where user_id = p_user_id
     and data_agendamento = p_date
     and hora_agendamento = p_time
     and status = 'Confirmado';

  if v_occupied >= greatest(v_capacity, 1) then
    raise exception using errcode = 'P0001', message = 'slot_capacity_reached';
  end if;

  insert into public.agendamentos (
    user_id, barbearia_id, cliente_id, servico_id, equipe_id,
    servico, data_agendamento, hora_agendamento, status
  )
  values (
    p_user_id, p_user_id, p_client_id, p_service_id, p_team_id,
    p_service_name, p_date, p_time, 'Confirmado'
  )
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

revoke all on function public.create_public_appointment(uuid,uuid,uuid,text,date,time without time zone,uuid) from public;
revoke all on function public.create_public_appointment(uuid,uuid,uuid,text,date,time without time zone,uuid) from anon;
revoke all on function public.create_public_appointment(uuid,uuid,uuid,text,date,time without time zone,uuid) from authenticated;
grant execute on function public.create_public_appointment(uuid,uuid,uuid,text,date,time without time zone,uuid) to service_role;
