import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireCheckinAccess } from '@/lib/admin'
import { jsonTooLarge, rateLimit, readJson } from '@/lib/security'

export async function GET() {
  if (!await requireCheckinAccess()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const [countResult, logResult] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM tickets WHERE checkin_status = 'checked_in'`),
      db.execute(sql`SELECT ticket_code, order_id, attendee_name, attendee_email, attendee_whatsapp, ticket_number, quantity, payment_status, checkin_status, checked_in_at, souvenir_status FROM tickets WHERE checkin_status = 'checked_in' ORDER BY checked_in_at DESC NULLS LAST LIMIT 100`),
    ])
    return NextResponse.json({ total: Number(countResult.rows[0]?.total ?? 0), logs: logResult.rows })
  } catch { return NextResponse.json({ error: 'Gagal memuat log check-in.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  if (!await requireCheckinAccess()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = rateLimit(request, 'checkin', 60, 60_000)
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  try {
    const { code, ticketCode: submittedTicketCode } = await readJson<{ code?: unknown; ticketCode?: unknown }>(request, 4_096)
    const submittedCode = typeof code === 'string' ? code : submittedTicketCode
    if (typeof submittedCode !== 'string' || submittedCode.trim().length < 8 || submittedCode.trim().length > 300) return NextResponse.json({ error: 'Kode tiket tidak valid.' }, { status: 400 })
    let ticketCode = submittedCode.trim()
    try {
      const parsed = new URL(ticketCode)
      const match = parsed.pathname.match(/\/ticket\/([^/]+)/)
      if (match?.[1]) ticketCode = decodeURIComponent(match[1])
    } catch { }
    const result = await db.execute(sql`UPDATE tickets SET checkin_status = 'checked_in', checked_in_at = now() WHERE ticket_code = ${ticketCode} AND payment_status = 'paid' AND checkin_status = 'not_checked_in' RETURNING ticket_code, attendee_name, attendee_email, attendee_whatsapp, order_id, ticket_number, quantity, payment_status, checkin_status, checked_in_at, souvenir_status, souvenir_collected_at`)
    const ticket = result.rows[0]
    if (!ticket) return NextResponse.json({ error: 'Tiket tidak valid, belum dibayar, atau sudah digunakan.' }, { status: 409 })
    return NextResponse.json({ success: true, ticket })
  } catch (error) { const tooLarge = jsonTooLarge(error); return NextResponse.json({ error: tooLarge ? 'Request terlalu besar.' : 'Gagal memproses check-in.' }, { status: tooLarge ? 413 : 500 }) }
}
