import CadastroForm from '@/components/public/cadastro-form'

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ barbearia?: string }> }) {
  const params = await searchParams
  return <CadastroForm barbearia={params.barbearia ?? ''} />
}
