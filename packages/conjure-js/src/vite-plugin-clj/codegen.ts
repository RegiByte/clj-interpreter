import type { Arity, DestructurePattern } from '../core/types'
import { extractNsName, extractNsRequires, extractStringRequires } from './namespace-utils'
import { readNamespaceVars } from './static-analysis'

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
