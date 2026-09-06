import { Resend } from 'resend'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const getAppUrl = () => {
  const raw = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return raw.replace(/\/$/, '')
}

const TICKET_PRICE = 10_000

type PaidTicket = {
  attendee_name: string
  attendee_email: string
  attendee_whatsapp: string
  ticket_code: string
  ticket_number: number
  payment_status: string
}

function ticketMessage(input: { name: string; orderId: string; tickets: PaidTicket[]; links: string[] }) {
  const total = input.tickets.length * TICKET_PRICE
  const ticketLines = input.tickets
    .map((ticket, index) => `${index + 1}. ${ticket.ticket_code}\n   ${input.links[index]}`)
    .join('\n')

  return `Halo ${input.name}, pembayaran Anda berhasil.

Ringkasan order
Order ID: ${input.orderId}
Jumlah tiket: ${input.tickets.length}
Total pembayaran: Rp${total.toLocaleString('id-ID')}
Status: Lunas

Detail tiket dan QR check-in:
${ticketLines}

Simpan pesan ini. Tunjukkan QR dari tautan tiket saat check-in dan jangan bagikan tiket kepada orang lain.`
}

export async function sendPaidTicketNotifications(orderId: string) {
  const result = await db.execute(sql`
    SELECT attendee_name, attendee_email, attendee_whatsapp, ticket_code, ticket_number, payment_status
    FROM tickets
    WHERE order_id = ${orderId} AND payment_status = 'paid'
    ORDER BY ticket_number ASC
  `)
  const tickets = result.rows as unknown as PaidTicket[]
  if (!tickets.length) return

  const appUrl = getAppUrl()
  const links = tickets.map((ticket) => `${appUrl}/ticket/${encodeURIComponent(ticket.ticket_code)}`)
  const message = ticketMessage({ name: tickets[0].attendee_name, orderId, tickets, links })
  const htmlTickets = tickets
    .map((ticket, index) => `<li><strong>${escapeHtml(ticket.ticket_code)}</strong> — <a href="${escapeHtml(links[index])}">Buka tiket dan QR</a></li>`)
    .join('')
  const total = tickets.length * TICKET_PRICE
  const html = `<p>Halo ${escapeHtml(tickets[0].attendee_name)},</p><p>Pembayaran Anda berhasil dan tiket siap digunakan.</p><h3>Ringkasan order</h3><ul><li>Order ID: <strong>${escapeHtml(orderId)}</strong></li><li>Jumlah tiket: ${tickets.length}</li><li>Total pembayaran: Rp${total.toLocaleString('id-ID')}</li><li>Status: Lunas</li></ul><h3>Detail tiket</h3><ol>${htmlTickets}</ol><p>Simpan email ini. Tunjukkan QR pada halaman tiket saat check-in dan jangan bagikan tiket kepada orang lain.</p>`

  if (process.env.RESEND_API_KEY && process.env.RESEND_EMAIL_DOMAIN) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const emailResult = await resend.emails.send(
      {
        from: `Dwipantara <noreply@${process.env.RESEND_EMAIL_DOMAIN}>`,
        to: [tickets[0].attendee_email],
        subject: `Pembayaran berhasil — ${tickets.length} Tiket Dwipantara (${orderId})`,
        text: message,
        html,
      },
      { idempotencyKey: `paid-ticket-email/${orderId}` },
    )
    if (emailResult.error) console.error('[v0] Gagal mengirim email ringkasan order:', emailResult.error.message)
  }

  if (process.env.FONNTE_TOKEN && tickets[0].attendee_whatsapp) {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: process.env.FONNTE_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: tickets[0].attendee_whatsapp, message }),
    })
    if (!response.ok) console.error('[v0] Gagal mengirim WhatsApp ringkasan order:', response.status)
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)
}
