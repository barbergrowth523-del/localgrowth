import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { SupportChat } from '@/components/support/SupportChat'
import { GlobalBroadcastBanner } from '@/components/dashboard/GlobalBroadcastBanner'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'
import { OnboardingTour } from '@/components/dashboard/OnboardingTour'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const profileResult = await sessionClient.from('perfis_barbearia').select('plano,nome_estabelecimento').eq('id', user.id).maybeSingle()
  const profile = profileResult.data as { plano?: string | null; nome_estabelecimento?: string | null } | null
  const initialPlan = String(profile?.plano ?? 'starter').trim().toLowerCase().replace(/^plano\s+/, '') || 'starter'
  const initialSubscriptionActive = initialPlan !== 'free' && initialPlan !== 'gratuito'

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceClient = createAdminClient()
    const { data: account } = await serviceClient
      .from('perfis_barbearia')
      .select('acesso_bloqueado')
      .eq('id', user.id)
      .maybeSingle()
    if (account?.acesso_bloqueado === true) redirect('/conta-bloqueada')

    const { data: member } = await serviceClient.from('equipe').select('user_id').eq('auth_user_id', user.id).maybeSingle()
    if (member && member.user_id !== user.id) redirect('/painel-profissional')
  }

  return (
    <AuthProvider initialUser={{ id: user.id, email: user.email }} initialPlan={initialPlan} initialSubscriptionActive={initialSubscriptionActive}>
      <div className="flex min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-0">{children}</main>
      </div>
      <NotificationCenter />
      <OnboardingTour />
      <GlobalBroadcastBanner />
      <SupportChat barbershopName={profile?.nome_estabelecimento} />
    </AuthProvider>
  )
}


