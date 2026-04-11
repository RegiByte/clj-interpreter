// Miscellaneous utilities: str, type, gensym, eval, macroexpand-1, macroexpand,
// namespace, name, keyword
import { is } from '../../../assertions'
import { tryLookup } from '../../../env'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { makeGensym } from '../../../gensym'
import { buildPrintContext, joinLines, prettyPrintString, printString, withPrintContext } from '../../../printer'
import { readForms } from '../../../reader'
import { tokenize } from '../../../tokenizer'
import { valueToString } from '../../../transformations'
import type { CljValue, Env, EvaluationContext } from '../../../types'

export const utilFunctions: Record<string, CljValue> = {
  str: v
    .nativeFn('str', function strImpl(...args: CljValue[]) {
      return v.string(
        args.map((v) => (v.kind === 'nil' ? '' : valueToString(v))).join('')
      )
    })
    .doc('Returns a concatenated string representation of the given values.', [
      ['&', 'args'],
    ]),
  subs: v
    .nativeFn(
      'subs',
      function subsImpl(s: CljValue, start: CljValue, end?: CljValue) {
        if (s === undefined || s.kind !== 'string') {
          throw EvaluationError.atArg(
            `subs expects a string as first argument${s !== undefined ? `, got ${printString(s)}` : ''}`,
            { s },
            0
          )
        }
        if (start === undefined || start.kind !== 'number') {
          throw EvaluationError.atArg(
            `subs expects a number as second argument${start !== undefined ? `, got ${printString(start)}` : ''}`,
            { start },
            1
          )
        }
        if (end !== undefined && end.kind !== 'number') {
          throw EvaluationError.atArg(
            `subs expects a number as optional third argument${end !== undefined ? `, got ${printString(end)}` : ''}`,
            { end },
            2
          )
        }
        const from = start.value
        const to = end?.value
        return v.string(
          to === undefined ? s.value.slice(from) : s.value.slice(from, to)
        )
      }
    )
    .doc(
      'Returns the substring of s beginning at start, and optionally ending before end.',
      [
        ['s', 'start'],
        ['s', 'start', 'end'],
      ]
    ),
  type: v
    .nativeFn('type', function typeImpl(x: CljValue) {
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
      return v.keyword(name)
    })
    .doc('Returns a keyword representing the type of the given value.', [
      ['x'],
    ]),
  gensym: v
    .nativeFn('gensym', function gensymImpl(...args: CljValue[]) {
      if (args.length > 1) {
        throw new EvaluationError('gensym takes 0 or 1 arguments', { args })
      }
      const prefix = args[0]
      if (prefix !== undefined && prefix.kind !== 'string') {
        throw EvaluationError.atArg(
          `gensym prefix must be a string${prefix !== undefined ? `, got ${printString(prefix)}` : ''}`,
          { prefix },
          0
        )
      }
      const p = prefix?.kind === 'string' ? prefix.value : 'G'
      return v.symbol(makeGensym(p))
    })
    .doc(
      'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',
      [[], ['prefix']]
    ),
  eval: v
    .nativeFnCtx(
      'eval',
      function evalImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        form: CljValue | undefined
      ) {
        if (form === undefined) {
          throw new EvaluationError('eval expects a form as argument', {
            form,
          })
        }
        const expanded = ctx.expandAll(form, callEnv)
        return ctx.evaluate(expanded, callEnv)
      }
    )
    .doc(
      'Evaluates the given form in the global environment and returns the result.',
      [['form']]
    ),

  'macroexpand-1': v
    .nativeFnCtx(
      'macroexpand-1',
      function macroexpand1Impl(
        ctx: EvaluationContext,
        callEnv: Env,
        form: CljValue
      ) {
        if (!is.list(form) || form.value.length === 0) return form
        const head = form.value[0]
        if (!is.symbol(head)) return form
        const macroValue = tryLookup(head.name, callEnv)
        if (macroValue === undefined) return form
        if (!is.macro(macroValue)) return form
        return ctx.applyMacro(macroValue, form.value.slice(1))
      }
    )
    .doc(
      'If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.',
      [['form']]
    ),

  macroexpand: v
    .nativeFnCtx(
      'macroexpand',
      function macroexpandImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        form: CljValue
      ) {
        let current = form
        while (true) {
          if (!is.list(current) || current.value.length === 0) return current
          const head = current.value[0]
          if (!is.symbol(head)) return current
          const macroValue = tryLookup(head.name, callEnv)
          if (macroValue === undefined) return current
          if (!is.macro(macroValue)) return current
          current = ctx.applyMacro(macroValue, current.value.slice(1))
        }
      }
    )
    .doc(
      joinLines([
        'Expands all macros until the expansion is stable (head is no longer a macro)',
        '',
        'Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms',
      ]),
      [['form']]
    ),

  'macroexpand-all': v
    .nativeFnCtx(
      'macroexpand-all',
      function macroexpandAllImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        form: CljValue
      ) {
        return ctx.expandAll(form, callEnv)
      }
    )
    .doc(
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
  namespace: v
    .nativeFn('namespace', function namespaceImpl(x: CljValue) {
      if (x === undefined) {
        throw EvaluationError.atArg('namespace expects an argument', { x }, 0)
      }
      let raw: string | undefined
      if (is.keyword(x)) {
        // keyword name format: ":ns/local" or ":local"
        raw = x.name.slice(1) // strip leading ":"
      } else if (is.symbol(x)) {
        raw = x.name
      } else {
        throw EvaluationError.atArg(
          `namespace expects a keyword or symbol, got ${printString(x)}`,
          { x },
          0
        )
      }
      const slashIdx = raw.indexOf('/')
      if (slashIdx <= 0) return v.nil()
      return v.string(raw.slice(0, slashIdx))
    })
    .doc(
      'Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.',
      [['x']]
    ),

  // Returns the local name of a keyword or symbol as a string.
  // (name :user/foo) => "foo"
  // (name :foo)      => "foo"
  // (name 'user/foo) => "foo"
  name: v
    .nativeFn('name', function nameImpl(x: CljValue) {
      if (x === undefined) {
        throw EvaluationError.atArg('name expects an argument', { x }, 0)
      }
      let raw: string | undefined
      if (is.keyword(x)) {
        raw = x.name.slice(1) // strip leading ":"
      } else if (is.symbol(x)) {
        raw = x.name
      } else if (x.kind === 'string') {
        return x
      } else {
        throw EvaluationError.atArg(
          `name expects a keyword, symbol, or string, got ${printString(x)}`,
          { x },
          0
        )
      }
      const slashIdx = raw.indexOf('/')
      return v.string(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw)
    })
    .doc(
      'Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.',
      [['x']]
    ),

  // Constructs a keyword.
  // (keyword "foo")        => :foo
  // (keyword "user" "foo") => :user/foo
  keyword: v
    .nativeFn('keyword', function keywordImpl(...args: CljValue[]) {
      if (args.length === 0 || args.length > 2) {
        throw new EvaluationError('keyword expects 1 or 2 string arguments', {
          args,
        })
      }
      if (args[0].kind !== 'string') {
        throw EvaluationError.atArg(
          `keyword expects a string, got ${printString(args[0])}`,
          { args },
          0
        )
      }
      if (args.length === 1) {
        return v.keyword(`:${args[0].value}`)
      }
      if (args[1].kind !== 'string') {
        throw EvaluationError.atArg(
          `keyword second argument must be a string, got ${printString(args[1])}`,
          { args },
          1
        )
      }
      return v.keyword(`:${args[0].value}/${args[1].value}`)
    })
    .doc(
      joinLines([
        'Constructs a keyword with the given name and namespace strings. Returns a keyword value.',
        '',
        'Note: do not use : in the keyword strings, it will be added automatically.',
        'e.g. (keyword "foo") => :foo',
      ]),
      [['name'], ['ns', 'name']]
    ),

  boolean: v
    .nativeFn('boolean', function booleanImpl(x: CljValue) {
      if (x === undefined) return v.boolean(false)
      return v.boolean(is.truthy(x))
    })
    .doc('Coerces to boolean. Everything is true except false and nil.', [
      ['x'],
    ]),

  'clojure-version': v
    .nativeFn('clojure-version', function clojureVersionImpl() {
      return v.string('1.12.0')
    })
    .doc('Returns a string describing the current Clojure version.', [[]]),

  'pr-str': v
    .nativeFnCtx('pr-str', function prStrImpl(ctx: EvaluationContext, _callEnv, ...args: CljValue[]) {
      return withPrintContext(buildPrintContext(ctx), () =>
        v.string(args.map(printString).join(' '))
      )
    })
    .doc(
      'Returns a readable string representation of the given values (strings are quoted).',
      [['&', 'args']]
    ),

  'pretty-print-str': v
    .nativeFnCtx(
      'pretty-print-str',
      function prettyPrintStrImpl(ctx: EvaluationContext, _callEnv, ...args: CljValue[]) {
        if (args.length === 0) return v.string('')
        const form = args[0]
        const widthArg = args[1]
        const maxWidth =
          widthArg !== undefined && widthArg.kind === 'number'
            ? widthArg.value
            : 80
        return withPrintContext(buildPrintContext(ctx), () =>
          v.string(prettyPrintString(form, maxWidth))
        )
      }
    )
    .doc('Returns a pretty-printed string representation of form.', [
      ['form'],
      ['form', 'max-width'],
    ]),

  'read-string': v
    .nativeFn('read-string', function readStringImpl(s: CljValue) {
      if (s === undefined || s.kind !== 'string') {
        throw EvaluationError.atArg(
          `read-string expects a string${s !== undefined ? `, got ${printString(s)}` : ''}`,
          { s },
          0
        )
      }
      const tokens = tokenize(s.value)
      const forms = readForms(tokens)
      if (forms.length === 0) return v.nil()
      return forms[0]
    })
    .doc(
      'Reads one object from the string s. Returns nil if string is empty.',
      [['s']]
    ),

  'prn-str': v
    .nativeFnCtx('prn-str', function prnStrImpl(ctx: EvaluationContext, _callEnv, ...args: CljValue[]) {
      return withPrintContext(buildPrintContext(ctx), () =>
        v.string(args.map(printString).join(' ') + '\n')
      )
    })
    .doc('pr-str to a string, followed by a newline.', [['&', 'args']]),

  'print-str': v
    .nativeFnCtx('print-str', function printStrImpl(ctx: EvaluationContext, _callEnv, ...args: CljValue[]) {
      return withPrintContext(buildPrintContext(ctx), () =>
        v.string(args.map(valueToString).join(' '))
      )
    })
    .doc('print to a string (human-readable, no quotes on strings).', [
      ['&', 'args'],
    ]),

  'println-str': v
    .nativeFn('println-str', function printlnStrImpl(...args: CljValue[]) {
      return v.string(args.map(valueToString).join(' ') + '\n')
    })
    .doc('println to a string.', [['&', 'args']]),

  symbol: v
    .nativeFn('symbol', function symbolImpl(...args: CljValue[]) {
      if (args.length === 0 || args.length > 2) {
        throw new EvaluationError('symbol expects 1 or 2 string arguments', {
          args,
        })
      }
      if (args.length === 1) {
        if (is.symbol(args[0])) return args[0]
        if (args[0].kind !== 'string') {
          throw EvaluationError.atArg(
            `symbol expects a string, got ${printString(args[0])}`,
            { args },
            0
          )
        }
        return v.symbol(args[0].value)
      }
      if (args[0].kind !== 'string' || args[1].kind !== 'string') {
        throw new EvaluationError('symbol expects string arguments', { args })
      }
      return v.symbol(`${args[0].value}/${args[1].value}`)
    })
    .doc('Returns a Symbol with the given namespace and name.', [
      ['name'],
      ['ns', 'name'],
    ]),
}
