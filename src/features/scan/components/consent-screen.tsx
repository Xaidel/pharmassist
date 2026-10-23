import { Camera, Search } from 'lucide-react'

import { Button } from '#/shared/components/ui/button'

type ConsentScreenProps = {
  onAgree: () => void
  onDecline: () => void
}

/** The consent notice shown before any camera, upload, or sample capture. */
export function ConsentScreen({
  onAgree,
  onDecline,
}: ConsentScreenProps): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-safe pt-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Camera aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Scan a prescription
          </h1>
          <p className="text-sm text-muted-foreground">
            Recognizes medicine names with Google Cloud.
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Your photo is sent to Google Cloud to read the medicine names on it,
          then discarded. It is not stored, and no patient details are kept.
          Sending it to Google Cloud means the photo leaves the Philippines.
        </p>
        <p>
          Nothing is added on its own. You review and confirm every medicine
          first.
        </p>
        <p>
          Searching for a medicine is always available instead of scanning, and
          you can stop at any time.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onAgree} size="lg" type="button">
          I agree, continue
        </Button>
        <Button onClick={onDecline} size="lg" type="button" variant="outline">
          <Search aria-hidden="true" className="size-5" />
          Search instead
        </Button>
      </div>
    </div>
  )
}
