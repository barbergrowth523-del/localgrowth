import Link from 'next/link'

type LegalLinksProps = { className?: string }

const links = [
  { href: '/termos-de-uso', label: 'Termos de Uso' },
  { href: '/politica-de-privacidade', label: 'Politica de Privacidade' },
  { href: '/politica-de-reembolso', label: 'Politica de Reembolso' },
  { href: '/politica-de-cookies', label: 'Politica de Cookies' },
]

export function LegalLinks({ className = '' }: LegalLinksProps) {
  return (
    <nav aria-label="Documentos legais" className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 ${className}`}>
      {links.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-emerald-300">{link.label}</Link>)}
    </nav>
  )
}