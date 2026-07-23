'use client'

import { useId } from 'react'
import { BRAND_NAME } from '@/lib/brand'

type BrandLogoProps = {
  showName?: boolean
  className?: string
  markClassName?: string
  nameClassName?: string
}

export default function BrandLogo({
  showName = true,
  className = '',
  markClassName = 'h-20 w-20',
  nameClassName = 'text-4xl',
}: BrandLogoProps) {
  const gradientId = 'prontusfyIconGradient' + useId().replace(/:/g, '')

  return (
    <span className={'flex select-none flex-col items-center justify-center gap-6 ' + className}>
      <span className="relative flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 150 150"
          aria-hidden="true"
          className={markClassName}
          style={{ filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.3))' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          <path d="M20 75 C 40 45, 70 95, 110 50" fill="none" stroke="#059669" strokeWidth="6" strokeLinecap="round" />
          <g fill="none" stroke={'url(#' + gradientId + ')'} strokeWidth="6" strokeLinecap="round">
            <circle cx="40" cy="90" r="12" />
            <line x1="48" y1="82" x2="80" y2="50" />
            <circle cx="90" cy="90" r="12" />
            <line x1="82" y1="82" x2="50" y2="50" />
          </g>

          <path d="M65 35 L67 41 L73 42 L67 43 L65 49 L63 43 L57 42 L63 41 Z" fill="#FFFFFF" />
          <circle cx="72" cy="33" r="2.5" fill="#D1FAE5" />
        </svg>
      </span>

      {showName && (
        <span className="relative flex flex-col items-center">
          <span className={'text-4xl font-extrabold tracking-[0.20em] text-[#34d399] ' + nameClassName}>
            {BRAND_NAME.toUpperCase()}
          </span>
          <span className="absolute -bottom-2 right-0 h-1.5 w-1.5 rounded-full bg-[#34d399] blur-[1px]" />
        </span>
      )}
    </span>
  )
}