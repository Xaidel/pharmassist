import { Client } from 'pg'

/** Open a single Postgres connection for a tooling command. */
export async function connect(databaseUrl: string): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  return client
}

/** Run `work` inside one transaction and roll back on any failure. */
export async function inTransaction<T>(
  client: Client,
  work: () => Promise<T>,
): Promise<T> {
  await client.query('begin')
  try {
    const result = await work()
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  }
}

/** Replace the database name in a Postgres URL, keeping credentials and options. */
export function withDatabaseName(databaseUrl: string, name: string): string {
  const url = new URL(databaseUrl)
  url.pathname = `/${name}`
  return url.toString()
}

export class ToolingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ToolingError'
  }
}
