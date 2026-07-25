create policy "deny direct client access to system alert state"
  on public.admin_system_alert_state
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);
