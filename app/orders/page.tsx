'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Search, Ticket, UserRound } from 'lucide-react'

type PublicOrder = {
  ticket_code: string
  attendee_name: string
  ticket_number: number
  payment_status: string
  checkin_status: string
  created_at: string
}

const paymentLabel: Record<string, string> = {
  paid: 'Lunas',
  pending: 'Menunggu pembayaran',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
}

function statusClass(status: string) {
  if (status === 'paid') return 'border-accent/40 bg-accent/10 text-accent'
  if (status === 'expired' || status === 'cancelled') return 'border-destructive/40 bg-destructive/10 text-destructive'
  return 'border-border bg-muted text-muted-foreground'
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<PublicOrder[]>([])
  const [query, setQuery] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/public/orders')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Gagal memuat data order.')))
      .then((data: { orders?: PublicOrder[] }) => setOrders(data.orders ?? []))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Gagal memuat data order.'))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesQuery = !normalized || `${order.ticket_code} ${order.attendee_name}`.toLowerCase().includes(normalized)
      const matchesStatus = paymentStatus === 'all' || order.payment_status === paymentStatus
      return matchesQuery && matchesStatus
    })
  }, [orders, paymentStatus, query])

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft size={16} /> Kembali ke halaman utama
            </Link>
            <p className="eyebrow mt-8">DWIPANTARA 2026 · TIKET</p>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl font-bold leading-tight text-balance sm:text-5xl">Daftar order tiket</h1>
            <p className="mt-4 max-w-xl leading-6 text-muted-foreground">Periksa status order dan tiket acara secara terbuka. Data kontak pribadi tidak ditampilkan di halaman ini.</p>
          </div>
          <div className="jawa-frame px-5 py-4 text-right">
            <CalendarDays className="ml-auto text-accent" size={22} />
            <p className="mt-3 font-serif text-lg font-bold">Rabu, 21 Oktober 2026</p>
            <p className="mt-1 text-sm text-muted-foreground">Ba&apos;da Isya – 22.38 WIB</p>
          </div>
        </header>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-4" aria-label="Ringkasan daftar order">
          <div className="flex items-center gap-3 text-sm text-muted-foreground"><Ticket size={18} className="text-accent" /><span><strong className="text-foreground">{orders.length}</strong> tiket tercatat</span></div>
          <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
            <label className="flex min-w-64 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm sm:flex-none">
              <Search size={16} className="text-muted-foreground" />
              <span className="sr-only">Cari order atau nama</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode atau nama" className="min-w-0 flex-1 bg-transparent py-1 outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
              <span className="sr-only">Filter status pembayaran</span>
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="bg-transparent py-1 font-semibold outline-none">
                <option value="all">Semua status</option>
                <option value="paid">Lunas</option>
                <option value="pending">Menunggu pembayaran</option>
                <option value="expired">Kedaluwarsa</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-card" aria-live="polite">
          {loading && <p className="p-8 text-center text-muted-foreground">Memuat daftar order…</p>}
          {!loading && error && <p className="p-8 text-center text-destructive">{error}</p>}
          {!loading && !error && filteredOrders.length === 0 && <p className="p-8 text-center text-muted-foreground">Order tidak ditemukan.</p>}
          {!loading && !error && filteredOrders.length > 0 && <div className="divide-y divide-border">
            {filteredOrders.map((order) => <article key={order.ticket_code} className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-accent"><Ticket size={20} /></div><div><p className="font-mono text-sm font-bold tracking-wide text-accent">{order.ticket_code}</p><p className="mt-1 flex items-center gap-2 font-serif text-xl font-bold"><UserRound size={16} className="text-muted-foreground" />{order.attendee_name}</p><p className="mt-1 text-sm text-muted-foreground">Tiket #{String(order.ticket_number).padStart(2, '0')}</p></div></div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusClass(order.payment_status)}`}>{paymentLabel[order.payment_status] ?? order.payment_status}</span>{order.payment_status === 'paid' && <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent"><CheckCircle2 size={14} /> Tiket aktif</span>}</div>
            </article>)}
          </div>}
        </section>
        <p className="mt-6 text-center text-xs text-muted-foreground">Untuk bantuan order, hubungi panitia melalui kontak resmi DWIPANTARA.</p>
      </div>
    </main>
  )
}
