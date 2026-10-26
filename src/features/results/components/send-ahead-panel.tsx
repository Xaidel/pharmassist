import { useServerFn } from '@tanstack/react-start'
import { Copy, MessageSquare } from 'lucide-react'
import { useState } from 'react'

import { cn } from '#/lib/cn'
import { sendEvents } from '#/lib/events'
import { Alert } from '#/shared/components/ui/alert'
import { Button, buttonVariants } from '#/shared/components/ui/button'

import {
  composeReservationMessage,
  createSendAheadReservation,
  type SendAheadFunctionOutcome,
} from '../../send-ahead/send-ahead.functions'
import type { BasketLine } from '../results.domain'
import { formatPeso, formatUnit } from '../results.format'

const expiryFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
})

/** The total the current result can show for the reservation slip. */
export type SendAheadExpectedTotal = {
  label: string
  amountPhp: number
}

type SendAheadPanelProps = {
  pharmacyId: string
  pharmacyName: string
  pharmacyMobile: string | null
  items: readonly BasketLine[]
  expectedTotal: SendAheadExpectedTotal | null
}

type CreatedReservation = Extract<SendAheadFunctionOutcome, { ok: true }>

function formatExpiry(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp)
  if (Number.isNaN(parsed.getTime())) {
    return isoTimestamp
  }
  return expiryFormatter.format(parsed)
}

function smsHref(mobile: string, message: string): string {
  return `sms:${mobile.replace(/[^+\d]/g, '')}?body=${encodeURIComponent(message)}`
}

/** Create an advisory send-ahead reservation and render its shareable slip. */
export function SendAheadPanel({
  pharmacyId,
  pharmacyName,
  pharmacyMobile,
  items,
  expectedTotal,
}: SendAheadPanelProps): React.JSX.Element {
  const createReservation = useServerFn(createSendAheadReservation)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [created, setCreated] = useState<CreatedReservation | null>(null)

  async function handleCreate(): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      const outcome = await createReservation({
        data: {
          pharmacy_id: pharmacyId,
          items: items.map((item) => ({
            medicine_id: item.medicine_id,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      })
      if (!outcome.ok) {
        setError(outcome.error.message)
        return
      }
      setCreated(outcome)
      sendEvents([
        {
          name: 'send_ahead_created',
          properties: { pharmacy_id: pharmacyId },
        },
      ]).catch(() => undefined)
    } catch {
      setError(
        'The reservation could not be created. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setError(null)
    } catch {
      setError('Copying the code failed. Select the code and copy it by hand.')
    }
  }

  if (created === null) {
    return (
      <section
        aria-labelledby="send-ahead-heading"
        className="rounded-2xl border border-border p-4"
      >
        <h3
          className="font-display text-xl font-semibold"
          id="send-ahead-heading"
        >
          Send ahead
        </h3>
        <p className="mt-1 text-base leading-relaxed text-muted-foreground">
          Let {pharmacyName} pre-bag your list before you arrive. This is a
          request, not a held reservation.
        </p>
        {error !== null && <Alert className="mt-4">{error}</Alert>}
        <Button
          className="mt-4 w-full"
          disabled={submitting}
          onClick={() => {
            void handleCreate()
          }}
          size="lg"
          type="button"
        >
          {submitting ? 'Creating reservation…' : 'Send ahead'}
        </Button>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          No stock is held and no payment is taken. Prices are indicative.
        </p>
      </section>
    )
  }

  const reservation = created.response
  const expiresAtLabel = formatExpiry(reservation.expires_at)
  const itemLines = reservation.items.map(
    (item) =>
      `${item.label} — ${String(item.quantity)} ${formatUnit(
        item.quantity,
        item.unit,
      )}`,
  )
  const message = composeReservationMessage({
    referenceCode: reservation.reference_code,
    pharmacyName: reservation.pharmacy_name,
    itemLines,
    expiresAtLabel,
  })

  return (
    <section
      aria-labelledby="send-ahead-slip-heading"
      className="rounded-2xl border border-primary/40 bg-primary/5 p-4"
    >
      <h3
        className="font-display text-xl font-semibold"
        id="send-ahead-slip-heading"
      >
        Send-ahead reservation
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Show this code at the pharmacy. It is not a guaranteed stock hold.
      </p>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Reference code</p>
          <p
            aria-label={`Reference code ${reservation.reference_code}`}
            className="mt-1 font-mono text-4xl font-semibold tracking-wide"
          >
            {reservation.reference_code}
          </p>
        </div>
        <Button
          onClick={() => {
            void handleCopy(reservation.reference_code)
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Copy aria-hidden="true" className="size-4" />
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </div>

      {error !== null && <Alert className="mt-4">{error}</Alert>}

      <div className="mt-4">
        <p className="font-semibold">{reservation.pharmacy_name}</p>
        <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-background px-3">
          {reservation.items.map((item) => (
            <li
              className="flex items-start justify-between gap-3 py-2.5"
              key={item.medicine_id}
            >
              <span className="min-w-0 text-sm">{item.label}</span>
              <span className="shrink-0 text-sm font-semibold">
                {item.quantity} {formatUnit(item.quantity, item.unit)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {expectedTotal !== null && (
        <p className="mt-3 text-base">
          {expectedTotal.label}:{' '}
          <span className="font-semibold">
            {formatPeso(expectedTotal.amountPhp)}
          </span>
        </p>
      )}

      <p className="mt-1 text-base font-semibold">
        Reserve until {expiresAtLabel}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This is a send-ahead request, not a guaranteed hold. Prices are
        indicative and stock is not reserved.
      </p>

      {pharmacyMobile === null ? (
        <Alert className="mt-4" variant="info">
          This pharmacy has no SMS-able mobile number. The reservation is
          recorded, but it is not delivered by SMS; show the code at the
          counter.
        </Alert>
      ) : (
        <>
          <a
            className={cn(buttonVariants({ size: 'lg' }), 'mt-4 w-full')}
            href={smsHref(pharmacyMobile, message)}
          >
            <MessageSquare aria-hidden="true" className="size-5" />
            Send via SMS
          </a>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Opens your SMS app with the pharmacy&apos;s number and the
            reservation message. You tap send from your own phone.
          </p>
        </>
      )}
    </section>
  )
}
