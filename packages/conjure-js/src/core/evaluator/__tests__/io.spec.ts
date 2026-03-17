import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../../session'

const _snapshot = snapshotSession(createSession())

function session(opts?: { output?: (t: string) => void; stderr?: (t: string) => void }) {
  return createSessionFromSnapshot(_snapshot, opts)
}

describe('*out* / with-out-str', () => {
  it('with-out-str captures println output', () => {
    expect(session().evaluate('(with-out-str (println "hello"))')).toEqual(v.string('hello\n'))
  })

  it('with-out-str captures multiple calls', () => {
    expect(session().evaluate('(with-out-str (print "a") (print "b") (println "c"))')).toEqual(
      v.string('abc\n')
    )
  })

  it('with-out-str captures pr / prn', () => {
    expect(session().evaluate('(with-out-str (pr "x") (prn "y"))')).toEqual(
      v.string('"x""y"\n')
    )
  })

  it('with-out-str captures newline', () => {
    expect(session().evaluate('(with-out-str (newline))')).toEqual(v.string('\n'))
  })

  it('with-out-str returns empty string when body produces no output', () => {
    expect(session().evaluate('(with-out-str (+ 1 2))')).toEqual(v.string(''))
  })

  it('with-out-str nesting: inner does not bleed into outer', () => {
    const result = session().evaluate(`
      (with-out-str
        (println "outer-before")
        (let [inner (with-out-str (println "inner"))]
          (println (str "inner-was:" inner)))
        (println "outer-after"))
    `)
    expect(result).toEqual(v.string('outer-before\ninner-was:inner\n\nouter-after\n'))
  })

  it('output callback still fires when no *out* binding is active', () => {
    const collected: string[] = []
    const s = session({ output: (t) => collected.push(t) })
    s.evaluate('(println "direct")')
    expect(collected).toEqual(['direct\n'])
  })

  it('with-out-str does not fire the session output callback', () => {
    const collected: string[] = []
    const s = session({ output: (t) => collected.push(t) })
    const result = s.evaluate('(with-out-str (println "captured"))')
    expect(result).toEqual(v.string('captured\n'))
    expect(collected).toEqual([])
  })
})

describe('*err* / warn / with-err-str', () => {
  it('warn emits to session stderr callback', () => {
    const errs: string[] = []
    const s = session({ stderr: (t) => errs.push(t) })
    s.evaluate('(warn "oops")')
    expect(errs).toEqual(['oops\n'])
  })

  it('with-err-str captures warn output', () => {
    expect(session().evaluate('(with-err-str (warn "bad thing"))')).toEqual(
      v.string('bad thing\n')
    )
  })

  it('with-err-str captures multiple warn calls', () => {
    expect(session().evaluate('(with-err-str (warn "a") (warn "b"))')).toEqual(
      v.string('a\nb\n')
    )
  })

  it('with-err-str does not fire the session stderr callback', () => {
    const errs: string[] = []
    const s = session({ stderr: (t) => errs.push(t) })
    const result = s.evaluate('(with-err-str (warn "captured"))')
    expect(result).toEqual(v.string('captured\n'))
    expect(errs).toEqual([])
  })

  it('warn does not go to stdout', () => {
    const out: string[] = []
    const s = session({ output: (t) => out.push(t), stderr: () => {} })
    s.evaluate('(warn "error msg")')
    expect(out).toEqual([])
  })
})

describe('*print-length* dynamic binding', () => {
  it('binding *print-length* truncates pr output', () => {
    expect(session().evaluate('(binding [*print-length* 3] (pr-str [1 2 3 4 5]))')).toEqual(
      v.string('[1 2 3 ...]')
    )
  })

  it('*print-length* binding inside a function body is respected', () => {
    // This test exercises the snapshot env aliasing fix: the function is defined
    // after bootstrap and its body closes over the session's env. Without the fix,
    // tryLookup(callEnv) would traverse the stale snapshot env and miss the binding.
    const s = session()
    s.evaluate('(defn bounded-print [coll] (binding [*print-length* 2] (pr-str coll)))')
    expect(s.evaluate('(bounded-print [1 2 3 4])')).toEqual(v.string('[1 2 ...]'))
  })
})
