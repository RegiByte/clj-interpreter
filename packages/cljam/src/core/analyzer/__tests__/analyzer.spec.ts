import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { is } from '../../assertions'
import { v } from '../../factories'
import { readForms } from '../../reader'
import { createSession } from '../../session'
import { tokenize } from '../../tokenizer'
import type { CljValue } from '../../types'
import { mapEntries } from '../../persistent/map-helpers'

function analyzeLines(code: string): string[] {
  const r = createSession().evaluate(`(analyze* ${code})`)
  if (!is.vector(r)) throw new Error(`expected vector, got ${r.kind}`)
  return r.value.map((x) => {
    if (!is.string(x)) throw new Error(`expected string line, got ${x.kind}`)
    return x.value
  })
}

function analyzeClj(code: string): CljValue {
  return createSession().evaluate(`(ast* ${code})`)
}

function mapGet(map: CljValue, keyName: string): CljValue {
  if (!is.map(map)) throw new Error(`expected map, got ${map.kind}`)
  const entry = mapEntries(map).find(
    ([k]) => is.keyword(k) && k.name === `:${keyName}`
  )
  return entry ? entry[1] : v.nil()
}

describe('analyzer Phase 0 — analyze*', () => {
  it('does not evaluate the form (pure analysis)', () => {
    // (analyze* (/ 1 0)) must not throw a division error.
    const lines = analyzeLines('(/ 1 0)')
    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0]).toContain(':invoke')
  })

  it.each([
    ['(if)', 'if requires 2 or 3 arguments, got 0'],
    ['(if true)', 'if requires 2 or 3 arguments, got 1'],
    ['(if true 1 2 3)', 'if requires 2 or 3 arguments, got 4'],
  ])('reports malformed if arity for %s', (code, message) => {
    const out = analyzeLines(code).join('\n')
    expect(out).toContain(`; error: ${message}`)
  })

  it.each([
    ['(let* :not-a-vector 1)', 'let* bindings must be a vector'],
    [
      '(let* [x 1 y] x)',
      'let* bindings must have an even number of forms',
    ],
    [
      '(let* [[x] [1]] x)',
      'let* only supports simple symbol bindings; use let for destructuring',
    ],
    ['(loop* :not-a-vector 1)', 'loop* bindings must be a vector'],
    [
      '(loop* [i 0 acc] acc)',
      'loop* bindings must have an even number of forms',
    ],
    [
      '(loop* [:i 0] :i)',
      'loop* only supports simple symbol bindings; use loop for destructuring',
    ],
    ['(letfn* :bad nil)', 'letfn* bindings must be a vector'],
    [
      '(letfn* [f (fn* [] 1) g] (f))',
      'letfn* bindings must have an even number of forms',
    ],
    [
      '(letfn* [1 (fn* [] 1)] 1)',
      'letfn* binding names must be symbols',
    ],
  ])('reports malformed binding shape for %s', (code, message) => {
    const out = analyzeLines(code).join('\n')
    expect(out).toContain(`; error: ${message}`)
  })

  it.each([
    ['(set!)', 'set! requires exactly 2 arguments, got 0'],
    ['(set! x)', 'set! requires exactly 2 arguments, got 1'],
    ['(set! x 1 2)', 'set! requires exactly 2 arguments, got 3'],
    ['(set! 42 1)', 'set! first argument must be a symbol, got number'],
  ])('reports malformed set! shape for %s', (code, message) => {
    const out = analyzeLines(code).join('\n')
    expect(out).toContain(`; error: ${message}`)
  })

  it.each([
    ['(def)', 'First element of list must be a symbol'],
    ['(def 42 1)', 'First element of list must be a symbol'],
    ['(defmacro)', 'First element of defmacro must be a symbol'],
    ['(defmacro 42 [] 1)', 'First element of defmacro must be a symbol'],
    ['(var)', 'var expects a symbol'],
    ['(var 42)', 'var expects a symbol'],
  ])('reports malformed def/defmacro/var shape for %s', (code, message) => {
    const out = analyzeLines(code).join('\n')
    expect(out).toContain(`; error: ${message}`)
  })

  it.each([
    ['(fn*)', 'fn/defmacro requires at least a parameter vector'],
    ['(fn* [a & b & c] a)', '& can only appear once'],
    ['(fn* [a &] a)', '& must be second-to-last argument'],
    [
      '(fn* [[x]] x)',
      'fn* only supports simple symbol params; use fn for destructuring',
    ],
    [
      '(fn* [x & [more]] x)',
      'fn* only supports simple symbol rest param; use fn for destructuring',
    ],
    [
      '(fn* ([x] x) [y])',
      'Multi-arity clause must be a list starting with a parameter vector',
    ],
    [
      '(fn* (:bad 1))',
      'First element of arity clause must be a parameter vector',
    ],
    [
      '(fn* ([x & xs] x) ([y & ys] y))',
      'At most one variadic arity is allowed per function',
    ],
    ['(fn* :bad)', 'fn/defmacro expects a parameter vector or arity clauses'],
    [
      '(defmacro m)',
      'fn/defmacro requires at least a parameter vector',
    ],
    [
      '(defmacro m [x & [more]] x)',
      'fn* only supports simple symbol rest param; use fn for destructuring',
    ],
  ])('reports malformed fn*/defmacro arity shape for %s', (code, message) => {
    const out = analyzeLines(code).join('\n')
    expect(out).toContain(`; error: ${message}`)
  })

  it('analyzes nested arithmetic into invoke/const nodes', () => {
    const out = analyzeLines('(+ 1 (* 2 3))').join('\n')
    expect(out).toContain(':invoke')
    expect(out).toContain(':var')
    expect(out).toContain(':const number 1')
    expect(out).toContain(':const number 2')
    expect(out).toContain(':const number 3')
  })

  it('resolves fn params as locals and let bindings, with tail marking', () => {
    const out = analyzeLines('(fn [x] (let [y (inc x)] (+ x y)))').join('\n')
    expect(out).toContain(':fn')
    expect(out).toMatch(/:binding x :arg/)
    expect(out).toMatch(/:binding y :let/)
    // The (+ x y) call is in the function's tail position.
    expect(out).toContain('<tail>')
    expect(out).toMatch(/:local x slot=\d+ :local/)
  })

  it('marks upvalue captures across a fn boundary', () => {
    // x is captured by the inner fn as an upvalue.
    const out = analyzeLines('(fn [x] (fn [] x))').join('\n')
    expect(out).toMatch(/:local x slot=\d+ :upvalue#0/)
    expect(out).toMatch(/captures=\[x\]/)
  })

  it('records the macroexpansion chain in raw-forms', () => {
    const out = analyzeLines('(when true 1)').join('\n')
    // `when` expands to `if`; the expansion origin is shown.
    expect(out).toContain(':if')
    expect(out).toContain('expanded-from')
  })
})

describe('analyzer Phase 0 — RB-007 letfn/lazy-seq capture is visible', () => {
  const code = '(letfn [(nums [] (lazy-seq (cons 1 (nums))))] (nums))'

  it('shows the letfn name captured in the inner lazy-seq thunk (analyze*)', () => {
    const out = analyzeLines(code).join('\n')
    expect(out).toContain(':letfn')
    // The lazy-seq thunk is a nested fn that must capture `nums`.
    expect(out).toMatch(/captures=\[[^\]]*nums[^\]]*\]/)
    // And the letfn binding itself is marked captured.
    expect(out).toMatch(/:binding nums :letfn slot=\d+ captured/)
  })

  it('exposes the capture in the faithful ast* data', () => {
    const ast = analyzeClj(code)
    // Walk to a fn node and confirm some fn captures `nums`.
    const found = { hit: false }
    walkClj(ast, (node) => {
      const op = mapGet(node, 'op')
      if (is.keyword(op) && op.name === ':fn') {
        const captures = mapGet(node, 'captures')
        if (is.vector(captures)) {
          for (const cap of captures.value) {
            const name = mapGet(cap, 'name')
            if (is.symbol(name) && name.name === 'nums') found.hit = true
          }
        }
      }
    })
    expect(found.hit).toBe(true)
  })
})

describe('analyzer Phase 0 — ast* faithful data', () => {
  it('produces a node map with :op, :form, :context, :children', () => {
    const ast = analyzeClj('(if true 1 2)')
    expect(is.map(ast)).toBe(true)
    const op = mapGet(ast, 'op')
    expect(is.keyword(op) && op.name).toBe(':if')
    expect(is.keyword(mapGet(ast, 'context'))).toBe(true)
    expect(is.vector(mapGet(ast, 'children'))).toBe(true)
  })
})

describe('analyzer Phase 0 — recur validation', () => {
  it('flags recur outside a loop/fn', () => {
    const out = analyzeLines('(recur 1)').join('\n')
    expect(out).toContain('; error: recur called outside of loop or fn')
  })

  it('flags non-tail recur with the interpreter message', () => {
    const out = analyzeLines('(fn* [n] (+ 1 (recur n)))').join('\n')
    expect(out).toContain('; error: Can only recur from tail position')
  })

  it('flags recur arity mismatch with the interpreter message', () => {
    const out = analyzeLines('(loop* [a 1 b 2] (recur 10))').join('\n')
    expect(out).toContain('; error: recur expects 2 arguments but got 1')
  })

  it('accepts recur in loop tail position with matching arity', () => {
    const out = analyzeLines(
      '(loop [i 0] (if (< i 3) (recur (inc i)) i))'
    ).join('\n')
    expect(out).not.toContain('error:')
    expect(out).toContain(':recur target=loop/1')
  })
})

// Coverage gate: every top-level form across the .clj suite analyzes, and only
// genuinely-malformed negative-test forms produce errors. An unexpected
// `; error:` means the analyzer wrongly rejected valid code (a false positive).
//
// Intentionally-malformed forms the analyzer correctly rejects pre-execution
// (e.g. a fn with two variadic arities, wrapped in `(thrown? ...)`):
const EXPECTED_ANALYSIS_ERRORS: Record<string, string[]> = {
  'error_handling_test.clj': [
    'invalid try: finally clause must be the last in try expression',
  ],
}

describe('analyzer Phase 0 — suite coverage gate', () => {
  const suiteDir = join(process.cwd(), 'src/core/__tests__/clojure_suite')
  const files = readdirSync(suiteDir).filter((f) => f.endsWith('_test.clj'))

  it('finds suite files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`analyzes every top-level form in ${file}`, () => {
      const source = readFileSync(join(suiteDir, file), 'utf-8')
      const forms = readForms(tokenize(source))
      const session = createSession()
      const errors: string[] = []
      for (const form of forms) {
        const wrapped = v.list([v.symbol('analyze*'), form])
        const result = session.evaluateForms([wrapped])
        if (!is.vector(result)) {
          throw new Error(`expected vector of lines, got ${result.kind}`)
        }
        for (const x of result.value) {
          if (is.string(x) && x.value.startsWith('; error:')) {
            errors.push(x.value.replace(/^; error:\s*/, ''))
          }
        }
      }
      expect(errors).toEqual(EXPECTED_ANALYSIS_ERRORS[file] ?? [])
    })
  }
})

function walkClj(node: CljValue, visit: (m: CljValue) => void): void {
  if (is.map(node)) {
    visit(node)
    for (const [, val] of node.entries) walkClj(val, visit)
  } else if (is.vector(node)) {
    for (const item of node.value) walkClj(item, visit)
  }
}
