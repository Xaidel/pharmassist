import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readConfig } from '../db/config'
import { connect, inTransaction } from '../db/database'

export type SendAheadPurgeReport = {
  marked: number
  deleted: number
}

/**
 * Mark expired send-ahead reservations and delete them in one transaction.
 *
 * A reservation is expired when `expires_at` has passed. The record is never
 * seeded and carries no foreign key to seeded rows, so a seed wipe never touches
 * it; this purge is the documented retention path.
 */
export async function runSendAheadPurge(
  databaseUrl: string,
): Promise<SendAheadPurgeReport> {
  const client = await connect(databaseUrl)
  try {
    return await inTransaction(client, async () => {
      const marked = await client.query(
        `update send_ahead
            set status = 'expired'
          where status = 'created'
            and expires_at <= now()`,
      )
      const deleted = await client.query(
        'delete from send_ahead where expires_at <= now()',
      )
      return {
        marked: marked.rowCount ?? 0,
        deleted: deleted.rowCount ?? 0,
      }
    })
  } finally {
    await client.end()
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1]
  return (
    entry !== undefined && resolve(entry) === fileURLToPath(import.meta.url)
  )
}

if (isMainModule()) {
  try {
    const report = await runSendAheadPurge(readConfig().databaseUrl)
    console.log(
      `Purged send-ahead reservations: marked=${String(report.marked)}, deleted=${String(report.deleted)}.`,
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
