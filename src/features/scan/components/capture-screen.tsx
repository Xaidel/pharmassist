import { Camera, ImagePlus, Search, Upload } from 'lucide-react'
import { useRef } from 'react'
import type { ChangeEvent } from 'react'

import { Alert } from '#/shared/components/ui/alert'
import { Button } from '#/shared/components/ui/button'

const SAMPLE_IMAGES = [
  { id: 'sample-rx-a', label: 'Sample prescription A' },
  { id: 'sample-rx-b', label: 'Sample prescription B' },
  { id: 'sample-rx-c', label: 'Sample prescription C' },
] as const

type CaptureScreenProps = {
  busy: boolean
  error: string | null
  onImage: (image: Blob, source: 'camera' | 'upload') => void
  onSearchInstead: () => void
}

/** Choose a photo source: camera, upload, or a bundled sample prescription. */
export function CaptureScreen({
  busy,
  error,
  onImage,
  onSearchInstead,
}: CaptureScreenProps): React.JSX.Element {
  const cameraRef = useRef<HTMLInputElement | null>(null)
  const uploadRef = useRef<HTMLInputElement | null>(null)

  function handleFile(
    event: ChangeEvent<HTMLInputElement>,
    source: 'camera' | 'upload',
  ): void {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) {
      return
    }
    onImage(file, source)
  }

  function handleSample(id: string): void {
    void fetch(`/scan-samples/${id}.png`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('sample unavailable')
        }
        return response.blob()
      })
      .then((blob) => {
        onImage(blob, 'upload')
      })
      .catch(() => undefined)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-safe pt-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Choose a prescription
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Take a photo, upload one, or try a bundled sample.
        </p>
      </div>

      {error !== null && <Alert>{error}</Alert>}

      <input
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          handleFile(event, 'camera')
        }}
        ref={cameraRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          handleFile(event, 'upload')
        }}
        ref={uploadRef}
        type="file"
      />

      <div className="grid gap-3">
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => {
            cameraRef.current?.click()
          }}
          size="lg"
          type="button"
        >
          <Camera aria-hidden="true" className="size-5" />
          Take a photo
        </Button>
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => {
            uploadRef.current?.click()
          }}
          size="lg"
          type="button"
          variant="outline"
        >
          <Upload aria-hidden="true" className="size-5" />
          Upload a photo
        </Button>
      </div>

      <section aria-labelledby="sample-heading">
        <h2
          className="text-sm font-semibold text-muted-foreground"
          id="sample-heading"
        >
          Or try a sample
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_IMAGES.map((sample) => (
            <Button
              disabled={busy}
              key={sample.id}
              onClick={() => {
                handleSample(sample.id)
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <ImagePlus aria-hidden="true" className="size-4" />
              {sample.label}
            </Button>
          ))}
        </div>
      </section>

      <button
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary underline-offset-2 hover:underline"
        disabled={busy}
        onClick={onSearchInstead}
        type="button"
      >
        <Search aria-hidden="true" className="size-4" />
        Search for a medicine instead
      </button>
    </div>
  )
}
