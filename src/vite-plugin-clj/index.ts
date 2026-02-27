import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { createSession } from '../core/session'
import type { Session } from '../core/session'
import { nsToPath, pathToNs } from './namespace-utils'
import { generateModuleCode, safeJsIdentifier } from './codegen'
import type { CodegenContext } from './codegen'

interface CljPluginOptions {
  sourceRoots?: string[]
}

const VIRTUAL_SESSION_ID = 'virtual:clj-session'
const RESOLVED_VIRTUAL_SESSION_ID = '\0' + VIRTUAL_SESSION_ID

export function cljPlugin(options?: CljPluginOptions): Plugin {
  const sourceRoots = options?.sourceRoots ?? ['src']
  let projectRoot = ''
  let serverSession: Session
  let coreIndexPath: string
  let macrosPath: string
  let codegenCtx: CodegenContext

  function initServerSession() {
    serverSession = createSession({
      entries: [readFileSync(macrosPath, 'utf-8')],
      sourceRoots,
      readFile: (filePath: string) =>
        readFileSync(resolve(projectRoot, filePath), 'utf-8'),
    })
    codegenCtx = {
      session: serverSession,
      sourceRoots,
      coreIndexPath,
      virtualSessionId: VIRTUAL_SESSION_ID,
      resolveDepPath: (depNs: string) => {
        for (const root of sourceRoots) {
          const depPath = resolve(projectRoot, nsToPath(depNs, root))
          try {
            readFileSync(depPath)
            return depPath
          } catch {
            continue
          }
        }
        return null
      },
    }
  }

  return {
    name: 'vite-plugin-clj',

    configResolved(config: ResolvedConfig) {
      projectRoot = config.root
      coreIndexPath = resolve(projectRoot, 'src/core/index.ts')
      macrosPath = resolve(projectRoot, 'src/clojure/macros.clj')
      initServerSession()
    },

    resolveId(source: string) {
      if (source === VIRTUAL_SESSION_ID) {
        return RESOLVED_VIRTUAL_SESSION_ID
      }
      if (source.endsWith('.clj') && !source.includes('?')) {
        return null
      }
      return undefined
    },

    load(id: string) {
      if (id === RESOLVED_VIRTUAL_SESSION_ID) {
        return [
          `import { createSession } from ${JSON.stringify(coreIndexPath)};`,
          `import macrosSource from ${JSON.stringify(macrosPath + '?raw')};`,
          ``,
          `let _session = null;`,
          `export function getSession() {`,
          `  if (!_session) {`,
          `    _session = createSession({ entries: [macrosSource] });`,
          `  }`,
          `  return _session;`,
          `}`,
        ].join('\n')
      }

      if (id.endsWith('.clj') && !id.includes('?')) {
        const source = readFileSync(id, 'utf-8')
        const nsNameFromPath = pathToNs(relative(projectRoot, id), sourceRoots)
        return generateModuleCode(codegenCtx, nsNameFromPath, source)
      }
    },

    hotUpdate({ file, modules, read }) {
      if (!file.endsWith('.clj')) return

      const doUpdate = async () => {
        const source = await read()
        try {
          const nsName = pathToNs(relative(projectRoot, file), sourceRoots)
          serverSession.loadFile(source, nsName)
        } catch {
          // file may not be under source roots
        }
        return modules
      }

      return doUpdate()
    },
  } satisfies Plugin
}

export { safeJsIdentifier, generateModuleCode }
export type { CljPluginOptions, CodegenContext }
