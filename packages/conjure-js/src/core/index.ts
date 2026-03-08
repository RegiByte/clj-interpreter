// Session API
export { createSession, snapshotSession, createSessionFromSnapshot } from './session'
export type { Session, SessionSnapshot } from './session'

// Conversions
export { cljToJs, jsToClj, ConversionError } from './conversions'

// Evaluator
export { applyFunction, applyMacro, evaluateWithMeasurements } from './evaluator'

// Errors
export { EvaluationError, ReaderError, TokenizerError } from './errors'

// Factories
export {
  cljNumber,
  cljString,
  cljBoolean,
  cljKeyword,
  cljNil,
  cljSymbol,
  cljList,
  cljVector,
  cljMap,
  cljFunction,
  cljMultiArityFunction,
  cljNativeFunction,
  cljMacro,
  cljMultiArityMacro,
  cljVar,
} from './factories'

// Assertions
export {
  isCljValue,
  isFalsy,
  isTruthy,
  isSymbol,
  isVector,
  isList,
  isMap,
  isKeyword,
  isFunction,
  isNativeFunction,
  isMacro,
  isAFunction,
  isCollection,
  isEqual,
  isVar,
} from './assertions'

// Env
export { define, derefValue, lookupVar, makeNamespace } from './env'

// Transformations
export { valueToString } from './transformations'

// Printer
export { printString } from './printer'

// Tokenizer (public for tooling consumers)
export { tokenize } from './tokenizer'

// Types
export type {
  CljValue,
  CljNumber,
  CljString,
  CljBoolean,
  CljKeyword,
  CljNil,
  CljSymbol,
  CljList,
  CljVector,
  CljMap,
  CljFunction,
  CljNativeFunction,
  CljMacro,
  CljVar,
  CljNamespace,
  Env,
  Arity,
} from './types'
