export const STANDARD_TICKET_PRICE = 15000
export const PROMO_BUNDLE_SIZE = 5
export const PROMO_BUNDLE_PRICE = 50000
export const PROMO_START_DATE = '2026-09-07'
export const PROMO_END_DATE = '2026-09-11'

function jakartaDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export function isBundlePromoActive(value = new Date()) {
  const date = jakartaDate(value)
  return date >= PROMO_START_DATE && date <= PROMO_END_DATE
}

export function calculateTicketTotal(quantity: number, value = new Date()) {
  if (!isBundlePromoActive(value)) return quantity * STANDARD_TICKET_PRICE

  const bundles = Math.floor(quantity / PROMO_BUNDLE_SIZE)
  const remainingTickets = quantity % PROMO_BUNDLE_SIZE
  return bundles * PROMO_BUNDLE_PRICE + remainingTickets * STANDARD_TICKET_PRICE
}
