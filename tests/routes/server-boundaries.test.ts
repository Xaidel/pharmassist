import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectSourceFiles, importSpecifiers, readSource } from './helpers'
import { boundaryFindings, inspectModule } from './dependency-graph'

const workspaceRoot = new URL('../..', import.meta.url)

// `server-only-modules` clause 11 and `ports-and-use-cases` require that no `*.server.ts`
// module declares module-level mutable state, naming `Map`, `Set`, `WeakMap`, and arrays.
// Both an `export` prefix and explicit generic arguments are ordinary spellings of the same
// declaration, so both are matched: a pattern that misses them enforces the rule only for
// unexported, unparameterised collections. Indented declarations are function-local by
// construction and are deliberately not matched.
const MODULE_STATE =
  /^(export\s+)?(let|const) \w+(\s*:[^=\n]+)?\s*=\s*(new (Map|Set|WeakMap)(<[^>]*>)?\(|\[)/m

const INTRINSIC_ELEMENTS = [
  'a',
  'abbr',
  'address',
  'animate',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'circle',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'defs',
  'del',
  'desc',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'ellipse',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'filter',
  'footer',
  'form',
  'g',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hatch',
  'hatchpath',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'image',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'line',
  'link',
  'main',
  'map',
  'mark',
  'marker',
  'mask',
  'menu',
  'meta',
  'metadata',
  'meter',
  'mpath',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'path',
  'pattern',
  'picture',
  'polygon',
  'polyline',
  'pre',
  'progress',
  'q',
  'rect',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'search',
  'section',
  'select',
  'set',
  'slot',
  'small',
  'source',
  'span',
  'stop',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'svg',
  'switch',
  'symbol',
  'table',
  'tbody',
  'td',
  'template',
  'text',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'tspan',
  'u',
  'ul',
  'use',
  'var',
  'video',
  'view',
  'wbr',
].join('|')

/**
 * Matches an intrinsic JSX element, either opening or closing.
 *
 * The tag name must be an actual element, so `useState<string>()` and
 * `new Map<string, Order>()` are not markup. The lookbehind requires the `<` not to
 * follow an identifier character, which is what keeps a type argument such as `Array<a>`
 * from reading as a tag. A capitalized name is a component, which belongs in a feature
 * and is therefore not markup here.
 */
const INTRINSIC_ELEMENT_PATTERN = new RegExp(
  `(?<![A-Za-z0-9_$])<\\/?(?:${INTRINSIC_ELEMENTS})(?=[\\s/>])`,
)

describe('client and server source boundaries', () => {
  it('keeps server-only modules out of routes and rendered feature UI', async () => {
    const clientPaths = [
      ...(await collectSourceFiles('src/routes/')),
      ...(await collectSourceFiles('src/features/')),
    ].filter(
      (path) =>
        !path.endsWith('.server.ts') &&
        !path.endsWith('.functions.ts') &&
        // The syntax-aware gate checks private uses inside transformed middleware callbacks.
        !path.endsWith('.middleware.ts') &&
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx'),
    )

    const sources = await Promise.all(
      clientPaths.map(async (path) => ({
        path,
        source: await readSource(path),
      })),
    )

    for (const { path, source } of sources) {
      const handlerOnlyImports = path.startsWith('src/routes/')
        ? inspectModule(source).serverHandlerImports
        : []
      const withoutHandlerImports = handlerOnlyImports.reduce(
        (current, specifier) =>
          current
            .replaceAll(`from '${specifier}'`, '')
            .replaceAll(`from "${specifier}"`, ''),
        source,
      )

      expect(withoutHandlerImports).not.toMatch(/from ['"][^'"]+\.server['"]/)
      expect(source).not.toContain('@tanstack/react-start/server')
    }
  })

  it('keeps route declarations thin and feature-owned', async () => {
    const homeRoute = await readFile(
      new URL('src/routes/index.tsx', workspaceRoot),
      'utf8',
    )

    expect(homeRoute).toContain('HomePage')
    expect(homeRoute).not.toContain('<main')
  })

  it('keeps feature markup out of every route but the document shell', async () => {
    const routePaths = await collectSourceFiles('src/routes/')
    const shellPath = 'src/routes/__root.tsx'

    expect(routePaths).toContain(shellPath)

    for (const path of routePaths.filter((route) => route !== shellPath)) {
      const source = await readSource(path)

      expect(
        source,
        `${path} must name a page component, not render markup`,
      ).not.toMatch(INTRINSIC_ELEMENT_PATTERN)
    }
  })
})

describe('application layer boundaries', () => {
  it('keeps ports and use cases pure, client-safe, and free of adapters', async () => {
    const applicationPaths = (await collectSourceFiles('src/features/')).filter(
      (path) => path.endsWith('.port.ts') || path.endsWith('.use-cases.ts'),
    )

    for (const path of applicationPaths) {
      const source = await readSource(path)

      expect(source, path).not.toMatch(/from ['"][^'"]+\.server['"]/)
      expect(source, path).not.toContain('@tanstack/react-start')
      expect(source, path).not.toMatch(/from ['"]react['"]/)
      expect(source, path).not.toMatch(/from ['"]node:/)
      expect(source, path).not.toMatch(
        /new Date\(|Date\.now\(|Math\.random\(|crypto\./,
      )
      expect(source, path).not.toContain('process.env')
    }
  })

  it('makes use cases depend on declared ports', async () => {
    const useCasePaths = (await collectSourceFiles('src/features/')).filter(
      (path) => path.endsWith('.use-cases.ts'),
    )

    for (const path of useCasePaths) {
      const source = await readSource(path)

      expect(
        importSpecifiers(source).some((specifier) =>
          specifier.endsWith('.port'),
        ),
        `${path} must receive its collaborators from a *.port.ts module`,
      ).toBe(true)
    }
  })

  it('keeps test-only seams and module state out of server modules', async () => {
    const serverPaths = (await collectSourceFiles('src/features/')).filter(
      (path) => path.endsWith('.server.ts'),
    )

    for (const path of serverPaths) {
      const source = await readSource(path)

      expect(source, path).not.toMatch(/\w+ForTests\b/)
      expect(
        source,
        `${path} must build mutable state inside a create* factory, not at module scope`,
      ).not.toMatch(MODULE_STATE)
    }
  })

  it('catches every module-scope mutable state spelling the records forbid', () => {
    const forbidden = [
      'const store = new Map()',
      'let cache = new Set()',
      'const rows: Row[] = []',
      'export const store = new Map()',
      'const store = new Map<string, number>()',
      'export const store = new Map<string, number>()',
      'export const seen = new WeakMap<object, string>()',
      'export const rows: Row[] = []',
    ]
    for (const declaration of forbidden) {
      expect(declaration, declaration).toMatch(MODULE_STATE)
    }

    const allowed = [
      '  const local = new Map()',
      'const total = 42',
      'export const config = { retries: 3 }',
      'const seen = new WeakSet()',
    ]
    for (const declaration of allowed) {
      expect(declaration, declaration).not.toMatch(MODULE_STATE)
    }
  })
})

describe('feature, domain, and shared boundaries', () => {
  it('checks published server capabilities, lib ownership and production dependency cycles', async () => {
    const paths = (await collectSourceFiles('src/')).filter(
      (path) =>
        !path.endsWith('.test.ts') &&
        !path.endsWith('.test.tsx') &&
        !path.endsWith('routeTree.gen.ts'),
    )
    const sources = new Map(
      await Promise.all(
        paths.map(async (path) => [path, await readSource(path)] as const),
      ),
    )
    expect(boundaryFindings(sources)).toEqual([])
  })
  it('keeps domain modules pure and client-safe', async () => {
    const domainPaths = (await collectSourceFiles('src/features/')).filter(
      (path) => path.endsWith('.domain.ts'),
    )
    const sources = await Promise.all(domainPaths.map(readSource))

    for (const source of sources) {
      expect(source).not.toMatch(/from ['"][^'"]+\.server['"]/)
      expect(source).not.toMatch(/from ['"][^'"]+\.schema['"]/)
      expect(source).not.toMatch(/from ['"][^'"]+\.functions['"]/)
      expect(source).not.toContain('@tanstack/react-start')
      expect(source).not.toMatch(/from ['"]react['"]/)
      expect(source).not.toMatch(/from ['"]node:/)
      expect(source).not.toMatch(
        /new Date\(|Date\.now\(|Math\.random\(|crypto\./,
      )
      expect(source).not.toContain('process.env')
    }
  })

  it('keeps shared modules free of feature, route, and server imports', async () => {
    const sharedPaths = await collectSourceFiles('src/shared/')

    expect(sharedPaths.length).toBeGreaterThan(0)

    for (const source of await Promise.all(sharedPaths.map(readSource))) {
      expect(source).not.toMatch(/from ['"][^'"]*features\//)
      expect(source).not.toMatch(/from ['"][^'"]*routes\//)
      expect(source).not.toMatch(/from ['"][^'"]+\.server['"]/)
      expect(source).not.toContain('@tanstack/react-start')
    }
  })

  it('never deep-imports another feature domain or server module', async () => {
    const featurePaths = (await collectSourceFiles('src/features/')).filter(
      (path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'),
    )

    for (const path of featurePaths) {
      const source = await readSource(path)
      const feature = /^src\/features\/([^/]+)\//.exec(path)?.[1]
      if (!feature) {
        continue
      }

      for (const specifier of importSpecifiers(source)) {
        const resolved = specifier.startsWith('.')
          ? join(dirname(path), specifier)
          : specifier.replace(/^#\//, 'src/')
        const target = /^src\/features\/([^/]+)\//.exec(resolved)?.[1]
        if (target === undefined || target === feature) {
          continue
        }
        expect(
          specifier.endsWith('.functions') ||
            (specifier.endsWith('.surface.server') &&
              (path.endsWith('-binding.server.ts') ||
                path.endsWith('-adapter.server.ts'))),
          `${path} must consume public functions or a server-only surface through an integration binding`,
        ).toBe(true)
      }
    }
  })

  /**
   * A shared component is one at least two features genuinely use.
   *
   * This is the promotion half of the ownership rule made mechanical: a component with one
   * caller is not shared, it is that feature's component living in the wrong directory, and
   * Speculative Shared Code already says not to move it there on a hunch. A single-importer
   * file under `src/shared/components/` is the deterministic trace of that, so it fails.
   *
   * Deliberately vacuous when the app promotes nothing, which is the right state for a small
   * app — a promoted primitive belongs in `src/shared/components/ui/`, which this excludes. It
   * resolves direct import paths only, the same assumption the deep-import check above makes,
   * so a component re-exported through a barrel stays review's job.
   */
  it('promotes a shared component only once two features use it', async () => {
    const sharedComponentPaths = (
      await collectSourceFiles('src/shared/components/')
    ).filter((path) => !path.startsWith('src/shared/components/ui/'))

    const featureImports = await Promise.all(
      (await collectSourceFiles('src/features/'))
        .filter(
          (path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'),
        )
        .map(async (path) => ({
          path,
          feature: /^src\/features\/([^/]+)\//.exec(path)?.[1],
          specifiers: importSpecifiers(await readSource(path)),
        })),
    )

    for (const path of sharedComponentPaths) {
      const module = path.replace(/\.tsx?$/, '')
      const features = new Set(
        featureImports
          .filter(({ path: importer, specifiers }) =>
            specifiers.some(
              (specifier) =>
                (specifier.startsWith('.')
                  ? join(dirname(importer), specifier)
                  : specifier.replace(/^#\//, 'src/')) === module,
            ),
          )
          .map(({ feature }) => feature)
          .filter((feature): feature is string => feature !== undefined),
      )

      expect(
        features.size,
        `${path} is shared but ${String(features.size)} feature(s) import it — keep it in that feature's components/ until a second feature needs it, then promote`,
      ).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('the intrinsic element pattern', () => {
  it('recognizes markup a route must not contain', () => {
    const markup = [
      'return <div className="x">hi</div>',
      '  </div>\n)',
      '<span>hi</span>',
      '<h1>Order</h1>',
      'return <br/>',
      'return cond ? <main/> : null',
      'return (\n  <section>\n    <p>x</p>\n  </section>\n)',
      '<a href="/x">y</a>',
      '<svg><path d="M0 0"/></svg>',
      '<table><tr><td>x</td></tr></table>',
      '<form onSubmit={handler}>',
      '<select><option value="1">a</option></select>',
    ]

    for (const source of markup) {
      expect(source, source).toMatch(INTRINSIC_ELEMENT_PATTERN)
    }
  })

  it('does not mistake a type argument or a component for markup', () => {
    const notMarkup = [
      'const [s, setS] = useState<string>()',
      'const m = new Map<string, Order>()',
      'const [v] = useState<Array<string>>()',
      'const x: Array <string> = []',
      'type R = Record<data, string>',
      'async function f(): Promise<string> {}',
      'const r = useRef<number>(null)',
      'HTMLAttributes<HTMLDivElement>',
      'function identity<T>(v: T): T { return v }',
      'if (a < b) {}',
      'return <>x</>',
      'component: MenuPage',
      'loader: () => listOrders(),',
      'createServerFn({ method: "GET" })',
      'throw redirect({ to: "/menu" })',
      'throw notFound()',
      '<OrderCard order={order} />',
    ]

    for (const source of notMarkup) {
      expect(source, source).not.toMatch(INTRINSIC_ELEMENT_PATTERN)
    }
  })
})
