'use client'

import { BRAND_NAME } from '@/lib/brand'

type BrandLogoProps = {
  showName?: boolean
  className?: string
  markClassName?: string
  nameClassName?: string
}

export default function BrandLogo({ showName = true, className = '', markClassName = 'h-10 w-10', nameClassName = 'text-lg' }: BrandLogoProps) {
  return (
    <span className={'inline-flex items-center gap-3 ' + className}>
      <span className={'inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 ' + markClassName}>
        <svg viewBox="0 0 48 48" aria-hidden="true" className="h-[70%] w-[70%] fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="18" r="5" />
          <circle cx="14" cy="32" r="5" />
          <path d="M18 21.5 39 9" />
          <path d="M18 28.5 39 40" />
          <path d="M20 24 39 24" />
          <path d="M27 24c4-7 9-8 15-3" />
          <path d="M27 24c4 7 9 8 15 3" />
        </svg>
      </span>
      {showName && <span className={'font-bold tracking-tight text-white ' + nameClassName}>{BRAND_NAME}</span>}
    </span>
  )
}
