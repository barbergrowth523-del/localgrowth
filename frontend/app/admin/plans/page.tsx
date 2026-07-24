import { PlansClient } from '@/components/admin/PlansClient'
import { getPlansOverview } from '@/lib/admin-enterprise'

export default async function PlansPage() {
  return <PlansClient initialData={await getPlansOverview()} />
}
