'use client'

import Image from 'next/image'
type BrandLogoProps = {
  showName?: boolean
  className?: string
  markClassName?: string
  nameClassName?: string
}

export default function BrandLogo({
  className = '',
  markClassName = 'h-auto w-full max-w-[180px] object-contain',
}: BrandLogoProps) {
  return (
    <span className={'inline-flex items-center justify-center ' + className}>
      <Image
        src="/logo-prontusfy.png"
        width={180}
        height={64}
        priority
        alt="Prontusfy"
        className={'object-contain drop-shadow-md ' + markClassName}
      />
    </span>
  )
}