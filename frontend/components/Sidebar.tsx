'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, CreditCard, LayoutDashboard, LogOut, Settings, User, Users, UsersRound } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { BRAND_NAME } from '@/lib/brand'
import { createClient } from '@/lib/supabase/client'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meus Clientes', href: '/clientes', icon: Users },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Minha Equipe', href: '/equipe', icon: UsersRound },
  { name: 'Relatorios', href: '/relatorios', icon: BarChart3 },
  { name: 'Assinatura', href: '/assinatura', icon: CreditCard },
  { name: 'Configuracoes', href: '/configuracoes', icon: Settings },
  { name: 'Perfil', href: '/perfil', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()

  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 p-6 lg:flex">
        <div>
          <div className="mb-4 flex flex-col items-center justify-center p-2"><BrandLogo className="w-full" markClassName="h-auto w-full max-w-[180px]" /></div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-slate-900 pt-4">
          <button onClick={signOut} className="mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300" aria-label="Sair da conta" title="Sair da conta">
            <LogOut className="h-5 w-5" />
            Sair da conta
          </button>
          <p className="text-center text-xs text-slate-500">{BRAND_NAME} v1.0</p>
        </div>
      </aside>

      <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-lg lg:hidden">
        <div className="flex min-w-max gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition ${
                  isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
          <button type="button" onClick={signOut} className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300" aria-label="Sair da conta">
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </nav>
    </>
  )
}
