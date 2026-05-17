import { describe, expect, it } from 'vitest'
import { is } from '../assertions'
import { createSession } from '../session'
import type { CljMap, CljValue, CljVector } from '../types'
import { v } from '../factories'

function expectMap(value: CljValue): CljMap {
  if (!is.map(value)) throw new Error(`expected map, got ${value.kind}`)
  return value
}

function expectVector(value: CljValue): CljVector {
  if (!is.vector(value)) throw new Error(`expected vector, got ${value.kind}`)
  return value
}

function entry(map: CljMap, keyName: string): CljValue {
  const found = map.entries.find(
    ([key]) => is.keyword(key) && key.name === keyName
  )
  if (!found) throw new Error(`missing key ${keyName}`)
  return found[1]
}

function stringEntry(map: CljMap, keyValue: string): CljValue {
  const found = map.entries.find(
    ([key]) => is.string(key) && key.value === keyValue
  )
  if (!found) throw new Error(`missing string key ${keyValue}`)
  return found[1]
}

function expectKeywordName(value: CljValue): string {
  if (!is.keyword(value)) throw new Error(`expected keyword, got ${value.kind}`)
  return value.name
}

function expectString(value: CljValue): string {
  if (!is.string(value)) throw new Error(`expected string, got ${value.kind}`)
  return value.value
}

function expectNumber(value: CljValue): number {
  if (!is.number(value)) throw new Error(`expected number, got ${value.kind}`)
  return value.value
}

function expectSymbolName(value: CljValue): string {
  if (!is.symbol(value)) throw new Error(`expected symbol, got ${value.kind}`)
  return value.name
}

function info(code: string): CljMap {
  const session = createSession()
  session.evaluate("(require '[cljam.vm :as vm])")
  return expectMap(session.evaluate(code))
}

function chunks(info: CljMap): CljMap[] {
  return expectVector(entry(info, ':chunks')).value.map(expectMap)
}

function instructions(chunk: CljMap): CljMap[] {
  return expectVector(entry(chunk, ':instructions')).value.map(expectMap)
}

function opNames(info: CljMap): string[] {
  return chunks(info).flatMap((chunk) =>
    instructions(chunk).map((instruction) =>
      expectKeywordName(entry(instruction, ':op'))
    )
  )
}

function numberKeyEntry(map: CljMap, keyValue: number): CljValue {
  const found = map.entries.find(
    ([key]) => is.number(key) && key.value === keyValue
  )
  if (!found) throw new Error(`missing number key ${keyValue}`)
  return found[1]
}

function findItem(items: CljVector, name: string): CljMap {
  const found = items.value.map(expectMap).find((item) => {
    return expectSymbolName(entry(item, ':name')) === name
  })
  if (!found) throw new Error(`missing item ${name}`)
  return found
}

describe('cljam.vm bytecode info', () => {
  it('lazy-loads the cljam.vm namespace', () => {
    const session = createSession()

    session.evaluate("(require '[cljam.vm :as vm])")

    expect(session.evaluate("(resolve 'cljam.vm/bytecode-info*)")).not.toEqual(v.nil())
  })

  it('returns structured expression bytecode information', () => {
    const result = info('(vm/bytecode-info* (+ 1 (* 2 3)))')
    const firstChunk = chunks(result)[0]
    const firstInstruction = instructions(firstChunk)[0]

    expect(expectKeywordName(entry(result, ':target'))).toBe(':expression')
    expect(expectString(entry(firstChunk, ':label'))).toBe('expression')
    expect(expectString(entry(firstChunk, ':name'))).toBe('vm-expression')
    expect(expectNumber(entry(firstChunk, ':max-stack'))).toBeGreaterThan(0)
    expect(expectNumber(entry(firstInstruction, ':offset'))).toBe(0)
    expect(expectVector(entry(firstInstruction, ':operands'))).toBeDefined()
    expect(opNames(result)).toEqual(
      expect.arrayContaining([':constant', ':mul', ':add', ':return'])
    )
  })

  it('includes generated closure arity chunks for inline functions', () => {
    const result = info('(vm/bytecode-info* (fn [x] (+ x 1)))')
    const labels = chunks(result).map((chunk) => expectString(entry(chunk, ':label')))

    expect(labels).toContain('expression')
    expect(labels).toContain('expression/fn[0]/arity[0] [x]')
    expect(opNames(result)).toEqual(expect.arrayContaining([':closure', ':load-local']))
  })

  it('includes nested closure upvalue bytecode', () => {
    const result = info('(vm/bytecode-info* (let [x 10] (fn [] x)))')

    expect(opNames(result)).toContain(':load-upvalue')
  })

  it('inspects user functions through bare symbols and var forms', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(defn f [x] (cons x (list 1)))')

    const viaSymbol = expectMap(session.evaluate('(vm/bytecode-info* f)'))
    const viaVar = expectMap(session.evaluate("(vm/bytecode-info* #'f)"))

    expect(expectKeywordName(entry(viaSymbol, ':target'))).toBe(':var')
    expect(chunks(viaSymbol).map((chunk) => expectString(entry(chunk, ':label')))).toContain(
      'user/f/arity[0] [x]'
    )
    expect(viaVar).toEqual(viaSymbol)
  })

  it('includes every bytecode-backed arity for multi-arity functions', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(defn multi ([x] (+ x 1)) ([x y] (+ x y)))')

    const labels = chunks(expectMap(session.evaluate('(vm/bytecode-info* multi)'))).map(
      (chunk) => expectString(entry(chunk, ':label'))
    )

    expect(labels).toContain('user/multi/arity[0] [x]')
    expect(labels).toContain('user/multi/arity[1] [x y]')
  })

  it('inspects bytecode-backed macro vars', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(defmacro one [] 1)')

    const result = expectMap(session.evaluate("(vm/bytecode-info* #'one)"))

    expect(chunks(result).map((chunk) => expectString(entry(chunk, ':label')))).toContain(
      'user/one/arity[0] []'
    )
    expect(opNames(result)).toContain(':constant')
  })

  it('returns nil for unsupported, native, and non-bytecode targets', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(def not-bytecode 1)')

    expect(session.evaluate('(vm/bytecode-info* (async 42))')).toEqual(v.nil())
    expect(session.evaluate('(vm/bytecode-info* +)')).toEqual(v.nil())
    expect(session.evaluate('(vm/bytecode-info* not-bytecode)')).toEqual(v.nil())
  })
})

describe('cljam.vm bytecode stats', () => {
  it('returns opcode sequences and frequencies', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(def info (vm/bytecode-info* (+ 1 (* 2 3))))')

    const sequence = expectVector(session.evaluate('(vm/opcode-sequence info)')).value.map(
      expectKeywordName
    )
    const frequencies = expectMap(session.evaluate('(vm/opcode-frequencies info)'))

    expect(sequence).toEqual(
      expect.arrayContaining([':constant', ':mul', ':add', ':return'])
    )
    expect(entry(frequencies, ':add')).toEqual(v.number(1))
    expect(entry(frequencies, ':mul')).toEqual(v.number(1))
  })

  it('counts opcode ngrams per chunk without bridging chunk boundaries', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(def info (vm/bytecode-info* (fn [x] (+ x 1))))')

    const ngrams = expectMap(session.evaluate('(vm/opcode-ngrams info 2)'))
    const keys = ngrams.entries.map(([key]) =>
      expectVector(key).value.map(expectKeywordName)
    )

    expect(keys).toContainEqual([':closure', ':return'])
    expect(keys).toContainEqual([':load-local', ':constant'])
    expect(keys).not.toContainEqual([':return', ':load-local'])
  })

  it('counts conservative direct invocation hints', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(defn f [x] x)')

    const calls = expectMap(
      session.evaluate('(vm/invocation-frequencies (vm/bytecode-info* (list (f 1) (cons 2 nil))))')
    )

    expect(stringEntry(calls, 'f')).toEqual(v.number(1))
    expect(stringEntry(calls, 'cons')).toEqual(v.number(1))
  })
})

describe('cljam.vm bytecode census', () => {
  it('summarizes already-resolved vars and values for dynamic namespace walks', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(defn f ([x] x) ([x y] (+ x y)))')
    session.evaluate('(defmacro m [x] x)')
    session.evaluate('(def not-bytecode 1)')

    const fnSummary = expectMap(session.evaluate("(vm/value-summary*-impl #'f)"))
    const macroSummary = expectMap(session.evaluate("(vm/value-summary*-impl #'m)"))
    const nativeSummary = expectMap(session.evaluate("(vm/value-summary*-impl #'+)"))
    const otherSummary = expectMap(
      session.evaluate("(vm/value-summary*-impl #'not-bytecode)")
    )

    expect(expectKeywordName(entry(fnSummary, ':kind'))).toBe(':function')
    expect(expectNumber(entry(fnSummary, ':arity-count'))).toBe(2)
    expect(expectNumber(entry(fnSummary, ':bytecode-arity-count'))).toBe(2)
    expectMap(entry(fnSummary, ':bytecode-info'))

    expect(expectKeywordName(entry(macroSummary, ':kind'))).toBe(':macro')
    expectMap(entry(macroSummary, ':bytecode-info'))

    expect(expectKeywordName(entry(nativeSummary, ':kind'))).toBe(':native')
    expect(entry(nativeSummary, ':bytecode-info')).toEqual(v.nil())

    expect(expectKeywordName(entry(otherSummary, ':kind'))).toBe(':other')
    expect(entry(otherSummary, ':bytecode-info')).toEqual(v.nil())
  })

  it('keeps bytecode-info* quoted form inspection unchanged', () => {
    const result = info('(vm/bytecode-info* (+ 1 (* 2 3)))')

    expect(expectKeywordName(entry(result, ':target'))).toBe(':expression')
    expect(opNames(result)).toEqual(
      expect.arrayContaining([':constant', ':mul', ':add', ':return'])
    )
  })

  it('returns public-only namespace census data by default', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate(
      [
        '(ns census.demo)',
        '(defn public-fn [x] (list (inc x)))',
        '(defn- private-fn [x] (dec x))',
        '(def public-value 42)',
      ].join('\n')
    )

    const census = expectMap(session.evaluate("(cljam.vm/namespace-census 'census.demo)"))
    const totals = expectMap(entry(census, ':totals'))
    const items = expectVector(entry(census, ':items'))

    expect(expectSymbolName(entry(census, ':namespace'))).toBe('census.demo')
    expect(expectKeywordName(entry(census, ':scope'))).toBe(':publics')
    expect(expectNumber(entry(totals, ':vars'))).toBe(2)
    expect(expectNumber(entry(totals, ':bytecode-vars'))).toBe(1)
    expect(expectNumber(entry(totals, ':other-vars'))).toBe(1)
    expect(findItem(items, 'public-fn')).toBeDefined()
    expect(findItem(items, 'public-value')).toBeDefined()
    expect(() => findItem(items, 'private-fn')).toThrow(/missing item/)
  })

  it('can include private interned vars on request', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate(
      [
        '(ns census.private)',
        '(defn public-fn [x] x)',
        '(defn- private-fn [x] x)',
      ].join('\n')
    )

    const census = expectMap(
      session.evaluate("(cljam.vm/namespace-census 'census.private {:include-private? true})")
    )
    const items = expectVector(entry(census, ':items'))

    expect(expectKeywordName(entry(census, ':scope'))).toBe(':interns')
    expect(findItem(items, 'public-fn')).toBeDefined()
    expect(findItem(items, 'private-fn')).toBeDefined()
  })

  it('aggregates namespace totals and ngrams without embedding full instruction listings', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate(
      [
        '(ns census.aggregate)',
        '(defn f [x] (+ x 1))',
        '(defn g [x] (list (f x)))',
      ].join('\n')
    )

    const census = expectMap(
      session.evaluate("(cljam.vm/namespace-census 'census.aggregate {:ngrams [2]})")
    )
    const totals = expectMap(entry(census, ':totals'))
    const items = expectVector(entry(census, ':items'))
    const firstItem = findItem(items, 'f')
    const firstItemNgrams = expectMap(entry(firstItem, ':opcode-ngrams'))
    const namespaceNgrams = expectMap(entry(census, ':opcode-ngrams'))

    expect(expectNumber(entry(totals, ':vars'))).toBe(2)
    expect(expectNumber(entry(totals, ':bytecode-vars'))).toBe(2)
    expect(expectNumber(entry(totals, ':chunks'))).toBeGreaterThanOrEqual(2)
    expect(expectNumber(entry(totals, ':instructions'))).toBeGreaterThan(0)
    expect(numberKeyEntry(firstItemNgrams, 2)).toBeDefined()
    expect(numberKeyEntry(namespaceNgrams, 2)).toBeDefined()
    expect(() => entry(firstItem, ':chunks')).toThrow(/missing key/)
  })

  it('builds corpus census data, requiring unloaded sync namespaces first', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(ns census.local) (defn local-fn [x] (str x))')

    const corpus = expectMap(
      session.evaluate("(cljam.vm/corpus-census ['census.local 'clojure.string] {:ngrams [2 3]})")
    )
    const namespaces = expectVector(entry(corpus, ':namespaces'))
    const totals = expectMap(entry(corpus, ':totals'))
    const ngrams = expectMap(entry(corpus, ':opcode-ngrams'))

    expect(namespaces.value).toHaveLength(2)
    expect(expectNumber(entry(totals, ':vars'))).toBeGreaterThan(0)
    expect(numberKeyEntry(ngrams, 2)).toBeDefined()
    expect(numberKeyEntry(ngrams, 3)).toBeDefined()
  })

  it('returns top frequency helpers for namespace or corpus census maps', () => {
    const session = createSession()
    session.evaluate("(require '[cljam.vm :as vm])")
    session.evaluate('(ns census.top) (defn f [x] (list (inc x)))')
    session.evaluate("(def census (cljam.vm/namespace-census 'census.top {:ngrams [2]}))")

    const opcodes = expectVector(session.evaluate('(cljam.vm/top-opcodes census 3)'))
    const invocations = expectVector(session.evaluate('(cljam.vm/top-invocations census 3)'))
    const ngrams = expectVector(session.evaluate('(cljam.vm/top-ngrams census 2 3)'))

    expect(opcodes.value.length).toBeGreaterThan(0)
    expect(invocations.value.length).toBeGreaterThan(0)
    expect(ngrams.value.length).toBeGreaterThan(0)
    expectVector(opcodes.value[0])
    expectVector(invocations.value[0])
    expectVector(ngrams.value[0])
  })
})
