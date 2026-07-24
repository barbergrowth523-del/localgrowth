import { BRAND_NAME } from '@/lib/brand'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'

const ASAAS_URL = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'

type PlanId = 'starter' | 'pro' | 'scale'

const PLAN_PRICES: Record<PlanId, number> = {
  starter: 47,
  pro: 97,
  scale: 197,
}

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

async function asaasRequest(path: string, init: RequestInit) {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('Payment provider is not configured.')
  return fetch(`${ASAAS_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: apiKey, ...(init.headers ?? {}) },
  })
}

export async function POST(request: Request) {
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Sessao expirada.' }, { status: 401 })
    }

  try {
    const body = await request.json() as PaymentBody

    const allowed = await checkPublicRateLimit(request, 'pagamento', 10, 600)
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
    }
    const customerName = body.customerName?.trim()
    const email = body.email?.trim().toLowerCase()
    const cpfCnpj = body.cpfCnpj?.replace(/\D/g, '')
    const billingType = body.billingType
    const planId = body.planId
    const annual = body.annual === true
    const monthlyPrice = planId ? PLAN_PRICES[planId] : undefined
    const value = monthlyPrice ? (annual ? monthlyPrice * 10 : monthlyPrice) : 0

    const validEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    const validDocument = cpfCnpj?.length === 11 || cpfCnpj?.length === 14
    const validBillingType = billingType === 'PIX' || billingType === 'CREDIT_CARD'
    if (!customerName || customerName.length > 120 || !validEmail || !validDocument || !validBillingType || !planId || !monthlyPrice) {
      return NextResponse.json({ success: false, error: 'Preencha os dados obrigatorios do pagamento.' }, { status: 400 })
    }

    const safeEmail = email as string
    const safeDocument = cpfCnpj as string

    const customerResponse = await asaasRequest('/customers', { method: 'POST', body: JSON.stringify({ name: customerName, email: safeEmail, cpfCnpj: safeDocument, externalReference: user.id }) })
    const customerData = await customerResponse.json() as { id?: string; errors?: Array<{ description?: string }> }
    if (!customerResponse.ok || !customerData.id) {
      return NextResponse.json({ success: false, error: customerData.errors?.[0]?.description ?? 'Erro ao cadastrar cliente no gateway.' }, { status: 400 })
    }

    const paymentPayload: Record<string, unknown> = {
      customer: customerData.id,
      billingType,
      value,
      dueDate: new Date().toISOString().split('T')[0],
      description: (annual ? 'Assinatura Anual - ' : 'Assinatura Mensal - ') + BRAND_NAME + ' - ' + planId,
      externalReference: user.id + ':' + planId + ':' + (annual ? 'annual' : 'monthly'),
    }

    if (billingType === 'CREDIT_CARD') {
      if (!body.creditCard || !body.creditCardHolderInfo) return NextResponse.json({ success: false, error: 'Dados do cartao incompletos.' }, { status: 400 })
      const cardNumber = body.creditCard.number.replace(/\D/g, '')
      const ccv = body.creditCard.ccv.replace(/\D/g, '')
      if (cardNumber.length < 13 || cardNumber.length > 19 || ccv.length < 3 || ccv.length > 4) {
        return NextResponse.json({ success: false, error: 'Dados do cartao invalidos.' }, { status: 400 })
      }

      const holder = body.creditCardHolderInfo
      const postalCode = holder.postalCode.replace(/\D/g, '')
      const addressNumber = holder.addressNumber.trim()
      const phone = holder.phone.replace(/\D/g, '')
      const holderName = body.creditCard.holderName.trim()
      const expiryMonth = body.creditCard.expiryMonth.replace(/\D/g, '')
      const expiryYear = body.creditCard.expiryYear.replace(/\D/g, '')
      const month = Number(expiryMonth)
      const year = Number(expiryYear)
      const currentYear = new Date().getFullYear()
      if (
        holderName.length < 2 || holderName.length > 120 ||
        postalCode.length !== 8 || addressNumber.length < 1 || addressNumber.length > 20 ||
        phone.length < 8 || phone.length > 15 ||
        month < 1 || month > 12 || expiryYear.length !== 4 || year < currentYear || year > currentYear + 20
      ) {
        return NextResponse.json({ success: false, error: 'Dados do titular invalidos.' }, { status: 400 })
      }

      paymentPayload.creditCard = {
        holderName,
        number: cardNumber,
        expiryMonth: expiryMonth.padStart(2, '0'),
        expiryYear,
        ccv,
      }
      paymentPayload.creditCardHolderInfo = {
        name: holderName,
        email: safeEmail,
        cpfCnpj: safeDocument,
        postalCode,
        addressNumber,
        phone,
      }
      const remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
      if (!remoteIp) return NextResponse.json({ success: false, error: 'Nao foi possivel validar a origem do pagamento.' }, { status: 400 })
      paymentPayload.remoteIp = remoteIp
    }

    const paymentResponse = await asaasRequest('/payments', { method: 'POST', body: JSON.stringify(paymentPayload) })
    const paymentData = await paymentResponse.json() as { id?: string; status?: string; errors?: Array<{ description?: string }> }
    if (!paymentResponse.ok || !paymentData.id) return NextResponse.json({ success: false, error: paymentData.errors?.[0]?.description ?? 'Erro ao criar cobranca.' }, { status: 400 })

    let pix = null
    if (billingType === 'PIX') {
      const pixResponse = await asaasRequest(`/payments/${paymentData.id}/pixQrCode`, { method: 'GET' })
      pix = await pixResponse.json()
    }

    return NextResponse.json({ success: true, payment: { id: paymentData.id, status: paymentData.status }, pix }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/pagamento] request failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ success: false, error: 'Erro inesperado ao processar pagamento.' }, { status: 500 })
  }
}
