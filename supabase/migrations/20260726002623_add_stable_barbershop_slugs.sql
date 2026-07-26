alter table public.perfis_barbearia
  add column if not exists slug text;

update public.perfis_barbearia
set slug = case
  when id = 'a2ce084d-84bd-426e-9ec4-cc0f961df556'::uuid
    then 'jacobina'
  else 'barbearia-' || left(id::text, 8)
end
where slug is null or btrim(slug) = '';

create or replace function private.ensure_profile_slug()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := 'barbearia-' || left(new.id::text, 8);
  end if;
  new.slug := lower(btrim(new.slug));
  return new;
end;
$$;

revoke all on function private.ensure_profile_slug()
  from public, anon, authenticated;

drop trigger if exists ensure_profile_slug_trigger
  on public.perfis_barbearia;
create trigger ensure_profile_slug_trigger
before insert on public.perfis_barbearia
for each row execute function private.ensure_profile_slug();

alter table public.perfis_barbearia
  alter column slug set not null;
alter table public.perfis_barbearia
  drop constraint if exists perfis_barbearia_slug_format_check;
alter table public.perfis_barbearia
  add constraint perfis_barbearia_slug_format_check
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index if not exists perfis_barbearia_slug_key
  on public.perfis_barbearia(slug);
