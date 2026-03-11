import { describe, expect, it } from 'vitest'
import { cljString } from '../factories'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../session'

const _snapshot = snapshotSession(createSession())

function session(opts?: { output?: (t: string) => void; stderr?: (t: string) => void }) {
  return createSessionFromSnapshot(_snapshot, opts)
}

describe('*out* / with-out-str', () => {
  it('with-out-str captures println output', () => {
    expect(session().evaluate('(with-out-str (println "hello"))')).toEqual(cljString('hello\n'))
  })

  it('with-out-str captures multiple calls', () => {
    expect(session().evaluate('(with-out-str (print "a") (print "b") (println "c"))')).toEqual(
      cljString('abc\n')
    )
  })

  it('with-out-str captures pr / prn', () => {
    expect(session().evaluate('(with-out-str (pr "x") (prn "y"))')).toEqual(
      cljString('"x""y"\n')
    )
  })

  it('with-out-str captures newline', () => {
    expect(session().evaluate('(with-out-str (newline))')).toEqual(cljString('\n'))
  })

  it('with-out-str returns empty string when body produces no output', () => {
    expect(session().evaluate('(with-out-str (+ 1 2))')).toEqual(cljString(''))
  })

  it('with-out-str nesting: inner does not bleed into outer', () => {
    const result = session().evaluate(`
      (with-out-str
        (println "outer-before")
        (let [inner (with-out-str (println "inner"))]
          (println (str "inner-was:" inner)))
        (println "outer-after"))
    `)
    expect(result).toEqual(cljString('outer-before\ninner-was:inner\n\nouter-after\n'))
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
    expect(result).toEqual(cljString('captured\n'))
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
      cljString('bad thing\n')
    )
  })

  it('with-err-str captures multiple warn calls', () => {
    expect(session().evaluate('(with-err-str (warn "a") (warn "b"))')).toEqual(
      cljString('a\nb\n')
    )
  })

  it('with-err-str does not fire the session stderr callback', () => {
    const errs: string[] = []
    const s = session({ stderr: (t) => errs.push(t) })
    const result = s.evaluate('(with-err-str (warn "captured"))')
    expect(result).toEqual(cljString('captured\n'))
    expect(errs).toEqual([])
  })

  it('warn does not go to stdout', () => {
    const out: string[] = []
    const s = session({ output: (t) => out.push(t), stderr: () => {} })
    s.evaluate('(warn "error msg")')
    expect(out).toEqual([])
  })
})
