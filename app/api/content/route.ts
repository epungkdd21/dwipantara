import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const fallback = {
  eventName: '꧁ ꦢ꧀ꦮꦶꦥꦤ꧀ꦠꦫ ꧂', tagline: 'Festival Budaya Nusantara & Tasyakur', heroTitle: 'Festival Budaya Nusantara & Tasyakur', heroTagline: 'THE BEAUTY AND HARMONY OF NUSANTARA', heroDescription: "Dipersembahkan oleh Jagat 'Arsy Student Cabinet (JASCA) & Menyemarakkan Maulid Emas Ke-50 Kyai Amiin.", aboutTitle: 'Merawat warisan, merayakan masa depan.', aboutDescription: 'DWIPANTARA 2026 menghadirkan perjumpaan lintas generasi melalui pertunjukan tari, musik tradisional, instalasi seni, dan kuliner dari berbagai penjuru Nusantara.', ticketPrice: 15000, date: 'Rabu, 21 Oktober 2026', time: "Ba'da Isya – 22.38 WIB", venue: "Lapangan Futsal Pesantren Jagat 'Arsy BSD", address: 'Serpong, Tangsel, Banten', footer: 'Yogyakarta · Indonesia', instagram: '@dwipantara', events: [{ title: 'Ruang Gerak', description: 'Panggung tari tradisi dan kontemporer dalam satu napas.' }, { title: 'Bunyi Kepulauan', description: 'Eksplorasi bunyi gamelan, sasando, talempong, dan suara baru.' }, { title: 'Pasar Rasa', description: 'Temui cita rasa autentik dari dapur-dapur terbaik Indonesia.' }], published: true,
}

export async function GET() {
  const result = await db.execute(sql`SELECT content FROM site_content WHERE id = 1 LIMIT 1`)
  const content = { ...(result.rows[0]?.content ?? fallback), date: 'Rabu, 21 Oktober 2026' }
  return NextResponse.json(content)
}

export { fallback }
