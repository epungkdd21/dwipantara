import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await db.execute(sql`
      SELECT ticket_code, attendee_name, ticket_number, payment_status, checkin_status, created_at
      FROM tickets
      ORDER BY created_at DESC, ticket_number ASC
      LIMIT 500
    `)

    const orders = result.rows.map((row) => ({
      ticket_code: String(row.ticket_code ?? ''),
      attendee_name: String(row.attendee_name ?? ''),
      ticket_number: Number(row.ticket_number ?? 0),
      payment_status: String(row.payment_status ?? 'pending'),
      checkin_status: String(row.checkin_status ?? 'not_checked_in'),
      created_at: row.created_at,
    }))

    return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[v0] Public order list failed:', error)
    return NextResponse.json({ error: 'Data order belum tersedia.' }, { status: 500 })
  }
}
