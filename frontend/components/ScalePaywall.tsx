'use client'

import Link from 'next/link'
import { Lock, LoaderCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ScalePaywall({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadPlan() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (active) {
          setPlan(null)
          setLoading(false)
        }
        return
      }

      const { data } = await supabase
        .from('perfis_barbearia')
        .select('plano')
        .eq('id', user.id)
        .maybeSingle()

      if (active) {
        setPlan(String(data?.plano ?? 'starter').toLowerCase())
        setLoading(false)
      }
    }

    void loadPlan()
    return () => {
      active = false
    }
  }, [])

  const isScale = plan === 'scale'

  if (isScale) return <>{children}</>

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px] sm:p-6">
        <div className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-slate-950/95 p-5 text-center shadow-2xl shadow-emerald-950/40 sm:p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Sparkles className="h-4 w-4" /> Plano Scale
          </div>
          <h2 className="mt-2 text-lg font-bold text-white sm:text-xl">Recurso exclusivo do Plano Scale</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {loading ? 'Verificando seu plano...' : 'Ative o Plano Scale para liberar equipe, relatorios e recursos avancados.'}
          </p>
          <Link href="/assinatura" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
            Fazer upgrade
          </Link>
        </div>
      </div>
    </div>
  )
}
