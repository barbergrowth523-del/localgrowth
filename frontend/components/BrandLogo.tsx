'use client'

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
      <img
        src="/Captura de tela 2026-07-23 070515.png"
        alt="Prontusfy"
        className={'h-auto w-full max-w-[180px] object-contain drop-shadow-md ' + markClassName}
      />
    </span>
  )
}