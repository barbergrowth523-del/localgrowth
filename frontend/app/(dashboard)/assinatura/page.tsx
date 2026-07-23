'use client'

import { ArrowRight, Check, CheckCircle2, Copy, CreditCard, Lock, QrCode, ShieldCheck, Sparkles, X } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { BRAND_NAME } from '@/lib/brand'

type PaymentMethod = 'PIX' | 'CREDIT_CARD'
type PlanId = 'starter' | 'pro' | 'scale'
type PixInfo = { encodedImage?: string; payload?: string }
type FormData = { name: string; email: string; cpfCnpj: string; cardNumber: string; cardExpiryMonth: string; cardExpiryYear: string; cardCCV: string; holderName: string }
type Plan = { id: PlanId; name: string; price: number; description: string; features: string[]; popular?: boolean }

const plans: Plan[] = [
  { id: 'starter', name: 'Plano Starter', price: 47, description: 'Para quem esta comecando a organizar a base.', features: ['Ate 150 clientes', 'QR Code de cadastro', 'Disparos manuais'] },
  { id: 'pro', name: 'Plano Pro', price: 97, description: 'Para barbearias que querem crescer com previsibilidade.', features: ['Clientes ilimitados', 'Resgate automatico', 'Painel financeiro'], popular: true },
  { id: 'scale', name: 'Plano Scale', price: 197, description: 'Para operacoes com mais cadeiras e equipe.', features: ['Multiplos barbeiros e cadeiras', 'Relatorios individuais', 'Suporte prioritario'] },
]

const initialForm: FormData = { name: '', email: '', cpfCnpj: '', cardNumber: '', cardExpiryMonth: '', cardExpiryYear: '', cardCCV: '', holderName: '' }

export default function AssinaturaPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro')
  const [annual, setAnnual] = useState(false)
  const [metodo, setMetodo] = useState<PaymentMethod>('PIX')
  const [loading, setLoading] = useState(false)
  const [pixInfo, setPixInfo] = useState<PixInfo | null>(null)
  const [pixModalOpen, setPixModalOpen] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState<FormData>(initialForm)
  const plan = useMemo(() => plans.find((item) => item.id === selectedPlan) ?? plans[1], [selectedPlan])
  const price = annual ? plan.price * 10 : plan.price
  const monthlyEquivalent = annual ? plan.price * 10 / 12 : plan.price
  const update = (key: keyof FormData, value: string) => setFormData((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage('')
    try {
      const response = await fetch('/api/pagamento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        customerName: formData.name, email: formData.email, cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''), billingType: metodo, value: price,
        creditCard: metodo === 'CREDIT_CARD' ? { holderName: formData.holderName, number: formData.cardNumber.replace(/\s/g, ''), expiryMonth: formData.cardExpiryMonth, expiryYear: formData.cardExpiryYear, ccv: formData.cardCCV } : undefined,
        creditCardHolderInfo: metodo === 'CREDIT_CARD' ? { name: formData.holderName, email: formData.email || 'contato@barber.com', cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''), postalCode: '44700000', addressNumber: '10', phone: '74988887777' } : undefined,
      }) })
      const data = await response.json() as { success?: boolean; error?: string; pix?: PixInfo }
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Nao foi possivel processar o pagamento.')
      if (metodo === 'PIX') { setPixInfo(data.pix ?? null); setPixModalOpen(true) }
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><Sparkles className="h-8 w-8 text-emerald-400" /> Planos {BRAND_NAME}</h1><p className="mt-2 text-sm text-slate-400">Escolha o plano certo para recuperar mais clientes e aumentar seu faturamento.</p></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"><span className="text-sm text-slate-300">Cobranca anual</span><button type="button" onClick={() => setAnnual((value) => !value)} aria-pressed={annual} className={'relative h-6 w-11 rounded-full transition ' + (annual ? 'bg-emerald-500' : 'bg-slate-700')}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (annual ? 'left-6' : 'left-1')} /></button><span className="text-xs font-bold text-emerald-400">2 meses gratis</span></div>
      </div>

      <div className="mb-4 flex items-center gap-3"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Etapa 1</span><div><h2 className="text-sm font-bold text-white">Compare os planos</h2><p className="text-xs text-slate-500">Selecione o nivel ideal para sua operacao.</p></div></div><div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((item) => <button key={item.id} type="button" onClick={() => setSelectedPlan(item.id)} className={'relative text-left rounded-2xl border p-5 transition ' + (selectedPlan === item.id ? 'border-emerald-500 bg-emerald-500/10 shadow-xl shadow-emerald-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700')}>
          {item.popular && <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">Mais Popular</span>}
          <div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-white">{item.name}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p></div>{selectedPlan === item.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />}</div>
          <div className="mt-5 flex items-baseline gap-1"><span className="text-3xl font-extrabold text-white">R$ {item.price}</span><span className="text-xs text-slate-500">/ mes</span></div>
          <ul className="mt-5 space-y-2 text-xs text-slate-300">{item.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />{feature}</li>)}</ul>
        </button>)}
      </div>

      <div className="mb-4 flex items-center gap-3"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Etapa 2</span><div><h2 className="text-sm font-bold text-white">Finalize sua assinatura</h2><p className="text-xs text-slate-500">Dados de cobranca e forma de pagamento.</p></div></div><div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl lg:col-span-4 lg:p-6"><div><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">Plano selecionado</span><h2 className="mt-4 text-2xl font-bold text-white">{plan.name}</h2><div className="mt-2 flex items-baseline gap-1"><span className="text-4xl font-extrabold text-white">R$ {monthlyEquivalent.toFixed(2).replace('.', ',')}</span><span className="text-sm text-slate-400">/ mes</span></div>{annual && <p className="mt-1 text-xs text-emerald-400">Cobranca anual de R$ {price.toFixed(2).replace('.', ',')}</p>}</div><div className="space-y-4 border-t border-slate-800 pt-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">O que esta incluido</p><ul className="space-y-3 text-sm text-slate-300">{plan.features.map((item) => <li key={item} className="flex items-center gap-3"><span className="rounded-md bg-emerald-500/20 p-1 text-emerald-400"><Check className="h-4 w-4" /></span>{item}</li>)}</ul></div><div className="space-y-4 border-t border-slate-800 pt-6"><div className="flex items-start gap-3 text-sm text-slate-300"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" /><span><strong className="text-white">Garantia de 7 dias.</strong> Teste o sistema e solicite ajuda se nao fizer sentido para sua operacao.</span></div><p className="text-xs leading-5 text-slate-500">O plano se paga com poucos cortes resgatados. Um cliente recuperado ja ajuda a cobrir o investimento.</p></div><div className="flex items-center gap-3 border-t border-slate-800 pt-6 text-xs text-slate-400"><Lock className="h-5 w-5 shrink-0 text-emerald-400" />Pagamento protegido e processado pelo Asaas.</div></section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl lg:col-span-8 lg:p-6"><form onSubmit={handleSubmit} className="space-y-5"><div><h3 className="text-lg font-bold text-white">Dados de cobranca</h3><p className="mt-1 text-sm text-slate-500">Preencha seus dados para ativar o plano.</p></div><Field label="Nome completo ou barbearia" value={formData.name} onChange={(value) => update('name', value)} placeholder="Ex: Barbearia Jacobina" /><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Field label="E-mail" type="email" value={formData.email} onChange={(value) => update('email', value)} placeholder="seu@email.com" /><Field label="CPF ou CNPJ" value={formData.cpfCnpj} onChange={(value) => update('cpfCnpj', value)} placeholder="000.000.000-00" /></div><div className="pt-2"><label className="mb-2 block text-xs font-medium text-slate-400">Forma de pagamento</label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><PaymentButton active={metodo === 'PIX'} onClick={() => setMetodo('PIX')}><QrCode className="h-4 w-4" /> Pix</PaymentButton><PaymentButton active={metodo === 'CREDIT_CARD'} onClick={() => setMetodo('CREDIT_CARD')}><CreditCard className="h-4 w-4" /> Cartao de credito</PaymentButton></div></div>{metodo === 'CREDIT_CARD' && <div className="space-y-4 border-t border-slate-800 pt-4"><Field value={formData.cardNumber} onChange={(value) => update('cardNumber', value)} placeholder="Numero do cartao" /><div className="grid grid-cols-3 gap-3"><Field value={formData.cardExpiryMonth} onChange={(value) => update('cardExpiryMonth', value)} placeholder="Mes (MM)" /><Field value={formData.cardExpiryYear} onChange={(value) => update('cardExpiryYear', value)} placeholder="Ano (AAAA)" /><Field value={formData.cardCCV} onChange={(value) => update('cardCCV', value)} placeholder="CVV" /></div><Field value={formData.holderName} onChange={(value) => update('holderName', value)} placeholder="Nome no cartao" /></div>}{message && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{message}</p>}<button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600 disabled:opacity-60"><Lock className="h-4 w-4" />{loading ? 'Processando pagamento...' : metodo === 'PIX' ? 'Gerar QR Code Pix - R$ ' + price.toFixed(2).replace('.', ',') : 'Pagar com cartao - R$ ' + price.toFixed(2).replace('.', ',')}</button></form></section>
      </div>
      {pixModalOpen && pixInfo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pagamento Pix"><div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl md:p-8"><button type="button" onClick={() => setPixModalOpen(false)} aria-label="Fechar modal" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button><div className="text-center"><div className="mx-auto mb-3 inline-flex rounded-full bg-emerald-500/10 p-3 text-emerald-400"><CheckCircle2 className="h-7 w-7" /></div><h3 className="text-2xl font-bold text-white">QR Code Pix pronto</h3><p className="mt-2 text-sm text-slate-400">Escaneie o codigo ou copie e cole no app do seu banco.</p>{pixInfo.encodedImage && <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-4 shadow-lg"><img src={'data:image/png;base64,' + pixInfo.encodedImage} alt="QR Code Pix" className="h-56 w-56" /></div>}<div className="mt-6 text-left"><label className="text-xs font-medium text-slate-400">Codigo Pix copia e cola</label><textarea readOnly value={pixInfo.payload ?? ''} className="mt-2 h-24 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 outline-none select-all" />{copiado && <p className="mt-2 text-center text-xs font-semibold text-emerald-400">Codigo copiado com sucesso!</p>}<button type="button" onClick={copiarCodigoPix} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"><Copy className="h-4 w-4" />{copiado ? 'Codigo copiado!' : 'Copiar codigo Pix (Copia e Cola)'}</button></div><p className="mt-5 text-xs text-slate-500">Valor: R$ {price.toFixed(2).replace('.', ',')} - plano {plan.name.replace('Plano ', '')}</p></div></div></div>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label?: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="block text-xs text-slate-400">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label>
}

function PaymentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={'flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition ' + (active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700')}>{children}</button>
}