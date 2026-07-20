update public.clientes c
set user_id = p.id
from public.perfis_barbearia p
where c.barbearia_id = p.id
  and c.user_id is null;
