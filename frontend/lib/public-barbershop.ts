import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type PublicBarbershop = {
  id: string
  slug: string
  name: string
}

export async function resolvePublicBarbershop(value: string): Promise<PublicBarbershop | null> {
  const slug = value.trim().toLowerCase()
  if (!slugPattern.test(slug) || slug.length > 80) return null

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('perfis_barbearia')
      .select('id,slug,nome_estabelecimento')
      .eq('slug', slug)
      .eq('acesso_bloqueado', false)
      .maybeSingle()

    if (error) {
      console.error('[public-barbershop] lookup failed', { code: error.code })
      return null
    }
    if (!data) return null

    return {
      id: data.id,
      slug: data.slug,
      name: data.nome_estabelecimento?.trim() || 'Barbearia',
    }
  } catch (error) {
    console.error('[public-barbershop] resolver unavailable', error instanceof Error ? error.message : 'unknown error')
    return null
  }
}