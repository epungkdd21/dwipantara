'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, MapPin, Menu, Ticket, X } from 'lucide-react'
import { AmbientSound } from '@/components/ambient-sound'

const BG = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-dwipantara.jpg.jpeg-Ntxq1di3M4NzKDqHlG8cY4sITq3E5X.png'
const LOGO = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LOGO%20DW2-5LsgMBGIyV5mn970mhQ4iMGNCqWkHD.png'
const price = 10000

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', quantity: '1' })
  const [content, setContent] = useState<{ eventName?: string; heroTitle?: string; heroTagline?: string; heroDescription?: string; aboutTitle?: string; aboutDescription?: string; ticketPrice?: number; date?: string; time?: string; venue?: string; address?: string; instagram?: string }>({})
  useEffect(() => { fetch('/api/content').then(response => response.ok ? response.json() : null).then(data => data && setContent(data)).catch(() => undefined) }, [])
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('is-visible') }), { threshold: 0.14 })
    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  async function buyTicket(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Checkout gagal')
      if (!data.id) throw new Error('Order ID tidak diterima dari PayKita.')
      const query = new URLSearchParams()
      if (data.qris) query.set('qris', String(data.qris))
      if (data.qr_image) query.set('qr_image', String(data.qr_image))
      if (data.pay_amount) query.set('amount', String(data.pay_amount))
      if (data.checkout_url) query.set('checkout_url', String(data.checkout_url))
      window.location.assign(`/payment/${encodeURIComponent(data.id)}${query.toString() ? `?${query.toString()}` : ''}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Checkout gagal') }
    finally { setBusy(false) }
  }

  return <main className="min-h-screen overflow-hidden bg-background text-foreground">
    <div className={`gunungan-overlay ${overlayOpen ? 'open' : ''}`} onClick={() => setOverlayOpen(true)} role="button" aria-label="Buka halaman DWIPANTARA" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOverlayOpen(true) }}>
      <div className="gunungan-panel gunungan-left"><span className="gunungan-mark">D</span></div>
      <div className="gunungan-panel gunungan-right"><span className="gunungan-mark">W</span></div>
      <span className="absolute inset-x-0 bottom-16 z-10 flex justify-center px-5"><span className="rounded-full border-2 border-white bg-accent px-6 py-3 text-xs font-bold uppercase tracking-[.2em] text-accent-foreground shadow-2xl">꧁ Klik Untuk Membuka ꧂</span></span>
    </div>
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-accent/40 bg-primary/90 text-primary-foreground shadow-md backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
        <a href="#home" className="flex items-center gap-3"><img src={LOGO} alt="Dwipantara" className="h-10 w-10 rounded-full object-cover" /><span className="font-serif text-xl font-bold tracking-wide text-accent">DWIPANTARA</span><span className="sr-only">Jagat 'Arsy Student Cabinet (JASCA) 2025/2026 — Pesantren Peradaban Dunia Jagat 'Arsy</span></a>
        <div className="hidden items-center gap-8 text-sm font-semibold md:flex"><a href="#tentang">Tentang</a><a href="#acara">Acara</a><a href="#tiket">Tiket</a><a href="#lokasi">Lokasi</a></div>
        <a href="#tiket" className="hidden rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-lg transition hover:bg-accent/90 md:block">Pesan Tiket</a>
        <button className="md:hidden" aria-label="Buka menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <div className="flex flex-col gap-4 border-t border-primary/15 bg-background px-5 py-5 md:hidden"><a href="#tentang" onClick={() => setMenuOpen(false)}>Tentang</a><a href="#acara" onClick={() => setMenuOpen(false)}>Acara</a><a href="#tiket" onClick={() => setMenuOpen(false)}>Tiket</a><a href="#lokasi" onClick={() => setMenuOpen(false)}>Lokasi</a></div>}
    </nav>
    <div className="batik-divider" />

    <section id="home" className="batik-hero relative flex min-h-[720px] items-end bg-cover bg-center pt-24" style={{ backgroundImage: `linear-gradient(90deg, rgba(25,44,31,.98) 0%, rgba(25,44,31,.9) 32%, rgba(25,44,31,.48) 58%, rgba(25,44,31,.12) 100%), linear-gradient(180deg, rgba(25,44,31,.12), rgba(25,44,31,.82)), url(${BG})` }}>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 lg:px-8"><div className="max-w-2xl"><p className="mb-5 font-mono text-xs font-bold uppercase tracking-[.35em] text-accent">{content.eventName ?? '꧁ ꦢ꧀ꦮꦶꦥꦤ꧀ꦠꦫ ꧂'}</p><h1 className="max-w-3xl font-serif text-5xl font-bold leading-[.98] text-primary-foreground md:text-7xl">{content.heroTitle ?? 'Festival Budaya Nusantara & Tasyakur'}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/85"><span className="block font-mono text-sm font-bold uppercase tracking-[.2em] text-accent">{content.heroTagline ?? 'THE BEAUTY AND HARMONY OF NUSANTARA'}</span><span className="mt-3 block">{content.heroDescription ?? "Dipersembahkan oleh Jagat 'Arsy Student Cabinet (JASCA) & Menyemarakkan Maulid Emas Ke-50 Kyai Amiin."}</span></p><div className="mt-9 flex flex-wrap gap-4"><a href="#tiket" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground hover:bg-accent/90">Pesan Tiket Sekarang <ArrowRight size={18} /></a><a href="#tentang" className="rounded-full border border-primary-foreground/50 px-6 py-3 font-bold text-primary-foreground hover:bg-primary-foreground/10">Pelajari Selengkapnya</a></div></div></div>
    </section>

    <section id="tentang" data-reveal className="reveal mx-auto max-w-6xl px-5 py-24 lg:px-8"><div className="grid gap-14 md:grid-cols-[.8fr_1.2fr] md:items-start"><div><p className="eyebrow">01 / Tentang</p><h2 className="section-title">{content.aboutTitle ?? 'Pagelaran Seni & Budaya'}</h2><p className="mt-4 font-serif text-2xl font-bold text-accent">Tentang DWIPANTARA 2026</p></div><div className="max-w-xl space-y-5 text-lg leading-8 text-muted-foreground"><p>{content.aboutDescription ?? "DWIPANTARA merupakan festival budaya tahunan yang menghadirkan keberagaman seni, tradisi, dan kreativitas Nusantara dalam satu panggung pementasan istimewa."}</p><p>Tahun ini, DWIPANTARA diselenggarakan dalam rangka menyemarakkan Maulid Emas ke-50 Kyai Amiin sebagai wujud rasa syukur dan penghormatan atas dedikasi serta pengabdian beliau.</p><p>Acara ini sekaligus menjadi pementasan puncak persembahan dari Jagat &apos;Arsy Student Cabinet (JASCA) Masa Bakti 2025–2026 bersama Pesantren Peradaban Dunia Jagat &apos;Arsy.</p></div></div></section>

    <section id="acara" data-reveal className="reveal bg-primary py-24 text-primary-foreground"><div className="mx-auto max-w-6xl px-5 lg:px-8"><p className="eyebrow text-accent">02 / Rangkaian acara</p><h2 className="mt-4 max-w-2xl font-serif text-4xl font-bold text-primary-foreground md:text-5xl">Atraksi Utama</h2><p className="mt-4 max-w-xl text-primary-foreground/70">Rangkaian Pementasan Seni yang merayakan cerita, gerak, musik, dan tradisi Nusantara.</p><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3"><article className="event-card"><span aria-hidden="true" className="text-2xl">01</span><h3>Seni Teater</h3><p className="mt-2 text-accent">Drama Utama</p><p className="mt-3">Pertunjukan drama klasik Sunda bertajuk &quot;Lutung Kasarung&quot; dengan tata panggung visual yang spektakuler.</p></article><article className="event-card"><span aria-hidden="true" className="text-2xl">02</span><h3>Seni Tari</h3><p className="mt-2 text-accent">Tari Tradisional</p><p className="mt-3">Kolaborasi koreografi tarian Nusantara dari Jawa, Sumatera, Bali, hingga Papua yang disatukan secara harmonis.</p></article><article className="event-card"><span aria-hidden="true" className="text-2xl">03</span><h3>Seni Musikal</h3><p className="mt-2 text-accent">Musikal Betawi</p><p className="mt-3">Sajian pertunjukan drama musikal &quot;Payung Fantasi&quot; yang membawakan nuansa nostalgia kebudayaan masyarakat Betawi.</p></article><article className="event-card"><span aria-hidden="true" className="text-2xl">04</span><h3>Atraksi Budaya</h3><p className="mt-2 text-accent">Silat &amp; Debus</p><p className="mt-3">Demonstrasi ketangkasan pencak silat tradisional serta atraksi pementasan seni kekebalan khas Tanah Banten.</p></article><article className="event-card border-accent/60"><span aria-hidden="true" className="text-2xl">05</span><h3>Puncak Acara</h3><p className="mt-2 text-accent">Maulid Emas 50 Tahun</p><p className="mt-3">Prosesi tasyakur dan penghormatan penuh makna atas Milad Ke-50 Kyai Amiin dirangkaikan dengan lantunan sholawat.</p></article></div></div></section>

    <section id="lokasi" data-reveal className="reveal mx-auto max-w-6xl px-5 py-24 lg:px-8"><div className="grid gap-12 md:grid-cols-2"><div><p className="eyebrow">03 / Waktu & lokasi</p><h2 className="section-title">Datang dan<br /><em>jadilah bagian.</em></h2></div><div className="grid gap-4"><div className="info-row"><CalendarDays /><div><strong>{content.date ?? 'Sabtu, 17 Oktober 2026'}</strong><p>Sabtu</p></div></div><div className="info-row"><Clock3 /><div><strong>{content.time ?? "Ba&apos;da Isya – 22.38 WIB"}</strong><p>Pementasan malam</p></div></div><div className="info-row"><MapPin /><div><strong>Lapangan Futsal Pesantren Jagat &apos;Arsy BSD</strong><p>{content.venue ?? "Serpong, Tangerang Selatan, Banten"}</p></div></div></div></div></section>

    <section id="tiket" data-reveal className="reveal bg-secondary px-5 py-24 lg:px-8"><div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[.9fr_1.1fr] md:items-start"><div><p className="eyebrow">04 / Tiket masuk</p><h2 className="section-title">Satu tiket,<br /><em>seribu cerita.</em></h2><p className="mt-6 max-w-md leading-7 text-muted-foreground">Tiket festival berlaku untuk satu hari pilihanmu dan sudah termasuk akses seluruh pertunjukan utama.</p><div className="mt-8 flex items-center gap-3"><Ticket className="text-accent" /><span className="text-2xl font-bold">Rp{(content.ticketPrice ?? 10000).toLocaleString('id-ID')} <small className="text-sm font-normal text-muted-foreground">/ orang</small></span></div></div><form onSubmit={buyTicket} className="rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8"><h3 className="mb-6 font-serif text-2xl font-bold">Pesan tiket sekarang</h3><div className="grid gap-4"><label>Nama lengkap<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama kamu" /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nama@email.com" /></label><label>Nomor WhatsApp<input required value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="08xxxxxxxxxx" /></label><label>Jumlah tiket<input required type="number" min="1" max="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label></div>{error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-bold text-primary-foreground disabled:opacity-60">{busy ? 'Menyiapkan pembayaran…' : 'Lanjut ke pembayaran'} <ArrowRight size={18} /></button></form></div></section>


    <AmbientSound startWhenOpen={overlayOpen} />
    <footer className="bg-primary px-5 py-10 text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="font-serif text-xl font-bold">DWIPANTARA 2026</p><p className="mt-1 text-xs text-primary-foreground/70">Jagat 'Arsy Student Cabinet (JASCA) 2025/2026</p><p className="text-xs text-primary-foreground/70">Pesantren Peradaban Dunia Jagat 'Arsy</p></div><p className="text-sm text-primary-foreground/70">Tangerang Selatan · Indonesia</p><div className="flex items-center gap-5"><span className="text-sm font-bold tracking-widest">IG / @dwipantara</span><a href="/admin" className="text-sm text-primary-foreground/70 underline-offset-4 hover:text-accent hover:underline">Admin</a></div></div></footer>
  </main>
}

// Tailwind utility composition kept here to keep the page copy readable.

export const dynamic = 'force-dynamic'
