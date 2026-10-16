import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAdminRole } from '@/lib/admin'
import { jsonTooLarge, readJson } from '@/lib/security'

type RouteContext = { params: Promise<{ orderId: string }> }

function validOrderId(orderId: string) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(orderId)
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdminRole()
  if (!access || access.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await context.params
  if (!validOrderId(orderId)) {
    return NextResponse.json({ error: 'ID order tidak valid.' }, { status: 400 })
  }

  let body: {
    name?: unknown
    email?: unknown
    whatsapp?: unknown
  }
  try {
    body = await readJson(request, 4_096)
  } catch (error) {
    return NextResponse.json(
      {
        error: jsonTooLarge(error)
          ? 'Request terlalu besar.'
          : error instanceof Error
            ? error.message
            : 'Gagal memperbarui data pembeli.',
      },
      { status: jsonTooLarge(error) ? 413 : 400 },
    )
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const whatsapp =
    typeof body.whatsapp === 'string'
      ? body.whatsapp.replace(/[^\d+]/g, '')
      : ''

  if (
    name.length < 2 ||
    name.length > 120 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 254 ||
    whatsapp.length < 8 ||
    whatsapp.length > 20
  ) {
    return NextResponse.json(
      { error: 'Nama, email, atau nomor WhatsApp tidak valid.' },
      { status: 400 },
    )
  }

  const result = await db.execute(sql`
    UPDATE tickets
    SET attendee_name = ${name},
        attendee_email = ${email},
        attendee_whatsapp = ${whatsapp}
    WHERE order_id = ${orderId}
    RETURNING ticket_code
  `)
  if (!result.rows.length) {
    return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 })
  }
  return NextResponse.json({ updated: result.rows.length })
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireAdminRole()
  if (!access || access.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await context.params
  if (!validOrderId(orderId)) {
    return NextResponse.json({ error: 'ID order tidak valid.' }, { status: 400 })
  }

  let body: { ticketCode?: unknown }
  try {
    body = await readJson(request, 4_096)
  } catch (error) {
    return NextResponse.json(
      {
        error: jsonTooLarge(error)
          ? 'Request terlalu besar.'
          : 'Request tidak valid.',
      },
      { status: jsonTooLarge(error) ? 413 : 400 },
    )
  }
  const ticketCode =
    typeof body.ticketCode === 'string' ? body.ticketCode.trim() : ''
  if (!ticketCode || ticketCode.length > 200) {
    return NextResponse.json({ error: 'Kode tiket tidak valid.' }, { status: 400 })
  }

  const deleted = await db.transaction(async (transaction) => {
    const tickets = await transaction.execute(sql`
      SELECT ticket_code, payment_status, checkin_status, souvenir_status
      FROM tickets
      WHERE order_id = ${orderId}
      FOR UPDATE
    `)
    if (!tickets.rows.length) return 'not_found' as const
    if (
      tickets.rows.some(
        (ticket) =>
          !['expired', 'cancelled'].includes(String(ticket.payment_status)),
      )
    ) {
      return 'not_expired' as const
    }

    const target = tickets.rows.find(
      (ticket) => ticket.ticket_code === ticketCode,
    )
    if (!target) return 'ticket_not_found' as const
    if (
      target.checkin_status === 'checked_in' ||
      target.souvenir_status === 'collected'
    ) {
      return 'used' as const
    }

    await transaction.execute(sql`
      DELETE FROM tickets
      WHERE order_id = ${orderId} AND ticket_code = ${ticketCode}
    `)
    const remaining = tickets.rows.length - 1
    if (remaining > 0) {
      await transaction.execute(sql`
        UPDATE tickets SET quantity = ${remaining}
        WHERE order_id = ${orderId}
      `)
    }
    return 'deleted' as const
  })

  if (deleted === 'not_found' || deleted === 'ticket_not_found') {
    return NextResponse.json({ error: 'Tiket tidak ditemukan.' }, { status: 404 })
  }
  if (deleted === 'not_expired') {
    return NextResponse.json(
      { error: 'Tiket hanya dapat dihapus jika seluruh order sudah kedaluwarsa atau dibatalkan.' },
      { status: 409 },
    )
  }
  if (deleted === 'used') {
    return NextResponse.json(
      { error: 'Tiket yang sudah digunakan tidak dapat dihapus.' },
      { status: 409 },
    )
  }

  return NextResponse.json({ deleted: true })
}
