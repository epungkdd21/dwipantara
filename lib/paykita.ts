import { getAppUrl } from '@/lib/app-url'

function getPaymentKitaBaseUrl() {
  const configured = process.env.PAYMENTKITA_BASE_URL || 'https://api.paymentkita.com'
  const url = new URL(configured)
  return url.origin
}

const PAYMENTKITA_BASE_URL = getPaymentKitaBaseUrl()
const PAYMENTKITA_MERCHANT_ID = process.env.PAYMENTKITA_MERCHANT_ID
const PAYMENTKITA_SECRET_KEY = process.env.PAYMENTKITA_SECRET_KEY
export const PAYMENT_METHODS = [
  { code: 'BRIVA', label: 'BRI Virtual Account', settlement: 'H+1' },
  { code: 'BNIVA', label: 'BNI Virtual Account', settlement: 'H+0 (realtime)' },
  { code: 'MANDIRIVA', label: 'Mandiri Virtual Account', settlement: 'H+0 (realtime)' },
  { code: 'BSIVA', label: 'BSI Virtual Account', settlement: 'H+1' },
  { code: 'QRISREALTIME', label: 'QRIS Realtime', settlement: 'H+0 (realtime)' },
  { code: 'DANA', label: 'DANA', settlement: 'H+1' },
  { code: 'SHOPEEPAY', label: 'ShopeePay', settlement: 'H+1' },
  { code: 'OVO', label: 'OVO', settlement: 'H+1' },
  { code: 'GOPAY', label: 'GoPay', settlement: 'H+1' },
  { code: 'DANA_REALTIME', label: 'DANA Realtime', settlement: 'H+0 (realtime)' },
  { code: 'SHOPEEPAY_REALTIME', label: 'ShopeePay Realtime', settlement: 'H+0 (realtime)' },
  { code: 'GOPAY_REALTIME', label: 'GoPay Realtime', settlement: 'H+0 (realtime)' },
  { code: 'OVO_REALTIME', label: 'OVO Realtime', settlement: 'H+0 (realtime)' },
] as const

export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number]['code']

const PAYMENT_METHOD_CODES = new Set<string>(PAYMENT_METHODS.map(method => method.code))

export function isPaymentMethodCode(value: unknown): value is PaymentMethodCode {
  return typeof value === 'string' && PAYMENT_METHOD_CODES.has(value)
}

type PaymentKitaResponse = Record<string, unknown>

export type PayKitaOrder = {
  id: string
  reference?: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  base_amount: number
  pay_amount: number
  qris?: string
  checkout_url: string
  expires_at?: string
}

function getValue(data: PaymentKitaResponse, ...keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function normalizeStatus(value: unknown): PayKitaOrder['status'] {
  const status = String(value || 'pending').toLowerCase()
  if (['success', 'sukses', 'paid', 'settlement', 'completed'].includes(status)) return 'paid'
  if (['expired', 'kadaluarsa', 'timeout'].includes(status)) return 'expired'
  if (['cancelled', 'canceled', 'failed', 'gagal'].includes(status)) return 'cancelled'
  return 'pending'
}

function normalizeOrder(data: PaymentKitaResponse, input: { reference: string; amount: number }): PayKitaOrder {
  const nested = (getValue(data, 'data', 'result', 'order') as PaymentKitaResponse | undefined) || data
  const id = String(getValue(nested, 'id', 'order_id', 'trx_id', 'transaction_id', 'ref_id') || input.reference)
  const checkoutUrl = String(getValue(nested, 'pay_url', 'payment_url', 'checkout_url', 'url', 'link') || '')
  if (!checkoutUrl) throw new Error('PaymentKita tidak mengembalikan URL pembayaran.')
  return {
    id,
    reference: String(getValue(nested, 'ref_id', 'reference') || input.reference),
    status: normalizeStatus(getValue(nested, 'status', 'payment_status', 'state')),
    base_amount: Number(getValue(nested, 'nominal', 'amount', 'base_amount') || input.amount),
    pay_amount: Number(getValue(nested, 'pay_amount', 'total', 'amount', 'nominal') || input.amount),
    qris: typeof getValue(nested, 'qris', 'qr_string') === 'string' ? String(getValue(nested, 'qris', 'qr_string')) : undefined,
    checkout_url: checkoutUrl,
    expires_at: typeof getValue(nested, 'expired_at', 'expires_at') === 'string' ? String(getValue(nested, 'expired_at', 'expires_at')) : undefined,
  }
}

async function parseResponse(response: Response) {
  const data = (await response.json().catch(() => ({}))) as PaymentKitaResponse
  const success = response.ok && getValue(data, 'success', 'ok', 'status') !== false
  if (!success) {
    const message = String(getValue(data, 'message', 'error', 'msg') || `PaymentKita menolak request (HTTP ${response.status}).`)
    throw new Error(message)
  }
  return data
}

function requireCredentials() {
  if (!PAYMENTKITA_MERCHANT_ID || !PAYMENTKITA_SECRET_KEY) throw new Error('Kredensial PaymentKita belum dikonfigurasi.')
}

export async function createPayKitaOrder(input: {
  reference: string
  name: string
  email: string
  whatsapp: string
  amount: number
  quantity: number
  paymentMethod: PaymentMethodCode
}): Promise<PayKitaOrder> {
  requireCredentials()
  const appUrl = getAppUrl()
  const params = new URLSearchParams({
    merchant: PAYMENTKITA_MERCHANT_ID!,
    secret: PAYMENTKITA_SECRET_KEY!,
    ref_id: input.reference,
    nominal: String(input.amount),
    metode: input.paymentMethod,
  })

  let response: Response
  try {
    response = await fetch(`${PAYMENTKITA_BASE_URL}/v1/order?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new Error('Layanan PaymentKita tidak dapat dihubungi. Coba lagi beberapa saat.')
  }

  const order = normalizeOrder(await parseResponse(response), input)
  return { ...order, checkout_url: order.checkout_url || `${appUrl}/payment/${encodeURIComponent(order.id)}` }
}

export async function getPayKitaOrder(id: string): Promise<PayKitaOrder> {
  requireCredentials()
  const params = new URLSearchParams({ merchant: PAYMENTKITA_MERCHANT_ID!, secret: PAYMENTKITA_SECRET_KEY!, ref_id: id })
  const response = await fetch(`${PAYMENTKITA_BASE_URL}/v1/status?${params.toString()}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  return normalizeOrder(await parseResponse(response), { reference: id, amount: 0 })
}
