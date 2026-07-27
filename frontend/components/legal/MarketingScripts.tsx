'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'prontusfy-cookie-consent'

type MarketingScriptsProps = { gaId?: string; metaPixelId?: string; googleAdsId?: string }

export function MarketingScripts({ gaId, metaPixelId, googleAdsId }: MarketingScriptsProps) {
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const update = () => setAccepted(window.localStorage.getItem(CONSENT_KEY) === 'accepted')
    update()
    window.addEventListener('prontusfy-cookie-consent', update)
    return () => window.removeEventListener('prontusfy-cookie-consent', update)
  }, [])

  if (!accepted) return null

  const gtagId = gaId || googleAdsId
  return <>
    {gtagId && <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`} strategy="afterInteractive" />}
    {gtagId && <Script id="prontusfy-google-tracking" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${gaId ? `gtag('config','${gaId}',{anonymize_ip:true});` : ''}${googleAdsId ? `gtag('config','${googleAdsId}');` : ''}`}</Script>}
    {metaPixelId && <Script id="prontusfy-meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}</Script>}
  </>
}