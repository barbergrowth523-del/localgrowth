import { NextResponse } from 'next/server'
import { requireSuperAdmin, getAdminErrorMessage, getAdminErrorStatus } from '@/lib/admin'

type ServiceStatus = { name: string; status: 'operational' | 'degraded' | 'down' | 'not_configured'; latency: number | null; detail: string }

async function timed(name: string, task: () => Promise<{ ok: boolean; detail: string }>): Promise<ServiceStatus> {
  const started = performance.now()
  try {
    const result = await Promise.race([task(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))])
    const latency = Math.round(performance.now() - started)
    return { name, status: result.ok ? (latency > 2500 ? 'degraded' : 'operational') : 'down', latency, detail: result.detail }
  } catch (error) {
    return { name, status: 'down', latency: Math.round(performance.now() - started), detail: error instanceof Error ? error.message : 'Falha desconhecida' }
  }
}

export async function GET() {
  try {
    const { admin } = await requireSuperAdmin()
    const services = await Promise.all([
      timed('Supabase', async () => { const { error } = await admin.from('perfis_barbearia').select('id', { head: true, count: 'exact' }); return { ok: !error, detail: error?.message ?? 'Banco e Auth respondendo' } }),
      process.env.OPENAI_API_KEY ? timed('OpenAI', async () => { const response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, cache: 'no-store' }); return { ok: response.ok, detail: response.ok ? 'API respondendo' : `HTTP ${response.status}` } }) : Promise.resolve<ServiceStatus>({ name: 'OpenAI', status: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN ? 'operational' : 'not_configured', latency: null, detail: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN ? 'Vercel AI Gateway configurado' : 'Credencial nao configurada' }),
      process.env.ASAAS_API_KEY ? timed('Asaas', async () => { const base = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'; const response = await fetch(`${base}/finance/getCurrentBalance`, { headers: { access_token: process.env.ASAAS_API_KEY! }, cache: 'no-store' }); return { ok: response.ok, detail: response.ok ? 'API e webhooks disponiveis' : `HTTP ${response.status}` } }) : Promise.resolve<ServiceStatus>({ name: 'Asaas', status: 'not_configured', latency: null, detail: 'Credencial nao configurada' }),
      timed('WhatsApp', async () => { const response = await fetch('https://wa.me', { method: 'HEAD', cache: 'no-store' }); return { ok: response.ok || response.status === 405, detail: 'Links diretos disponiveis' } }),
    ])
    return NextResponse.json({ checkedAt: new Date().toISOString(), services }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: getAdminErrorMessage(error) }, { status: getAdminErrorStatus(error) })
  }
}
