import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type PlanId = 'starter' | 'pro' | 'scale'
type BillingPeriod = 'monthly' | 'annual'

type AsaasWebhook = {
  id?: string
  event?: string
  payment?: {
    id?: string
    value?: number
    externalReference?: string
    confirmedDate?: string
    clientPaymentDate?: string
    paymentDate?: string
  }
}

const acceptedEvents = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
const planPrices: Record<PlanId, number> = { starter: 47, pro: 97, scale: 197 }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function tokensMatch(received: string | null, expected: string) {
  if (!received) return false
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function parseReference(value: string | undefined) {
  const [userId, plan, period, extra] = value?.split(':') ?? []
  if (
    extra ||
    !uuidPattern.test(userId ?? '') ||
    !['starter', 'pro', 'scale'].includes(plan ?? '') ||
    !['monthly', 'annual'].includes(period ?? '')
  ) return null

  return { userId, plan: plan as PlanId, period: period as BillingPeriod }
}

export async function POST(request: Request) {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
  if (!webhookToken) {
    console.error('[webhooks/asaas] ASAAS_WEBHOOK_TOKEN is not configured')
    return NextResponse.json({ received: false }, { status: 503 })
  }

  if (!tokensMatch(request.headers.get('asaas-access-token'), webhookToken)) {
    return NextResponse.json({ received: false }, { status: 401 })
  }

  let body: AsaasWebhook
  try {
    body = (await request.json()) as AsaasWebhook
  } catch {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  if (!body.event || !acceptedEvents.has(body.event)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const eventId = body.id?.trim()
  const paymentId = body.payment?.id?.trim()
  const reference = parseReference(body.payment?.externalReference)
  if (!eventId || !paymentId || !reference) {
    console.error('[webhooks/asaas] invalid event metadata', {
      hasEventId: Boolean(eventId),
      hasPaymentId: Boolean(paymentId),
      hasReference: Boolean(reference),
    })
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const expectedValue = planPrices[reference.plan] * (reference.period === 'annual' ? 10 : 1)
  const receivedValue = Number(body.payment?.value)
  if (!Number.isFinite(receivedValue) || Math.abs(receivedValue - expectedValue) > 0.009) {
    console.error('[webhooks/asaas] payment value mismatch', { eventId, paymentId })
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const confirmedAtValue = body.payment?.confirmedDate ?? body.payment?.clientPaymentDate ?? body.payment?.paymentDate ?? new Date().toISOString()
  const confirmedAt = new Date(confirmedAtValue)
  if (Number.isNaN(confirmedAt.getTime())) {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('process_asaas_subscription_event', {
    p_event_id: eventId,
    p_payment_id: paymentId,
    p_user_id: reference.userId,
    p_plan: reference.plan,
    p_billing_period: reference.period,
    p_confirmed_at: confirmedAt.toISOString(),
  })

  if (error) {
    console.error('[webhooks/asaas] persistence failed', { eventId, code: error.code })
    return NextResponse.json({ received: false }, { status: 500 })
  }

  return NextResponse.json(
    { received: true, duplicate: data === false },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
