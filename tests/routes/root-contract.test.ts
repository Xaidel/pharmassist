import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { collectSourceFiles, readSource } from './helpers'

const workspaceRoot = new URL('../..', import.meta.url)

describe('TanStack Start application contract', () => {
  it('renders Start head and script helpers in the document shell', async () => {
    const source = await readFile(
      new URL('src/routes/__root.tsx', workspaceRoot),
      'utf8',
    )

    expect(source).toContain('<HeadContent />')
    expect(source).toContain('<Scripts />')
  })

  it('installs CSRF middleware for server functions', async () => {
    const source = await readFile(
      new URL('src/start.ts', workspaceRoot),
      'utf8',
    )

    expect(source).toContain('createCsrfMiddleware')
    expect(source).toContain("context.handlerType === 'serverFn'")
  })
})

describe('design system policy contract', () => {
  /**
   * Expands a `contracts` pattern into the component names it names.
   *
   * Two shapes are understood, because those are the shapes a per-component contract
   * takes: a bare name, and a shared prefix with an alternation. Anything else is a
   * signal to extend this function, so a future pattern cannot silently narrow the
   * check to "matched at least one export" and let a name that does not exist through.
   */
  function namedComponents(pattern: string): string[] {
    const alternation = /^\^(\w+)\(([^)]+)\)\$$/.exec(pattern)
    const [prefix, alternatives] = alternation?.slice(1) ?? []
    if (prefix !== undefined && alternatives !== undefined) {
      return alternatives.split('|').map((name) => `${prefix}${name}`)
    }

    const single = /^\^?(\w+)\$?$/.exec(pattern)?.[1]
    if (single !== undefined) {
      return [single]
    }

    throw new Error(
      `Unrecognized contract pattern ${pattern}: add its shape to namedComponents.`,
    )
  }

  async function policyContracts(): Promise<string[]> {
    const policy = JSON.parse(
      await readFile(new URL('design-system.lint.json', workspaceRoot), 'utf8'),
    ) as { rules: Record<string, unknown> }
    const [, options] = policy.rules['shadcn/no-restyle'] as [
      string,
      { contracts: { pattern: string }[] },
    ]

    return options.contracts.flatMap((contract) =>
      namedComponents(contract.pattern),
    )
  }

  async function exportedCardComponents(): Promise<string[]> {
    const primitiveSource = await readFile(
      new URL('src/shared/components/ui/card.tsx', workspaceRoot),
      'utf8',
    )

    return [...primitiveSource.matchAll(/export function (\w+)/g)]
      .map((match) => match[1])
      .filter((name): name is string => name !== undefined)
  }

  /** Reads the `data-slot` values a source declares, the hook every component root carries. */
  function dataSlots(source: string): string[] {
    return [...source.matchAll(/data-slot="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((slot): slot is string => slot !== undefined)
  }

  it('contracts only components the primitive set exports', async () => {
    const exported = new Set(await exportedCardComponents())

    for (const component of await policyContracts()) {
      expect(
        exported.has(component),
        `${component} is contracted in design-system.lint.json but card.tsx does not export it`,
      ).toBe(true)
    }
  })

  it('documents every contracted component in the design system guide', async () => {
    const guide = await readFile(
      new URL('template_docs/design-system.md', workspaceRoot),
      'utf8',
    )

    for (const component of await policyContracts()) {
      expect(
        guide.includes(`\`${component}\``),
        `${component} is contracted in design-system.lint.json but absent from the design-system.md component table`,
      ).toBe(true)
    }
  })

  /**
   * A primitive owns its slot name; nothing outside the primitive set declares it again.
   *
   * `shadcn/no-restyle` cannot see this: a component that re-marks up a primitive's structure
   * and styling is not a design-system component, so the rule that forbids forking has nothing
   * to attach a finding to. A slot declared twice is the deterministic trace of that fork, and
   * the primitive is the definition of its own slot, so the two cannot both be right.
   *
   * It reads one convention rather than adding a marker, because `data-slot` on a component root
   * is already required. What it cannot catch is a deliberate fork under a fresh slot name —
   * `data-slot="order-card"` copying `Card`'s markup is still review's job.
   */
  it('declares each primitive slot only inside the primitive set', async () => {
    const slotOwners = new Map<string, string>()

    for (const path of await collectSourceFiles('src/shared/components/ui/')) {
      for (const slot of dataSlots(await readSource(path))) {
        slotOwners.set(slot, path)
      }
    }

    expect(slotOwners.size).toBeGreaterThan(0)

    const componentPaths = (await collectSourceFiles('src/')).filter(
      (path) =>
        path.endsWith('.tsx') && !path.startsWith('src/shared/components/ui/'),
    )

    for (const path of componentPaths) {
      for (const slot of dataSlots(await readSource(path))) {
        expect(
          slotOwners.get(slot),
          `${path} declares data-slot="${slot}", which src/shared/components/ui already owns — import that primitive instead of rebuilding it`,
        ).toBeUndefined()
      }
    }
  })
})
