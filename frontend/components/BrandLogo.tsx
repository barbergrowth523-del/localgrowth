'use client'

import { BRAND_NAME } from '@/lib/brand'

type BrandLogoProps = {
  showName?: boolean
  showTagline?: boolean
  className?: string
  markClassName?: string
  nameClassName?: string
}

export default function BrandLogo({
  showName = true,
  showTagline = true,
  className = '',
  markClassName = 'h-10 w-10',
  nameClassName = 'text-lg',
}: BrandLogoProps) {
  return (
    <span className={'inline-flex items-center gap-3 ' + className}>
      <span className={'inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 ' + markClassName}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="8.5" y1="7.5" x2="18" y2="16.5" />
          <line x1="15.5" y1="7.5" x2="8.5" y2="14.5" />
          <path d="M14 18c2-1 4-3 5-6" strokeDasharray="2 2" className="text-emerald-300" />
        </svg>
      </span>
      {showName && (
        <span className="flex flex-col">
          <span className={'font-bold tracking-tight text-white ' + nameClassName}>{BRAND_NAME}</span>
          {showTagline && <span className="text-[10px] uppercase tracking-wider text-zinc-400">Gestao e Praticidade</span>}
        </span>
      )}
    </span>
  )
}