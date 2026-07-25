import { NextResponse } from 'next/server'
import { getAdminErrorMessage, getAdminErrorStatus, requireSuperAdmin } from '@/lib/admin'
import { runSystemDiagnostics } from '@/lib/admin-system'

export async function GET() {
  try {
    await requireSuperAdmin()
    return NextResponse.json(await runSystemDiagnostics(), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: getAdminErrorMessage(error) }, { status: getAdminErrorStatus(error) })
  }
}
