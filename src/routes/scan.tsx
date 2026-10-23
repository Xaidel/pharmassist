import { createFileRoute } from '@tanstack/react-router'

import { sessionBasket } from '#/features/results/basket-actions'
import { ScanPage } from '#/features/scan/pages/scan-page'

export const Route = createFileRoute('/scan')({
  component: ScanRoute,
})

// Scan owns the recognition flow; the basket it adds to belongs to results.
function ScanRoute(): React.JSX.Element {
  return <ScanPage addToBasket={sessionBasket.addLines} />
}
