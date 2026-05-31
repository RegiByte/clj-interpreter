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

function createVmRequiredSession(events?: EvalEvent[]): Session {
  return createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'vm-required',
    instrumentation: events
      ? { onEvent: (event) => events.push(event) }
      : undefined,
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

describe('VM defmacro', () => {
  it('returns a Var and interns a macro under vm-required', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate('(defmacro vm-m [] 1)')

    expect(result.kind).toBe('var')
    expect(s.getNs('user')?.vars.get('vm-m')?.value.kind).toBe('macro')
    expect(s.evaluate("(var? #'vm-m)")).toEqual(v.boolean(true))
    expect(s.evaluate("(var-get #'vm-m)").kind).toBe('macro')
  })

  it('makes a macro visible to later forms in the same source string', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate(`
      (defmacro forty-two [] 42)
      (forty-two)
    `)

    expect(result).toEqual(v.number(42))
  })

  it('executes quasiquote-heavy macro bodies without VM quasiquote support', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate(`
      (defmacro twice [x]
        \`(+ ~x ~x))
      (twice 21)
    `)

    expect(result).toEqual(v.number(42))
  })

  it('executes variadic macro bodies through bytecode', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate(`
      (defmacro emit-list [& xs]
        (cons 'list xs))
      (emit-list 1 2 3)
    `)

    expect(result).toEqual(v.list([v.number(1), v.number(2), v.number(3)]))
  })

  it('executes multi-arity macro bodies through bytecode', () => {
    const s = createVmRequiredSession()

    const result = s.evaluate(`
      (defmacro choose
        ([] 1)
        ([x] x))
      [(choose) (choose 9)]
    `)

    expect(result).toEqual(v.vector([v.number(1), v.number(9)]))
  })

  it('interns function-body defmacro into the current namespace', () => {
    const s = createVmRequiredSession()

    const defined = s.evaluate('((fn [] (defmacro inside-vm-macro [] 7)))')
    const used = s.evaluate('(inside-vm-macro)')

    expect(defined.kind).toBe('var')
    expect(used).toEqual(v.number(7))
  })

  it('emits top-level and macro-body instrumentation events', () => {
    const events: EvalEvent[] = []
    const s = createVmRequiredSession(events)

    const result = s.evaluate(`
      (defmacro instrumented-twice [x]
        \`(+ ~x ~x))
      (instrumented-twice 11)
    `)

    expect(result).toEqual(v.number(22))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'vm:top-level',
          mode: 'vm-required',
        }),
        expect.objectContaining({
          path: 'vm:macro-body',
          mode: 'vm-required',
          formKind: 'defmacro',
        }),
      ])
    )
  })

  it('preserves doc and arglists metadata on the Var and macro value', () => {
    const s = createVmRequiredSession()

    s.evaluate('(defmacro vm-meta "Does VM macro things." [a b & rest] a)')
    const varMeta = mapToObj(s.evaluate("(meta #'vm-meta)"))
    const description = mapToObj(s.evaluate("(describe #'vm-meta)"))
    const macroDescription = mapToObj(description[':value'])

    expect(varMeta[':doc']).toEqual(v.string('Does VM macro things.'))
    expect(varMeta[':arglists'].kind).toBe('vector')
    expect(s.evaluate("(count (:arglists (meta #'vm-meta)))")).toEqual(
      v.number(1)
    )
    expect(s.evaluate("(str (first (:arglists (meta #'vm-meta))))")).toEqual(
      v.string('[a b & rest]')
    )
    expect(macroDescription[':doc']).toEqual(
      v.string('Does VM macro things.')
    )
    expect(macroDescription[':arglists'].kind).toBe('vector')
  })

  it('preserves multi-arity arglists metadata', () => {
    const s = createVmRequiredSession()

    s.evaluate('(defmacro vm-multi-meta ([x] x) ([x y] x))')

    expect(s.evaluate("(count (:arglists (meta #'vm-multi-meta)))")).toEqual(
      v.number(2)
    )
    expect(
      s.evaluate("(count (:arglists (:value (describe #'vm-multi-meta))))")
    ).toEqual(v.number(2))
  })

  it('stamps source line and column metadata in vm-required evaluate', () => {
    const s = createVmRequiredSession()

    s.evaluate('(defmacro vm-line-a [] 1)\n(defmacro vm-line-b [] 2)', {
      lineOffset: 10,
      colOffset: 3,
    })

    expect(s.evaluate("(:line (meta #'vm-line-a))")).toEqual(v.number(11))
    expect(s.evaluate("(:column (meta #'vm-line-a))")).toEqual(v.number(13))
    expect(s.evaluate("(:line (meta #'vm-line-b))")).toEqual(v.number(12))
    expect(s.evaluate("(:column (meta #'vm-line-b))")).toEqual(v.number(10))
  })

  it('stamps file metadata when loadFile runs VM-compiled defmacro forms', () => {
    const s = createVmRequiredSession()

    s.loadFile(
      '(defmacro file-macro "From file." [x] x)',
      'vm.defmacro.file',
      '/src/vm/defmacro.clj'
    )
    s.setNs('vm.defmacro.file')

    expect(s.evaluate("(:file (meta #'file-macro))")).toEqual(
      v.string('/src/vm/defmacro.clj')
    )
    expect(s.evaluate("(:line (meta #'file-macro))")).toEqual(v.number(1))
    expect(s.evaluate("(:column (meta #'file-macro))")).toEqual(v.number(10))
    expect(s.evaluate("(file-macro 99)")).toEqual(v.number(99))
  })

  it('updates metadata and root macro on redefinition without replacing Var identity', () => {
    const s = createVmRequiredSession()

    const original = s.evaluate('(defmacro redef-macro "Old docs." [] 1)')
    const originalRoot = s.evaluate("(var-get #'redef-macro)")
    const redefined = s.evaluate(
      '\n(defmacro redef-macro "New docs." [x] x)',
      { lineOffset: 5 }
    )
    const redefinedRoot = s.evaluate("(var-get #'redef-macro)")

    expect(redefined).toBe(original)
    expect(s.evaluate("#'redef-macro")).toBe(original)
    expect(redefinedRoot).not.toBe(originalRoot)
    expect(s.evaluate('(redef-macro 42)')).toEqual(v.number(42))
    expect(s.evaluate("(:doc (meta #'redef-macro))")).toEqual(
      v.string('New docs.')
    )
    expect(s.evaluate("(:doc (:value (describe #'redef-macro)))")).toEqual(
      v.string('New docs.')
    )
    expect(s.evaluate("(:line (meta #'redef-macro))")).toEqual(v.number(7))
    expect(s.evaluate("(count (:arglists (meta #'redef-macro)))")).toEqual(
      v.number(1)
    )
  })

  it('interns public and private macros in the current namespace', () => {
    const s = createVmRequiredSession()

    s.evaluate('(defmacro public-macro [] 1)')
    s.evaluate('(defmacro ^:private private-macro [] 2)')

    expect(s.evaluate("(contains? (ns-publics 'user) 'public-macro)")).toEqual(
      v.boolean(true)
    )
    expect(s.evaluate("(contains? (ns-interns 'user) 'public-macro)")).toEqual(
      v.boolean(true)
    )
    expect(s.evaluate("(contains? (ns-publics 'user) 'private-macro)")).toEqual(
      v.boolean(false)
    )
    expect(s.evaluate("(contains? (ns-interns 'user) 'private-macro)")).toEqual(
      v.boolean(true)
    )
    expect(s.evaluate("(:private (meta #'private-macro))")).toEqual(
      v.boolean(true)
    )
  })

  it('supports qualified lookup for VM-defined macros from another namespace', () => {
    const s = createVmRequiredSession()

    s.loadFile(
      '(defmacro external-macro [x] x)',
      'vm.defmacro.external',
      '/src/vm/external.clj'
    )
    s.setNs('user')

    expect(s.evaluate("(vm.defmacro.external/external-macro 17)")).toEqual(
      v.number(17)
    )
    expect(s.evaluate("(var-get #'vm.defmacro.external/external-macro)").kind).toBe(
      'macro'
    )
  })

  it('can bootstrap and use clojure.core macros under opportunistic VM mode', () => {
    const events: EvalEvent[] = []
    const s = createSession({
      vmExecutionMode: 'opportunistic',
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    expect(
      events.some(
        (event) =>
          event.path === 'vm:top-level' && event.formKind === 'list:defmacro'
      )
    ).toBe(true)
    expect(s.evaluate("(vector? (:arglists (meta #'defn)))")).toEqual(
      v.boolean(true)
    )

    const eventCount = events.length
    expect(s.evaluate('(when true 42)')).toEqual(v.number(42))
    expect(
      events
        .slice(eventCount)
        .some((event) => event.path === 'vm:macro-body')
    ).toBe(true)
  })
})
