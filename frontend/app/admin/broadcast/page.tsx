import { BroadcastClient } from '@/components/admin/BroadcastClient'
import { getBroadcastOverview } from '@/lib/admin-enterprise'

export default async function BroadcastPage() {
  return <BroadcastClient initialBroadcasts={await getBroadcastOverview()} />
}
