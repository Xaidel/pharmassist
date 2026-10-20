import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Source-walking helpers shared by the boundary suites.
 *
 * These live in their own module because two suites need them: the source-boundary suite and the
 * design-system policy suite. Copying the walker into each suite is the duplication this collection
 * exists to catch, so it is written once.
 */
const workspaceRoot = new URL('../..', import.meta.url)

export async function collectSourceFiles(directory: string): Promise<string[]> {
  const absoluteDirectory = new URL(directory, workspaceRoot)
  const entries = await readdir(absoluteDirectory)
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = join(directory, entry).replaceAll('\\', '/')
      const fileStat = await stat(new URL(relativePath, workspaceRoot))
      return fileStat.isDirectory()
        ? collectSourceFiles(`${relativePath}/`)
        : [relativePath]
    }),
  )
  return paths.flat().filter((path) => ['.ts', '.tsx'].includes(extname(path)))
}

export async function readSource(path: string): Promise<string> {
  return readFile(new URL(path, workspaceRoot), 'utf8')
}

export function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
}
