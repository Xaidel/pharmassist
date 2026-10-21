import { z } from 'zod'

/**
 * Currency codes this value object supports.
 *
 * Every code here has a two-decimal minor unit, which is what makes `amountMinor`
 * arithmetic meaningful across the set. Zero-decimal currencies are deliberately
 * excluded: `amountMinor` would silently mean "yen" in one place and "cents" in
 * another, so a zero-decimal currency needs a different value object rather than a
 * wider enum. A derived application that needs one records that decision and adds the
 * code together with its own representation.
 */
export const CurrencyCodeSchema = z.enum([
  'AUD',
  'CAD',
  'CHF',
  'DKK',
  'EUR',
  'GBP',
  'NOK',
  'SEK',
  'USD',
])

/** Supported currency code. */
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>

/**
 * Monetary amount in minor units for its currency, such as cents for USD.
 * Kept as a plain object so it crosses server functions and SSR unchanged.
 */
export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: CurrencyCodeSchema,
})

/** Monetary amount in minor units. */
export type Money = z.infer<typeof MoneySchema>

/** Builds the zero amount for one currency, such as an order total before any line. */
export function zeroMoney(currency: CurrencyCode): Money {
  return { amountMinor: 0, currency }
}

/**
 * Sums amounts of one currency.
 *
 * Both an empty list and a mixed list are refused rather than guessed at. There is no
 * default currency to invent for the first, and adding two different currencies has no
 * meaning for the second — returning a plausible number would hide a pricing bug. A
 * caller that legitimately has no amount says so with {@link zeroMoney}, which names
 * the currency explicitly.
 */
export function sumMoney(amounts: readonly Money[]): Money {
  const [first] = amounts
  if (!first) {
    throw new Error(
      'Cannot sum an empty list: use zeroMoney to state the currency of no amount.',
    )
  }
  if (amounts.some((amount) => amount.currency !== first.currency)) {
    throw new Error(
      `Cannot sum mixed currencies: expected ${first.currency}, received ${amounts
        .map((amount) => amount.currency)
        .join(', ')}.`,
    )
  }

  return {
    amountMinor: amounts.reduce<number>(
      (sum, amount) => sum + amount.amountMinor,
      0,
    ),
    currency: first.currency,
  }
}

/** Multiplies one amount by a whole quantity. */
export function multiplyMoney(money: Money, quantity: number): Money {
  return {
    ...money,
    amountMinor: money.amountMinor * quantity,
  }
}

/** Formats an amount for display in its currency. */
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountMinor / 100)
}
