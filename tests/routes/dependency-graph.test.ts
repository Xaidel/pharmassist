import { describe, expect, it } from 'vitest'
import { boundaryFindings, inspectModule } from './dependency-graph'

describe('dependency syntax and server capability boundaries', () => {
  it('permits private middleware bindings only inside a recognized server callback', () => {
    const sources = new Map([
      [
        'src/lib/policy.middleware.ts',
        `import { createMiddleware } from '@tanstack/react-start'; import { session } from './session.server'; export const policy = createMiddleware({ type: 'function' }).server(() => session())`,
      ],
      ['src/lib/session.server.ts', 'export function session() {}'],
    ])
    expect(boundaryFindings(sources)).toEqual([])
    sources.set(
      'src/lib/policy.middleware.ts',
      `import { createMiddleware } from '@tanstack/react-start'; import { session } from './session.server'; const eager = session(); export const policy = createMiddleware({ type: 'function' }).server(() => eager)`,
    )
    expect(
      boundaryFindings(sources).some((finding) =>
        finding.includes('client-safe module imports'),
      ),
    ).toBe(true)
  })
  it('distinguishes type-only, side-effect, re-export and literal dynamic links', () => {
    const inspected =
      inspectModule(`import type { Contract } from './types.server';
      import './side-effect'; export * from './barrel';
      const load = () => import('./dynamic'); // from './not-an-import'
      export { type Contract } from './contract.server';`)
    expect(inspected.dependencies).toEqual([
      { specifier: './types.server', typeOnly: true, reexport: false },
      { specifier: './side-effect', typeOnly: false, reexport: false },
      { specifier: './barrel', typeOnly: false, reexport: true },
      { specifier: './dynamic', typeOnly: false, reexport: false },
      { specifier: './contract.server', typeOnly: true, reexport: true },
    ])
  })

  it.each([
    `export { store } from './provider.server'`,
    `export * from './provider.server'`,
    `import { store as local } from './provider.server'; export { local as store }`,
    `import { store } from './provider.server'; export const shared = store`,
    `import { store } from './provider.server'; const first = store; const second = first; export { second }`,
    `import * as store from './provider.server'; export default store`,
  ])('rejects published server values: %s', (source) => {
    const sources = new Map([
      ['src/features/provider/provider.functions.ts', source],
      ['src/features/provider/provider.server.ts', 'export const store = {}'],
    ])
    expect(boundaryFindings(sources)).toContain(
      'src/features/provider/provider.functions.ts: client-importable module publishes a server-only value',
    )
  })

  it('accepts normal server composition and erased contract types', () => {
    expect(
      boundaryFindings(
        new Map([
          [
            'src/features/provider/provider.functions.ts',
            `import { createStore } from './provider.server'; const store = createStore(); export const rpc = () => store.read()`,
          ],
          [
            'src/features/provider/provider.server.ts',
            'export function createStore() {}',
          ],
          [
            'src/features/consumer/consumer.provider-binding.server.ts',
            `import { evaluate } from '#/features/provider/provider.surface.server'; import { createPort } from './consumer.provider-adapter.server'`,
          ],
          [
            'src/features/consumer/consumer.provider-adapter.server.ts',
            `import type { Contract } from '../provider/provider.surface.server'; import type { Port } from './consumer.port'`,
          ],
          ['src/features/consumer/consumer.port.ts', 'export type Port = {}'],
          [
            'src/features/provider/provider.surface.server.ts',
            'export function evaluate() {}',
          ],
        ]),
      ),
    ).toEqual([])
  })

  it('rejects private imports, RPC bypass, shared ownership reversal and barrel fan-out', () => {
    const findings = boundaryFindings(
      new Map([
        [
          'src/features/consumer/consumer.functions.ts',
          `import { evaluate } from '../provider/provider.surface.server'`,
        ],
        [
          'src/features/consumer/consumer.provider-binding.server.ts',
          `import { store } from '../provider/provider.repository.server'`,
        ],
        [
          'src/lib/glue.server.ts',
          `import { evaluate } from '#/features/provider/provider.surface.server'`,
        ],
        [
          'src/features/provider/provider.surface.server.ts',
          'export function evaluate() {}',
        ],
        [
          'src/features/provider/provider.repository.server.ts',
          'export const store = {}',
        ],
        [
          'src/lib/barrel.ts',
          `export * from '../features/provider/provider.repository.server'`,
        ],
        ['src/lib/outer.ts', `export * from './barrel'`],
      ]),
    )
    expect(
      findings.filter((finding) => finding.includes('cross-feature access')),
    ).toHaveLength(2)
    expect(findings.some((finding) => finding.includes('shared/lib'))).toBe(
      true,
    )
    expect(findings).toContain(
      'src/lib/outer.ts: client-importable module publishes a server-only value',
    )
  })

  it('detects intra-feature initialization cycles but not erased type cycles', () => {
    const sources = new Map([
      [
        'src/features/a/a.composition.server.ts',
        `import './a.repository.server'`,
      ],
      [
        'src/features/a/a.repository.server.ts',
        `import './a.composition.server'`,
      ],
    ])
    expect(
      boundaryFindings(sources).some((finding) =>
        finding.startsWith('runtime module cycle:'),
      ),
    ).toBe(true)
    sources.set(
      'src/features/a/a.repository.server.ts',
      `import type { Store } from './a.composition.server'`,
    )
    expect(
      boundaryFindings(sources).some((finding) =>
        finding.startsWith('runtime module cycle:'),
      ),
    ).toBe(false)
  })

  it('reports computed imports instead of treating an unreadable graph as clean', () => {
    expect(
      inspectModule('const load = () => import(`./${name}`)')
        .unresolvedDynamicImport,
    ).toBe(true)
  })
})
