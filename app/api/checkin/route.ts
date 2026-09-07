import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [countResult, logResult] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS total FROM tickets WHERE checkin_status = 'checked_in'`),
      db.execute(sql`SELECT ticket_code, order_id, attendee_name, attendee_email, attendee_whatsapp, ticket_number, quantity, payment_status, checkin_status, checked_in_at, souvenir_status FROM tickets WHERE checkin_status = 'checked_in' ORDER BY checked_in_at DESC NULLS LAST LIMIT 100`),
    ])
    return NextResponse.json({ total: Number(countResult.rows[0]?.total ?? 0), logs: logResult.rows })
  } catch { return NextResponse.json({ error: 'Gagal memuat log check-in.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    if (typeof code !== 'string' || code.trim().length < 8) return NextResponse.json({ error: 'Kode tiket tidak valid.' }, { status: 400 })
    let ticketCode = code.trim()
    try {
      const parsed = new URL(ticketCode)
      const match = parsed.pathname.match(/\/ticket\/([^/]+)/)
      if (match?.[1]) ticketCode = decodeURIComponent(match[1])
    } catch { }
    const result = await db.execute(sql`UPDATE tickets SET checkin_status = 'checked_in', checked_in_at = now() WHERE ticket_code = ${ticketCode} AND payment_status = 'paid' AND checkin_status = 'not_checked_in' RETURNING ticket_code, attendee_name, attendee_email, attendee_whatsapp, order_id, ticket_number, quantity, payment_status, checkin_status, checked_in_at, souvenir_status, souvenir_collected_at`)
    const ticket = result.rows[0]
    if (!ticket) return NextResponse.json({ error: 'Tiket tidak valid, belum dibayar, atau sudah digunakan.' }, { status: 409 })
    return NextResponse.json({ success: true, ticket })
  } catch { return NextResponse.json({ error: 'Gagal memproses check-in.' }, { status: 500 }) }
}
