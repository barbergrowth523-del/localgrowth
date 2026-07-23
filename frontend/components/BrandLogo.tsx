'use client'

type BrandLogoProps = {
  showName?: boolean
  className?: string
  markClassName?: string
  nameClassName?: string
}

export default function BrandLogo({
  className = '',
  markClassName = 'max-h-16 w-auto',
}: BrandLogoProps) {
  return (
    <span className={'inline-flex items-center justify-center ' + className}>
      <img
        src="/Captura de tela 2026-07-23 070515.png"
        alt="Prontusfy"
        className={'max-h-16 w-auto object-contain drop-shadow-md ' + markClassName}
      />
    </span>
  )
}