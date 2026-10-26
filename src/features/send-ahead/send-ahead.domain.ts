import type { BaseUnit } from '#/shared/domain/medicine-summary'

/** Most line items one send-ahead reservation may contain. */
export const SEND_AHEAD_MAX_ITEMS = 10

/** Largest base-unit quantity one reservation line may request. */
export const SEND_AHEAD_MAX_QUANTITY = 100_000

/** How long a reservation stays resolvable before it expires. */
export const SEND_AHEAD_TTL_MS = 24 * 60 * 60 * 1000

/** The human-presented prefix every reference code carries. */
export const SEND_AHEAD_REFERENCE_PREFIX = 'SA-'

/** Characters after the prefix in a generated reference code. */
export const SEND_AHEAD_REFERENCE_LENGTH = 6

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** True when a base unit is counted in whole units rather than measured. */
export function isCountableUnit(unit: BaseUnit): boolean {
  return unit !== 'mL' && unit !== 'g'
}

function hasAtMostThreeDecimals(value: number): boolean {
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6
}

/** True when a quantity satisfies the list rules for the given base unit. */
export function isValidQuantity(quantity: number, unit: BaseUnit): boolean {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return false
  }
  if (quantity > SEND_AHEAD_MAX_QUANTITY) {
    return false
  }
  return isCountableUnit(unit)
    ? Number.isInteger(quantity)
    : hasAtMostThreeDecimals(quantity)
}

/**
 * Build a `SA-`-prefixed reference code from an injected random source.
 *
 * The alphabet omits visually confusable characters (no `0`, `O`, `1`, `I`, or
 * `L`). The random source returns an integer in `[0, maxExclusive)`.
 */
export function generateReferenceCode(
  randomInt: (maxExclusive: number) => number,
): string {
  let code = ''
  for (let index = 0; index < SEND_AHEAD_REFERENCE_LENGTH; index += 1) {
    const character = REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]
    if (character === undefined) {
      throw new Error(
        'The reference-code random source returned an invalid index',
      )
    }
    code += character
  }
  return `${SEND_AHEAD_REFERENCE_PREFIX}${code}`
}

/** The instant a reservation created at `nowMs` expires, in epoch milliseconds. */
export function computeExpiresAtMs(nowMs: number): number {
  return nowMs + SEND_AHEAD_TTL_MS
}

/** One formatted line of the reservation list for the SMS message. */
export type ReservationMessageInput = {
  referenceCode: string
  pharmacyName: string
  itemLines: readonly string[]
  expiresAtLabel: string
}

/**
 * Compose the plain-text reservation message the patient sends by SMS.
 *
 * The item lines and expiry are pre-formatted by the caller, so this stays
 * presentation-free and testable.
 */
export function composeReservationMessage(
  input: ReservationMessageInput,
): string {
  const lines = [
    `Send-ahead request ${input.referenceCode}`,
    input.pharmacyName,
    '',
    'Items:',
    ...input.itemLines.map((line) => `- ${line}`),
    '',
    `Reserve until ${input.expiresAtLabel}`,
    '',
    'Please pre-bag these before I arrive. Prices are indicative and do not hold or guarantee stock.',
  ]
  return lines.join('\n')
}
