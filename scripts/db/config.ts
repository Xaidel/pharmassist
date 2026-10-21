import { z } from 'zod'

const appEnvSchema = z.enum(['dev', 'test', 'pilot'])

const databaseUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .refine(
    (value) =>
      value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'DATABASE_URL must be a postgres:// or postgresql:// URL',
  )

const flagSchema = z.string().optional()

export type AppEnv = z.infer<typeof appEnvSchema>

export type ToolingConfig = {
  databaseUrl: string
  appEnv: AppEnv
  allowPocSeed: boolean
  allowPocWipe: boolean
}

/** Read and validate the environment shared by the database tooling. */
export function readConfig(
  env: NodeJS.ProcessEnv = process.env,
): ToolingConfig {
  const appEnv = appEnvSchema.parse(env.APP_ENV ?? 'dev')
  const databaseUrl = databaseUrlSchema.parse(env.DATABASE_URL)
  const seedFlag = flagSchema.parse(env.ALLOW_POC_SEED)
  const wipeFlag = flagSchema.parse(env.ALLOW_POC_WIPE)

  return {
    appEnv,
    databaseUrl,
    allowPocSeed: seedFlag === '1',
    allowPocWipe: wipeFlag === '1',
  }
}

/** The seeder may add POC rows only in dev/test unless a pilot run is explicit. */
export function assertSeedAllowed(config: ToolingConfig): void {
  if (config.appEnv === 'pilot' && !config.allowPocSeed) {
    throw new Error(
      'Refusing to seed POC data with APP_ENV=pilot. Set ALLOW_POC_SEED=1 only for a controlled test.',
    )
  }
}

/** The wipe may remove POC rows only in dev/test unless a pilot run is explicit. */
export function assertWipeAllowed(config: ToolingConfig): void {
  if (config.appEnv === 'pilot' && !config.allowPocWipe) {
    throw new Error(
      'Refusing to wipe POC data with APP_ENV=pilot. Set ALLOW_POC_WIPE=1 only for a controlled test.',
    )
  }
}
