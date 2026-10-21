import { z } from 'zod'

/** Most line items one basket may contain. */
export const BASKET_MAX_ITEMS = 10

/** Fewest packs one basket line may request. */
export const BASKET_MIN_PACKS = 1

/** Most packs one basket line may request. */
export const BASKET_MAX_PACKS = 10

/** Days after which a verified price is shown as possibly outdated. */
export const STALE_AFTER_DAYS = 14

/** Fallback map center when the device does not share a location. */
export const NAGA_CENTER = {
  latitude: 13.6215,
  longitude: 123.1945,
} as const

/** Stock states that count as an available price for ranking. */
const AVAILABLE_STOCK = ['in_stock', 'low_stock'] as const

/** One validated basket line. */
export const basketLineSchema = z.strictObject({
  medicine_id: z.string().min(1).max(64),
  packs: z.number().int().min(BASKET_MIN_PACKS).max(BASKET_MAX_PACKS),
})

/** One validated basket line. */
export type BasketLine = z.infer<typeof basketLineSchema>

/** A validated basket's line items. */
export const basketLinesSchema = z.array(basketLineSchema).min(1)

/** A validated basket's line items. */
export type BasketLines = z.infer<typeof basketLinesSchema>

/** A validated distance origin. */
export const originSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

/** A validated distance origin. */
export type Origin = z.infer<typeof originSchema>

/** Ranking orders the results endpoint accepts. */
export const resultSortSchema = z.enum(['price', 'distance'])

/** A ranking order. */
export type ResultSort = z.infer<typeof resultSortSchema>

/** The stock states a price record may carry. */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown'

/** One opening-hours range in local time. */
export type OpeningRange = {
  open: string
  close: string
}

/** Structured opening hours keyed by a lowercase three-letter weekday. */
export type OpeningHours = Record<string, OpeningRange[]>

/** Pharmacy identity and location, before distance and open-now are resolved. */
export type PharmacyRecord = {
  pharmacy_id: string
  name: string
  brand: string | null
  type: 'chain' | 'independent' | 'public_health_center'
  address: string
  barangay: string | null
  latitude: number
  longitude: number
  phone: string | null
  hours_text: string | null
  opening_hours: OpeningHours | null
  open_24h: boolean
  verification_status: 'verified' | 'unverified'
}

/** Pharmacy identity with the per-request distance and open state. */
export type PharmacySummary = PharmacyRecord & {
  distance_m: number
  open_now: boolean | null
}

/** The MDRP comparison the API exposes next to an observed price. */
export type MdrpInfo = {
  entry_id: string
  order: string
  annex_row: number
  ceiling_php: number
  ceiling_basis: 'per_unit' | 'per_pack'
  ceiling_unit: string | null
  vat_exclusive: boolean
  observed_pack_price_php: number
  observed_unit_price_php: number | null
  above: boolean
  source_url: string
  checked_at: string
}

/** One pharmacy's stored price for one basket item. */
export type PriceFacts = {
  medicine_id: string
  pharmacy_id: string
  shelf_price_php: number
  pack_size: string
  pack_quantity: number | null
  pack_unit: string | null
  unit_price_php: number | null
  stock_status: StockStatus
  verified_at: string
  stale: boolean
  mdrp: MdrpInfo | null
}

/** The price line the public contract exposes, without its internal pharmacy id. */
export type PriceLine = Omit<PriceFacts, 'pharmacy_id'>

/** One stored candidate generic alternative. */
export type AlternativeFacts = {
  medicine_id: string
  brand_name: string
  manufacturer: string | null
  pack_size: string | null
  rx_otc: 'Rx' | 'OTC'
  fda_registration_no: string | null
  note: string | null
  display_order: number
}

/** The latest report recorded for one result key. */
export type ReportFacts = {
  result_key: string
  reported_at: string
}

/** The exact-product fields a missing basket item explains. */
export type BasketMedicine = {
  medicine_id: string
  brand_name: string | null
  generic_name: string
  strength: string
  dosage_form: string
}

/** Why a pharmacy cannot supply one basket item. */
export type MissingReason = 'no_price' | 'out_of_stock' | 'stock_unknown'

/** One basket item a pharmacy cannot supply. */
export type MissingItem = BasketMedicine & {
  reason: MissingReason
}

/** A pharmacy that can supply the whole basket. */
export type CompleteResult = {
  result_key: string
  pharmacy: PharmacySummary
  status: 'complete'
  complete: true
  total_shelf_price_php: number
  known_total_php: number
  missing_items: MissingItem[]
  prices: PriceLine[]
  reported: boolean
  reported_at: string | null
}

/** A pharmacy that can supply part of the basket. */
export type IncompleteResult = {
  result_key: string
  pharmacy: PharmacySummary
  status: 'incomplete'
  complete: false
  total_shelf_price_php: null
  known_total_php: number
  missing_items: MissingItem[]
  prices: PriceLine[]
  reported: boolean
  reported_at: string | null
}

/** A pharmacy with no available price for any basket item. */
export type NoPriceResult = {
  pharmacy: PharmacySummary
}

/** One candidate generic alternative the client displays separately. */
export type CandidateGeneric = {
  brand_name: string
  manufacturer: string | null
  pack_size: string | null
  rx_otc: 'Rx' | 'OTC'
  fda_registration_no: string | null
  note: string
}

/** Candidate generic alternatives for one basket medicine. */
export type CandidateGenericGroup = {
  for_medicine_id: string
  items: CandidateGeneric[]
}

/** The ranked basket result set, before the response envelope is added. */
export type RankedResults = {
  complete: CompleteResult[]
  incomplete: IncompleteResult[]
  no_price_data: NoPriceResult[]
  candidate_generics: CandidateGenericGroup[]
}

/** Local wall-clock values used to decide whether a pharmacy is open. */
export type ManilaClock = {
  isoWeekday: number
  minutesSinceMidnight: number
}

/** Inputs the ranking decision needs, with all I/O already performed. */
export type BuildRankingInput = {
  basket: readonly BasketLine[]
  medicines: readonly BasketMedicine[]
  pharmacies: readonly PharmacyRecord[]
  prices: readonly PriceFacts[]
  alternatives: readonly AlternativeFacts[]
  reports: readonly ReportFacts[]
  origin: Origin
  sort: ResultSort
  clock: ManilaClock
}

/** True when a stock state counts as an available price. */
export function isStockAvailable(status: StockStatus): boolean {
  return (AVAILABLE_STOCK as readonly StockStatus[]).includes(status)
}

/** Convert a peso amount to integer centavos for exact arithmetic. */
export function priceToCents(value: number): number {
  return Math.round(value * 100)
}

/** Convert integer centavos back to a peso amount. */
export function centsToPrice(cents: number): number {
  return Math.round(cents) / 100
}

/** The stable result key a report and the client identify a pharmacy result by. */
export function basketResultKey(
  pharmacyId: string,
  medicineIds: readonly string[],
): string {
  return `${pharmacyId}|${[...medicineIds].sort().join(',')}`
}

/** Great-circle distance in metres between two coordinates. */
export function distanceMetres(origin: Origin, target: Origin): number {
  const earthRadius = 6_371_000
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(target.latitude - origin.latitude)
  const longitudeDelta = toRadians(target.longitude - origin.longitude)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(target.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(a)))
}

function minutesOfDay(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (match === null) {
    return null
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    return null
  }
  return hours * 60 + minutes
}

function rangeContains(range: OpeningRange, minute: number): boolean {
  const open = minutesOfDay(range.open)
  const close = minutesOfDay(range.close)
  if (open === null || close === null) {
    return false
  }
  if (close > open) {
    return minute >= open && minute < close
  }
  if (close < open) {
    return minute >= open || minute < close
  }
  return false
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

/** Resolve open-now from verified structured hours, never from free text. */
export function resolveOpenNow(
  open24h: boolean,
  openingHours: OpeningHours | null,
  clock: ManilaClock,
): boolean | null {
  if (open24h) {
    return true
  }
  if (openingHours === null) {
    return null
  }
  const dayKey = WEEKDAY_KEYS[(clock.isoWeekday - 1 + 7) % 7]
  const ranges = dayKey === undefined ? undefined : openingHours[dayKey]
  if (ranges === undefined) {
    return null
  }
  return ranges.some((range) =>
    rangeContains(range, clock.minutesSinceMidnight),
  )
}

function latestVerifiedAt(prices: readonly { verified_at: string }[]): string {
  let latest = ''
  for (const price of prices) {
    if (price.verified_at > latest) {
      latest = price.verified_at
    }
  }
  return latest
}

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function compareCompleteByPrice(
  left: CompleteResult,
  right: CompleteResult,
): number {
  const total = left.total_shelf_price_php - right.total_shelf_price_php
  if (total !== 0) {
    return total
  }
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  const verified = compareNames(
    latestVerifiedAt(right.prices),
    latestVerifiedAt(left.prices),
  )
  if (verified !== 0) {
    return verified
  }
  return compareNames(left.pharmacy.name, right.pharmacy.name)
}

function compareCompleteByDistance(
  left: CompleteResult,
  right: CompleteResult,
): number {
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  const total = left.total_shelf_price_php - right.total_shelf_price_php
  if (total !== 0) {
    return total
  }
  const verified = compareNames(
    latestVerifiedAt(right.prices),
    latestVerifiedAt(left.prices),
  )
  if (verified !== 0) {
    return verified
  }
  return compareNames(left.pharmacy.name, right.pharmacy.name)
}

function compareIncomplete(
  left: IncompleteResult,
  right: IncompleteResult,
): number {
  const missing = left.missing_items.length - right.missing_items.length
  if (missing !== 0) {
    return missing
  }
  const known = left.known_total_php - right.known_total_php
  if (known !== 0) {
    return known
  }
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  return compareNames(left.pharmacy.name, right.pharmacy.name)
}

function compareNoPrice(left: NoPriceResult, right: NoPriceResult): number {
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  return compareNames(left.pharmacy.name, right.pharmacy.name)
}

function toPharmacySummary(
  pharmacy: PharmacyRecord,
  origin: Origin,
  clock: ManilaClock,
): PharmacySummary {
  const distance = distanceMetres(origin, {
    latitude: pharmacy.latitude,
    longitude: pharmacy.longitude,
  })
  return {
    ...pharmacy,
    distance_m: Math.round(distance),
    open_now: resolveOpenNow(pharmacy.open_24h, pharmacy.opening_hours, clock),
  }
}

function toMissingItem(
  medicine: BasketMedicine,
  reason: MissingReason,
): MissingItem {
  return {
    medicine_id: medicine.medicine_id,
    brand_name: medicine.brand_name,
    generic_name: medicine.generic_name,
    strength: medicine.strength,
    dosage_form: medicine.dosage_form,
    reason,
  }
}

function missingReason(price: PriceFacts): MissingReason {
  return price.stock_status === 'out_of_stock'
    ? 'out_of_stock'
    : 'stock_unknown'
}

function toPriceLine(price: PriceFacts): PriceLine {
  return {
    medicine_id: price.medicine_id,
    shelf_price_php: price.shelf_price_php,
    pack_size: price.pack_size,
    pack_quantity: price.pack_quantity,
    pack_unit: price.pack_unit,
    unit_price_php: price.unit_price_php,
    stock_status: price.stock_status,
    verified_at: price.verified_at,
    stale: price.stale,
    mdrp: price.mdrp,
  }
}

function buildCandidateGenerics(
  basket: readonly BasketLine[],
  alternatives: readonly AlternativeFacts[],
): CandidateGenericGroup[] {
  const groups: CandidateGenericGroup[] = []
  for (const line of basket) {
    const items = alternatives
      .filter((alternative) => alternative.medicine_id === line.medicine_id)
      .sort(
        (left, right) =>
          left.display_order - right.display_order ||
          compareNames(left.brand_name, right.brand_name),
      )
    if (items.length === 0) {
      continue
    }
    groups.push({
      for_medicine_id: line.medicine_id,
      items: items.map((item) => ({
        brand_name: item.brand_name,
        manufacturer: item.manufacturer,
        pack_size: item.pack_size,
        rx_otc: item.rx_otc,
        fda_registration_no: item.fda_registration_no,
        note:
          item.note ??
          'Candidate generic alternative; not a therapeutic-equivalence claim.',
      })),
    })
  }
  return groups
}

/**
 * Build the complete, incomplete, and no-price result groups once.
 *
 * Ranking is the contract in data-contract section 4.5: complete baskets by
 * total shelf price, then distance, then most recently verified, then name.
 * Above-MDRP prices are flagged on their line and do not change the order.
 */
export function buildRankedResults(input: BuildRankingInput): RankedResults {
  const pricesByPharmacy = new Map<string, PriceFacts[]>()
  for (const price of input.prices) {
    const list = pricesByPharmacy.get(price.pharmacy_id)
    if (list === undefined) {
      pricesByPharmacy.set(price.pharmacy_id, [price])
    } else {
      list.push(price)
    }
  }

  const medicineById = new Map(
    input.medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const reportsByKey = new Map(
    input.reports.map((report) => [report.result_key, report.reported_at]),
  )

  const complete: CompleteResult[] = []
  const incomplete: IncompleteResult[] = []
  const noPriceData: NoPriceResult[] = []

  for (const pharmacy of input.pharmacies) {
    const pharmacyPrices = pricesByPharmacy.get(pharmacy.pharmacy_id) ?? []
    const priceByMedicine = new Map(
      pharmacyPrices.map((price) => [price.medicine_id, price]),
    )
    const prices: PriceLine[] = []
    const missing: MissingItem[] = []
    let knownCents = 0
    let availableCount = 0

    for (const line of input.basket) {
      const price = priceByMedicine.get(line.medicine_id)
      const medicine = medicineById.get(line.medicine_id)
      if (medicine === undefined) {
        continue
      }
      if (price === undefined) {
        missing.push(toMissingItem(medicine, 'no_price'))
        continue
      }

      prices.push(toPriceLine(price))
      if (!isStockAvailable(price.stock_status)) {
        missing.push(toMissingItem(medicine, missingReason(price)))
        continue
      }

      availableCount += 1
      knownCents += priceToCents(price.shelf_price_php) * line.packs
    }

    const summary = toPharmacySummary(pharmacy, input.origin, input.clock)
    const resultKey = basketResultKey(
      pharmacy.pharmacy_id,
      input.basket.map((line) => line.medicine_id),
    )
    const reportedAt = reportsByKey.get(resultKey) ?? null
    const reported = reportedAt !== null
    const knownTotal = centsToPrice(knownCents)

    if (availableCount === 0) {
      noPriceData.push({ pharmacy: summary })
      continue
    }

    if (availableCount === input.basket.length) {
      complete.push({
        result_key: resultKey,
        pharmacy: summary,
        status: 'complete',
        complete: true,
        total_shelf_price_php: knownTotal,
        known_total_php: knownTotal,
        missing_items: [],
        prices,
        reported,
        reported_at: reportedAt,
      })
      continue
    }

    incomplete.push({
      result_key: resultKey,
      pharmacy: summary,
      status: 'incomplete',
      complete: false,
      total_shelf_price_php: null,
      known_total_php: knownTotal,
      missing_items: missing,
      prices,
      reported,
      reported_at: reportedAt,
    })
  }

  complete.sort(
    input.sort === 'distance'
      ? compareCompleteByDistance
      : compareCompleteByPrice,
  )
  incomplete.sort(compareIncomplete)
  noPriceData.sort(compareNoPrice)

  return {
    complete,
    incomplete,
    no_price_data: noPriceData,
    candidate_generics: buildCandidateGenerics(
      input.basket,
      input.alternatives,
    ),
  }
}

/** The cheapest complete result, independent of the active sort order. */
export function cheapestCompleteResultKey(
  complete: readonly {
    result_key: string
    total_shelf_price_php: number
    pharmacy: { name: string; distance_m: number }
  }[],
): string | null {
  let cheapest: (typeof complete)[number] | null = null
  for (const result of complete) {
    if (cheapest === null) {
      cheapest = result
      continue
    }
    const total = result.total_shelf_price_php - cheapest.total_shelf_price_php
    if (total < 0) {
      cheapest = result
      continue
    }
    if (
      total === 0 &&
      (result.pharmacy.distance_m < cheapest.pharmacy.distance_m ||
        (result.pharmacy.distance_m === cheapest.pharmacy.distance_m &&
          compareNames(result.pharmacy.name, cheapest.pharmacy.name) < 0))
    ) {
      cheapest = result
    }
  }
  return cheapest?.result_key ?? null
}
