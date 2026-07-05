import { describe, expect, it } from 'vitest'
import { is } from '../../assertions'
import { createSession } from '../../session'
import type { VmFallbackReason } from '../../types'
import { tryCompileVmFnBody } from '../compiler'

function reasonKey(reason: VmFallbackReason): string {
  return `${reason.category} :: ${reason.detail}`
}

describe('VM clojure.core bytecode coverage reasons', () => {
  it('bytecode-compiles every clojure.core function arity', () => {
    const session = createSession({ vmExecutionMode: 'function-body' })
    const core = session.registry.get('clojure.core')
    const groups = new Map<string, number>()
    const rows: Array<{ name: string; reason: VmFallbackReason }> = []

    for (const [name, variable] of core?.ns?.vars ?? []) {
      const value = variable.value
      if (!is.function(value)) continue

      for (const arity of value.arities) {
        if (arity.bytecodeBody) continue

        const result = tryCompileVmFnBody(
          arity.params,
          arity.restParam,
          arity.body,
          value.name ?? name
        )

        expect(result.ok).toBe(false)
        if (result.ok) continue

        rows.push({ name, reason: result.reason })
        const key = reasonKey(result.reason)
        groups.set(key, (groups.get(key) ?? 0) + 1)
      }
    }

    expect(rows).toHaveLength(0)
    expect(groups).toEqual(new Map())
    expect(rows.every(({ reason }) => reason.category !== 'compile-error')).toBe(
      true
    )
  })
})
