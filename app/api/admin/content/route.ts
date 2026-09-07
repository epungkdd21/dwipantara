import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { canEditContent, requireAdminRole } from '@/lib/admin'
import { jsonTooLarge, readJson } from '@/lib/security'

export async function GET() {
  if (!await requireAdminRole()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await db.execute(sql`SELECT content, "updatedAt" FROM site_content WHERE id = 1 LIMIT 1`)
  return NextResponse.json(result.rows[0] ?? {})
}

export async function PUT(request: Request) {
  const access = await requireAdminRole()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canEditContent(access.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await readJson<Record<string, unknown>>(request, 32_768)
    const ticketPrice = typeof body.ticketPrice === 'number' ? body.ticketPrice : Number(body.ticketPrice)
    if (typeof body.eventName !== 'string' || !Number.isFinite(ticketPrice) || ticketPrice < 0 || ticketPrice > 100000000) return NextResponse.json({ error: 'Konten tidak valid' }, { status: 400 })
    const text = (key: string, max: number) => typeof body[key] === 'string' ? body[key].trim().slice(0, max) : ''
    const content = JSON.stringify({
      eventName: text('eventName', 120), heroTitle: text('heroTitle', 240), heroTagline: text('heroTagline', 160), heroDescription: text('heroDescription', 1000),
      aboutTitle: text('aboutTitle', 240), aboutDescription: text('aboutDescription', 1000), date: text('date', 120), time: text('time', 120), venue: text('venue', 240),
      address: text('address', 300), instagram: text('instagram', 120), ticketPrice: Math.round(ticketPrice),
    })
    await db.execute(sql`INSERT INTO site_content (id, content, "updatedAt") VALUES (1, ${content}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, "updatedAt" = now()`)
    return NextResponse.json(JSON.parse(content))
  } catch (error) {
    return NextResponse.json({ error: jsonTooLarge(error) ? 'Request terlalu besar.' : 'Konten tidak valid.' }, { status: jsonTooLarge(error) ? 413 : 400 })
  }
}
