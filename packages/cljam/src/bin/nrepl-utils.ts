import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { extractNsName } from '../vite-plugin-cljam/namespace-utils'

/**
 * Given an absolute file path and the source it contains, infer the source
 * root directory by stripping the namespace-derived suffix from the path.
 *
 * Example:
 *   filePath = "/home/user/project/src/my/app.clj"
 *   ns       = "my.app"
 *   → "/home/user/project/src"
 */
export function inferSourceRoot(filePath: string, source: string): string | null {
  const nsName = extractNsName(source)
  if (!nsName) return null

  const normalizedPath = filePath.replace(/\\/g, '/')
  const nsSuffix = `/${nsName.replace(/\./g, '/')}.clj`
  if (!normalizedPath.endsWith(nsSuffix)) {
    return null
  }

  return normalizedPath.slice(0, -nsSuffix.length) || '/'
}

/**
 * Walk upward from `startDir` looking for a `package.json` with a `"cljam"` key.
 * If found, resolve `cljam.sourceRoots` to absolute paths relative to the
 * package.json location and return them.
 *
 * Falls back to `[startDir]` if no config is found.
 */
export function discoverSourceRoots(startDir: string): string[] {
  let dir = resolve(startDir)
  const root = resolve('/')

  while (true) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        if (pkg.cljam && Array.isArray(pkg.cljam.sourceRoots)) {
          const roots = (pkg.cljam.sourceRoots as string[]).map((r) =>
            resolve(dir, r)
          )
          return roots.length > 0 ? roots : [startDir]
        }
      } catch {
        // Malformed JSON — skip and keep walking
      }
    }

    if (dir === root) break
    dir = dirname(dir)
  }

  return [startDir]
}
