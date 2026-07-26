const DEFAULT_MAX_JSON_BYTES = 64 * 1024

export function hasValidSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

export async function readJsonBody<T>(request: Request, maxBytes = DEFAULT_MAX_JSON_BYTES): Promise<T | null> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null

  try {
    const raw = await request.text()
    if (!raw || new TextEncoder().encode(raw).byteLength > maxBytes) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}