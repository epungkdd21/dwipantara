import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

type Ticket = {
  ticket_code: string
  ticket_number: number
  attendee_name: string
  attendee_email: string
  attendee_whatsapp: string
}

export async function createTicketsPdf(orderId: string, tickets: Ticket[], appUrl: string) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  for (const ticket of tickets) {
    const page = pdf.addPage([595, 842])
    page.drawText('DWIPANTARA 2026', { x: 48, y: 780, size: 22, font: bold, color: rgb(0.1, 0.25, 0.16) })
    page.drawText("Jagat 'Arsy Student Cabinet (JASCA) 2025/2026", { x: 48, y: 752, size: 11, font, color: rgb(0.25, 0.25, 0.22) })
    page.drawText('TIKET MASUK', { x: 48, y: 690, size: 12, font: bold, color: rgb(0.65, 0.43, 0.08) })
    page.drawText(`Tiket #${ticket.ticket_number}`, { x: 48, y: 650, size: 24, font: bold, color: rgb(0.1, 0.1, 0.08) })
    page.drawText(`Nama: ${ticket.attendee_name}`, { x: 48, y: 612, size: 13, font })
    page.drawText('Sabtu, 17 Oktober 2026 · Ba’da Isya – 22.38 WIB', { x: 48, y: 586, size: 11, font })
    page.drawText("Lapangan Futsal Pesantren Jagat 'Arsy BSD, Serpong", { x: 48, y: 562, size: 11, font })
    page.drawText(`Order ID: ${orderId}`, { x: 48, y: 510, size: 10, font, color: rgb(0.35, 0.35, 0.32) })
    page.drawText(`Kode tiket: ${ticket.ticket_code}`, { x: 48, y: 490, size: 10, font, color: rgb(0.35, 0.35, 0.32) })

    const qrData = await QRCode.toDataURL(`${appUrl}/ticket/${encodeURIComponent(ticket.ticket_code)}`, { width: 260, margin: 1 })
    const qrImage = await pdf.embedPng(qrData)
    page.drawImage(qrImage, { x: 168, y: 180, width: 260, height: 260 })
    page.drawText('Tunjukkan QR ini saat check-in', { x: 190, y: 145, size: 11, font: bold, color: rgb(0.1, 0.25, 0.16) })
    page.drawText('Tiket berlaku untuk satu kali masuk.', { x: 190, y: 125, size: 10, font, color: rgb(0.35, 0.35, 0.32) })
  }

  return Buffer.from(await pdf.save())
}
