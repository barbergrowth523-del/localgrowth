alter table public.perfis_barbearia
  add column if not exists notificacoes_painel boolean not null default true,
  add column if not exists envio_assistido boolean not null default false;

grant insert (notificacoes_painel, envio_assistido)
  on public.perfis_barbearia to authenticated;
grant update (notificacoes_painel, envio_assistido)
  on public.perfis_barbearia to authenticated;
