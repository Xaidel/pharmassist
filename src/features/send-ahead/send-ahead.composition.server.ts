import { randomInt } from 'node:crypto'

import { queryRows } from '#/lib/db.server'

import { computeExpiresAtMs, generateReferenceCode } from './send-ahead.domain'
import { createSendAheadRepository } from './send-ahead.repository.server'
import {
  createSendAhead,
  type CreateSendAheadInput,
  type CreateSendAheadOutcome,
} from './send-ahead.use-cases'

const store = createSendAheadRepository(queryRows)

/** Build a reference code from the platform's cryptographic random source. */
function generateCode(): string {
  return generateReferenceCode((maxExclusive) => randomInt(maxExclusive))
}

/** Create one send-ahead reservation through the shared application operation. */
export function createSendAheadOperation(
  input: CreateSendAheadInput,
): Promise<CreateSendAheadOutcome> {
  return createSendAhead(
    {
      store,
      generateReferenceCode: generateCode,
      now: () => new Date(),
      expiresAt: (createdAt) =>
        new Date(computeExpiresAtMs(createdAt.getTime())),
    },
    input,
  )
}
