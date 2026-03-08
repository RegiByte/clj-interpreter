// Miscellaneous utilities: str, type, gensym, eval, macroexpand-1, macroexpand,
// namespace, name, keyword
import { isKeyword, isList, isMacro, isSymbol, isTruthy } from '../assertions'
import { getRootEnv, tryLookup } from '../env'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  cljKeyword,
  cljNativeFunction,
  cljNativeFunctionWithContext,
  cljNil,
  cljString,
  cljSymbol,
  withDoc,
} from '../factories'
import { makeGensym } from '../gensym'
import { joinLines, printString } from '../printer'
import { valueToString } from '../transformations'
import type { CljValue, Env, EvaluationContext } from '../types'

export const utilFunctions: Record<string, CljValue> = {
  str: withDoc(
    cljNativeFunction('str', (...args: CljValue[]) => {
      return cljString(args.map(valueToString).join(''))
    }),
    'Returns a concatenated string representation of the given values.',
    [['&', 'args']]
  ),
  subs: withDoc(
    cljNativeFunction(
      'subs',
      (s: CljValue, start: CljValue, end?: CljValue) => {
        if (s === undefined || s.kind !== 'string') {
          throw new EvaluationError(
            `subs expects a string as first argument${s !== undefined ? `, got ${printString(s)}` : ''}`,
            { s }
          )
        }
        if (start === undefined || start.kind !== 'number') {
          throw new EvaluationError(
            `subs expects a number as second argument${start !== undefined ? `, got ${printString(start)}` : ''}`,
            { start }
          )
        }
        if (end !== undefined && end.kind !== 'number') {
          throw new EvaluationError(
            `subs expects a number as optional third argument${end !== undefined ? `, got ${printString(end)}` : ''}`,
            { end }
          )
        }
        const from = start.value
        const to = end?.value
        return cljString(
          to === undefined ? s.value.slice(from) : s.value.slice(from, to)
        )
      }
    ),
    'Returns the substring of s beginning at start, and optionally ending before end.',
    [
      ['s', 'start'],
      ['s', 'start', 'end'],
    ]
  ),
  type: withDoc(
    cljNativeFunction('type', (x: CljValue) => {
      if (x === undefined) {
        throw new EvaluationError('type expects an argument', { x })
      }
      const kindToKeyword: Record<string, string> = {
        number: ':number',
        string: ':string',
        boolean: ':boolean',
        nil: ':nil',
        keyword: ':keyword',
        symbol: ':symbol',
        list: ':list',
        vector: ':vector',
        map: ':map',
        function: ':function',
        regex: ':regex',
        var: ':var',
        'native-function': ':function',
      }
      const name = kindToKeyword[x.kind]
      if (!name) {
        throw new EvaluationError(`type: unhandled kind ${x.kind}`, { x })
      }
      return cljKeyword(name)
    }),
    'Returns a keyword representing the type of the given value.',
    [['x']]
  ),
  gensym: withDoc(
    cljNativeFunction('gensym', (...args: CljValue[]) => {
      if (args.length > 1) {
        throw new EvaluationError('gensym takes 0 or 1 arguments', { args })
      }
      const prefix = args[0]
      if (prefix !== undefined && prefix.kind !== 'string') {
        throw new EvaluationError(
          `gensym prefix must be a string${prefix !== undefined ? `, got ${printString(prefix)}` : ''}`,
          { prefix }
        )
      }
      const p = prefix?.kind === 'string' ? prefix.value : 'G'
      return cljSymbol(makeGensym(p))
    }),
    'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',
    [[], ['prefix']]
  ),
  eval: withDoc(
    cljNativeFunctionWithContext(
      'eval',
      (ctx: EvaluationContext, callEnv: Env, form: CljValue | undefined) => {
        if (form === undefined) {
          throw new EvaluationError('eval expects a form as argument', {
            form,
          })
        }
        const rootEnv = getRootEnv(callEnv)
        const expanded = ctx.expandAll(form, rootEnv)
        return ctx.evaluate(expanded, rootEnv)
      }
    ),
    'Evaluates the given form in the global environment and returns the result.',
    [['form']]
  ),

  'macroexpand-1': withDoc(
    cljNativeFunctionWithContext(
      'macroexpand-1',
      (ctx: EvaluationContext, callEnv: Env, form: CljValue) => {
        if (!isList(form) || form.value.length === 0) return form
        const head = form.value[0]
        if (!isSymbol(head)) return form
        const macroValue = tryLookup(head.name, getRootEnv(callEnv))
        if (macroValue === undefined) return form
        if (!isMacro(macroValue)) return form
        return ctx.applyMacro(macroValue, form.value.slice(1))
      }
    ),
    'If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.',
    [['form']]
  ),

  macroexpand: withDoc(
    cljNativeFunctionWithContext(
      'macroexpand',
      (ctx: EvaluationContext, callEnv: Env, form: CljValue) => {
        const rootEnv = getRootEnv(callEnv)
        let current = form
        while (true) {
          if (!isList(current) || current.value.length === 0) return current
          const head = current.value[0]
          if (!isSymbol(head)) return current
          const macroValue = tryLookup(head.name, rootEnv)
          if (macroValue === undefined) return current
          if (!isMacro(macroValue)) return current
          current = ctx.applyMacro(macroValue, current.value.slice(1))
        }
      }
    ),
    joinLines([
      'Expands all macros until the expansion is stable (head is no longer a macro)',
      '',
      'Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms',
    ]),
    [['form']]
  ),

  'macroexpand-all': withDoc(
    cljNativeFunctionWithContext(
      'macroexpand-all',
      (ctx: EvaluationContext, callEnv: Env, form: CljValue) =>
        ctx.expandAll(form, getRootEnv(callEnv))
    ),
    joinLines([
      'Fully expands all macros in a form recursively — including in sub-forms.',
      '',
      'Unlike macroexpand, this descends into every sub-expression.',
      'Expansion stops at quote/quasiquote boundaries and fn/loop bodies.',
    ]),
    [['form']]
  ),

  // Returns the namespace string of a qualified keyword or symbol, or nil.
  // (namespace :user/foo) => "user"
  // (namespace :foo)      => nil
  // (namespace 'user/foo) => "user"
  namespace: withDoc(
    cljNativeFunction('namespace', (x: CljValue) => {
      if (x === undefined) {
        throw new EvaluationError('namespace expects an argument', { x })
      }
      let raw: string | undefined
      if (isKeyword(x)) {
        // keyword name format: ":ns/local" or ":local"
        raw = x.name.slice(1) // strip leading ":"
      } else if (isSymbol(x)) {
        raw = x.name
      } else {
        throw new EvaluationError(
          `namespace expects a keyword or symbol, got ${printString(x)}`,
          { x }
        )
      }
      const slashIdx = raw.indexOf('/')
      if (slashIdx <= 0) return cljNil()
      return cljString(raw.slice(0, slashIdx))
    }),
    'Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.',
    [['x']]
  ),

  // Returns the local name of a keyword or symbol as a string.
  // (name :user/foo) => "foo"
  // (name :foo)      => "foo"
  // (name 'user/foo) => "foo"
  name: withDoc(
    cljNativeFunction('name', (x: CljValue) => {
      if (x === undefined) {
        throw new EvaluationError('name expects an argument', { x })
      }
      let raw: string | undefined
      if (isKeyword(x)) {
        raw = x.name.slice(1) // strip leading ":"
      } else if (isSymbol(x)) {
        raw = x.name
      } else if (x.kind === 'string') {
        return x
      } else {
        throw new EvaluationError(
          `name expects a keyword, symbol, or string, got ${printString(x)}`,
          { x }
        )
      }
      const slashIdx = raw.indexOf('/')
      return cljString(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw)
    }),
    'Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.',
    [['x']]
  ),

  // Constructs a keyword.
  // (keyword "foo")        => :foo
  // (keyword "user" "foo") => :user/foo
  keyword: withDoc(
    cljNativeFunction('keyword', (...args: CljValue[]) => {
      if (args.length === 0 || args.length > 2) {
        throw new EvaluationError('keyword expects 1 or 2 string arguments', {
          args,
        })
      }
      if (args[0].kind !== 'string') {
        throw new EvaluationError(
          `keyword expects a string, got ${printString(args[0])}`,
          { args }
        )
      }
      if (args.length === 1) {
        return cljKeyword(`:${args[0].value}`)
      }
      if (args[1].kind !== 'string') {
        throw new EvaluationError(
          `keyword second argument must be a string, got ${printString(args[1])}`,
          { args }
        )
      }
      return cljKeyword(`:${args[0].value}/${args[1].value}`)
    }),
    joinLines([
      'Constructs a keyword with the given name and namespace strings. Returns a keyword value.',
      '',
      'Note: do not use : in the keyword strings, it will be added automatically.',
      'e.g. (keyword "foo") => :foo',
    ]),
    [['name'], ['ns', 'name']]
  ),

  boolean: withDoc(
    cljNativeFunction('boolean', (x: CljValue) => {
      if (x === undefined) return cljBoolean(false)
      return cljBoolean(isTruthy(x))
    }),
    'Coerces to boolean. Everything is true except false and nil.',
    [['x']]
  ),
}
