import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { cn } from '#/lib/cn'

/** The id the basket triggers point `aria-controls` at. */
export const BASKET_DRAWER_ID = 'basket-drawer'

type BasketDrawerProps = {
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * Drop the basket over the upper half of the screen, below the floating top
 * bar. It is not modal: the map and the results sheet stay usable under it.
 */
export function BasketDrawer({
  onClose,
  children,
  className,
}: BasketDrawerProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    // Return focus to whatever opened the drawer once it closes.
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    panelRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus()
    }
  }, [])

  return (
    <div
      aria-label="Your basket"
      className={cn(
        'max-h-basket overflow-y-auto overscroll-contain rounded-3xl shadow-sheet focus-visible:outline-none',
        className,
      )}
      id={BASKET_DRAWER_ID}
      ref={panelRef}
      role="region"
      tabIndex={-1}
    >
      {children}
    </div>
  )
}
