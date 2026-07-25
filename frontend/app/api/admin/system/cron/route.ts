import { NextResponse } from 'next/server'
import { runSystemDiagnostics } from '@/lib/admin-system'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  try {
    return NextResponse.json(await runSystemDiagnostics(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin-system-cron] diagnostics failed', error)
    return NextResponse.json({ error: 'Falha no diagnostico.' }, { status: 500 })
  }
}
