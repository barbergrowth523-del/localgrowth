'use client'

import Link from 'next/link'
import { CalendarDays, MessageCircle, QrCode, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TourKey = 'clients' | 'agenda' | 'dashboard'
type Step = { key: TourKey; title: string; text: string; href: string; action: string; icon: typeof QrCode }
const steps: Step[] = [
  { key: 'clients', title: 'Capture novos clientes', text: 'Encontre seu QR Code e deixe a placa no balcao. O cliente se cadastra em poucos segundos.', href: '/clientes', action: 'Ver QR Code', icon: QrCode },
  { key: 'agenda', title: 'Organize sua agenda', text: 'Use a Agenda para controlar horarios, servicos e status dos atendimentos.', href: '/agenda', action: 'Abrir Agenda', icon: CalendarDays },
  { key: 'dashboard', title: 'Resgate clientes inativos', text: 'Na Dashboard, identifique quem sumiu e envie uma mensagem pronta pelo WhatsApp.', href: '/dashboard', action: 'Ver Dashboard', icon: MessageCircle },
]
type Position = { top: number; left: number; width: number; height: number; mobile: boolean }

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const current = steps[step]

  const updatePosition = useCallback(() => {
    const element = document.querySelector<HTMLElement>(`[data-tour="${current.key}"]`)
    if (!element) return
    const rect = element.getBoundingClientRect()
    setPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, mobile: window.innerWidth < 1024 })
  }, [current.key])

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const localKey = `prontusfy-onboarding-${user.id}`
      if (window.localStorage.getItem(localKey) === 'done') return
      const { data } = await supabase.from('lojista_onboarding').select('completed_at,skipped_at').eq('user_id', user.id).maybeSingle()
      if (!data?.completed_at && !data?.skipped_at) setVisible(true)
    })()
  }, [])

  useLayoutEffect(() => {
    if (!visible) return
    const frame = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true) }
  }, [visible, step, updatePosition])

  async function finish(kind: 'completed_at' | 'skipped_at') {
    if (!userId) return
    const now = new Date().toISOString()
    await createClient().from('lojista_onboarding').upsert({ user_id: userId, [kind]: now, updated_at: now }, { onConflict: 'user_id' })
    window.localStorage.setItem(`prontusfy-onboarding-${userId}`, 'done')
    setVisible(false)
  }

  if (!visible || !position) return null
  const Icon = current.icon
  const tooltipStyle = position.mobile
    ? { top: Math.max(16, position.top - 290), left: Math.max(16, Math.min(window.innerWidth - 336, position.left + position.width / 2 - 160)) }
    : { top: Math.max(16, Math.min(window.innerHeight - 300, position.top)), left: Math.min(window.innerWidth - 360, position.left + position.width + 18) }

  return <>
    <div className="fixed inset-0 z-[55] bg-slate-950/75 backdrop-blur-[1px]" aria-hidden="true" />
    <div className="pointer-events-none fixed z-[56] rounded-xl border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.74),0_0_28px_rgba(52,211,153,0.55)]" style={{ top: position.top - 4, left: position.left - 4, width: position.width + 8, height: position.height + 8 }} />
    <section role="dialog" aria-modal="true" aria-labelledby="tour-title" className="fixed z-[57] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-emerald-400/40 bg-slate-900 p-5 shadow-2xl" style={tooltipStyle}>
      <span className={`absolute ${position.mobile ? 'bottom-[-9px] left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400/40' : 'left-[-9px] top-7 border-b-8 border-r-8 border-t-8 border-b-transparent border-t-transparent border-r-emerald-400/40'}`} />
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300"><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">Passo {step + 1} de {steps.length}</p><h2 id="tour-title" className="mt-1 text-base font-bold text-white">{current.title}</h2></div></div><button type="button" onClick={() => void finish('skipped_at')} aria-label="Pular tour" className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{current.text}</p><div className="mt-4 flex gap-1.5">{steps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-emerald-400' : 'bg-slate-700'}`} />)}</div>
      <div className="mt-5 flex items-center justify-between gap-2"><button type="button" onClick={() => void finish('skipped_at')} className="text-xs font-medium text-slate-500 hover:text-white">Pular tour</button><div className="flex gap-2">{step > 0 && <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Voltar</button>}{step < steps.length - 1 ? <button type="button" onClick={() => setStep((value) => value + 1)} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300">Proximo</button> : <Link href={current.href} onClick={() => void finish('completed_at')} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300">{current.action}</Link>}</div></div>
    </section>
  </>
}
