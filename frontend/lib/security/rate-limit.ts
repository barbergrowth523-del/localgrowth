import 'server-only'

import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

export async function checkPublicRateLimit(request: Request, scope: string, limit: number, windowSeconds: number) {
  const ip = getClientIp(request)
  const bucket = createHash('sha256').update(scope + ':' + ip).digest('hex')
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('consume_public_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('[rate-limit] check failed', { scope, code: error.code })
    return false
  }

  return data === true
}
