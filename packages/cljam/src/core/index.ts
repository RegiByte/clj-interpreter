// Session API
export {
  createSession,
  snapshotSession,
  createSessionFromSnapshot,
} from './session'
export type {
  Session,
  SessionSnapshot,
  SessionOptions,
  SessionCapabilities,
} from './session'

// Library API
export type { CljamLibrary } from './library'

// Preset functions — plain SessionOptions objects for common environments
export { nodePreset, browserPreset, sandboxPreset } from '../presets'

// Runtime API (advanced embedding)
export { createRuntime, restoreRuntime } from './runtime'
export type { Runtime, RuntimeSnapshot, RuntimeOptions } from './runtime'

// Module system
export { resolveModuleOrder } from './module'
export { makeCoreModule } from './modules/core'
export type {
  RuntimeModule,
  NamespaceDeclaration,
  VarDeclaration,
  VarMap,
  ModuleContext,
} from './module'

// Conversions
export { cljToJs, jsToClj, ConversionError } from './conversions'
export type { FunctionApplier } from './conversions'

// Evaluator
export {
  applyFunction,
  evaluateWithMeasurements,
} from './evaluator'

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
  cljNativeFunctionWithContext,
  cljMacro,
  cljMultiArityMacro,
  cljVar,
  cljNamespace,
  cljPending,
  // fluent builder — use v.nativeFn / v.nativeFnCtx for module authoring
  v,
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

// Tokenizer + Reader (public for tooling consumers and EDN parsing)
export { tokenize } from './tokenizer'
export { readForms } from './reader'

// readString — parse a single EDN source string to a CljValue.
// Equivalent to Clojure's read-string. Useful for deserialising results
// returned by remote nodes over the mesh wire.
import { tokenize as _tokenize } from './tokenizer'
import { readForms as _readForms } from './reader'
import type { CljValue as _CljValue } from './types'

export function readString(source: string): _CljValue {
  const tokens = _tokenize(source)
  const forms = _readForms(tokens)
  if (forms.length === 0) throw new Error('readString: empty input')
  return forms[0]
}

// JS interop — import map type for user-defined session entrypoints
export type ImportMap = Record<string, unknown>

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
  CljPending, // experimental
  Env,
  Arity,
  IOContext,
  EvaluationContext,
} from './types'
