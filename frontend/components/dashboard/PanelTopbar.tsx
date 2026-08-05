'use client'

import { Sparkles } from 'lucide-react'
import { NotificationCenter } from '@/components/dashboard/NotificationCenter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function PanelTopbar() {
  return <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
    <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2" aria-label="Acoes do painel">
        <ThemeToggle iconOnly />
        <NotificationCenter inline />
      </div>
      <span className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:inline-flex"><Sparkles className="h-4 w-4 text-emerald-400" /> Painel Prontusfy</span>
    </div>
  </header>
}
