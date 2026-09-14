import { NextResponse } from 'next/server'
import { createPayKitaOrder, isPaymentMethodCode } from '@/lib/paykita'
import { calculatePaymentAdminFee, calculatePaymentUniqueCode, calculateTicketTotal } from '@/lib/pricing'
import { createPendingTickets } from '@/lib/tickets'
import { jsonTooLarge, rateLimit, readJson } from '@/lib/security'

export async function POST(request: Request) {
  const limit = rateLimit(request, 'checkout', 10, 60_000)
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  try {
    const body = await readJson<{ name?: unknown; email?: unknown; whatsapp?: unknown; quantity?: unknown; payment_method?: unknown; ewallet_phone?: unknown; unique_code_seed?: unknown }>(request, 16_384); const name = String(body.name || '').trim(); const email = String(body.email || '').trim(); const whatsapp = String(body.whatsapp || '').replace(/[^\d+]/g, ''); const quantity = Number(body.quantity); const ewalletPhone = String(body.ewallet_phone || '').replace(/[^\d+]/g, '')
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.length < 8 || !Number.isInteger(quantity) || quantity < 1 || quantity > 21) return NextResponse.json({ error: 'Maksimal 21 tiket dalam satu order. Silakan buat order baru untuk tiket tambahan.' }, { status: 400 })
    if (!isPaymentMethodCode(body.payment_method) || body.payment_method !== 'QRISREALTIME') return NextResponse.json({ error: 'Saat ini hanya QRIS Realtime yang tersedia.' }, { status: 400 })
    const ewalletMethods = new Set<string>()
    if (ewalletMethods.has(body.payment_method) && ewalletPhone.length < 8) return NextResponse.json({ error: 'Nomor HP e-wallet wajib diisi.' }, { status: 400 })
    const reference = `DW26-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const pricing = calculateTicketTotal(quantity)
    const uniqueCodeSeed = String(body.unique_code_seed || '').trim()
    if (uniqueCodeSeed.length < 8 || uniqueCodeSeed.length > 128) return NextResponse.json({ error: 'Kode pembayaran tidak valid. Muat ulang halaman lalu coba lagi.' }, { status: 400 })
    const uniqueCode = calculatePaymentUniqueCode(uniqueCodeSeed)
    const subtotal = Math.round(Number(pricing.total))
    const adminFee = calculatePaymentAdminFee(subtotal + uniqueCode)
    const nominal = subtotal + uniqueCode + adminFee
    if (!Number.isSafeInteger(nominal) || nominal <= 0) return NextResponse.json({ error: 'Nominal pembayaran tidak valid.' }, { status: 400 })
    const order = await createPayKitaOrder({ reference, name, email, whatsapp, quantity, amount: nominal, paymentMethod: body.payment_method, ewalletPhone })
    const ticketCodes = await createPendingTickets({ orderId: order.id, name, email, whatsapp, quantity })
    return NextResponse.json({ ...order, pay_amount: nominal, subtotal, unique_code: uniqueCode, admin_fee: adminFee, ticket_codes: ticketCodes, ticket_price: pricing.rule.basePrice, pricing_label: pricing.rule.label, bundle_breakdown: pricing.bundleBreakdown })
  } catch (error) { const tooLarge = jsonTooLarge(error); return NextResponse.json({ error: tooLarge ? 'Request terlalu besar.' : error instanceof Error ? error.message : 'Checkout gagal.' }, { status: tooLarge ? 413 : 502 }) }
}
