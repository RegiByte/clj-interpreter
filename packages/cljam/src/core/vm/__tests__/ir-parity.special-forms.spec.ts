import { describe, it } from 'vitest'
import {
  expectBothFallback,
  expectChunkParity,
  expectIrVmMatchesInterpreter,
} from './ir-parity-utils'

describe('ir-parity: def', () => {
  it('bare def (no value)', () => expectChunkParity('(def x)'))
  it('def with value', () => expectChunkParity('(def x 42)'))
  it('def with expression value', () => expectChunkParity('(def x (+ 1 2))'))
  it('def with docstring', () => expectChunkParity('(def x "the answer" 42)'))
  it('def with fn value', () => expectChunkParity('(def f (fn [x] (* x 2)))'))
})

describe('ir-parity: defmacro', () => {
  it('single-arity defmacro', () =>
    expectChunkParity('(defmacro my-when [test & body] (list (quote if) test (cons (quote do) body) nil))'))
  it('defmacro with docstring', () =>
    expectChunkParity('(defmacro my-identity "returns its arg" [x] x)'))
  it('multi-arity defmacro', () =>
    expectChunkParity('(defmacro my-and ([] true) ([x] x) ([x & rest] (list (quote if) x (cons (quote my-and) rest) false)))'))
})

describe('ir-parity: the-var (var special form)', () => {
  it('var of a global', () => expectChunkParity('(var clojure.core/+)'))
  it('var of an unqualified global', () => expectChunkParity('(var inc)'))
  it('var of a lexical local', () =>
    expectChunkParity('(let [x 1] (var x))'))
  it('var of a shadowed local (innermost wins)', () =>
    expectChunkParity('(let [x 1] (let [x 2] (var x)))'))
  it('var captures upvalue in fn', () =>
    expectChunkParity('(let [x 1] (fn [] (var x)))'))
})

describe('ir-parity: throw', () => {
  it('throw a string', () => expectChunkParity('(throw "oops")'))
  it('throw ex-info', () =>
    expectChunkParity('(throw (ex-info "bad" {:code 42}))'))
  it('throw in let body', () =>
    expectChunkParity('(let [e (ex-info "bad" {})] (throw e))'))
})

describe('ir-parity: try / catch — no finally (byte-identical)', () => {
  it('single catch with class discriminator', () =>
    expectChunkParity('(try (+ 1 2) (catch Exception e e))'))
  it('catch returns const', () =>
    expectChunkParity('(try (/ 1 0) (catch Exception e :caught))'))
  it('multiple catch clauses', () =>
    expectChunkParity(
      '(try (/ 1 0) (catch ArithmeticException e :arith) (catch Exception e :other))'
    ))
  it('catch in let body', () =>
    expectChunkParity('(let [x 10] (try (* x 2) (catch Exception e e)))'))
  it('catch body uses let binding', () =>
    expectChunkParity('(try (/ 1 0) (catch Exception e (str "caught: " e)))'))
})

describe('ir-parity: try / finally — behavioral (intended slot-order divergence)', () => {
  it('try+finally, no catch', () =>
    expectIrVmMatchesInterpreter('(try (+ 1 2) (finally nil))'))
  it('try+catch+finally — result from try body', () =>
    expectIrVmMatchesInterpreter(
      '(try (+ 10 20) (catch Exception e e) (finally nil))'
    ))
  it('try+finally evaluates finally for side effects', () =>
    expectIrVmMatchesInterpreter(
      '(let [a (atom 0)] (try 42 (finally (swap! a inc))) @a)'
    ))
  it('finally does not change return value', () =>
    expectIrVmMatchesInterpreter(
      '(try :ok (catch Exception e :caught) (finally :ignored))'
    ))
})

describe('ir-parity: binding (dynamic)', () => {
  it('basic binding form', () =>
    expectChunkParity('(binding [*print-length* 10] (+ 1 2))'))
  it('binding then body expression', () =>
    expectChunkParity('(binding [*print-length* 5] (vector 1 2 3))'))
})

describe('ir-parity: set!', () => {
  it('set! a dynamic var', () =>
    expectChunkParity('(set! *print-length* 99)'))
  it('set! with expression', () =>
    expectChunkParity('(set! *print-length* (+ 10 5))'))
})

describe('ir-parity: host interop — field access (host-field)', () => {
  it('(. js/Math PI)', () => expectChunkParity('(. js/Math PI)'))
  it('dot-chain field', () => expectChunkParity('js/Math.PI'))
})

describe('ir-parity: host interop — method call (host-call)', () => {
  // Symbol-form (. target method args...) — supported by both compilers.
  it('method with args via symbol form', () =>
    expectChunkParity('(. js/Math pow 2 10)'))
  it('method with multiple args', () =>
    expectChunkParity('(. js/Math max 3 7 2)'))
  it('method call nested in expression', () =>
    expectChunkParity('(+ (. js/Math pow 2 3) 1)'))
})

describe('ir-parity: new (js/new)', () => {
  it('new with no args', () => expectChunkParity('(js/new js/Map)'))
  it('new with args', () => expectChunkParity('(js/new js/Error "oops")'))
  it('new with expression arg', () =>
    expectChunkParity('(js/new js/Error (str "error: " 42))'))
})

describe('ir-parity: inline-fn catch discriminator (behavioral)', () => {
  it('fn discriminator catches matching errors', () =>
    expectIrVmMatchesInterpreter(
      '(try (throw (ex-info "x" {:type :foo})) (catch (fn [e] (= (:type (ex-data e)) :foo)) e :caught))'
    ))
})

describe('ir-parity: fallback parity (set! on a local binding)', () => {
  // (set! local value) — the legacy falls back because the local is in scope;
  // the IR falls back because node.target.op === 'local' (not 'var').
  it('set! on a let-bound local falls back on both', () =>
    expectBothFallback('(let [x 1] (set! x 2))'))
})
