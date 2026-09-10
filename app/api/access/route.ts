import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createPublicAccessToken, isValidPublicAccessToken, jsonTooLarge, PUBLIC_ACCESS_COOKIE, publicPasswordMatches, rateLimit, readJson } from '@/lib/security'

export async function GET() {
  const cookieStore = await cookies()
  return NextResponse.json({ unlocked: isValidPublicAccessToken(cookieStore.get(PUBLIC_ACCESS_COOKIE)?.value) })
}

export async function POST(request: Request) {
  const limit = rateLimit(request, 'public-access', 5, 60_000)
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  try {
    const body = await readJson<{ password?: unknown }>(request, 2_048)
    if (!publicPasswordMatches(body.password)) return NextResponse.json({ error: 'Password salah.' }, { status: 401 })
    const response = NextResponse.json({ unlocked: true })
    response.cookies.set(PUBLIC_ACCESS_COOKIE, createPublicAccessToken(), { httpOnly: true, maxAge: 24 * 60 * 60, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    return response
  } catch (error) {
    return NextResponse.json({ error: jsonTooLarge(error) ? 'Request terlalu besar.' : 'Request tidak valid.' }, { status: jsonTooLarge(error) ? 413 : 400 })
  }
}