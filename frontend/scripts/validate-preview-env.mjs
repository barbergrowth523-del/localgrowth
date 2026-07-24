const isPreview = process.env.VERCEL_ENV === 'preview'
if (!isPreview) process.exit(0)

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]
const missing = required.filter((key) => !process.env[key]?.trim())
if (missing.length) {
  console.error(`[preview-env] Missing Preview variables: ${missing.join(', ')}`)
  process.exit(1)
}

const previewUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
const previewRef = previewUrl.hostname.split('.')[0]
const productionRef = process.env.PRODUCTION_SUPABASE_PROJECT_REF || 'njnvxlvqheqcgqmfmmkx'
if (previewRef === productionRef) {
  console.error('[preview-env] Preview is pointing to the Production Supabase project. Build blocked.')
  process.exit(1)
}

const expectedPreviewRef = process.env.PREVIEW_SUPABASE_PROJECT_REF?.trim()
if (expectedPreviewRef && previewRef !== expectedPreviewRef) {
  console.error('[preview-env] NEXT_PUBLIC_SUPABASE_URL does not match PREVIEW_SUPABASE_PROJECT_REF.')
  process.exit(1)
}

console.log(`[preview-env] Isolated Supabase project confirmed: ${previewRef}`)
