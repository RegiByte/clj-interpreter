import { derefValue } from '../../../env'
import { v } from '../../../factories'
import {
  buildPrintContext,
  prettyPrintString,
  printString,
  withPrintContext,
} from '../../../printer'
import { valueToString } from '../../../transformations'
import type { CljValue, Env, EvaluationContext } from '../../../types'

/**
 * Emit text to the current output channel.
 * If *out* is dynamically bound to a callable (e.g. inside with-out-str),
 * invoke it. Otherwise fall back to ctx.io.stdout.
 *
 * NOTE: We look up *out* via ctx.resolveNs('clojure.core') rather than
 * tryLookup(callEnv) because Clojure functions close over the original
 * snapshot env. After a snapshot restore, those closure envs point to the
 * old CljVar objects, not the session's freshly cloned ones. resolveNs goes
 * through the runtime registry and always returns the session's own var.
 */
function emitToOut(ctx: EvaluationContext, callEnv: Env, text: string): void {
  const outVar = ctx.resolveNs('clojure.core')?.vars.get('*out*')
  const out = outVar ? derefValue(outVar) : undefined
  if (out && (out.kind === 'function' || out.kind === 'native-function')) {
    ctx.applyCallable(out, [v.string(text)], callEnv)
  } else {
    ctx.io.stdout(text)
  }
}

/**
 * Emit text to the current error channel.
 * If *err* is dynamically bound to a callable (e.g. inside with-err-str),
 * invoke it. Otherwise fall back to ctx.io.stderr.
 * Same snapshot-env rationale as emitToOut.
 */
function emitToErr(ctx: EvaluationContext, callEnv: Env, text: string): void {
  const errVar = ctx.resolveNs('clojure.core')?.vars.get('*err*')
  const err = errVar ? derefValue(errVar) : undefined
  if (err && (err.kind === 'function' || err.kind === 'native-function')) {
    ctx.applyCallable(err, [v.string(text)], callEnv)
  } else {
    ctx.io.stderr(text)
  }
}

export const printFunctions: Record<string, CljValue> = {
  println: v.nativeFnCtx('println', (ctx, callEnv, ...args: CljValue[]) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map(valueToString).join(' ') + '\n')
    })
    return v.nil()
  }),
  print: v.nativeFnCtx('print', (ctx, callEnv, ...args: CljValue[]) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map(valueToString).join(' '))
    })
    return v.nil()
  }),
  newline: v.nativeFnCtx('newline', (ctx, callEnv) => {
    emitToOut(ctx, callEnv, '\n')
    return v.nil()
  }),
  pr: v.nativeFnCtx('pr', (ctx, callEnv, ...args: CljValue[]) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map((v) => printString(v)).join(' '))
    })
    return v.nil()
  }),
  prn: v.nativeFnCtx('prn', (ctx, callEnv, ...args: CljValue[]) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map((v) => printString(v)).join(' ') + '\n')
    })
    return v.nil()
  }),
  pprint: v.nativeFnCtx(
    'pprint',
    (ctx, callEnv, form: CljValue, widthArg?: CljValue) => {
      if (form === undefined) return v.nil()
      const maxWidth = widthArg?.kind === 'number' ? widthArg.value : 80
      withPrintContext(buildPrintContext(ctx), () => {
        emitToOut(ctx, callEnv, prettyPrintString(form, maxWidth) + '\n')
      })
      return v.nil()
    }
  ),
  warn: v.nativeFnCtx('warn', (ctx, callEnv, ...args: CljValue[]) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToErr(ctx, callEnv, args.map(valueToString).join(' ') + '\n')
    })
    return v.nil()
  }),
}

export const printVars: Record<string, CljValue> = {
  // Dynamic output-channel vars. IO functions check these first before
  // falling back to ctx.io.stdout / ctx.io.stderr. Bound by with-out-str
  // and with-err-str macros defined in clojure.core.
  '*out*': v.nil(),
  '*err*': v.nil(),
  // Dynamic print-control vars
  '*print-length*': v.nil(),
  '*print-level*': v.nil(),
  // Compatibility var for IDE tooling
  '*compiler-options*': v.map([]),
}
