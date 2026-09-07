import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

type Ticket = {
  ticket_code: string
  ticket_number: number
  attendee_name: string
  attendee_email: string
  attendee_whatsapp: string
}

const EVENT_NAME = 'Dwipantara 2026'
const EVENT_DATE = 'Sabtu, 17 Oktober 2026'
const EVENT_TIME = "Ba'da Isya – 22.38 WIB"
const EVENT_LOCATION = "Lapangan Futsal Pesantren Jagat 'Arsy BSD"

export async function createTicketsPdf(orderId: string, tickets: Ticket[], appUrl: string) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logo = await pdf.embedPng(await readFile(join(process.cwd(), 'public', 'logo-dw26.png')))

  for (const ticket of tickets) {
    const page = pdf.addPage([720, 360])
    const dark = rgb(0.07, 0.19, 0.13)
    const darkText = rgb(0.12, 0.14, 0.12)
    const cream = rgb(0.99, 0.97, 0.9)
    const gold = rgb(0.88, 0.61, 0.16)
    const muted = rgb(0.38, 0.41, 0.37)

    page.drawRectangle({ x: 0, y: 0, width: 720, height: 360, color: cream })
    page.drawRectangle({ x: 0, y: 0, width: 478, height: 360, color: dark })
    page.drawRectangle({ x: 478, y: 0, width: 2, height: 360, color: gold })

    page.drawImage(logo, { x: 34, y: 277, width: 205, height: 64 })
    page.drawText('TIKET MASUK RESMI', { x: 36, y: 244, size: 10, font: bold, color: gold })
    page.drawText(EVENT_NAME, { x: 36, y: 207, size: 29, font: bold, color: rgb(1, 1, 1) })
    page.drawText("Jagat 'Arsy Student Cabinet (JASCA) 2025/2026", { x: 38, y: 185, size: 9, font, color: rgb(0.8, 0.86, 0.8) })

    page.drawText('PEMEGANG TIKET', { x: 36, y: 137, size: 8, font: bold, color: rgb(0.7, 0.8, 0.7) })
    page.drawText(limitText(ticket.attendee_name, 32), { x: 36, y: 113, size: 18, font: bold, color: rgb(1, 1, 1) })
    page.drawText(limitText(ticket.attendee_email, 48), { x: 36, y: 94, size: 9, font, color: rgb(0.8, 0.86, 0.8) })

    page.drawText('TANGGAL & WAKTU', { x: 36, y: 58, size: 8, font: bold, color: rgb(0.7, 0.8, 0.7) })
    page.drawText(EVENT_DATE, { x: 36, y: 39, size: 10, font: bold, color: rgb(1, 1, 1) })
    page.drawText(EVENT_TIME, { x: 36, y: 23, size: 8, font, color: rgb(0.8, 0.86, 0.8) })

    page.drawText('PASS', { x: 510, y: 318, size: 9, font: bold, color: muted })
    page.drawText(String(ticket.ticket_number).padStart(2, '0'), { x: 510, y: 287, size: 28, font: bold, color: darkText })
    page.drawText('SCAN UNTUK CHECK-IN', { x: 575, y: 318, size: 7, font: bold, color: muted })

    const qrData = await QRCode.toDataURL(`${appUrl}/ticket/${encodeURIComponent(ticket.ticket_code)}`, { width: 210, margin: 1 })
    const qrImage = await pdf.embedPng(qrData)
    page.drawRectangle({ x: 530, y: 79, width: 150, height: 150, color: rgb(1, 1, 1) })
    page.drawImage(qrImage, { x: 540, y: 89, width: 130, height: 130 })
    page.drawText('Tunjukkan QR saat tiba', { x: 547, y: 59, size: 9, font: bold, color: darkText })
    page.drawText(limitText(EVENT_LOCATION, 34), { x: 510, y: 38, size: 7, font, color: muted })
    page.drawText(`ORDER ${limitText(orderId, 25)}`, { x: 510, y: 21, size: 7, font, color: muted })
    page.drawText(ticket.ticket_code, { x: 510, y: 5, size: 7, font: bold, color: gold })

    page.drawCircle({ x: 478, y: 360, size: 13, color: rgb(1, 1, 1) })
    page.drawCircle({ x: 478, y: 0, size: 13, color: rgb(1, 1, 1) })
  }

  return Buffer.from(await pdf.save())
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}
