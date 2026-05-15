import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'
import { v } from '../../factories'
import { is } from '../../assertions'

describe('VM clojure.core/destructure coverage', () => {
  it('compiles clojure.core/destructure to a bytecode-backed function body', () => {
    const session = createSession()
    const core = session.registry.get('clojure.core')
    const destructure = core?.ns?.vars.get('destructure')?.value

    expect(destructure?.kind).toBe('function')
    if (destructure === undefined || !is.function(destructure)) return
    expect(destructure.arities[0].bytecodeBody).toBeDefined()
  })

  it('executes vector-pattern destructuring through the bytecode-backed body', () => {
    const session = createSession()

    expect(session.evaluate("(count (destructure '[[a b] v]))")).toEqual(
      v.number(6)
    )
    expect(
      session.evaluate(
        "(contains? (set (filter symbol? (destructure '[[a b] v]))) 'a)"
      )
    ).toEqual(v.boolean(true))
    expect(
      session.evaluate(
        "(contains? (set (filter symbol? (destructure '[[a b] v]))) 'b)"
      )
    ).toEqual(v.boolean(true))
  })
})
