drop policy if exists perfis_admin_select on public.perfis_barbearia;
drop policy if exists perfis_select_own on public.perfis_barbearia;
create policy perfis_select_own_or_admin
  on public.perfis_barbearia
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select private.is_super_admin())
  );

drop policy if exists admin_audit_log_no_client_access on public.admin_audit_log;
create policy admin_audit_log_no_client_access
  on public.admin_audit_log
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);

create index if not exists admin_audit_log_target_user_idx
  on public.admin_audit_log (target_user_id);
