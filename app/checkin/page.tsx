'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle2, Gift, ScanLine, ShieldCheck, Ticket, XCircle } from 'lucide-react'

type TicketResult = { ticket_code?: string; attendee_name?: string; order_id?: string; souvenir_status?: string }

export default function CheckinPage() {
  const [code, setCode] = useState('')
  const [ticket, setTicket] = useState<TicketResult | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [souvenirLoading, setSouvenirLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter === null) return
    setLoading(true); setMessage(null); setTicket(null)
    try {
      const response = await fetch('/api/checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code.trim() }) })
      const data = await response.json()
      if (!response.ok) setMessage({ ok: false, text: data.error || 'Tiket tidak valid' })
      else { setTicket(data.ticket); setMessage({ ok: true, text: 'Check-in berhasil. Pengunjung tercatat hadir.' }); setCode('') }
    } catch { setMessage({ ok: false, text: 'Tidak dapat terhubung ke server.' }) } finally { setLoading(false) }
  }

  async function collectSouvenir() {
    if (!ticket?.ticket_code) return
    setSouvenirLoading(true)
    try {
      const response = await fetch('/api/souvenir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: ticket.ticket_code }) })
      const data = await response.json()
      if (!response.ok) setMessage({ ok: false, text: data.error || 'Souvenir belum dapat diberikan.' })
      else { setTicket({ ...ticket, souvenir_status: data.ticket.souvenir_status }); setMessage({ ok: true, text: 'Souvenir berhasil dicatat sebagai dibagikan.' }) }
    } catch { setMessage({ ok: false, text: 'Tidak dapat mencatat souvenir.' }) } finally { setSouvenirLoading(false) }
  }

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground"><div className="mx-auto max-w-2xl"><header className="flex items-center justify-between"><div><p className="eyebrow">DWIPANTARA 2026</p><h1 className="mt-2 font-serif text-4xl font-bold">Gate check-in.</h1></div><div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><ScanLine /></div></header><section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/20 text-accent-foreground"><ShieldCheck /></div><div><h2 className="font-serif text-2xl font-bold">Validasi tiket masuk</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Masukkan kode dari QR tiket. Check-in hanya dapat dilakukan satu kali dan menjadi syarat pembagian souvenir.</p></div></div><form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="ticket-code">Kode tiket</label><input id="ticket-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="DW26-..." autoComplete="off" className="min-h-14 flex-1 rounded-2xl border border-border bg-background px-4 font-mono text-sm uppercase outline-none focus:border-primary" /><button disabled={loading || code.trim().length < 8} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Ticket size={18} />{loading ? 'Memeriksa...' : 'Check-in'}</button></form>{message && <div className={`mt-6 flex items-start gap-3 rounded-2xl p-4 ${message.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{message.ok ? <CheckCircle2 className="mt-0.5 shrink-0" /> : <XCircle className="mt-0.5 shrink-0" />}<p className="font-bold">{message.text}</p></div>}{ticket && <div className="mt-4 rounded-2xl border border-border bg-background p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Pengunjung hadir</p><h3 className="mt-1 font-serif text-2xl font-bold">{ticket.attendee_name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{ticket.ticket_code}</p></div><CheckCircle2 className="text-primary" /></div><button onClick={collectSouvenir} disabled={souvenirLoading || ticket.souvenir_status === 'collected'} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-bold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"><Gift size={18} />{ticket.souvenir_status === 'collected' ? 'Souvenir sudah dibagikan' : souvenirLoading ? 'Mencatat...' : 'Bagikan souvenir'}</button></div>}</section></div></main>
}
