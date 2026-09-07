const requestBuckets = new Map<string, { count: number; resetAt: number }>()

export function getClientIp(request: Request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const key = `${scope}:${getClientIp(request)}`
  const now = Date.now()
  const current = requestBuckets.get(key)
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }
  current.count += 1
  return { allowed: current.count <= limit, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
}

export async function readJson<T>(request: Request, maxBytes: number): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > maxBytes) throw new Error('Request terlalu besar.')
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new Error('Request terlalu besar.')
  return JSON.parse(raw) as T
}

export function jsonTooLarge(error: unknown) {
  return error instanceof Error && error.message === 'Request terlalu besar.'
}