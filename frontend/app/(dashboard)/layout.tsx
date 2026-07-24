import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) redirect('/login')

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const serviceClient = createAdminClient()
    const { data: member } = await serviceClient.from('equipe').select('user_id').eq('auth_user_id', user.id).maybeSingle()
    if (member && member.user_id !== user.id) redirect('/painel-profissional')
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-0">{children}</main>
    </div>
  )
}
