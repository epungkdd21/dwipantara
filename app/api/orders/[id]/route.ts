import { NextResponse } from 'next/server'
import { getPayKitaOrder } from '@/lib/paykita'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; const order = await getPayKitaOrder(id); const tickets = await db.execute(sql`SELECT ticket_code, attendee_name, ticket_number, payment_status, checkin_status FROM tickets WHERE order_id = ${id} ORDER BY ticket_number`); return NextResponse.json({ ...order, tickets: tickets.rows }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Status tidak tersedia.' }, { status: 502 }) }
}
