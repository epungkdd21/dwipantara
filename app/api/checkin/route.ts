import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    if (typeof code !== 'string' || code.length < 8) return NextResponse.json({ error: 'Kode tiket tidak valid.' }, { status: 400 })
    const result = await db.execute(sql`UPDATE tickets SET checkin_status = 'checked_in', checked_in_at = now() WHERE ticket_code = ${code.trim()} AND payment_status = 'paid' AND checkin_status = 'not_checked_in' RETURNING ticket_code, attendee_name, order_id, checkin_status, checked_in_at, souvenir_status, souvenir_collected_at`)
    const ticket = result.rows[0]
    if (!ticket) return NextResponse.json({ error: 'Tiket tidak valid, belum dibayar, atau sudah digunakan.' }, { status: 409 })
    return NextResponse.json({ success: true, ticket })
  } catch { return NextResponse.json({ error: 'Gagal memproses check-in.' }, { status: 500 }) }
}
