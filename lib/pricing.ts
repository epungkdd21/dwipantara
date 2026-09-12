function jakartaDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export type PricingRule = {
  startDate: string
  endDate: string
  basePrice: number
  bundles?: Array<{ size: number; price: number; label: string }>
  label: string
}

const PRICING_RULES: PricingRule[] = [
  {
    startDate: '2026-09-07',
    endDate: '2026-09-11',
    basePrice: 15000,
    bundles: [{ size: 5, price: 50000, label: 'Promo 5 tiket hanya Rp50.000' }],
    label: 'Promo 7-11 Sep',
  },
  {
    startDate: '2026-09-12',
    endDate: '2026-09-13',
    basePrice: 15000,
    label: 'Harga normal 12-13 Sep',
  },
  {
    startDate: '2026-09-14',
    endDate: '2026-09-28',
    basePrice: 16500,
    bundles: [{ size: 5, price: 65000, label: 'Bundling 5 tiket Rp65.000' }],
    label: 'Harga naik 14-28 Sep dengan bundling',
  },
  {
    startDate: '2026-09-29',
    endDate: '2026-10-04',
    basePrice: 16500,
    label: 'Harga normal 29 Sep-4 Okt',
  },
  {
    startDate: '2026-10-05',
    endDate: '2026-10-09',
    basePrice: 16500,
    bundles: [
      { size: 5, price: 75000, label: 'Family 5 tiket Rp75.000' },
      { size: 2, price: 30000, label: 'Couples 2 tiket Rp30.000' },
    ],
    label: 'Harga dengan family & couples 5-9 Okt',
  },
  {
    startDate: '2026-10-10',
    endDate: '2026-10-21',
    basePrice: 21000,
    bundles: [
      { size: 10, price: 165000, label: 'Group 10 tiket Rp165.000' },
      { size: 5, price: 85000, label: 'Family 5 tiket Rp85.000' },
      { size: 3, price: 50000, label: 'Triples 3 tiket Rp50.000' },
      { size: 2, price: 38000, label: 'Doubles 2 tiket Rp38.000' },
    ],
    label: 'Harga premium 10-21 Okt dengan bundling lengkap',
  },
]

export function getActivePricingRule(date = new Date()): PricingRule {
  const dateStr = jakartaDate(date)
  const rule = PRICING_RULES.find((r) => dateStr >= r.startDate && dateStr <= r.endDate)
  return rule || { startDate: '', endDate: '', basePrice: 16500, label: 'Default (harga terakhir)' }
}

export function calculateTicketTotal(quantity: number, date = new Date()): { total: number; rule: PricingRule; bundleBreakdown?: string } {
  const rule = getActivePricingRule(date)
  let total = 0
  let breakdown = ''

  if (!rule.bundles || rule.bundles.length === 0) {
    total = quantity * rule.basePrice
  } else {
    let remaining = quantity
    total = 0
    const bundles = [...rule.bundles].sort((a, b) => b.size - a.size)

    for (const bundle of bundles) {
      const bundleCount = Math.floor(remaining / bundle.size)
      if (bundleCount > 0) {
        total += bundleCount * bundle.price
        remaining -= bundleCount * bundle.size
        if (breakdown) breakdown += ', '
        breakdown += `${bundleCount}x ${bundle.label}`
      }
    }

    total += remaining * rule.basePrice
  }

  return { total, rule, bundleBreakdown: breakdown || undefined }
}

export function getPromoText(rule: PricingRule): string | null {
  if (!rule.bundles || rule.bundles.length === 0) return null
  return rule.bundles.map((b) => b.label).join(' atau ')
}
