'use client'

import Image from 'next/image'
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
  return (
    <span className={'flex select-none flex-col items-center justify-center gap-6 ' + className}>
      <Image
        src="/logo-prontusfy.png"
        alt="Prontusfy"
        width={80}
        height={80}
        priority
        className={'object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] ' + markClassName}
      />
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