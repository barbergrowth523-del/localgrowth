import { Dashboard } from '@/components/dashboard/dashboard'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <Dashboard userEmail={user?.email ?? ''} />
}
