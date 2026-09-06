import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()
    if (typeof code !== 'string' || code.trim().length < 8) {
      return NextResponse.json({ error: 'Kode tiket tidak valid.' }, { status: 400 })
    }

    const result = await db.execute(sql`
      UPDATE tickets
      SET souvenir_status = 'collected', souvenir_collected_at = now()
      WHERE ticket_code = ${code.trim()}
        AND payment_status = 'paid'
        AND checkin_status = 'checked_in'
        AND souvenir_status = 'not_collected'
      RETURNING ticket_code, attendee_name, order_id, souvenir_status, souvenir_collected_at
    `)
    const ticket = result.rows[0]
    if (!ticket) {
      return NextResponse.json({ error: 'Souvenir hanya dapat diberikan setelah check-in dan tidak boleh diambil dua kali.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, ticket })
  } catch {
    return NextResponse.json({ error: 'Gagal mencatat pengambilan souvenir.' }, { status: 500 })
  }
}
