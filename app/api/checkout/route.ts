import { NextResponse } from 'next/server'
import { createPayKitaOrder, TICKET_PRICE } from '@/lib/paykita'
import { createPendingTickets } from '@/lib/tickets'

export async function POST(request: Request) {
  try {
    const body = await request.json(); const name = String(body.name || '').trim(); const email = String(body.email || '').trim(); const whatsapp = String(body.whatsapp || '').replace(/[^\d+]/g, ''); const quantity = Number(body.quantity)
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.length < 8 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return NextResponse.json({ error: 'Data pembelian tidak valid.' }, { status: 400 })
    const reference = `DW26-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const order = await createPayKitaOrder({ reference, name, email, whatsapp, quantity, amount: quantity * TICKET_PRICE })
    const ticketCodes = await createPendingTickets({ orderId: order.id, name, email, whatsapp, quantity })
    return NextResponse.json({ ...order, ticket_codes: ticketCodes })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout gagal.' }, { status: 502 }) }
}
