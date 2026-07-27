import type { ReactNode } from 'react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import { LegalLinks } from '@/components/legal/LegalLinks'

type LegalDocumentLayoutProps = { eyebrow: string; title: string; updatedAt?: string; children: ReactNode }

export function LegalDocumentLayout({ eyebrow, title, updatedAt = '27 de julho de 2026', children }: LegalDocumentLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-200 sm:px-6 lg:py-16">
      <article className="mx-auto max-w-4xl">
        <Link href="/" aria-label="Voltar para a pagina inicial" className="inline-flex"><BrandLogo markClassName="h-14 w-auto max-w-[220px]" /></Link>
        <header className="mt-10 border-b border-slate-800 pb-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">{eyebrow}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1><p className="mt-4 text-sm text-slate-400">Ultima atualizacao: {updatedAt}.</p></header>
        <div className="mt-8 space-y-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 leading-7 shadow-2xl sm:p-10">{children}</div>
        <footer className="mt-10 border-t border-slate-800 pt-6"><LegalLinks /></footer>
      </article>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-xl font-bold text-white">{title}</h2><div className="mt-3 space-y-3 text-sm text-slate-400">{children}</div></section>
}