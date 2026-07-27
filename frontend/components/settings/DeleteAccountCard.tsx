'use client'

import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() { setOpen(false); setPassword(''); setConfirmation(''); setError('') }

  async function removeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, confirmation }) })
      const data = await response.json() as { error?: string }
      if (!response.ok) { setError(data.error ?? 'Nao foi possivel excluir a conta.'); return }
      await createClient().auth.signOut()
      for (const key of Object.keys(window.localStorage)) if (key.startsWith('prontusfy-')) window.localStorage.removeItem(key)
      for (const key of Object.keys(window.sessionStorage)) if (key.startsWith('prontusfy-')) window.sessionStorage.removeItem(key)
      window.location.assign('/')
    } catch {
      setError('Nao foi possivel concluir a exclusao. Tente novamente.')
    } finally { setLoading(false) }
  }

  return <><section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-rose-300"><AlertTriangle className="h-5 w-5" /><h3 className="font-bold">Excluir conta e dados</h3></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Esta acao remove sua conta, clientes, agenda, servicos e configuracoes. Ela nao pode ser desfeita.</p></div><button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/40 px-4 py-3 text-sm font-bold text-rose-200 transition hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /> Excluir conta</button></div></section>{open && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="delete-account-title" className="text-xl font-bold text-white">Confirmar exclusao da conta</h2><p className="mt-2 text-sm leading-6 text-slate-400">Digite sua senha e a palavra <strong className="text-rose-300">EXCLUIR</strong> para confirmar.</p></div><button type="button" onClick={reset} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button></div><form onSubmit={removeAccount} className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-200">Senha atual<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-rose-400" /></label><label className="block text-sm font-medium text-slate-200">Digite EXCLUIR<input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 uppercase text-white outline-none focus:border-rose-400" /></label>{error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}<button disabled={loading || confirmation !== 'EXCLUIR'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3.5 font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Excluindo...</> : <><Trash2 className="h-4 w-4" /> Excluir meus dados</>}</button></form></section></div>}</>
}