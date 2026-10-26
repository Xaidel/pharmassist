import { createSendAheadOperation } from './send-ahead.composition.server'
import { sendAheadRequestSchema } from './send-ahead.schema'
import type { CreateSendAheadOutcome } from './send-ahead.use-cases'

/**
 * Validate a wire request and create one advisory send-ahead reservation.
 *
 * This is the published server-only operation behind `POST /api/send-ahead`.
 * It owns its input parsing once; the browser entrypoint uses the same
 * application operation behind a server function validator instead.
 */
export async function createSendAheadReservation(
  input: unknown,
): Promise<CreateSendAheadOutcome> {
  const parsed = sendAheadRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'INVALID_REQUEST',
        message: 'The send-ahead request is malformed.',
        details: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
      },
    }
  }

  return createSendAheadOperation({
    pharmacyId: parsed.data.pharmacy_id,
    items: parsed.data.items,
  })
}
