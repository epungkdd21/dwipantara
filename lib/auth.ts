import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { Resend } from 'resend'
import { getAppUrl } from '@/lib/app-url'

const baseURL = process.env.BETTER_AUTH_URL || getAppUrl()
const origins = ['http://localhost:3000', getAppUrl(), process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined, process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined].filter((origin): origin is string => Boolean(origin))
const authSecret = process.env.BETTER_AUTH_SECRET ?? 'build-only-secret-not-used-at-runtime'
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  secret: authSecret,
  baseURL,
  trustedOrigins: origins,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      if (!resend || !process.env.RESEND_EMAIL_DOMAIN) { console.error('[v0] Resend belum dikonfigurasi untuk reset password'); return }
      const result = await resend.emails.send({ from: `Dwipantara Admin <noreply@${process.env.RESEND_EMAIL_DOMAIN}>`, to: [user.email], subject: 'Reset password admin Dwipantara', text: `Gunakan tautan berikut untuk membuat password baru: ${url}\n\nJika Anda tidak meminta reset password, abaikan email ini.`, html: `<p>Gunakan tautan berikut untuk membuat password baru:</p><p><a href="${url}">Reset password admin</a></p><p>Jika Anda tidak meminta reset password, abaikan email ini.</p>` }, { idempotencyKey: `admin-password-reset/${user.id}` })
      if (result.error) console.error('[v0] Gagal mengirim email reset password:', result.error.message)
    },
  },
  ...(process.env.NODE_ENV === 'development' ? { advanced: { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } } } : {}),
})
