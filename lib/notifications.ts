import { Resend } from 'resend'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { createTicketsPdf } from '@/lib/ticket-pdf'

const getAppUrl = () => (process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '')
const TICKET_PRICE = 15_000

type PaidTicket = { attendee_name: string; attendee_email: string; attendee_whatsapp: string; ticket_code: string; ticket_number: number; payment_status: string }

export async function sendPaidTicketNotifications(orderId: string) {
  const result = await db.execute(sql`SELECT attendee_name, attendee_email, attendee_whatsapp, ticket_code, ticket_number, payment_status FROM tickets WHERE order_id = ${orderId} AND payment_status = 'paid' ORDER BY ticket_number ASC`)
  const tickets = result.rows as unknown as PaidTicket[]
  if (!tickets.length) return

  const appUrl = getAppUrl()
  const pdf = await createTicketsPdf(orderId, tickets, appUrl)
  const ticketLinks = tickets.map((ticket) => `${appUrl}/ticket/${encodeURIComponent(ticket.ticket_code)}`)
  const total = tickets.length * TICKET_PRICE
  const message = `Halo ${tickets[0].attendee_name}, pembayaran order ${orderId} berhasil. Jumlah tiket: ${tickets.length}. Total: Rp${total.toLocaleString('id-ID')}. PDF tiket sudah dikirim melalui email. QR tiket: ${ticketLinks.join(' | ')}`

  if (process.env.RESEND_API_KEY && process.env.RESEND_EMAIL_DOMAIN) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const emailResult = await resend.emails.send({ from: `Dwipantara <noreply@${process.env.RESEND_EMAIL_DOMAIN}>`, to: [tickets[0].attendee_email], subject: `Tiket Dwipantara — ${orderId}`, text: message, html: `<p>Halo ${escapeHtml(tickets[0].attendee_name)},</p><p>Pembayaran Anda berhasil. PDF tiket terlampir pada email ini.</p><p>Order: <strong>${escapeHtml(orderId)}</strong><br>Jumlah tiket: ${tickets.length}<br>Total: Rp${total.toLocaleString('id-ID')}</p>`, attachments: [{ filename: `dwipantara-${orderId}.pdf`, content: pdf }] }, { idempotencyKey: `paid-ticket-email/${orderId}` })
    if (emailResult.error) console.error('[v0] Gagal mengirim email tiket:', emailResult.error.message)
  }

  if (process.env.FONNTE_TOKEN && tickets[0].attendee_whatsapp) {
    const form = new FormData()
    form.append('target', tickets[0].attendee_whatsapp)
    form.append('message', message)
    form.append('filename', `dwipantara-${orderId}.pdf`)
    form.append('file', new Blob([pdf], { type: 'application/pdf' }), `dwipantara-${orderId}.pdf`)
    const response = await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: process.env.FONNTE_TOKEN }, body: form })
    if (!response.ok) console.error('[v0] Gagal mengirim WhatsApp tiket:', response.status)
  }
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character) }
