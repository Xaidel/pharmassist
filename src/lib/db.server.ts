import { Pool } from 'pg'
import type { QueryResultRow } from 'pg'

import { readServerConfig } from './config.server'

let pool: Pool | undefined

/** Executes one parameterized statement and returns its rows. */
export type QueryRunner = <Row extends QueryResultRow>(
  text: string,
  values?: readonly unknown[],
) => Promise<Row[]>

function getPool(): Pool {
  if (pool === undefined) {
    const config = readServerConfig()
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  }
  return pool
}

/** Run a parameterized query against the application database. */
export const queryRows: QueryRunner = async <Row extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<Row[]> => {
  const result = await getPool().query<Row>(text, [...values])
  return result.rows
}
