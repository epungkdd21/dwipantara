'use client'

import { Printer } from 'lucide-react'

export function TicketActions() {
  return (
    <div className="mt-6 flex gap-3 print:hidden">
      <button type="button" onClick={() => window.print()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">
        <Printer size={16} /> Cetak / Simpan PDF
      </button>
      <a href="/" className="inline-flex items-center justify-center rounded-full border border-border px-4 py-3 text-sm font-bold transition hover:border-accent hover:text-accent">Selesai</a>
    </div>
  )
}
