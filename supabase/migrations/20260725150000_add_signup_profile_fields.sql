alter table public.perfis_barbearia
  add column if not exists nome_responsavel text;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis_barbearia (id, nome_estabelecimento, telefone_whatsapp, nome_responsavel)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome_barbearia'), ''), 'Minha barbearia'),
    nullif(trim(new.raw_user_meta_data ->> 'whatsapp'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'nome_responsavel'), '')
  )
  on conflict (id) do update set
    nome_estabelecimento = coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome_barbearia'), ''), public.perfis_barbearia.nome_estabelecimento),
    telefone_whatsapp = coalesce(nullif(trim(new.raw_user_meta_data ->> 'whatsapp'), ''), public.perfis_barbearia.telefone_whatsapp),
    nome_responsavel = coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome_responsavel'), ''), public.perfis_barbearia.nome_responsavel),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();