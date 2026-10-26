import { useEffect, useId, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

import { sendEvents } from '#/lib/events'
import { MedicineLine } from '#/shared/components/medicine-line'
import { Alert } from '#/shared/components/ui/alert'
import { Badge } from '#/shared/components/ui/badge'
import { Button } from '#/shared/components/ui/button'
import { Dialog } from '#/shared/components/ui/dialog'
import { Label } from '#/shared/components/ui/label'
import { Textarea } from '#/shared/components/ui/textarea'

import {
  fetchPharmacyDetail,
  PharmacyDetailRequestError,
} from '../pharmacy-detail.api'
import type { PharmacyDetailResponse } from '../pharmacy-detail.schema'
import { postReport, ReportRequestError } from '../report.api'
import { REPORT_NOTE_MAX, type ReportReason } from '../report.schema'
import { isAbortError } from '../results.api'
import type { BasketLine, Origin } from '../results.domain'
import {
  formatDistance,
  formatOpenNow,
  formatPeso,
  formatVerified,
} from '../results.format'

import { PriceLineItem } from './price-line'
import { ResultItemList } from './result-items'
import { SendAheadPanel, type SendAheadExpectedTotal } from './send-ahead-panel'

const REPORT_REASON_OPTIONS: readonly {
  value: ReportReason
  label: string
}[] = [
  { value: 'wrong_price', label: 'Wrong price' },
  { value: 'wrong_stock', label: 'Wrong stock' },
  { value: 'wrong_details', label: 'Wrong details' },
  { value: 'other', label: 'Other' },
]

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type PharmacyDetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pharmacyId: string
  resultKey: string | null
  basketItems: readonly BasketLine[]
  origin: Origin | null
  reported: boolean
  reportedAt: string | null
  onReported: () => void
  onShowRoute: () => void
}

type ReportFormProps = {
  pharmacyId: string
  medicineIds: readonly string[]
  onSubmitted: () => void
}

function ReportForm({
  pharmacyId,
  medicineIds,
  onSubmitted,
}: ReportFormProps): React.JSX.Element {
  const [reason, setReason] = useState<ReportReason>('wrong_price')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const noteId = useId()
  const reasonLabelId = useId()

  async function handleSubmit(
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await postReport({
        pharmacyId,
        medicineIds,
        reason,
        note: note.trim() === '' ? null : note.trim(),
      })
      sendEvents([{ name: 'report_submitted', properties: { reason } }]).catch(
        () => undefined,
      )
      onSubmitted()
    } catch (reportError) {
      setError(
        reportError instanceof ReportRequestError
          ? reportError.message
          : 'The report could not be sent. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      aria-label="Report a wrong price or stock"
      className="rounded-2xl border border-border p-4"
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
    >
      <h3 className="font-display text-xl font-semibold">
        Report wrong price or stock
      </h3>
      <p className="mt-1 text-base leading-relaxed text-muted-foreground">
        Tell us if a price or stock looks wrong. We check every report. The
        pharmacy is not told who sent it.
      </p>

      <div
        aria-labelledby={reasonLabelId}
        className="mt-4 flex flex-wrap gap-2"
        role="group"
      >
        <p
          className="w-full text-base font-semibold text-foreground"
          id={reasonLabelId}
        >
          Reason
        </p>
        {REPORT_REASON_OPTIONS.map((option) => (
          <Button
            aria-pressed={reason === option.value}
            disabled={submitting}
            key={option.value}
            onClick={() => {
              setReason(option.value)
            }}
            size="sm"
            type="button"
            variant={reason === option.value ? 'default' : 'outline'}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        <Label htmlFor={noteId}>Note (optional)</Label>
        <Textarea
          className="mt-2"
          disabled={submitting}
          id={noteId}
          maxLength={REPORT_NOTE_MAX}
          onChange={(event) => {
            setNote(event.target.value)
          }}
          placeholder="What looks wrong?"
          value={note}
        />
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Please do not write names or phone numbers. {note.length}/
          {REPORT_NOTE_MAX} characters.
        </p>
      </div>

      {error !== null && <Alert className="mt-4">{error}</Alert>}

      <div className="mt-4">
        <Button disabled={submitting} type="submit">
          {submitting ? 'Sending…' : 'Send report'}
        </Button>
      </div>
    </form>
  )
}

function sendAheadExpectedTotal(
  basket: NonNullable<PharmacyDetailResponse['basket']>,
): SendAheadExpectedTotal {
  if (basket.status === 'complete') {
    return {
      label: 'Expected total',
      amountPhp: basket.total_shelf_price_php ?? basket.known_total_php,
    }
  }
  if (basket.status === 'sold_per_pack_only') {
    return {
      label: 'Expected total for whole packs',
      amountPhp: basket.covering_total_php ?? basket.known_total_php,
    }
  }
  return {
    label: 'Known total (some items missing)',
    amountPhp: basket.known_total_php,
  }
}

function DetailBasketSummary({
  basket,
  medicines,
}: {
  basket: NonNullable<PharmacyDetailResponse['basket']>
  medicines: PharmacyDetailResponse['medicines']
}): React.JSX.Element {
  const total =
    basket.complete && basket.total_shelf_price_php !== null
      ? basket.total_shelf_price_php
      : basket.known_total_php

  return (
    <section
      aria-labelledby="detail-basket-heading"
      className="rounded-2xl border border-border p-4"
    >
      <h3
        className="font-display text-xl font-semibold"
        id="detail-basket-heading"
      >
        Your medicines here
      </h3>
      <p className="mt-1 text-base leading-relaxed text-muted-foreground">
        {basket.status === 'complete'
          ? `Exact list · ${formatPeso(total)}`
          : basket.status === 'sold_per_pack_only'
            ? `Sold per pack only · ${formatPeso(
                basket.covering_total_php ?? 0,
              )} to buy`
            : `${String(basket.missing_items.length)} ${
                basket.missing_items.length === 1 ? 'item' : 'items'
              } missing · ${formatPeso(total)} known`}
      </p>
      <ResultItemList items={basket.items} medicines={medicines} />
    </section>
  )
}

/** Read and render one pharmacy's detail, stock list, directions, and report. */
export function PharmacyDetailSheet({
  open,
  onOpenChange,
  pharmacyId,
  resultKey,
  basketItems,
  origin,
  reported,
  reportedAt,
  onReported,
  onShowRoute,
}: PharmacyDetailSheetProps): React.JSX.Element {
  const [detail, setDetail] = useState<PharmacyDetailResponse | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const viewedRef = useRef<string | null>(null)

  useEffect(() => {
    setSubmitted(false)
  }, [pharmacyId])

  useEffect(() => {
    if (!open) {
      viewedRef.current = null
      return
    }

    const controller = new AbortController()
    setStatus('loading')
    setLoadError(null)
    void fetchPharmacyDetail(
      {
        pharmacyId,
        basket: basketItems,
        origin,
      },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return
        }
        setDetail(response)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return
        }
        setLoadError(
          error instanceof PharmacyDetailRequestError
            ? error.message
            : 'Pharmacy details are unavailable right now. Check your connection and try again.',
        )
        setStatus('error')
      })

    return () => {
      controller.abort()
    }
  }, [open, pharmacyId, basketItems, origin, reloadToken])

  useEffect(() => {
    if (!open || status !== 'ready' || detail === null) {
      return
    }
    if (viewedRef.current === pharmacyId) {
      return
    }
    viewedRef.current = pharmacyId
    sendEvents([
      {
        name: 'pharmacy_detail_viewed',
        properties: { pharmacy_id: pharmacyId },
      },
    ]).catch(() => undefined)
  }, [open, status, detail, pharmacyId])

  const ready = status === 'ready' && detail !== null
  const title = ready ? detail.pharmacy.name : 'Pharmacy details'
  const descriptionParts: string[] = []
  if (ready) {
    descriptionParts.push(detail.pharmacy.address)
    if (detail.pharmacy.barangay !== null) {
      descriptionParts.push(detail.pharmacy.barangay)
    }
  }
  const description = ready
    ? descriptionParts.join(' · ')
    : 'Loading the seeded pharmacy record.'
  const medicineById = new Map(
    (detail?.medicines ?? []).map((medicine) => [
      medicine.medicine_id,
      medicine,
    ]),
  )
  const hasReport = reported || submitted
  const medicineIds = basketItems.map((item) => item.medicine_id)

  return (
    <Dialog
      description={description}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      {status === 'loading' && (
        <p className="text-base text-muted-foreground" role="status">
          Loading pharmacy details…
        </p>
      )}

      {status === 'error' && (
        <div>
          <Alert>{loadError ?? 'Pharmacy details are unavailable.'}</Alert>
          <div className="mt-4">
            <Button
              onClick={() => {
                setReloadToken((token) => token + 1)
              }}
              type="button"
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {ready && (
        <div className="space-y-6">
          <Button className="w-full" onClick={onShowRoute} type="button">
            Show route on map
          </Button>

          <section
            aria-label="Pharmacy information"
            className="grid gap-4 text-base sm:grid-cols-2"
          >
            <div>
              <p className="font-semibold text-foreground">Distance</p>
              <p className="text-muted-foreground">
                {formatDistance(detail.pharmacy.distance_m)} away
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Hours</p>
              <p className="text-muted-foreground">
                {formatOpenNow(detail.pharmacy.open_now)}
                {detail.pharmacy.hours_text !== null
                  ? ` · ${detail.pharmacy.hours_text}`
                  : ''}
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Phone</p>
              {detail.pharmacy.phone === null ? (
                <p className="text-muted-foreground">Not verified</p>
              ) : (
                <a
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  href={`tel:${detail.pharmacy.phone}`}
                >
                  {detail.pharmacy.phone}
                </a>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">Pharmacy check</p>
              <p className="text-muted-foreground">
                {detail.pharmacy.verification_status === 'verified'
                  ? 'Verified pharmacy'
                  : 'Not yet verified'}
              </p>
            </div>
          </section>

          {detail.basket !== undefined && (
            <DetailBasketSummary
              basket={detail.basket}
              medicines={detail.medicines}
            />
          )}

          {resultKey !== null && detail.basket !== undefined && (
            <SendAheadPanel
              expectedTotal={sendAheadExpectedTotal(detail.basket)}
              items={basketItems}
              pharmacyId={detail.pharmacy.pharmacy_id}
              pharmacyMobile={detail.pharmacy.mobile}
              pharmacyName={detail.pharmacy.name}
            />
          )}

          <section aria-labelledby="detail-stock-heading">
            <h3
              className="font-display text-xl font-semibold"
              id="detail-stock-heading"
            >
              Full stock list (
              {detail.forms.reduce(
                (count, group) => count + group.forms.length,
                0,
              )}
              )
            </h3>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">
              Prices for each way a medicine is sold: box, strip, or loose.
              Confirm the price at the pharmacy.
            </p>
            {detail.forms.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">
                No prices from this pharmacy yet.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {detail.forms.map((group) => {
                  const medicine = medicineById.get(group.medicine_id)
                  return (
                    <div key={group.medicine_id}>
                      {medicine === undefined ? (
                        <p className="font-semibold">{group.medicine_id}</p>
                      ) : (
                        <MedicineLine medicine={medicine} />
                      )}
                      <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-background px-3">
                        {group.forms.map((offer) => (
                          <PriceLineItem key={offer.sale_form} offer={offer} />
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {resultKey !== null && medicineIds.length > 0 ? (
            hasReport ? (
              <section
                aria-label="Report status"
                className="rounded-2xl border border-border p-4"
              >
                <Badge variant="primary">Price reported</Badge>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                  Reported{' '}
                  {reportedAt === null
                    ? 'just now'
                    : `on ${formatVerified(reportedAt)}`}
                  . We will check it.
                </p>
              </section>
            ) : (
              <ReportForm
                medicineIds={medicineIds}
                onSubmitted={() => {
                  setSubmitted(true)
                  onReported()
                }}
                pharmacyId={pharmacyId}
              />
            )
          ) : (
            <p className="text-base leading-relaxed text-muted-foreground">
              You can report a price once this pharmacy has prices for your
              medicines.
            </p>
          )}
        </div>
      )}
    </Dialog>
  )
}
