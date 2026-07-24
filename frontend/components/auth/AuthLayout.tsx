import type { ReactNode } from 'react'
import BrandLogo from '@/components/BrandLogo'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg flex-col justify-center">
        <div className="mb-8 flex justify-center">
          <BrandLogo markClassName="h-14 w-auto max-w-[180px]" />
        </div>
        <section className="w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          {children}
        </section>
      </div>
    </main>
  )
}
