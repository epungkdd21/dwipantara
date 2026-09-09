import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "DWIPANTARA 2026 — Jagat 'Arsy Student Cabinet",
  description: "DWIPANTARA 2026 oleh Jagat 'Arsy Student Cabinet (JASCA) 2025/2026, Pesantren Peradaban Dunia Jagat 'Arsy.",
  generator: 'v0.app',
}
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f4f0dc' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}<SpeedInsights /></body></html>
}
