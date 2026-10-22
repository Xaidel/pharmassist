import type { BaseUnit } from '#/shared/domain/medicine-summary'

/** Most line items one basket may contain. */
export const BASKET_MAX_ITEMS = 10

/** Smallest base-unit quantity one basket line may request. */
export const BASKET_MIN_QUANTITY = 1

/** Largest base-unit quantity one basket line may request. */
export const BASKET_MAX_QUANTITY = 100_000

/** Days after which a verified price is shown as possibly outdated. */
export const STALE_AFTER_DAYS = 14

/** True when a base unit is counted in whole units rather than measured. */
export function isCountableUnit(unit: BaseUnit): boolean {
  return unit !== 'mL' && unit !== 'g'
}

function hasAtMostThreeDecimals(value: number): boolean {
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6
}

/** True when a quantity satisfies the basket rules for the given base unit. */
export function isValidBasketQuantity(
  quantity: number,
  unit: BaseUnit,
): boolean {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return false
  }
  if (quantity > BASKET_MAX_QUANTITY) {
    return false
  }
  return isCountableUnit(unit)
    ? Number.isInteger(quantity)
    : hasAtMostThreeDecimals(quantity)
}

/** Fallback map center when the device does not share a location. */
export const NAGA_CENTER = {
  latitude: 13.6215,
  longitude: 123.1945,
} as const

/** The sale forms a pharmacy may offer for one medicine. */
export const SALE_FORMS = ['pack', 'strip', 'loose'] as const

/** A sale form a pharmacy may offer for one medicine. */
export type SaleForm = (typeof SALE_FORMS)[number]

/** The order sale forms are listed in. */
export const SALE_FORM_ORDER: Record<SaleForm, number> = {
  pack: 0,
  strip: 1,
  loose: 2,
}

/** The states a pharmacy's sale form may carry. */
export type SaleState =
  'available' | 'pack_only' | 'not_applicable' | 'not_stocked' | 'unknown'

/** The stock states an available sale form may carry. */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown'

/** One validated basket line. */
export type BasketLine = {
  medicine_id: string
  quantity: number
  unit: BaseUnit
}

/** A validated distance origin. */
export type Origin = {
  latitude: number
  longitude: number
}

/** Ranking orders the results endpoint accepts. */
export type ResultSort = 'price' | 'distance'

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

/** The basis an MDRP comparison uses. */
export type MdrpRateBasis =
  'loose_price' | 'strip_rate' | 'box_rate' | 'pack_price'

/** The MDRP comparison the API exposes next to an observed form price. */
export type MdrpInfo = {
  entry_id: string
  order: string
  annex_row: number
  ceiling_php: number
  effective_ceiling_php: number
  ceiling_basis: 'per_unit' | 'per_pack'
  ceiling_unit: string | null
  vat_exclusive: boolean
  vat_exempt: boolean | null
  observed_rate_php: number
  rate_basis: MdrpRateBasis
  above: boolean
  source_url: string
  checked_at: string
}

/** One pharmacy's offer of a sale form for one medicine. */
export type SaleFormOffer = {
  sale_form: SaleForm
  sale_state: SaleState
  form_label: string | null
  pack_quantity: number | null
  pack_unit: BaseUnit | null
  shelf_price_php: number | null
  stock_status: StockStatus | null
  verified_at: string | null
  stale: boolean | null
  mdrp: MdrpInfo | null
}

/** One form offer with the identities the repository read it by. */
export type StoredFormOffer = SaleFormOffer & {
  medicine_id: string
  pharmacy_id: string
}

/** One chosen sale form in an exact fulfillment. */
export type FulfillmentComponent = {
  sale_form: SaleForm
  form_label: string
  pack_quantity: number
  pack_unit: BaseUnit
  count: number
  shelf_price_php: number
  line_total_php: number
  stock_status: StockStatus
  verified_at: string
  stale: boolean
  mdrp: MdrpInfo | null
}

/** The copy key for a covering purchase. */
export type PackOnlyCopy =
  'sold_per_pack_only' | 'sold_by_the_pack' | 'sold_by_the_strip'

/** The cheapest covering purchase for an item with no exact combination. */
export type PackOnlyLine = {
  medicine_id: string
  quantity: number
  unit: BaseUnit
  sale_form: 'pack' | 'strip'
  form_label: string
  pack_quantity: number
  pack_unit: BaseUnit
  shelf_price_php: number
  buy_quantity: number
  covers_quantity: number
  covering_total_php: number
  stock_status: StockStatus
  stale: boolean
  copy: PackOnlyCopy
}

/** One stored candidate generic alternative. */
export type AlternativeFacts = {
  medicine_id: string
  brand_name: string
  manufacturer: string | null
  reference_pack_size: string | null
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
export type MissingReason =
  'not_stocked' | 'out_of_stock' | 'stock_unknown' | 'no_price'

/** One basket item outcome at one pharmacy. */
export type ItemOutcome = 'exact' | 'sold_per_pack_only' | MissingReason

/** One basket item a pharmacy cannot supply. */
export type MissingItem = BasketMedicine & {
  reason: MissingReason
}

/** One basket item at one pharmacy with its fulfillment outcome. */
export type ResultBasketItem = {
  medicine_id: string
  quantity: number
  unit: BaseUnit
  outcome: ItemOutcome
  components: FulfillmentComponent[]
  pack_only?: PackOnlyLine
  total_shelf_price_php: number | null
  forms: SaleFormOffer[]
}

/** A pharmacy that can supply the whole basket exactly. */
export type CompleteResult = {
  result_key: string
  pharmacy: PharmacySummary
  status: 'complete'
  complete: true
  items: ResultBasketItem[]
  total_shelf_price_php: number
  known_total_php: number
  covering_total_php: null
  missing_items: MissingItem[]
  above_mdrp_ceiling: boolean
  reported: boolean
  reported_at: string | null
}

/** A pharmacy that stocks every item but cannot supply an exact quantity. */
export type SoldPerPackOnlyResult = {
  result_key: string
  pharmacy: PharmacySummary
  status: 'sold_per_pack_only'
  complete: false
  items: ResultBasketItem[]
  total_shelf_price_php: null
  known_total_php: number
  covering_total_php: number
  missing_items: MissingItem[]
  above_mdrp_ceiling: boolean
  reported: boolean
  reported_at: string | null
}

/** A pharmacy that can supply only part of the basket. */
export type IncompleteResult = {
  result_key: string
  pharmacy: PharmacySummary
  status: 'incomplete'
  complete: false
  items: ResultBasketItem[]
  total_shelf_price_php: null
  known_total_php: number
  covering_total_php: number | null
  missing_items: MissingItem[]
  above_mdrp_ceiling: boolean
  reported: boolean
  reported_at: string | null
}

/** A pharmacy with no available form for any basket item. */
export type NoPriceResult = {
  pharmacy: PharmacySummary
}

/** One candidate generic alternative the client displays separately. */
export type CandidateGeneric = {
  brand_name: string
  manufacturer: string | null
  reference_pack_size: string | null
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
  sold_per_pack_only: SoldPerPackOnlyResult[]
  incomplete: IncompleteResult[]
  no_price_data: NoPriceResult[]
  candidate_generics: CandidateGenericGroup[]
}

/** One pharmacy's basket outcome before it is placed in a ranked bucket. */
export type PharmacyBasketOutcome = {
  items: ResultBasketItem[]
  status: 'complete' | 'sold_per_pack_only' | 'incomplete'
  complete: boolean
  total_shelf_price_php: number | null
  known_total_php: number
  covering_total_php: number | null
  missing_items: MissingItem[]
  above_mdrp_ceiling: boolean
  no_price_data: boolean
}

/** Local wall-clock values used to decide whether a pharmacy is open. */
export type ManilaClock = {
  isoWeekday: number
  minutesSinceMidnight: number
}

/** Inputs the pharmacy basket decision needs, with all I/O already performed. */
export type BuildPharmacyBasketInput = {
  basket: readonly BasketLine[]
  medicines: readonly BasketMedicine[]
  forms: readonly StoredFormOffer[]
}

/** Inputs the ranking decision needs, with all I/O already performed. */
export type BuildRankingInput = {
  basket: readonly BasketLine[]
  medicines: readonly BasketMedicine[]
  pharmacies: readonly PharmacyRecord[]
  forms: readonly StoredFormOffer[]
  alternatives: readonly AlternativeFacts[]
  reports: readonly ReportFacts[]
  origin: Origin
  sort: ResultSort
  clock: ManilaClock
}

type SellableForm = SaleFormOffer & {
  shelf_price_php: number
  pack_quantity: number
  pack_unit: BaseUnit
  stock_status: StockStatus
  verified_at: string
  stale: boolean
}

type FormCounts = {
  pack: number
  strip: number
  loose: number
}

type ExactCandidate = {
  counts: FormCounts
  totalCents: number
}

/** The cheapest covering purchase for an item with no exact combination. */
export type CoveringPurchase = {
  form: SaleFormOffer
  buyQuantity: number
  coversQuantity: number
  coveringTotalPhp: number
  copy: PackOnlyCopy
}

const MILLI = 1000

function isoWeekdayFromName(value: string): number {
  switch (value) {
    case 'Mon':
      return 1
    case 'Tue':
      return 2
    case 'Wed':
      return 3
    case 'Thu':
      return 4
    case 'Fri':
      return 5
    case 'Sat':
      return 6
    case 'Sun':
      return 7
    default:
      return 0
  }
}

/** Convert an instant into the Manila wall clock the opening hours use. */
export function manilaClock(now: Date): ManilaClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const weekday = values.get('weekday') ?? ''
  const isoWeekday = isoWeekdayFromName(weekday)
  if (isoWeekday === 0) {
    throw new Error(`Unexpected weekday from Intl: ${weekday}`)
  }
  return {
    isoWeekday,
    minutesSinceMidnight:
      Number(values.get('hour') ?? '0') * 60 +
      Number(values.get('minute') ?? '0'),
  }
}

/** True when a form is available and can fulfill a quantity. */
export function isSellableForm(form: SaleFormOffer): boolean {
  return (
    form.sale_state === 'available' &&
    (form.stock_status === 'in_stock' || form.stock_status === 'low_stock')
  )
}

function sellableForms(forms: readonly SaleFormOffer[]): SellableForm[] {
  return forms.filter(
    (form): form is SellableForm =>
      isSellableForm(form) &&
      form.shelf_price_php !== null &&
      form.pack_quantity !== null &&
      form.pack_unit !== null &&
      form.verified_at !== null &&
      form.stale !== null,
  )
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

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function formSizeMilli(form: SaleFormOffer): number | null {
  return form.pack_quantity === null
    ? null
    : Math.round(form.pack_quantity * MILLI)
}

function isBetterCandidate(
  candidate: ExactCandidate,
  current: ExactCandidate,
): boolean {
  if (candidate.totalCents !== current.totalCents) {
    return candidate.totalCents < current.totalCents
  }
  for (const form of SALE_FORMS) {
    if (candidate.counts[form] !== current.counts[form]) {
      return candidate.counts[form] < current.counts[form]
    }
  }
  return false
}

function toChoices(
  candidate: ExactCandidate,
  byForm: ReadonlyMap<SaleForm, SellableForm>,
): { form: SaleFormOffer; count: number }[] {
  const choices: { form: SaleFormOffer; count: number }[] = []
  for (const saleForm of SALE_FORMS) {
    const count = candidate.counts[saleForm]
    if (count === 0) {
      continue
    }
    const form = byForm.get(saleForm)
    if (form === undefined) {
      throw new Error(`Chosen form ${saleForm} is not sellable`)
    }
    choices.push({ form, count })
  }
  return choices
}

function pickBestCandidate(
  candidates: readonly ExactCandidate[],
  byForm: ReadonlyMap<SaleForm, SellableForm>,
): { form: SaleFormOffer; count: number }[] | null {
  let best: ExactCandidate | null = null
  for (const candidate of candidates) {
    if (best === null || isBetterCandidate(candidate, best)) {
      best = candidate
    }
  }
  return best === null ? null : toChoices(best, byForm)
}

function candidateTotal(
  counts: FormCounts,
  byForm: ReadonlyMap<SaleForm, SellableForm>,
): ExactCandidate {
  let totalCents = 0
  for (const form of SALE_FORMS) {
    const chosen = byForm.get(form)
    if (chosen === undefined) {
      if (counts[form] !== 0) {
        throw new Error(`Chosen form ${form} is not sellable`)
      }
      continue
    }
    totalCents += counts[form] * priceToCents(chosen.shelf_price_php)
  }
  return { counts, totalCents }
}

/**
 * Find the cheapest exact combination of sellable forms.
 *
 * An exact combination sums non-negative whole counts of forms to the requested
 * quantity. Ties prefer fewer packs, then fewer strips, then fewer loose units.
 */
export function findCheapestExactCombination(
  quantity: number,
  forms: readonly SaleFormOffer[],
): { form: SaleFormOffer; count: number }[] | null {
  const quantityMilli = Math.round(quantity * MILLI)
  if (quantityMilli <= 0) {
    return null
  }

  const sellable = sellableForms(forms)
  const byForm = new Map(sellable.map((form) => [form.sale_form, form]))
  const loose = byForm.get('loose')
  const looseSize = loose === undefined ? null : formSizeMilli(loose)
  const candidates: ExactCandidate[] = []

  const consider = (counts: FormCounts): void => {
    if (counts.pack < 0 || counts.strip < 0 || counts.loose < 0) {
      return
    }
    candidates.push(candidateTotal(counts, byForm))
  }

  if (loose !== undefined && looseSize === MILLI) {
    const pack = byForm.get('pack')
    const strip = byForm.get('strip')
    const loosePrice = priceToCents(loose.shelf_price_php)

    if (pack !== undefined) {
      const packSize = formSizeMilli(pack)
      if (packSize === null || packSize <= 0) {
        return null
      }
      const maxPacks = Math.floor(quantityMilli / packSize)
      for (let packCount = 0; packCount <= maxPacks; packCount += 1) {
        const remaining = quantityMilli - packCount * packSize
        if (strip !== undefined) {
          const stripSize = formSizeMilli(strip)
          if (stripSize === null || stripSize <= 0) {
            continue
          }
          const maxStrips = Math.floor(remaining / stripSize)
          const slope =
            priceToCents(strip.shelf_price_php) * MILLI - stripSize * loosePrice
          const stripCount = slope < 0 ? maxStrips : 0
          consider({
            pack: packCount,
            strip: stripCount,
            loose: (remaining - stripCount * stripSize) / MILLI,
          })
        } else {
          consider({ pack: packCount, strip: 0, loose: remaining / MILLI })
        }
      }
      return pickBestCandidate(candidates, byForm)
    }

    if (strip !== undefined) {
      const stripSize = formSizeMilli(strip)
      if (stripSize === null || stripSize <= 0) {
        return null
      }
      const maxStrips = Math.floor(quantityMilli / stripSize)
      const slope =
        priceToCents(strip.shelf_price_php) * MILLI - stripSize * loosePrice
      const stripCount = slope < 0 ? maxStrips : 0
      consider({
        pack: 0,
        strip: stripCount,
        loose: (quantityMilli - stripCount * stripSize) / MILLI,
      })
      return pickBestCandidate(candidates, byForm)
    }

    if (quantityMilli % MILLI !== 0) {
      return null
    }
    return [{ form: loose, count: quantityMilli / MILLI }]
  }

  const pack = byForm.get('pack')
  const strip = byForm.get('strip')

  if (pack !== undefined && strip !== undefined) {
    const packSize = formSizeMilli(pack)
    const stripSize = formSizeMilli(strip)
    if (packSize === null || stripSize === null) {
      return null
    }
    if (packSize <= 0 || stripSize <= 0) {
      return null
    }
    const maxPacks = Math.floor(quantityMilli / packSize)
    for (let packCount = 0; packCount <= maxPacks; packCount += 1) {
      const remaining = quantityMilli - packCount * packSize
      if (remaining % stripSize !== 0) {
        continue
      }
      consider({ pack: packCount, strip: remaining / stripSize, loose: 0 })
    }
  } else if (pack !== undefined) {
    const packSize = formSizeMilli(pack)
    if (packSize === null || packSize <= 0) {
      return null
    }
    if (quantityMilli % packSize === 0) {
      consider({ pack: quantityMilli / packSize, strip: 0, loose: 0 })
    }
  } else if (strip !== undefined) {
    const stripSize = formSizeMilli(strip)
    if (stripSize === null || stripSize <= 0) {
      return null
    }
    if (quantityMilli % stripSize === 0) {
      consider({ pack: 0, strip: quantityMilli / stripSize, loose: 0 })
    }
  } else if (loose !== undefined) {
    const looseFormSize = formSizeMilli(loose)
    if (
      looseFormSize !== null &&
      looseFormSize > 0 &&
      quantityMilli % looseFormSize === 0
    ) {
      consider({
        pack: 0,
        strip: 0,
        loose: quantityMilli / looseFormSize,
      })
    }
  }

  return pickBestCandidate(candidates, byForm)
}

function packOnlyCopy(
  form: SaleFormOffer,
  forms: readonly SaleFormOffer[],
): PackOnlyCopy {
  if (form.sale_form === 'strip') {
    return 'sold_by_the_strip'
  }
  if (form.sale_form === 'pack') {
    const strip = forms.find((offer) => offer.sale_form === 'strip')
    const loose = forms.find((offer) => offer.sale_form === 'loose')
    return strip?.sale_state === 'not_applicable' &&
      loose?.sale_state === 'not_applicable'
      ? 'sold_by_the_pack'
      : 'sold_per_pack_only'
  }
  return 'sold_per_pack_only'
}

/**
 * Choose the cheapest covering purchase for an item with no exact combination.
 *
 * The purchase repeats one sellable form until it covers the quantity. Ties
 * prefer the pack, then the strip, then the larger form.
 */
export function chooseCoveringPurchase(
  quantity: number,
  forms: readonly SaleFormOffer[],
): CoveringPurchase | null {
  const quantityMilli = Math.round(quantity * MILLI)
  if (quantityMilli <= 0) {
    return null
  }

  let best: CoveringPurchase | null = null
  for (const form of sellableForms(forms)) {
    if (form.sale_form === 'loose') {
      continue
    }
    const formSize = formSizeMilli(form)
    if (formSize === null || formSize <= 0) {
      continue
    }
    const buyQuantity = Math.ceil(quantityMilli / formSize)
    const coveringTotalPhp = centsToPrice(
      buyQuantity * priceToCents(form.shelf_price_php),
    )
    const candidate: CoveringPurchase = {
      form,
      buyQuantity,
      coversQuantity: (buyQuantity * formSize) / MILLI,
      coveringTotalPhp,
      copy: packOnlyCopy(form, forms),
    }
    if (best === null) {
      best = candidate
      continue
    }
    const total = priceToCents(candidate.coveringTotalPhp)
    const bestTotal = priceToCents(best.coveringTotalPhp)
    if (total !== bestTotal) {
      if (total < bestTotal) {
        best = candidate
      }
      continue
    }
    const candidateOrder = SALE_FORM_ORDER[candidate.form.sale_form]
    const bestOrder = SALE_FORM_ORDER[best.form.sale_form]
    if (candidateOrder !== bestOrder) {
      if (candidateOrder < bestOrder) {
        best = candidate
      }
      continue
    }
    if ((candidate.form.pack_quantity ?? 0) > (best.form.pack_quantity ?? 0)) {
      best = candidate
    }
  }
  return best
}

/** Resolve why no sellable form can fulfill an item, or null when one can. */
export function missingReasonFor(
  forms: readonly SaleFormOffer[],
): MissingReason | null {
  if (forms.some(isSellableForm)) {
    return null
  }
  if (
    forms.length > 0 &&
    forms.every((form) => form.sale_state === 'not_stocked')
  ) {
    return 'not_stocked'
  }
  if (
    forms.some(
      (form) =>
        form.sale_state === 'available' && form.stock_status === 'out_of_stock',
    )
  ) {
    return 'out_of_stock'
  }
  if (
    forms.some(
      (form) =>
        form.sale_state === 'available' && form.stock_status === 'unknown',
    )
  ) {
    return 'stock_unknown'
  }
  return 'no_price'
}

/** Resolve a pharmacy's per-request distance and open-now state. */
export function toPharmacySummary(
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

/** Strip the repository identities from one stored form offer. */
export function toSaleFormOffer(form: StoredFormOffer): SaleFormOffer {
  return {
    sale_form: form.sale_form,
    sale_state: form.sale_state,
    form_label: form.form_label,
    pack_quantity: form.pack_quantity,
    pack_unit: form.pack_unit,
    shelf_price_php: form.shelf_price_php,
    stock_status: form.stock_status,
    verified_at: form.verified_at,
    stale: form.stale,
    mdrp: form.mdrp,
  }
}

function sortForms(forms: readonly StoredFormOffer[]): StoredFormOffer[] {
  return [...forms].sort(
    (left, right) =>
      SALE_FORM_ORDER[left.sale_form] - SALE_FORM_ORDER[right.sale_form],
  )
}

function toComponent(choice: {
  form: SaleFormOffer
  count: number
}): FulfillmentComponent {
  const form = choice.form
  if (
    form.form_label === null ||
    form.pack_quantity === null ||
    form.pack_unit === null ||
    form.shelf_price_php === null ||
    form.stock_status === null ||
    form.verified_at === null ||
    form.stale === null
  ) {
    throw new Error('An exact combination chose an incomplete form')
  }
  const lineTotalPhp = centsToPrice(
    choice.count * priceToCents(form.shelf_price_php),
  )
  return {
    sale_form: form.sale_form,
    form_label: form.form_label,
    pack_quantity: form.pack_quantity,
    pack_unit: form.pack_unit,
    count: choice.count,
    shelf_price_php: form.shelf_price_php,
    line_total_php: lineTotalPhp,
    stock_status: form.stock_status,
    verified_at: form.verified_at,
    stale: form.stale,
    mdrp: form.mdrp,
  }
}

function buildBasketItem(
  line: BasketLine,
  medicine: BasketMedicine,
  forms: readonly StoredFormOffer[],
): {
  item: ResultBasketItem
  missing: MissingReason | null
  aboveMdrp: boolean
} {
  const sorted = sortForms(forms)
  const offers = sorted.map(toSaleFormOffer)
  const missing = missingReasonFor(sorted)
  if (missing !== null) {
    return {
      item: {
        medicine_id: line.medicine_id,
        quantity: line.quantity,
        unit: line.unit,
        outcome: missing,
        components: [],
        total_shelf_price_php: null,
        forms: offers,
      },
      missing,
      aboveMdrp: false,
    }
  }

  const combination = findCheapestExactCombination(line.quantity, sorted)
  if (combination !== null) {
    const components = combination.map(toComponent)
    const totalCents = components.reduce(
      (sum, component) => sum + priceToCents(component.line_total_php),
      0,
    )
    return {
      item: {
        medicine_id: line.medicine_id,
        quantity: line.quantity,
        unit: line.unit,
        outcome: 'exact',
        components,
        total_shelf_price_php: centsToPrice(totalCents),
        forms: offers,
      },
      missing: null,
      aboveMdrp: components.some((component) => component.mdrp?.above === true),
    }
  }

  const covering = chooseCoveringPurchase(line.quantity, sorted)
  if (covering === null) {
    return {
      item: {
        medicine_id: line.medicine_id,
        quantity: line.quantity,
        unit: line.unit,
        outcome: 'no_price',
        components: [],
        total_shelf_price_php: null,
        forms: offers,
      },
      missing: 'no_price',
      aboveMdrp: false,
    }
  }

  return {
    item: {
      medicine_id: line.medicine_id,
      quantity: line.quantity,
      unit: line.unit,
      outcome: 'sold_per_pack_only',
      components: [],
      pack_only: {
        medicine_id: line.medicine_id,
        quantity: line.quantity,
        unit: line.unit,
        sale_form: covering.form.sale_form === 'strip' ? 'strip' : 'pack',
        form_label: covering.form.form_label ?? covering.form.sale_form,
        pack_quantity: covering.form.pack_quantity ?? 0,
        pack_unit: covering.form.pack_unit ?? line.unit,
        shelf_price_php: covering.form.shelf_price_php ?? 0,
        buy_quantity: covering.buyQuantity,
        covers_quantity: covering.coversQuantity,
        covering_total_php: covering.coveringTotalPhp,
        stock_status: covering.form.stock_status ?? 'unknown',
        stale: covering.form.stale ?? false,
        copy: covering.copy,
      },
      total_shelf_price_php: null,
      forms: offers,
    },
    missing: null,
    aboveMdrp: covering.form.mdrp?.above === true,
  }
}

/**
 * Build one pharmacy's basket outcome.
 *
 * A pharmacy with no sellable form for any item is marked `no_price_data`; it
 * still carries the item explanations so the pharmacy detail sheet can render.
 */
export function buildPharmacyBasket(
  input: BuildPharmacyBasketInput,
): PharmacyBasketOutcome {
  const medicineById = new Map(
    input.medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )
  const formsByMedicine = new Map<string, StoredFormOffer[]>()
  for (const form of input.forms) {
    const list = formsByMedicine.get(form.medicine_id)
    if (list === undefined) {
      formsByMedicine.set(form.medicine_id, [form])
    } else {
      list.push(form)
    }
  }

  const items: ResultBasketItem[] = []
  const missingItems: MissingItem[] = []
  let exactCents = 0
  let coveringCents = 0
  let anyPackOnly = false
  let availableCount = 0
  let aboveMdrp = false

  for (const line of input.basket) {
    const medicine = medicineById.get(line.medicine_id)
    if (medicine === undefined) {
      throw new Error(`Missing medicine ${line.medicine_id} after validation`)
    }
    const built = buildBasketItem(
      line,
      medicine,
      formsByMedicine.get(line.medicine_id) ?? [],
    )
    items.push(built.item)
    aboveMdrp = aboveMdrp || built.aboveMdrp
    if (built.missing !== null) {
      missingItems.push(toMissingItem(medicine, built.missing))
      continue
    }
    availableCount += 1
    if (
      built.item.outcome === 'exact' &&
      built.item.total_shelf_price_php !== null
    ) {
      exactCents += priceToCents(built.item.total_shelf_price_php)
    }
    if (
      built.item.outcome === 'sold_per_pack_only' &&
      built.item.pack_only !== undefined
    ) {
      anyPackOnly = true
      coveringCents += priceToCents(built.item.pack_only.covering_total_php)
    }
  }

  const knownTotal = centsToPrice(exactCents)
  const noPriceData = availableCount === 0
  const status: PharmacyBasketOutcome['status'] =
    missingItems.length > 0
      ? 'incomplete'
      : items.every((item) => item.outcome === 'exact')
        ? 'complete'
        : 'sold_per_pack_only'
  const complete = status === 'complete'

  return {
    items,
    status,
    complete,
    total_shelf_price_php: complete ? knownTotal : null,
    known_total_php: knownTotal,
    covering_total_php: anyPackOnly
      ? centsToPrice(exactCents + coveringCents)
      : null,
    missing_items: missingItems,
    above_mdrp_ceiling: aboveMdrp,
    no_price_data: noPriceData,
  }
}

function oldestChosenVerifiedAt(items: readonly ResultBasketItem[]): string {
  let oldest = ''
  for (const item of items) {
    for (const component of item.components) {
      if (oldest === '' || component.verified_at < oldest) {
        oldest = component.verified_at
      }
    }
  }
  return oldest
}

function compareMdrpTier(
  left: { above_mdrp_ceiling: boolean },
  right: { above_mdrp_ceiling: boolean },
): number {
  if (left.above_mdrp_ceiling === right.above_mdrp_ceiling) {
    return 0
  }
  return left.above_mdrp_ceiling ? 1 : -1
}

function compareCompleteByPrice(
  left: CompleteResult,
  right: CompleteResult,
): number {
  const tier = compareMdrpTier(left, right)
  if (tier !== 0) {
    return tier
  }
  const total = left.total_shelf_price_php - right.total_shelf_price_php
  if (total !== 0) {
    return total
  }
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  const verified = compareNames(
    oldestChosenVerifiedAt(right.items),
    oldestChosenVerifiedAt(left.items),
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
  const tier = compareMdrpTier(left, right)
  if (tier !== 0) {
    return tier
  }
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  const total = left.total_shelf_price_php - right.total_shelf_price_php
  if (total !== 0) {
    return total
  }
  const verified = compareNames(
    oldestChosenVerifiedAt(right.items),
    oldestChosenVerifiedAt(left.items),
  )
  if (verified !== 0) {
    return verified
  }
  return compareNames(left.pharmacy.name, right.pharmacy.name)
}

function compareSoldByCovering(
  left: SoldPerPackOnlyResult,
  right: SoldPerPackOnlyResult,
): number {
  const total = left.covering_total_php - right.covering_total_php
  if (total !== 0) {
    return total
  }
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  return compareNames(left.pharmacy.name, right.pharmacy.name)
}

function compareSoldByDistance(
  left: SoldPerPackOnlyResult,
  right: SoldPerPackOnlyResult,
): number {
  const distance = left.pharmacy.distance_m - right.pharmacy.distance_m
  if (distance !== 0) {
    return distance
  }
  const total = left.covering_total_php - right.covering_total_php
  if (total !== 0) {
    return total
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
        reference_pack_size: item.reference_pack_size,
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
 * Build the complete, sold-per-pack-only, incomplete, and no-price groups once.
 *
 * Ranking follows data-contract section 4.6: exact baskets by total shelf
 * price, the covering-purchase bucket separately, then incomplete and no-price.
 */
export function buildRankedResults(input: BuildRankingInput): RankedResults {
  const formsByPharmacy = new Map<string, StoredFormOffer[]>()
  for (const form of input.forms) {
    const list = formsByPharmacy.get(form.pharmacy_id)
    if (list === undefined) {
      formsByPharmacy.set(form.pharmacy_id, [form])
    } else {
      list.push(form)
    }
  }

  const reportsByKey = new Map(
    input.reports.map((report) => [report.result_key, report.reported_at]),
  )

  const complete: CompleteResult[] = []
  const soldPerPackOnly: SoldPerPackOnlyResult[] = []
  const incomplete: IncompleteResult[] = []
  const noPriceData: NoPriceResult[] = []

  for (const pharmacy of input.pharmacies) {
    const outcome = buildPharmacyBasket({
      basket: input.basket,
      medicines: input.medicines,
      forms: formsByPharmacy.get(pharmacy.pharmacy_id) ?? [],
    })
    const summary = toPharmacySummary(pharmacy, input.origin, input.clock)
    if (outcome.no_price_data) {
      noPriceData.push({ pharmacy: summary })
      continue
    }

    const resultKey = basketResultKey(
      pharmacy.pharmacy_id,
      input.basket.map((line) => line.medicine_id),
    )
    const reportedAt = reportsByKey.get(resultKey) ?? null
    const reported = reportedAt !== null

    if (outcome.status === 'complete') {
      complete.push({
        result_key: resultKey,
        pharmacy: summary,
        status: 'complete',
        complete: true,
        items: outcome.items,
        total_shelf_price_php: outcome.total_shelf_price_php ?? 0,
        known_total_php: outcome.known_total_php,
        covering_total_php: null,
        missing_items: [],
        above_mdrp_ceiling: outcome.above_mdrp_ceiling,
        reported,
        reported_at: reportedAt,
      })
      continue
    }

    if (outcome.status === 'sold_per_pack_only') {
      soldPerPackOnly.push({
        result_key: resultKey,
        pharmacy: summary,
        status: 'sold_per_pack_only',
        complete: false,
        items: outcome.items,
        total_shelf_price_php: null,
        known_total_php: outcome.known_total_php,
        covering_total_php: outcome.covering_total_php ?? 0,
        missing_items: [],
        above_mdrp_ceiling: outcome.above_mdrp_ceiling,
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
      items: outcome.items,
      total_shelf_price_php: null,
      known_total_php: outcome.known_total_php,
      covering_total_php: outcome.covering_total_php,
      missing_items: outcome.missing_items,
      above_mdrp_ceiling: outcome.above_mdrp_ceiling,
      reported,
      reported_at: reportedAt,
    })
  }

  complete.sort(
    input.sort === 'distance'
      ? compareCompleteByDistance
      : compareCompleteByPrice,
  )
  soldPerPackOnly.sort(
    input.sort === 'distance' ? compareSoldByDistance : compareSoldByCovering,
  )
  incomplete.sort(compareIncomplete)
  noPriceData.sort(compareNoPrice)

  return {
    complete,
    sold_per_pack_only: soldPerPackOnly,
    incomplete,
    no_price_data: noPriceData,
    candidate_generics: buildCandidateGenerics(
      input.basket,
      input.alternatives,
    ),
  }
}

/** The cheapest MDRP-compliant complete result, independent of sort order. */
export function cheapestCompleteResultKey(
  complete: readonly {
    result_key: string
    total_shelf_price_php: number
    above_mdrp_ceiling: boolean
    pharmacy: { name: string; distance_m: number }
  }[],
): string | null {
  let cheapest: (typeof complete)[number] | null = null
  for (const result of complete) {
    if (result.above_mdrp_ceiling) {
      continue
    }
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
