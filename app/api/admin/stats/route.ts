import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [summary, orders] = await Promise.all([
    db.query(`SELECT count(*)::int AS tickets, count(*) FILTER (WHERE checkin_status = 'checked_in')::int AS checked_in, count(*) FILTER (WHERE souvenir_status = 'collected')::int AS souvenirs FROM tickets`),
    db.query(`SELECT order_id, attendee_name, attendee_email, quantity, payment_status, checkin_status, souvenir_status, created_at FROM tickets ORDER BY created_at DESC LIMIT 100`),
  ])
  return NextResponse.json({ summary: summary.rows[0] ?? {}, orders: orders.rows })
}
