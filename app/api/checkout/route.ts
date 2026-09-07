import { NextResponse } from 'next/server'
import { createPayKitaOrder } from '@/lib/paykita'
import { calculateTicketTotal } from '@/lib/pricing'
import { createPendingTickets } from '@/lib/tickets'
import { jsonTooLarge, rateLimit, readJson } from '@/lib/security'

export async function POST(request: Request) {
  const limit = rateLimit(request, 'checkout', 10, 60_000)
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  try {
    const body = await readJson<{ name?: unknown; email?: unknown; whatsapp?: unknown; quantity?: unknown }>(request, 16_384); const name = String(body.name || '').trim(); const email = String(body.email || '').trim(); const whatsapp = String(body.whatsapp || '').replace(/[^\d+]/g, ''); const quantity = Number(body.quantity)
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.length < 8 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return NextResponse.json({ error: 'Data pembelian tidak valid.' }, { status: 400 })
    const reference = `DW26-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const order = await createPayKitaOrder({ reference, name, email, whatsapp, quantity, amount: calculateTicketTotal(quantity) })
    const ticketCodes = await createPendingTickets({ orderId: order.id, name, email, whatsapp, quantity })
    return NextResponse.json({ ...order, ticket_codes: ticketCodes })
  } catch (error) { const tooLarge = jsonTooLarge(error); return NextResponse.json({ error: tooLarge ? 'Request terlalu besar.' : error instanceof Error ? error.message : 'Checkout gagal.' }, { status: tooLarge ? 413 : 502 }) }
}
