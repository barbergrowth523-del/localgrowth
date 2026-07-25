import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { getAdminErrorMessage, getAdminErrorStatus, requireSuperAdmin } from '@/lib/admin'

function validOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || origin === new URL(request.url).origin }
function estimateTokens(value: string) { return Math.max(1, Math.ceil(value.length / 4)) }

async function generateDraft(prompt: string) {
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_SUPPORT_MODEL ?? 'gpt-4.1-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.35 }), cache: 'no-store' })
    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`)
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    return { draft: data.choices?.[0]?.message?.content?.trim() ?? '', inputTokens: data.usage?.prompt_tokens ?? estimateTokens(prompt), outputTokens: data.usage?.completion_tokens ?? 0, model: process.env.OPENAI_SUPPORT_MODEL ?? 'gpt-4.1-mini', source: 'ai' as const }
  }
  if (process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY) {
    const result = await generateText({ model: 'openai/gpt-5.4', prompt })
    return { draft: result.text.trim(), inputTokens: estimateTokens(prompt), outputTokens: estimateTokens(result.text), model: 'openai/gpt-5.4', source: 'ai' as const }
  }
  return { draft: '', inputTokens: estimateTokens(prompt), outputTokens: 0, model: 'template-fallback', source: 'template' as const }
}

export async function POST(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: 'Origem invalida.' }, { status: 403 })
  try {
    const { user, admin } = await requireSuperAdmin()
    const body = await request.json() as { ticketId?: unknown }
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId : ''
    if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return NextResponse.json({ error: 'Chamado invalido.' }, { status: 400 })
    const { data: ticket, error } = await admin.from('support_tickets').select('id,user_id,barbearia_nome,user_email,mensagem,categoria,status').eq('id', ticketId).maybeSingle()
    if (error || !ticket) return NextResponse.json({ error: 'Chamado nao encontrado.' }, { status: 404 })
    const prompt = `Voce e um especialista de suporte do Prontusfy, um SaaS de gestao para barbearias. Escreva somente um rascunho de resposta em portugues do Brasil para o chamado abaixo. Seja empatico, objetivo e tecnico. Nao invente recursos, prazos, descontos ou acessos. Se faltar contexto, diga de forma educada qual dado precisa ser confirmado. Nao use markdown, listas ou saudacoes longas. Limite de 900 caracteres.\n\nBarbearia: ${ticket.barbearia_nome}\nCategoria: ${ticket.categoria}\nMensagem: ${ticket.mensagem}`
    const generated = await generateDraft(prompt)
    const draft = (generated.draft || `Ola! Obrigado por detalhar a situacao. Vou revisar o seu caso sobre ${ticket.categoria.replaceAll('_', ' ')} e confirmar os proximos passos. Se puder, envie uma captura de tela ou informe em qual etapa o problema acontece.`).slice(0, 900)
    const outputTokens = generated.outputTokens || estimateTokens(draft)
    await admin.from('ai_usage_events').insert({ user_id: ticket.user_id, feature: 'admin_support_draft', model: generated.model, input_tokens: generated.inputTokens, output_tokens: outputTokens, estimated_cost_brl: generated.source === 'ai' ? Number(((generated.inputTokens * 0.0000005) + (outputTokens * 0.0000015)).toFixed(6)) : 0, metadata: { ticket_id: ticket.id, generated_by: user.id, source: generated.source } })
    await admin.from('admin_audit_log').insert({ admin_id: user.id, target_user_id: ticket.user_id, action: 'generate_ai_support_draft', metadata: { ticketId: ticket.id, source: generated.source } })
    return NextResponse.json({ draft, source: generated.source }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { console.error('[admin-ai-suggest] failed', error instanceof Error ? error.message : error); return NextResponse.json({ error: getAdminErrorMessage(error) }, { status: getAdminErrorStatus(error) }) }
}
