import PublicBookingForm from '@/components/public/agendar-form'

export default async function AgendarPage({ searchParams }: { searchParams: Promise<{ barbearia?: string }> }) {
  const params = await searchParams
  return <PublicBookingForm barbearia={params.barbearia ?? 'jacobina'} />
}