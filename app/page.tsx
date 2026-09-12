'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Clock3, Mail, MapPin, Menu, Ticket, X } from 'lucide-react'
import { AmbientSound } from '@/components/ambient-sound'
import { getActivePricingRule, getPromoText } from '@/lib/pricing'

const BG = 'https://i.pinimg.com/736x/52/d2/c8/52d2c84edfcf25e4119ddab998952ef8.jpg'
const HERO_BG = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-dwipantara.jpg.jpeg-Ntxq1di3M4NzKDqHlG8cY4sITq3E5X.png'
const LOGO = '/logo-dw26.png'

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accessChecked, setAccessChecked] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [accessPassword, setAccessPassword] = useState('')
  const [accessError, setAccessError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', quantity: '1' })
  const [content, setContent] = useState<{ eventName?: string; heroTitle?: string; heroTagline?: string; heroDescription?: string; aboutTitle?: string; aboutDescription?: string; ticketPrice?: number; date?: string; time?: string; venue?: string; address?: string; instagram?: string }>({})
  const pricing = getActivePricingRule()
  const promoText = getPromoText(pricing)
  useEffect(() => { fetch('/api/access', { cache: 'no-store' }).then(response => response.json()).then(data => setUnlocked(Boolean(data.unlocked))).catch(() => setAccessError('Tidak dapat memeriksa akses.')).finally(() => setAccessChecked(true)) }, [])
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

  async function unlock(event: React.FormEvent) {
    event.preventDefault(); setAccessError('')
    try {
      const response = await fetch('/api/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: accessPassword }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Akses ditolak.')
      setUnlocked(true); setAccessPassword('')
    } catch (err) { setAccessError(err instanceof Error ? err.message : 'Akses ditolak.') }
  }

  if (!accessChecked || !unlocked) return <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground"><form onSubmit={unlock} className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl"><p className="eyebrow">DWIPANTARA 2026</p><h1 className="mt-3 font-serif text-4xl font-bold">Buka halaman acara</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Masukkan password untuk mengakses website DWIPANTARA.</p><label className="mt-6 grid gap-2 text-sm font-bold">Password<input autoFocus required type="password" value={accessPassword} onChange={event => setAccessPassword(event.target.value)} className="rounded-xl border border-border bg-background p-3 text-foreground outline-none focus:border-accent" /></label>{accessError && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{accessError}</p>}<button disabled={!accessChecked} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">{accessChecked ? 'Masuk ke website' : 'Memeriksa akses…'}</button></form></main>

  return <main className={`min-h-screen overflow-hidden bg-background text-foreground ${overlayOpen ? 'scene-revealed' : ''}`}>
    <div className={`gunungan-overlay ${overlayOpen ? 'open' : ''}`} onClick={() => setOverlayOpen(true)} role="button" aria-label="Buka halaman DWIPANTARA" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOverlayOpen(true) }}>
      <div className="gunungan-panel gunungan-left" aria-hidden="true"><img src={LOGO} alt="" className="gunungan-logo gunungan-logo-left" /></div>
      <div className="gunungan-panel gunungan-right" aria-hidden="true"><img src={LOGO} alt="" className="gunungan-logo gunungan-logo-right" /></div>
      <span className="absolute inset-x-0 bottom-16 z-10 flex justify-center px-5"><span className="rounded-full border-2 border-white bg-accent px-6 py-3 text-xs font-bold uppercase tracking-[.2em] text-accent-foreground shadow-2xl">꧁ Klik Untuk Membuka ꧂</span></span>
    </div>
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-accent/40 bg-primary/90 text-primary-foreground shadow-md backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
        <a href="#home" className="flex items-center gap-3"><img src={LOGO} alt="Dwipantara" className="h-10 w-auto max-w-[180px] object-contain" /><span className="sr-only">Jagat 'Arsy Student Cabinet (JASCA) 2025/2026 — Pesantren Peradaban Dunia Jagat 'Arsy</span></a>
        <div className="hidden items-center gap-8 text-sm font-semibold md:flex"><a href="#tentang">Tentang</a><a href="#acara">Acara</a><a href="#tiket">Tiket</a><a href="#lokasi">Lokasi</a></div>
        <a href="#tiket" className="hidden rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-lg transition hover:bg-accent/90 md:block">Pesan Tiket</a>
        <button className="md:hidden" aria-label="Buka menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <div className="flex flex-col gap-4 border-t border-primary/15 bg-background px-5 py-5 md:hidden"><a href="#tentang" onClick={() => setMenuOpen(false)}>Tentang</a><a href="#acara" onClick={() => setMenuOpen(false)}>Acara</a><a href="#tiket" onClick={() => setMenuOpen(false)}>Tiket</a><a href="#lokasi" onClick={() => setMenuOpen(false)}>Lokasi</a></div>}
    </nav>
    <div className="batik-divider" />

    <section id="home" className="batik-hero relative flex min-h-[760px] items-center justify-center bg-cover bg-center px-5 pt-28 text-center sm:min-h-[820px]" style={{ backgroundImage: `linear-gradient(180deg, rgba(18,8,4,.62) 0%, rgba(18,8,4,.36) 42%, rgba(18,8,4,.78) 100%), linear-gradient(90deg, rgba(18,8,4,.42), rgba(18,8,4,.18), rgba(18,8,4,.42)), url(${HERO_BG})` }}>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center"><p className="mb-7 font-mono text-xs font-bold uppercase tracking-[.35em] text-accent">{content.eventName ?? '꧁ ꦢ꧀ꦮꦶꦥꦤ꧀ꦠꦫ ꧂'}</p><h1 className="max-w-4xl font-serif text-5xl font-bold leading-[.92] tracking-[-.03em] text-primary-foreground text-balance sm:text-7xl md:text-8xl">{content.heroTitle ?? 'Festival Budaya Nusantara & Tasyakur'}</h1><p className="mt-8 max-w-2xl text-base leading-8 text-primary-foreground/90 sm:text-lg sm:leading-8"><span className="block font-mono text-xs font-bold uppercase tracking-[.2em] text-accent sm:text-sm">{content.heroTagline ?? 'THE BEAUTY AND HARMONY OF NUSANTARA'}</span><span className="mx-auto mt-4 block max-w-xl">{content.heroDescription ?? "Dipersembahkan oleh Jagat 'Arsy Student Cabinet (JASCA) & Menyemarakkan Maulid Emas Ke-50 Kyai Amiin."}</span></p><div className="mt-10 flex flex-wrap justify-center gap-4"><a href="#tiket" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-bold text-accent-foreground shadow-lg shadow-black/20 transition hover:bg-accent/90">Pesan Tiket Sekarang <ArrowRight size={18} /></a><a href="#tentang" className="rounded-full border border-primary-foreground/60 px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary-foreground/10">Pelajari Selengkapnya</a></div></div>
    </section>

    <section id="tentang" data-reveal className="reveal mx-auto max-w-6xl px-5 py-24 lg:px-8"><div className="grid gap-14 md:grid-cols-[.8fr_1.2fr] md:items-start"><div><p className="eyebrow">01 / Tentang</p><h2 className="section-title">{content.aboutTitle ?? 'Pagelaran Seni & Budaya'}</h2><p className="mt-4 font-serif text-2xl font-bold text-accent">Tentang DWIPANTARA 2026</p></div><div className="max-w-xl space-y-5 text-lg leading-8 text-muted-foreground"><p>{content.aboutDescription ?? "DWIPANTARA merupakan festival budaya tahunan yang menghadirkan keberagaman seni, tradisi, dan kreativitas Nusantara dalam satu panggung pementasan istimewa."}</p><p>Tahun ini, DWIPANTARA diselenggarakan dalam rangka menyemarakkan Maulid Emas ke-50 Kyai Amiin sebagai wujud rasa syukur dan penghormatan atas dedikasi serta pengabdian beliau.</p><p>Acara ini sekaligus menjadi pementasan puncak persembahan dari Jagat &apos;Arsy Student Cabinet (JASCA) Masa Bakti 2025–2026 bersama Pesantren Peradaban Dunia Jagat &apos;Arsy.</p></div></div></section>

    <section id="acara" data-reveal className="reveal bg-primary py-24 text-primary-foreground"><div className="mx-auto max-w-6xl px-5 lg:px-8"><p className="eyebrow text-accent">02 / Rangkaian acara</p><h2 className="mt-4 max-w-2xl font-serif text-4xl font-bold text-primary-foreground md:text-5xl">Atraksi Utama</h2><p className="mt-4 max-w-xl text-primary-foreground/70">Rangkaian Pementasan Seni yang merayakan cerita, gerak, musik, dan tradisi Nusantara.</p><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3"><article className="event-card"><span aria-hidden="true" className="text-2xl">01</span><h3>Seni Teater</h3><p className="mt-2 text-accent">Drama Utama</p><p className="mt-3">Pertunjukan drama klasik Sunda bertajuk &quot;Lutung Kasarung&quot; dengan tata panggung visual yang spektakuler.</p></article><article className="event-card"><span aria-hidden="true" className="text-2xl">02</span><h3>Seni Tari</h3><p className="mt-2 text-accent">Tari Tradisional</p><p className="mt-3">Kolaborasi koreografi tarian Nusantara dari Jawa, Sumatera, Bali, hingga Papua yang disatukan secara harmonis.</p></article><article className="event-card"><span aria-hidden="true" className="text-2xl">03</span><h3>Seni Musikal</h3><p className="mt-2 text-accent">Musikal Betawi</p><p className="mt-3">Sajian pertunjukan drama musikal &quot;Payung Fantasi&quot; yang membawakan nuansa nostalgia kebudayaan masyarakat Betawi.</p></article><article className="event-card"><span aria-hidden="true" className="text-2xl">04</span><h3>Atraksi Budaya</h3><p className="mt-2 text-accent">Silat &amp; Debus</p><p className="mt-3">Demonstrasi ketangkasan pencak silat tradisional serta atraksi pementasan seni kekebalan khas Tanah Banten.</p></article><article className="event-card border-accent/60"><span aria-hidden="true" className="text-2xl">05</span><h3>Puncak Acara</h3><p className="mt-2 text-accent">Maulid Emas 50 Tahun</p><p className="mt-3">Prosesi tasyakur dan penghormatan penuh makna atas Milad Ke-50 Kyai Amiin dirangkaikan dengan lantunan sholawat.</p></article></div></div></section>

    <section id="lokasi" data-reveal className="reveal mx-auto max-w-6xl px-5 py-24 lg:px-8"><div className="grid gap-12 md:grid-cols-2"><div><p className="eyebrow">03 / Waktu & lokasi</p><h2 className="section-title">Datang dan<br /><em>jadilah bagian.</em></h2></div><div className="grid gap-4"><div className="info-row"><CalendarDays /><div><strong>{content.date ?? 'Rabu, 21 Oktober 2026'}</strong><p>Rabu</p></div></div><div className="info-row"><Clock3 /><div><strong>{content.time ?? "Ba'da Isya – 22.38 WIB"}</strong><p>Pementasan malam</p></div></div><div className="info-row"><MapPin /><div><strong>Lapangan Futsal<br />Pesantren Jagat &apos;Arsy BSD</strong><p>{content.address ?? "Serpong, Tangsel, Banten"}</p></div></div></div></div></section>

    <section id="tiket" data-reveal className="reveal bg-secondary px-5 py-24 lg:px-8"><div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[.9fr_1.1fr] md:items-start"><div><p className="eyebrow">04 / Tiket masuk</p><h2 className="section-title">Satu tiket,<br /><em>seribu cerita.</em></h2><p className="mt-6 max-w-md text-base leading-8 tracking-wide text-muted-foreground">Tiket festival berlaku untuk satu hari pilihanmu dan sudah termasuk akses seluruh pertunjukan utama.</p><div className="mt-8 flex items-center gap-3"><Ticket className="text-accent" /><div><span className="text-2xl font-bold">Rp{pricing.basePrice.toLocaleString('id-ID')} <small className="text-sm font-normal text-muted-foreground">/ orang</small></span>{promoText && <p className="mt-2 text-sm font-semibold text-accent">{promoText}</p>}</div></div></div><form onSubmit={buyTicket} className="rounded-3xl border border-border bg-card p-6 shadow-xl md:p-8"><h3 className="mb-6 font-serif text-2xl font-bold">Pesan tiket sekarang</h3><div className="grid gap-4"><label>Nama lengkap<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama kamu" /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nama@email.com" /></label><label>Nomor WhatsApp<input required value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="08xxxxxxxxxx" /></label><label>Jumlah tiket<input required type="number" min="1" max="10" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label></div>{error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-bold text-primary-foreground disabled:opacity-60">{busy ? 'Menyiapkan pembayaran…' : 'Lanjut ke pembayaran'} <ArrowRight size={18} /></button></form></div></section>


    <AmbientSound startWhenOpen={overlayOpen} />
    <footer className="bg-primary px-5 py-10 text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between"><div><p className="font-serif text-xl font-bold">DWIPANTARA 2026</p><p className="mt-1 text-xs text-primary-foreground/70">Jagat 'Arsy Student Cabinet (JASCA) 2025/2026</p><p className="text-xs text-primary-foreground/70">Pesantren Peradaban Dunia Jagat 'Arsy</p></div><p className="text-sm text-primary-foreground/70">Tangerang Selatan · Indonesia</p><div className="flex flex-col items-center gap-3 md:items-end"><span className="text-xs font-semibold uppercase tracking-widest text-accent">Ikuti Media Sosial Kami</span><div className="flex items-center gap-3"><a href="https://www.instagram.com/dwipantara26?utm_source=ig_web_button_share_sheet&igsi=ZDNlZDc0MzIxNw==" target="_blank" rel="noreferrer" aria-label="Instagram DWIPANTARA" className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-secondary text-primary-foreground transition hover:bg-accent hover:text-accent-foreground"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-current"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm5.25-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 0 0 1 1.25-1.25Z" /></svg></a><a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" aria-label="WhatsApp DWIPANTARA" className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-secondary text-primary-foreground transition hover:bg-accent hover:text-accent-foreground"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-current"><path d="M20.5 3.5A11.84 11.84 0 0 0 12.08 0C5.54 0 .22 5.32.22 11.86c0 2.09.55 4.13 1.6 5.93L.12 24l6.35-1.66a11.86 11.86 0 0 0 5.61 1.43h.01c6.54 0 11.86-5.32 11.86-11.86a11.8 11.8 0 0 0-3.45-8.41Zm-8.42 18.27h-.01a9.85 9.85 0 0 1-5.02-1.38l-.36-.22-3.77.99 1.01-3.67-.23-.38a9.84 9.84 0 0 1-1.51-5.25C2.19 6.43 6.63 2 12.09 2a9.86 9.86 0 0 1 9.87 9.86c0 5.46-4.44 9.91-9.88 9.91Zm5.43-7.42c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-1.75-.87-2.9-1.55-4.06-3.51-.31-.54.31-.5.89-1.66.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5 1.89.82 2.63.89 3.57.75.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" /></svg></a><a href="mailto:dwipantara2026@gmail.com" aria-label="Email DWIPANTARA" className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-secondary text-primary-foreground transition hover:bg-accent hover:text-accent-foreground"><Mail size={18} /></a><a href="/admin" className="ml-2 text-sm text-primary-foreground/70 underline-offset-4 hover:text-accent hover:underline">Admin</a></div></div></div></footer>
  </main>
}
