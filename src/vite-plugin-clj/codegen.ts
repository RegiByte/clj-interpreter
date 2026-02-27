import { isMacro } from '../core/assertions'
import type { Session } from '../core/session'
import type { CljValue } from '../core/types'
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

export function safeJsIdentifier(name: string): string {
  return name
    .replace(/-/g, '_')
    .replace(/\?/g, '_QMARK_')
    .replace(/!/g, '_BANG_')
    .replace(/\*/g, '_STAR_')
    .replace(/\+/g, '_PLUS_')
    .replace(/>/g, '_GT_')
    .replace(/</g, '_LT_')
    .replace(/=/g, '_EQ_')
    .replace(/'/g, '_QUOTE_')
}
