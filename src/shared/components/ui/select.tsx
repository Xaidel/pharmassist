import type { SelectHTMLAttributes } from 'react'

import { cn } from '#/lib/cn'

/** Renders the shared native select control. */
export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="select"
      {...props}
    />
  )
}
