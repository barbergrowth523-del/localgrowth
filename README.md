# BarberGrowth

MVP em Next.js + Tailwind CSS + Supabase Auth/Data API.

## Configuração

1. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no painel **Connect** do Supabase.
2. No Supabase, abra **SQL Editor**, cole e execute `supabase/migrations/20260720000000_create_clients.sql`. O RLS limita cada barbeiro aos próprios clientes.
3. Em **Authentication > URL Configuration**, adicione `http://localhost:3000/dashboard` às Redirect URLs (e a URL de produção quando publicar).
4. Instale dependências com `npm install` e execute `npm run dev`.

O CSV esperado tem cabeçalho e três colunas, nesta ordem: `Nome,Telefone,Data do Último Corte`. Datas devem estar no formato ISO `AAAA-MM-DD`. O botão de WhatsApp abre uma mensagem pré-preenchida em uma nova aba.
