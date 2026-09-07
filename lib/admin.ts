import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { hasKioskAccess } from '@/lib/security'

export type AdminRole = 'admin' | 'operator'

function parseEmails(value: string | undefined) {
  return new Set((value ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean))
}

export async function requireAdminRole() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) return null
  const email = session.user.email.toLowerCase()
  const operatorEmails = parseEmails(process.env.ADMIN_OPERATOR_EMAILS)
  const adminEmails = parseEmails(process.env.ADMIN_EMAILS)
  if (!operatorEmails.has(email) && !adminEmails.has(email)) return null
  const role: AdminRole = operatorEmails.has(email) && !adminEmails.has(email) ? 'operator' : 'admin'
  return { session, role }
}

export async function requireCheckinAccess() {
  if (await hasKioskAccess()) return { role: 'operator' as const, source: 'kiosk' as const }
  const adminAccess = await requireAdminRole()
  return adminAccess ? { ...adminAccess, source: 'account' as const } : null
}

export function canEditContent(role: AdminRole) { return role === 'admin' }
