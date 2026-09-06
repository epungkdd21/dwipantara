export const PAYKITA_BASE_URL = (process.env.PAYKITA_BASE_URL || 'https://pay.digikita.id/api').replace(/\/$/, '')
export const TICKET_PRICE = 10000

// Response terstruktur dari PayKita API sesuai dokumentasi
type PayKitaSuccessResponse = {
  ok: true
  data: {
    id: string
    reference?: string
    status: 'pending' | 'paid' | 'expired' | 'cancelled'
    base_amount: number
    fee_amount?: number
    unique_code?: number
    pay_amount: number
    qris?: string
    checkout_url: string
    created_at?: string
    expires_at?: string
    paid_at?: string | null
  }
}

type PayKitaErrorResponse = {
  ok: false
  error: {
    code: string
    message: string
  }
}

type PayKitaResponse = PayKitaSuccessResponse | PayKitaErrorResponse

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

export async function createPayKitaOrder(input: {
  reference: string
  name: string
  email: string
  whatsapp: string
  amount: number
  quantity: number
}): Promise<PayKitaOrder> {
  if (!process.env.PAYKITA_API_KEY) throw new Error('PAYKITA_API_KEY belum dikonfigurasi.')

  const configuredAppUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!configuredAppUrl) throw new Error('APP_URL harus dikonfigurasi dengan URL HTTPS publik.')

  let appUrl: string
  try {
    const parsedAppUrl = new URL(configuredAppUrl)
    if (parsedAppUrl.protocol !== 'https:') throw new Error('APP_URL harus menggunakan HTTPS.')
    appUrl = parsedAppUrl.toString().replace(/\/$/, '')
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'APP_URL tidak valid.')
  }

  const response = await fetch(`${PAYKITA_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.PAYKITA_API_KEY,
    },
    body: JSON.stringify({
      base_amount: input.amount,
      reference: input.reference,
      redirect_url: `${appUrl}/payment/${encodeURIComponent(input.reference)}`,
      webhook_url: `${appUrl}/api/webhook/paykita`,
      ttl_seconds: 900, // 15 menit
    }),
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({ ok: false }))) as PayKitaResponse

  if (!data.ok || !('data' in data)) {
    const error = data as PayKitaErrorResponse
    throw new Error(error.error?.message || 'PayKita tidak dapat membuat order')
  }

  const orderData = data.data
  return {
    id: orderData.id,
    reference: orderData.reference || input.reference,
    status: orderData.status,
    base_amount: orderData.base_amount,
    pay_amount: orderData.pay_amount,
    qris: orderData.qris,
    checkout_url: orderData.checkout_url,
    expires_at: orderData.expires_at,
  }
}

export async function getPayKitaOrder(id: string): Promise<PayKitaOrder> {
  const response = await fetch(`${PAYKITA_BASE_URL}/orders/${encodeURIComponent(id)}`, {
    headers: {
      'x-api-key': process.env.PAYKITA_API_KEY || '',
    },
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({ ok: false }))) as PayKitaResponse

  if (!data.ok || !('data' in data)) {
    const error = data as PayKitaErrorResponse
    throw new Error(error.error?.message || 'Order tidak ditemukan')
  }

  const orderData = data.data
  return {
    id: orderData.id,
    reference: orderData.reference,
    status: orderData.status,
    base_amount: orderData.base_amount,
    pay_amount: orderData.pay_amount,
    qris: orderData.qris,
    checkout_url: orderData.checkout_url,
    expires_at: orderData.expires_at,
  }
}
