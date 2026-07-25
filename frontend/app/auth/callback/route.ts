import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'barbergrowth523@gmail.com'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login?error=oauth_code_missing', url))

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL('/login?error=oauth_failed', url))

  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.trim().toLowerCase() ?? ''
  let isAdmin = email === ADMIN_EMAIL || user?.app_metadata?.role === 'admin'
  if (!isAdmin && user) {
    const { data: profile } = await supabase.from('perfis_barbearia').select('role').eq('id', user.id).maybeSingle()
    isAdmin = profile?.role === 'admin'
  }

  return NextResponse.redirect(new URL(isAdmin ? '/admin/dashboard' : '/dashboard', url))
}
