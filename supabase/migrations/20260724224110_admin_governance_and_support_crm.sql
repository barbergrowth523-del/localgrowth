alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_action_check;

alter table public.admin_audit_log
  add constraint admin_audit_log_action_check
  check (action in (
    'block_access',
    'unblock_access',
    'grant_courtesy',
    'impersonate_preview_opened',
    'change_plan',
    'update_support_status'
  ));

create or replace function private.prevent_admin_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'admin audit logs are immutable';
end;
$$;

revoke all on function private.prevent_admin_audit_mutation() from public, anon, authenticated;

drop trigger if exists admin_audit_log_immutable on public.admin_audit_log;
create trigger admin_audit_log_immutable
before update or delete on public.admin_audit_log
for each row execute function private.prevent_admin_audit_mutation();

drop policy if exists admin_audit_log_no_client_access on public.admin_audit_log;
drop policy if exists admin_audit_log_admin_select on public.admin_audit_log;
create policy admin_audit_log_admin_select
  on public.admin_audit_log
  for select
  to authenticated
  using ((select private.is_super_admin()));

revoke all on table public.admin_audit_log from anon, authenticated;
grant select on table public.admin_audit_log to authenticated;

drop policy if exists support_tickets_select_own on public.support_tickets;
drop policy if exists support_tickets_select_own_or_admin on public.support_tickets;
create policy support_tickets_select_own_or_admin
  on public.support_tickets
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_super_admin())
  );

drop policy if exists support_tickets_admin_update on public.support_tickets;
create policy support_tickets_admin_update
  on public.support_tickets
  for update
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

revoke update on table public.support_tickets from authenticated;
grant update (status, resposta_admin, updated_at) on table public.support_tickets to authenticated;
