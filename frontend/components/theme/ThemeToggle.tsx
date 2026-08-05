'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'

export function ThemeToggle({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'
  const label = isLight ? 'Ativar tema escuro' : 'Ativar tema claro'

  const className = iconOnly
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/95 text-slate-300 shadow-xl backdrop-blur transition hover:border-emerald-500/50 hover:text-emerald-300'
    : compact
      ? 'flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium text-slate-500 transition hover:bg-slate-900 hover:text-white'
      : 'mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900/50 hover:text-white'

  return <button type="button" onClick={toggleTheme} aria-label={label} title={label} className={className}>
    {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    {!iconOnly && <span>{isLight ? 'Tema escuro' : 'Tema claro'}</span>}
  </button>
}
