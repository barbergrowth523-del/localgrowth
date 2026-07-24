'use client'

import { Check, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const [reviewToken, setReviewToken] = useState('')
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => { void params.then((value) => setReviewToken(value.id)) }, [params])

  async function submit() {
    const response = await fetch('/api/avaliacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: reviewToken, estrelas: stars, comentario: comment }) })
    const data = await response.json() as { error?: string }
    if (!response.ok) { setMessage(data.error ?? 'Nao foi possivel enviar sua avaliacao.'); return }
    setSuccess(true)
  }

  if (success) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center"><Check className="mx-auto h-12 w-12 text-emerald-400" /><h1 className="mt-4 text-2xl font-bold">Obrigado pela avaliacao!</h1><p className="mt-2 text-sm text-slate-400">Seu feedback ajuda a melhorar o atendimento.</p></section></main>

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white"><section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8"><h1 className="text-2xl font-bold">Avalie seu atendimento</h1><p className="mt-2 text-sm text-slate-400">Como foi sua experiencia?</p><div className="mt-8 flex justify-center gap-2">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setStars(value)} aria-label={value + ' estrelas'}><Star className={'h-9 w-9 ' + (value <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600')} /></button>)}</div><textarea maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Conte como foi seu atendimento (opcional)" className="mt-8 h-28 w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-white outline-none focus:border-emerald-500" />{message && <p className="mt-4 text-sm text-rose-300">{message}</p>}<button disabled={!stars || !reviewToken} onClick={() => void submit()} className="mt-5 w-full rounded-xl bg-emerald-500 py-3.5 font-bold text-slate-950 disabled:opacity-50">Enviar avaliacao</button></section></main>
}
