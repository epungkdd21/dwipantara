import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function createPendingTickets(input: { orderId: string; name: string; email: string; whatsapp: string; quantity: number }) {
  const tickets = Array.from({ length: input.quantity }, (_, index) => ({
    id: randomUUID(), ticketCode: `${input.orderId}-${index + 1}-${randomUUID().slice(0, 8).toUpperCase()}`,
  }))
  for (const ticket of tickets) {
    await db.execute(sql`INSERT INTO tickets (id, order_id, ticket_code, attendee_name, attendee_email, attendee_whatsapp, ticket_number, quantity, payment_status) VALUES (${ticket.id}, ${input.orderId}, ${ticket.ticketCode}, ${input.name}, ${input.email}, ${input.whatsapp}, ${tickets.indexOf(ticket) + 1}, ${input.quantity}, 'pending') ON CONFLICT (ticket_code) DO NOTHING`)
  }
  return tickets.map((ticket) => ticket.ticketCode)
}

export async function markTicketsPaid(orderId: string, status: string) {
  await db.execute(sql`UPDATE tickets SET payment_status = ${status} WHERE order_id = ${orderId}`)
}
