'use client'

import Link from 'next/link'
import { Sparkles, User } from 'lucide-react'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useAuth } from '@/components/auth/AuthProvider'

const formatPlan = (value: string) => {
  const clean = value.replace(/^plano\s+/i, '').trim()
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : 'Starter'
}

export function PanelTopbar() {
  const { user, plan, subscriptionActive } = useAuth()
  const profileName = user?.email?.split('@')[0] || 'Perfil'
  const greetingName = profileName.split(/[._-]+/).filter(Boolean)[0] || profileName
  const planLabel = `Plano ${formatPlan(plan)}`

  return <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
    <div className="relative flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <p className="min-w-0 truncate text-base font-bold tracking-tight text-white sm:text-lg">Bom dia, {greetingName}</p>
      <Link href="/assinatura" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 sm:inline-flex"><Sparkles size={13} className="text-emerald-400" /><span>{planLabel} {subscriptionActive ? 'Ativo' : ''}</span></Link>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        <ThemeToggle iconOnly />
        <NotificationCenter inline />
        <Link href="/assinatura" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 sm:hidden"><Sparkles size={13} className="text-emerald-400" /><span>{formatPlan(plan)}</span></Link>
        <button type="button" className="flex min-w-0 items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700"><User size={15} className="shrink-0 text-emerald-400" /><span className="max-w-24 truncate sm:max-w-40">{profileName}</span></button>
      </div>
    </div>
  </header>
}