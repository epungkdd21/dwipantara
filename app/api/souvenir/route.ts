import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireCheckinAccess } from '@/lib/admin'
import { jsonTooLarge, readJson } from '@/lib/security'

export async function POST(request: Request) {
  if (!await requireCheckinAccess()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { code, ticketCode } = await readJson<{ code?: unknown; ticketCode?: unknown }>(request, 4_096)
    const submittedCode = typeof code === 'string' ? code : ticketCode
    if (typeof submittedCode !== 'string' || submittedCode.trim().length < 8 || submittedCode.trim().length > 300) {
      return NextResponse.json({ error: 'Kode tiket tidak valid.' }, { status: 400 })
    }

    const result = await db.execute(sql`
      UPDATE tickets
      SET souvenir_status = 'collected', souvenir_collected_at = now()
      WHERE ticket_code = ${submittedCode.trim()}
        AND payment_status = 'paid'
        AND checkin_status = 'checked_in'
        AND souvenir_status = 'not_collected'
      RETURNING ticket_code, attendee_name, order_id, souvenir_status, souvenir_collected_at
    `)
    const ticket = result.rows[0]
    if (!ticket) {
      return NextResponse.json({ error: 'Souvenir hanya dapat diberikan setelah check-in dan tidak boleh diambil dua kali.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    const tooLarge = jsonTooLarge(error)
    return NextResponse.json({ error: tooLarge ? 'Request terlalu besar.' : 'Gagal mencatat pengambilan souvenir.' }, { status: tooLarge ? 413 : 500 })
  }
}
