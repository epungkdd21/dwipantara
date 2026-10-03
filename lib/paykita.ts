import { getAppUrl } from '@/lib/app-url'

const DIGIKITA_BASE_URL = (process.env.PAYKITA_BASE_URL || 'https://pay.digikita.id/api').replace(/\/$/, '')
const DIGIKITA_API_KEY = process.env.PAYKITA_API_KEY

export const PAYMENT_METHODS = [
  { code: 'QRISREALTIME', label: 'QRIS Realtime', settlement: 'H+0 (realtime)' },
] as const

export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number]['code']

const PAYMENT_METHOD_CODES = new Set<string>(PAYMENT_METHODS.map(method => method.code))

export function isPaymentMethodCode(value: unknown): value is PaymentMethodCode {
  return typeof value === 'string' && PAYMENT_METHOD_CODES.has(value)
}

type DigiKitaResponse = Record<string, unknown>

export type PayKitaOrder = {
  id: string
  reference?: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  base_amount: number
  pay_amount: number
  payment_method?: PaymentMethodCode
  payment_method_label?: string
  qris?: string
  checkout_url: string
  expires_at?: string
  fee_amount?: number
  unique_code?: number
}

function getValue(data: DigiKitaResponse, ...keys: string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) return data[key]
  }
  return undefined
}

function normalizeStatus(value: unknown): PayKitaOrder['status'] {
  const status = String(value || 'pending').toLowerCase()
  if (status === 'paid') return 'paid'
  if (status === 'expired') return 'expired'
  if (status === 'cancelled') return 'cancelled'
  return 'pending'
}

function normalizeOrder(data: DigiKitaResponse, fallback: { reference: string; amount: number }): PayKitaOrder {
  const order = (getValue(data, 'data') as DigiKitaResponse | undefined) || data
  const id = String(getValue(order, 'id') || fallback.reference)
  const status = normalizeStatus(getValue(order, 'status'))
  const baseAmount = Number(getValue(order, 'base_amount') ?? fallback.amount)
  const payAmount = Number(getValue(order, 'pay_amount') ?? baseAmount)
  const checkoutUrl = String(getValue(order, 'checkout_url') || `${getAppUrl()}/payment/${encodeURIComponent(id)}`)
  if (!Number.isSafeInteger(baseAmount) || baseAmount <= 0 || !Number.isSafeInteger(payAmount) || payAmount <= 0) {
    throw new Error('DigiKita mengembalikan nominal pembayaran yang tidak valid.')
  }
  return {
    id,
    reference: String(getValue(order, 'reference') || fallback.reference),
    status,
    base_amount: baseAmount,
    pay_amount: payAmount,
    payment_method: 'QRISREALTIME',
    payment_method_label: 'QRIS Realtime',
    qris: typeof getValue(order, 'qris') === 'string' ? String(getValue(order, 'qris')) : undefined,
    checkout_url: checkoutUrl,
    expires_at: typeof getValue(order, 'expires_at') === 'string' ? String(getValue(order, 'expires_at')) : undefined,
    fee_amount: Number(getValue(order, 'fee_amount') || 0),
    unique_code: Number(getValue(order, 'unique_code') || 0),
  }
}

function requireCredentials() {
  if (!DIGIKITA_API_KEY) throw new Error('API key DigiKita belum dikonfigurasi.')
}

async function requestDigiKita(path: string, init: RequestInit = {}) {
  const response = await fetch(`${DIGIKITA_BASE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-api-key': DIGIKITA_API_KEY!, ...(init.headers || {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  const payload = (await response.json().catch(() => ({}))) as DigiKitaResponse
  if (!response.ok || payload.ok === false) {
    const error = (payload.error || {}) as DigiKitaResponse
    throw new Error(String(error.message || `DigiKita menolak request (HTTP ${response.status}).`))
  }
  return payload
}

export async function createPayKitaOrder(input: {
  reference: string
  name: string
  email: string
  whatsapp: string
  amount: number
  quantity: number
  paymentMethod: PaymentMethodCode
  ewalletPhone?: string
}): Promise<PayKitaOrder> {
  requireCredentials()
  const payload = await requestDigiKita('/orders', {
    method: 'POST',
    body: JSON.stringify({
      base_amount: Math.round(input.amount),
      reference: input.reference,
      redirect_url: `${getAppUrl()}/pembayaran-selesai`,
      webhook_url: `${getAppUrl()}/api/webhook/paykita`,
      ttl_seconds: 600,
    }),
  })
  return normalizeOrder(payload, { reference: input.reference, amount: Math.round(input.amount) })
}

export async function getPayKitaOrder(id: string): Promise<PayKitaOrder> {
  requireCredentials()
  const payload = await requestDigiKita(`/orders/${encodeURIComponent(id)}`)
  return normalizeOrder(payload, { reference: id, amount: 1 })
}
