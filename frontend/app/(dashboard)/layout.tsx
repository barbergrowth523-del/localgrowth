import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { SupportChat } from '@/components/support/SupportChat'
import { GlobalBroadcastBanner } from '@/components/dashboard/GlobalBroadcastBanner'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'
import { OnboardingTour } from '@/components/dashboard/OnboardingTour'
import { WelcomeMessage } from '@/components/dashboard/WelcomeMessage'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, memberResult] = await Promise.all([
    sessionClient.from('perfis_barbearia').select('plano,nome_estabelecimento,acesso_bloqueado').eq('id', user.id).maybeSingle(),
    sessionClient.from('equipe').select('user_id').eq('auth_user_id', user.id).maybeSingle(),
  ])

  if (memberResult.error) {
    console.error('[dashboard-layout] membership validation failed', memberResult.error.code)
    redirect('/conta-bloqueada?reason=validation')
  }
  if (memberResult.data && memberResult.data.user_id !== user.id) redirect('/painel-profissional')

  if (profileResult.error || !profileResult.data) {
    console.error('[dashboard-layout] profile validation failed', profileResult.error?.code ?? 'profile_missing')
    redirect('/conta-bloqueada?reason=profile')
  }

  const profile = profileResult.data
  const initialPlan = String(profile.plano ?? 'starter').trim().toLowerCase().replace(/^plano\s+/, '') || 'starter'
  const initialSubscriptionActive = initialPlan !== 'free' && initialPlan !== 'gratuito'
  if (profile.acesso_bloqueado === true) redirect('/conta-bloqueada')

  return (
    <AuthProvider initialUser={{ id: user.id, email: user.email }} initialPlan={initialPlan} initialSubscriptionActive={initialSubscriptionActive}>
      <div className="flex min-h-screen overflow-x-hidden bg-slate-950 text-white">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-0">{children}</main>
      </div>
      <NotificationCenter />
      <OnboardingTour />
      <WelcomeMessage userId={user.id} barbershopName={profile.nome_estabelecimento} />
      <GlobalBroadcastBanner />
      <SupportChat barbershopName={profile.nome_estabelecimento} />
    </AuthProvider>
  )
}