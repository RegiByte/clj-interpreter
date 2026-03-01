import { isMacro } from '../core/assertions'
import type { Session } from '../core/session'
import type { Arity, CljValue } from '../core/types'
import { extractNsName, extractNsRequires } from './namespace-utils'

export interface CodegenContext {
  session: Session
  sourceRoots: string[]
  coreIndexPath: string
  virtualSessionId: string
  resolveDepPath: (depNs: string) => string | null
}

export function generateModuleCode(
  ctx: CodegenContext,
  nsNameFromPath: string,
  source: string
): string {
  const nsName = extractNsName(source) ?? nsNameFromPath

  ctx.session.loadFile(source, nsName)

  const requires = extractNsRequires(source)
  const depImports = requires
    .map((depNs) => {
      const depPath = ctx.resolveDepPath(depNs)
      if (depPath) return `import ${JSON.stringify(depPath)};`
      return null
    })
    .filter(Boolean)
    .join('\n')

  const nsEnv = ctx.session.getNs(nsName)
  if (!nsEnv) {
    return `throw new Error('Namespace ${nsName} failed to load');`
  }

  const exportLines: string[] = []
  for (const [name, value] of nsEnv.bindings) {
    if (isMacro(value)) continue

    const safeName = safeJsIdentifier(name)
    if (isAFunction(value)) {
      exportLines.push(
        `export function ${safeName}(...args) {` +
          `  const fn = __ns.bindings.get(${JSON.stringify(name)});` +
          `  const cljArgs = args.map(jsToClj);` +
          `  const result = applyFunction(fn, cljArgs);` +
          `  return cljToJs(result);` +
          `}`
      )
    } else {
      exportLines.push(
        `export const ${safeName} = cljToJs(__ns.bindings.get(${JSON.stringify(name)}));`
      )
    }
  }

  const escapedSource = JSON.stringify(source)

  return [
    `import { getSession } from ${JSON.stringify(ctx.virtualSessionId)};`,
    `import { cljToJs, jsToClj, applyFunction } from ${JSON.stringify(ctx.coreIndexPath)};`,
    depImports,
    ``,
    `const __session = getSession();`,
    `__session.loadFile(${escapedSource}, ${JSON.stringify(nsName)});`,
    `const __ns = __session.getNs(${JSON.stringify(nsName)});`,
    ``,
    ...exportLines,
  ].join('\n')
}

function isAFunction(value: CljValue): boolean {
  return value.kind === 'function' || value.kind === 'native-function'
}

function cljValueToTsType(value: CljValue): string {
  switch (value.kind) {
    case 'number':
      return 'number'
    case 'string':
      return 'string'
    case 'boolean':
      return 'boolean'
    case 'nil':
      return 'null'
    case 'keyword':
      return 'string'
    case 'symbol':
      return 'string'
    case 'list':
    case 'vector':
      return 'unknown[]'
    case 'map':
      return 'Record<string, unknown>'
    case 'function':
    case 'native-function':
      return '(...args: unknown[]) => unknown'
    case 'macro':
      return 'never'
    default:
      throw new Error(`Unknown CljValue kind: ${value.kind}`)
  }
}

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

export function generateDts(
  ctx: CodegenContext,
  nsNameFromPath: string,
  source: string
): string {
  const nsName = extractNsName(source) ?? nsNameFromPath

  try {
    ctx.session.loadFile(source, nsName)
  } catch {
    return ''
  }

  const nsEnv = ctx.session.getNs(nsName)
  if (!nsEnv) return ''

  const declarations: string[] = []
  for (const [name, value] of nsEnv.bindings) {
    if (isMacro(value)) continue

    const safeName = safeJsIdentifier(name)

    if (value.kind === 'function') {
      for (const arity of value.arities) {
        declarations.push(
          `export function ${safeName}${arityToSignature(arity)};`
        )
      }
    } else if (value.kind === 'native-function') {
      declarations.push(
        `export function ${safeName}(...args: unknown[]): unknown;`
      )
    } else {
      declarations.push(`export const ${safeName}: ${cljValueToTsType(value)};`)
    }
  }

  return declarations.join('\n')
}

export function safeJsIdentifier(name: string): string {
  return name
    .replace(/-/g, '_')
    .replace(/\//g, '_DIV_')
    .replace(/\?/g, '_QMARK_')
    .replace(/!/g, '_BANG_')
    .replace(/\*/g, '_STAR_')
    .replace(/\+/g, '_PLUS_')
    .replace(/>/g, '_GT_')
    .replace(/</g, '_LT_')
    .replace(/=/g, '_EQ_')
    .replace(/'/g, '_QUOTE_')
}
