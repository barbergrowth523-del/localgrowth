'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, LayoutDashboard, Scissors, Settings, User, Users } from 'lucide-react'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meus Clientes', href: '/clientes', icon: Users },
  { name: 'Assinatura', href: '/assinatura', icon: CreditCard },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
  { name: 'Perfil', href: '/perfil', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex min-h-screen w-64 flex-col justify-between border-r border-slate-800 bg-slate-950 p-6">
      <div>
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
            <Scissors className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold tracking-wide text-white">BarberGrowth</span>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
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
        <p className="text-center text-xs text-slate-500">BarberGrowth v1.0</p>
      </div>
    </aside>
  )
}
