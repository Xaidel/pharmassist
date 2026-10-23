import {
  formatMdrpRateBasis,
  formatPeso,
  formatSaleForm,
  formatSaleState,
  formatStockStatus,
  formatVerified,
} from '../results.format'
import type { SaleFormOffer } from '../results.schema'

type PriceLineItemProps = {
  offer: SaleFormOffer
}

function vatComparisonCopy(mdrp: NonNullable<SaleFormOffer['mdrp']>): string {
  if (!mdrp.vat_exclusive) {
    return 'The ceiling is VAT-inclusive and compared directly.'
  }
  if (mdrp.vat_exempt === true) {
    return `The ceiling is VAT-exclusive, but this product is VAT-exempt, so it is compared at ${formatPeso(mdrp.effective_ceiling_php)}.`
  }
  if (mdrp.vat_exempt === false) {
    return `The ceiling is VAT-exclusive and this product is VATable, so it is compared at ${formatPeso(mdrp.effective_ceiling_php)} including 12% VAT.`
  }
  return `The ceiling is VAT-exclusive and the product VAT status is unconfirmed, so it is compared at the published ${formatPeso(mdrp.effective_ceiling_php)}.`
}

/**
 * Render one observed sale form as a single row: form and size on the left,
 * price on the right, then stock and check date. The medicine is named once
 * above the list, so rows never repeat it.
 */
export function PriceLineItem({
  offer,
}: PriceLineItemProps): React.JSX.Element {
  const price = offer.sale_state === 'available' ? offer.shelf_price_php : null
  const formName = formatSaleForm(offer.sale_form)
  const detail =
    offer.sale_state === 'available'
      ? offer.form_label
      : formatSaleState(offer.sale_state)
  // "Strip of 10 tablets" already names the form; skip a leading "Strip ·".
  const labelNamesForm =
    offer.sale_state === 'available' &&
    detail?.toLowerCase().startsWith(formName.toLowerCase()) === true

  return (
    <li className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-base">
          {labelNamesForm ? (
            <span className="font-semibold">{detail}</span>
          ) : (
            <>
              <span className="font-semibold">{formName}</span>
              <span className="text-muted-foreground">
                {' · '}
                {detail}
              </span>
            </>
          )}
        </p>
        {price !== null && (
          <span className="shrink-0 text-base font-semibold">
            {formatPeso(price)}
          </span>
        )}
      </div>
      {offer.sale_state === 'available' &&
        offer.stock_status !== null &&
        offer.verified_at !== null && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatStockStatus(offer.stock_status)} · Checked{' '}
            {formatVerified(offer.verified_at)}
            {offer.stale === true ? ' · Possibly outdated' : ''}
          </p>
        )}
      {offer.mdrp !== null && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          MDRP ceiling ({offer.mdrp.order}, row {offer.mdrp.annex_row}):{' '}
          {formatPeso(offer.mdrp.ceiling_php)}{' '}
          {offer.mdrp.ceiling_basis === 'per_unit'
            ? `per ${offer.mdrp.ceiling_unit ?? 'unit'}`
            : 'per pack'}
          . {vatComparisonCopy(offer.mdrp)}{' '}
          {formatMdrpRateBasis(offer.mdrp.rate_basis)}:{' '}
          {formatPeso(offer.mdrp.observed_rate_php)}.{' '}
          {offer.mdrp.above
            ? 'Above the applicable ceiling — verify at the pharmacy.'
            : 'At or below the applicable ceiling.'}
        </p>
      )}
    </li>
  )
}
