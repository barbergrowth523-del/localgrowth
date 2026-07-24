drop policy if exists "Users can view own team" on public.equipe;
drop policy if exists "Users can create own team" on public.equipe;
drop policy if exists "Users can update own team" on public.equipe;
drop policy if exists "Users can delete own team" on public.equipe;

create policy "Scale users can view own team"
on public.equipe for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.perfis_barbearia p
    where p.id = (select auth.uid()) and lower(p.plano) = 'scale'
  )
);

create policy "Scale users can create own team"
on public.equipe for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.perfis_barbearia p
    where p.id = (select auth.uid()) and lower(p.plano) = 'scale'
  )
);

create policy "Scale users can update own team"
on public.equipe for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.perfis_barbearia p
    where p.id = (select auth.uid()) and lower(p.plano) = 'scale'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.perfis_barbearia p
    where p.id = (select auth.uid()) and lower(p.plano) = 'scale'
  )
);

create policy "Scale users can delete own team"
on public.equipe for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.perfis_barbearia p
    where p.id = (select auth.uid()) and lower(p.plano) = 'scale'
  )
);
