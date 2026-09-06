import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const fallback = {
  eventName: '꧁ ꦢ꧀ꦮꦶꦥꦤ꧀ꦠꦫ ꧂', tagline: 'Festival Budaya Nusantara & Tasyakur', heroTitle: 'Festival Budaya Nusantara & Tasyakur', heroTagline: 'THE BEAUTY AND HARMONY OF NUSANTARA', heroDescription: "Dipersembahkan oleh Jagat 'Arsy Student Cabinet (JASCA) & Menyemarakkan Maulid Emas Ke-50 Kyai Amiin.", aboutTitle: 'Merawat warisan, merayakan masa depan.', aboutDescription: 'DWIPANTARA 2026 menghadirkan perjumpaan lintas generasi melalui pertunjukan tari, musik tradisional, instalasi seni, dan kuliner dari berbagai penjuru Nusantara.', ticketPrice: 10000, date: '12—14 Juni 2026', time: '10.00—22.00 WIB', venue: 'Jogja National Museum', address: 'Gampingan, Yogyakarta', footer: 'Yogyakarta · Indonesia', instagram: '@dwipantara', events: [{ title: 'Ruang Gerak', description: 'Panggung tari tradisi dan kontemporer dalam satu napas.' }, { title: 'Bunyi Kepulauan', description: 'Eksplorasi bunyi gamelan, sasando, talempong, dan suara baru.' }, { title: 'Pasar Rasa', description: 'Temui cita rasa autentik dari dapur-dapur terbaik Indonesia.' }], published: true,
}

export async function GET() {
  const result = await db.query(`SELECT content FROM site_content WHERE id = 1 LIMIT 1`)
  const content = result.rows[0]?.content ?? fallback
  return NextResponse.json(content)
}

export { fallback }
