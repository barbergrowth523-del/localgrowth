-- Allow owners to edit only ordinary establishment settings.
-- Sensitive subscription, authorization and ownership fields remain protected.

alter table public.perfis_barbearia enable row level security;

drop policy if exists perfis_update_own on public.perfis_barbearia;
create policy perfis_update_own
on public.perfis_barbearia
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke update on public.perfis_barbearia from authenticated;
grant update (
  nome_estabelecimento,
  telefone_whatsapp,
  dias_para_alerta,
  dias_para_sumido,
  mensagem_template,
  cadeiras_simultaneas,
  nome_responsavel,
  notificacoes_painel,
  envio_assistido,
  updated_at
) on public.perfis_barbearia to authenticated;

create or replace function private.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_super_admin()) then
    new.id := old.id;
    new.plano := old.plano;
    new.data_inicio_assinatura := old.data_inicio_assinatura;
    new.data_vencimento := old.data_vencimento;
    new.renovacao_automatica := old.renovacao_automatica;
    new.role := old.role;
    new.acesso_bloqueado := old.acesso_bloqueado;
    new.cortesia_ate := old.cortesia_ate;
    new.slug := old.slug;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_profile_sensitive_fields()
  from public, anon, authenticated;