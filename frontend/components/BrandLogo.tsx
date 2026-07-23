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
  showTagline: _showTagline = false,
  className = '',
  markClassName = 'h-16 w-16',
  nameClassName = 'text-2xl',
}: BrandLogoProps) {
  return (
    <span className={'flex flex-col items-center justify-center gap-3 ' + className}>
      <span className="relative flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          aria-hidden="true"
          className={'drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] ' + markClassName}
        >
          <defs>
            <linearGradient id="prontusfyEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <path d="M15 75 C 35 45, 65 95, 105 50" fill="none" stroke="url(#prontusfyEmeraldGrad)" strokeWidth="5" strokeLinecap="round" />
          <g stroke="url(#prontusfyEmeraldGrad)" strokeWidth="5" strokeLinecap="round" fill="none">
            <circle cx="35" cy="85" r="10" />
            <line x1="43" y1="77" x2="75" y2="45" />
            <circle cx="85" cy="85" r="10" />
            <line x1="77" y1="77" x2="45" y2="45" />
          </g>
          <path d="M60 30 L62 38 L70 40 L62 42 L60 50 L58 42 L50 40 L58 38 Z" fill="#a7f3d0" />
          <circle cx="68" cy="28" r="2" fill="#d1fae5" />
        </svg>
      </span>
      {showName && (
        <span className={'bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 bg-clip-text font-black tracking-widest text-transparent ' + nameClassName}>
          {BRAND_NAME.toUpperCase()}
        </span>
      )}
    </span>
  )
}