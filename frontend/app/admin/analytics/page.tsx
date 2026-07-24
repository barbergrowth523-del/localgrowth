import { AnalyticsClient } from '@/components/admin/AnalyticsClient'
import { getAnalyticsOverview } from '@/lib/admin-enterprise'

export default async function AnalyticsPage() {
  return <AnalyticsClient overview={await getAnalyticsOverview()} />
}
