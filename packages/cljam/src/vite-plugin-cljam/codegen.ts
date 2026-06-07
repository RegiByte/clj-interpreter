import type { Arity } from '../core/types'
import { extractNsName, extractNsRequires } from './namespace-utils'
import { graphNeedsAsync } from './namespace-graph'
import { readNamespaceVars, readDeftestNames } from './static-analysis'

export interface CodegenContext {
  sourceRoots: string[]
  coreIndexPath: string
  virtualSessionId: string
  resolveDepPath: (depNs: string) => string | null
  /**
   * Read a dependency namespace's source for transitive graph analysis (S7).
   * Returns null when the namespace has no locatable source. Used by
   * {@link graphNeedsAsync} to discover host imports declared only in transitive
   * dependencies, so the sync-vs-async load decision matches the runtime loader.
   */
  readDepSource?: (depNs: string) => string | null
}

export function generateModuleCode(
  ctx: CodegenContext,
  nsNameFromPath: string,
  source: string
): string {
  const nsName = extractNsName(source) ?? nsNameFromPath

  // Graph-aware sync-vs-async decision (S7): the module needs async loading if
  // the file OR any namespace in its transitive closure declares a host import.
  // This mirrors the runtime loader's graphNeedsAsync; without it a purely
  // transitive host dependency would be missed and the bundle would break.
  const needsAsync = graphNeedsAsync(source, ctx)

  const requires = extractNsRequires(source)
  const depImports = requires
    .map((depNs) => {
      const depPath = ctx.resolveDepPath(depNs)
      // A declared dependency that cannot be resolved is a build error, not a
      // silent skip — a dropped import would surface later as a confusing
      // runtime "namespace not found". Fail fast with a clear message.
      if (!depPath) {
        throw new Error(
          `cljam: namespace "${nsName}" requires "${depNs}", but no source file ` +
            `was found for it under any configured source root ` +
            `(${ctx.sourceRoots.join(', ')}).`
        )
      }
      return `import ${JSON.stringify(depPath)};`
    })
    .join('\n')

  // Static analysis: pure AST walk, no execution.
  const vars = readNamespaceVars(source)
  const exportLines: string[] = []

  for (const descriptor of vars) {
    if (descriptor.isMacro) continue
    if (descriptor.isPrivate) continue

    const safeName = safeJsIdentifier(descriptor.name)
    // At runtime, vars.get() returns a CljVar; deref with .value
    const deref = `__ns.vars.get(${JSON.stringify(descriptor.name)}).value`

    if (descriptor.kind === 'fn') {
      exportLines.push(
        `export function ${safeName}(...args) {` +
          `  const fn = ${deref};` +
          `  const cljArgs = args.map(jsToClj);` +
          `  const result = __session.applyFunction(fn, cljArgs);` +
          `  return cljToJs(result, __session);` +
          `}`
      )
    } else {
      exportLines.push(
        `export const ${safeName} = cljToJs(${deref}, __session);`
      )
    }
  }

  const escapedSource = JSON.stringify(source)
  // Graphs that touch a host import need async loading (top-level await, requires
  // target: esnext). Pure Clojure graphs use the sync path — no TLA overhead.
  const loadCall = needsAsync
    ? `await __session.loadFileAsync(${escapedSource}, ${JSON.stringify(nsName)});`
    : `__session.loadFile(${escapedSource}, ${JSON.stringify(nsName)});`

  if (exportLines.length === 0) {
    // No public exports — emit a minimal module that loads the namespace at runtime.
    // Namespace will be available in the session even without JS-side exports.
    return [
      `import { getSession } from ${JSON.stringify(ctx.virtualSessionId)};`,
      depImports,
      ``,
      `const __session = getSession();`,
      loadCall,
      ``,
      `if (import.meta.hot) { import.meta.hot.accept() }`,
    ].join('\n')
  }

  return [
    `import { getSession } from ${JSON.stringify(ctx.virtualSessionId)};`,
    `import { cljToJs, jsToClj } from ${JSON.stringify(ctx.coreIndexPath)};`,
    depImports,
    ``,
    `const __session = getSession();`,
    loadCall,
    `const __ns = __session.getNs(${JSON.stringify(nsName)});`,
    ``,
    ...exportLines,
    ``,
    `// Self-accept HMR: re-execute this module on save (updates browser session)`,
    `// without propagating to parent modules — prevents full page reload.`,
    `if (import.meta.hot) { import.meta.hot.accept() }`,
  ].join('\n')
}

export function generateDts(
  _ctx: CodegenContext,
  nsNameFromPath: string,
  source: string
): string {
  const nsName = extractNsName(source) ?? nsNameFromPath
  const vars = readNamespaceVars(source)

  const declarations: string[] = []
  for (const descriptor of vars) {
    if (descriptor.isMacro) continue
    if (descriptor.isPrivate) continue

    const safeName = safeJsIdentifier(descriptor.name)

    if (descriptor.kind === 'fn') {
      if (descriptor.arities && descriptor.arities.length > 0) {
        for (const arity of descriptor.arities) {
          declarations.push(`export function ${safeName}${arityToSignature(arity)};`)
        }
      } else {
        declarations.push(`export function ${safeName}(...args: unknown[]): unknown;`)
      }
    } else {
      // 'const' with inferred type, or 'unknown'
      const tsType = descriptor.tsType ?? 'unknown'
      declarations.push(`export const ${safeName}: ${tsType};`)
    }
  }

  // Suppress the unused-variable warning — nsName is used for documentation only here
  void nsName

  return declarations.join('\n')
}

/**
 * Options for {@link generateTestModuleCode}.
 */
export interface TestCodegenOptions {
  /**
   * Test framework that provides the `test()` function.
   * - `'vitest'` (default): `import { test } from 'vitest'`
   * - `'bun:test'`: `import { test } from 'bun:test'`
   */
  testFramework?: 'vitest' | 'bun:test'
  /**
   * Absolute path to a user-defined session factory module, or `null` (default)
   * for a pristine session.
   *
   * The module must default-export a zero-arg function:
   *   `() => SessionOptions | null | undefined`
   *
   * Its return value is spread into `createSession()`. The `output` callback is
   * always overridden after the spread so test output stays under plugin control.
   */
  entrypointPath?: string | null
}

/**
 * Generate a test module for a `.test.clj` / `.spec.clj` file.
 *
 * Each top-level `deftest` (in any spelling — bare, `t/deftest`, or
 * `clojure.test/deftest`) becomes one `test()` call in the target framework.
 * Failures are captured via a Clojure atom that the `clojure.test/report`
 * overrides write to — no JS-side concurrency issues because both vitest and
 * Bun's runner execute tests within a file sequentially.
 *
 * Architecture:
 *  1. Create an isolated cljam session for this file (optionally seeded from
 *     a user factory so the test session can carry hostBindings, libs, etc.).
 *  2. Load the Clojure source (registering all deftests as functions).
 *  3. Install `:fail` / `:error` report overrides that push formatted strings
 *     into `__vt_failures` atom instead of printing.
 *  4. For each deftest: reset the atom, call the function, read the atom.
 *     Failures collected → throw Error with all messages joined.
 *     Uncaught exceptions bubble directly to the runner (correct behaviour).
 */
export function generateTestModuleCode(
  ctx: CodegenContext,
  nsNameFromPath: string,
  source: string,
  testOptions: TestCodegenOptions = {}
): string {
  const { testFramework = 'vitest', entrypointPath = null } = testOptions

  const nsName = extractNsName(source) ?? nsNameFromPath
  const deftestNames = readDeftestNames(source)
  // Graph-aware async decision (S7), same as generateModuleCode — a transitive
  // host import in a required namespace must drive the async load call too.
  const needsAsync = graphNeedsAsync(source, ctx)

  const escapedSource = JSON.stringify(source)
  const loadCall = needsAsync
    ? `await __session.loadFileAsync(${escapedSource}, ${JSON.stringify(nsName)});`
    : `__session.loadFile(${escapedSource}, ${JSON.stringify(nsName)});`

  const testImport = testFramework === 'bun:test'
    ? `import { test } from 'bun:test';`
    : `import { test } from 'vitest';`

  // --- session creation lines (optionally seeded from user factory) ----------
  const sessionLines: string[] = entrypointPath
    ? [
        `const __session = createSession({`,
        `  ...(__sessionFactory() ?? {}),`,
        `  output: (t) => process.stdout.write(t),`,
        `});`,
      ]
    : [
        `const __session = createSession({ output: (t) => process.stdout.write(t) });`,
      ]

  const lines: string[] = [
    testImport,
    `import { createSession, installTestBridge, composeEachFixture, runDeftest } from ${JSON.stringify(ctx.coreIndexPath)};`,
    ...(entrypointPath
      ? [`import __sessionFactory from ${JSON.stringify(entrypointPath)};`]
      : []),
    ``,
    `// Isolated session — one per test file so state doesn't leak between files.`,
    ...sessionLines,
    `// loadFile evaluates the source but doesn't update session.currentNs.`,
    `// setNs syncs it so subsequent evaluate() calls run in the right namespace.`,
    `const __loadedNs = ${loadCall.replace(/;$/, '')};`,
    `__session.setNs(__loadedNs);`,
    ``,
    `// Test-framework failure bridge + :each fixture chain. The wiring lives in a`,
    `// shared runtime helper (core/testing/clojure-test-bridge) so codegen, the`,
    `// bridge spec, and the differential harness stay in lockstep.`,
    `installTestBridge(__session);`,
    `composeEachFixture(__session, ${JSON.stringify(nsName)});`,
    ``,
  ]

  for (const testName of deftestNames) {
    lines.push(
      `test(${JSON.stringify(testName)}, async () => {`,
      `  // runDeftest resets __vt_failures, runs the deftest through the :each fixture`,
      `  // chain (awaiting any CljPending result), and returns the collected failures.`,
      `  const __failures = await runDeftest(__session, ${JSON.stringify(testName)});`,
      `  if (__failures.length > 0) {`,
      `    throw new Error(__failures.join('\\n\\n'));`,
      `  }`,
      `});`,
      ``,
    )
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Signature helpers
// ---------------------------------------------------------------------------

function arityToSignature(arity: Arity): string {
  const fixedParams = arity.params
    .map((p) => `${safeJsIdentifier(p.name)}: unknown`)
    .join(', ')

  if (arity.restParam) {
    const restName = safeJsIdentifier(arity.restParam.name)
    const params = fixedParams
      ? `${fixedParams}, ...${restName}: unknown[]`
      : `...${restName}: unknown[]`
    return `(${params}): unknown`
  }

  return `(${fixedParams}): unknown`
}

// ---------------------------------------------------------------------------
// Identifier sanitization
// ---------------------------------------------------------------------------

const JS_RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
  'yield', 'enum', 'await',
])

export function safeJsIdentifier(name: string): string {
  const transformed = name
    .replace(/(?<=[a-zA-Z0-9])-(?=[a-zA-Z0-9])/g, '_')
    .replace(/-/g, '_MINUS_')
    .replace(/\//g, '_DIV_')
    .replace(/\?/g, '_QMARK_')
    .replace(/!/g, '_BANG_')
    .replace(/\*/g, '_STAR_')
    .replace(/\+/g, '_PLUS_')
    .replace(/>/g, '_GT_')
    .replace(/</g, '_LT_')
    .replace(/=/g, '_EQ_')
    .replace(/\./g, '_DOT_')
    .replace(/'/g, '_QUOTE_')
  return JS_RESERVED_WORDS.has(transformed) ? `$${transformed}` : transformed
}
