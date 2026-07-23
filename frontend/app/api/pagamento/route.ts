import { BRAND_NAME } from '@/lib/brand'
import { NextResponse } from 'next/server'

const ASAAS_URL = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3'

type PaymentBody = {
  customerName?: string
  cpfCnpj?: string
  email?: string
  billingType?: 'PIX' | 'CREDIT_CARD'
  value?: number
  creditCard?: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string }
  creditCardHolderInfo?: { name: string; email: string; cpfCnpj: string; postalCode: string; addressNumber: string; phone: string }
}

async function asaasRequest(path: string, init: RequestInit) {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('ASAAS_API_KEY não configurada no servidor.')
  return fetch(`${ASAAS_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', access_token: apiKey, ...(init.headers ?? {}) },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as PaymentBody
    const customerName = body.customerName?.trim()
    const email = body.email?.trim()
    const cpfCnpj = body.cpfCnpj?.replace(/\D/g, '')
    const billingType = body.billingType
    const value = Number(body.value)

    if (!customerName || !email || !cpfCnpj || !billingType || !Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ success: false, error: 'Preencha os dados obrigatórios do pagamento.' }, { status: 400 })
    }

    const customerResponse = await asaasRequest('/customers', { method: 'POST', body: JSON.stringify({ name: customerName, email, cpfCnpj }) })
    const customerData = await customerResponse.json() as { id?: string; errors?: Array<{ description?: string }> }
    if (!customerResponse.ok || !customerData.id) {
      return NextResponse.json({ success: false, error: customerData.errors?.[0]?.description ?? 'Erro ao cadastrar cliente no gateway.' }, { status: 400 })
    }

    const paymentPayload: Record<string, unknown> = {
      customer: customerData.id,
      billingType,
      value,
      dueDate: new Date().toISOString().split('T')[0],
      description: 'Assinatura Mensal - ' + BRAND_NAME,
    }

    if (billingType === 'CREDIT_CARD') {
      if (!body.creditCard || !body.creditCardHolderInfo) return NextResponse.json({ success: false, error: 'Dados do cartão incompletos.' }, { status: 400 })
      paymentPayload.creditCard = body.creditCard
      paymentPayload.creditCardHolderInfo = body.creditCardHolderInfo
      paymentPayload.remoteIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    }

    const paymentResponse = await asaasRequest('/payments', { method: 'POST', body: JSON.stringify(paymentPayload) })
    const paymentData = await paymentResponse.json() as { id?: string; errors?: Array<{ description?: string }> }
    if (!paymentResponse.ok || !paymentData.id) return NextResponse.json({ success: false, error: paymentData.errors?.[0]?.description ?? 'Erro ao criar cobrança.' }, { status: 400 })

    let pix = null
    if (billingType === 'PIX') {
      const pixResponse = await asaasRequest(`/payments/${paymentData.id}/pixQrCode`, { method: 'GET' })
      pix = await pixResponse.json()
    }

    return NextResponse.json({ success: true, payment: paymentData, pix })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Erro inesperado ao processar pagamento.' }, { status: 500 })
  }
}
