import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { getPos } from '../positions'
import { consToArray, realizeLazySeq } from '../transformations'
import type { CljMap, CljValue, Env, EvaluationContext } from '../types'

function toSeqSafe(value: CljValue): CljValue[] {
  if (is.nil(value)) return []
  if (is.list(value)) return value.value
  if (is.vector(value)) return value.value
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value)
    return toSeqSafe(realized)
  }
  if (is.cons(value)) return consToArray(value)
  throw new EvaluationError(
    `Cannot destructure ${value.kind} as a sequential collection`,
    { value }
  )
}

/** Return the first element of a seq-like value without full realization. */
function seqFirst(value: CljValue): CljValue {
  if (is.nil(value)) return v.nil()
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value)
    return is.nil(realized) ? v.nil() : seqFirst(realized)
  }
  if (is.cons(value)) return value.head
  if (is.list(value) || is.vector(value))
    return value.value.length > 0 ? value.value[0] : v.nil()
  return v.nil()
}

/** Return the tail of a seq-like value without full realization. */
function seqRest(value: CljValue): CljValue {
  if (is.nil(value)) return v.list([])
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value)
    return is.nil(realized) ? v.list([]) : seqRest(realized)
  }
  if (is.cons(value)) return value.tail
  if (is.list(value)) return v.list(value.value.slice(1))
  if (is.vector(value)) return v.list(value.value.slice(1))
  return v.list([])
}

/** Check if a seq-like value is empty without full realization. */
function seqIsEmpty(value: CljValue): boolean {
  if (is.nil(value)) return true
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value)
    return seqIsEmpty(realized)
  }
  if (is.cons(value)) return false
  if (is.list(value) || is.vector(value)) return value.value.length === 0
  return true
}

/** Check if a value is lazy (lazy-seq or cons with lazy tail). */
function isLazy(value: CljValue): boolean {
  return is.lazySeq(value) || is.cons(value)
}

function findMapEntry(map: CljMap, key: CljValue): CljValue | undefined {
  const entry = map.entries.find(([k]) => is.equal(k, key))
  return entry ? entry[1] : undefined
}

function mapContainsKey(map: CljMap, key: CljValue): boolean {
  return map.entries.some(([k]) => is.equal(k, key))
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
  const asIdx = elems.findIndex((e) => is.keyword(e) && e.name === ':as')
  if (asIdx !== -1) {
    const asSym = elems[asIdx + 1]
    if (!asSym || !is.symbol(asSym)) {
      throw new EvaluationError(':as must be followed by a symbol', { pattern })
    }
    pairs.push([asSym.name, value])
    elems.splice(asIdx, 2)
  }

  // & rest pattern
  const ampIdx = elems.findIndex((e) => is.symbol(e) && e.name === '&')
  let restPattern: CljValue | null = null
  let positionalCount: number
  if (ampIdx !== -1) {
    restPattern = elems[ampIdx + 1]
    if (!restPattern) {
      throw new EvaluationError('& must be followed by a binding pattern', {
        pattern,
      })
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
      if (is.map(restPattern) && !seqIsEmpty(current)) {
        const restArgs = toSeqSafe(current)
        const entries: [CljValue, CljValue][] = []
        for (let i = 0; i < restArgs.length; i += 2) {
          entries.push([restArgs[i], restArgs[i + 1] ?? v.nil()])
        }
        pairs.push(
          ...destructureBindings(
            restPattern,
            { kind: 'map', entries },
            ctx,
            env
          )
        )
      } else {
        // Keep the rest as-is (still lazy) — wrap in list only if it's nil/empty
        const restValue = seqIsEmpty(current) ? v.nil() : current
        pairs.push(...destructureBindings(restPattern, restValue, ctx, env))
      }
    }
  } else {
    const seq = toSeqSafe(value)

    // positional bindings
    for (let i = 0; i < positionalCount; i++) {
      pairs.push(...destructureBindings(elems[i], seq[i] ?? v.nil(), ctx, env))
    }

    // rest binding
    if (restPattern !== null) {
      const restArgs = seq.slice(positionalCount)
      let restValue: CljValue
      if (is.map(restPattern) && restArgs.length > 0) {
        // kwargs-style: coerce flat key-value pairs into a map
        const entries: [CljValue, CljValue][] = []
        for (let i = 0; i < restArgs.length; i += 2) {
          entries.push([restArgs[i], restArgs[i + 1] ?? v.nil()])
        }
        restValue = { kind: 'map', entries }
      } else {
        restValue = restArgs.length > 0 ? v.list(restArgs) : v.nil()
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

  const orMapVal = findMapEntry(pattern, v.keyword(':or'))
  const orMap = orMapVal && is.map(orMapVal) ? orMapVal : null
  const asVal = findMapEntry(pattern, v.keyword(':as'))
  const isNil = is.nil(value)
  if (!is.map(value) && !isNil) {
    throw new EvaluationError(`Cannot destructure ${value.kind} as a map`, {
      value,
      pattern,
    }, getPos(pattern))
  }

  const targetMap: CljMap = isNil ? v.map([]) : (value as CljMap)

  for (const [key, val] of pattern.entries) {
    if (is.keyword(key) && key.name === ':or') continue
    if (is.keyword(key) && key.name === ':as') continue

    // :keys shorthand — lookup by keyword (supports qualified: ns/foo → :ns/foo, binds to foo)
    if (is.keyword(key) && key.name === ':keys') {
      if (!is.vector(val)) {
        throw new EvaluationError(
          ':keys must be followed by a vector of symbols',
          { pattern },
          getPos(val) ?? getPos(pattern)
        )
      }
      for (const sym of val.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(':keys vector must contain symbols', {
            pattern,
            sym,
          }, getPos(sym) ?? getPos(val))
        }
        const slashIdx = sym.name.indexOf('/')
        const localName =
          slashIdx !== -1 ? sym.name.slice(slashIdx + 1) : sym.name
        const lookupKey = v.keyword(':' + sym.name)
        const present = mapContainsKey(targetMap, lookupKey)
        const entry = present ? findMapEntry(targetMap, lookupKey)! : undefined

        let result: CljValue
        if (present) {
          result = entry!
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, v.symbol(localName))
          result =
            orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil()
        } else {
          result = v.nil()
        }
        pairs.push([localName, result])
      }
      continue
    }

    // :strs shorthand — lookup by string
    if (is.keyword(key) && key.name === ':strs') {
      if (!is.vector(val)) {
        throw new EvaluationError(
          ':strs must be followed by a vector of symbols',
          { pattern },
          getPos(val) ?? getPos(pattern)
        )
      }
      for (const sym of val.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(':strs vector must contain symbols', {
            pattern,
            sym,
          }, getPos(sym) ?? getPos(val))
        }
        const lookupKey = v.string(sym.name)
        const present = mapContainsKey(targetMap, lookupKey)
        const entry = present ? findMapEntry(targetMap, lookupKey)! : undefined

        let result: CljValue
        if (present) {
          result = entry!
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, v.symbol(sym.name))
          result =
            orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil()
        } else {
          result = v.nil()
        }
        pairs.push([sym.name, result])
      }
      continue
    }

    // :syms shorthand — lookup by symbol
    if (is.keyword(key) && key.name === ':syms') {
      if (!is.vector(val)) {
        throw new EvaluationError(
          ':syms must be followed by a vector of symbols',
          { pattern },
          getPos(val) ?? getPos(pattern)
        )
      }
      for (const sym of val.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(':syms vector must contain symbols', {
            pattern,
            sym,
          }, getPos(sym) ?? getPos(val))
        }
        const lookupKey = v.symbol(sym.name)
        const present = mapContainsKey(targetMap, lookupKey)
        const entry = present ? findMapEntry(targetMap, lookupKey)! : undefined

        let result: CljValue
        if (present) {
          result = entry!
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, v.symbol(sym.name))
          result =
            orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil()
        } else {
          result = v.nil()
        }
        pairs.push([sym.name, result])
      }
      continue
    }

    // Regular entry: {local-pattern :lookup-key}
    // The key of the map entry is the binding pattern, the value is the lookup key
    const entry = findMapEntry(targetMap, val)
    const present = mapContainsKey(targetMap, val)

    let boundVal: CljValue
    if (present) {
      boundVal = entry!
    } else if (orMap && is.symbol(key)) {
      const orDefault = findMapEntry(orMap, v.symbol(key.name))
      boundVal =
        orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil()
    } else {
      boundVal = v.nil()
    }
    pairs.push(...destructureBindings(key, boundVal, ctx, env))
  }

  // :as alias
  if (asVal && is.symbol(asVal)) {
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
  if (is.symbol(pattern)) {
    return [[pattern.name, value]]
  }

  if (is.vector(pattern)) {
    return destructureVector(pattern.value, value, ctx, env)
  }

  if (is.map(pattern)) {
    return destructureMap(pattern, value, ctx, env)
  }

  throw new EvaluationError(
    `Invalid destructuring pattern: expected symbol, vector, or map, got ${pattern.kind}`,
    { pattern },
    getPos(pattern)
  )
}
