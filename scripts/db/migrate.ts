import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { connect, inTransaction, ToolingError } from './database'

export type MigrationOptions = {
  databaseUrl: string
  migrationsDirectory?: string
}

export type MigrationReport = {
  applied: string[]
  skipped: string[]
}

type AppliedMigration = { filename: string; checksum: string }

function checksum(contents: string): string {
  return createHash('sha256').update(contents, 'utf8').digest('hex')
}

async function migrationFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory)
  const files = entries.filter((entry) => entry.endsWith('.sql')).sort()
  if (files.length === 0) {
    throw new ToolingError(
      'NO_MIGRATIONS',
      `No .sql migrations found in ${directory}`,
    )
  }
  return files
}

/** Apply every pending migration, verifying checksums of already-applied files. */
export async function runMigrations(
  options: MigrationOptions,
): Promise<MigrationReport> {
  const directory =
    options.migrationsDirectory ??
    join(import.meta.dirname, '..', '..', 'migrations')
  const files = await migrationFiles(directory)
  const client = await connect(options.databaseUrl)

  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `)

    const appliedRows = await client.query<AppliedMigration>(
      'select filename, checksum from schema_migrations',
    )
    const existing = new Map(
      appliedRows.rows.map((row) => [row.filename, row.checksum]),
    )
    const report: MigrationReport = { applied: [], skipped: [] }

    for (const filename of files) {
      const contents = await readFile(join(directory, filename), 'utf8')
      const hash = checksum(contents)
      const previous = existing.get(filename)

      if (previous !== undefined) {
        if (previous !== hash) {
          throw new ToolingError(
            'MIGRATION_CHANGED',
            `${filename} changed after it was applied; add a new migration instead`,
          )
        }
        report.skipped.push(filename)
        continue
      }

      await inTransaction(client, async () => {
        await client.query(contents)
        await client.query(
          'insert into schema_migrations (filename, checksum) values ($1, $2)',
          [filename, hash],
        )
      })
      report.applied.push(filename)
    }

    return report
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
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl === undefined || databaseUrl === '') {
      throw new ToolingError('INVALID_CONFIG', 'DATABASE_URL is required')
    }
    const report = await runMigrations({ databaseUrl })
    if (report.applied.length === 0) {
      console.log(
        `No pending migrations (${String(report.skipped.length)} already applied).`,
      )
    } else {
      console.log(`Applied ${report.applied.join(', ')}.`)
      if (report.skipped.length > 0) {
        console.log(`Skipped ${String(report.skipped.length)} already applied.`)
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
