// Session API
export { createSession, snapshotSession, createSessionFromSnapshot } from './session'
export type { Session, SessionSnapshot } from './session'

// Runtime API (advanced embedding)
export { createRuntime, restoreRuntime } from './runtime'
export type { Runtime, RuntimeSnapshot, RuntimeOptions } from './runtime'

// Module system
export { resolveModuleOrder } from './module'
export { makeCoreModule } from './core-module'
export type {
  RuntimeModule,
  NamespaceDeclaration,
  VarDeclaration,
  VarMap,
  ModuleContext,
} from './module'

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
  cljNamespace,
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
  isNamespace,
} from './assertions'

// Env
export { define, derefValue, internVar, lookupVar, makeNamespace } from './env'

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
  IOContext,
} from './types'
