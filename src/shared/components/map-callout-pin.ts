import { cn } from '#/lib/cn'

/** The visual weight of a map callout pin. */
export type CalloutTone =
  'highlight' | 'primary' | 'outline' | 'muted' | 'faint'

const TONES = {
  highlight: {
    box: 'border-highlight bg-card',
    inner: 'border-highlight text-highlight',
    tip: 'border-highlight bg-card',
    // The halo keeps the green dot visible on the grey map even when its
    // label is decluttered away.
    dot: 'bg-highlight shadow-pin-halo',
  },
  primary: {
    box: 'border-primary bg-primary',
    inner: 'border-primary-foreground/70 text-primary-foreground',
    tip: 'border-primary bg-primary',
    dot: 'bg-primary',
  },
  outline: {
    box: 'border-primary bg-card',
    inner: 'border-primary/60 text-primary',
    tip: 'border-primary bg-card',
    dot: 'bg-primary',
  },
  muted: {
    box: 'border-muted-foreground bg-card',
    inner: 'border-muted-foreground/60 text-muted-foreground',
    tip: 'border-muted-foreground bg-card',
    dot: 'bg-muted-foreground',
  },
  faint: {
    box: 'border-border bg-background opacity-80',
    inner: 'border-muted-foreground/40 text-muted-foreground',
    tip: 'border-border bg-background',
    dot: 'bg-muted-foreground/70',
  },
} as const satisfies Record<
  CalloutTone,
  { box: string; inner: string; tip: string; dot: string }
>

/** The pieces of a callout pin a map marker positions and declutters. */
export type CalloutPin<Root extends HTMLElement> = {
  /** The marker element MapLibre positions; never put a CSS transform here. */
  root: Root
  /** The visual wrapper inside the marker; scale or animate this instead. */
  body: HTMLDivElement
  callout: HTMLDivElement
  /** The location dot; it stays visible when the callout is decluttered. */
  dot: HTMLDivElement
}

type CalloutPinOptions<Tag extends 'button' | 'div'> = {
  tag: Tag
  label: string
  tone: CalloutTone
  starred?: boolean
  /** Classes for the marker element; must not include transforms. */
  rootClassName?: string
  /** Classes for the visual wrapper; selection scale and motion belong here. */
  bodyClassName?: string
}

/**
 * Build a dotted-border callout with a pointer and a location dot, for a
 * MapLibre marker anchored at `bottom` with a `[0, 6]` offset.
 */
export function createCalloutPin<Tag extends 'button' | 'div'>({
  tag,
  label,
  tone,
  starred = false,
  rootClassName,
  bodyClassName,
}: CalloutPinOptions<Tag>): CalloutPin<HTMLElementTagNameMap[Tag]> {
  const style = TONES[tone]
  const root = document.createElement(tag)
  root.className = cn(rootClassName)

  // MapLibre writes its positioning transform to the marker element itself, so
  // a scale must sit on this inner wrapper or it drags the marker off its point.
  const body = document.createElement('div')
  body.className = cn('flex flex-col items-center', bodyClassName)

  const box = document.createElement('div')
  box.className = cn('rounded-xl border p-0.5 shadow-md', style.box)
  const inner = document.createElement('div')
  inner.className = cn(
    'flex max-w-40 items-start gap-1.5 rounded-lg border border-dashed px-2.5 py-1.5 text-left text-xs font-bold leading-tight',
    style.inner,
  )
  if (starred) {
    const star = document.createElement('span')
    star.setAttribute('aria-hidden', 'true')
    star.textContent = '★'
    inner.append(star)
  }
  const text = document.createElement('span')
  text.textContent = label
  inner.append(text)
  box.append(inner)

  const tip = document.createElement('div')
  tip.className = cn('-mt-1.5 size-2.5 rotate-45 border-b border-r', style.tip)

  const callout = document.createElement('div')
  callout.className = 'flex flex-col items-center'
  callout.append(box, tip)

  const dot = document.createElement('div')
  dot.className = cn('mt-1.5 size-3 rounded-full ring-2 ring-card', style.dot)

  body.append(callout, dot)
  root.append(body)
  return { root, body, callout, dot }
}

const LABEL_GAP_PX = 4

function overlaps(left: DOMRect, right: DOMRect): boolean {
  return (
    left.left < right.right + LABEL_GAP_PX &&
    right.left < left.right + LABEL_GAP_PX &&
    left.top < right.bottom + LABEL_GAP_PX &&
    right.top < left.bottom + LABEL_GAP_PX
  )
}

/** A callout pin to declutter; a pinned callout always shows. */
export type DeclutterPin = Pick<CalloutPin<HTMLElement>, 'callout' | 'dot'> & {
  pinned?: boolean
}

/**
 * Hide each callout that would overlap one placed before it or cover another
 * pin's dot, leaving its own dot. Pass pins in priority order: earlier ones win
 * label collisions, and pinned ones, such as a tapped or selected pin, always
 * show.
 */
export function declutterCallouts(pins: readonly DeclutterPin[]): void {
  const dots = pins.map(({ dot }) => dot.getBoundingClientRect())
  const placed: DOMRect[] = []
  for (const [index, { callout, pinned = false }] of pins.entries()) {
    callout.style.visibility = 'visible'
    const rect = callout.getBoundingClientRect()
    const blocked =
      !pinned &&
      (placed.some((other) => overlaps(rect, other)) ||
        dots.some((dot, other) => other !== index && overlaps(rect, dot)))
    if (blocked) {
      callout.style.visibility = 'hidden'
    } else {
      placed.push(rect)
    }
  }
}
