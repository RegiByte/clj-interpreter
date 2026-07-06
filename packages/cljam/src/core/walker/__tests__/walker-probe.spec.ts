/**
 * AST-walker curated probe harness — direct assertions (Phase 4 S2).
 *
 * One probe per behavior the walker must get right, each pinned to an
 * absolute expected outcome. Until S2 these probes compared `'ast'` against
 * `'off'` (the form-walker oracle); the expected values below were recorded
 * THROUGH that still-green comparative net (session 349), so every pin is
 * certified equal to the retired oracle at the moment of conversion — the
 * walker now carries the contract alone.
 *
 * Coverage honesty (unchanged): each probe declares whether the AST path MUST
 * have executed (`top`), MUST have stayed off (`none` — fatal-analysis
 * probes), or is allowed either way (`any` — macro-heavy forms whose
 * expansion may fall outside the walker). A probe that silently fell back
 * cannot pass as covered.
 *
 * Error-message pins include source-position rendering (carets) on purpose:
 * the walker owns the user-facing error contract now, positions included.
 */

import { describe, expect, it } from 'vitest'
import { printString } from '../../printer'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  type Session,
} from '../../session'
import type { CljValue } from '../../types'

const baseline = snapshotSession(createSession())

type AstBackend = {
  session: Session
  astTopLevel: () => number
  astFnBody: () => number
}

function makeAstBackend(): AstBackend {
  let topLevel = 0
  let fnBody = 0
  const session = createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'ast',
    instrumentation: {
      onEvent: (event) => {
        if (event.path === 'ast:top-level') topLevel += 1
        if (event.path === 'ast:function-body') fnBody += 1
      },
    },
  })
  return { session, astTopLevel: () => topLevel, astFnBody: () => fnBody }
}

type Outcome =
  | { kind: 'value'; printed: string }
  | { kind: 'threw'; message: string }

const value = (printed: string): Outcome => ({ kind: 'value', printed })
const threw = (...lines: string[]): Outcome => ({
  kind: 'threw',
  message: lines.join('\n'),
})

function run(session: Session, forms: string[]): Outcome {
  try {
    let result: CljValue | undefined
    for (const form of forms) {
      result = session.evaluate(form)
    }
    return { kind: 'value', printed: printString(result!) }
  } catch (e) {
    return { kind: 'threw', message: e instanceof Error ? e.message : String(e) }
  }
}

type Probe = {
  name: string
  forms: string[]
  expected: Outcome
  /** 'top' = top-level walk must fire; 'none' = must fall back; 'any' = either. */
  expectAst: 'top' | 'none' | 'any'
}

const probes: Probe[] = [
  // ── Tier 0/1: pure expressions ────────────────────────────────────────
  { name: 'arithmetic', forms: ['(+ 1 (* 2 3))'], expected: value('7'), expectAst: 'top' },
  { name: 'if truthy/falsy', forms: ['(if (pos? 1) :pos :neg)'], expected: value(':pos'), expectAst: 'top' },
  { name: 'if nil test', forms: ['(if nil :t :f)'], expected: value(':f'), expectAst: 'top' },
  { name: 'vector literal with exprs', forms: ['[1 (+ 1 1) 3]'], expected: value('[1 2 3]'), expectAst: 'top' },
  { name: 'map literal with exprs', forms: ['{:a (+ 1 2) :b 4}'], expected: value('{:a 3 :b 4}'), expectAst: 'top' },
  { name: 'set literal dedups evaluated items', forms: ['(count #{1 (+ 0 1) 2})'], expected: value('2'), expectAst: 'top' },
  { name: 'quote', forms: ["'(1 2 3)"], expected: value('(1 2 3)'), expectAst: 'top' },
  { name: 'var invoke', forms: ['(str "a" "b" 3)'], expected: value('"ab3"'), expectAst: 'top' },
  { name: 'keyword as fn', forms: ['(:a {:a 42})'], expected: value('42'), expectAst: 'top' },
  { name: 'do sequencing', forms: ['(do 1 2 3)'], expected: value('3'), expectAst: 'top' },

  // ── Tier 2: locals ────────────────────────────────────────────────────
  { name: 'let basic', forms: ['(let [x 1 y (+ x 1)] (+ x y))'], expected: value('3'), expectAst: 'top' },
  { name: 'let shadowing', forms: ['(let [x 1] (let [x (+ x 1)] x))'], expected: value('2'), expectAst: 'top' },
  { name: 'sibling lets distinct slots', forms: ['(let [a 1] (+ (let [b 2] b) (let [c 3] c) a))'], expected: value('6'), expectAst: 'top' },

  // ── Tier 3: functions / closures / letfn ──────────────────────────────
  { name: 'anonymous fn apply', forms: ['((fn [x] (* x x)) 5)'], expected: value('25'), expectAst: 'top' },
  { name: 'def + call', forms: ['(def add2 (fn [x] (+ x 2)))', '(add2 40)'], expected: value('42'), expectAst: 'top' },
  { name: 'defn + call', forms: ['(defn square [x] (* x x))', '(square 6)'], expected: value('36'), expectAst: 'top' },
  { name: 'closure over top-level let', forms: ['(let [a 10] ((fn [b] (+ a b)) 5))'], expected: value('15'), expectAst: 'top' },
  { name: 'nested closure (two hops)', forms: ['(((fn [x] (fn [y] (+ x y))) 3) 4)'], expected: value('7'), expectAst: 'top' },
  { name: 'named fn self-recursion', forms: ['((fn fact [n] (if (< n 2) 1 (* n (fact (dec n))))) 5)'], expected: value('120'), expectAst: 'top' },
  { name: 'multi-arity dispatch', forms: ['((fn ([x] x) ([x y] (+ x y))) 1 2)'], expected: value('3'), expectAst: 'top' },
  { name: 'variadic rest packing', forms: ['((fn [a & xs] [a (count xs)]) 1 2 3 4)'], expected: value('[1 3]'), expectAst: 'top' },
  { name: 'fn recur', forms: ['((fn [n acc] (if (zero? n) acc (recur (dec n) (* acc n)))) 5 1)'], expected: value('120'), expectAst: 'top' },
  {
    name: 'loop closure snapshots iteration value (capture timing)',
    forms: ['(loop [i 0 fns []] (if (< i 3) (recur (inc i) (conj fns (fn [] i))) (mapv (fn [f] (f)) fns)))'],
    expected: value('[0 1 2]'),
    expectAst: 'top',
  },
  {
    name: 'letfn mutual recursion (RB-007 class)',
    forms: ['(letfn [(even2? [n] (if (zero? n) true (odd2? (dec n)))) (odd2? [n] (if (zero? n) false (even2? (dec n))))] (even2? 10))'],
    expected: value('true'),
    expectAst: 'top',
  },
  {
    name: 'higher-order stdlib over walker fns',
    forms: ['(mapv (fn [x] (* x 10)) [1 2 3])'],
    expected: value('[10 20 30]'),
    expectAst: 'top',
  },

  // ── Tier 4: loop/recur + try/catch/throw ──────────────────────────────
  { name: 'loop accumulate', forms: ['(loop [i 0 acc 0] (if (< i 5) (recur (inc i) (+ acc i)) acc))'], expected: value('10'), expectAst: 'top' },
  { name: 'throw + keyword discriminator', forms: ['(try (throw {:type :boom :msg "x"}) (catch :boom e (:msg e)))'], expected: value('"x"'), expectAst: 'top' },
  { name: 'catch :default', forms: ['(try (throw {:type :other}) (catch :default e (:type e)))'], expected: value(':other'), expectAst: 'top' },
  { name: 'catch predicate fn discriminator', forms: ['(try (throw {:code 7}) (catch (fn [e] (= 7 (:code e))) e :matched))'], expected: value(':matched'), expectAst: 'top' },
  {
    name: 'unmatched catch rethrows',
    forms: ['(try (throw {:type :a}) (catch :b e :nope))'],
    expected: threw('Unhandled throw: {:type :a}'),
    expectAst: 'top',
  },
  {
    name: 'finally runs on both paths',
    forms: [
      '(def order (atom []))',
      '(try (swap! order conj :body) (finally (swap! order conj :fin)))',
      '(deref order)',
    ],
    expected: value('[:body :fin]'),
    expectAst: 'top',
  },
  { name: 'ex-info round-trip', forms: ['(try (throw (ex-info "bad" {:k 1})) (catch :default e (:k (ex-data e))))'], expected: value('1'), expectAst: 'any' },

  // ── Tier 5: defs / vars ───────────────────────────────────────────────
  { name: 'bare def is nil no-op', forms: ['(def declared-only)'], expected: value('nil'), expectAst: 'top' },
  { name: 'def with docstring', forms: ['(def zz "the doc" 1)', '(:doc (meta (var zz)))'], expected: value('"the doc"'), expectAst: 'top' },
  { name: 'the-var', forms: ['(def yy 7)', '(var yy)'], expected: value("#'user/yy"), expectAst: 'top' },
  {
    name: 'forward self-reference via live Var deref',
    forms: ['(def cnt-down (fn [n] (if (zero? n) :done (cnt-down (dec n)))))', '(cnt-down 3)'],
    expected: value(':done'),
    expectAst: 'top',
  },
  {
    name: 'hot-swap: redefined var seen by existing closure',
    forms: ['(def target (fn [] :old))', '(def caller (fn [] (target)))', '(def target (fn [] :new))', '(caller)'],
    expected: value(':new'),
    expectAst: 'top',
  },

  // ── Tier 5.5: ns (Phase 4 S1 — the last form-owned head now walks) ────
  {
    name: 'ns docstring lands on the namespace',
    forms: ['(ns walker.probe.ns-doc "walker ns docs")', '(:doc (describe *ns*))'],
    expected: value('"walker ns docs"'),
    expectAst: 'top',
  },
  {
    name: 'ns without docstring evaluates to nil',
    forms: ['(ns walker.probe.ns-nodoc)', '[(:doc (describe *ns*))]'],
    expected: value('[nil]'),
    expectAst: 'top',
  },

  // ── Error contract ────────────────────────────────────────────────────
  // The analyzer tolerates unresolved Vars (that's what makes forward refs
  // work), so this legitimately WALKS and throws at Var-resolution time.
  {
    name: 'unresolved symbol error',
    forms: ['(this-does-not-exist-xyz)'],
    expected: threw(
      'Symbol this-does-not-exist-xyz not found',
      '  at line 1, col 2:',
      '  (this-does-not-exist-xyz)',
      '   ^^^^^^^^^^^^^^^^^^^^^^^'
    ),
    expectAst: 'top',
  },
  {
    name: 'arity mismatch error',
    forms: ['((fn [x] x) 1 2)'],
    expected: threw(
      'No matching arity for 2 arguments. Available arities: 1',
      '  at <anonymous>'
    ),
    expectAst: 'top',
  },
  {
    name: 'not-callable error',
    forms: ['(1 2 3)'],
    expected: threw(
      '1 is not callable',
      '  at line 1, col 1:',
      '  (1 2 3)',
      '  ^^^^^^^'
    ),
    expectAst: 'top',
  },
  // let* bypasses the `let` macro, so the error is the ANALYZER's — must throw
  // via the fatal path (analyzer-error event, no walk, no silent fallback).
  {
    name: 'malformed let* stays fatal (analyzer authority)',
    forms: ['(let* [x] x)'],
    expected: threw(
      'let* bindings must have an even number of forms',
      '  at line 1, col 7:',
      '  (let* [x] x)',
      '        ^^^'
    ),
    expectAst: 'none',
  },
  // Plain `let` errors during macroexpansion (the macro validates), so the
  // message is the macro's, thrown before any engine runs the form.
  {
    name: 'malformed let errors identically via the macro',
    forms: ['(let [x] x)'],
    expected: threw('let requires an even number of forms in binding vector'),
    expectAst: 'any',
  },

  // ── Tier 6: defmacro ──────────────────────────────────────────────────
  { name: 'defmacro define + expand', forms: ['(defmacro my-mac [x] x)', '(my-mac 41)'], expected: value('41'), expectAst: 'top' },
  {
    name: 'defmacro quasiquote expansion',
    forms: ['(defmacro unless2 [test then else] `(if ~test ~else ~then))', '(unless2 false :yes :no)'],
    expected: value(':yes'),
    expectAst: 'top',
  },
  {
    name: 'defmacro variadic splice',
    forms: ['(defmacro my-when2 [test & body] `(if ~test (do ~@body) nil))', '(my-when2 true 1 2 3)'],
    expected: value('3'),
    expectAst: 'top',
  },
  {
    name: 'defmacro multi-arity',
    forms: ['(defmacro m2 ([x] x) ([x y] `(+ ~x ~y)))', '[(m2 1) (m2 1 2)]'],
    expected: value('[1 3]'),
    expectAst: 'top',
  },
  {
    name: 'defmacro docstring meta',
    forms: ['(defmacro dm "the macro doc" [x] x)', '(:doc (meta (var dm)))'],
    expected: value('"the macro doc"'),
    expectAst: 'top',
  },
  {
    name: 'defmacro arglists meta (multi-arity)',
    forms: ['(defmacro am ([x] x) ([x y] x))', '(str (:arglists (meta (var am))))'],
    expected: value('"[[x] [x y]]"'),
    expectAst: 'top',
  },
  {
    name: 'defmacro unhygienic capture parity',
    forms: ['(defmacro capt [body] `(let [~(quote it) 42] ~body))', '(capt it)'],
    expected: value('42'),
    expectAst: 'top',
  },

  // ── Tier 7: dynamic binding + set! ────────────────────────────────────
  {
    name: 'binding rebinds and restores',
    forms: ['(def ^:dynamic *dd* 1)', '[(binding [*dd* 2] *dd*) *dd*]'],
    expected: value('[2 1]'),
    expectAst: 'top',
  },
  {
    name: 'binding nested shadowing',
    forms: ['(def ^:dynamic *nn* 0)', '(binding [*nn* 1] [(binding [*nn* 2] *nn*) *nn*])'],
    expected: value('[2 1]'),
    expectAst: 'top',
  },
  {
    name: 'binding init sees frame locals',
    forms: ['(def ^:dynamic *ll* 0)', '(let [x 42] (binding [*ll* x] *ll*))'],
    expected: value('42'),
    expectAst: 'top',
  },
  {
    name: 'binding sequential inits see earlier pushes',
    forms: ['(def ^:dynamic *a1* 1)', '(def ^:dynamic *b1* 1)', '(binding [*a1* 10 *b1* (+ *a1* 1)] [*a1* *b1*])'],
    expected: value('[10 11]'),
    expectAst: 'top',
  },
  {
    name: 'binding restores on throw',
    forms: [
      '(def ^:dynamic *tt* :root)',
      '(try (binding [*tt* :bound] (throw {:type :x})) (catch :x e *tt*))',
    ],
    expected: value(':root'),
    expectAst: 'top',
  },
  {
    name: 'dynamic deref inside walker fn under binding',
    forms: ['(def ^:dynamic *ff* 1)', '(defn read-ff [] *ff*)', '(binding [*ff* 7] (read-ff))'],
    expected: value('7'),
    expectAst: 'top',
  },
  {
    name: 'binding non-dynamic var errors',
    forms: ['(def plain-var 1)', '(binding [plain-var 2] plain-var)'],
    expected: threw(
      'Cannot use binding with non-dynamic var user/plain-var. Mark it dynamic with (def ^:dynamic plain-var ...)',
      '  at line 1, col 11:',
      '  (binding [plain-var 2] plain-var)',
      '            ^^^^^^^^^'
    ),
    expectAst: 'top',
  },
  {
    name: 'binding unresolved var errors',
    forms: ['(binding [no-such-dyn-var 2] 1)'],
    expected: threw(
      "No var found for symbol 'no-such-dyn-var' in binding form",
      '  at line 1, col 11:',
      '  (binding [no-such-dyn-var 2] 1)',
      '            ^^^^^^^^^^^^^^^'
    ),
    expectAst: 'top',
  },
  { name: 'set! inside binding', forms: ['(def ^:dynamic *ss* 1)', '(binding [*ss* 2] (set! *ss* 3) *ss*)'], expected: value('3'), expectAst: 'top' },
  {
    name: 'set! only touches innermost frame',
    forms: ['(def ^:dynamic *si* 1)', '(binding [*si* 2] [(binding [*si* 3] (set! *si* 4) *si*) *si*])'],
    expected: value('[4 2]'),
    expectAst: 'top',
  },
  {
    name: 'set! without active binding errors',
    forms: ['(def ^:dynamic *sx* 1)', '(set! *sx* 9)'],
    expected: threw(
      'Cannot set! user/*sx* — no active binding. Use set! only inside a (binding [...] ...) form.',
      '  at line 1, col 7:',
      '  (set! *sx* 9)',
      '        ^^^^'
    ),
    expectAst: 'top',
  },
  {
    name: 'set! non-dynamic errors',
    forms: ['(def sy 1)', '(set! sy 2)'],
    expected: threw(
      'Cannot set! non-dynamic var user/sy. Mark it with ^:dynamic.',
      '  at line 1, col 7:',
      '  (set! sy 2)',
      '        ^^'
    ),
    expectAst: 'top',
  },

  // ── Tier 8: js interop ────────────────────────────────────────────────
  // Bare sessions expose NO js/ globals (host access is a session option), so
  // the js-var probes here pin the unresolved-symbol contract. The happy
  // paths (working js/Math, successful js/new) are covered by the js-interop
  // spec folder, which runs under the default mode — the walker.
  { name: 'host-field on string', forms: ['(. "abc" length)'], expected: value('3'), expectAst: 'top' },
  { name: 'host-call symbol form', forms: ['(. "abc" charAt 1)'], expected: value('"b"'), expectAst: 'top' },
  {
    name: 'js-var target unresolved in bare session',
    forms: ['(. js/Math floor 3.7)'],
    expected: threw(
      'Symbol js/Math not found',
      '  at line 1, col 4:',
      '  (. js/Math floor 3.7)',
      '     ^^^^^^^'
    ),
    expectAst: 'top',
  },
  { name: 'host-field via frame local', forms: ['(let [s "hello"] (. s length))'], expected: value('5'), expectAst: 'top' },
  {
    name: 'js/new with unresolved js-var ctor errors',
    forms: ['(. (js/new js/Array "a" "b") join "-")'],
    expected: threw(
      'Symbol js/Array not found',
      '  at line 1, col 12:',
      '  (. (js/new js/Array "a" "b") join "-")',
      '             ^^^^^^^^'
    ),
    expectAst: 'top',
  },
  {
    name: 'host interop on nil errors',
    forms: ['(. nil length)'],
    expected: threw(
      'cannot use . on nil',
      '  at line 1, col 4:',
      '  (. nil length)',
      '     ^^^'
    ),
    expectAst: 'top',
  },
  {
    name: 'host-call missing method errors',
    forms: ['(. "abc" noSuchMethod 1)'],
    expected: threw(
      "method 'noSuchMethod' is not callable on abc",
      '  at line 1, col 10:',
      '  (. "abc" noSuchMethod 1)',
      '           ^^^^^^^^^^^^'
    ),
    expectAst: 'top',
  },
  {
    name: 'js/new non-constructor errors',
    forms: ['(js/new "not-a-ctor")'],
    expected: threw(
      'js/new: expected js-value constructor, got string',
      '  at line 1, col 9:',
      '  (js/new "not-a-ctor")',
      '          ^^^^^^^^^^^^'
    ),
    expectAst: 'top',
  },
]

describe('AST walker curated probes (direct assertions)', () => {
  for (const probe of probes) {
    it(probe.name, () => {
      const ast = makeAstBackend()

      expect(run(ast.session, probe.forms)).toEqual(probe.expected)

      if (probe.expectAst === 'top') {
        expect(
          ast.astTopLevel(),
          'probe expected the AST top-level path to execute but it fell back'
        ).toBeGreaterThan(0)
      } else if (probe.expectAst === 'none') {
        expect(
          ast.astTopLevel(),
          'probe expected a full fallback but the AST path executed'
        ).toBe(0)
      }
    })
  }

  it('fn bodies created by the walker execute on the walker', () => {
    // Attribution matters here: the session's own REPL plumbing is Clojure
    // code that also runs on the walker (ast:function-body fires for it too),
    // so this asserts an execution event for `twice` SPECIFICALLY.
    const executed: Array<string | null> = []
    const session = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'ast',
      instrumentation: {
        onEvent: (event) => {
          if (event.path === 'ast:function-body') {
            executed.push((event.details?.functionName as string | null) ?? null)
          }
        },
      },
    })
    session.evaluate('(def twice (fn twice [x] (+ x x)))')
    expect(executed).not.toContain('twice')
    const result = session.evaluate('(twice 21)')
    expect(printString(result)).toBe('42')
    expect(executed).toContain('twice')
  })

  it('macro bodies defined by the walker execute on the walker', () => {
    // Same attribution discipline as the fn-body test: assert the
    // ast:macro-body event for `my-mac3` specifically, so the probe cannot
    // pass on a bytecode-backed core macro.
    const executed: Array<string | null> = []
    const session = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'ast',
      instrumentation: {
        onEvent: (event) => {
          if (event.path === 'ast:macro-body') {
            executed.push((event.details?.macroName as string | null) ?? null)
          }
        },
      },
    })
    session.evaluate('(defmacro my-mac3 [x] `(+ ~x 1))')
    expect(executed).not.toContain('my-mac3')
    const result = session.evaluate('(my-mac3 41)')
    expect(printString(result)).toBe('42')
    expect(executed).toContain('my-mac3')
  })

  it('(ns …) walks with zero fallback events (Phase 4 S1 gate)', () => {
    // The table probes above cannot pin THIS form's path (a multi-form
    // probe's ast:top-level count can be satisfied by its other forms), so
    // this counts fallback events directly: the ns form was the last
    // form-walker-owned head, and its analyzer op must leave nothing to fall
    // back for.
    const fallbacks: unknown[] = []
    let topLevel = 0
    const session = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'ast',
      instrumentation: {
        onEvent: (event) => {
          if (event.path === 'fallback') fallbacks.push(event)
          if (event.path === 'ast:top-level') topLevel += 1
        },
      },
    })
    session.evaluate('(ns walker.probe.ns-honesty "doc via walker")')
    expect(fallbacks).toEqual([])
    expect(topLevel).toBeGreaterThan(0)
    expect(
      printString(session.evaluate('(:doc (describe *ns*))'))
    ).toBe('"doc via walker"')
  })

  it('walker-created closures survive session cloning (astUpvalues deep-copy)', () => {
    const ast = makeAstBackend()
    ast.session.evaluate('(def make-adder (fn [n] (fn [x] (+ x n))))')
    ast.session.evaluate('(def add5 (make-adder 5))')
    expect(printString(ast.session.evaluate('(add5 10)'))).toBe('15')

    const snapshot = snapshotSession(ast.session)
    const clone = createSessionFromSnapshot(snapshot, { vmExecutionMode: 'ast' })
    expect(printString(clone.evaluate('(add5 32)'))).toBe('37')
  })
})
