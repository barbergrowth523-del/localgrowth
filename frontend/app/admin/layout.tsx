import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { getAdminErrorStatus, requireSuperAdmin } from '@/lib/admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireSuperAdmin()
  } catch (error) {
    if (getAdminErrorStatus(error) === 401) redirect('/login?next=/admin/dashboard')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <BrandLogo markClassName="h-9 w-auto max-w-[130px]" />
            <span className="hidden h-6 w-px bg-slate-800 sm:block" />
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Super Admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:text-white"
          >
            Voltar ao painel
          </Link>
        </div>
      </header>
      {children}
    </div>
  )
}
