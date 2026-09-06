'use client'

import { FormEvent, Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!token) return setError('Tautan reset password tidak valid atau sudah kedaluwarsa.')
    if (password.length < 8) return setError('Password minimal 8 karakter.')
    if (password !== confirmation) return setError('Konfirmasi password tidak sama.')
    setBusy(true)
    setError('')
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) setError('Tautan reset password tidak valid atau sudah kedaluwarsa.')
      else router.replace('/sign-in?reset=success')
    } catch { setError('Reset password gagal. Silakan minta tautan baru.') }
    finally { setBusy(false) }
  }

  return <div className="w-full max-w-md"><div className="mb-6 flex items-center justify-between gap-3"><Link href="/sign-in" className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">← Kembali ke login</Link><Link href="/" className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground">Halaman awal</Link></div><form onSubmit={submit} className="w-full rounded-3xl border border-border bg-card p-7 shadow-2xl"><p className="eyebrow">DWIPANTARA 2026</p><h1 className="mt-3 font-serif text-4xl font-bold">Buat password baru.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Gunakan password minimal 8 karakter untuk mengamankan akses admin.</p><div className="mt-8 grid gap-4"><label>Password baru<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label><label>Konfirmasi password<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label></div>{error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<button disabled={busy || !token} className="mt-6 w-full rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60">{busy ? 'Menyimpan…' : 'Simpan password baru'}</button></form></div>
}

export default function ResetPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-background px-5 py-10"><Suspense fallback={<div className="text-sm text-muted-foreground">Memuat halaman reset…</div>}><ResetPasswordForm /></Suspense></main>
}
