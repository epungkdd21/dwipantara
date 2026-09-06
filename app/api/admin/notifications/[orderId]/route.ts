import { NextResponse } from 'next/server'
import { sendPaidTicketNotifications } from '@/lib/notifications'
import { requireAdminRole } from '@/lib/admin'

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const access = await requireAdminRole()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (access.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { orderId } = await context.params
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) return NextResponse.json({ error: 'Order ID tidak valid.' }, { status: 400 })
  try {
    await sendPaidTicketNotifications(orderId)
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error('[v0] Retry notifikasi gagal:', error)
    return NextResponse.json({ error: 'Notifikasi gagal dikirim.' }, { status: 500 })
  }
}
