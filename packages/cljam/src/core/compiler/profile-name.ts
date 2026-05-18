import type { CompiledExpr } from '../types.ts'

const INVALID = /[^a-zA-Z0-9_$]/g

/**
 * Produce a valid JS `Function#name` for V8 CPU profiles and stack traces.
 * Collisions are acceptable; labels are for grouping hot paths.
 */
export function sanitizeCompiledExprProfileName(part: string): string {
  let s = part.replace(INVALID, '_').replace(/_+/g, '_')
  if (s.length > 120) s = s.slice(0, 120)
  if (!s || /^[0-9]/.test(s)) s = '_' + s
  return s || '_cljam'
}

const PROFILE_PREFIX = 'cljam$compile$'

/**
 * Tag a compiled AST closure for profilers via `Function#name`.
 * Does not add an extra call frame; best-effort if defineProperty fails.
 */
export function namedCompiledExpr(
  fragment: string,
  fn: CompiledExpr
): CompiledExpr {
  const name = sanitizeCompiledExprProfileName(`${PROFILE_PREFIX}${fragment}`)
  try {
    Object.defineProperty(fn, 'name', {
      value: name,
      configurable: true,
    })
  } catch {
    /* ignore — profiling hint only */
  }
  return fn
}
