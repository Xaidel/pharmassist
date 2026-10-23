/** One pharmacy's lowest available per-base-unit price for one medicine. */
export type PharmacyUnitRate = {
  pharmacy_id: string
  medicine_id: string
  unit_rate_php: number
}

/**
 * Share of the best-covered pharmacy's priced medicines another pharmacy must
 * also price before it can be called cheapest overall.
 */
export const CHEAPEST_OVERALL_MIN_COVERAGE = 0.5

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle] ?? 0
  if (sorted.length % 2 === 1) {
    return upper
  }
  return ((sorted[middle - 1] ?? upper) + upper) / 2
}

/**
 * Pick the pharmacy whose prices run lowest across the catalog, before any
 * basket exists.
 *
 * Each medicine priced at two or more eligible pharmacies contributes the
 * ratio of a pharmacy's unit rate to that medicine's median rate. The pharmacy
 * with the lowest median ratio wins, provided it prices enough medicines; ties
 * resolve by pharmacy id. Returns null when no pharmacy qualifies.
 */
export function cheapestOverallPharmacyId(
  rates: readonly PharmacyUnitRate[],
  eligiblePharmacyIds: ReadonlySet<string>,
): string | null {
  const byMedicine = new Map<string, PharmacyUnitRate[]>()
  for (const rate of rates) {
    if (!eligiblePharmacyIds.has(rate.pharmacy_id) || rate.unit_rate_php <= 0) {
      continue
    }
    const list = byMedicine.get(rate.medicine_id)
    if (list === undefined) {
      byMedicine.set(rate.medicine_id, [rate])
    } else {
      list.push(rate)
    }
  }

  const ratios = new Map<string, number[]>()
  for (const list of byMedicine.values()) {
    if (list.length < 2) {
      continue
    }
    const reference = median(list.map((rate) => rate.unit_rate_php))
    for (const rate of list) {
      const ratio = rate.unit_rate_php / reference
      const pharmacyRatios = ratios.get(rate.pharmacy_id)
      if (pharmacyRatios === undefined) {
        ratios.set(rate.pharmacy_id, [ratio])
      } else {
        pharmacyRatios.push(ratio)
      }
    }
  }

  let bestCoverage = 0
  for (const pharmacyRatios of ratios.values()) {
    bestCoverage = Math.max(bestCoverage, pharmacyRatios.length)
  }
  const minimumCoverage = Math.ceil(
    bestCoverage * CHEAPEST_OVERALL_MIN_COVERAGE,
  )

  let cheapestId: string | null = null
  let cheapestIndex = Number.POSITIVE_INFINITY
  for (const [pharmacyId, pharmacyRatios] of ratios) {
    if (pharmacyRatios.length < minimumCoverage) {
      continue
    }
    const index = median(pharmacyRatios)
    if (
      index < cheapestIndex ||
      (index === cheapestIndex &&
        cheapestId !== null &&
        pharmacyId.localeCompare(cheapestId) < 0)
    ) {
      cheapestId = pharmacyId
      cheapestIndex = index
    }
  }
  return cheapestId
}
