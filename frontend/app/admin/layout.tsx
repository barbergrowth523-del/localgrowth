import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3, BellRing, Gauge, LayoutDashboard, Settings2, ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { getAdminErrorStatus, requireSuperAdmin } from '@/lib/admin'

const navigation = [
  { href: '/admin/dashboard', label: 'Visao geral', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/plans', label: 'Planos e cupons', icon: Settings2 },
  { href: '/admin/broadcast', label: 'Broadcast', icon: BellRing },
  { href: '/admin/system', label: 'Sistema', icon: Gauge },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSuperAdmin()
  } catch (error) {
    if (getAdminErrorStatus(error) === 401) redirect('/login?next=/admin/dashboard')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4"><BrandLogo markClassName="h-9 w-auto max-w-[130px]" /><span className="hidden h-6 w-px bg-slate-800 sm:block" /><span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> Super Admin</span></div>
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 lg:hidden">Painel</Link>
          </div>
          <nav aria-label="Navegacao administrativa" className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
            {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"><Icon className="h-4 w-4" />{label}</Link>)}
          </nav>
          <Link href="/dashboard" className="hidden rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:text-white lg:block">Voltar ao painel</Link>
        </div>
      </header>
      {children}
    </div>
  )
}
