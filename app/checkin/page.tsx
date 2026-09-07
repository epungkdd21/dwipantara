'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock3, Gift, RefreshCw, ScanLine, ShieldCheck, Ticket, Users, XCircle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

type TicketResult = { ticket_code?: string; attendee_name?: string; attendee_email?: string; attendee_whatsapp?: string; order_id?: string; ticket_number?: number; quantity?: number; payment_status?: string; checked_in_at?: string; souvenir_status?: string }
type CheckinLog = TicketResult & { checkin_status?: string }

export default function CheckinPage() {
  const [code, setCode] = useState('')
  const [ticket, setTicket] = useState<TicketResult | null>(null)
  const [logs, setLogs] = useState<CheckinLog[]>([])
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [souvenirLoading, setSouvenirLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  async function loadLogs() {
    setRefreshing(true)
    try {
      const response = await fetch('/api/checkin', { cache: 'no-store' })
      const data = await response.json()
      if (response.ok) { setTotal(data.total ?? 0); setLogs(data.logs ?? []) }
    } finally { setRefreshing(false) }
  }

  useEffect(() => { void loadLogs() }, [])

  useEffect(() => () => { if (scannerRef.current?.isScanning) void scannerRef.current.stop().catch(() => undefined) }, [])

  async function stopScanner() {
    if (scannerRef.current?.isScanning) await scannerRef.current.stop().catch(() => undefined)
    scannerRef.current = null
    setScannerOpen(false)
  }

  async function startScanner() {
    setMessage(null); setScannerOpen(true)
    const scanner = new Html5Qrcode('checkin-reader')
    scannerRef.current = scanner
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, async decodedText => {
        setCode(decodedText)
        await stopScanner()
        setTimeout(() => (document.getElementById('checkin-form') as HTMLFormElement | null)?.requestSubmit(), 0)
      }, () => undefined)
    } catch { setMessage({ ok: false, text: 'Kamera tidak dapat dibuka. Gunakan input manual.' }); await stopScanner() }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true); setMessage(null); setTicket(null)
    try {
      const response = await fetch('/api/checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code.trim() }) })
      const data = await response.json()
      if (!response.ok) setMessage({ ok: false, text: data.error || 'Tiket tidak valid' })
      else { setTicket(data.ticket); setMessage({ ok: true, text: 'Tiket terverifikasi. Pengunjung tercatat hadir.' }); setCode(''); await loadLogs() }
    } catch { setMessage({ ok: false, text: 'Tidak dapat terhubung ke server.' }) } finally { setLoading(false) }
  }

  async function collectSouvenir() {
    if (!ticket?.ticket_code) return
    setSouvenirLoading(true)
    try {
      const response = await fetch('/api/souvenir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: ticket.ticket_code }) })
      const data = await response.json()
      if (!response.ok) setMessage({ ok: false, text: data.error || 'Souvenir belum dapat diberikan.' })
      else { setTicket({ ...ticket, souvenir_status: data.ticket.souvenir_status }); setMessage({ ok: true, text: 'Souvenir berhasil dicatat sebagai dibagikan.' }); await loadLogs() }
    } catch { setMessage({ ok: false, text: 'Tidak dapat mencatat souvenir.' }) } finally { setSouvenirLoading(false) }
  }

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">DWIPANTARA 2026 · OPERATIONS</p><h1 className="mt-2 font-serif text-4xl font-bold">Check-in dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Verifikasi tiket dan catat pengunjung yang hadir.</p></div><div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><ScanLine /></div></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-3"><article className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center gap-3 text-accent"><Users size={20} /><span className="text-sm font-bold text-muted-foreground">Total pengunjung check-in</span></div><strong className="mt-4 block font-serif text-5xl">{total}</strong><p className="mt-2 text-sm text-muted-foreground">Tiket berhasil diverifikasi</p></article><article className="rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center gap-3 text-accent"><ShieldCheck size={20} /><span className="text-sm font-bold text-muted-foreground">Status gate</span></div><strong className="mt-4 block font-serif text-2xl">Siap menerima</strong><p className="mt-2 text-sm text-muted-foreground">Validasi tiket aktif</p></article><button onClick={() => void loadLogs()} className="rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-accent"><div className="flex items-center gap-3 text-accent"><RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} /><span className="text-sm font-bold text-muted-foreground">Data terbaru</span></div><strong className="mt-4 block font-serif text-2xl">{refreshing ? 'Memuat…' : 'Perbarui log'}</strong><p className="mt-2 text-sm text-muted-foreground">Ambil data check-in terbaru</p></button></section>
    <div className="mt-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/20 text-accent-foreground"><ScanLine /></div><div><h2 className="font-serif text-2xl font-bold">Scan / validasi tiket</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Scan QR tiket dengan kamera atau masukkan kodenya secara manual.</p></div></div>{scannerOpen && <div className="mt-6 overflow-hidden rounded-2xl border border-accent/50 bg-black"><div id="checkin-reader" className="min-h-64" /><button onClick={() => void stopScanner()} className="m-3 rounded-full bg-white px-4 py-2 text-sm font-bold text-black">Tutup kamera</button></div>}<form id="checkin-form" onSubmit={submit} className="mt-8 grid gap-3"><label className="sr-only" htmlFor="ticket-code">Isi QR atau kode tiket</label><input id="ticket-code" value={code} onChange={event => setCode(event.target.value)} placeholder="Tempel hasil scan QR atau DW26-..." autoComplete="off" className="min-h-14 rounded-2xl border border-border bg-background px-4 font-mono text-sm outline-none focus:border-primary" /><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void startScanner()} disabled={scannerOpen} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border px-6 font-bold disabled:opacity-50"><ScanLine size={18} />Buka kamera</button><button disabled={loading || code.trim().length < 8} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Ticket size={18} />{loading ? 'Memeriksa…' : 'Verifikasi tiket'}</button></div></form>{message && <div className={`mt-6 flex items-start gap-3 rounded-2xl p-4 ${message.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{message.ok ? <CheckCircle2 className="mt-0.5 shrink-0" /> : <XCircle className="mt-0.5 shrink-0" />}<p className="font-bold">{message.text}</p></div>}{ticket && <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-5"><p className="eyebrow">Tiket terverifikasi</p><h3 className="mt-2 font-serif text-2xl font-bold">{ticket.attendee_name}</h3><div className="mt-4 grid gap-2 text-sm"><p><span className="text-muted-foreground">Order:</span> <strong>{ticket.order_id}</strong></p><p><span className="text-muted-foreground">Email:</span> {ticket.attendee_email}</p><p><span className="text-muted-foreground">Jumlah:</span> {ticket.quantity ?? 1} tiket</p><p><span className="text-muted-foreground">Diverifikasi:</span> {ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString('id-ID') : '-'}</p></div>{ticket.souvenir_status !== 'collected' && <button onClick={collectSouvenir} disabled={souvenirLoading} className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold"><Gift size={16} />{souvenirLoading ? 'Mencatat…' : 'Catat souvenir'}</button>}</div>}</section>
    <section className="rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8"><div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Aktivitas gate</p><h2 className="mt-2 font-serif text-2xl font-bold">Log pengunjung</h2></div><span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{logs.length} terbaru</span></div>{logs.length === 0 ? <div className="grid min-h-56 place-items-center text-center text-sm text-muted-foreground"><div><Clock3 className="mx-auto mb-3" /><p>Belum ada pengunjung check-in.</p></div></div> : <div className="mt-6 divide-y divide-border">{logs.map(log => <article key={log.ticket_code} className="py-4 first:pt-0"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{log.attendee_name}</h3><p className="mt-1 font-mono text-xs text-accent">{log.ticket_code}</p><p className="mt-1 text-xs text-muted-foreground">Order {log.order_id} · {log.quantity ?? 1} tiket</p></div><time className="whitespace-nowrap text-right text-xs text-muted-foreground">{log.checked_in_at ? new Date(log.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</time></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">Terverifikasi</span><span className="rounded-full bg-muted px-3 py-1">{log.attendee_email}</span></div></article>)}</div>}</section></div></div></main>
}
