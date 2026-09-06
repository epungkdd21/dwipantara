import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function adminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const allowlist = process.env.ADMIN_EMAILS?.split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  if (allowlist?.length && !allowlist.includes(session.user.email.toLowerCase())) return null
  return session
}

export async function GET() {
  if (!await adminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await db.execute(sql`SELECT content, "updatedAt" FROM site_content WHERE id = 1 LIMIT 1`)
  return NextResponse.json(result.rows[0] ?? {})
}

export async function PUT(request: Request) {
  if (!await adminSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  if (!body || typeof body !== 'object' || typeof body.eventName !== 'string' || typeof body.ticketPrice !== 'number' || body.ticketPrice < 0 || body.ticketPrice > 100000000) return NextResponse.json({ error: 'Konten tidak valid' }, { status: 400 })
  const content = JSON.stringify({ ...body, eventName: body.eventName.trim().slice(0, 120), heroTitle: String(body.heroTitle ?? '').slice(0, 240), heroDescription: String(body.heroDescription ?? '').slice(0, 1000), aboutTitle: String(body.aboutTitle ?? '').slice(0, 240), aboutDescription: String(body.aboutDescription ?? '').slice(0, 1000), ticketPrice: Math.round(body.ticketPrice) })
  await db.execute(sql`INSERT INTO site_content (id, content, "updatedAt") VALUES (1, ${content}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, "updatedAt" = now()`)
  return NextResponse.json(JSON.parse(content))
}
