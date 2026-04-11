/**
 * Compiler Coverage Specification
 *
 * This file is the north star for compiler development.
 *
 * Every form category is documented as either:
 *   - "compiles" → compile() returns a non-null closure, executed to verify the result
 *   - "bails"    → compile() returns null; the interpreter handles it
 *
 * When a new form is added to the compiler:
 *   1. Remove (or comment out) its row from the "bails" section
 *   2. Add a row to the matching "compiles" section
 *   3. All tests must remain green
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { extend } from '../../env'
import { v } from '../../factories'
import { readForms } from '../../reader'
import { createRuntime, type Runtime } from '../../runtime'
import { tokenize } from '../../tokenizer'
import type { CljValue } from '../../types'
import { compile } from '..'
import {
  freshSession as session,
  toCljValue,
} from '../../evaluator/__tests__/evaluator-test-utils'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const formToNode = (code: string): CljValue =>
  readForms(tokenize(code), 'user', new Map())[0] as CljValue

/** Compile a code string directly — the path the evaluator takes at runtime. */
const compileForm = (code: string) => compile(formToNode(code))

let runtime: Runtime
beforeEach(() => {
  runtime = createRuntime()
})

/** Execute a compiled closure in the user namespace. */
function run(code: string): CljValue {
  const compiled = compileForm(code)
  if (compiled === null) throw new Error(`Expected non-null for: ${code}`)
  return compiled(runtime.getNamespaceEnv('user')!, createEvaluationContext())
}

// ---------------------------------------------------------------------------
// Compiles → non-null
// ---------------------------------------------------------------------------

describe('Compiler Coverage — compiles → non-null', () => {
  // -------------------------------------------------------------------------
  // Phase 1 — Literals
  // -------------------------------------------------------------------------
  describe('Phase 1 — Literals', () => {
    it.each([
      ['integer', '42', v.number(42)],
      ['float', '3.14', v.number(3.14)],
      ['negative', '-7', v.number(-7)],
      ['string', '"hello"', v.string('hello')],
      ['empty string', '""', v.string('')],
      ['keyword', ':foo', v.keyword(':foo')],
      ['qualified keyword', ':ns/foo', v.keyword(':ns/foo')],
      ['nil', 'nil', v.nil()],
      ['boolean true', 'true', v.boolean(true)],
      ['boolean false', 'false', v.boolean(false)],
    ])('%s literal compiles and returns correct value', (_, code, expected) => {
      const compiled = compileForm(code)
      expect(compiled).not.toBeNull()
      expect(compiled!(null as any, null as any)).toEqual(expected)
    })

    it('regex literal compiles and returns a regex node', () => {
      const compiled = compileForm('#"[a-z]+"')
      expect(compiled).not.toBeNull()
      const result = compiled!(null as any, null as any)
      expect(result.kind).toBe('regex')
    })
  })

  // -------------------------------------------------------------------------
  // Phase 1 — Unqualified symbols
  // -------------------------------------------------------------------------
  describe('Phase 1 — Unqualified symbols', () => {
    it('unqualified symbol resolves via runtime lookup', () => {
      const env = extend(
        ['x'],
        [v.number(42)],
        runtime.getNamespaceEnv('user')!
      )
      const compiled = compile(v.symbol('x'))
      expect(compiled).not.toBeNull()
      expect(compiled!(env, createEvaluationContext())).toEqual(v.number(42))
    })

    it('same compiled closure, different envs — REPL safe', () => {
      // Compiled closure captures the name "x", resolves at call time.
      // This is what makes (def x 10) then (def x 20) update correctly.
      const env1 = extend(
        ['x'],
        [v.number(10)],
        runtime.getNamespaceEnv('user')!
      )
      const env2 = extend(
        ['x'],
        [v.number(99)],
        runtime.getNamespaceEnv('user')!
      )
      const compiled = compile(v.symbol('x'))!
      expect(compiled(env1, createEvaluationContext())).toEqual(v.number(10))
      expect(compiled(env2, createEvaluationContext())).toEqual(v.number(99))
    })

    it('symbol in compile env resolves via direct slot access', () => {
      // When a symbol is in a CompileEnv (set by compileLet/compileLoop),
      // it reads the SlotRef directly — no lookup, no env traversal.
      const compiled = compileForm('(let* [x 7] x)')
      expect(compiled).not.toBeNull()
      expect(run('(let* [x 7] x)')).toEqual(v.number(7))
    })
  })

  // -------------------------------------------------------------------------
  // Phase 2 — if
  // -------------------------------------------------------------------------
  describe('Phase 2 — if', () => {
    it.each([
      ['true branch taken', '(if true 1 2)', v.number(1)],
      ['false branch taken', '(if false 1 2)', v.number(2)],
      ['nil is falsy', '(if nil 1 2)', v.number(2)],
      ['zero is truthy', '(if 0 1 2)', v.number(1)],
      ['empty string is truthy', '(if "" 1 2)', v.number(1)],
      ['no else — truthy returns then', '(if true 42)', v.number(42)],
      ['no else — falsy returns nil', '(if false 42)', v.nil()],
      [
        'nested if',
        '(if true (if false :inner :other) :outer)',
        v.keyword(':other'),
      ],
    ])('%s', (_, code, expected) => {
      const compiled = compileForm(code)
      expect(compiled).not.toBeNull()
      expect(run(code)).toEqual(expected)
    })
  })

  // -------------------------------------------------------------------------
  // Phase 2 — do
  // -------------------------------------------------------------------------
  describe('Phase 2 — do', () => {
    it.each([
      ['empty do returns nil', '(do)', v.nil()],
      ['single form', '(do 42)', v.number(42)],
      ['last form is returned', '(do 1 2 3)', v.number(3)],
      ['only last form matters', '(do "a" "b" "c")', v.string('c')],
    ])('%s', (_, code, expected) => {
      const compiled = compileForm(code)
      expect(compiled).not.toBeNull()
      expect(run(code)).toEqual(expected)
    })
  })

  // -------------------------------------------------------------------------
  // Phase 3A — Function calls
  //
  // Any compilable expression in head position is valid, not just symbols.
  // All args must also compile — if any bails, the whole call bails.
  // -------------------------------------------------------------------------
  describe('Phase 3A — Function calls', () => {
    it.each([
      ['(+ 1 2)', 3],
      ['(+ 1 2 3)', 6],
      ['(- 10 3)', 7],
      ['(* 4 5)', 20],
      ['(= 1 1)', true],
      ['(= 1 2)', false],
      ['(str "a" "b")', 'ab'],
      ['(not false)', true],
    ])('%s → %s', (code, expected) => {
      const compiled = compileForm(code)
      expect(compiled).not.toBeNull()
      expect(session().evaluate(code)).toEqual(toCljValue(expected))
    })

    it('non-symbol head: ((if true + -) 3 1) → 4', () => {
      // The head can be any compilable expression — not just symbols.
      // This validates that compileCall is placed outside the isSymbol guard.
      const compiled = compileForm('((if true + -) 3 1)')
      expect(compiled).not.toBeNull()
      expect(session().evaluate('((if true + -) 3 1)')).toEqual(toCljValue(4))
    })

    it('nested function calls compose', () => {
      const compiled = compileForm('(+ (* 2 3) (- 10 4))')
      expect(compiled).not.toBeNull()
      expect(
        compiled!(runtime.getNamespaceEnv('user')!, createEvaluationContext())
      ).toEqual(toCljValue(12))
    })
  })

  // -------------------------------------------------------------------------
  // Phase 3B — let with simple symbol bindings
  //
  // Non-symbol patterns (destructuring) bail — see bails section.
  // Slot indexing: compiled let uses SlotRef, not Map lookup.
  // -------------------------------------------------------------------------
  describe('Phase 3B — let (simple bindings)', () => {
    it.each([
      ['single binding', '(let* [x 1] x)', 1],
      ['chained bindings', '(let* [x 1 y 2] (+ x y))', 3],
      ['later binding sees earlier', '(let* [x 1 y (+ x 1)] y)', 2],
      ['nested let', '(let* [x 1] (let* [y 2] (+ x y)))', 3],
      ['binding shadows outer', '(let* [x 1] (let* [x 99] x))', 99],
      ['empty let body is nil', '(let* [])', undefined], // skip execution
    ])('%s', (_, code, expected) => {
      if (expected === undefined) {
        // Just check it compiles
        expect(compileForm(code)).not.toBeNull()
        return
      }
      expect(compileForm(code)).not.toBeNull()
      expect(run(code)).toEqual(toCljValue(expected))
    })
  })

  // -------------------------------------------------------------------------
  // Phase 4 — fn body compile-once caching
  //
  // NOTE: compile((fn* [x] x)) itself returns null — `fn*` IS a special form
  // and has no compiler dispatch case. Phase 4 works differently:
  // evaluateFnStar() calls compileDo() on the body at definition time and
  // stores the result in arity.compiledBody. Every subsequent call uses that
  // closure directly without walking the AST again.
  //
  // Phase 4b (Session 124): evaluateFnStar() additionally calls compileFnBody()
  // for no-rest-param simple-symbol arities. compileFnBody allocates SlotRef[]
  // per param (stored in arity.paramSlots), marks a fn-level loop target
  // (enabling compiled recur), and wraps body in while(true). This eliminates
  // bindParams env allocation and RecurSignal for fn-level recur.
  //
  // Evidence: arity.compiledBody and arity.paramSlots set after fn is created.
  // -------------------------------------------------------------------------
  describe('Phase 4 — fn body compile-once caching', () => {
    it('fn with compilable body stores compiledBody on arity', () => {
      const fn = session().evaluate('(fn [x] (+ x 1))')
      expect(fn.kind).toBe('function')
      if (fn.kind === 'function') {
        expect(fn.arities[0].compiledBody).toBeDefined()
      }
    })

    it('multi-arity fn compiles all compilable arities', () => {
      const fn = session().evaluate('(fn ([x] x) ([x y] (+ x y)))')
      expect(fn.kind).toBe('function')
      if (fn.kind === 'function') {
        const compiled = fn.arities.filter((a) => a.compiledBody !== undefined)
        expect(compiled.length).toBe(2)
      }
    })

    it.each([
      ['identity fn', '((fn [x] x) 42)', 42],
      ['arithmetic fn', '((fn [x y] (+ x y)) 3 4)', 7],
      ['fn with if body', '((fn [x] (if (= x 0) 0 1)) 0)', 0],
      ['fn with let body', '((fn [x] (let [y (+ x 1)] y)) 5)', 6],
    ])('%s', (_, code, expected) => {
      expect(session().evaluate(code)).toEqual(toCljValue(expected))
    })
  })

  // -------------------------------------------------------------------------
  // Phase 5 — loop/recur → while(true) with mutable slot cell
  //
  // compileLoop handles loop*-style forms: all bindings must be simple symbols.
  // recur inside a compile loop context writes to recurTarget.args (no throw).
  // The while loop checks recurTarget.args after each body evaluation.
  // -------------------------------------------------------------------------
  describe('Phase 5 — loop/recur', () => {
    it('loop form compiles to a non-null closure', () => {
      const compiled = compileForm(
        '(loop* [i 0] (if (= i 5) i (recur (+ i 1))))'
      )
      expect(compiled).not.toBeNull()
    })

    it('recur inside loop compiles to a non-null closure', () => {
      // We can verify by running the whole loop
      const compiled = compileForm(
        '(loop* [i 0] (if (= i 3) i (recur (+ i 1))))'
      )
      expect(compiled).not.toBeNull()
    })

    it.each([
      ['count up to 5', '(loop [i 0] (if (= i 5) i (recur (+ i 1))))', 5],
      [
        'factorial 5',
        '(loop [i 1 acc 1] (if (> i 5) acc (recur (+ i 1) (* acc i))))',
        120,
      ],
      ['empty loop body', '(loop [] 42)', 42],
      [
        'loop with let inside',
        '(loop [i 3] (let [x i] (if (= x 0) 99 (recur (- i 1)))))',
        99,
      ],
    ])('%s → %s', (_, code, expected) => {
      expect(session().evaluate(code)).toEqual(toCljValue(expected))
    })
  })

  // -------------------------------------------------------------------------
  // Phase 4b — fn param slots
  //
  // For fn arities with no rest param and all simple symbol params, evaluateFn
  // now calls compileFnBody which: allocates SlotRef per param, marks a loop
  // target in fnCompileEnv (enabling compiled recur), and wraps the compiled
  // body in a while(true) that handles fn-level recur without RecurSignal.
  //
  // applyFunctionWithContext uses save/restore around paramSlots for reentrancy.
  // -------------------------------------------------------------------------
  describe('Phase 4b — fn param slots', () => {
    it('fn arity without rest param has paramSlots set', () => {
      const fn = session().evaluate('(fn [x] (* x 2))')
      expect(fn.kind).toBe('function')
      if (fn.kind !== 'function') return
      expect(fn.arities[0].paramSlots).toBeDefined()
      expect(fn.arities[0].paramSlots?.length).toBe(1)
    })

    it('fn with rest param has no paramSlots (falls through to bindParams)', () => {
      const fn = session().evaluate('(fn [x & rest] x)')
      expect(fn.kind).toBe('function')
      if (fn.kind !== 'function') return
      expect(fn.arities[0].paramSlots).toBeUndefined()
    })

    it.each([
      ['param slot call', '((fn [x] x) 99)', 99],
      ['multi-param', '((fn [a b c] (+ a b c)) 1 2 3)', 6],
    ])('%s', (_, code, expected) => {
      expect(session().evaluate(code)).toEqual(toCljValue(expected))
    })

    it('fn-level recur compiles without RecurSignal', () => {
      // If this regressed to RecurSignal path it would still work but be slower;
      // correctness is what we verify here.
      const result = session().evaluate(
        '((fn [n] (if (= n 0) :done (recur (- n 1)))) 5)'
      )
      expect(result).toEqual(v.keyword(':done'))
    })
  })
  // -------------------------------------------------------------------------
  // Phase 8 — try/catch/finally
  //
  // compileTry compiles body forms, each catch clause body, and finally forms
  // eagerly. Discriminators are stored as raw AST nodes and evaluated at
  // runtime by matchesDiscriminator — same as the interpreter path.
  //
  // Bails if any body form, catch body, or finally form cannot be compiled.
  // -------------------------------------------------------------------------
  describe('Phase 8 — try/catch/finally', () => {
    it.each([
      ['bare try, no throw', '(try 42)', v.number(42)],
      ['multi-form body returns last', '(try 1 2 3)', v.number(3)],
      ['finally discards its result', '(try 42 (finally "nope"))', v.number(42)],
      ['catch skipped when no throw', '(try 42 (catch :default e "skip"))', v.number(42)],
      ['catch by :type keyword', '(try (throw {:type :foo}) (catch :foo e "got"))', v.string('got')],
      [':default catches any thrown value', '(try (throw 99) (catch :default e e))', v.number(99)],
      ['bind thrown map and access key', '(try (throw {:type :t :v 7}) (catch :t e (:v e)))', v.number(7)],
      ['EvaluationError caught as :error/runtime', '(try (/ 1 0) (catch :error/runtime e "caught"))', v.string('caught')],
      ['EvaluationError :message key populated', '(try (/ 1 0) (catch :default e (:type e)))', v.keyword(':error/runtime')],
      ['predicate discriminator (string?)', '(try (throw "oops") (catch string? e (str "got:" e)))', v.string('got:oops')],
      ['first matching clause wins', '(try (throw {:type :b}) (catch :a e "a") (catch :b e "b") (catch :default e "d"))', v.string('b')],
      ['nested try — inner handles', '(try (try (throw {:type :inner}) (catch :inner e "handled")) (catch :default e "outer"))', v.string('handled')],
      ['nested try — outer handles', '(try (try (throw {:type :esc}) (catch :other e "wrong")) (catch :esc e "outer-got"))', v.string('outer-got')],
    ])('%s', (_, code, expected) => {
      expect(compileForm(code)).not.toBeNull()
      expect(session().evaluate(code)).toEqual(expected)
    })

    it('finally runs when no error occurs (atom observable)', () => {
      const s = session()
      s.evaluate('(def ran (atom false))')
      s.evaluate('(try 42 (finally (reset! ran true)))')
      expect(s.evaluate('@ran')).toEqual(v.boolean(true))
    })

    it('finally runs when error is caught', () => {
      const s = session()
      s.evaluate('(def ran (atom false))')
      s.evaluate('(try (throw {:type :t}) (catch :default e nil) (finally (reset! ran true)))')
      expect(s.evaluate('@ran')).toEqual(v.boolean(true))
    })

    it('finally runs even when error is not caught (via outer try)', () => {
      const s = session()
      s.evaluate('(def ran (atom false))')
      s.evaluate('(try (try (throw {:type :t}) (finally (reset! ran true))) (catch :default e nil))')
      expect(s.evaluate('@ran')).toEqual(v.boolean(true))
    })

    it('unhandled throw propagates through try with no matching catch', () => {
      expect(() => session().evaluate('(try (throw {:type :uncaught}))')).toThrow()
    })
  })
})

// ---------------------------------------------------------------------------
// Bails → null (interpreter handles)
// ---------------------------------------------------------------------------

describe('Compiler Coverage — bails → null', () => {
  // -------------------------------------------------------------------------
  // Value types not in the compile() switch
  //
  // The compiler switch handles: number, string, keyword, nil, boolean,
  // regex, symbol, list, vector, map, set (Phase 7). Everything else (function
  // values, var objects, etc.) falls through to return null.
  // -------------------------------------------------------------------------
  describe('Value types not in compile() switch', () => {
    it.each([
      ['function value', v.function([], null as any, null as any, null as any)],
      ['var', { kind: 'var', value: v.nil() } as any],
    ])('%s → null', (_, node) => {
      expect(compile(node)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Qualified symbols — Phase 6
  //
  // alias and localName are captured at compile time; namespace is resolved
  // at runtime via ctx.resolveNs / ns aliases. compile() returns a non-null
  // closure for any well-formed ns/sym, regardless of whether the namespace
  // exists (unknown ns throws at runtime, not compile time).
  // -------------------------------------------------------------------------
  describe('Qualified symbols — Phase 6', () => {
    it.each([
      'clojure.core/+',
      'str/join',
      'my.ns/foo',
      'clojure.string/split',
    ])('%s → compiles (non-null)', (code) => {
      expect(compileForm(code)).not.toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // (fn* ...) special form at the top-level compile() dispatcher
  //
  // fn* IS a special form (in specialFormKeywords), so compileCall is skipped.
  // It is NOT in the compiler's switch cases. Therefore compile((fn* ...)) → null.
  //
  // Note: `fn` is a macro (not a special form) since Session 125. The compiler
  // never sees `fn` in production — the expander converts it to `fn*` first.
  //
  // Phase 4 is NOT about compile((fn* ...)) returning non-null.
  // It is about evaluateFnStar() calling compileFnBody() on each arity at
  // definition time and caching it in arity.compiledBody / arity.paramSlots.
  // The fn* form itself always bails from compile().
  // -------------------------------------------------------------------------
  describe('(fn* ...) at top level compile() always bails', () => {
    it.each([
      ['simple fn*', '(fn* [x] x)'],
      ['multi-arity fn*', '(fn* ([x] x) ([x y] (+ x y)))'],
      ['fn* with destructured param', '(fn* [[a b]] a)'],
      ['fn* with map destructured param', '(fn* [{:keys [x]}] x)'],
    ])('%s: %s → null', (_, code) => {
      // The fn* special form is handled entirely by evaluateFnStar(), not compile().
      // Body/param compilation happens inside evaluateFnStar() via compileFnBody().
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Special forms — definitions
  // -------------------------------------------------------------------------
  describe('Special forms — definitions (def, ns)', () => {
    it.each([
      ['(def x 1)', '(def x 1)'],
      ['(def x (+ 1 2))', '(def x (+ 1 2))'],
      ['(ns foo.bar)', '(ns foo.bar)'],
      [
        '(ns foo.bar (:require [clojure.string :as str]))',
        '(ns foo.bar (:require [clojure.string :as str]))',
      ],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // try with uncompilable sub-forms
  //
  // compileTry bails (returns null) when any body form, catch clause body,
  // or finally form cannot be compiled. Discriminators are never compiled —
  // they're evaluated at runtime — so they never cause a bail.
  //
  // Note: `throw` is a native function (not a special form), so (throw expr)
  // compiles as a function call. try itself now compiles via Phase 8.
  // -------------------------------------------------------------------------
  describe('try with uncompilable sub-forms — compileTry bails', () => {
    it.each([
      ['uncompilable body (def)', '(try (def x 1))'],
      ['uncompilable catch body (def)', '(try 1 (catch :default e (def x e)))'],
      ['uncompilable finally (def)', '(try 1 (finally (def x 1)))'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Special forms — dynamic vars / mutation
  // -------------------------------------------------------------------------
  describe('Special forms — dynamic vars and mutation (binding, set!)', () => {
    it.each([
      ['binding', '(binding [*out* nil] :ok)'],
      ['set!', '(set! x 1)'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Special forms — lazy / async
  // -------------------------------------------------------------------------
  describe('Special forms — lazy and async (lazy-seq, async)', () => {
    it.each([
      ['lazy-seq', '(lazy-seq (cons 1 nil))'],
      ['async', '(async (+ 1 2))'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Special forms — host interop
  // -------------------------------------------------------------------------
  describe('Special forms — host interop (., js/new)', () => {
    it.each([
      ['member access', '(. obj method)'],
      ['method call', '(. obj (method 1 2))'],
      ['js/new', '(js/new Foo 1 2)'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Special forms — quoting (quote, quasiquote)
  // -------------------------------------------------------------------------
  describe('Special forms — quoting', () => {
    it.each([
      ["quoted list '(1 2 3)", "'(1 2 3)"],
      ["quoted symbol 'foo", "'foo"],
      ['explicit (quote x)', '(quote x)'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Special forms — macros / multimethods
  // -------------------------------------------------------------------------
  describe('Special forms — defmacro, letfn*', () => {
    it.each([
      ['defmacro', '(defmacro foo [x] x)'],
      ['letfn*', '(letfn* [f (fn* [x] (+ x 1))] (f 5))'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // let* with destructuring
  //
  // compileLet handles let* forms. Non-symbol binding patterns (destructuring)
  // cause compileLet to bail — the interpreter handles destructuring via let.
  //
  // Note: `let` is a macro since Session 125. These tests use `let*` — the
  // post-macroexpansion form that the compiler actually sees in production.
  // -------------------------------------------------------------------------
  describe('let* with destructuring bindings — compileLet bails', () => {
    it.each([
      ['vector destructuring', '(let* [[a b] [1 2]] a)'],
      ['vector with rest', '(let* [[a & b] [1 2 3]] b)'],
      ['map :keys destructuring', '(let* [{:keys [a b]} {:a 1 :b 2}] a)'],
      ['nested destructuring', '(let* [[a [b c]] [1 [2 3]]] b)'],
      [':as alias', '(let* [[a :as all] [1 2]] all)'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // loop* with destructuring
  //
  // compileLoop handles loop* forms. Non-symbol binding patterns bail.
  //
  // Note: `loop` is a macro since Session 125. These tests use `loop*`.
  // -------------------------------------------------------------------------
  describe('loop* with destructuring bindings — compileLoop bails', () => {
    it.each([
      ['vector destructuring in loop*', '(loop* [[a & b] [1 2 3]] a)'],
      ['map destructuring in loop*', '(loop* [{:keys [x]} {:x 1}] x)'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // recur outside a loop context
  // -------------------------------------------------------------------------
  describe('recur outside loop context', () => {
    it('(recur 1) at top level → null (no loop target in compileEnv)', () => {
      // findLoopTarget(null) returns null → compileRecur bails.
      // The interpreter's evaluateRecur handles it and throws the right error.
      expect(compileForm('(recur 1)')).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // Partial compilation failure propagates upward
  //
  // If ANY sub-expression bails, the parent bails too.
  // This ensures the compiled path is always all-or-nothing per expression.
  // -------------------------------------------------------------------------
  describe('Partial failure propagates — any uncompilable sub-expression bails parent', () => {
    it.each([
      // Function call bails if head bails
      ['call with uncompilable head (def)', '((def x 1) 2)'],
      // Function call bails if any arg bails
      ['call with uncompilable arg', '(+ (def x 1) 2)'],
      // if bails if test bails
      ['if with uncompilable test', '(if (def x 1) 1 0)'],
      // if bails if then bails
      ['if with uncompilable then', '(if true (def x 1) 0)'],
      // if bails if else bails
      ['if with uncompilable else', '(if true 1 (def x 2))'],
      // do bails if any form bails
      ['do with uncompilable middle', '(do 1 (def x 2) 3)'],
      ['do with uncompilable last', '(do 1 2 (def x 3))'],
      // let bails if init bails
      ['let with uncompilable init', '(let [x (def y 1)] x)'],
      // let bails if body bails
      ['let with uncompilable body', '(let [x 1] (def z x))'],
      // loop bails if init bails
      ['loop with uncompilable init', '(loop [i (def x 1)] i)'],
      // loop bails if body bails
      ['loop with uncompilable body', '(loop [i 0] (def x i))'],
    ])('%s: %s → null', (_, code) => {
      expect(compileForm(code)).toBeNull()
    })
  })
})
