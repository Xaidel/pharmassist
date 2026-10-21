import { MedicineLine } from '#/shared/components/medicine-line'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import {
  formatPeso,
  formatStockStatus,
  formatVerified,
} from '../results.format'
import type { PriceLine } from '../results.schema'

type PriceLineItemProps = {
  medicine: MedicineSummary | undefined
  price: PriceLine
}

/** Render one price record with its stock, verification, and MDRP context. */
export function PriceLineItem({
  medicine,
  price,
}: PriceLineItemProps): React.JSX.Element {
  return (
    <li className="rounded-2xl bg-muted p-3">
      {medicine === undefined ? (
        <p className="font-semibold">{price.medicine_id}</p>
      ) : (
        <MedicineLine medicine={medicine} />
      )}
      <p className="mt-2 text-sm">
        <span className="font-semibold">
          {formatPeso(price.shelf_price_php)}
        </span>{' '}
        per {price.pack_size}
        {price.unit_price_php !== null &&
          ` · ${formatPeso(price.unit_price_php)}/${price.pack_unit ?? 'unit'}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatStockStatus(price.stock_status)} · Verified{' '}
        {formatVerified(price.verified_at)}
        {price.stale ? ' · Possibly outdated' : ''}
      </p>
      {price.mdrp !== null && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          MDRP ceiling ({price.mdrp.order}, row {price.mdrp.annex_row}):{' '}
          {formatPeso(price.mdrp.ceiling_php)} per{' '}
          {price.mdrp.ceiling_unit ?? 'pack'}
          {price.mdrp.vat_exclusive ? ' (VAT-exclusive)' : ''}; observed{' '}
          {formatPeso(
            price.mdrp.observed_unit_price_php ??
              price.mdrp.observed_pack_price_php,
          )}{' '}
          per{' '}
          {price.mdrp.ceiling_basis === 'per_unit'
            ? (price.mdrp.ceiling_unit ?? 'unit')
            : price.pack_size}
          .{' '}
          {price.mdrp.above
            ? 'Above the published ceiling — verify at the pharmacy.'
            : 'At or below the published ceiling.'}
        </p>
      )}
    </li>
  )
}
