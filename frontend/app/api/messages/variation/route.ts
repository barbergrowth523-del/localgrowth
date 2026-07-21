import { generateText } from 'ai'
import { NextResponse } from 'next/server'

type Tone = 'amigavel' | 'oferta' | 'direto'

const fallbackMessages: Record<Tone, (name: string, bookingUrl: string) => string> = {
  amigavel: (name, bookingUrl) => `Oi, ${name}! Tudo bem? Sentimos sua falta por aqui. Que tal separar um horário para dar aquele trato no visual? ${bookingUrl}`,
  oferta: (name, bookingUrl) => `Oi, ${name}! Preparamos uma condição especial para você voltar à cadeira esta semana. Bora aproveitar? ${bookingUrl}`,
  direto: (name, bookingUrl) => `Oi, ${name}! Já está na hora do próximo corte. Escolha seu melhor horário aqui: ${bookingUrl}`,
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: string; tone?: Tone; bookingUrl?: string }
  const name = body.name?.trim() || 'cliente'
  const tone = body.tone && fallbackMessages[body.tone] ? body.tone : 'amigavel'
  const bookingUrl = body.bookingUrl?.trim() || ''

  if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json({ message: fallbackMessages[tone](name, bookingUrl), source: 'template' })
  }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.4',
      prompt: `Escreva uma única mensagem curta de WhatsApp, em português do Brasil, para uma barbearia reativar o cliente ${name}. Use tom ${tone}. Não use markdown, não invente descontos e termine incluindo este link de agendamento quando existir: ${bookingUrl || 'sem link disponível'}.`,
    })
    return NextResponse.json({ message: text.trim(), source: 'ai' })
  } catch {
    return NextResponse.json({ message: fallbackMessages[tone](name, bookingUrl), source: 'template' })
  }
}
