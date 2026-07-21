'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

type FormData = { name: string; email: string; cpfCnpj: string; cardNumber: string; cardExpiryMonth: string; cardExpiryYear: string; cardCCV: string; holderName: string }

export default function CheckoutPage() {
  const [metodo, setMetodo] = useState<'PIX' | 'CREDIT_CARD'>('PIX')
  const [loading, setLoading] = useState(false)
  const [pixInfo, setPixInfo] = useState<{ encodedImage?: string; payload?: string } | null>(null)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', cpfCnpj: '', cardNumber: '', cardExpiryMonth: '', cardExpiryYear: '', cardCCV: '', holderName: '' })
  const update = (key: keyof FormData, value: string) => setFormData(current => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('')
    try {
      const response = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: formData.name, email: formData.email, cpfCnpj: formData.cpfCnpj, billingType: metodo, value: 97, creditCard: metodo === 'CREDIT_CARD' ? { holderName: formData.holderName, number: formData.cardNumber.replace(/\s/g, ''), expiryMonth: formData.cardExpiryMonth, expiryYear: formData.cardExpiryYear, ccv: formData.cardCCV } : undefined, creditCardHolderInfo: metodo === 'CREDIT_CARD' ? { name: formData.holderName, email: formData.email, cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''), postalCode: '44700000', addressNumber: '10', phone: '' } : undefined }) })
      const data = await response.json() as { success?: boolean; error?: string; pix?: { encodedImage?: string; payload?: string } }
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Não foi possível processar o pagamento.')
      if (metodo === 'PIX') setPixInfo(data.pix ?? null)
      else window.location.href = '/dashboard'
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro ao processar pagamento.') } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-white"><div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8"><Link href="/dashboard" className="text-sm text-slate-400 transition hover:text-white">← Voltar ao painel</Link><h1 className="mt-6 text-2xl font-bold">Finalizar Assinatura</h1><p className="mb-6 mt-2 text-sm text-slate-400">Plano BarberGrowth Pro — R$ 97/mês</p>{pixInfo ? <div className="space-y-4 text-center"><p className="font-medium text-emerald-400">Escaneie o QR Code para pagar via Pix</p>{pixInfo.encodedImage && <img src={`data:image/png;base64,${pixInfo.encodedImage}`} alt="QR Code Pix" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />}<div className="break-all rounded border border-slate-800 bg-slate-950 p-3 text-left text-xs text-slate-300">{pixInfo.payload}</div><button onClick={() => window.location.href = '/dashboard'} className="w-full rounded-xl bg-emerald-400 py-3 font-bold text-slate-950 transition hover:bg-emerald-500">Já fiz o pagamento, acessar painel</button></div> : <form onSubmit={handleSubmit} className="space-y-4"><Field label="Nome Completo / Barbearia" value={formData.name} onChange={value => update('name', value)} placeholder="Ex: Barber Shop" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="E-mail" type="email" value={formData.email} onChange={value => update('email', value)} placeholder="seu@email.com" /><Field label="CPF ou CNPJ" value={formData.cpfCnpj} onChange={value => update('cpfCnpj', value)} placeholder="000.000.000-00" /></div><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setMetodo('PIX')} className={'rounded-xl border py-3 text-sm font-semibold ' + (metodo === 'PIX' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-950 text-slate-400')}>Pix (Instantâneo)</button><button type="button" onClick={() => setMetodo('CREDIT_CARD')} className={'rounded-xl border py-3 text-sm font-semibold ' + (metodo === 'CREDIT_CARD' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-950 text-slate-400')}>Cartão de Crédito</button></div>{metodo === 'CREDIT_CARD' && <div className="space-y-3 border-t border-slate-800 pt-3"><Field value={formData.cardNumber} onChange={value => update('cardNumber', value)} placeholder="Número do Cartão" /><div className="grid grid-cols-3 gap-2"><Field value={formData.cardExpiryMonth} onChange={value => update('cardExpiryMonth', value)} placeholder="Mês (MM)" /><Field value={formData.cardExpiryYear} onChange={value => update('cardExpiryYear', value)} placeholder="Ano (AAAA)" /><Field value={formData.cardCCV} onChange={value => update('cardCCV', value)} placeholder="CVV" /></div><Field value={formData.holderName} onChange={value => update('holderName', value)} placeholder="Nome impresso no cartão" /></div>}{message && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{message}</p>}<button disabled={loading} type="submit" className="mt-4 w-full rounded-xl bg-emerald-400 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-500 disabled:opacity-60">{loading ? 'Processando...' : `Pagar R$ 97,00 via ${metodo === 'PIX' ? 'Pix' : 'Cartão'}`}</button></form>}</div></main>
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label?: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="block text-xs text-slate-400">{label}{<input required type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-500" />}</label>
}
