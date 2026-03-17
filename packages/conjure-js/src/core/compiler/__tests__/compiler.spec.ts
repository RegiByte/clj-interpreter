import { beforeEach, describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { extend, makeEnv } from '../../env'
import { v } from '../../factories'
import { readForms } from '../../reader'
import { createRuntime, type Runtime } from '../../runtime'
import { tokenize } from '../../tokenizer'
import { type CljValue } from '../../types'
import { compile } from '..'
import { toCljValue } from '../../evaluator/__tests__/evaluator-test-utils'
import { freshSession as session } from '../../evaluator/__tests__/evaluator-test-utils'

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

  it.each([
    ['vector', v.vector([v.number(1), v.number(2)])],
    ['map', v.map([[v.string('a'), v.number(1)]])],
    ['set', v.set([v.number(1), v.number(2)])],
  ])('unrecognized forms return null: %s -> null', (_name, node) => {
    // note, this test needs to be updated as we support more forms
    const compiled = compile(node)
    expect(compiled).toBeNull()
  })

  it('qualified symbols return null (not supported yet)', () => {
    const compiled = compile(v.symbol('ns/x'))
    expect(compiled).toBeNull()
    const compiled2 = compile(v.symbol('str/join'))
    expect(compiled2).toBeNull()
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
    ['qualified symbol', '(clojure.core/+ 1 2)'],
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
    // destructuring pattern
    ['(let [{:keys [a]} m] a)'],
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
    ['(let [x 1] x)', 1],
    // multiple bindings
    ['(let [x 1 y 2] (+ x y))', 3],
    // sequential dependency: y's init can see x
    ['(let [x 1 y (+ x 1)] y)', 2],
    // nested let with shadowing (fresh slots per scope)
    ['(let [x 1] (let [x 2] x))', 2],
    // outer binding intact after inner let
    ['(let [x 1] (let [y 2] x))', 1],
    // empty binding vector
    ['(let [] 42)', 42],
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
    ['(loop [i 0] (if (= i 5) i (recur (+ i 1))))', 5],
    ['(loop [i 1 acc 1] (if (> i 5) acc (recur (+ i 1) (* acc i))))', 120],
    ['(loop [] 42)', 42],
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
    // destructuring not supported yet
    const compledLoop = compileForm('(loop [{:keys [a]} {:a 42}] a)')
    expect(compledLoop).toBeNull()

    // uncompilable def body
    const compiledFn = compileForm('(loop [x 1] (def z x) z)')
    expect(compiledFn).toBeNull()
  })

  it('should compile fn with loop in body', () => {
    const compiledFn = session().evaluate(`
      (fn [n] (loop [i 0 acc 0] (if (= i n) acc (recur (+ i 1) (+ acc i)))))
      `)
    expect(compiledFn.kind).toBe('function')

    expect(compiledFn.kind).toBe('function')
    if (compiledFn.kind === 'function') {
      expect(compiledFn.arities.length).toBe(1)
      expect(compiledFn.arities[0].compiledBody).toBeDefined()
      expect(typeof compiledFn.arities[0].compiledBody).toBe('function')
      const userEnv = runtime.getNamespaceEnv('user')
      if (!userEnv) {
        expect.fail('user namespace should be created')
      }
      const localEnv = extend(['n'], [v.number(5)], userEnv)
      const result = compiledFn.arities[0].compiledBody!(
        localEnv,
        createEvaluationContext()
      )
      expect(result).toEqual(toCljValue(10))
    }
  })
})
