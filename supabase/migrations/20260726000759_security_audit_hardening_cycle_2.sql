-- Defense in depth for tenant profiles and ownership policies.

create or replace function private.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_super_admin()) then
    new.plano := old.plano;
    new.data_inicio_assinatura := old.data_inicio_assinatura;
    new.data_vencimento := old.data_vencimento;
    new.renovacao_automatica := old.renovacao_automatica;
    new.role := old.role;
    new.acesso_bloqueado := old.acesso_bloqueado;
    new.cortesia_ate := old.cortesia_ate;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_profile_sensitive_fields()
  from public, anon, authenticated;

drop trigger if exists protect_profile_sensitive_fields_trigger
  on public.perfis_barbearia;
create trigger protect_profile_sensitive_fields_trigger
before update on public.perfis_barbearia
for each row execute function private.protect_profile_sensitive_fields();

-- Allow the profile owner to maintain the responsible-name field.
grant insert (nome_responsavel) on public.perfis_barbearia to authenticated;
grant update (nome_responsavel) on public.perfis_barbearia to authenticated;

-- A dispatch can only reference a client owned by the same tenant.
drop policy if exists historico_insert_own_barbearia
  on public.historico_disparos;
create policy historico_insert_own_barbearia
on public.historico_disparos
for insert to authenticated
with check (
  (select auth.uid()) = barbearia_id
  and exists (
    select 1
    from public.clientes c
    where c.id = historico_disparos.cliente_id
      and c.user_id = (select auth.uid())
      and (
        c.barbearia_id is null
        or c.barbearia_id = (select auth.uid())
      )
  )
);

-- Avoid overlapping permissive SELECT policies for broadcasts.
drop policy if exists admin_broadcasts_admin_all
  on public.admin_broadcasts;
drop policy if exists admin_broadcasts_admin_insert
  on public.admin_broadcasts;
drop policy if exists admin_broadcasts_admin_update
  on public.admin_broadcasts;
drop policy if exists admin_broadcasts_admin_delete
  on public.admin_broadcasts;

create policy admin_broadcasts_admin_insert
on public.admin_broadcasts
for insert to authenticated
with check ((select private.is_super_admin()));

create policy admin_broadcasts_admin_update
on public.admin_broadcasts
for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy admin_broadcasts_admin_delete
on public.admin_broadcasts
for delete to authenticated
using ((select private.is_super_admin()));

create index if not exists admin_broadcasts_created_by_idx
  on public.admin_broadcasts(created_by);
create index if not exists admin_coupons_created_by_idx
  on public.admin_coupons(created_by);
create index if not exists admin_plan_configs_updated_by_idx
  on public.admin_plan_configs(updated_by);
