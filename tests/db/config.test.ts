import { describe, expect, it } from 'vitest'

import {
  assertSeedAllowed,
  assertWipeAllowed,
  readConfig,
  type ToolingConfig,
} from '../../scripts/db/config'

const databaseUrl = 'postgres://user:pass@127.0.0.1:5432/pharmassist'

function config(overrides: Partial<ToolingConfig> = {}): ToolingConfig {
  return {
    databaseUrl,
    appEnv: 'dev',
    allowPocSeed: false,
    allowPocWipe: false,
    ...overrides,
  }
}

describe('readConfig', () => {
  it('defaults APP_ENV to dev', () => {
    expect(readConfig({ DATABASE_URL: databaseUrl })).toEqual(config())
  })

  it('reads the pilot override flags', () => {
    expect(
      readConfig({
        DATABASE_URL: databaseUrl,
        APP_ENV: 'pilot',
        ALLOW_POC_SEED: '1',
        ALLOW_POC_WIPE: '1',
      }),
    ).toEqual(
      config({ appEnv: 'pilot', allowPocSeed: true, allowPocWipe: true }),
    )
  })

  it('requires DATABASE_URL', () => {
    expect(() => readConfig({})).toThrow()
  })

  it('rejects a non-Postgres DATABASE_URL', () => {
    expect(() => readConfig({ DATABASE_URL: 'mysql://localhost/db' })).toThrow()
  })

  it('rejects an unknown APP_ENV', () => {
    expect(() =>
      readConfig({ DATABASE_URL: databaseUrl, APP_ENV: 'production' }),
    ).toThrow()
  })
})

describe('pilot gates', () => {
  it('allows seed and wipe outside pilot without flags', () => {
    expect(() => assertSeedAllowed(config())).not.toThrow()
    expect(() => assertWipeAllowed(config())).not.toThrow()
  })

  it('blocks seed in pilot without ALLOW_POC_SEED', () => {
    expect(() => assertSeedAllowed(config({ appEnv: 'pilot' }))).toThrow(
      'Refusing to seed POC data',
    )
  })

  it('blocks wipe in pilot without ALLOW_POC_WIPE', () => {
    expect(() => assertWipeAllowed(config({ appEnv: 'pilot' }))).toThrow(
      'Refusing to wipe POC data',
    )
  })

  it('allows the explicit pilot override', () => {
    expect(() =>
      assertSeedAllowed(config({ appEnv: 'pilot', allowPocSeed: true })),
    ).not.toThrow()
    expect(() =>
      assertWipeAllowed(config({ appEnv: 'pilot', allowPocWipe: true })),
    ).not.toThrow()
  })
})
