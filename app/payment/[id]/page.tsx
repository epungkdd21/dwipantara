'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, Check, Clock3, Copy, LoaderCircle, RefreshCw, X } from 'lucide-react'

type Order = {
  id: string
  status: string
  pay_amount?: number
  payment_method?: string
  payment_method_label?: string
  qris?: string
  qr_image?: string
  virtual_account?: string
  account_number?: string
  payment_code?: string
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
      setOrder(previous => ({
        ...previous,
        ...data,
        status: normalizeStatus(data.status),
        payment_method: data.payment_method || previous?.payment_method,
        payment_method_label: data.payment_method_label || previous?.payment_method_label,
        qris: data.qris || previous?.qris,
        qr_image: data.qr_image || previous?.qr_image,
        virtual_account: data.virtual_account || previous?.virtual_account,
        account_number: data.account_number || previous?.account_number,
        payment_code: data.payment_code || previous?.payment_code,
        checkout_url: data.checkout_url || previous?.checkout_url,
        pay_amount: data.pay_amount || previous?.pay_amount,
      }))
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
      const paymentMethod = query.get('payment_method') || undefined
      const paymentMethodLabel = query.get('payment_method_label') || undefined
      const virtualAccount = query.get('virtual_account') || query.get('account_number') || undefined
      const paymentCode = query.get('payment_code') || undefined
      const amount = query.get('amount')
      if (qris || qrImage || checkoutUrl || virtualAccount || paymentCode) {
        setOrder({
          id,
          status: 'pending',
          payment_method: paymentMethod,
          payment_method_label: paymentMethodLabel,
          qris,
          qr_image: qrImage,
          virtual_account: virtualAccount,
          account_number: virtualAccount,
          payment_code: paymentCode,
          checkout_url: checkoutUrl,
          pay_amount: amount ? Number(amount) : undefined,
        })
      }
      void loadOrder(id)
    })
  }, [params])

  useEffect(() => {
    if (order?.qr_image || !order?.qris) {
      setQr('')
      return
    }
    QRCode.toDataURL(order.qris, {
      width: 320,
      margin: 2,
      color: { dark: '#211007', light: '#fff8e8' },
    }).then(setQr).catch(() => setQr(''))
  }, [order?.qris, order?.qr_image])

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
    return 'Selesaikan pembayaran'
  }, [isClosed, isPaid])

  const paymentMethod = order?.payment_method_label || order?.payment_method
  const accountValue = order?.virtual_account || order?.account_number || order?.payment_code
  const isVirtualAccount = Boolean(order?.virtual_account || order?.account_number)
  const isPaymentCode = Boolean(order?.payment_code && !isVirtualAccount)
  const isQrPayment = Boolean(order?.qris || order?.qr_image)
  const isEwallet = ['DANA', 'OVO', 'GOPAY', 'SHOPEEPAY', 'DANA_REALTIME', 'OVO_REALTIME', 'GOPAY_REALTIME', 'SHOPEEPAY_REALTIME'].includes(order?.payment_method || '')

  async function copyPaymentValue() {
    if (!accountValue) return
    await navigator.clipboard.writeText(accountValue)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

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
            <p className="mt-4 leading-7 text-muted-foreground">Selesaikan pembayaran dengan instruksi resmi dari PaymentKita. Status akan diperbarui otomatis.</p>
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
            {isPaid ? <Check className="mx-auto mt-12 rounded-full bg-accent p-4 text-primary" size={88} /> : isClosed ? <X className="mx-auto mt-12 rounded-full bg-destructive p-4 text-primary-foreground" size={88} /> : order?.qr_image && isQrPayment ? <img src={order.qr_image} alt="QR pembayaran PaymentKita" className="mx-auto w-full max-w-[320px] rounded-2xl border-8 border-white shadow-lg" /> : qr && isQrPayment ? <img src={qr} alt="QR pembayaran PaymentKita" className="mx-auto w-full max-w-[320px] rounded-2xl border-8 border-white shadow-lg" /> : isVirtualAccount || isPaymentCode || order?.checkout_url ? <div className="flex min-h-40 items-center justify-center rounded-2xl border border-border bg-card px-5 text-center text-sm leading-6 text-muted-foreground">Ikuti instruksi pembayaran di bawah ini.</div> : <LoaderCircle className="mx-auto mt-24 animate-spin text-accent" size={56} />}
            <p className="mt-7 text-sm text-muted-foreground">Total pembayaran</p>
            <p className="mt-1 font-serif text-3xl font-bold">{formatRupiah(order?.pay_amount)}</p>
            {paymentMethod && !isPaid && !isClosed && <p className="mt-3 text-sm font-semibold text-foreground">Metode: {paymentMethod}</p>}
            {isVirtualAccount && accountValue && !isPaid && !isClosed && <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-left"><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Nomor virtual account</p><p className="mt-2 break-all font-mono text-xl font-bold tracking-wide">{accountValue}</p><button onClick={copyPaymentValue} className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold transition hover:border-accent hover:text-accent"><Copy size={14} /> {copied ? 'Tersalin' : 'Salin nomor'}</button></div>}
            {isPaymentCode && accountValue && !isPaid && !isClosed && <div className="mt-5 rounded-2xl border border-border bg-card p-4 text-left"><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Kode pembayaran</p><p className="mt-2 break-all font-mono text-xl font-bold tracking-wide">{accountValue}</p><button onClick={copyPaymentValue} className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold transition hover:border-accent hover:text-accent"><Copy size={14} /> {copied ? 'Tersalin' : 'Salin kode'}</button></div>}
            {!isPaid && !isClosed && isQrPayment && <p className="mt-4 text-sm leading-6 text-muted-foreground">Buka aplikasi pembayaran pilihanmu, lalu scan QR ini.</p>}
            {!isPaid && !isClosed && !isQrPayment && !isVirtualAccount && !isPaymentCode && <p className="mt-4 text-sm leading-6 text-muted-foreground">Lanjutkan pembayaran melalui halaman resmi PaymentKita.</p>}
            {order?.checkout_url && !isPaid && !isClosed && <a href={order.checkout_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">{isEwallet ? 'Lanjutkan ke e-wallet' : 'Buka halaman pembayaran'}</a>}
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
