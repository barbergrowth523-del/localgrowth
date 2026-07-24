import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'

type Tone = 'amigavel' | 'oferta' | 'direto'

const fallbackMessages: Record<Tone, (name: string, bookingUrl: string) => string> = {
  amigavel: (name, bookingUrl) => `Oi, ${name}! Tudo bem? Sentimos sua falta por aqui. Que tal separar um horario para dar aquele trato no visual? ${bookingUrl}`,
  oferta: (name, bookingUrl) => `Oi, ${name}! Preparamos uma condicao especial para voce voltar a cadeira esta semana. Bora aproveitar? ${bookingUrl}`,
  direto: (name, bookingUrl) => `Oi, ${name}! Ja esta na hora do proximo corte. Escolha seu melhor horario aqui: ${bookingUrl}`,
}

export async function POST(request: Request) {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 })
  }


  const allowed = await checkPublicRateLimit(request, 'message-variation', 20, 60)
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
  }
  const body = await request.json() as { name?: string; tone?: Tone; bookingUrl?: string }
  const name = body.name?.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 80) || 'cliente'
  const tone = body.tone && fallbackMessages[body.tone] ? body.tone : 'amigavel'
  const requestedBookingUrl = body.bookingUrl?.trim().slice(0, 500) || ''
  let bookingUrl = ''

  if (requestedBookingUrl) {
    try {
      const parsedUrl = new URL(requestedBookingUrl)
      if (parsedUrl.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && parsedUrl.protocol === 'http:')) {
        bookingUrl = parsedUrl.toString()
      }
    } catch {
      return NextResponse.json({ error: 'Link de agendamento invalido.' }, { status: 400 })
    }
  }

  if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({ message: fallbackMessages[tone](name, bookingUrl), source: 'template' })
  }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.4',
      prompt: `Escreva uma unica mensagem curta de WhatsApp, em portugues do Brasil, para uma barbearia reativar o cliente ${name}. Use tom ${tone}. Nao use markdown, nao invente descontos e termine incluindo este link de agendamento quando existir: ${bookingUrl || 'sem link disponivel'}.`,
    })
    return NextResponse.json({ message: text.trim(), source: 'ai' })
  } catch {
    return NextResponse.json({ message: fallbackMessages[tone](name, bookingUrl), source: 'template' })
  }
}
