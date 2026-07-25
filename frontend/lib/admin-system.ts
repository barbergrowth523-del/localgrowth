import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type ServiceStatus = {
  name: string
  status: 'operational' | 'degraded' | 'down' | 'not_configured'
  latency: number | null
  detail: string
}

async function timed(name: string, task: () => Promise<{ ok: boolean; detail: string }>): Promise<ServiceStatus> {
  const started = performance.now()
  try {
    const result = await Promise.race([
      task(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
    ])
    const latency = Math.round(performance.now() - started)
    return { name, status: result.ok ? (latency > 2500 ? 'degraded' : 'operational') : 'down', latency, detail: result.detail }
  } catch (error) {
    return { name, status: 'down', latency: Math.round(performance.now() - started), detail: error instanceof Error ? error.message : 'Falha desconhecida' }
  }
}

async function notifyTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
    cache: 'no-store',
  })
  return response.ok
}

async function alertIfNeeded(services: ServiceStatus[]) {
  const admin = createAdminClient()
  const now = new Date()
  const cooldown = 30 * 60 * 1000
  for (const service of services) {
    const critical = service.status === 'down' || (service.status === 'degraded' && (service.latency ?? 0) >= 2500)
    if (!critical) {
      await admin.from('admin_system_alert_state').upsert({ service: service.name, last_status: service.status, last_latency_ms: service.latency, updated_at: now.toISOString() })
      continue
    }
    const { data: previous } = await admin.from('admin_system_alert_state').select('last_alert_at,last_status').eq('service', service.name).maybeSingle()
    const lastAlertAt = previous?.last_alert_at ? new Date(previous.last_alert_at).getTime() : 0
    const shouldSend = previous?.last_status !== service.status || now.getTime() - lastAlertAt >= cooldown
    let sent = false
    if (shouldSend) {
      try {
        sent = await notifyTelegram(`PRONTUSFY ALERTA CRITICO\nServico: ${service.name}\nStatus: ${service.status}\nLatencia: ${service.latency ?? '--'} ms\nDetalhe: ${service.detail}\nHorario: ${now.toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}`)
      } catch (error) {
        console.error('[admin-system] telegram alert failed', error)
      }
    }
    await admin.from('admin_system_alert_state').upsert({
      service: service.name,
      last_status: service.status,
      last_latency_ms: service.latency,
      last_alert_at: sent ? now.toISOString() : previous?.last_alert_at ?? null,
      updated_at: now.toISOString(),
    })
  }
}

export async function runSystemDiagnostics() {
  const admin = createAdminClient()
  const services = await Promise.all([
    timed('Supabase', async () => { const { error } = await admin.from('perfis_barbearia').select('id', { head: true, count: 'exact' }); return { ok: !error, detail: error?.message ?? 'Banco e Auth respondendo' } }),
    process.env.OPENAI_API_KEY ? timed('OpenAI', async () => { const response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, cache: 'no-store' }); return { ok: response.ok, detail: response.ok ? 'API respondendo' : `HTTP ${response.status}` } }) : Promise.resolve<ServiceStatus>({ name: 'OpenAI', status: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN ? 'operational' : 'not_configured', latency: null, detail: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN ? 'Vercel AI Gateway configurado' : 'Credencial nao configurada' }),
    process.env.ASAAS_API_KEY ? timed('Asaas', async () => { const base = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'; const response = await fetch(`${base}/finance/getCurrentBalance`, { headers: { access_token: process.env.ASAAS_API_KEY! }, cache: 'no-store' }); return { ok: response.ok, detail: response.ok ? 'API e webhooks disponiveis' : `HTTP ${response.status}` } }) : Promise.resolve<ServiceStatus>({ name: 'Asaas', status: 'not_configured', latency: null, detail: 'Credencial nao configurada' }),
    timed('WhatsApp', async () => { const response = await fetch('https://wa.me', { method: 'HEAD', cache: 'no-store' }); return { ok: response.ok || response.status === 405, detail: 'Links diretos disponiveis' } }),
  ])
  await alertIfNeeded(services)
  return { checkedAt: new Date().toISOString(), services }
}


