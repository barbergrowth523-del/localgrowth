import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'

type AccountProfile = {
  nome_estabelecimento: string | null
  plano: string | null
  data_vencimento: string | null
  renovacao_automatica: boolean | null
}

const FAQ = [
  { keys: ['qr code', 'qrcode', 'placa', 'cadastro rapido'], answer: 'Abra Meus Clientes e procure o card Cadastro via QR Code. Ali voce pode copiar o link permanente, baixar a imagem PNG, gerar o PDF ou imprimir a placa para o balcao.' },
  { keys: ['whatsapp', 'disparo', 'mensagem', 'resgate'], answer: 'Os botoes de WhatsApp abrem uma conversa com a mensagem pronta e o link de agendamento. Voce pode ajustar o template em Configuracoes > Marketing antes de enviar.' },
  { keys: ['importar', 'csv', 'planilha', 'excel'], answer: 'No Dashboard, clique em Importar planilha CSV. Use colunas de nome, telefone e ultimo corte. O sistema salva os clientes na sua conta e atualiza as metricas.' },
  { keys: ['agenda', 'agendamento', 'horario', 'marcar corte'], answer: 'Na Agenda voce acompanha os horarios do mes e cria agendamentos manuais. Para receber agendamentos dos clientes, envie o link publico exibido no sistema.' },
  { keys: ['equipe', 'barbeiro', 'profissional', 'relatorio'], answer: 'Minha Equipe e Relatorios individuais sao recursos do Plano Scale. Neles voce cadastra profissionais e acompanha cortes, faturamento, comissao e satisfacao.' },
] as const

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function formatDate(value: string | null) {
  if (!value) return 'sem vencimento informado'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'sem vencimento informado' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia' }).format(parsed)
}

function accountAnswer(profile: AccountProfile | null) {
  const name = profile?.nome_estabelecimento?.trim() || 'sua barbearia'
  const plan = String(profile?.plano ?? 'starter').replace(/^plano\s+/i, '')
  const renewal = profile?.renovacao_automatica === false ? 'desativada' : 'ativada'
  return `${name} esta no Plano ${plan.charAt(0).toUpperCase()}${plan.slice(1)}. O vencimento atual e ${formatDate(profile?.data_vencimento ?? null)} e a renovacao automatica esta ${renewal}.`
}

function getFaqAnswer(message: string, profile: AccountProfile | null) {
  const normalized = normalize(message)
  const asksAccount = ['meu plano', 'minha conta', 'assinatura', 'vencimento', 'renovacao', 'qual plano'].some((key) => normalized.includes(key))
  if (asksAccount) return accountAnswer(profile)
  return FAQ.find((entry) => entry.keys.some((key) => normalized.includes(key)))?.answer ?? null
}

function wantsHuman(message: string) {
  const normalized = normalize(message)
  return ['humano', 'atendente', 'suporte', 'chamado', 'falar com alguem'].some((key) => normalized.includes(key))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })

  if (!await checkPublicRateLimit(request, 'support-chat', 30, 600)) {
    return NextResponse.json({ error: 'Muitas mensagens. Tente novamente em alguns minutos.' }, { status: 429 })
  }

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Mensagem invalida.' }, { status: 400 }) }
  const message = typeof (body as { message?: unknown })?.message === 'string' ? (body as { message: string }).message.trim() : ''
  if (!message || message.length > 2000) return NextResponse.json({ error: 'Digite uma mensagem de ate 2000 caracteres.' }, { status: 400 })

  const { data, error: profileError } = await supabase.from('perfis_barbearia').select('nome_estabelecimento,plano,data_vencimento,renovacao_automatica').eq('id', user.id).maybeSingle()
  if (profileError) console.error('[support-chat] profile lookup failed', { code: profileError.code })
  const profile = data as AccountProfile | null
  const answer = getFaqAnswer(message, profile)
  if (answer && !wantsHuman(message)) return NextResponse.json({ reply: answer, handover: false }, { headers: { 'Cache-Control': 'private, no-store' } })

  const { data: ticket, error: ticketError } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    barbearia_nome: profile?.nome_estabelecimento?.trim() || 'Barbearia sem nome',
    user_email: user.email ?? null,
    mensagem: message,
    categoria: wantsHuman(message) ? 'suporte_humano' : 'duvida_complexa',
    contexto: { plano: profile?.plano ?? 'starter', vencimento: profile?.data_vencimento ?? null, renovacao_automatica: profile?.renovacao_automatica ?? true },
  }).select('id').single()

  if (ticketError) {
    console.error('[support-chat] handover failed', { code: ticketError.code, details: ticketError.details })
    return NextResponse.json({ error: 'Nao foi possivel registrar o chamado agora.' }, { status: 500 })
  }

  return NextResponse.json({
    reply: 'Essa duvida precisa de uma analise humana. Seu chamado foi registrado e o suporte respondera nos horarios de atendimento, durante o almoco ou a noite.',
    handover: true,
    ticketId: ticket.id,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
