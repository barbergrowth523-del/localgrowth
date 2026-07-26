-- Keep owner and professional visibility in one permissive SELECT policy.
drop policy if exists "Scale users can view own team" on public.equipe;
drop policy if exists "Professionals can view own membership" on public.equipe;
drop policy if exists "Owners or professionals can view team" on public.equipe;

create policy "Owners or professionals can view team"
on public.equipe
for select
to authenticated
using (
  (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.perfis_barbearia p
      where p.id = (select auth.uid())
        and lower(p.plano) = 'scale'
    )
  )
  or (select auth.uid()) = auth_user_id
);