import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, Eye, Scissors, UsersRound } from 'lucide-react'
import { requireSuperAdmin } from '@/lib/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function MerchantPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) notFound()

  const { admin } = await requireSuperAdmin()
  const [profileResult, clientResult, appointmentResult, serviceResult, authResult] = await Promise.all([
    admin
      .from('perfis_barbearia')
      .select('nome_estabelecimento,plano,created_at,data_vencimento,acesso_bloqueado')
      .eq('id', id)
      .maybeSingle(),
    admin.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('agendamentos').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.from('servicos').select('id', { count: 'exact', head: true }).eq('user_id', id),
    admin.auth.admin.getUserById(id),
  ])

  if (profileResult.error || !profileResult.data) notFound()
  const profile = profileResult.data

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Super Admin
      </Link>

      <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 bg-gradient-to-r from-emerald-500/10 to-transparent p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            <Eye className="h-3.5 w-3.5" /> Modo lojista somente leitura
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-white">{profile.nome_estabelecimento || 'Barbearia sem nome'}</h1>
          <p className="mt-2 text-sm text-slate-400">{authResult.data.user?.email ?? 'Email nao informado'}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-300">
              Plano {String(profile.plano ?? 'starter').toUpperCase()}
            </span>
            <span className={`rounded-full px-3 py-1.5 font-semibold ${profile.acesso_bloqueado ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
              {profile.acesso_bloqueado ? 'Acesso bloqueado' : 'Acesso liberado'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <PreviewMetric icon={<UsersRound />} label="Clientes" value={String(clientResult.count ?? 0)} />
          <PreviewMetric icon={<CalendarDays />} label="Agendamentos" value={String(appointmentResult.count ?? 0)} />
          <PreviewMetric icon={<Scissors />} label="Servicos" value={String(serviceResult.count ?? 0)} />
        </div>

        <div className="border-t border-slate-800 px-6 py-5 text-xs leading-5 text-slate-500 sm:px-8">
          Esta visualizacao nao troca a sessao do administrador e nao permite alteracoes em nome do lojista.
        </div>
      </section>
    </main>
  )
}

function PreviewMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center gap-2 text-emerald-400">{icon}<span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span></div>
      <p className="mt-4 text-3xl font-extrabold text-white">{value}</p>
    </div>
  )
}
