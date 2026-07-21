drop policy if exists "Users can delete clients by user id" on public.clientes;
create policy "Users can delete clients by user id"
  on public.clientes for delete to authenticated
  using ((select auth.uid()) = user_id);
