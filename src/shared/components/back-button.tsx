import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

type BackButtonProps = {
  className?: string
}

/**
 * Go back to the previous screen in the app, with its state intact. A page
 * opened directly, with no earlier app screen, goes to home instead of
 * leaving the app.
 */
export function BackButton({ className }: BackButtonProps): React.JSX.Element {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return (
    <button
      aria-label="Back"
      className={
        className ??
        'pointer-events-auto grid size-14 shrink-0 place-items-center rounded-full border border-border bg-card text-primary shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      }
      onClick={() => {
        if (canGoBack) {
          router.history.back()
          return
        }
        void router.navigate({ to: '/' })
      }}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="size-6" />
    </button>
  )
}
