-- Let an authenticated professional resolve only their own team membership.
-- This removes the need for service-role access in the owner dashboard layout.
drop policy if exists "Professionals can view own membership" on public.equipe;
create policy "Professionals can view own membership"
on public.equipe
for select
to authenticated
using ((select auth.uid()) = auth_user_id);