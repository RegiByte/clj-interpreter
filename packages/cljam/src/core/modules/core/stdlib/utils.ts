// Miscellaneous utilities: str, type, gensym, eval, macroexpand-1, macroexpand,
// namespace, name, keyword
import { is } from '../../../assertions'
import {
  derefValue,
  getNamespaceEnv,
  tryLookup,
} from '../../../env'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { makeGensym } from '../../../gensym'
import {
  buildPrintContext,
  joinLines,
  prettyPrintString,
  printString,
  withPrintContext,
} from '../../../printer'
import { readForms } from '../../../reader'
import { measureSync, nowMs } from '../../../timing'
import { tokenize } from '../../../tokenizer'
import { toSeq, valueToString } from '../../../transformations'
import {
  disassembleChunkBundleLines,
} from '../../../vm/debug'
import { resolveBytecodeTarget } from '../../../vm/introspection'
import type {
  CljValue,
  Env,
  EvaluationContext,
  EvaluationMeasurementStage,
  VmFallbackReason,
} from '../../../types'
import { emitToOut } from './print'

/**
 * Resolves a symbol (qualified or unqualified) to a macro value, or undefined
 * if the symbol doesn't resolve to a macro. Mirrors the logic in expand.ts so
 * that macroexpand-1/macroexpand correctly handle auto-qualified forms.
 */
function lookupMacroValue(
  name: string,
  callEnv: Env,
  ctx: EvaluationContext
): CljValue | undefined {
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const nsPrefix = name.slice(0, slashIdx)
    const localName = name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(callEnv)
    const targetNs =
      nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null
    if (!targetNs) return undefined
    const varEntry = targetNs.vars.get(localName)
    return varEntry !== undefined ? derefValue(varEntry) : undefined
  }
  return tryLookup(name, callEnv)
}

function keywordPath(path: string | undefined): CljValue {
  if (path === undefined) return v.nil()
  return v.keyword(`:${path.replace(':', '/')}`)
}

function reasonToMap(reason: VmFallbackReason): CljValue {
  return v.map([
    [v.keyword(':category'), v.keyword(`:${reason.category}`)],
    [v.keyword(':detail'), v.string(reason.detail)],
  ])
}

function stageToMap(stage: EvaluationMeasurementStage): CljValue {
  const entries: [CljValue, CljValue][] = [
    [v.keyword(':stage'), v.keyword(stage.stage)],
    [v.keyword(':elapsed-ms'), v.number(stage.elapsedMs)],
  ]
  if (stage.path !== undefined) {
    entries.push([v.keyword(':path'), keywordPath(stage.path)])
  }
  if (stage.reason !== undefined) {
    entries.push([v.keyword(':reason'), reasonToMap(stage.reason)])
  }
  return v.map(entries)
}

function bodyFormsFromArg(body: CljValue | undefined): CljValue[] {
  if (body === undefined || is.nil(body)) return []
  if (is.list(body) || is.vector(body)) return body.value
  if (is.cons(body) || is.lazySeq(body)) return toSeq(body)
  throw EvaluationError.atArg(
    `measure* internal body must be a sequence, got ${printString(body)}`,
    { body },
    0
  )
}

function measureBody(
  ctx: EvaluationContext,
  callEnv: Env,
  body: CljValue | undefined
): CljValue {
  const forms = bodyFormsFromArg(body)
  const stages: EvaluationMeasurementStage[] = []
  let path: string | undefined
  let result: CljValue = v.nil()
  const previousMeasurement = ctx.measurement
  const previousDepth = ctx.evaluationDepth
  const start = nowMs()

  ctx.measurement = {
    recordStage(stage) {
      stages.push(stage)
    },
    setPath(nextPath) {
      path = nextPath
    },
  }
  ctx.evaluationDepth = 0

  try {
    for (const form of forms) {
      const { value: expanded, elapsedMs } = measureSync(() => {
        ctx.measurement = undefined
        try {
          return ctx.expandAll(form, callEnv)
        } finally {
          ctx.measurement = {
            recordStage(stage) {
              stages.push(stage)
            },
            setPath(nextPath) {
              path = nextPath
            },
          }
        }
      })
      stages.push({ stage: ':macroexpand', elapsedMs })
      result = ctx.evaluate(expanded, callEnv)
    }
  } finally {
    ctx.measurement = previousMeasurement
    ctx.evaluationDepth = previousDepth
  }

  return v.map([
    [v.keyword(':value'), result],
    [v.keyword(':elapsed-ms'), v.number(nowMs() - start)],
    [v.keyword(':path'), keywordPath(path)],
    [v.keyword(':stages'), v.vector(stages.map(stageToMap))],
  ])
}

function disassembleForm(
  ctx: EvaluationContext,
  callEnv: Env,
  form: CljValue | undefined
): CljValue {
  const target = resolveBytecodeTarget(ctx, callEnv, form)
  return target === null
    ? v.nil()
    : v.vector(disassembleChunkBundleLines(target.entries).map(v.string))
}

function mapLookup(map: CljValue, keyName: string): CljValue {
  if (!is.map(map)) return v.nil()
  return (
    map.entries.find(([key]) => is.keyword(key) && key.name === keyName)?.[1] ??
    v.nil()
  )
}

export const utilFunctions: Record<string, CljValue> = {
  str: v
    .nativeFn('str', function strImpl(...args: CljValue[]) {
      return v.string(
        args.map((v) => (is.nil(v) ? '' : valueToString(v))).join('')
      )
    })
    .withMeta([
      ...docMeta({
        doc: joinLines([
          'Returns a concatenated string representation of the given values.',
        ]),
        arglists: [['&', 'args']],
        docGroup: DocGroups.strings,
      }),
    ]),
  subs: v
    .nativeFn(
      'subs',
      function subsImpl(s: CljValue, start: CljValue, end?: CljValue) {
        if (s === undefined || !is.string(s)) {
          throw EvaluationError.atArg(
            `subs expects a string as first argument${s !== undefined ? `, got ${printString(s)}` : ''}`,
            { s },
            0
          )
        }
        if (start === undefined || !is.number(start)) {
          throw EvaluationError.atArg(
            `subs expects a number as second argument${start !== undefined ? `, got ${printString(start)}` : ''}`,
            { start },
            1
          )
        }
        if (end !== undefined && !is.number(end)) {
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
    .withMeta([
      ...docMeta({
        doc: joinLines([
          'Returns the substring of s beginning at start, and optionally ending before end.',
        ]),
        arglists: [
          ['s', 'start'],
          ['s', 'start', 'end'],
        ],
        docGroup: DocGroups.strings,
      }),
    ]),
  type: v
    .nativeFn('type', function typeImpl(x: CljValue) {
      if (x === undefined) {
        throw new EvaluationError('type expects an argument', { x })
      }
      // Records return a namespaced keyword :ns/RecordType — the same keyword
      // you pass to extend-protocol/:protocols for this type.
      if (is.record(x)) {
        return v.keyword(`:${x.ns}/${x.recordType}`)
      }
      if (is.mapEntry(x)) return v.keyword(':map-entry')
      const kindToKeyword: Record<string, string> = {
        number: ':number',
        string: ':string',
        boolean: ':boolean',
        nil: ':nil',
        keyword: ':keyword',
        symbol: ':symbol',
        char: ':char',
        list: ':list',
        vector: ':vector',
        map: ':map',
        set: ':set',
        function: ':function',
        'native-function': ':function',
        macro: ':macro',
        'multi-method': ':multimethod',
        regex: ':regex',
        var: ':var',
        delay: ':delay',
        'lazy-seq': ':lazy-seq',
        cons: ':cons',
        atom: ':atom',
        namespace: ':namespace',
        protocol: ':protocol',
        pending: ':pending',
        'js-value': ':js-value',
      }
      const kw = kindToKeyword[x.kind]
      if (!kw) {
        throw new EvaluationError(`type: unhandled kind ${x.kind}`, { x })
      }
      return v.keyword(kw)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a keyword representing the type of a value. Records return :ns/RecordType; built-ins return :string, :number, :nil, etc.',
        arglists: [['x']],
        docGroup: DocGroups.introspection,
      }),
    ]),
  gensym: v
    .nativeFn('gensym', function gensymImpl(...args: CljValue[]) {
      if (args.length > 1) {
        throw new EvaluationError('gensym takes 0 or 1 arguments', { args })
      }
      const prefix = args[0]
      if (prefix !== undefined && !is.string(prefix)) {
        throw EvaluationError.atArg(
          `gensym prefix must be a string${prefix !== undefined ? `, got ${printString(prefix)}` : ''}`,
          { prefix },
          0
        )
      }
      const p = prefix && is.string(prefix) ? prefix.value : 'G'
      return v.symbol(makeGensym(p))
    })
    .doc(
      'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',
      [[], ['prefix']]
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',
        arglists: [[], ['prefix']],
        docGroup: DocGroups.runtime,
      }),
    ]),
  'measure*-impl': v
    .nativeFnCtx(
      'measure*-impl',
      function measureImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        body: CljValue | undefined
      ) {
        return measureBody(ctx, callEnv, body)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for measure*. Evaluates quoted body forms and returns structured timing data.',
        arglists: [['body']],
        docGroup: DocGroups.runtime,
      }),
    ]),
  'time*-impl': v
    .nativeFnCtx(
      'time*-impl',
      function timeImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        body: CljValue | undefined
      ) {
        const measured = measureBody(ctx, callEnv, body)
        const elapsed = mapLookup(measured, ':elapsed-ms')
        emitToOut(ctx, callEnv, `Elapsed time: ${valueToString(elapsed)} msecs\n`)
        return mapLookup(measured, ':value')
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for time. Evaluates quoted body forms, prints elapsed time, and returns the value.',
        arglists: [['body']],
        docGroup: DocGroups.runtime,
      }),
    ]),
  'disassemble*-impl': v
    .nativeFnCtx(
      'disassemble*-impl',
      function disassembleImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        form: CljValue | undefined
      ) {
        return disassembleForm(ctx, callEnv, form)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for disassemble*. Returns formatted VM bytecode lines for quoted forms and bytecode-backed values.',
        arglists: [['form']],
        docGroup: DocGroups.runtime,
      }),
    ]),
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
    .withMeta([
      ...docMeta({
        doc: 'Evaluates the given form in the global environment and returns the result.',
        arglists: [['form']],
        docGroup: DocGroups.runtime,
      }),
    ]),

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
        const macroValue = lookupMacroValue(head.name, callEnv, ctx)
        if (macroValue === undefined) return form
        if (!is.macro(macroValue)) return form
        return ctx.applyMacro(macroValue, form.value.slice(1))
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.',
        arglists: [['form']],
        docGroup: DocGroups.runtime,
      }),
    ]),

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
          const macroValue = lookupMacroValue(head.name, callEnv, ctx)
          if (macroValue === undefined) return current
          if (!is.macro(macroValue)) return current
          current = ctx.applyMacro(macroValue, current.value.slice(1))
        }
      }
    )
    .withMeta([
      ...docMeta({
        doc: joinLines([
          'Expands all macros until the expansion is stable (head is no longer a macro)',
          '',
          'Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms',
        ]),
        arglists: [['form']],
        docGroup: DocGroups.runtime,
      }),
    ]),

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
    .withMeta([
      ...docMeta({
        doc: joinLines([
          'Fully expands all macros in a form recursively — including in sub-forms.',
          '',
          'Unlike macroexpand, this descends into every sub-expression.',
          'Expansion stops at quote/quasiquote boundaries and fn/loop bodies.',
        ]),
        arglists: [['form']],
        docGroup: DocGroups.runtime,
      }),
    ]),

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
    .withMeta([
      ...docMeta({
        doc: 'Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.',
        arglists: [['x']],
        docGroup: DocGroups.introspection,
      }),
    ]),

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
      } else if (is.string(x)) {
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
    .withMeta([
      ...docMeta({
        doc: 'Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.',
        arglists: [['x']],
        docGroup: DocGroups.introspection,
      }),
    ]),

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
      if (!is.string(args[0])) {
        throw EvaluationError.atArg(
          `keyword expects a string, got ${printString(args[0])}`,
          { args },
          0
        )
      }
      if (args.length === 1) {
        return v.keyword(`:${args[0].value}`)
      }
      if (!is.string(args[1])) {
        throw EvaluationError.atArg(
          `keyword second argument must be a string, got ${printString(args[1])}`,
          { args },
          1
        )
      }
      return v.keyword(`:${args[0].value}/${args[1].value}`)
    })
    .withMeta([
      ...docMeta({
        doc: joinLines([
          'Constructs a keyword with the given name and namespace strings. Returns a keyword value.',
          '',
          'Note: do not use : in the keyword strings, it will be added automatically.',
          'e.g. (keyword "foo") => :foo',
        ]),
        arglists: [['name'], ['ns', 'name']],
        docGroup: DocGroups.strings,
      }),
    ]),

  boolean: v
    .nativeFn('boolean', function booleanImpl(x: CljValue) {
      if (x === undefined) return v.boolean(false)
      return v.boolean(is.truthy(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Coerces to boolean. Everything is true except false and nil.',
        arglists: [['x']],
        docGroup: DocGroups.utilities,
      }),
    ]),

  'clojure-version': v
    .nativeFn('clojure-version', function clojureVersionImpl() {
      return v.string('1.12.0')
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a string describing the current Clojure version.',
        arglists: [[]],
        docGroup: DocGroups.utilities,
      }),
    ]),

  'pr-str': v
    .nativeFnCtx(
      'pr-str',
      function prStrImpl(
        ctx: EvaluationContext,
        _callEnv,
        ...args: CljValue[]
      ) {
        return withPrintContext(buildPrintContext(ctx), () =>
          v.string(args.map(printString).join(' '))
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a readable string representation of the given values (strings are quoted).',
        arglists: [['&', 'args']],
        docGroup: DocGroups.strings,
      }),
    ]),

  'pretty-print-str': v
    .nativeFnCtx(
      'pretty-print-str',
      function prettyPrintStrImpl(
        ctx: EvaluationContext,
        _callEnv,
        ...args: CljValue[]
      ) {
        if (args.length === 0) return v.string('')
        const form = args[0]
        const widthArg = args[1]
        const maxWidth =
          widthArg !== undefined && is.number(widthArg)
            ? widthArg.value
            : 80
        return withPrintContext(buildPrintContext(ctx), () =>
          v.string(prettyPrintString(form, maxWidth))
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a pretty-printed string representation of form.',
        arglists: [['form'], ['form', 'max-width']],
        docGroup: DocGroups.strings,
      }),
    ]),

  'read-string': v
    .nativeFn('read-string', function readStringImpl(s: CljValue) {
      if (s === undefined || !is.string(s)) {
        throw EvaluationError.atArg(
          `read-string expects a string${s !== undefined ? `, got ${printString(s)}` : ''}`,
          { s },
          0
        )
      }
      const tokens = tokenize(s.value)
      const forms = readForms(tokens, undefined, undefined, s.value)
      if (forms.length === 0) return v.nil()
      return forms[0]
    })
    .withMeta([
      ...docMeta({
        doc: 'Reads one object from the string s. Returns nil if string is empty.',
        arglists: [['s']],
        docGroup: DocGroups.strings,
      }),
    ]),

  'prn-str': v
    .nativeFnCtx(
      'prn-str',
      function prnStrImpl(
        ctx: EvaluationContext,
        _callEnv,
        ...args: CljValue[]
      ) {
        return withPrintContext(buildPrintContext(ctx), () =>
          v.string(args.map(printString).join(' ') + '\n')
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'pr-str to a string, followed by a newline.',
        arglists: [['&', 'args']],
        docGroup: DocGroups.strings,
      }),
    ]),

  'print-str': v
    .nativeFnCtx(
      'print-str',
      function printStrImpl(
        ctx: EvaluationContext,
        _callEnv,
        ...args: CljValue[]
      ) {
        return withPrintContext(buildPrintContext(ctx), () =>
          v.string(args.map(valueToString).join(' '))
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'print to a string (human-readable, no quotes on strings).',
        arglists: [['&', 'args']],
        docGroup: DocGroups.strings,
      }),
    ]),

  'println-str': v
    .nativeFn('println-str', function printlnStrImpl(...args: CljValue[]) {
      return v.string(args.map(valueToString).join(' ') + '\n')
    })
    .withMeta([
      ...docMeta({
        doc: 'println to a string.',
        arglists: [['&', 'args']],
        docGroup: DocGroups.strings,
      }),
    ]),

  symbol: v
    .nativeFn('symbol', function symbolImpl(...args: CljValue[]) {
      if (args.length === 0 || args.length > 2) {
        throw new EvaluationError('symbol expects 1 or 2 string arguments', {
          args,
        })
      }
      if (args.length === 1) {
        if (is.symbol(args[0])) return args[0]
        if (!is.string(args[0])) {
          throw EvaluationError.atArg(
            `symbol expects a string, got ${printString(args[0])}`,
            { args },
            0
          )
        }
        return v.symbol(args[0].value)
      }
      if (!is.string(args[0]) || !is.string(args[1])) {
        throw new EvaluationError('symbol expects string arguments', { args })
      }
      return v.symbol(`${args[0].value}/${args[1].value}`)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a Symbol with the given namespace and name.',
        arglists: [['name'], ['ns', 'name']],
        docGroup: DocGroups.runtime,
      }),
    ]),

  // Clojure 1.11 safe-parse functions — return nil instead of throwing on invalid input.

  'parse-long': v
    .nativeFn('parse-long', function parseLongImpl(s: CljValue) {
      if (s === undefined || !is.string(s)) {
        throw EvaluationError.atArg(
          `parse-long expects a string${s !== undefined ? `, got ${printString(s)}` : ''}`,
          { s },
          0
        )
      }
      if (!/^[+-]?\d+$/.test(s.value)) return v.nil()
      const n = Number.parseInt(s.value, 10)
      return Number.isFinite(n) ? v.number(n) : v.nil()
    })
    .withMeta([
      ...docMeta({
        doc: 'Parses string s as a long integer. Returns nil if s is not a valid integer string.',
        arglists: [['s']],
        docGroup: DocGroups.utilities,
      }),
    ]),

  'parse-double': v
    .nativeFn('parse-double', function parseDoubleImpl(s: CljValue) {
      if (s === undefined || !is.string(s)) {
        throw EvaluationError.atArg(
          `parse-double expects a string${s !== undefined ? `, got ${printString(s)}` : ''}`,
          { s },
          0
        )
      }
      const trimmed = s.value.trim()
      if (trimmed === '') return v.nil()
      const n = Number(trimmed)
      // Number("NaN") → NaN — that's a valid double in JVM Clojure too
      if (Number.isNaN(n) && trimmed !== 'NaN') return v.nil()
      return v.number(n)
    })
    .withMeta([
      ...docMeta({
        doc: 'Parses string s as a double. Returns nil if s is not a valid number string.',
        arglists: [['s']],
        docGroup: DocGroups.utilities,
      }),
    ]),

  'parse-boolean': v
    .nativeFn('parse-boolean', function parseBooleanImpl(s: CljValue) {
      if (s === undefined || !is.string(s)) {
        throw EvaluationError.atArg(
          `parse-boolean expects a string${s !== undefined ? `, got ${printString(s)}` : ''}`,
          { s },
          0
        )
      }
      if (s.value === 'true') return v.boolean(true)
      if (s.value === 'false') return v.boolean(false)
      return v.nil()
    })
    .withMeta([
      ...docMeta({
        doc: 'Parses string s as a boolean. Returns true for "true", false for "false", nil for anything else.',
        arglists: [['s']],
        docGroup: DocGroups.utilities,
      }),
    ]),
}
