import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const protectedOwnerRoutes = [
  '/dashboard',
  '/clientes',
  '/agenda',
  '/assinatura',
  '/configuracoes',
  '/perfil',
  '/equipe',
  '/relatorios',
]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } },
  })
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const path = request.nextUrl.pathname
  const requiresOwnerSession = protectedOwnerRoutes.some((route) => path === route || path.startsWith(route + '/'))
  const requiresAdminSession = path === '/admin' || path.startsWith('/admin/') || path === '/api/admin' || path.startsWith('/api/admin/')
  const appMetadata = claims?.app_metadata as { role?: unknown } | undefined
  const isAdminClaim = appMetadata?.role === 'admin'

  if (!claims && requiresAdminSession) {
    if (path.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Sessao administrativa nao encontrada.' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login?next=/admin/dashboard', request.url))
  }
  if (claims && requiresAdminSession && !isAdminClaim) {
    if (path.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Acesso administrativo negado.' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (!claims && requiresOwnerSession) return NextResponse.redirect(new URL('/login', request.url))
  if (claims && (path === '/' || path === '/login' || path === '/cadastro')) return NextResponse.redirect(new URL('/dashboard', request.url))
  return response
}

