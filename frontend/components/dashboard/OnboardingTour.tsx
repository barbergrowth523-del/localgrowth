'use client'

import Link from 'next/link'
import { CalendarDays, MessageCircle, QrCode, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = { title: string; text: string; href: string; action: string; icon: typeof QrCode }
const steps: Step[] = [
  { title: 'Capture novos clientes', text: 'Encontre seu QR Code e deixe a placa no balcao. O cliente se cadastra em poucos segundos.', href: '/clientes', action: 'Ver QR Code', icon: QrCode },
  { title: 'Organize sua agenda', text: 'Use a Agenda para controlar horarios, servicos e status dos atendimentos.', href: '/agenda', action: 'Abrir Agenda', icon: CalendarDays },
  { title: 'Resgate clientes inativos', text: 'Na Dashboard, identifique quem sumiu e envie uma mensagem pronta pelo WhatsApp.', href: '/dashboard', action: 'Ver Dashboard', icon: MessageCircle },
]

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const localKey = `prontusfy-onboarding-${user.id}`
      if (window.localStorage.getItem(localKey) === 'done') return
      const { data, error } = await supabase.from('lojista_onboarding').select('completed_at,skipped_at').eq('user_id', user.id).maybeSingle()
      if (error && window.localStorage.getItem(localKey) === 'done') return
      if (!data?.completed_at && !data?.skipped_at) setVisible(true)
    })()
  }, [])

  async function finish(kind: 'completed_at' | 'skipped_at') {
    if (!userId) return
    const now = new Date().toISOString()
    await createClient().from('lojista_onboarding').upsert({ user_id: userId, [kind]: now, updated_at: now }, { onConflict: 'user_id' })
    window.localStorage.setItem(`prontusfy-onboarding-${userId}`, 'done')
    setVisible(false)
  }

  if (!visible) return null
  const current = steps[step]
  const Icon = current.icon
  return <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="tour-title" className="w-full max-w-lg rounded-3xl border border-emerald-500/20 bg-slate-900 p-6 shadow-[0_0_60px_rgba(16,185,129,0.15)] sm:p-8"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300"><Icon className="h-6 w-6" /></span><span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Primeiros passos</span></div><button type="button" onClick={() => void finish('skipped_at')} aria-label="Pular tour" className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></div><div className="mt-8"><div className="flex gap-2">{steps.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-emerald-400' : 'bg-slate-700'}`} />)}</div><p className="mt-5 text-xs font-semibold text-slate-500">Passo {step + 1} de {steps.length}</p><h2 id="tour-title" className="mt-2 text-2xl font-bold text-white">{current.title}</h2><p className="mt-3 leading-7 text-slate-400">{current.text}</p></div><div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => void finish('skipped_at')} className="text-sm font-medium text-slate-500 transition hover:text-white">Pular tour</button><div className="flex gap-3"><button type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:invisible">Voltar</button>{step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => value + 1)} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">Proximo</button> : <Link href={current.href} onClick={() => void finish('completed_at')} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">{current.action}</Link>}</div></div></section></div>
}
