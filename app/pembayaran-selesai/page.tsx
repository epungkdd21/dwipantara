'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react'

const PENDING_ORDER_KEY = 'dwipantara:pending-payment-order'
const MAX_PENDING_ORDER_AGE = 24 * 60 * 60 * 1000

function validOrderId(value: string | null) {
  return value !== null && /^[a-zA-Z0-9_-]{1,100}$/.test(value)
}

export default function PaymentCompletePage() {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const returnedOrderId =
      query.get('id') || query.get('order_id') || query.get('orderId')
    let orderId = validOrderId(returnedOrderId) ? returnedOrderId : null

    if (!orderId) {
      try {
        const rawPendingOrder = localStorage.getItem(PENDING_ORDER_KEY)
        if (rawPendingOrder) {
          const pendingOrder: unknown = JSON.parse(rawPendingOrder)
          if (
            typeof pendingOrder === 'object' &&
            pendingOrder !== null &&
            'id' in pendingOrder &&
            'createdAt' in pendingOrder &&
            typeof pendingOrder.id === 'string' &&
            typeof pendingOrder.createdAt === 'number' &&
            Date.now() - pendingOrder.createdAt <= MAX_PENDING_ORDER_AGE &&
            validOrderId(pendingOrder.id)
          ) {
            orderId = pendingOrder.id
          }
        }
      } catch (error) {
        console.error(
          '[payment-return] Gagal membaca order pembayaran tersimpan:',
          error,
        )
      }
    }

    if (orderId) {
      try {
        localStorage.removeItem(PENDING_ORDER_KEY)
      } catch (error) {
        console.error(
          '[payment-return] Gagal menghapus order pembayaran tersimpan:',
          error,
        )
      }
      window.location.replace(`/payment/${encodeURIComponent(orderId)}`)
      return
    }

    setChecking(false)
  }, [])

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 text-center shadow-xl sm:p-10">
        {checking ? (
          <>
            <LoaderCircle className="mx-auto animate-spin text-accent" size={48} />
            <h1 className="mt-5 font-serif text-3xl font-bold">
              Memeriksa status pembayaran
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Anda akan diarahkan ke status order dan tiket setelah data order
              ditemukan.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto text-accent" size={48} />
            <h1 className="mt-5 font-serif text-3xl font-bold">
              Terima kasih telah melakukan pembayaran
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Kami belum menerima ID order dari halaman pembayaran. Periksa
              status tiket melalui daftar order, atau kembali ke halaman utama.
              Jika halaman pembayaran sebelumnya masih terbuka, statusnya akan
              diperbarui otomatis.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/orders"
                className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                Periksa status order
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold"
              >
                <ArrowLeft size={16} /> Kembali ke halaman utama
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
