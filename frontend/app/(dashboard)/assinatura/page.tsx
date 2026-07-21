'use client'

import { ArrowRight, Check, CheckCircle2, Copy, CreditCard, Lock, QrCode, ShieldCheck, Sparkles } from 'lucide-react'
import { FormEvent, useState } from 'react'

type PaymentMethod = 'PIX' | 'CREDIT_CARD'
type PixInfo = { encodedImage?: string; payload?: string }
type FormData = { name: string; email: string; cpfCnpj: string; cardNumber: string; cardExpiryMonth: string; cardExpiryYear: string; cardCCV: string; holderName: string }

const initialForm: FormData = { name: '', email: '', cpfCnpj: '', cardNumber: '', cardExpiryMonth: '', cardExpiryYear: '', cardCCV: '', holderName: '' }

export default function AssinaturaPage() {
  const [metodo, setMetodo] = useState<PaymentMethod>('PIX')
  const [loading, setLoading] = useState(false)
  const [pixInfo, setPixInfo] = useState<PixInfo | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState<FormData>(initialForm)
  const update = (key: keyof FormData, value: string) => setFormData((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage('')
    try {
      const response = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        customerName: formData.name, email: formData.email, cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''), billingType: metodo, value: 97,
        creditCard: metodo === 'CREDIT_CARD' ? { holderName: formData.holderName, number: formData.cardNumber.replace(/\s/g, ''), expiryMonth: formData.cardExpiryMonth, expiryYear: formData.cardExpiryYear, ccv: formData.cardCCV } : undefined,
        creditCardHolderInfo: metodo === 'CREDIT_CARD' ? { name: formData.holderName, email: formData.email, cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''), postalCode: '44700000', addressNumber: '10', phone: '' } : undefined,
      }) })
      const data = await response.json() as { success?: boolean; error?: string; pix?: PixInfo }
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Não foi possível processar o pagamento.')
      if (metodo === 'PIX') setPixInfo(data.pix ?? null)
      else window.location.href = '/dashboard'
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro ao processar pagamento.') } finally { setLoading(false) }
  }

  async function copiarCodigoPix() {
    if (!pixInfo?.payload) return
    await navigator.clipboard.writeText(pixInfo.payload)
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-8 lg:p-12">
      <div className="mb-8"><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Sparkles className="h-8 w-8 text-emerald-400" /> Ativar BarberGrowth Pro</h1><p className="mt-1 text-sm text-slate-400">Gerencie sua assinatura com segurança e libere todas as automações do salão.</p></div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:col-span-5 lg:p-8"><div><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">Plano Profissional</span><h2 className="mt-4 text-2xl font-bold text-white">BarberGrowth Pro</h2><div className="mt-2 flex items-baseline gap-1"><span className="text-4xl font-extrabold text-white">R$ 97</span><span className="text-sm text-slate-400">/ mês</span></div></div><div className="space-y-4 border-t border-slate-800 pt-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">O que está incluído:</p><ul className="space-y-3 text-sm text-slate-300">{['Resgate automático de clientes sumidos', 'Disparos ilimitados via WhatsApp', 'Painel financeiro e métricas em tempo real'].map((item) => <li key={item} className="flex items-center gap-3"><span className="rounded-md bg-emerald-500/20 p-1 text-emerald-400"><Check className="h-4 w-4" /></span>{item}</li>)}</ul></div><div className="flex items-center gap-3 border-t border-slate-800 pt-6 text-xs text-slate-400"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />Transação processada com segurança de ponta a ponta pelo Asaas.</div></section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:col-span-7 lg:p-8">
          {pixInfo ? <div className="space-y-6"><div className="space-y-2 border-b border-slate-800 pb-6 text-center"><div className="mb-1 inline-flex rounded-full bg-emerald-500/10 p-3 text-emerald-400"><CheckCircle2 className="h-8 w-8" /></div><h3 className="text-2xl font-bold text-white">Cobrança Pix Gerada!</h3><p className="text-sm text-slate-400">Escaneie o QR Code abaixo ou use o código Copia e Cola no aplicativo do seu banco.</p></div><div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:flex-row">{pixInfo.encodedImage && <div className="shrink-0 rounded-xl bg-white p-3 shadow-lg"><img src={'data:image/png;base64,' + pixInfo.encodedImage} alt="QR Code Pix" className="mx-auto h-44 w-44" /></div>}<div className="w-full space-y-3 text-left"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Aguardando confirmação de pagamento</div><p className="text-xs leading-relaxed text-slate-300">1. Abra o app do seu banco.<br />2. Escolha pagar com Pix / QR Code ou Pix Copia e Cola.<br />3. Confirme R$ 97,00 para ativar sua conta.</p></div></div><div className="space-y-2"><div className="flex items-center justify-between"><label className="text-xs font-medium text-slate-400">Código Pix Copia e Cola</label>{copiado && <span className="text-xs font-semibold text-emerald-400">Copiado para a área de transferência!</span>}</div><div className="flex gap-2"><input readOnly value={pixInfo.payload ?? ''} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-300 outline-none select-all" /><button type="button" onClick={copiarCodigoPix} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600"><Copy className="h-4 w-4" />{copiado ? 'Copiado!' : 'Copiar'}</button></div></div><button type="button" onClick={() => window.location.href = '/dashboard'} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-4 text-sm font-bold text-white transition hover:bg-slate-700">Já fiz o pagamento, ir para o Dashboard <ArrowRight className="h-4 w-4" /></button></div> : <form onSubmit={handleSubmit} className="space-y-5"><h3 className="mb-4 text-lg font-bold text-white">Dados de Cobrança</h3><Field label="Nome Completo ou Barbearia" value={formData.name} onChange={(value) => update('name', value)} placeholder="Ex: Barbearia Jacobina" /><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field label="E-mail" type="email" value={formData.email} onChange={(value) => update('email', value)} placeholder="seu@email.com" /><Field label="CPF ou CNPJ" value={formData.cpfCnpj} onChange={(value) => update('cpfCnpj', value)} placeholder="000.000.000-00" /></div><div className="pt-2"><label className="mb-2 block text-xs font-medium text-slate-400">Forma de Pagamento</label><div className="grid grid-cols-2 gap-4"><PaymentButton active={metodo === 'PIX'} onClick={() => setMetodo('PIX')}><QrCode className="h-4 w-4" /> Pix</PaymentButton><PaymentButton active={metodo === 'CREDIT_CARD'} onClick={() => setMetodo('CREDIT_CARD')}><CreditCard className="h-4 w-4" /> Cartão de Crédito</PaymentButton></div></div>{metodo === 'CREDIT_CARD' && <div className="space-y-4 border-t border-slate-800 pt-4"><Field value={formData.cardNumber} onChange={(value) => update('cardNumber', value)} placeholder="Número do Cartão" /><div className="grid grid-cols-3 gap-3"><Field value={formData.cardExpiryMonth} onChange={(value) => update('cardExpiryMonth', value)} placeholder="Mês (MM)" /><Field value={formData.cardExpiryYear} onChange={(value) => update('cardExpiryYear', value)} placeholder="Ano (AAAA)" /><Field value={formData.cardCCV} onChange={(value) => update('cardCCV', value)} placeholder="CVV" /></div><Field value={formData.holderName} onChange={(value) => update('holderName', value)} placeholder="Nome no Cartão" /></div>}{message && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{message}</p>}<button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600 disabled:opacity-60"><Lock className="h-4 w-4" />{loading ? 'Gerando Pix...' : 'Gerar QR Code Pix — R$ 97,00'}</button></form>}
        </section>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label?: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="block text-xs text-slate-400">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label>
}

function PaymentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={'flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition ' + (active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700')}>{children}</button>
}
