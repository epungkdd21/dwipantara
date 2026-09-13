import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { markTicketsPaid } from '@/lib/tickets'
import { sendPaidTicketNotifications } from '@/lib/notifications'

const MAX_PAYLOAD_BYTES = 65_536

function isValidSignature(raw: string, request: Request) {
  const signature = request.headers.get('x-paymentkita-signature') || request.headers.get('x-paykita-signature')
  if (!signature) return true

  const secret = process.env.PAYMENTKITA_WEBHOOK_SECRET || process.env.PAYKITA_WEBHOOK_SECRET || process.env.PAYMENTKITA_SECRET_KEY
  if (!secret) return false

  const timestamp = request.headers.get('x-paymentkita-timestamp') || request.headers.get('x-paykita-timestamp') || ''
  if (timestamp) {
    const seconds = Number(timestamp)
    const normalized = seconds > 1_000_000_000_000 ? seconds / 1000 : seconds
    if (!Number.isFinite(normalized) || Math.abs(Math.floor(Date.now() / 1000) - normalized) > 300) return false
  }

  const received = signature.startsWith('v1=') ? signature.slice(3) : signature
  const expected = crypto.createHmac('sha256', secret).update(timestamp ? `${timestamp}.${raw}` : raw).digest('hex')
  const receivedBuffer = Buffer.from(received, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

function getOrderId(payload: Record<string, unknown>) {
  const data = (payload.data || payload.result || payload.order) as Record<string, unknown> | undefined
  return String(data?.ref_id || data?.reference || data?.order_id || data?.id || payload.ref_id || payload.reference || payload.order_id || payload.id || '')
}

function getStatus(payload: Record<string, unknown>) {
  const data = (payload.data || payload.result || payload.order) as Record<string, unknown> | undefined
  return String(data?.status || data?.payment_status || data?.state || payload.status || payload.payment_status || '').toLowerCase()
}

function normalizeStatus(status: string) {
  if (['success', 'sukses', 'paid', 'settlement', 'completed'].includes(status)) return 'paid' as const
  if (['expired', 'kadaluarsa', 'timeout'].includes(status)) return 'expired' as const
  if (['cancelled', 'canceled', 'failed', 'gagal'].includes(status)) return 'cancelled' as const
  return null
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_PAYLOAD_BYTES) return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 })

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_PAYLOAD_BYTES) return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 })
  if (!isValidSignature(raw, request)) return NextResponse.json({ error: 'Signature invalid' }, { status: 401 })

  try {
    const payload = JSON.parse(raw) as Record<string, unknown>
    const orderId = getOrderId(payload)
    const status = normalizeStatus(getStatus(payload))
    if (orderId && /^[a-zA-Z0-9_-]{1,100}$/.test(orderId) && status) {
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
