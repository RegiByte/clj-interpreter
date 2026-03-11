import { isCons, isEqual, isKeyword, isLazySeq, isList, isMap, isNil, isSymbol, isVector } from '../assertions'
import { EvaluationError } from '../errors'
import { cljKeyword, cljList, cljNil, cljString, cljSymbol } from '../factories'
import { realizeLazySeq, consToArray } from '../transformations'
import type { CljMap, CljValue, Env, EvaluationContext } from '../types'

function toSeqSafe(value: CljValue): CljValue[] {
  if (value.kind === 'nil') return []
  if (isList(value)) return value.value
  if (isVector(value)) return value.value
  if (isLazySeq(value)) {
    const realized = realizeLazySeq(value)
    return toSeqSafe(realized)
  }
  if (isCons(value)) return consToArray(value)
  throw new EvaluationError(
    `Cannot destructure ${value.kind} as a sequential collection`,
    { value }
  )
}

/** Return the first element of a seq-like value without full realization. */
function seqFirst(value: CljValue): CljValue {
  if (isNil(value)) return cljNil()
  if (isLazySeq(value)) {
    const realized = realizeLazySeq(value)
    return isNil(realized) ? cljNil() : seqFirst(realized)
  }
  if (isCons(value)) return value.head
  if (isList(value) || isVector(value)) return value.value.length > 0 ? value.value[0] : cljNil()
  return cljNil()
}

/** Return the tail of a seq-like value without full realization. */
function seqRest(value: CljValue): CljValue {
  if (isNil(value)) return cljList([])
  if (isLazySeq(value)) {
    const realized = realizeLazySeq(value)
    return isNil(realized) ? cljList([]) : seqRest(realized)
  }
  if (isCons(value)) return value.tail
  if (isList(value)) return cljList(value.value.slice(1))
  if (isVector(value)) return cljList(value.value.slice(1))
  return cljList([])
}

/** Check if a seq-like value is empty without full realization. */
function seqIsEmpty(value: CljValue): boolean {
  if (isNil(value)) return true
  if (isLazySeq(value)) {
    const realized = realizeLazySeq(value)
    return seqIsEmpty(realized)
  }
  if (isCons(value)) return false
  if (isList(value) || isVector(value)) return value.value.length === 0
  return true
}

/** Check if a value is lazy (lazy-seq or cons with lazy tail). */
function isLazy(value: CljValue): boolean {
  return isLazySeq(value) || isCons(value)
}

function findMapEntry(
  map: CljMap,
  key: CljValue
): CljValue | undefined {
  const entry = map.entries.find(([k]) => isEqual(k, key))
  return entry ? entry[1] : undefined
}

function mapContainsKey(map: CljMap, key: CljValue): boolean {
  return map.entries.some(([k]) => isEqual(k, key))
}

function destructureVector(
  pattern: CljValue[],
  value: CljValue,
  ctx: EvaluationContext,
  env: Env
): [string, CljValue][] {
  const pairs: [string, CljValue][] = []
  const elems = [...pattern]

  // :as alias — must appear as second-to-last with a symbol after it
  const asIdx = elems.findIndex((e) => isKeyword(e) && e.kind === 'keyword' && e.name === ':as')
  if (asIdx !== -1) {
    const asSym = elems[asIdx + 1]
    if (!asSym || !isSymbol(asSym)) {
      throw new EvaluationError(':as must be followed by a symbol', { pattern })
    }
    pairs.push([asSym.name, value])
    elems.splice(asIdx, 2)
  }

  // & rest pattern
  const ampIdx = elems.findIndex((e) => isSymbol(e) && e.name === '&')
  let restPattern: CljValue | null = null
  let positionalCount: number
  if (ampIdx !== -1) {
    restPattern = elems[ampIdx + 1]
    if (!restPattern) {
      throw new EvaluationError('& must be followed by a binding pattern', { pattern })
    }
    positionalCount = ampIdx
    elems.splice(ampIdx)
  } else {
    positionalCount = elems.length
  }

  // For lazy seqs, walk with first/rest to avoid full realization.
  // For eager collections, use flat array for efficiency.
  if (isLazy(value)) {
    let current: CljValue = value
    for (let i = 0; i < positionalCount; i++) {
      pairs.push(...destructureBindings(elems[i], seqFirst(current), ctx, env))
      current = seqRest(current)
    }
    if (restPattern !== null) {
      // For kwargs-style map destructuring on rest, we must realize
      if (isMap(restPattern) && !seqIsEmpty(current)) {
        const restArgs = toSeqSafe(current)
        const entries: [CljValue, CljValue][] = []
        for (let i = 0; i < restArgs.length; i += 2) {
          entries.push([restArgs[i], restArgs[i + 1] ?? cljNil()])
        }
        pairs.push(...destructureBindings(restPattern, { kind: 'map', entries }, ctx, env))
      } else {
        // Keep the rest as-is (still lazy) — wrap in list only if it's nil/empty
        const restValue = seqIsEmpty(current) ? cljNil() : current
        pairs.push(...destructureBindings(restPattern, restValue, ctx, env))
      }
    }
  } else {
    const seq = toSeqSafe(value)

    // positional bindings
    for (let i = 0; i < positionalCount; i++) {
      pairs.push(...destructureBindings(elems[i], seq[i] ?? cljNil(), ctx, env))
    }

    // rest binding
    if (restPattern !== null) {
      const restArgs = seq.slice(positionalCount)
      let restValue: CljValue
      if (isMap(restPattern) && restArgs.length > 0) {
        // kwargs-style: coerce flat key-value pairs into a map
        const entries: [CljValue, CljValue][] = []
        for (let i = 0; i < restArgs.length; i += 2) {
          entries.push([restArgs[i], restArgs[i + 1] ?? cljNil()])
        }
        restValue = { kind: 'map', entries }
      } else {
        restValue = restArgs.length > 0 ? cljList(restArgs) : cljNil()
      }
      pairs.push(...destructureBindings(restPattern, restValue, ctx, env))
    }
  }

  return pairs
}

function destructureMap(
  pattern: CljMap,
  value: CljValue,
  ctx: EvaluationContext,
  env: Env
): [string, CljValue][] {
  const pairs: [string, CljValue][] = []

  const orMapVal = findMapEntry(pattern, cljKeyword(':or'))
  const orMap = orMapVal && isMap(orMapVal) ? orMapVal : null
  const asVal = findMapEntry(pattern, cljKeyword(':as'))

  if (!isMap(value) && value.kind !== 'nil') {
    throw new EvaluationError(
      `Cannot destructure ${value.kind} as a map`,
      { value, pattern }
    )
  }

  const targetMap: CljMap = value.kind === 'nil'
    ? { kind: 'map', entries: [] }
    : value as CljMap

  for (const [k, v] of pattern.entries) {
    if (isKeyword(k) && k.name === ':or') continue
    if (isKeyword(k) && k.name === ':as') continue

    // :keys shorthand — lookup by keyword (supports qualified: ns/foo → :ns/foo, binds to foo)
    if (isKeyword(k) && k.name === ':keys') {
      if (!isVector(v)) {
        throw new EvaluationError(':keys must be followed by a vector of symbols', { pattern })
      }
      for (const sym of v.value) {
        if (!isSymbol(sym)) {
          throw new EvaluationError(':keys vector must contain symbols', { pattern, sym })
        }
        const slashIdx = sym.name.indexOf('/')
        const localName = slashIdx !== -1 ? sym.name.slice(slashIdx + 1) : sym.name
        const lookupKey = cljKeyword(':' + sym.name)
        const present = mapContainsKey(targetMap, lookupKey)
        const entry = present ? findMapEntry(targetMap, lookupKey)! : undefined

        let result: CljValue
        if (present) {
          result = entry!
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, cljSymbol(localName))
          result = orDefault !== undefined ? ctx.evaluate(orDefault, env) : cljNil()
        } else {
          result = cljNil()
        }
        pairs.push([localName, result])
      }
      continue
    }

    // :strs shorthand — lookup by string
    if (isKeyword(k) && k.name === ':strs') {
      if (!isVector(v)) {
        throw new EvaluationError(':strs must be followed by a vector of symbols', { pattern })
      }
      for (const sym of v.value) {
        if (!isSymbol(sym)) {
          throw new EvaluationError(':strs vector must contain symbols', { pattern, sym })
        }
        const lookupKey = cljString(sym.name)
        const present = mapContainsKey(targetMap, lookupKey)
        const entry = present ? findMapEntry(targetMap, lookupKey)! : undefined

        let result: CljValue
        if (present) {
          result = entry!
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, cljSymbol(sym.name))
          result = orDefault !== undefined ? ctx.evaluate(orDefault, env) : cljNil()
        } else {
          result = cljNil()
        }
        pairs.push([sym.name, result])
      }
      continue
    }

    // :syms shorthand — lookup by symbol
    if (isKeyword(k) && k.name === ':syms') {
      if (!isVector(v)) {
        throw new EvaluationError(':syms must be followed by a vector of symbols', { pattern })
      }
      for (const sym of v.value) {
        if (!isSymbol(sym)) {
          throw new EvaluationError(':syms vector must contain symbols', { pattern, sym })
        }
        const lookupKey = cljSymbol(sym.name)
        const present = mapContainsKey(targetMap, lookupKey)
        const entry = present ? findMapEntry(targetMap, lookupKey)! : undefined

        let result: CljValue
        if (present) {
          result = entry!
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, cljSymbol(sym.name))
          result = orDefault !== undefined ? ctx.evaluate(orDefault, env) : cljNil()
        } else {
          result = cljNil()
        }
        pairs.push([sym.name, result])
      }
      continue
    }

    // Regular entry: {local-pattern :lookup-key}
    // The key of the map entry is the binding pattern, the value is the lookup key
    const entry = findMapEntry(targetMap, v)
    const present = mapContainsKey(targetMap, v)

    let boundVal: CljValue
    if (present) {
      boundVal = entry!
    } else if (orMap && isSymbol(k)) {
      const orDefault = findMapEntry(orMap, cljSymbol(k.name))
      boundVal = orDefault !== undefined ? ctx.evaluate(orDefault, env) : cljNil()
    } else {
      boundVal = cljNil()
    }
    pairs.push(...destructureBindings(k, boundVal, ctx, env))
  }

  // :as alias
  if (asVal && isSymbol(asVal)) {
    pairs.push([asVal.name, value])
  }

  return pairs
}

export function destructureBindings(
  pattern: CljValue,
  value: CljValue,
  ctx: EvaluationContext,
  env: Env
): [string, CljValue][] {
  if (isSymbol(pattern)) {
    return [[pattern.name, value]]
  }

  if (isVector(pattern)) {
    return destructureVector(pattern.value, value, ctx, env)
  }

  if (isMap(pattern)) {
    return destructureMap(pattern, value, ctx, env)
  }

  throw new EvaluationError(
    `Invalid destructuring pattern: expected symbol, vector, or map, got ${pattern.kind}`,
    { pattern }
  )
}
