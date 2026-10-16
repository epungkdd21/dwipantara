import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { requireAdminRole } from '@/lib/admin'
import { calculateTicketTotal } from '@/lib/pricing'
import { hasPaymentAmountColumn } from '@/lib/tickets'

export async function GET() {
  const access = await requireAdminRole()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const paymentAmountAvailable = await hasPaymentAmountColumn()
    const [summary, orders, paidOrdersResult] = await Promise.all([
      db.execute(sql`SELECT count(*)::int AS tickets, count(*) FILTER (WHERE payment_status = 'paid')::int AS paid, count(*) FILTER (WHERE checkin_status = 'checked_in')::int AS checked_in, count(*) FILTER (WHERE souvenir_status = 'collected')::int AS souvenirs, count(DISTINCT order_id)::int AS orders FROM tickets`),
      db.execute(sql`SELECT order_id, ticket_code, attendee_name, attendee_email, attendee_whatsapp, quantity, payment_status, checkin_status, souvenir_status, created_at FROM tickets ORDER BY created_at DESC LIMIT 500`),
      paymentAmountAvailable
        ? db.execute(sql`SELECT order_id, MIN(attendee_name) AS attendee_name, MIN(attendee_email) AS attendee_email, MIN(attendee_whatsapp) AS attendee_whatsapp, count(*)::int AS quantity, MAX(payment_amount) AS payment_amount, MIN(created_at) AS created_at FROM tickets WHERE payment_status = 'paid' GROUP BY order_id ORDER BY MIN(created_at) DESC`)
        : db.execute(sql`SELECT order_id, MIN(attendee_name) AS attendee_name, MIN(attendee_email) AS attendee_email, MIN(attendee_whatsapp) AS attendee_whatsapp, count(*)::int AS quantity, NULL::bigint AS payment_amount, MIN(created_at) AS created_at FROM tickets WHERE payment_status = 'paid' GROUP BY order_id ORDER BY MIN(created_at) DESC`),
    ])
    const paidOrders = paidOrdersResult.rows.map((order) => {
      const quantity = Number(order.quantity)
      const orderTotal = calculateTicketTotal(quantity, new Date(String(order.created_at))).total
      return {
        ...order,
        quantity,
        payment_amount: order.payment_amount === null ? null : Number(order.payment_amount),
        unit_price: orderTotal / quantity,
        order_total: orderTotal,
      }
    })
    return NextResponse.json({ role: access.role, summary: summary.rows[0] ?? {}, orders: orders.rows, paidOrders, paymentAmountAvailable })
  } catch (error) {
    console.error('[admin/stats] Gagal mengambil data dashboard:', error)
    return NextResponse.json(
      { error: 'Data order tidak dapat dimuat. Periksa koneksi DATABASE_URL dan pastikan tabel tickets tersedia.' },
      { status: 503 },
    )
  }
}
