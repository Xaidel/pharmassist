import { MedicineLine } from '#/shared/components/medicine-line'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

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
  medicine: MedicineSummary | undefined
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

/** Render one observed sale form with its stock, verification, and MDRP context. */
export function PriceLineItem({
  medicine,
  offer,
}: PriceLineItemProps): React.JSX.Element {
  const label = medicine === undefined ? undefined : medicine.medicine_id

  return (
    <li className="rounded-2xl bg-muted p-3">
      {medicine === undefined ? (
        <p className="font-semibold">{label ?? 'Medicine'}</p>
      ) : (
        <MedicineLine medicine={medicine} />
      )}
      <p className="mt-2 text-sm">
        <span className="font-semibold">{formatSaleForm(offer.sale_form)}</span>
        {offer.sale_state === 'available' &&
          offer.shelf_price_php !== null &&
          offer.form_label !== null && (
            <>
              {' · '}
              <span className="font-semibold">
                {formatPeso(offer.shelf_price_php)}
              </span>{' '}
              for {offer.form_label}
            </>
          )}
        {offer.sale_state !== 'available' && (
          <> · {formatSaleState(offer.sale_state)}</>
        )}
      </p>
      {offer.sale_state === 'available' &&
        offer.stock_status !== null &&
        offer.verified_at !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatStockStatus(offer.stock_status)} · Verified{' '}
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
