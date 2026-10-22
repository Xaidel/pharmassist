import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '#/lib/cn'

const inputVariants = cva(
  'w-full border text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'h-11 rounded-xl border-input bg-background px-3 text-sm',
        search:
          'h-13 rounded-2xl border-primary/60 bg-card pl-12 pr-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/** Props for the shared single-line text input. */
export type InputProps = ComponentProps<'input'> &
  VariantProps<typeof inputVariants>

/** Renders the shared single-line text input; `search` leaves room for a leading icon. */
export function Input({
  className,
  variant,
  ...props
}: InputProps): React.JSX.Element {
  return (
    <input
      className={cn(inputVariants({ variant }), className)}
      data-slot="input"
      {...props}
    />
  )
}
