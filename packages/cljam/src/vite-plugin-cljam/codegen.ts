import type { Arity, DestructurePattern } from '../core/types'
import { extractNsName, extractNsRequires, extractStringRequires } from './namespace-utils'
import { readNamespaceVars, readDeftestNames } from './static-analysis'

export interface CodegenContext {
  sourceRoots: string[]
  coreIndexPath: string
  virtualSessionId: string
  resolveDepPath: (depNs: string) => string | null
}

export function generateModuleCode(
  ctx: CodegenContext,
  nsNameFromPath: string,
  source: string,
  filePath?: string
): string {
  const nsName = extractNsName(source) ?? nsNameFromPath

  // Detect string requires from AST — determines sync vs async load call.
  const hasStringRequires = extractStringRequires(source, filePath).length > 0

  const requires = extractNsRequires(source)
  const depImports = requires
    .map((depNs) => {
      const depPath = ctx.resolveDepPath(depNs)
      if (depPath) return `import ${JSON.stringify(depPath)};`
      return null
    })
    .filter(Boolean)
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
  // Files with string requires need async loading (top-level await, requires target: esnext).
  // Files without string requires use the sync path — no top-level await overhead.
  const loadCall = hasStringRequires
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
  const hasStringRequires = extractStringRequires(source).length > 0

  const escapedSource = JSON.stringify(source)
  const loadCall = hasStringRequires
    ? `await __session.loadFileAsync(${escapedSource}, ${JSON.stringify(nsName)});`
    : `__session.loadFile(${escapedSource}, ${JSON.stringify(nsName)});`

  const testImport = testFramework === 'bun:test'
    ? `import { test } from 'bun:test';`
    : `import { test } from 'vitest';`

  // Clojure expressions used to install the test-framework failure bridge.
  // JSON.stringify handles escaping for embedding in JS string literals.
  const failOverride = [
    '(defmethod clojure.test/report :fail [m]',
    '  (swap! __vt_failures conj',
    '    (str',
    '      (when (:message m) (str (:message m) "\\n"))',
    '      "expected: " (pr-str (:expected m)) "\\n"',
    '      "  actual: " (pr-str (:actual m)))))',
  ].join(' ')

  const errorOverride = [
    '(defmethod clojure.test/report :error [m]',
    '  (swap! __vt_failures conj',
    '    (str "error: " (pr-str (:actual m)))))',
  ].join(' ')

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
    `import { createSession, cljToJs } from ${JSON.stringify(ctx.coreIndexPath)};`,
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
    `// Ensure clojure.test is available for override installation.`,
    `__session.evaluate("(require '[clojure.test])");`,
    ``,
    `// Test-framework failure bridge: override :fail/:error to accumulate strings in an atom.`,
    `// All other report methods are silenced — the test runner controls the output.`,
    `__session.evaluate("(def __vt_failures (atom []))");`,
    `__session.evaluate(${JSON.stringify(failOverride)});`,
    `__session.evaluate(${JSON.stringify(errorOverride)});`,
    `__session.evaluate("(defmethod clojure.test/report :pass [_] nil)");`,
    `__session.evaluate("(defmethod clojure.test/report :begin-test-var [_] nil)");`,
    `__session.evaluate("(defmethod clojure.test/report :end-test-var [_] nil)");`,
    `__session.evaluate("(defmethod clojure.test/report :begin-test-ns [_] nil)");`,
    `__session.evaluate("(defmethod clojure.test/report :end-test-ns [_] nil)");`,
    `__session.evaluate("(defmethod clojure.test/report :summary [_] nil)");`,
    ``,
    `// Compose the :each fixture chain once for this file.`,
    `// join-fixtures of [] → default-fixture → (fn [f] (f)), so zero-fixture files pay no overhead.`,
    `// use-fixtures calls populate fixture-registry at loadFile time, so this runs after registration.`,
    `__session.evaluate(${JSON.stringify(`(def __vt_each_fixture (clojure.test/join-fixtures (get @clojure.test/fixture-registry [${JSON.stringify(nsName)} :each] [])))`)}); `,
    ``,
  ]

  for (const testName of deftestNames) {
    lines.push(
      `test(${JSON.stringify(testName)}, async () => {`,
      `  __session.evaluate("(reset! __vt_failures [])");`,
      `  // evaluateAsync awaits CljPending results (returned by (async ...) blocks),`,
      `  // and returns synchronously for ordinary deftests — no overhead either way.`,
      `  // __vt_each_fixture applies any :each fixtures registered via (use-fixtures :each ...).`,
      `  await __session.evaluateAsync(${JSON.stringify(`(__vt_each_fixture (fn [] (${testName})))`)});`,
      `  const __failures = cljToJs(__session.evaluate("@__vt_failures"), __session);`,
      `  if (Array.isArray(__failures) && __failures.length > 0) {`,
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

type ArityShape = { params: DestructurePattern[]; restParam: DestructurePattern | null }

function patternName(p: Arity['params'][number], index: number): string {
  if (p.kind === 'symbol') return safeJsIdentifier(p.name)
  return `arg${index}`
}

function arityToSignature(arity: ArityShape): string {
  const fixedParams = arity.params
    .map((p, i) => `${patternName(p, i)}: unknown`)
    .join(', ')

  if (arity.restParam) {
    const restName =
      arity.restParam.kind === 'symbol'
        ? safeJsIdentifier(arity.restParam.name)
        : 'rest'
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
