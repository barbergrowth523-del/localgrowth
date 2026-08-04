import { BRAND_NAME } from '@/lib/brand'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'
import { hasValidSameOrigin, readJsonBody } from '@/lib/security/request'

const ASAAS_URL = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'
const TRIAL_DAYS = 7

type PlanId = 'starter' | 'pro' | 'scale'
type BillingPeriod = 'monthly' | 'annual'

const PLAN_PRICES: Record<PlanId, number> = { starter: 47, pro: 97, scale: 197 }

type PaymentBody = {
  customerName?: string
  cpfCnpj?: string
  email?: string
  billingType?: 'PIX' | 'CREDIT_CARD'
  planId?: PlanId
  annual?: boolean
  creditCard?: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string }
  creditCardHolderInfo?: { name: string; email: string; cpfCnpj: string; postalCode: string; addressNumber: string; phone: string }
}

type AsaasCustomer = { id?: string; errors?: Array<{ description?: string }> }
type AsaasPayment = { id?: string; status?: string; errors?: Array<{ description?: string }> }
type AsaasSubscription = { id?: string; status?: string; nextDueDate?: string; errors?: Array<{ description?: string }> }

function addBrazilDays(days: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  const value = new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))))
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

async function asaasRequest(path: string, init: RequestInit) {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('Payment provider is not configured.')
  return fetch(`${ASAAS_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: apiKey, ...(init.headers ?? {}) },
  })
}

function getRemoteIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || ''
}

function validateCard(body: PaymentBody, safeEmail: string, safeDocument: string, request: Request) {
  if (!body.creditCard || !body.creditCardHolderInfo) return { error: 'Dados do cartao incompletos.' as const }
  const cardNumber = body.creditCard.number.replace(/\D/g, '')
  const ccv = body.creditCard.ccv.replace(/\D/g, '')
  const holder = body.creditCardHolderInfo
  const postalCode = holder.postalCode.replace(/\D/g, '')
  const addressNumber = holder.addressNumber.trim()
  const phone = holder.phone.replace(/\D/g, '')
  const holderName = body.creditCard.holderName.trim()
  const expiryMonth = body.creditCard.expiryMonth.replace(/\D/g, '')
  const expiryYear = body.creditCard.expiryYear.replace(/\D/g, '')
  const month = Number(expiryMonth)
  const year = Number(expiryYear)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const remoteIp = getRemoteIp(request)
  if (
    cardNumber.length < 13 || cardNumber.length > 19 || ccv.length < 3 || ccv.length > 4 ||
    holderName.length < 2 || holderName.length > 120 || postalCode.length !== 8 ||
    addressNumber.length < 1 || addressNumber.length > 20 || phone.length < 8 || phone.length > 15 ||
    month < 1 || month > 12 || expiryYear.length !== 4 || year < currentYear || year > currentYear + 20 ||
    (year === currentYear && month < currentMonth) || !remoteIp
  ) return { error: 'Dados do cartao invalidos.' as const }

  return {
    remoteIp,
    creditCard: { holderName, number: cardNumber, expiryMonth: expiryMonth.padStart(2, '0'), expiryYear, ccv },
    creditCardHolderInfo: { name: holderName, email: safeEmail, cpfCnpj: safeDocument, postalCode, addressNumber, phone, mobilePhone: phone },
  }
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return NextResponse.json({ success: false, error: 'Origem invalida.' }, { status: 403 })
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Sessao expirada.' }, { status: 401 })

  try {
    const body = await readJsonBody<PaymentBody>(request)
    if (!body) return NextResponse.json({ success: false, error: 'Dados de pagamento invalidos.' }, { status: 400 })
    const allowed = await checkPublicRateLimit(request, 'pagamento', 10, 600)
    if (!allowed) return NextResponse.json({ success: false, error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })

    const customerName = body.customerName?.trim()
    const email = body.email?.trim().toLowerCase()
    const cpfCnpj = body.cpfCnpj?.replace(/\D/g, '')
    const billingType = body.billingType
    const planId = body.planId
    const annual = body.annual === true
    const billingPeriod: BillingPeriod = annual ? 'annual' : 'monthly'
    const monthlyPrice = planId ? PLAN_PRICES[planId] : undefined
    const value = monthlyPrice ? (annual ? monthlyPrice * 10 : monthlyPrice) : 0
    const validEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    const validDocument = cpfCnpj?.length === 11 || cpfCnpj?.length === 14
    if (!customerName || customerName.length > 120 || !validEmail || !validDocument || !billingType || !planId || !monthlyPrice) {
      return NextResponse.json({ success: false, error: 'Preencha os dados obrigatorios do pagamento.' }, { status: 400 })
    }

    const safeEmail = email as string
    const safeDocument = cpfCnpj as string
    const customerResponse = await asaasRequest('/customers', { method: 'POST', body: JSON.stringify({ name: customerName, email: safeEmail, cpfCnpj: safeDocument, externalReference: user.id }) })
    const customerData = await customerResponse.json() as AsaasCustomer
    if (!customerResponse.ok || !customerData.id) return NextResponse.json({ success: false, error: customerData.errors?.[0]?.description ?? 'Erro ao cadastrar cliente no gateway.' }, { status: 400 })

    const externalReference = `${user.id}:${planId}:${billingPeriod}`
    if (billingType === 'CREDIT_CARD') {
      const card = validateCard(body, safeEmail, safeDocument, request)
      if ('error' in card) return NextResponse.json({ success: false, error: card.error }, { status: 400 })

      const trialEndsAt = addBrazilDays(TRIAL_DAYS)
      const subscriptionResponse = await asaasRequest('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerData.id,
          billingType: 'CREDIT_CARD',
          value,
          nextDueDate: trialEndsAt,
          cycle: annual ? 'YEARLY' : 'MONTHLY',
          description: `${annual ? 'Assinatura Anual' : 'Assinatura Mensal'} - ${BRAND_NAME} - ${planId} - trial de ${TRIAL_DAYS} dias`,
          externalReference,
          creditCard: card.creditCard,
          creditCardHolderInfo: card.creditCardHolderInfo,
          remoteIp: card.remoteIp,
        }),
      })
      const subscriptionData = await subscriptionResponse.json() as AsaasSubscription
      if (!subscriptionResponse.ok || !subscriptionData.id) {
        return NextResponse.json({ success: false, error: subscriptionData.errors?.[0]?.description ?? 'Erro ao criar assinatura com trial.' }, { status: 400 })
      }

      const admin = createAdminClient()
      const trialStartedAt = new Date().toISOString()
      const { error: persistenceError } = await admin.from('asaas_subscriptions').upsert({
        user_id: user.id,
        provider_subscription_id: subscriptionData.id,
        provider_customer_id: customerData.id,
        plan: planId,
        billing_period: billingPeriod,
        status: 'trial',
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
      }, { onConflict: 'provider_subscription_id' })
      if (persistenceError) {
        console.error('[api/pagamento] unable to persist Asaas subscription', { code: persistenceError.code })
        return NextResponse.json({ success: false, error: 'Assinatura criada, mas nao foi possivel ativar o trial. Contate o suporte.' }, { status: 500 })
      }
      const { error: profileError } = await admin.from('perfis_barbearia').update({
        plano: planId,
        data_inicio_assinatura: trialStartedAt,
        data_vencimento: `${trialEndsAt}T00:00:00.000Z`,
        renovacao_automatica: true,
      }).eq('id', user.id)
      if (profileError) {
        console.error('[api/pagamento] unable to activate trial profile', { code: profileError.code })
        return NextResponse.json({ success: false, error: 'Assinatura criada, mas nao foi possivel ativar o trial. Contate o suporte.' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        trial: { days: TRIAL_DAYS, endsAt: trialEndsAt },
        subscription: { id: subscriptionData.id, status: subscriptionData.status, nextDueDate: subscriptionData.nextDueDate ?? trialEndsAt },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (billingType !== 'PIX') return NextResponse.json({ success: false, error: 'Forma de pagamento invalida.' }, { status: 400 })
    const paymentResponse = await asaasRequest('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerData.id,
        billingType: 'PIX',
        value,
        dueDate: addBrazilDays(0),
        description: `${annual ? 'Assinatura Anual' : 'Assinatura Mensal'} - ${BRAND_NAME} - ${planId}`,
        externalReference,
      }),
    })
    const paymentData = await paymentResponse.json() as AsaasPayment
    if (!paymentResponse.ok || !paymentData.id) return NextResponse.json({ success: false, error: paymentData.errors?.[0]?.description ?? 'Erro ao criar cobranca.' }, { status: 400 })
    const pixResponse = await asaasRequest(`/payments/${paymentData.id}/pixQrCode`, { method: 'GET' })
    const pix = await pixResponse.json()
    return NextResponse.json({ success: true, payment: { id: paymentData.id, status: paymentData.status }, pix }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/pagamento] request failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Erro inesperado ao processar pagamento.' }, { status: 500 })
  }
}
