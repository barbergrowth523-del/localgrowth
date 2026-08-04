import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Profile = {
  id: string
  nome_estabelecimento: string | null
  slug: string | null
  dias_para_sumido: number | null
  mensagem_template: string | null
}

type Client = { id: string; nome: string; telefone: string; data_ultimo_corte: string }
type Rescue = { id: string; telefone: string; mensagem: string; tentativas: number }

const BATCH_SIZE = 100
const MAX_SENDS_PER_RUN = 50

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

function interpolate(template: string, clientName: string, businessName: string, days: number, bookingUrl: string) {
  const firstName = clientName.trim().split(/\s+/)[0] || 'cliente'
  const base = template || 'Ola {{nome}}, sentimos sua falta na {{barbearia}}. Vamos agendar seu proximo corte?'
  const message = base
    .replace(/{{?nome}?}/gi, firstName)
    .replace(/{{?barbearia}?}/gi, businessName)
    .replace(/{{?dias}?}/gi, String(days))
  return bookingUrl && !message.includes(bookingUrl) ? `${message}\n\nAgende aqui: ${bookingUrl}` : message
}

function safeJson(value: unknown) {
  if (!value || typeof value !== 'object') return { received: value ?? null }
  return value as Record<string, unknown>
}

async function enqueueEligibleRescues() {
  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from('perfis_barbearia')
    .select('id,nome_estabelecimento,slug,dias_para_sumido,mensagem_template')
    .eq('resgate_automatico_ativo', true)

  if (error) throw new Error(`profiles: ${error.message}`)

  let queued = 0
  for (const profile of (profiles ?? []) as Profile[]) {
    const days = Math.min(365, Math.max(1, Number(profile.dias_para_sumido ?? 35)))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const { data: clients, error: clientsError } = await admin
      .from('clientes')
      .select('id,nome,telefone,data_ultimo_corte')
      .eq('user_id', profile.id)
      .lte('data_ultimo_corte', cutoff.toISOString().slice(0, 10))
      .order('data_ultimo_corte', { ascending: true })
      .limit(BATCH_SIZE)

    if (clientsError) throw new Error(`clients for ${profile.id}: ${clientsError.message}`)

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    const bookingUrl = siteUrl && profile.slug ? `${siteUrl}/agendar?barbearia=${encodeURIComponent(profile.slug)}` : ''
    const now = Date.now()
    const rows = ((clients ?? []) as Client[])
      .map((client) => {
        const phone = toE164(client.telefone)
        const cutAt = new Date(`${client.data_ultimo_corte}T12:00:00Z`).getTime()
        const daysAbsent = Math.max(days, Math.floor((now - cutAt) / 86_400_000))
        return phone ? {
          user_id: profile.id,
          cliente_id: client.id,
          corte_referencia: client.data_ultimo_corte,
          telefone: phone,
          mensagem: interpolate(profile.mensagem_template ?? '', client.nome, profile.nome_estabelecimento?.trim() || 'sua barbearia', daysAbsent, bookingUrl),
        } : null
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))

    if (!rows.length) continue
    const { error: queueError } = await admin
      .from('resgates_automaticos')
      .upsert(rows, { onConflict: 'cliente_id,corte_referencia', ignoreDuplicates: true })
    if (queueError) throw new Error(`queue for ${profile.id}: ${queueError.message}`)
    queued += rows.length
  }
  return queued
}

async function deliverPendingRescues() {
  const providerUrl = process.env.WHATSAPP_AUTOMATION_API_URL?.trim()
  const providerToken = process.env.WHATSAPP_AUTOMATION_API_TOKEN?.trim()
  if (!providerUrl || !providerToken) return { configured: false, sent: 0, failed: 0 }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('resgates_automaticos')
    .select('id,telefone,mensagem,tentativas')
    .in('status', ['pendente', 'erro'])
    .lt('tentativas', 3)
    .lte('agendado_para', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(MAX_SENDS_PER_RUN)
  if (error) throw new Error(`pending rescues: ${error.message}`)

  let sent = 0
  let failed = 0
  for (const rescue of (data ?? []) as Rescue[]) {
    const { data: claimed } = await admin
      .from('resgates_automaticos')
      .update({ status: 'processando', tentativas: rescue.tentativas + 1, ultimo_erro: null })
      .eq('id', rescue.id)
      .in('status', ['pendente', 'erro'])
      .select('id')
      .maybeSingle()
    if (!claimed) continue

    try {
      const response = await fetch(providerUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json', 'Idempotency-Key': rescue.id },
        body: JSON.stringify({ to: rescue.telefone, message: rescue.mensagem, idempotencyKey: rescue.id }),
        signal: AbortSignal.timeout(15_000),
      })
      const raw = await response.text()
      let responseBody: unknown = raw
      try { responseBody = raw ? JSON.parse(raw) : {} } catch {}
      if (!response.ok) throw new Error(`provider ${response.status}: ${raw.slice(0, 500)}`)
      const body = safeJson(responseBody)
      await admin.from('resgates_automaticos').update({
        status: 'enviado',
        enviado_em: new Date().toISOString(),
        provider_message_id: typeof body.id === 'string' ? body.id : null,
        provider_response: body,
      }).eq('id', rescue.id)
      sent += 1
    } catch (error) {
      await admin.from('resgates_automaticos').update({
        status: 'erro',
        ultimo_erro: error instanceof Error ? error.message.slice(0, 1000) : 'Provider error',
      }).eq('id', rescue.id)
      failed += 1
    }
  }
  return { configured: true, sent, failed }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  try {
    const queued = await enqueueEligibleRescues()
    const delivery = await deliverPendingRescues()
    return NextResponse.json({ ok: true, queued, delivery }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[inactivity-rescues-cron] failed', error)
    return NextResponse.json({ error: 'Falha ao processar resgates automaticos.' }, { status: 500 })
  }
}
