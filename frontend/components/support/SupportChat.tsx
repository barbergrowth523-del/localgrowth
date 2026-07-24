'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Bot, Headphones, MessageCircle, Send, UserRound, X } from 'lucide-react'

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string; handover?: boolean; ticketId?: string }
const INITIAL_MESSAGE: ChatMessage = { id: 'welcome', role: 'assistant', text: 'Ola! Sou o assistente Prontusfy. Posso ajudar com QR Code, WhatsApp, agenda, planos ou dados da sua conta.' }
const QUICK_QUESTIONS = ['Como gerar QR Code?', 'Qual e meu plano?', 'Como usar o WhatsApp?']

export function SupportChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, sending])

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || sending) return
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: message }])
    setInput('')
    setSending(true)
    try {
      const response = await fetch('/api/support/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      const data = await response.json() as { reply?: string; error?: string; handover?: boolean; ticketId?: string }
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), role: 'assistant',
        text: response.ok ? data.reply ?? 'Como posso ajudar?' : data.error ?? 'Nao foi possivel enviar sua mensagem.',
        handover: data.handover, ticketId: data.ticketId,
      }])
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Nao foi possivel conectar ao suporte agora. Tente novamente em instantes.' }])
    } finally { setSending(false) }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void sendMessage(input) }

  return (
    <>
      {open && (
        <section role="dialog" aria-label="Suporte inteligente Prontusfy" className="fixed bottom-36 right-3 z-50 flex h-[min(70vh,560px)] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60 lg:bottom-24 lg:right-6">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400"><Bot className="h-5 w-5" /></span>
              <div><h2 className="text-sm font-bold text-white">Suporte Prontusfy</h2><p className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Assistente online</p></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && <span className="mt-1 h-fit rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400"><Bot className="h-3.5 w-3.5" /></span>}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${message.role === 'user' ? 'rounded-br-md bg-emerald-500 text-slate-950' : 'rounded-bl-md border border-slate-800 bg-slate-900 text-slate-200'}`}>
                  {message.text}
                  {message.handover && <div className="mt-2 flex items-center gap-2 border-t border-slate-700 pt-2 text-[11px] font-semibold text-amber-300"><Headphones className="h-3.5 w-3.5" />Chamado {message.ticketId?.slice(0, 8) ?? 'registrado'}</div>}
                </div>
                {message.role === 'user' && <span className="mt-1 h-fit rounded-lg bg-slate-800 p-1.5 text-slate-300"><UserRound className="h-3.5 w-3.5" /></span>}
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 text-xs text-slate-500"><Bot className="h-4 w-4 text-emerald-400" /><span className="animate-pulse">Pensando...</span></div>}
          </div>

          {messages.length === 1 && <div className="flex gap-2 overflow-x-auto px-4 pb-3">{QUICK_QUESTIONS.map((question) => <button key={question} type="button" onClick={() => void sendMessage(question)} className="shrink-0 rounded-full border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-300">{question}</button>)}</div>}

          <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-800 bg-slate-900 p-3">
            <label htmlFor="support-message" className="sr-only">Digite sua duvida</label>
            <textarea id="support-message" rows={1} maxLength={2000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(input) } }} placeholder="Digite sua duvida..." className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500" />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Enviar mensagem" className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </form>
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Fechar suporte' : 'Abrir suporte'} className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:scale-105 hover:bg-emerald-300 lg:bottom-6 lg:right-6">{open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}</button>
    </>
  )
}
