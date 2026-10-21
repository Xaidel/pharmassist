import { dirname, join, normalize } from 'node:path'
import ts from 'typescript'

/** A dependency retains its syntax role so type-only links cannot create runtime cycles. */
export type SourceDependency = {
  specifier: string
  typeOnly: boolean
  reexport: boolean
}

export type SourceModule = {
  dependencies: SourceDependency[]
  exportedImports: string[]
  unresolvedDynamicImport: boolean
  serverCallbackImports: string[]
  serverHandlerImports: string[]
}

/** Reads dependency syntax, including exports, side effects and literal dynamic imports. */
export function inspectModule(source: string): SourceModule {
  const file = ts.createSourceFile(
    'source.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const dependencies: SourceDependency[] = []
  const imported = new Map<string, string>()
  const exported = new Set<string>()
  const aliases = new Map<string, string>()
  const middlewareBuilders = new Set<string>()
  let unresolvedDynamicImport = false
  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text
      const clause = node.importClause
      const bindings = clause?.namedBindings
      const typeOnly =
        clause?.phaseModifier === ts.SyntaxKind.TypeKeyword ||
        (bindings !== undefined &&
          ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((element) => element.isTypeOnly) &&
          clause?.name === undefined)
      dependencies.push({ specifier, typeOnly, reexport: false })
      if (!typeOnly) {
        if (clause?.name) imported.set(clause.name.text, specifier)
        if (bindings && ts.isNamespaceImport(bindings))
          imported.set(bindings.name.text, specifier)
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            if (!element.isTypeOnly) imported.set(element.name.text, specifier)
            if (
              specifier === '@tanstack/react-start' &&
              (element.propertyName ?? element.name).text === 'createMiddleware'
            )
              middlewareBuilders.add(element.name.text)
          }
        }
      }
    }
    if (ts.isExportDeclaration(node)) {
      const clause = node.exportClause
      const typeOnly =
        node.isTypeOnly ||
        (clause !== undefined &&
          ts.isNamedExports(clause) &&
          clause.elements.length > 0 &&
          clause.elements.every((element) => element.isTypeOnly))
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        dependencies.push({
          specifier: node.moduleSpecifier.text,
          typeOnly,
          reexport: true,
        })
      } else if (!typeOnly && clause && ts.isNamedExports(clause)) {
        for (const element of clause.elements) {
          if (!element.isTypeOnly)
            exported.add((element.propertyName ?? element.name).text)
        }
      }
    }
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer && ts.isIdentifier(declaration.initializer))
          exported.add(declaration.initializer.text)
      }
    }
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression))
      exported.add(node.expression.text)
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const argument = node.arguments[0]
      if (
        argument &&
        (ts.isStringLiteral(argument) ||
          ts.isNoSubstitutionTemplateLiteral(argument))
      ) {
        dependencies.push({
          specifier: argument.text,
          typeOnly: false,
          reexport: false,
        })
      } else {
        unresolvedDynamicImport = true
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isIdentifier(declaration.initializer)
      )
        aliases.set(declaration.name.text, declaration.initializer.text)
    }
  }
  function importedSpecifier(
    name: string,
    seen = new Set<string>(),
  ): string | undefined {
    if (seen.has(name)) return undefined
    seen.add(name)
    const direct = imported.get(name)
    const alias = aliases.get(name)
    return direct ?? (alias ? importedSpecifier(alias, seen) : undefined)
  }
  const protectedUses = new Set<string>()
  const unprotectedUses = new Set<string>()
  function middlewareChain(node: ts.Expression): boolean {
    if (ts.isIdentifier(node)) return middlewareBuilders.has(node.text)
    if (ts.isCallExpression(node)) return middlewareChain(node.expression)
    if (ts.isPropertyAccessExpression(node))
      return middlewareChain(node.expression)
    return false
  }
  function inspectUses(node: ts.Node, protectedCallback = false): void {
    if (ts.isImportDeclaration(node)) return
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'server' &&
      middlewareChain(node.expression.expression)
    ) {
      inspectUses(node.expression, protectedCallback)
      for (const argument of node.arguments)
        inspectUses(
          argument,
          protectedCallback ||
            ts.isArrowFunction(argument) ||
            ts.isFunctionExpression(argument),
        )
      return
    }
    if (ts.isIdentifier(node) && imported.has(node.text))
      (protectedCallback ? protectedUses : unprotectedUses).add(node.text)
    ts.forEachChild(node, (child) => inspectUses(child, protectedCallback))
  }
  inspectUses(file)
  const serverHandlerUses = new Set<string>()
  const outsideServerHandlerUses = new Set<string>()
  function collectHandlerUses(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) return
    if (ts.isIdentifier(node) && imported.has(node.text))
      serverHandlerUses.add(node.text)
    ts.forEachChild(node, collectHandlerUses)
  }
  function inspectServerHandlerProperties(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) return
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'server'
    ) {
      collectHandlerUses(node.initializer)
      return
    }
    if (ts.isIdentifier(node) && imported.has(node.text))
      outsideServerHandlerUses.add(node.text)
    ts.forEachChild(node, inspectServerHandlerProperties)
  }
  inspectServerHandlerProperties(file)
  function handlerOnlyImport(specifier: string): boolean {
    const names = [...imported]
      .filter(([, target]) => target === specifier)
      .map(([name]) => name)
    return (
      names.some((name) => serverHandlerUses.has(name)) &&
      names.every((name) => !outsideServerHandlerUses.has(name))
    )
  }
  return {
    dependencies,
    exportedImports: [...exported].flatMap((name) => {
      const specifier = importedSpecifier(name)
      return specifier === undefined ? [] : [specifier]
    }),
    unresolvedDynamicImport,
    serverCallbackImports: [...new Set(imported.values())].filter(
      (specifier) => {
        const names = [...imported]
          .filter(([, target]) => target === specifier)
          .map(([name]) => name)
        return (
          names.some((name) => protectedUses.has(name)) &&
          names.every((name) => !unprotectedUses.has(name))
        )
      },
    ),
    serverHandlerImports: [...new Set(imported.values())].filter(
      handlerOnlyImport,
    ),
  }
}

/** Resolves the template's relative and #/ aliases against an explicit source inventory. */
export function resolveSource(
  importer: string,
  specifier: string,
  paths: Set<string>,
): string | null {
  const base = specifier.startsWith('.')
    ? normalize(join(dirname(importer), specifier)).replaceAll('\\', '/')
    : specifier.startsWith('#/')
      ? `src/${specifier.slice(2)}`
      : null
  if (base === null) return null
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (paths.has(candidate)) return candidate
  }
  return null
}

function feature(path: string): string | undefined {
  return /^src\/features\/([^/]+)\//.exec(path)?.[1]
}

function serverOnly(path: string): boolean {
  return /\.server\.[cm]?[jt]sx?$/.test(path)
}

/** Finds runtime cycles, or feature-level coupling cycles, with the complete offending path. */
export function cycles(adjacency: Map<string, string[]>): string[][] {
  const complete = new Set<string>()
  const active: string[] = []
  const found: string[][] = []
  function visit(path: string): void {
    const position = active.indexOf(path)
    if (position >= 0) {
      found.push([...active.slice(position), path])
      return
    }
    if (complete.has(path)) return
    active.push(path)
    for (const target of adjacency.get(path) ?? []) visit(target)
    active.pop()
    complete.add(path)
  }
  for (const path of adjacency.keys()) visit(path)
  return found
}

/** Checks published server entrypoints without granting access to private provider modules. */
export function boundaryFindings(sources: Map<string, string>): string[] {
  const paths = new Set(sources.keys())
  // Generated route registration is a leaf for author-owned architecture analysis.
  paths.add('src/routeTree.gen.ts')
  const modules = new Map(
    [...sources].map(([path, source]) => [path, inspectModule(source)]),
  )
  const findings: string[] = []
  const runtime = new Map<string, string[]>()
  const features = new Map<string, string[]>()
  // Follow only value exports through barrels. Ordinary handler-only imports are transformed by Start.
  function publishesServer(path: string, seen = new Set<string>()): boolean {
    if (serverOnly(path)) return true
    if (seen.has(path)) return false
    seen.add(path)
    const module = modules.get(path)
    if (!module) return false
    const exports = [
      ...module.dependencies
        .filter((dependency) => dependency.reexport && !dependency.typeOnly)
        .map((dependency) => dependency.specifier),
      ...module.exportedImports,
    ]
    return exports.some((specifier) => {
      const target = resolveSource(path, specifier, paths)
      return target !== null && publishesServer(target, seen)
    })
  }
  for (const [path, module] of modules) {
    const origin = feature(path)
    runtime.set(path, [])
    if (
      path.endsWith('-adapter.server.ts') &&
      !module.dependencies.some((dependency) =>
        resolveSource(path, dependency.specifier, paths)?.endsWith('.port.ts'),
      )
    )
      findings.push(
        `${path}: integration adapter must implement a declared consumer port`,
      )
    if (module.unresolvedDynamicImport)
      findings.push(
        `${path}: computed dynamic import obscures the dependency graph`,
      )
    if (!serverOnly(path) && publishesServer(path))
      findings.push(
        `${path}: client-importable module publishes a server-only value`,
      )
    for (const dependency of module.dependencies) {
      const transformedPrivateUse =
        path.endsWith('.middleware.ts') &&
        module.serverCallbackImports.includes(dependency.specifier)
      if (
        !dependency.typeOnly &&
        !serverOnly(path) &&
        !path.endsWith('.functions.ts') &&
        !transformedPrivateUse &&
        (dependency.specifier.startsWith('node:') ||
          dependency.specifier === '@tanstack/react-start/server')
      )
        findings.push(
          `${path}: client-safe module imports server infrastructure ${dependency.specifier}`,
        )
      const target = resolveSource(path, dependency.specifier, paths)
      if (target === null) {
        if (/\.css(?:\?.*)?$/.test(dependency.specifier)) continue
        if (
          dependency.specifier.startsWith('.') ||
          dependency.specifier.startsWith('#/')
        )
          findings.push(
            `${path}: unresolved source dependency ${dependency.specifier}`,
          )
        continue
      }
      const owner = feature(target)
      if (
        path.endsWith('.composition.server.ts') &&
        (target.endsWith('.functions.ts') ||
          target.endsWith('.surface.server.ts'))
      )
        findings.push(`${path}: composition must not import inbound wrappers`)
      if (!dependency.typeOnly) runtime.get(path)?.push(target)
      if (
        (path.startsWith('src/lib/') || path.startsWith('src/shared/')) &&
        (owner !== undefined || target.startsWith('src/routes/'))
      )
        findings.push(`${path}: shared/lib must not import ${target}`)
      const routeHandlerOnlyImport =
        path.startsWith('src/routes/') &&
        module.serverHandlerImports.includes(dependency.specifier)
      if (
        !dependency.typeOnly &&
        serverOnly(target) &&
        !serverOnly(path) &&
        !path.endsWith('.functions.ts') &&
        !routeHandlerOnlyImport &&
        !(
          path.endsWith('.middleware.ts') &&
          module.serverCallbackImports.includes(dependency.specifier)
        )
      )
        findings.push(`${path}: client-safe module imports ${target}`)
      if (origin && owner && origin !== owner) {
        const current = features.get(origin) ?? []
        features.set(origin, [...current, owner])
        const rpc = target.endsWith('.functions.ts')
        const surface = target.endsWith('.surface.server.ts')
        const binding = path.endsWith('-binding.server.ts')
        const adapterContract =
          dependency.typeOnly && path.endsWith('-adapter.server.ts')
        if (path.endsWith('-adapter.server.ts') && !dependency.typeOnly)
          findings.push(
            `${path}: injectable integration factory has a runtime provider dependency`,
          )
        if (
          surface &&
          binding &&
          !dependency.typeOnly &&
          !module.dependencies.some((candidate) => {
            const local = resolveSource(path, candidate.specifier, paths)
            return (
              local !== null &&
              feature(local) === origin &&
              local.endsWith('-adapter.server.ts') &&
              !candidate.typeOnly
            )
          })
        )
          findings.push(
            `${path}: integration binding must supply a consumer adapter factory`,
          )
        if (!rpc && !(surface && (binding || adapterContract)))
          findings.push(
            `${path}: cross-feature access must use public functions or a server-only surface through an integration binding`,
          )
      }
      if (
        target.endsWith('.composition.server.ts') &&
        !(path.endsWith('.functions.ts') || path.endsWith('.surface.server.ts'))
      )
        findings.push(
          `${path}: private composition is reachable only from its feature entrypoints`,
        )
    }
  }
  for (const cycle of cycles(runtime))
    findings.push(`runtime module cycle: ${cycle.join(' -> ')}`)
  for (const cycle of cycles(features))
    findings.push(`feature dependency cycle: ${cycle.join(' -> ')}`)
  return findings
}
