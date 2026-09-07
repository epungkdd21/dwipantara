import { NextResponse } from 'next/server'
import { CHECKIN_KIOSK_COOKIE, createKioskToken, hasKioskAccess, isKioskPasswordConfigured, jsonTooLarge, kioskPasswordMatches, rateLimit, readJson } from '@/lib/security'

export async function GET() {
  return NextResponse.json({ unlocked: await hasKioskAccess() })
}

export async function POST(request: Request) {
  if (!isKioskPasswordConfigured()) return NextResponse.json({ error: 'Password kiosk belum dikonfigurasi di server.' }, { status: 503 })
  const limit = rateLimit(request, 'checkin-access', 10, 60_000)
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  try {
    const body = await readJson<{ password?: unknown }>(request, 2_048)
    if (!kioskPasswordMatches(body.password)) return NextResponse.json({ error: 'Password kiosk salah.' }, { status: 401 })
    const response = NextResponse.json({ unlocked: true })
    response.cookies.set(CHECKIN_KIOSK_COOKIE, createKioskToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 })
    return response
  } catch (error) {
    return NextResponse.json({ error: jsonTooLarge(error) ? 'Request terlalu besar.' : 'Request tidak valid.' }, { status: jsonTooLarge(error) ? 413 : 400 })
  }
}

export async function DELETE(request: Request) {
  if (!isKioskPasswordConfigured()) return NextResponse.json({ error: 'Password kiosk belum dikonfigurasi di server.' }, { status: 503 })
  try {
    const body = await readJson<{ password?: unknown }>(request, 2_048)
    if (!kioskPasswordMatches(body.password)) return NextResponse.json({ error: 'Password kiosk salah.' }, { status: 401 })
    const response = NextResponse.json({ unlocked: false })
    response.cookies.set(CHECKIN_KIOSK_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 })
    return response
  } catch (error) {
    return NextResponse.json({ error: jsonTooLarge(error) ? 'Request terlalu besar.' : 'Request tidak valid.' }, { status: jsonTooLarge(error) ? 413 : 400 })
  }
}