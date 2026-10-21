const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const wholePesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const centavoPesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const verifiedFormatter = new Intl.DateTimeFormat('en-PH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Manila',
})

/** Format a peso amount with centavos. */
export function formatPeso(value: number): string {
  return pesoFormatter.format(value)
}

/** Format a peso amount for a compact map pin or badge. */
export function formatPesoCompact(value: number): string {
  const formatter =
    Math.round(value * 100) % 100 === 0
      ? wholePesoFormatter
      : centavoPesoFormatter
  return formatter.format(value)
}

/** Format a distance in metres as metres or kilometres. */
export function formatDistance(metres: number): string {
  if (metres < 1000) {
    return `${String(Math.round(metres))} m`
  }
  return `${(metres / 1000).toFixed(1)} km`
}

/** Format a route duration in seconds as minutes or hours and minutes. */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) {
    return `${String(minutes)} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0
    ? `${String(hours)} hr`
    : `${String(hours)} hr ${String(remainder)} min`
}

/** Format a verification instant as a short local date. */
export function formatVerified(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp
  }
  return verifiedFormatter.format(parsed)
}

/** Describe the open-now state without inferring it from free text. */
export function formatOpenNow(openNow: boolean | null): string {
  if (openNow === null) {
    return 'Hours not verified'
  }
  return openNow ? 'Open now' : 'Closed now'
}

/** Describe an availability state for one basket item. */
export function formatStockStatus(
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown',
): string {
  switch (status) {
    case 'in_stock':
      return 'In stock'
    case 'low_stock':
      return 'Low stock'
    case 'out_of_stock':
      return 'Out of stock'
    case 'unknown':
      return 'Stock unknown'
  }
}

/** A short missing-item reason for a result card. */
export function formatMissingReason(
  reason: 'no_price' | 'out_of_stock' | 'stock_unknown',
): string {
  switch (reason) {
    case 'no_price':
      return 'No price listed'
    case 'out_of_stock':
      return 'Out of stock'
    case 'stock_unknown':
      return 'Stock unknown'
  }
}
