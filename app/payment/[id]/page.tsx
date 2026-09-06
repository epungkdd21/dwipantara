'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, Check, Clock3, Copy, LoaderCircle, RefreshCw, X } from 'lucide-react'

type Order = {
  id: string
  status: string
  pay_amount?: number
  qris?: string
  qr_image?: string
  checkout_url?: string
  expires_at?: string
  tickets?: Array<{ ticket_code: string; ticket_number: number; attendee_name: string; payment_status: string }>
}

const FINAL_STATUSES = ['paid', 'success', 'expired', 'cancelled', 'failed']

function normalizeStatus(status?: string) {
  return status?.toLowerCase() || 'pending'
}

function formatRupiah(amount?: number) {
  return amount ? `Rp${amount.toLocaleString('id-ID')}` : '—'
}

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  async function loadOrder(id: string) {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Order tidak ditemukan.')
      setOrder({ ...data, status: normalizeStatus(data.status) })
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status pembayaran tidak tersedia.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    params.then(({ id }) => {
      setOrderId(id)
      const query = new URLSearchParams(window.location.search)
      const qris = query.get('qris') || undefined
      const qrImage = query.get('qr_image') || undefined
      const checkoutUrl = query.get('checkout_url') || undefined
      const amount = query.get('amount')
      if (qris || qrImage || checkoutUrl) {
          setOrder({
          id,
          status: 'pending',
          qris,
          qr_image: qrImage,
          checkout_url: checkoutUrl,
          pay_amount: amount ? Number(amount) : undefined,
        })
      }
      void loadOrder(id)
    })
  }, [params])

  useEffect(() => {
    const value = order?.qris || order?.checkout_url
    if (order?.qr_image) {
      setQr('')
      return
    }
    if (!value) {
      setQr('')
      return
    }
    QRCode.toDataURL(value, {
      width: 320,
      margin: 2,
      color: { dark: '#211007', light: '#fff8e8' },
    }).then(setQr).catch(() => setQr(''))
  }, [order?.qris, order?.checkout_url])

  useEffect(() => {
    if (!orderId || !order || FINAL_STATUSES.includes(order.status)) return
    const timer = window.setInterval(() => void loadOrder(orderId), 5000)
    return () => window.clearInterval(timer)
  }, [orderId, order?.status])

  const isPaid = order?.status === 'paid' || order?.status === 'success'
  const isClosed = order && ['expired', 'cancelled', 'failed'].includes(order.status)

  useEffect(() => {
    const firstTicket = order?.tickets?.[0]?.ticket_code
    if (!isPaid || !firstTicket || redirecting) return
    setRedirecting(true)
    const timer = window.setTimeout(() => {
      window.location.href = `/tickets/${encodeURIComponent(order.id)}`
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [isPaid, order?.tickets, redirecting])
  const statusLabel = useMemo(() => {
    if (isPaid) return 'Pembayaran berhasil'
    if (isClosed) return 'Pembayaran tidak dapat dilanjutkan'
    return 'Scan untuk membayar'
  }, [isClosed, isPaid])

  async function copyOrderId() {
    if (!orderId) return
    await navigator.clipboard.writeText(orderId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground md:py-12">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-accent">
          <ArrowLeft size={17} /> Kembali ke DWIPANTARA
        </a>
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_.85fr] md:items-start">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-xl md:p-9">
            <p className="eyebrow">Pembayaran tiket</p>
            <h1 className="mt-3 font-serif text-4xl font-bold text-balance md:text-5xl">{statusLabel}</h1>
            <p className="mt-4 leading-7 text-muted-foreground">Gunakan QR di bawah ini untuk menyelesaikan pembayaran tiket festival. Status akan diperbarui otomatis.</p>
            <div className="mt-8 flex items-center justify-between border-y border-border py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">ID Order</p>
                <p className="mt-1 break-all font-mono text-sm">{orderId || 'Memuat...'}</p>
              </div>
              <button onClick={copyOrderId} className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold transition hover:border-accent hover:text-accent" aria-label="Salin ID order">
                <Copy size={14} /> {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <Clock3 size={17} className="text-accent" />
              <span>Status: <strong className="text-foreground">{order?.status || 'MEMUAT'}</strong></span>
              <button onClick={() => orderId && void loadOrder(orderId)} disabled={refreshing} className="ml-auto inline-flex items-center gap-2 font-bold text-accent disabled:opacity-50">
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            {error && <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
          </section>

          <section className="rounded-3xl border border-border bg-secondary p-6 text-center shadow-xl md:p-8">
            {isPaid ? <Check className="mx-auto mt-12 rounded-full bg-accent p-4 text-primary" size={88} /> : isClosed ? <X className="mx-auto mt-12 rounded-full bg-destructive p-4 text-primary-foreground" size={88} /> : order?.qr_image ? <img src={order.qr_image} alt="QR pembayaran PayKita" className="mx-auto w-full max-w-[320px] rounded-2xl border-8 border-white shadow-lg" /> : qr ? <img src={qr} alt="QR pembayaran PayKita" className="mx-auto w-full max-w-[320px] rounded-2xl border-8 border-white shadow-lg" /> : <LoaderCircle className="mx-auto mt-24 animate-spin text-accent" size={56} />}
            <p className="mt-7 text-sm text-muted-foreground">Total pembayaran</p>
            <p className="mt-1 font-serif text-3xl font-bold">{formatRupiah(order?.pay_amount)}</p>
            {!isPaid && !isClosed && <p className="mt-4 text-sm leading-6 text-muted-foreground">Buka aplikasi pembayaran pilihanmu, lalu scan QR ini.</p>}
            {order?.checkout_url && !isPaid && !isClosed && <a href={order.checkout_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">Buka halaman pembayaran</a>}
            {isPaid && <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-left">
              <p className="font-bold text-foreground">Tiket siap digunakan</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Kami mengarahkanmu ke halaman tiket. Kamu juga bisa membukanya sekarang untuk mencetak atau menyimpan PDF.</p>
              <div className="mt-4 grid gap-2">
                <a href={`/tickets/${encodeURIComponent(order.id)}`} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">Buka semua tiket & cetak</a>
              </div>
              {redirecting && <p className="mt-3 text-xs text-muted-foreground">Membuka semua tiket...</p>}
            </div>}
          </section>
        </div>
      </div>
    </main>
  )
}

export const dynamic = 'force-dynamic'
