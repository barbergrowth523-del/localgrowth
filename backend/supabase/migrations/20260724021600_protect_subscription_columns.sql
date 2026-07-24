revoke all on table public.perfis_barbearia from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.perfis_barbearia from authenticated;

grant select on table public.perfis_barbearia to authenticated;

grant insert (
  id,
  nome_estabelecimento,
  telefone_whatsapp,
  dias_para_alerta,
  dias_para_sumido,
  mensagem_template,
  cadeiras_simultaneas
) on public.perfis_barbearia to authenticated;

grant update (
  nome_estabelecimento,
  telefone_whatsapp,
  dias_para_alerta,
  dias_para_sumido,
  mensagem_template,
  cadeiras_simultaneas
) on public.perfis_barbearia to authenticated;
