import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { requireAdminRole } from '@/lib/admin'

export async function GET() {
  const access = await requireAdminRole()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [summary, orders] = await Promise.all([
    db.execute(sql`SELECT count(*)::int AS tickets, count(*) FILTER (WHERE payment_status = 'paid')::int AS paid, count(*) FILTER (WHERE checkin_status = 'checked_in')::int AS checked_in, count(*) FILTER (WHERE souvenir_status = 'collected')::int AS souvenirs, count(DISTINCT order_id)::int AS orders FROM tickets`),
    db.execute(sql`SELECT order_id, ticket_code, attendee_name, attendee_email, attendee_whatsapp, quantity, payment_status, checkin_status, souvenir_status, created_at FROM tickets ORDER BY created_at DESC LIMIT 500`),
  ])
  return NextResponse.json({ role: access.role, summary: summary.rows[0] ?? {}, orders: orders.rows })
}
