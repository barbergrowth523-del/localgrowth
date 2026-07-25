'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Crown, Headphones, MessageCircle, Send, Sparkles, UserRound, X } from 'lucide-react'

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string; handover?: boolean; ticketId?: string }
const QUICK_QUESTIONS = ['Como resgatar clientes?', 'Configurar QR Code', 'Duvida sobre o plano']

function ConciergeAvatar({ compact = false }: { compact?: boolean }) { return <span className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600 font-black text-slate-950 shadow-lg shadow-emerald-500/20 ${compact ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-lg'}`}>P</span> }
function renderText(text: string) { return text.split('\n').map((line, index) => <p key={`${line}-${index}`} className={index ? 'mt-1.5' : ''}>{line.split('**').map((part, partIndex) => partIndex % 2 ? <strong key={partIndex} className="font-bold text-white">{part}</strong> : part)}</p>) }

export function SupportChat({ barbershopName }: { barbershopName?: string | null }) {
  const name = barbershopName?.trim() || 'sua barbearia'
  const initialMessage: ChatMessage = { id: 'welcome', role: 'assistant', text: `Ola, ${name}! Sou seu concierge no Prontusfy. Como posso ajudar voce a acelerar os agendamentos ou resgatar clientes hoje?` }
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, sending])
  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || sending) return
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: message }])
    setInput(''); setSending(true)
    try {
      const response = await fetch('/api/support/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      const data = await response.json() as { reply?: string; error?: string; handover?: boolean; ticketId?: string }
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: response.ok ? data.reply ?? 'Como posso ajudar?' : data.error ?? 'Nao foi possivel enviar sua mensagem.', handover: data.handover, ticketId: data.ticketId }])
    } catch { setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Nao consegui conectar ao comando central agora. Tente novamente em alguns instantes.' }]) } finally { setSending(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(input) }
  return <>
    {open && <section role="dialog" aria-label="Concierge Prontusfy" className="fixed bottom-36 right-3 z-50 flex h-[min(72vh,600px)] w-[calc(100vw-1.5rem)] sm:w-[380px] sm:max-w-sm flex-col overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-950 shadow-2xl shadow-emerald-950/40 lg:bottom-24 lg:right-6">
      <header className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/50 px-4 py-3.5"><div className="flex items-center gap-3"><ConciergeAvatar /><div><h2 className="text-sm font-bold text-white">Concierge Prontusfy</h2><p className="flex items-center gap-1.5 text-[11px] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Especialista em Crescimento</p></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar concierge" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button></header>
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">{messages.map((message) => <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>{message.role === 'assistant' && <span className="mt-1 h-fit"><ConciergeAvatar compact /></span>}<div className={`max-w-[84%] rounded-2xl px-3.5 py-3 text-sm leading-5 ${message.role === 'user' ? 'rounded-br-md bg-emerald-400 text-slate-950' : 'rounded-bl-md border border-slate-800 bg-slate-900 text-slate-200'}`}>{renderText(message.text)}{message.handover && <div className="mt-3 flex items-center gap-2 border-t border-amber-500/20 pt-2 text-[11px] font-semibold text-amber-200"><Headphones className="h-3.5 w-3.5" />Protocolo #{message.ticketId?.slice(0, 8) ?? 'registrado'}</div>}</div>{message.role === 'user' && <span className="mt-1 h-fit rounded-lg bg-slate-800 p-1.5 text-slate-300"><UserRound className="h-3.5 w-3.5" /></span>}</div>)}{sending && <div className="flex items-center gap-2 text-xs text-slate-500"><Sparkles className="h-4 w-4 text-emerald-400" /><span className="animate-pulse">Preparando uma recomendacao...</span></div>}</div>
      {messages.length === 1 && <div className="flex gap-2 overflow-x-auto px-4 pb-3">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => void sendMessage(question)} className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/15">{question}</button>)}</div>}
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-800 bg-slate-900 p-3"><label htmlFor="concierge-message" className="sr-only">Escreva sua pergunta</label><textarea id="concierge-message" rows={1} maxLength={2000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(input) } }} placeholder="Como posso ajudar seu crescimento hoje?" className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" /><button type="submit" disabled={sending || !input.trim()} aria-label="Enviar mensagem" className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button></form>
    </section>}
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-3 lg:bottom-6 lg:right-6">{!open && <div className="max-w-[220px] rounded-2xl border border-emerald-500/20 bg-slate-900/95 px-3 py-2 text-right text-xs font-medium leading-5 text-emerald-50 shadow-xl shadow-black/30 backdrop-blur-xl">Precisa de ajuda para faturar mais? Fale comigo <span aria-hidden="true">&#9986;</span></div>}<button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Fechar concierge' : 'Abrir Concierge Prontusfy'} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200/20 bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600 text-slate-950 shadow-xl shadow-emerald-500/30 transition hover:scale-105 hover:shadow-emerald-400/40">{open ? <X className="h-6 w-6" /> : <Crown className="h-6 w-6" />}</button></div>
  </>
}
