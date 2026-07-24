import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/security/rate-limit'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const allowed = await checkPublicRateLimit(request, 'avaliacoes', 10, 600)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
    }
    const body = await request.json() as { token?: string; estrelas?: number; comentario?: string }
    const token = body.token?.trim() ?? ''
    const stars = Number(body.estrelas)
    const comment = body.comentario?.trim() || null

    if (!uuidPattern.test(token) || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Informe uma avaliacao de 1 a 5 estrelas.' }, { status: 400 })
    }
    if (comment && comment.length > 1000) {
      return NextResponse.json({ error: 'O comentario deve ter no maximo 1000 caracteres.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error: reviewError } = await supabase.rpc('submit_appointment_review', {
      p_token: token,
      p_stars: stars,
      p_comment: comment,
    })

    if (reviewError?.message.includes('review_already_submitted')) {
      return NextResponse.json({ error: 'Este atendimento ja foi avaliado.' }, { status: 409 })
    }
    if (reviewError?.message.includes('appointment_not_reviewable')) {
      return NextResponse.json({ error: 'Atendimento nao encontrado ou ainda nao concluido.' }, { status: 404 })
    }
    if (reviewError) {
      console.error('[api/avaliacoes] atomic review failed', { code: reviewError.code, message: reviewError.message })
      return NextResponse.json({ error: 'Nao foi possivel salvar a avaliacao.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/avaliacoes] request failed', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Requisicao invalida.' }, { status: 400 })
  }
}
