'use client'

import { Award, Lock, Mail, MapPin, Phone, Save, Shield, User } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { BRAND_NAME } from '@/lib/brand'

type Profile = {
  name: string; email: string; phone: string; cidade: string; endereco: string
  currentPassword: string; newPassword: string
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile>({
    name: 'Samuel Santos', email: 'barbergrowth523@gmail.com', phone: '(74) 98888-7777',
    cidade: 'Jacobina, BA', endereco: 'Rua Principal, 100', currentPassword: '', newPassword: '',
  })
  const update = (key: keyof Profile, value: string) => setProfile((current) => ({ ...current, [key]: value }))

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    alert('Informacoes de perfil atualizadas com sucesso!')
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:p-6 md:p-8 lg:p-12">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"><div><h1 className="flex items-center gap-3 text-3xl font-bold text-white"><User className="h-8 w-8 text-emerald-400" /> Meu Perfil</h1><p className="mt-1 text-sm text-slate-400">Gerencie suas credenciais de acesso, dados pessoais e seguranca da conta.</p></div><div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400"><Award className="h-4 w-4" /> Conta Pro Ativa</div></div>
      <form onSubmit={handleUpdate} className="space-y-6">
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Shield className="h-5 w-5" />} title="Informacoes Pessoais" description={"Seus dados de identificacao no " + BRAND_NAME + "."} /><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><IconField icon={<User className="h-4 w-4" />} label="Seu Nome Completo" value={profile.name} onChange={(value) => update('name', value)} /><IconField icon={<Mail className="h-4 w-4" />} label="E-mail de Acesso" type="email" value={profile.email} onChange={(value) => update('email', value)} /><IconField icon={<Phone className="h-4 w-4" />} label="Telefone / WhatsApp Principal" value={profile.phone} onChange={(value) => update('phone', value)} /><IconField icon={<MapPin className="h-4 w-4" />} label="Localidade / Cidade" value={profile.cidade} onChange={(value) => update('cidade', value)} /><IconField icon={<MapPin className="h-4 w-4" />} label="Endereco do Salao" value={profile.endereco} onChange={(value) => update('endereco', value)} /></div></section>
        <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl lg:p-8"><Header icon={<Lock className="h-5 w-5" />} title="Alterar Senha" description="Mantenha sua conta protegida atualizando sua senha periodicamente." /><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><Field label="Senha Atual" type="password" placeholder="" value={profile.currentPassword} onChange={(value) => update('currentPassword', value)} required={false} /><Field label="Nova Senha" type="password" placeholder="" value={profile.newPassword} onChange={(value) => update('newPassword', value)} required={false} /></div></section>
        <div className="flex justify-end pt-2"><button type="submit" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-600"><Save className="h-4 w-4" /> Salvar Alteracoes do Perfil</button></div>
      </form>
    </div>
  )
}

function Header({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex items-center gap-3 border-b border-slate-800 pb-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">{icon}</div><div><h2 className="text-lg font-bold text-white">{title}</h2><p className="text-xs text-slate-400">{description}</p></div></div>
}

function IconField({ icon, label, value, onChange, type = 'text' }: { icon: React.ReactNode; label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-medium text-slate-400">{label}<div className="relative mt-2"><span className="absolute left-3.5 top-3.5 text-slate-500">{icon}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-500" /></div></label>
}

function Field({ label, value, onChange, placeholder, type, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type: string; required: boolean }) {
  return <label className="block text-xs font-medium text-slate-400">{label}<input required={required} type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-sm text-white outline-none transition focus:border-emerald-500" /></label>
}
