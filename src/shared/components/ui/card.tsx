import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '#/lib/cn'

const cardVariants = cva(
  'rounded-3xl border border-border/80 bg-card text-card-foreground shadow-sm',
  {
    variants: {
      interactive: {
        true: 'transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none',
      },
    },
  },
)

/** Props for the shared raised content surface. */
export type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>

/** Renders a shared raised content surface. */
export function Card({
  className,
  interactive,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={cn(cardVariants({ interactive }), className)}
      data-slot="card"
      {...props}
    />
  )
}

/** Renders the heading region of a card. */
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-col gap-2 p-6', className)}
      data-slot="card-header"
      {...props}
    />
  )
}

/** Renders the primary content region of a card. */
export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('p-6 pt-0', className)}
      data-slot="card-content"
      {...props}
    />
  )
}
