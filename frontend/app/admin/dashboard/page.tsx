import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'
import { getAdminOverview } from '@/lib/admin-overview'

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview()
  return <AdminDashboardClient initialOverview={overview} />
}
