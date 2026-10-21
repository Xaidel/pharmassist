import { expect, it } from 'vitest'
import { boundaryFindings, inspectModule } from './dependency-graph'
import { collectSourceFiles, readSource } from './helpers'

it('applies the production boundary gate to the executable capability fixture', async () => {
  const prefix = 'tests/server-capabilities/'
  const paths = (await collectSourceFiles(`${prefix}src/`)).filter(
    (path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'),
  )
  const sources = new Map(
    await Promise.all(
      paths.map(
        async (path) =>
          [path.slice(prefix.length), await readSource(path)] as const,
      ),
    ),
  )
  expect(boundaryFindings(sources)).toEqual([])
  const adapter = sources.get(
    'src/features/workflow/workflow.authoring-adapter.server.ts',
  )
  expect(adapter).toBeDefined()
  expect(
    inspectModule(adapter ?? '').dependencies.filter(
      (dependency) =>
        dependency.specifier.includes('/authoring/') && !dependency.typeOnly,
    ),
  ).toEqual([])
})
