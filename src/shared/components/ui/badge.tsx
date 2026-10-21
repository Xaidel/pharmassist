import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '#/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-muted-foreground',
        primary: 'border-primary/40 bg-primary/10 text-primary',
        'primary-strong': 'border-primary/40 bg-primary/15 text-primary',
        inactive: 'border-border bg-muted text-muted-foreground line-through',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/** Props for the shared badge primitive. */
export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

/** Variant names accepted by the shared badge primitive. */
export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>['variant']
>

/** Renders compact supporting metadata. */
export function Badge({
  className,
  variant,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  )
}
