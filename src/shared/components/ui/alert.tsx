import { cva, type VariantProps } from 'class-variance-authority'
import { Info } from 'lucide-react'
import type { HTMLAttributes } from 'react'

import { cn } from '#/lib/cn'

const alertVariants = cva('rounded-2xl border px-4 py-3 text-sm', {
  variants: {
    variant: {
      destructive: 'border-destructive/30 bg-destructive/8 text-destructive',
      info: 'flex items-start gap-2.5 border-border bg-muted text-foreground',
    },
  },
  defaultVariants: {
    variant: 'destructive',
  },
})

/** Props for the shared alert primitive. */
export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>

/**
 * Renders an inline message. `destructive` (the default) is for errors and is
 * announced at once; `info` is a calm note announced politely.
 */
export function Alert({
  className,
  variant,
  children,
  ...props
}: AlertProps): React.JSX.Element {
  const info = variant === 'info'
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role={info ? 'status' : 'alert'}
      {...props}
    >
      {info && (
        <Info
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
      )}
      {info ? <div className="min-w-0 flex-1">{children}</div> : children}
    </div>
  )
}
