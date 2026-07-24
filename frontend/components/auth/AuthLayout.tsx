import type { ReactNode } from 'react'
import BrandLogo from '@/components/BrandLogo'

type AuthLayoutProps = {
  children: ReactNode
  aside: ReactNode
}

export function AuthLayout({ children, aside }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen w-full overflow-x-hidden bg-slate-950 text-white lg:h-screen lg:overflow-hidden">
      <aside className="relative hidden w-1/2 flex-col justify-center overflow-hidden border-r border-slate-800 bg-slate-900 px-10 py-12 lg:flex xl:px-16">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[160px]" />
        <div className="relative z-10 mx-auto w-full max-w-2xl">
          <BrandLogo markClassName="h-12 w-auto max-w-[180px]" />
          {aside}
        </div>
      </aside>
      <section className="flex w-full flex-col items-center justify-center bg-slate-950 px-6 py-10 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo markClassName="h-12 w-auto max-w-[180px]" />
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
