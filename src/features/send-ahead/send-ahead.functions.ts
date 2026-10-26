import { createServerFn } from '@tanstack/react-start'

import { createSendAheadOperation } from './send-ahead.composition.server'
import { sendAheadRequestSchema } from './send-ahead.schema'
import type {
  CreateSendAheadOutcome,
  SendAheadFailureCode,
} from './send-ahead.use-cases'

export { composeReservationMessage } from './send-ahead.domain'

/** One failure the browser entrypoint can return. */
export type SendAheadFunctionFailure = {
  status: number
  code: SendAheadFailureCode
  message: string
}

/** The browser-callable outcome of creating one send-ahead reservation. */
export type SendAheadFunctionOutcome =
  | Extract<CreateSendAheadOutcome, { ok: true }>
  | { ok: false; error: SendAheadFunctionFailure }

/** Create one advisory send-ahead reservation from the patient's list. */
export const createSendAheadReservation = createServerFn({ method: 'POST' })
  .validator(sendAheadRequestSchema)
  .handler(async ({ data }): Promise<SendAheadFunctionOutcome> => {
    const outcome = await createSendAheadOperation({
      pharmacyId: data.pharmacy_id,
      items: data.items,
    })
    if (!outcome.ok) {
      return {
        ok: false,
        error: {
          status: outcome.error.status,
          code: outcome.error.code,
          message: outcome.error.message,
        },
      }
    }
    return outcome
  })
