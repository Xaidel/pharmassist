import { Info } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { Dialog } from '#/shared/components/ui/dialog'

type InfoButtonProps = {
  /** What the (i) explains, read out by screen readers, such as "About distances". */
  label: string
  title: string
  description: string
  /** Optional actions under the explanation; `close` dismisses the dialog. */
  children?: (close: () => void) => ReactNode
  /** Shows a floating badge with this text and an (i) instead of a bare (i). */
  badgeText?: string
}

/** A small (i) button that explains something in a pop-up dialog. */
export function InfoButton({
  label,
  title,
  description,
  children,
  badgeText,
}: InfoButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Dialog
      description={description}
      onOpenChange={setOpen}
      open={open}
      title={title}
      trigger={
        badgeText === undefined ? (
          <button
            aria-label={label}
            className="-m-2 inline-grid size-9 shrink-0 place-items-center rounded-full text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <Info aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <button
            aria-label={label}
            className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            {badgeText}
            <Info aria-hidden="true" className="size-4 text-primary" />
          </button>
        )
      }
    >
      {children?.(() => {
        setOpen(false)
      })}
    </Dialog>
  )
}
