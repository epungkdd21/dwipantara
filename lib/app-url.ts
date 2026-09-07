const PUBLIC_APP_URL = 'https://dwipantara.jasca.id'

export function getAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim()
  const isLocalUrl = configuredUrl?.startsWith('http://localhost:') || configuredUrl?.startsWith('http://127.0.0.1:')
  return ((isLocalUrl && configuredUrl) ? configuredUrl : PUBLIC_APP_URL).replace(/\/$/, '')
}

export function getTicketUrl(ticketCode: string) {
  return `${getAppUrl()}/ticket/${encodeURIComponent(ticketCode)}`
}