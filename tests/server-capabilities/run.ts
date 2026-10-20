import { spawn } from 'node:child_process'
import { cp, mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

const root = process.cwd()
const stage = await mkdtemp(join(tmpdir(), 'server-capabilities-'))

async function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: stage, env, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(`${command} ${args.join(' ')} failed (${String(code)})`),
        )
    })
  })
}

async function freePort(): Promise<string> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Unable to allocate fixture port')
  const port = String(address.port)
  await new Promise<void>((resolve, reject) =>
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    }),
  )
  return port
}

async function scripts(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name)
        return entry.isDirectory()
          ? scripts(path)
          : /\.[cm]?js$/.test(entry.name)
            ? [await readFile(path, 'utf8')]
            : []
      }),
    )
  ).flat()
}

async function expectImportDenial(label: string): Promise<void> {
  const result = await new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      const child = spawn('bun', ['run', 'build'], {
        cwd: stage,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let output = ''
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString()
      })
      child.stderr.on('data', (chunk: Buffer) => {
        output += chunk.toString()
      })
      child.on('error', reject)
      child.on('exit', (code) => resolve({ code, output }))
    },
  )
  if (
    result.code === 0 ||
    !result.output.includes(
      '[import-protection] Import denied in client environment',
    )
  )
    throw new Error(
      `${label}: expected import-protection denial, got ${String(result.code)}\n${result.output}`,
    )
  console.log(`${label}: expected import-protection denial confirmed`)
}

try {
  for (const path of [
    'package.json',
    'bun.lock',
    'tsconfig.json',
    'bunfig.toml',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.setup.ts',
    'eslint.config.js',
    'design-system.lint.json',
  ])
    await cp(join(root, path), join(stage, path))
  // Use a real hoisted install: external node_modules symlinks change Vite dev resolution.
  await run('bun', ['install', '--frozen-lockfile'])
  await cp(join(root, 'tests/server-capabilities/src'), join(stage, 'src'), {
    recursive: true,
  })
  await cp(join(root, 'tests/server-capabilities/e2e'), join(stage, 'e2e'), {
    recursive: true,
  })
  await cp(
    join(root, 'tests/server-capabilities/playwright.config.ts'),
    join(stage, 'playwright.config.ts'),
  )
  await run('bun', ['run', 'test:unit'])
  await run('bun', ['run', 'build'])
  const clientOutput = (await scripts(join(stage, '.output/public'))).join('\n')
  const serverOutput = (await scripts(join(stage, '.output/server'))).join('\n')
  if (
    clientOutput.includes('Bearer alpha') ||
    !serverOutput.includes('Bearer alpha')
  )
    throw new Error(
      'Private session implementation must be present only in the server output',
    )
  await run('bun', ['run', 'typecheck'])
  await run('bun', ['run', 'lint'])
  for (const mode of ['production', 'dev']) {
    await run('bunx', ['playwright', 'test'], {
      ...process.env,
      CAPABILITY_MODE: mode,
      CAPABILITY_PORT: await freePort(),
    })
  }
  const policyPath = join(stage, 'src/lib/authorization.middleware.ts')
  const policy = await readFile(policyPath, 'utf8')
  await writeFile(join(stage, 'src/lib/authorization.server.ts'), policy)
  for (const feature of ['authoring', 'workflow']) {
    const path = join(stage, `src/features/${feature}/${feature}.functions.ts`)
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replaceAll(
        '#/lib/authorization.middleware',
        '#/lib/authorization.server',
      ),
    )
  }
  await expectImportDenial('Server-only factory evaluated at RPC declaration')
  await cp(join(root, 'tests/server-capabilities/src'), join(stage, 'src'), {
    recursive: true,
  })
  await rm(join(stage, 'src/lib/authorization.server.ts'))
  const rpcPath = join(stage, 'src/features/authoring/authoring.functions.ts')
  await writeFile(
    rpcPath,
    `${await readFile(rpcPath, 'utf8')}\nexport { authoring } from './authoring.surface.server'\n`,
  )
  const pagePath = join(stage, 'src/features/workflow/pages/CapabilityPage.tsx')
  await writeFile(
    pagePath,
    `import { authoring } from '../../authoring/authoring.functions'\n${await readFile(pagePath, 'utf8')}\nconsole.log(authoring)\n`,
  )
  await expectImportDenial('RPC re-export consumed by client')
} finally {
  await rm(stage, { recursive: true, force: true })
}
