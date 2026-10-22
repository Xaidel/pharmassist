import { ShoppingBasket } from 'lucide-react'

import { BASKET_DRAWER_ID } from './basket-drawer'

type BasketToggleButtonProps = {
  /** Medicines in the basket; a bubble shows the count when above zero. */
  count: number
  open: boolean
  onToggle: () => void
}

/** The round basket button that opens and closes the basket drawer. */
export function BasketToggleButton({
  count,
  open,
  onToggle,
}: BasketToggleButtonProps): React.JSX.Element {
  const label =
    count === 0
      ? 'Basket, empty'
      : `Basket, ${String(count)} ${count === 1 ? 'medicine' : 'medicines'}`

  return (
    <button
      aria-controls={open ? BASKET_DRAWER_ID : undefined}
      aria-expanded={open}
      aria-label={label}
      className="pointer-events-auto relative grid size-14 shrink-0 place-items-center rounded-full border border-border bg-card text-primary shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={onToggle}
      type="button"
    >
      <ShoppingBasket aria-hidden="true" className="size-6" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 grid min-w-6 place-items-center rounded-full bg-highlight px-1.5 py-0.5 text-xs font-bold text-primary-foreground ring-2 ring-card"
        >
          {count}
        </span>
      )}
    </button>
  )
}
