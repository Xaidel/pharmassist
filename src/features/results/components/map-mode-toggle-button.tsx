import { Box, Square } from 'lucide-react'

import { Button } from '#/shared/components/ui/button'

type MapModeToggleButtonProps = {
  /** True while the map is tilted. */
  is3d: boolean
  onToggle: () => void
}

/** Switches the results map between its flat and tilted camera. */
export function MapModeToggleButton({
  is3d,
  onToggle,
}: MapModeToggleButtonProps): React.JSX.Element {
  return (
    <Button
      aria-label={is3d ? 'Switch to 2D map' : 'Switch to 3D map'}
      className="pointer-events-auto"
      onClick={onToggle}
      size="icon"
      type="button"
      variant="outline"
    >
      {is3d ? (
        <Square aria-hidden="true" className="size-5" />
      ) : (
        <Box aria-hidden="true" className="size-5" />
      )}
    </Button>
  )
}
