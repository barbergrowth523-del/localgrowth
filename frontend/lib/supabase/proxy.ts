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
  if (!claims && requiresOwnerSession) return NextResponse.redirect(new URL('/login', request.url))
  if (claims && (path === '/' || path === '/login' || path === '/cadastro')) return NextResponse.redirect(new URL('/dashboard', request.url))
  return response
}

