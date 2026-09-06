import QRCode from 'qrcode'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { TicketActions } from '@/components/ticket-actions'

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const result = await db.execute(sql`SELECT ticket_code, order_id, attendee_name, attendee_email, ticket_number, payment_status, checkin_status, checked_in_at FROM tickets WHERE ticket_code = ${code} LIMIT 1`)
  const ticket = result.rows[0] as { ticket_code: string; order_id: string; attendee_name: string; attendee_email: string; ticket_number: number; payment_status: string; checkin_status: string; checked_in_at: string | null } | undefined
  if (!ticket) notFound()

  const origin = process.env.APP_URL || 'https://dwipantara.vercel.app'
  const qr = await QRCode.toDataURL(`${origin}/ticket/${encodeURIComponent(ticket.ticket_code)}`, { margin: 1, width: 360, color: { dark: '#211007', light: '#fff8e9' } })
  const paid = ticket.payment_status === 'paid'
  const checkedIn = ticket.checkin_status === 'checked_in'

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <a href="/" className="eyebrow transition hover:text-foreground">← Dwipantara</a>
          <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Digital pass</span>
        </div>

        <section className="ticket-shell overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/30">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative overflow-hidden border-b border-border p-6 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="absolute -right-16 -top-20 size-56 rounded-full border border-accent/20" />
              <div className="absolute -right-8 -top-12 size-40 rounded-full border border-accent/20" />
              <div className="relative flex h-full flex-col justify-between gap-14">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="eyebrow">Dwipantara 2026</p>
                    <span className="font-mono text-xs text-accent">PASS / {String(ticket.ticket_number).padStart(2, '0')}</span>
                  </div>
                  <h1 className="mt-10 max-w-lg font-serif text-5xl font-bold leading-[0.95] tracking-tight text-balance sm:text-7xl">Tiket masuk<span className="text-accent">.</span></h1>
                  <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">Simpan tiket ini dan tunjukkan QR code saat tiba di lokasi acara.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><p className="eyebrow">Pemegang tiket</p><p className="mt-2 text-lg font-semibold">{ticket.attendee_name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{ticket.attendee_email}</p></div>
                  <div><p className="eyebrow">Order ID</p><p className="mt-2 font-mono text-sm font-semibold">{ticket.order_id}</p><p className="mt-1 text-sm text-muted-foreground">Rp15.000 · 1 akses</p></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-secondary/50 p-6 sm:p-10">
              <div className="w-full max-w-xs rounded-3xl bg-[#fff8e9] p-5 shadow-xl">
                <img src={qr} alt={`QR code tiket ${ticket.ticket_code}`} className="mx-auto aspect-square w-full rounded-xl" />
              </div>
              <p className="mt-5 font-mono text-sm font-bold tracking-[0.22em] text-accent">{ticket.ticket_code}</p>
              <div className={`mt-5 w-full max-w-xs rounded-2xl border px-4 py-3 text-center text-sm font-bold ${checkedIn ? 'border-accent/40 bg-accent/10 text-accent' : paid ? 'border-primary/30 bg-primary/10 text-primary-foreground' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>
                {checkedIn ? `Sudah check-in${ticket.checked_in_at ? ` · ${new Date(ticket.checked_in_at).toLocaleString('id-ID')}` : ''}` : paid ? 'Tiket valid — siap digunakan' : 'Tiket belum aktif'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-dashed border-border px-6 py-5 sm:px-10">
            <p className="max-w-md text-xs leading-5 text-muted-foreground">QR ini bersifat unik dan hanya dapat digunakan satu kali untuk check-in.</p>
            <div className="hidden size-8 shrink-0 rounded-full border border-border sm:block" />
          </div>
        </section>
        <TicketActions />
      </div>
    </main>
  )
}
