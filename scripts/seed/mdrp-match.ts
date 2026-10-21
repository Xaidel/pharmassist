import { ToolingError } from '../db/database'

import type { MdrpCeilingSeed, MedicineSeed } from './fixture'

type MdrpMatchCandidate = Pick<
  MedicineSeed,
  'generic_name' | 'strength' | 'dosage_form' | 'pack_size'
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

export function normalizePackSize(packSize: string): string {
  return packSize.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim()
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

/**
 * Find the single published ceiling that matches a medicine exactly on molecule set,
 * strength, dosage form, and (when the ceiling states one) pack. A component never
 * inherits a combination ceiling.
 */
export function findExactMdrpCeiling(
  medicine: MdrpMatchCandidate,
  ceilings: readonly MdrpCeilingSeed[],
): MdrpCeilingSeed | null {
  const medicineMolecules = moleculeKey(
    moleculesFromGenericName(medicine.generic_name),
  )
  if (medicineMolecules === '') {
    return null
  }

  const matches = ceilings.filter((ceiling) => {
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
    if (
      normalizeDosageForm(ceiling.dosage_form) !==
      normalizeDosageForm(medicine.dosage_form)
    ) {
      return false
    }
    if (ceiling.price_basis === 'per_pack') {
      if (ceiling.pack_size === null || medicine.pack_size === null) {
        return false
      }
      if (
        normalizePackSize(ceiling.pack_size) !==
        normalizePackSize(medicine.pack_size)
      ) {
        return false
      }
    }
    return true
  })

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

/** Compute the ceiling each medicine's seeded prices must carry. */
export function expectedMdrpAttachments(
  medicines: readonly MedicineSeed[],
  ceilings: readonly MdrpCeilingSeed[],
): Map<string, string | null> {
  return new Map(
    medicines.map((medicine) => [
      medicine.id,
      findExactMdrpCeiling(medicine, ceilings)?.id ?? null,
    ]),
  )
}
