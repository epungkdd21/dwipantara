import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { markTicketsPaid } from '@/lib/tickets'
import { sendPaidTicketNotifications } from '@/lib/notifications'

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 65_536) return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 })
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > 65_536) return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 })
  const secret = process.env.PAYKITA_WEBHOOK_SECRET
  const signatureHeader = request.headers.get('x-paykita-signature') || ''
  const timestamp = request.headers.get('x-paykita-timestamp') || ''

  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret belum dikonfigurasi.' }, { status: 500 })
  }

  const timestampSeconds = Number(timestamp)
  const normalizedTimestamp = timestampSeconds > 1_000_000_000_000 ? timestampSeconds / 1000 : timestampSeconds
  if (!Number.isFinite(normalizedTimestamp) || Math.abs(Math.floor(Date.now() / 1000) - normalizedTimestamp) > 300) {
    return NextResponse.json({ error: 'Timestamp webhook tidak valid.' }, { status: 401 })
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
    if (orderId && /^[a-zA-Z0-9_-]{1,100}$/.test(orderId) && ['paid', 'expired', 'cancelled'].includes(status)) {
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
