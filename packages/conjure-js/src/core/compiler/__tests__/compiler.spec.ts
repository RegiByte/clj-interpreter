import { beforeEach, describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { extend, makeEnv } from '../../env'
import { v } from '../../factories'
import { readForms } from '../../reader'
import { createRuntime, type Runtime } from '../../runtime'
import { tokenize } from '../../tokenizer'
import { type CljFunction, type CljValue } from '../../types'
import { compile } from '..'
import { toCljValue } from '../../evaluator/__tests__/evaluator-test-utils'
import { freshSession as session } from '../../evaluator/__tests__/evaluator-test-utils'
import { applyFunctionWithContext } from '../../evaluator/apply'

const formToNode = (code: string) =>
  readForms(tokenize(code), 'user', new Map())[0] as CljValue

const compileForm = (code: string) => compile(formToNode(code))

let runtime: Runtime

beforeEach(() => {
  runtime = createRuntime()
})

describe('Compiler Phase 1', () => {
  it('should compile numbers', () => {
    const node = v.number(42)
    const compiled = compile(node)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(null as any, null as any)).toEqual(v.number(42))
    }
  })

  it('should compile strings', () => {
    const node = v.string('hello')
    const compiled = compile(node)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(null as any, null as any)).toEqual(v.string('hello'))
    }
  })

  it('should compile keywords', () => {
    const node = v.keyword(':hello')
    const compiled = compile(node)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(null as any, null as any)).toEqual(v.keyword(':hello'))
    }
  })

  it('should compile nils', () => {
    const node = v.nil()
    const compiled = compile(node)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(null as any, null as any)).toEqual(v.nil())
    }
  })

  it('should compile booleans', () => {
    const node = v.boolean(true)
    const compiled = compile(node)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(null as any, null as any)).toEqual(v.boolean(true))
    }
  })

  it('should compile regexes', () => {
    const node = v.regex('hello', 'i')
    const compiled = compile(node)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      // same reference, returns the same node
      expect(compiled(null as any, null as any)).toEqual(node)
    }
  })

  it('symbol compiles to a runtime lookup', () => {
    const env = extend(['x'], [v.number(42)], makeEnv())
    const compiled = compile(v.symbol('x'))
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(env, null as any)).toEqual(v.number(42))
    }
  })

  it('symbol lookup is live, not captured (REPL safe)', () => {
    const env1 = extend(['x'], [v.number(10)], makeEnv())
    const compiled = compile(v.symbol('x'))
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled !== 'function') {
      expect.fail('compiled should be a function')
    }
    expect(compiled(env1, null as any)).toEqual(v.number(10))
    const env2 = extend(['x'], [v.number(99)], makeEnv())
    expect(compiled(env2, null as any)).toEqual(v.number(99))
  })

  it('special forms without compiler support return null', () => {
    // def, binding, letfn* etc. have no compiler case — always bail to interpreter
    expect(compile(formToNode('(def x 1)'))).toBeNull()
  })

  it('qualified symbols compile to a non-null closure (Phase 6)', () => {
    const compiled = compile(v.symbol('ns/x'))
    expect(compiled).not.toBeNull()
    const compiled2 = compile(v.symbol('str/join'))
    expect(compiled2).not.toBeNull()
  })
})

describe('Compiler Phase 2', () => {
  it.each([
    ['(if true 1 2)', v.number(1)],
    ['(if false 1 2)', v.number(2)],
    ['(if true 1)', v.number(1)],
    ['(if false 1)', v.nil()],
    ['(if (+ 1 2) 1 2)', v.number(1)],
    ['(if true (+ 1 2) 3)', v.number(3)],
    ['(if true 1 (+ 1 2))', v.number(1)],
  ])('should compile if - valid cases: %s -> %s', (code, expected) => {
    const compiled = compileForm(code)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      const userEnv = runtime.getNamespaceEnv('user')
      if (!userEnv) {
        expect.fail('user namespace should be created')
      }
      const result = compiled(userEnv, createEvaluationContext())
      expect(result).toEqual(toCljValue(expected))
    }
  })

  it('should lookup and eval symbol in if test', () => {
    const env1 = extend(['x'], [v.boolean(true)], makeEnv())
    const env2 = extend(['x'], [v.boolean(false)], makeEnv())
    const compiled = compileForm('(if x 1 2)')
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      expect(compiled(env1, null as any)).toEqual(v.number(1))
      expect(compiled(env2, null as any)).toEqual(v.number(2))
    }
  })

  it.each([
    ['(do)', v.nil()],
    ['(do 1 2 3)', v.number(3)],
    ['(do 42)', v.number(42)],
    ['(do (+ 1 2) 3)', 3],
  ])('should compile do - valid cases: %s -> %s', (code, expected) => {
    const compiled = compileForm(code)
    expect(compiled).toBeDefined()
    if (expected === null) {
      expect(compiled).toBeNull()
    } else {
      expect(typeof compiled).toBe('function')
      if (typeof compiled === 'function') {
        const userEnv = runtime.getNamespaceEnv('user')
        if (!userEnv) {
          expect.fail('user namespace should be created')
        }
        const result = compiled(userEnv, createEvaluationContext())
        expect(result).toEqual(toCljValue(expected))
      }
    }
  })
})

describe('Compiler Phase 3A', () => {
  it.each([
    ['uncompilable arg def', '(+ (def x 1) 2)'],
    ['ns special form', '(+ (ns foo) 2)'],
  ])('function calls - unsuported cases %s -> null', (_label, code) => {
    const compiled = compileForm(code)
    expect(compiled).toBeNull()
  })

  it.each([
    ['(+ 1 2)', 3],
    ['(str "hello" " " "world")', 'hello world'],
    ['(+ 1 (+ 2 3))', 6],
    ['((if true + -) 1 2)', 3],
  ])('function calls - supported cases %s -> %s', (code, expected) => {
    const compiled = compileForm(code)
    expect(compiled).toBeDefined()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      const userEnv = runtime.getNamespaceEnv('user')
      if (!userEnv) {
        expect.fail('user namespace should be created')
      }
      const result = compiled(userEnv, createEvaluationContext())
      expect(result).toEqual(toCljValue(expected))
    }
  })
})

describe('Compiler Phase 3B', () => {
  it.each([
    // destructuring pattern (using let* — the post-macroexpansion form the compiler sees)
    ['(let* [{:keys [a]} m] a)'],
    // uncompilable def init
    ['(let [x (def y 1)] x)'],
    // uncompilable def body
    ['(let [x 1] (def z x))'],
  ])('should bail on uncompilable let bindings: %s -> null', (code) => {
    const compiled = compileForm(code)
    expect(compiled).toBeNull()
  })

  it.each([
    // basic: single binding
    ['(let* [x 1] x)', 1],
    // multiple bindings
    ['(let* [x 1 y 2] (+ x y))', 3],
    // sequential dependency: y's init can see x
    ['(let* [x 1 y (+ x 1)] y)', 2],
    // nested let with shadowing (fresh slots per scope)
    ['(let* [x 1] (let* [x 2] x))', 2],
    // outer binding intact after inner let
    ['(let* [x 1] (let* [y 2] x))', 1],
    // empty binding vector
    ['(let* [] 42)', 42],
  ])('should compile let bindings: %s -> %s', (code, expected) => {
    const compiled = compileForm(code)
    expect(compiled).toBeDefined()
    expect(compiled).not.toBeNull()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      const userEnv = runtime.getNamespaceEnv('user')
      if (!userEnv) {
        expect.fail('user namespace should be created')
      }
      const result = compiled(userEnv, createEvaluationContext())
      expect(result).toEqual(toCljValue(expected))
    }
  })
})

describe('Compiler Phase 4', () => {
  it('should bail on uncompilable fn', () => {
    const result = session().evaluate('((fn [x] (def z x)) 1)')
    expect(result.kind).toBe('nil')

    const compiledFn = session().evaluate('(fn [x] (def z x))')
    expect(compiledFn.kind).toBe('function')
    if (compiledFn.kind === 'function') {
      expect(compiledFn.arities.length).toBe(1)
      expect(compiledFn.arities[0].compiledBody).toBeUndefined()
    }
  })

  it.each([
    // basic: single binding
    ['((fn [x] x) 42)', 42],
    ['((fn [x y] (+ x y)) 1 2)', 3],
    // fn + let
    ['((fn [x] (let [y (+ x 1)] y)) 5)', 6],
    // fn + if
    ['((fn [x] (if (> x 0) x 0)) -3)', 0],
    ['((fn [x] (if (> x 0) x 0)) 5)', 5],
    ['((fn f [x] (if (= x 0) 1 (* x (f (- x 1))))) 5) ', 120],
    // higher order fn
    ['((fn [f x] (f x)) (fn [y] (* y 2)) 5)', 10],
  ])('should evaluate compiled fn: %s -> %s', (code, expected) => {
    const result = session().evaluate(code)
    expect(result).toEqual(toCljValue(expected))
  })

  it.each([
    // basic: single binding
    ['(fn [x] x)'],
    ['(fn [x y] (+ x y))'],
    // fn + let
    ['(fn [x] (let [y (+ x 1)] y))'],
    // fn + if
    ['(fn [x] (if (> x 0) x 0))'],
    ['(fn [x] (if (> x 0) x 0))'],
    // recursive named fn
    ['(fn f [x] (if (= x 0) 1 (* x (f (- x 1))))) '],
    // higher order fn
    ['(fn [f x] (f x)) (fn [y] (* y 2))'],
  ])('compiled fn has compiled body: %s -> %s', (code) => {
    const result = session().evaluate(code)
    expect(result.kind).toBe('function')
    if (result.kind === 'function') {
      const compiled = result.arities.filter(
        (arity) => arity.compiledBody !== undefined
      )
      expect(compiled.length).toBeGreaterThan(0)
    }
  })
})

describe('Compiler Phase 5', () => {
  it.each([
    // basic: single binding
    ['(loop* [i 0] (if (= i 5) i (recur (+ i 1))))', 5],
    ['(loop* [i 1 acc 1] (if (> i 5) acc (recur (+ i 1) (* acc i))))', 120],
    ['(loop* [] 42)', 42],
  ])('should compile loop - valid cases: %s -> %s', (code, expected) => {
    const compiled = compileForm(code)
    expect(compiled).toBeDefined()
    expect(compiled).not.toBeNull()
    expect(typeof compiled).toBe('function')
    if (typeof compiled === 'function') {
      const userEnv = runtime.getNamespaceEnv('user')
      if (!userEnv) {
        expect.fail('user namespace should be created')
      }
      const result = compiled(userEnv, createEvaluationContext())
      expect(result).toEqual(toCljValue(expected))
    }
  })

  it('should bail on uncompilable loop', () => {
    // destructuring not supported — using loop* (the post-macroexpansion form)
    const compledLoop = compileForm('(loop* [{:keys [a]} {:a 42}] a)')
    expect(compledLoop).toBeNull()

    // uncompilable def body
    const compiledFn = compileForm('(loop* [x 1] (def z x) z)')
    expect(compiledFn).toBeNull()
  })

  it('should compile fn with loop in body', () => {
    const compiledFn = session().evaluate(`
      (fn [n] (loop [i 0 acc 0] (if (= i n) acc (recur (+ i 1) (+ acc i)))))
      `)
    expect(compiledFn.kind).toBe('function')
    if (compiledFn.kind === 'function') {
      expect(compiledFn.arities.length).toBe(1)
      expect(compiledFn.arities[0].compiledBody).toBeDefined()
      const userEnv = runtime.getNamespaceEnv('user')
      if (!userEnv) {
        expect.fail('user namespace should be created')
      }
      // Phase 4b: params are now in slots, not in env — use applyFunctionWithContext
      const result = applyFunctionWithContext(
        compiledFn as CljFunction,
        [v.number(5)],
        createEvaluationContext(),
        userEnv
      )
      expect(result).toEqual(toCljValue(10))
    }
  })
})

describe('Compiler Phase 6 — Qualified Symbol Compilation', () => {
  it('compiles a qualified symbol to a non-null closure', () => {
    const compiled = compile(formToNode('clojure.core/+'))
    expect(compiled).not.toBeNull()
    expect(typeof compiled).toBe('function')
  })

  it('resolves clojure.core/+ to the + function at runtime', () => {
    const result = session().evaluate('clojure.core/+')
    expect(result).toBeDefined()
    // + is a native-function in the core module
    expect(['function', 'native-function']).toContain(result.kind)
  })

  it('resolves clojure.core/map to the map function at runtime', () => {
    const result = session().evaluate('clojure.core/map')
    expect(result).toBeDefined()
    expect(['function', 'native-function']).toContain(result.kind)
  })

  it('resolves a namespace alias (require + :as)', () => {
    const result = session().evaluate(`
      (do
        (require '[clojure.string :as str])
        str/join)
    `)
    expect(result).toBeDefined()
    expect(['function', 'native-function']).toContain(result.kind)
  })

  it('resolves clojure.string/join by full namespace name', () => {
    const result = session().evaluate(`
      (do
        (require '[clojure.string])
        clojure.string/join)
    `)
    expect(result).toBeDefined()
    expect(['function', 'native-function']).toContain(result.kind)
  })

  it('can call a qualified symbol directly — (clojure.core/+ 1 2) => 3', () => {
    const result = session().evaluate('(clojure.core/+ 1 2)')
    expect(result).toEqual(toCljValue(3))
  })

  it('throws at runtime for unknown namespace', () => {
    expect(() => session().evaluate('nonexistent.ns/foo')).toThrow()
  })
})

describe('Compiler Phase 7 — Collection Literals', () => {
  it.each([
    ['empty vector', '[]', v.vector([])],
    ['number vector', '[1 2 3]', v.vector([v.number(1), v.number(2), v.number(3)])],
    ['keyword vector', '[:a :b]', v.vector([v.keyword(':a'), v.keyword(':b')])],
    ['vector with expression', '[(+ 1 2) :k]', v.vector([v.number(3), v.keyword(':k')])],
    ['empty map', '{}', v.map([])],
    [
      'keyword-keyed map',
      '{:a 1 :b 2}',
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ]),
    ],
    ['empty set', '#{}', v.set([])],
    ['number set', '#{1 2 3}', v.set([v.number(1), v.number(2), v.number(3)])],
    [
      'nested: vector of map and set',
      '[{:a 1} #{2}]',
      v.vector([v.map([[v.keyword(':a'), v.number(1)]]), v.set([v.number(2)])]),
    ],
  ])('compiles %s', (_, code, expected) => {
    const compiled = compileForm(code)
    expect(compiled).not.toBeNull()
    expect(typeof compiled).toBe('function')
    if (typeof compiled !== 'function') return
    const userEnv = runtime.getNamespaceEnv('user')
    if (!userEnv) expect.fail('user namespace should be created')
    const result = compiled(userEnv, createEvaluationContext())
    expect(result).toEqual(expected)
  })

  it('set deduplicates using structural equality (is.equal)', () => {
    // #{1 1 2} should yield a 2-element set, not 3
    const compiled = compileForm('#{1 1 2}')
    expect(compiled).not.toBeNull()
    if (typeof compiled !== 'function') return
    const userEnv = runtime.getNamespaceEnv('user')
    if (!userEnv) expect.fail('user namespace should be created')
    const result = compiled(userEnv, createEvaluationContext())
    expect(result).toEqual(v.set([v.number(1), v.number(2)]))
  })

  it('bails when a vector element cannot be compiled', () => {
    expect(compileForm('[(def x 1) 2]')).toBeNull()
  })

  it('bails when a map value cannot be compiled', () => {
    expect(compileForm('{:a (def x 1)}')).toBeNull()
  })

  it('bails when a set element cannot be compiled', () => {
    expect(compileForm('#{(def x 1) 2}')).toBeNull()
  })

  it('session: vector literal', () => {
    expect(session().evaluate('[1 2 3]')).toEqual(
      v.vector([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('session: map literal', () => {
    expect(session().evaluate('{:a 1 :b 2}')).toEqual(
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ])
    )
  })

  it('session: set literal', () => {
    expect(session().evaluate('#{1 2 3}')).toEqual(
      v.set([v.number(1), v.number(2), v.number(3)])
    )
  })
})

describe('Compiler Phase 4b — param slots', () => {
  it('fn arity without rest param has paramSlots set', () => {
    const fn = session().evaluate('(fn [x y] (+ x y))')
    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return
    expect(fn.arities[0].paramSlots).toBeDefined()
    expect(fn.arities[0].paramSlots?.length).toBe(2)
  })

  it('fn with rest param does NOT have paramSlots (falls through to bindParams)', () => {
    const fn = session().evaluate('(fn [x & rest] x)')
    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return
    expect(fn.arities[0].paramSlots).toBeUndefined()
  })

  it.each([
    ['simple param access', '((fn [x] x) 99)', 99],
    ['multi-param arithmetic', '((fn [a b c] (+ a b c)) 1 2 3)', 6],
    ['fn-level recur: countdown to zero', '((fn [n] (if (= n 0) 42 (recur (- n 1)))) 5)', 42],
    [
      'fn-level recur: accumulator',
      '((fn [n acc] (if (= n 0) acc (recur (- n 1) (+ acc n)))) 5 0)',
      15,
    ],
    [
      'non-tail recursion: factorial',
      '((fn f [n] (if (= n 0) 1 (* n (f (- n 1))))) 5)',
      120,
    ],
    [
      'mutual recursion (save/restore correctness)',
      '(do (defn my-even? [n] (if (= n 0) true (my-odd? (- n 1)))) (defn my-odd? [n] (if (= n 0) false (my-even? (- n 1)))) (my-even? 10))',
      true,
    ],
  ])('%s → %s', (_, code, expected) => {
    expect(session().evaluate(code)).toEqual(toCljValue(expected))
  })
})
