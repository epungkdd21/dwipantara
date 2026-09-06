import QRCode from 'qrcode'
import { sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { TicketActions } from '@/components/ticket-actions'

type Ticket = {
  ticket_code: string
  order_id: string
  attendee_name: string
  attendee_email: string
  ticket_number: number
  payment_status: string
  checkin_status: string
  checked_in_at: string | null
}

export default async function TicketsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const result = await db.execute(sql`
    SELECT ticket_code, order_id, attendee_name, attendee_email, ticket_number,
      payment_status, checkin_status, checked_in_at
    FROM tickets
    WHERE order_id = ${orderId}
    ORDER BY ticket_number ASC
  `)
  const tickets = result.rows as unknown as Ticket[]
  if (!tickets.length) notFound()

  const origin = process.env.APP_URL || 'https://dwipantara.vercel.app'
  const qrCodes = await Promise.all(tickets.map(async (ticket) => ({
    ...ticket,
    qr: await QRCode.toDataURL(`${origin}/ticket/${encodeURIComponent(ticket.ticket_code)}`, {
      margin: 1,
      width: 300,
      color: { dark: '#211007', light: '#fff8e9' },
    }),
  })))

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <a href="/" className="eyebrow transition hover:text-foreground">← Dwipantara</a>
          <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tickets.length} tiket</span>
        </div>

        <header className="mb-8 print:mb-5">
          <p className="eyebrow">Tiket masuk</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-balance sm:text-6xl">Satu order, semua tiket<span className="text-accent">.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Simpan halaman ini sebagai PDF atau cetak sekaligus. Setiap tiket memiliki QR unik untuk check-in.</p>
        </header>

        <div className="grid gap-6">
          {qrCodes.map((ticket) => {
            const paid = ticket.payment_status === 'paid'
            const checkedIn = ticket.checkin_status === 'checked_in'
            return (
              <article key={ticket.ticket_code} className="ticket-shell overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/20 print:break-inside-avoid print:shadow-none">
                <div className="grid lg:grid-cols-[1.15fr_.85fr]">
                  <div className="relative overflow-hidden border-b border-border p-6 sm:p-10 lg:border-b-0 lg:border-r">
                    <div className="relative flex h-full flex-col justify-between gap-12">
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <p className="eyebrow">Dwipantara 2026</p>
                          <span className="font-mono text-xs text-accent">PASS / {String(ticket.ticket_number).padStart(2, '0')}</span>
                        </div>
                        <h2 className="mt-10 max-w-lg font-serif text-5xl font-bold leading-[0.95] tracking-tight text-balance sm:text-7xl">Tiket masuk<span className="text-accent">.</span></h2>
                        <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">Tunjukkan QR code ini saat tiba di lokasi acara.</p>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div><p className="eyebrow">Pemegang tiket</p><p className="mt-2 text-lg font-semibold">{ticket.attendee_name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{ticket.attendee_email}</p></div>
                        <div><p className="eyebrow">Order ID</p><p className="mt-2 break-all font-mono text-sm font-semibold">{ticket.order_id}</p><p className="mt-1 text-sm text-muted-foreground">Rp15.000 · 1 akses</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-secondary/50 p-6 sm:p-10">
                    <div className="w-full max-w-xs rounded-3xl bg-[#fff8e9] p-5 shadow-xl"><img src={ticket.qr} alt={`QR code tiket ${ticket.ticket_code}`} className="mx-auto aspect-square w-full rounded-xl" /></div>
                    <p className="mt-5 font-mono text-sm font-bold tracking-[0.22em] text-accent">{ticket.ticket_code}</p>
                    <div className={`mt-5 w-full max-w-xs rounded-2xl border px-4 py-3 text-center text-sm font-bold ${checkedIn ? 'border-accent/40 bg-accent/10 text-accent' : paid ? 'border-primary/30 bg-primary/10 text-primary-foreground' : 'border-border bg-muted text-muted-foreground'}`}>
                      {checkedIn ? 'Sudah check-in' : paid ? 'Tiket valid — siap digunakan' : 'Tiket belum aktif'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-dashed border-border px-6 py-5 sm:px-10"><p className="max-w-md text-xs leading-5 text-muted-foreground">QR ini unik dan hanya dapat digunakan satu kali untuk check-in.</p><div className="hidden size-8 shrink-0 rounded-full border border-border sm:block" /></div>
              </article>
            )
          })}
        </div>
        <TicketActions />
      </div>
    </main>
  )
}

export const dynamic = 'force-dynamic'
