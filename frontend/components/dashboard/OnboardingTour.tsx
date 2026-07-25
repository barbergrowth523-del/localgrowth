'use client'

import { useRouter } from 'next/navigation'
import { CalendarDays, MessageCircle, QrCode, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TourKey = 'clients' | 'clients-qr' | 'agenda' | 'agenda-content' | 'dashboard' | 'dashboard-rescue'
type Step = { key: TourKey; title: string; text: string; route: string; action: string; icon: typeof QrCode; next?: number }
const steps: Step[] = [
  { key: 'clients', title: 'Meus Clientes', text: 'Vamos abrir sua base de clientes. O menu iluminado mostra onde voce gerencia cadastros, contatos e clientes em risco.', route: '/clientes', action: 'Abrir Meus Clientes', next: 1, icon: QrCode },
  { key: 'clients-qr', title: 'QR Code de cadastro', text: 'Dentro de Meus Clientes, voce encontra o QR Code para deixar no balcao. O cliente escaneia, preenche os dados e entra automaticamente na sua base.', route: '/clientes', action: 'Continuar para Agenda', next: 2, icon: QrCode },
  { key: 'agenda', title: 'Agenda', text: 'Agora vamos para a Agenda. Este menu leva ao controle central dos seus horarios e atendimentos.', route: '/agenda', action: 'Abrir Agenda', next: 3, icon: CalendarDays },
  { key: 'agenda-content', title: 'Horarios e cadeiras', text: 'Na Agenda, voce visualiza a grade de horarios, servicos escolhidos e o status de cada cadeira para atender sem conflitos.', route: '/agenda', action: 'Continuar para Dashboard', next: 4, icon: CalendarDays },
  { key: 'dashboard', title: 'Dashboard', text: 'Por fim, vamos abrir o Dashboard. Aqui ficam suas principais metricas e os alertas de clientes que precisam voltar.', route: '/dashboard', action: 'Abrir Dashboard', next: 5, icon: MessageCircle },
  { key: 'dashboard-rescue', title: 'Resgate via WhatsApp', text: 'Nesta area voce identifica clientes inativos e pode abrir uma mensagem pronta no WhatsApp para recuperar novos horarios e faturamento.', route: '/dashboard', action: 'Concluir tour', icon: MessageCircle },
]
type Position = { top: number; left: number; width: number; height: number; placement: 'top' | 'right' | 'bottom' }

export function OnboardingTour() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const scrollRequested = useRef<TourKey | null>(null)
  const current = steps[step]

  const updatePosition = useCallback(() => {
    const element = document.querySelector<HTMLElement>(`[data-tour="${current.key}"]`)
    if (!element) { setPosition(null); return }
    const rect = element.getBoundingClientRect()
    const outsideViewport = rect.top < 72 || rect.bottom > window.innerHeight - 32
    if (outsideViewport && scrollRequested.current !== current.key) { scrollRequested.current = current.key; element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); window.setTimeout(() => { scrollRequested.current = null; window.dispatchEvent(new Event('resize')) }, 450); return }
    const mobile = window.innerWidth < 1024; const wide = rect.width > Math.min(520, window.innerWidth * 0.55); const placement: Position['placement'] = wide ? (rect.bottom + 300 < window.innerHeight ? 'bottom' : 'top') : mobile ? 'top' : 'right'; setPosition({ top: rect.top, left: rect.left, width: rect.width, height: rect.height, placement })
  }, [current.key])

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const localKey = `prontusfy-onboarding-${user.id}`
      if (window.localStorage.getItem(localKey) === 'done') return
      const savedStep = Number(window.localStorage.getItem(localKey + '-step'))
      if (Number.isInteger(savedStep) && savedStep >= 0 && savedStep < steps.length) setStep(savedStep)
      const { data } = await supabase.from('lojista_onboarding').select('completed_at,skipped_at').eq('user_id', user.id).maybeSingle()
      if (!data?.completed_at && !data?.skipped_at) setVisible(true)
    })()
  }, [])

  useEffect(() => {
    if (!visible) return
    const target = document.querySelector<HTMLElement>(`[data-tour="${current.key}"]`)
    if (!target) return
    const highlight = ['!relative', '!z-[60]', '!border-emerald-300', '!bg-emerald-500/20', '!text-emerald-200', 'shadow-[0_0_24px_rgba(52,211,153,0.45)]']
    target.classList.add(...highlight)
    return () => target.classList.remove(...highlight)
  }, [visible, current.key])

  useLayoutEffect(() => {
    if (!visible) return
    const frame = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    const retry = window.setTimeout(updatePosition, 180)
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(retry); window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true) }
  }, [visible, step, updatePosition])

  useEffect(() => {
    if (!visible) return
    const retryTarget = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${current.key}"]`)
      if (target) updatePosition()
    }
    const observer = new MutationObserver(retryTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    const retry = window.setInterval(retryTarget, 160)
    return () => { observer.disconnect(); window.clearInterval(retry) }
  }, [visible, current.key, updatePosition])

  async function finish() {
    if (!userId) return
    const now = new Date().toISOString()
    await createClient().from('lojista_onboarding').upsert({ user_id: userId, completed_at: now, updated_at: now }, { onConflict: 'user_id' })
    window.localStorage.setItem(`prontusfy-onboarding-${userId}`, 'done')
    setVisible(false)
  }
  async function skip() {
    if (!userId) return
    const now = new Date().toISOString()
    await createClient().from('lojista_onboarding').upsert({ user_id: userId, skipped_at: now, updated_at: now }, { onConflict: 'user_id' })
    window.localStorage.setItem(`prontusfy-onboarding-${userId}`, 'done')
    setVisible(false)
  }
  function next() {
    scrollRequested.current = null
    if (typeof current.next !== 'number') { void finish(); return }
    setPosition(null)
    const nextStep = current.next
    if (steps[nextStep].route !== current.route) router.push(steps[nextStep].route)
    setStep(nextStep)
  }

  if (!visible || !position) return null
  const Icon = current.icon
  const tooltipWidth = Math.min(352, window.innerWidth - 32)
  const centeredLeft = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, position.left + position.width / 2 - tooltipWidth / 2))
  const tooltipStyle = position.placement === 'top'
    ? { top: Math.max(16, position.top - 292), left: centeredLeft }
    : position.placement === 'bottom'
      ? { top: Math.min(window.innerHeight - 276, position.top + position.height + 16), left: centeredLeft }
      : { top: Math.max(16, Math.min(window.innerHeight - 300, position.top)), left: Math.min(window.innerWidth - tooltipWidth - 16, position.left + position.width + 18) }

  return <>
    <div className="pointer-events-none fixed inset-0 z-[55] bg-slate-950/75 backdrop-blur-[1px]" aria-hidden="true" />
    <div className="pointer-events-none fixed z-[56] rounded-xl border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.74),0_0_28px_rgba(52,211,153,0.55)]" style={{ top: position.top - 4, left: position.left - 4, width: position.width + 8, height: position.height + 8 }} />
    <section role="dialog" aria-modal="true" aria-labelledby="tour-title" className="fixed z-[57] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-emerald-400/40 bg-slate-900 p-5 shadow-2xl" style={tooltipStyle}>
      <span className={`absolute ${position.placement === 'top' ? 'bottom-[-9px] left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400/40' : position.placement === 'bottom' ? 'left-1/2 top-[-9px] -translate-x-1/2 border-b-8 border-l-8 border-r-8 border-b-emerald-400/40 border-l-transparent border-r-transparent' : 'left-[-9px] top-7 border-b-8 border-r-8 border-t-8 border-b-transparent border-t-transparent border-r-emerald-400/40'}`} />
      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300"><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400">Passo {step + 1} de {steps.length}</p><h2 id="tour-title" className="mt-1 text-base font-bold text-white">{current.title}</h2></div></div><button type="button" onClick={() => void skip()} aria-label="Pular tour" className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{current.text}</p><div className="mt-4 flex gap-1.5">{steps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-emerald-400' : 'bg-slate-700'}`} />)}</div>
      <div className="mt-5 flex items-center justify-between gap-2"><button type="button" onClick={() => void skip()} className="text-xs font-medium text-slate-500 hover:text-white">Pular tour</button><div className="flex gap-2">{step > 0 && <button type="button" onClick={() => { scrollRequested.current = null; setPosition(null); setStep((value) => value - 1) }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Voltar</button>}<button type="button" onClick={next} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300">{current.action}</button></div></div>
    </section>
  </>
}










