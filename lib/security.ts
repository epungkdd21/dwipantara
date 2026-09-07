import crypto from 'node:crypto'
import { cookies } from 'next/headers'

const requestBuckets = new Map<string, { count: number; resetAt: number }>()
export const CHECKIN_KIOSK_COOKIE = 'dwipantara_checkin_kiosk'
const CHECKIN_KIOSK_TTL_SECONDS = 8 * 60 * 60

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

function getCookieSecret() {
  return process.env.BETTER_AUTH_SECRET || process.env.CHECKIN_KIOSK_PASSWORD || 'development-only-kiosk-secret'
}

function signKioskPayload(payload: string) {
  return crypto.createHmac('sha256', getCookieSecret()).update(payload).digest('base64url')
}

export function createKioskToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + CHECKIN_KIOSK_TTL_SECONDS
  const payload = `checkin:${expiresAt}`
  return `${payload}.${signKioskPayload(payload)}`
}

export function isValidKioskToken(token: string | undefined) {
  if (!token) return false
  const tokenParts = token.match(/^checkin:(\d+)\.([A-Za-z0-9_-]+)$/)
  if (!tokenParts) return false
  const expiresAt = Number(tokenParts[1])
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false
  const payload = `checkin:${expiresAt}`
  const expected = signKioskPayload(payload)
  const receivedBuffer = Buffer.from(tokenParts[2])
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function hasKioskAccess() {
  const cookieStore = await cookies()
  return isValidKioskToken(cookieStore.get(CHECKIN_KIOSK_COOKIE)?.value)
}

export function kioskPasswordMatches(password: unknown) {
  if (typeof password !== 'string') return false
  const configuredPassword = process.env.CHECKIN_KIOSK_PASSWORD
  if (!configuredPassword && process.env.NODE_ENV === 'production') return false
  const expected = configuredPassword || 'Hint2138'
  const receivedBuffer = Buffer.from(password)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function isKioskPasswordConfigured() {
  return process.env.NODE_ENV !== 'production' || Boolean(process.env.CHECKIN_KIOSK_PASSWORD)
}