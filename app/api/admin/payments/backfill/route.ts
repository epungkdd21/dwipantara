import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireAdminRole } from '@/lib/admin'
import { getPayKitaOrder } from '@/lib/paykita'
import { hasPaymentAmountColumn } from '@/lib/tickets'

export async function POST() {
  const access = await requireAdminRole()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasPaymentAmountColumn())) {
    return NextResponse.json(
      { error: 'Kolom payment_amount belum tersedia. Jalankan migrasi database terlebih dahulu.' },
      { status: 409 },
    )
  }

  const missing = await db.execute(sql`
    SELECT order_id
    FROM tickets
    WHERE payment_status = 'paid' AND payment_amount IS NULL
    GROUP BY order_id
    ORDER BY MIN(created_at) ASC
    LIMIT 10
  `)

  let synced = 0
  const failures: Array<{ order_id: string; error: string }> = []
  for (const row of missing.rows) {
    const orderId = String(row.order_id)
    try {
      const payment = await getPayKitaOrder(orderId)
      if (payment.status !== 'paid') {
        throw new Error(`Status gateway bukan paid (${payment.status}).`)
      }
      const amount = payment.pay_amount || payment.base_amount
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error('Nominal pembayaran dari gateway tidak valid.')
      }
      await db.execute(sql`
        UPDATE tickets
        SET payment_amount = ${amount}
        WHERE order_id = ${orderId}
          AND payment_status = 'paid'
          AND payment_amount IS NULL
      `)
      synced += 1
    } catch (error) {
      failures.push({
        order_id: orderId,
        error: error instanceof Error ? error.message : 'Gagal menyinkronkan nominal.',
      })
    }
  }

  const remaining = await db.execute(sql`
    SELECT count(DISTINCT order_id)::int AS count
    FROM tickets
    WHERE payment_status = 'paid' AND payment_amount IS NULL
  `)

  return NextResponse.json({
    synced,
    failed: failures,
    remaining: Number(remaining.rows[0]?.count ?? 0),
  })
}
