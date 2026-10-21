import { ToolingError } from '../db/database'

import type { MdrpCeilingSeed, MedicineSeed, PriceSeed } from './fixture'

type MdrpMatchCandidate = Pick<
  MedicineSeed,
  'generic_name' | 'strength' | 'dosage_form'
>

function normalizeMolecule(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** The molecule set is the generic name's `+`-separated parts, salts stripped. */
export function moleculesFromGenericName(genericName: string): string[] {
  return genericName
    .replace(/\([^)]*\)/g, ' ')
    .split('+')
    .map(normalizeMolecule)
    .filter((value) => value.length > 0)
}

/** Strength components are order-insensitive and whitespace-normalized. */
export function normalizeStrength(strength: string): string {
  return strength
    .split('+')
    .map((part) =>
      part.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim(),
    )
    .sort()
    .join(' + ')
}

export function normalizeDosageForm(dosageForm: string): string {
  return dosageForm
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function moleculeKey(values: readonly string[]): string {
  return [
    ...new Set(
      values.map(normalizeMolecule).filter((value) => value.length > 0),
    ),
  ]
    .sort()
    .join('|')
}

function identityMatches(
  medicine: MdrpMatchCandidate,
  ceilings: readonly MdrpCeilingSeed[],
): MdrpCeilingSeed[] {
  const medicineMolecules = moleculeKey(
    moleculesFromGenericName(medicine.generic_name),
  )
  if (medicineMolecules === '') {
    return []
  }

  return ceilings.filter((ceiling) => {
    if (ceiling.dosage_form === null) {
      return false
    }
    if (moleculeKey(ceiling.molecules) !== medicineMolecules) {
      return false
    }
    if (
      normalizeStrength(ceiling.strength) !==
      normalizeStrength(medicine.strength)
    ) {
      return false
    }
    return (
      normalizeDosageForm(ceiling.dosage_form) ===
      normalizeDosageForm(medicine.dosage_form)
    )
  })
}

function parsePublishedPack(
  packSize: string,
): { quantity: number; unit: string } | null {
  const match = /^([0-9]+(?:\.[0-9]+)?)\s*(\S+)?/.exec(packSize.trim())
  if (match === null) {
    return null
  }
  const quantity = Number(match[1])
  const unitToken = match[2]?.toLowerCase()
  if (!Number.isFinite(quantity) || unitToken === undefined) {
    return null
  }
  const units: Record<string, string> = {
    ml: 'mL',
    tablet: 'tablet',
    tablets: 'tablet',
    capsule: 'capsule',
    capsules: 'capsule',
    sachet: 'sachet',
    sachets: 'sachet',
    g: 'g',
  }
  return { quantity, unit: units[unitToken] ?? unitToken }
}

function packMatches(ceiling: MdrpCeilingSeed, price: PriceSeed): boolean {
  if (ceiling.price_basis !== 'per_pack' || ceiling.pack_size === null) {
    return false
  }
  if (price.sale_form !== 'pack') {
    return false
  }
  const published = parsePublishedPack(ceiling.pack_size)
  if (published === null) {
    return false
  }
  return (
    published.quantity === price.pack_quantity &&
    published.unit === price.pack_unit
  )
}

/**
 * Find the published ceiling that matches a medicine's identity exactly on
 * molecule set, strength, and dosage form. A component never inherits a
 * combination ceiling. Pack matching is applied per observation.
 */
export function findExactMdrpCeiling(
  medicine: MdrpMatchCandidate,
  ceilings: readonly MdrpCeilingSeed[],
): MdrpCeilingSeed | null {
  const matches = identityMatches(medicine, ceilings)
  if (matches.length > 1) {
    throw new ToolingError(
      'AMBIGUOUS_MDRP_MATCH',
      `Medicine ${medicine.generic_name} ${medicine.strength} matches more than one ceiling: ${matches
        .map((match) => match.id)
        .join(', ')}`,
    )
  }
  return matches[0] ?? null
}

function observationKey(price: PriceSeed): string {
  return `${price.medicine_id}\u0000${price.pharmacy_id}\u0000${price.sale_form}`
}

/** Compute the ceiling each observation must carry, if any. */
export function expectedMdrpAttachments(
  medicines: readonly MedicineSeed[],
  ceilings: readonly MdrpCeilingSeed[],
  prices: readonly PriceSeed[],
): Map<string, string | null> {
  const medicineById = new Map(
    medicines.map((medicine) => [medicine.id, medicine]),
  )
  const attachments = new Map<string, string | null>()

  for (const price of prices) {
    if (price.sale_state !== 'available') {
      attachments.set(observationKey(price), null)
      continue
    }
    const medicine = medicineById.get(price.medicine_id)
    if (medicine === undefined) {
      throw new ToolingError(
        'SEED_VALIDATION',
        `Price references unknown medicine ${price.medicine_id}`,
      )
    }

    const matches = identityMatches(medicine, ceilings).filter((ceiling) =>
      ceiling.price_basis === 'per_unit' ? true : packMatches(ceiling, price),
    )
    if (matches.length > 1) {
      throw new ToolingError(
        'AMBIGUOUS_MDRP_MATCH',
        `Observation ${price.medicine_id}/${price.pharmacy_id}/${price.sale_form} matches more than one ceiling: ${matches
          .map((match) => match.id)
          .join(', ')}`,
      )
    }
    attachments.set(observationKey(price), matches[0]?.id ?? null)
  }

  return attachments
}
