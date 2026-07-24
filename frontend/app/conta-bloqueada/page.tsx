'use client'

import { useState } from 'react'
import { LockKeyhole, LogOut } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { createClient } from '@/lib/supabase/client'

export default function ContaBloqueadaPage() {
  const [leaving, setLeaving] = useState(false)

  async function signOut() {
    setLeaving(true)
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <section className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-slate-900 p-7 text-center shadow-2xl">
        <BrandLogo className="mb-8" markClassName="h-12 w-auto max-w-[180px]" />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-300">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Acesso temporariamente bloqueado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Entre em contato com o suporte Prontusfy para revisar a situacao da sua conta.
        </p>
        <button
          type="button"
          disabled={leaving}
          onClick={() => void signOut()}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> {leaving ? 'Saindo...' : 'Sair da conta'}
        </button>
      </section>
    </main>
  )
}
