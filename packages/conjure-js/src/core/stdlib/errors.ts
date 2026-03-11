import { CljThrownSignal, EvaluationError } from '../errors'
import { cljKeyword, cljMap, cljNil, v } from '../factories'
import { isKeyword, isMap } from '../assertions'
import type { CljValue } from '../types'

export const errorFunctions = {
  throw: v.nativeFn('throw', function throwImpl(...args: CljValue[]) {
    if (args.length !== 1) {
      throw new EvaluationError(
        `throw requires exactly 1 argument, got ${args.length}`,
        { args }
      )
    }
    throw new CljThrownSignal(args[0])
  }).doc(
    'Throws a value as an exception. The value may be any CljValue; maps are idiomatic.',
    [['value']]
  ),

  'ex-info': v.nativeFn('ex-info', function exInfoImpl(...args: CljValue[]) {
    if (args.length < 2) {
      throw new EvaluationError(
        `ex-info requires at least 2 arguments, got ${args.length}`,
        { args }
      )
    }
    const [msg, data, cause] = args
    if (msg.kind !== 'string') {
      throw new EvaluationError(
        'ex-info: first argument must be a string',
        { msg }
      )
    }
    const entries: [CljValue, CljValue][] = [
      [cljKeyword(':message'), msg],
      [cljKeyword(':data'), data],
    ]
    if (cause !== undefined) {
      entries.push([cljKeyword(':cause'), cause])
    }
    return cljMap(entries)
  }).doc(
    'Creates an error map with :message and :data keys. Optionally accepts a :cause.',
    [['msg', 'data'], ['msg', 'data', 'cause']]
  ),

  'ex-message': v.nativeFn('ex-message', function exMessageImpl(...args: CljValue[]) {
    const [e] = args
    if (!isMap(e)) return cljNil()
    const entry = e.entries.find(function findMessageKey([k]) {
      return isKeyword(k) && k.name === ':message'
    })
    return entry ? entry[1] : cljNil()
  }).doc(
    'Returns the :message of an error map, or nil.',
    [['e']]
  ),

  'ex-data': v.nativeFn('ex-data', function exDataImpl(...args: CljValue[]) {
    const [e] = args
    if (!isMap(e)) return cljNil()
    const entry = e.entries.find(function findDataKey([k]) {
      return isKeyword(k) && k.name === ':data'
    })
    return entry ? entry[1] : cljNil()
  }).doc(
    'Returns the :data map of an error map, or nil.',
    [['e']]
  ),

  'ex-cause': v.nativeFn('ex-cause', function exCauseImpl(...args: CljValue[]) {
    const [e] = args
    if (!isMap(e)) return cljNil()
    const entry = e.entries.find(function findCauseKey([k]) {
      return isKeyword(k) && k.name === ':cause'
    })
    return entry ? entry[1] : cljNil()
  }).doc(
    'Returns the :cause of an error map, or nil.',
    [['e']]
  ),
}
