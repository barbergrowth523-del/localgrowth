'use client'

import { Bell, CheckCheck, Info, ShieldAlert, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Notification = { id: string; titulo: string; mensagem: string; tipo: 'info' | 'sucesso' | 'alerta' | 'critico'; lida_em: string | null; created_at: string }

const iconByType = { info: Info, sucesso: Sparkles, alerta: Bell, critico: ShieldAlert }

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  async function loadNotifications() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('notificacoes').select('id,titulo,mensagem,tipo,lida_em,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12)
    setItems((data ?? []) as Notification[])
    setLoading(false)
  }

  useEffect(() => { void loadNotifications() }, [])
  const unread = items.filter((item) => !item.lida_em).length

  async function markAllRead() {
    const unreadIds = items.filter((item) => !item.lida_em).map((item) => item.id)
    if (!unreadIds.length) return
    const readAt = new Date().toISOString()
    const { error } = await createClient().from('notificacoes').update({ lida_em: readAt }).in('id', unreadIds)
    if (!error) setItems((current) => current.map((item) => ({ ...item, lida_em: readAt })))
  }

  async function markRead(item: Notification) {
    if (item.lida_em) return
    const readAt = new Date().toISOString()
    const { error } = await createClient().from('notificacoes').update({ lida_em: readAt }).eq('id', item.id)
    if (!error) setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, lida_em: readAt } : currentItem))
  }

  return <div className="fixed right-4 top-4 z-50 lg:right-8 lg:top-5">
    <button type="button" onClick={() => { setOpen((current) => !current); if (!open) void loadNotifications() }} aria-label="Abrir notificacoes" className="relative rounded-xl border border-slate-700 bg-slate-900/95 p-2.5 text-slate-300 shadow-xl backdrop-blur transition hover:border-emerald-500/50 hover:text-emerald-300"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-bold text-slate-950">{unread > 9 ? '9+' : unread}</span>}</button>
    {open && <section className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h2 className="text-sm font-semibold text-white">Notificacoes</h2><p className="text-xs text-slate-500">{unread ? `${unread} nao lida${unread === 1 ? '' : 's'}` : 'Tudo em dia'}</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => void markAllRead()} disabled={!unread} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-emerald-300 disabled:opacity-40" aria-label="Marcar todas como lidas"><CheckCheck className="h-4 w-4" /></button><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white" aria-label="Fechar notificacoes"><X className="h-4 w-4" /></button></div></div><div className="max-h-80 overflow-y-auto">{loading ? <p className="px-4 py-8 text-center text-sm text-slate-500">Carregando...</p> : items.length ? items.map((item) => { const Icon = iconByType[item.tipo] ?? Info; return <button type="button" key={item.id} onClick={() => void markRead(item)} className={`flex w-full gap-3 border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-800/70 ${item.lida_em ? 'opacity-60' : ''}`}><span className={`mt-0.5 rounded-lg p-2 ${item.tipo === 'critico' ? 'bg-rose-500/10 text-rose-300' : item.tipo === 'alerta' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-white">{item.titulo}{!item.lida_em && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{item.mensagem}</span></span></button> }) : <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma notificacao no momento.</p>}</div></section>}
  </div>
}
