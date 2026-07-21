import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'BarberGrowth', description: 'Relacionamento que mantém a cadeira cheia.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><head><meta charSet="utf-8" /></head><body>{children}</body></html>
}
