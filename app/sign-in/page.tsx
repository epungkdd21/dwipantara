'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
      if (result.error) setError('Email atau password tidak valid.')
      else { router.replace('/admin'); router.refresh() }
    } catch { setError('Login gagal. Silakan coba lagi.') }
    finally { setBusy(false) }
  }

  async function requestReset(event: FormEvent) {
    event.preventDefault()
    setResetBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await authClient.requestPasswordReset({ email: resetEmail.trim().toLowerCase(), redirectTo: `${window.location.origin}/reset-password` })
      if (result.error) setError('Permintaan reset password gagal. Silakan coba lagi.')
      else setNotice('Jika email terdaftar, instruksi reset password akan dikirim ke inbox Anda.')
    } catch { setError('Permintaan reset password gagal. Silakan coba lagi.') }
    finally { setResetBusy(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-background px-5 py-10"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-2xl"><p className="eyebrow">DWIPANTARA 2026</p><h1 className="mt-3 font-serif text-4xl font-bold">Masuk ke admin.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Akses terbatas untuk mengelola konten acara, tiket, kehadiran, dan souvenir.</p><form onSubmit={submit} className="mt-8 grid gap-4"><label>Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label><button disabled={busy} className="mt-2 w-full rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? 'Memeriksa…' : 'Masuk'}</button></form><div className="my-7 border-t border-border" /><form onSubmit={requestReset} className="grid gap-3"><div><h2 className="font-semibold">Lupa password?</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Masukkan email admin untuk menerima tautan reset password.</p></div><label>Email admin<input required type="email" autoComplete="email" value={resetEmail} onChange={event => setResetEmail(event.target.value)} /></label><button disabled={resetBusy} type="submit" className="w-full rounded-full border border-border px-5 py-3 font-bold text-foreground disabled:opacity-60">{resetBusy ? 'Mengirim…' : 'Kirim tautan reset'}</button></form>{error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}{notice && <p className="mt-4 rounded-xl bg-accent/10 p-3 text-sm text-foreground">{notice}</p>}</div></main>
}
