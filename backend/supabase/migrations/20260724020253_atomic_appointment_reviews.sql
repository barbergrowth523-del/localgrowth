create or replace function public.submit_appointment_review(
  p_token uuid,
  p_stars smallint,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
begin
  if p_stars < 1 or p_stars > 5 or char_length(coalesce(p_comment, '')) > 1000 then
    raise exception using errcode = 'P0001', message = 'invalid_review';
  end if;

  select id
    into v_appointment_id
    from public.agendamentos
   where avaliacao_token = p_token
     and status = 'Concluido'
   for update;

  if v_appointment_id is null then
    raise exception using errcode = 'P0001', message = 'appointment_not_reviewable';
  end if;

  if exists (select 1 from public.avaliacoes where agendamento_id = v_appointment_id) then
    raise exception using errcode = 'P0001', message = 'review_already_submitted';
  end if;

  insert into public.avaliacoes (agendamento_id, estrelas, comentario)
  values (v_appointment_id, p_stars, nullif(btrim(p_comment), ''));

  update public.agendamentos
     set nota_avaliacao = p_stars,
         comentario_avaliacao = nullif(btrim(p_comment), '')
   where id = v_appointment_id;

  return v_appointment_id;
end;
$$;

revoke all on function public.submit_appointment_review(uuid,smallint,text) from public;
revoke all on function public.submit_appointment_review(uuid,smallint,text) from anon;
revoke all on function public.submit_appointment_review(uuid,smallint,text) from authenticated;
grant execute on function public.submit_appointment_review(uuid,smallint,text) to service_role;
