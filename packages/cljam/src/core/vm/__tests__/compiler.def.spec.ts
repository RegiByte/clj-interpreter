import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  type Session,
} from '../../session'
import type { CljValue, EvalEvent } from '../../types'

const baseline = snapshotSession(createSession())

function createVmRequiredSession(): Session {
  return createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'vm-required',
  })
}

function mapToObj(value: CljValue): Record<string, CljValue> {
  if (value.kind !== 'map') throw new Error(`Expected map, got ${value.kind}`)
  const obj: Record<string, CljValue> = {}
  for (const [k, v] of value.entries) {
    if (k.kind === 'keyword') obj[k.name] = v
    else if (k.kind === 'string') obj[k.value] = v
  }
  return obj
}

describe('VM def parity hardening', () => {
  it('keeps bare def declarations as nil-returning no-ops', () => {
    const s = createVmRequiredSession()

    expect(s.evaluate('(def native-shim)')).toEqual(v.nil())
    expect(s.getNs('user')?.vars.has('native-shim')).toBe(false)
  })

  it('pops bare def nil results normally inside do bodies', () => {
    const s = createVmRequiredSession()

    expect(s.evaluate('(do (def native-shim) 42)')).toEqual(v.number(42))
    expect(s.getNs('user')?.vars.has('native-shim')).toBe(false)
  })

  it('marks VM-defined vars dynamic and composes with VM binding plus set!', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate(`
      (do
        (def ^:dynamic *vm-def-x* :root)
        (binding [*vm-def-x* :bound]
          (set! *vm-def-x* :mutated)
          *vm-def-x*))
    `)

    expect(result).toEqual(v.keyword(':mutated'))
    expect(s.evaluate('*vm-def-x*')).toEqual(v.keyword(':root'))
    expect(s.evaluate("(:dynamic (meta #'*vm-def-x*))")).toEqual(
      v.boolean(true)
    )
  })

  it('preserves private metadata for ns-publics and ns-interns filtering', () => {
    const s = createVmRequiredSession()

    s.evaluate('(def ^:private vm-internal 42)')

    expect(s.evaluate("(contains? (ns-publics 'user) 'vm-internal)")).toEqual(
      v.boolean(false)
    )
    expect(s.evaluate("(contains? (ns-interns 'user) 'vm-internal)")).toEqual(
      v.boolean(true)
    )
    expect(s.evaluate("(:private (meta #'vm-internal))")).toEqual(
      v.boolean(true)
    )
  })

  it('stamps source line and column metadata in vm-required evaluate', () => {
    const s = createVmRequiredSession()

    s.evaluate('(def vm-line-a 1)\n(def vm-line-b 2)', {
      lineOffset: 10,
      colOffset: 3,
    })

    expect(s.evaluate("(:line (meta #'vm-line-a))")).toEqual(v.number(11))
    expect(s.evaluate("(:column (meta #'vm-line-a))")).toEqual(v.number(8))
    expect(s.evaluate("(:line (meta #'vm-line-b))")).toEqual(v.number(12))
    expect(s.evaluate("(:column (meta #'vm-line-b))")).toEqual(v.number(5))
  })

  it('stamps file metadata when loadFile runs VM-compiled def forms', () => {
    const s = createVmRequiredSession()

    s.loadFile('(def vm-file-value 3.14)', 'vm.def.file', '/src/vm/def.clj')
    s.setNs('vm.def.file')

    expect(s.evaluate("(:file (meta #'vm-file-value))")).toEqual(
      v.string('/src/vm/def.clj')
    )
    expect(s.evaluate("(:line (meta #'vm-file-value))")).toEqual(v.number(1))
    expect(s.evaluate("(:column (meta #'vm-file-value))")).toEqual(v.number(5))
  })

  it('updates source metadata on VM redefinition without replacing Var identity', () => {
    const s = createVmRequiredSession()

    const original = s.evaluate('(def vm-redef 1)')
    const redefined = s.evaluate('\n(def vm-redef 2)', { lineOffset: 5 })

    expect(redefined).toBe(original)
    expect(s.evaluate('#\'vm-redef')).toBe(original)
    expect(s.evaluate("(:line (meta #'vm-redef))")).toEqual(v.number(7))
    expect(s.evaluate('vm-redef')).toEqual(v.number(2))
  })

  it('interns def inside a bytecode function body into the current namespace', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate(`
      (do
        ((fn []
           (let* [inside-fn :lexical]
             (def inside-fn 42)
             inside-fn)))
        [(contains? (ns-interns 'user) 'inside-fn)
         (var-get #'inside-fn)
         inside-fn])
    `)

    expect(result).toEqual(
      v.vector([v.boolean(true), v.number(42), v.number(42)])
    )
  })

  it('preserves defn doc and arglists through macro-expanded VM def', () => {
    const s = createVmRequiredSession()

    s.evaluate('(defn vm-greet "Greets via VM." [name] (str "Hello " name))')
    const description = mapToObj(s.evaluate('(describe vm-greet)'))
    const varMeta = mapToObj(s.evaluate("(meta #'vm-greet)"))

    expect(s.evaluate('(vm-greet "Ada")')).toEqual(v.string('Hello Ada'))
    expect(description[':kind']).toEqual(v.keyword(':fn'))
    expect(description[':name']).toEqual(v.string('vm-greet'))
    expect(description[':doc']).toEqual(v.string('Greets via VM.'))
    expect(description[':arglists'].kind).toBe('vector')
    expect(varMeta[':doc']).toEqual(v.string('Greets via VM.'))
    expect(varMeta[':arglists'].kind).toBe('vector')
  })

  it('does not create a new Var when the initializer throws before def', () => {
    const events: EvalEvent[] = []
    const s = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'vm-required',
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    expect(() => s.evaluate('(def vm-never-created (throw {:type :boom}))')).toThrow()
    expect(s.getNs('user')?.vars.has('vm-never-created')).toBe(false)
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'vm:top-level',
          mode: 'vm-required',
        }),
      ])
    )
  })

  it('does not mutate an existing Var when a redef initializer throws', () => {
    const s = createVmRequiredSession()

    const original = s.evaluate('(def vm-still-root :root)')

    expect(() => s.evaluate('(def vm-still-root (throw {:type :boom}))')).toThrow()
    expect(s.evaluate('#\'vm-still-root')).toBe(original)
    expect(s.evaluate('vm-still-root')).toEqual(v.keyword(':root'))
  })
})
