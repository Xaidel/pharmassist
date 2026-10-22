import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'

/** The heights a draggable bottom sheet rests at. */
export type SheetSnap = 'closed' | 'peek' | 'full'

type SheetDragOptions = {
  snap: SheetSnap
  onSnap: (snap: SheetSnap) => void
  /** Height of the closed sheet, which shows only its handle. */
  closedPx: number
  /** Share of the viewport height the sheet covers at peek and full. */
  peekRatio: number
  fullRatio: number
}

type SheetDrag = {
  /** Live height while dragging, or null to use the snap height. */
  dragHeight: number | null
  handleProps: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void
    onPointerMove: (event: PointerEvent<HTMLElement>) => void
    onPointerUp: (event: PointerEvent<HTMLElement>) => void
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void
    onClick: () => void
  }
}

const SNAP_ORDER: readonly SheetSnap[] = ['closed', 'peek', 'full']

// Movement below this is a tap, not a drag.
const DRAG_THRESHOLD_PX = 6
// A flick faster than this (px/ms) moves one snap in its direction.
const FLICK_VELOCITY = 0.5

/** Let a bottom sheet's handle be dragged between its snap heights; a tap opens it a step. */
export function useSheetDrag({
  snap,
  onSnap,
  closedPx,
  peekRatio,
  fullRatio,
}: SheetDragOptions): SheetDrag {
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const start = useRef<{ y: number; height: number; time: number } | null>(null)
  const dragged = useRef(false)

  function heights(): Record<SheetSnap, number> {
    return {
      closed: closedPx,
      peek: window.innerHeight * peekRatio,
      full: window.innerHeight * fullRatio,
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>): void {
    if (event.button !== 0) {
      return
    }
    start.current = {
      y: event.clientY,
      height: heights()[snap],
      time: event.timeStamp,
    }
    dragged.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLElement>): void {
    const origin = start.current
    if (origin === null) {
      return
    }
    const delta = origin.y - event.clientY
    if (!dragged.current && Math.abs(delta) < DRAG_THRESHOLD_PX) {
      return
    }
    dragged.current = true
    const { closed, full } = heights()
    // Allow a little travel past each end so the limit is felt.
    setDragHeight(Math.min(full + 24, Math.max(closed, origin.height + delta)))
  }

  function finish(event: PointerEvent<HTMLElement>): void {
    const origin = start.current
    start.current = null
    if (origin === null || !dragged.current) {
      return
    }
    const snapHeights = heights()
    const delta = origin.y - event.clientY
    const height = origin.height + delta
    const velocity = delta / Math.max(1, event.timeStamp - origin.time)
    const index = SNAP_ORDER.indexOf(snap)

    let next: SheetSnap
    if (velocity > FLICK_VELOCITY) {
      next = SNAP_ORDER[Math.min(index + 1, SNAP_ORDER.length - 1)] ?? snap
    } else if (velocity < -FLICK_VELOCITY) {
      next = SNAP_ORDER[Math.max(index - 1, 0)] ?? snap
    } else {
      next = SNAP_ORDER.reduce((best, candidate) =>
        Math.abs(snapHeights[candidate] - height) <
        Math.abs(snapHeights[best] - height)
          ? candidate
          : best,
      )
    }
    setDragHeight(null)
    onSnap(next)
  }

  function onPointerCancel(): void {
    start.current = null
    setDragHeight(null)
  }

  function onClick(): void {
    // A drag also ends in a click; only a tap or keyboard press acts.
    if (dragged.current) {
      dragged.current = false
      return
    }
    onSnap(snap === 'full' ? 'peek' : snap === 'peek' ? 'full' : 'peek')
  }

  return {
    dragHeight,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel,
      onClick,
    },
  }
}
