import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { markTicketsPaid } from '@/lib/tickets'
import { sendPaidTicketNotifications } from '@/lib/notifications'

export async function POST(request: Request) {
  const raw = await request.text()
  const secret = process.env.PAYKITA_WEBHOOK_SECRET
  const signatureHeader = request.headers.get('x-paykita-signature') || ''
  const timestamp = request.headers.get('x-paykita-timestamp') || ''

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret belum dikonfigurasi.' }, { status: 500 })
  }

  const receivedSignature = signatureHeader.startsWith('v1=')
    ? signatureHeader.slice(3)
    : signatureHeader
  const signedPayload = `${timestamp}.${raw}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  const receivedBuffer = Buffer.from(receivedSignature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  if (receivedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Signature invalid' }, { status: 401 })
  }

  try {
    const payload = JSON.parse(raw) as {
      id?: string
      event?: string
      data?: { order_id?: string; reference?: string; status?: string }
    }
    const orderId = payload.data?.order_id || payload.id
    const status = (payload.data?.status || '').toLowerCase()
    if (orderId && ['paid', 'expired', 'cancelled'].includes(status)) {
      await markTicketsPaid(orderId, status)
      if (status === 'paid') {
        try {
          await sendPaidTicketNotifications(orderId)
        } catch (notificationError) {
          console.error('[v0] Notifikasi tiket gagal:', notificationError)
        }
      }
    }
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}
