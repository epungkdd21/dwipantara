import { Resend } from 'resend'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { createTicketsPdf } from '@/lib/ticket-pdf'
import { getAppUrl, getTicketUrl } from '@/lib/app-url'

const TICKET_PRICE = 15_000

type PaidTicket = { attendee_name: string; attendee_email: string; attendee_whatsapp: string; ticket_code: string; ticket_number: number; payment_status: string }

export async function sendPaidTicketNotifications(orderId: string) {
  const result = await db.execute(sql`SELECT attendee_name, attendee_email, attendee_whatsapp, ticket_code, ticket_number, payment_status FROM tickets WHERE order_id = ${orderId} AND payment_status = 'paid' ORDER BY ticket_number ASC`)
  const tickets = result.rows as unknown as PaidTicket[]
  if (!tickets.length) return

  const appUrl = getAppUrl()
  const pdf = await createTicketsPdf(orderId, tickets, appUrl)
  const ticketLinks = tickets.map((ticket) => getTicketUrl(ticket.ticket_code))
  const total = tickets.length * TICKET_PRICE
  const attendeeName = tickets[0].attendee_name
  const formattedTotal = `Rp${total.toLocaleString('id-ID')}`
  const logo = await readFile(join(process.cwd(), 'public', 'logo-dw26.png'))
  const message = [
    `*DWIPANTARA 2026*`,
    `Pembayaran berhasil`,
    '',
    `Halo ${attendeeName},`,
    `Terima kasih. Pembayaran Anda untuk acara Dwipantara telah berhasil dikonfirmasi.`,
    '',
    `*Ringkasan pesanan*`,
    `Order ID: ${orderId}`,
    `Jumlah tiket: ${tickets.length}`,
    `Total pembayaran: ${formattedTotal}`,
    '',
    `PDF tiket telah dilampirkan pada email Anda. Buka link berikut untuk menampilkan tiket digital:`,
    ...ticketLinks.map((link, index) => `Tiket ${index + 1}: ${link}`),
    '',
    `Simpan pesan ini dan tunjukkan QR code tiket saat check-in.`,
    `Sampai bertemu di Dwipantara!`,
  ].join('\n')

  const ticketListHtml = ticketLinks.map((link, index) => `<li><a href="${escapeHtml(link)}">Tiket ${index + 1}</a><br><span style="color:#667085;font-size:12px;word-break:break-all">${escapeHtml(link)}</span></li>`).join('')
  const emailHtml = `
    <div style="margin:0;background:#f4f7f2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#17251c">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #dce6dd;border-radius:16px;overflow:hidden">
        <div style="background:#173d2b;padding:28px 32px;color:#ffffff">
          <img src="cid:dwipantara-logo" alt="Dwipantara" style="display:block;width:220px;max-width:100%;height:auto;margin:0 0 24px" />
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b9d8bf">DWIPANTARA 2026</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2">Pembayaran berhasil</h1>
          <p style="margin:10px 0 0;color:#d9ede0;font-size:14px">Tiket Anda siap digunakan.</p>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Halo ${escapeHtml(attendeeName)},</p>
          <p style="margin:0 0 24px;color:#475467;font-size:15px;line-height:1.6">Terima kasih. Pembayaran Anda telah berhasil dikonfirmasi. Simpan email ini sebagai referensi dan tunjukkan QR code tiket saat tiba di lokasi acara.</p>
          <div style="background:#f4f7f2;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 12px;font-weight:bold;color:#173d2b">Ringkasan pesanan</p>
            <p style="margin:6px 0;font-size:14px;color:#475467">Order ID: <strong style="color:#17251c">${escapeHtml(orderId)}</strong></p>
            <p style="margin:6px 0;font-size:14px;color:#475467">Jumlah tiket: <strong style="color:#17251c">${tickets.length}</strong></p>
            <p style="margin:6px 0;font-size:14px;color:#475467">Total pembayaran: <strong style="color:#17251c">${formattedTotal}</strong></p>
          </div>
          <p style="margin:0 0 10px;font-weight:bold;color:#173d2b">Tiket digital</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#176b3a;line-height:1.8">${ticketListHtml}</ul>
          <p style="margin:0;color:#667085;font-size:13px;line-height:1.6">PDF tiket terlampir pada email ini. Tiket hanya berlaku untuk satu kali check-in.</p>
        </div>
        <div style="border-top:1px solid #edf1ed;padding:18px 32px;color:#667085;font-size:12px;line-height:1.5">Dwipantara 2026 · Jagat 'Arsy Student Cabinet (JASCA)</div>
      </div>
    </div>`

  if (process.env.RESEND_API_KEY && process.env.RESEND_EMAIL_DOMAIN) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const emailResult = await resend.emails.send({ from: `Dwipantara <noreply@${process.env.RESEND_EMAIL_DOMAIN}>`, to: [tickets[0].attendee_email], subject: `Pembayaran berhasil · Tiket Dwipantara`, text: message, html: emailHtml, attachments: [{ filename: 'logo-dwipantara.png', content: logo, contentId: 'dwipantara-logo' }, { filename: `dwipantara-${orderId}.pdf`, content: pdf }] }, { idempotencyKey: `paid-ticket-email/${orderId}` })
    if (emailResult.error) console.error('[v0] Gagal mengirim email tiket:', emailResult.error.message)
  }

  if (process.env.FONNTE_TOKEN && tickets[0].attendee_whatsapp) {
    const logoForm = new FormData()
    logoForm.append('target', tickets[0].attendee_whatsapp)
    logoForm.append('message', '*DWIPANTARA 2026*\nLogo resmi acara')
    logoForm.append('filename', 'logo-dwipantara.png')
    logoForm.append('file', new Blob([logo], { type: 'image/png' }), 'logo-dwipantara.png')
    const logoResponse = await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: process.env.FONNTE_TOKEN }, body: logoForm })
    if (!logoResponse.ok) console.error('[v0] Gagal mengirim logo WhatsApp:', logoResponse.status)

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
