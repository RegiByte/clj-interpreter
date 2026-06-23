// Predicates & logical: nil?, true?, false?, truthy?, falsy?, not, not=,
// number?, string?, boolean?, vector?, list?, map?, keyword?, symbol?, fn?,
// coll?, some, every?
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type {
  CljNumber,
  CljValue,
  Env,
  EvaluationContext,
} from '../../../types'

const DocGroup = 'Predicates'

export const predicateFunctions: Record<string, CljValue> = {
  'nil?': v
    .nativeFn('nil?', function nilPredImpl(arg: CljValue) {
      return v.boolean(is.nil(arg))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is nil, false otherwise.',
        arglists: [['arg']],
        docGroup: DocGroup,
      }),
    ]),
  'true?': v
    .nativeFn('true?', function truePredImpl(arg: CljValue) {
      if (!is.boolean(arg)) {
        return v.boolean(false)
      }
      return v.boolean(arg.value === true)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a boolean and true, false otherwise.',
        arglists: [['arg']],
        docGroup: DocGroup,
      }),
    ]),
  'false?': v
    .nativeFn('false?', function falsePredImpl(arg: CljValue) {
      if (!is.boolean(arg)) {
        return v.boolean(false)
      }
      return v.boolean(arg.value === false)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a boolean and false, false otherwise.',
        arglists: [['arg']],
        docGroup: DocGroup,
      }),
    ]),
  'truthy?': v
    .nativeFn('truthy?', function truthyPredImpl(arg: CljValue) {
      return v.boolean(is.truthy(arg))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is not nil or false, false otherwise.',
        arglists: [['arg']],
        docGroup: DocGroup,
      }),
    ]),
  'falsy?': v
    .nativeFn('falsy?', function falsyPredImpl(arg: CljValue) {
      return v.boolean(is.falsy(arg))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is nil or false, false otherwise.',
        arglists: [['arg']],
        docGroup: DocGroup,
      }),
    ]),
  'not=': v
    .nativeFn('not=', function notEqualImpl(...vals: CljValue[]) {
      if (vals.length < 2) {
        throw new EvaluationError('not= expects at least two arguments', {
          args: vals,
        })
      }
      for (let i = 1; i < vals.length; i++) {
        if (!is.equal(vals[i], vals[i - 1])) {
          return v.boolean(true)
        }
      }
      return v.boolean(false)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if any two adjacent arguments are not equal, false otherwise.',
        arglists: [['&', 'vals']],
        docGroup: DocGroups.comparison,
      }),
    ]),
  'char?': v
    .nativeFn('char?', function charPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.char(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a character, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'number?': v
    .nativeFn('number?', function numberPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.number(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a number, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'string?': v
    .nativeFn('string?', function stringPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.string(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a string, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'boolean?': v
    .nativeFn('boolean?', function booleanPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.boolean(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a boolean, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'vector?': v
    .nativeFn('vector?', function vectorPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.vector(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a vector, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'list?': v
    .nativeFn('list?', function listPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.list(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a list, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'map?': v
    .nativeFn('map?', function mapPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.map(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a map, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'keyword?': v
    .nativeFn('keyword?', function keywordPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.keyword(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a keyword, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'qualified-keyword?': v
    .nativeFn(
      'qualified-keyword?',
      function qualifiedKeywordPredImpl(x: CljValue) {
        return v.boolean(
          x !== undefined && is.keyword(x) && x.name.includes('/')
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a qualified keyword, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'symbol?': v
    .nativeFn('symbol?', function symbolPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.symbol(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a symbol, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'namespace?': v
    .nativeFn('namespace?', function namespaceQImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.namespace(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a namespace.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'qualified-symbol?': v
    .nativeFn(
      'qualified-symbol?',
      function qualifiedSymbolPredImpl(x: CljValue) {
        return v.boolean(
          x !== undefined && is.symbol(x) && x.name.includes('/')
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a qualified symbol, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'ident?': v
    .nativeFn('ident?', function identPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && (is.keyword(x) || is.symbol(x)))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a symbol or keyword.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'simple-ident?': v
    .nativeFn('simple-ident?', function simpleIdentPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          ((is.keyword(x) && !x.name.includes('/')) ||
            (is.symbol(x) && !x.name.includes('/')))
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a symbol or keyword with no namespace component.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'qualified-ident?': v
    .nativeFn('qualified-ident?', function qualifiedIdentPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          ((is.keyword(x) && x.name.includes('/')) ||
            (is.symbol(x) && x.name.includes('/')))
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a symbol or keyword with a namespace component.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'simple-keyword?': v
    .nativeFn('simple-keyword?', function simpleKeywordPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined && is.keyword(x) && !x.name.includes('/')
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a keyword with no namespace component.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'simple-symbol?': v
    .nativeFn('simple-symbol?', function simpleSymbolPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.symbol(x) && !x.name.includes('/'))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a symbol with no namespace component.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'fn?': v
    .nativeFn('fn?', function fnPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.aFunction(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a function, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'ifn?': v
    .nativeFn('ifn?', function ifnPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.callable(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x implements the callable function interface, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'coll?': v
    .nativeFn('coll?', function collPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.collection(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if the value is a collection, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  some: v
    .nativeFnCtx(
      'some',
      function someImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        pred: CljValue,
        coll: CljValue
      ): CljValue {
        if (pred === undefined || !is.callable(pred)) {
          throw EvaluationError.atArg(
            `some expects a callable as first argument${pred !== undefined ? `, got ${printString(pred)}` : ''}`,
            { pred },
            0
          )
        }
        if (coll === undefined) {
          return v.nil()
        }
        if (!is.seqable(coll)) {
          throw EvaluationError.atArg(
            `some expects a collection or string as second argument, got ${printString(coll)}`,
            { coll },
            1
          )
        }
        for (const item of toSeq(coll)) {
          const result = ctx.applyCallable(pred, [item], callEnv)
          if (is.truthy(result)) {
            return result
          }
        }
        return v.nil()
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.',
        arglists: [['pred', 'coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),
  'every?': v
    .nativeFnCtx(
      'every?',
      function everyPredImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        pred: CljValue,
        coll: CljValue
      ): CljValue {
        if (pred === undefined || !is.callable(pred)) {
          throw EvaluationError.atArg(
            `every? expects a callable as first argument${pred !== undefined ? `, got ${printString(pred)}` : ''}`,
            { pred },
            0
          )
        }
        if (coll === undefined || !is.seqable(coll)) {
          throw EvaluationError.atArg(
            `every? expects a collection or string as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
            { coll },
            1
          )
        }
        for (const item of toSeq(coll)) {
          if (is.falsy(ctx.applyCallable(pred, [item], callEnv))) {
            return v.boolean(false)
          }
        }
        return v.boolean(true)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns true if all items in coll satisfy pred, false otherwise.',
        arglists: [['pred', 'coll']],
        docGroup: DocGroup,
      }),
    ]),
  'identical?': v
    .nativeFn(
      'identical?',
      function identicalPredImpl(x: CljValue, y: CljValue) {
        return v.boolean(x === y)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Tests if 2 arguments are the same object (reference equality).',
        arglists: [['x', 'y']],
        docGroup: DocGroups.comparison,
      }),
    ]),
  'seqable?': v
    .nativeFn('seqable?', function seqablePredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.seqable(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if the seq function is supported for x.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'seq?': v
    .nativeFn('seq?', function seqPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          (is.list(x) || is.cons(x) || is.lazySeq(x) || is.indexedSeq(x))
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a sequence, false otherwise.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'sequential?': v
    .nativeFn('sequential?', function sequentialPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          (is.list(x) ||
            is.vector(x) ||
            is.lazySeq(x) ||
            is.cons(x) ||
            is.indexedSeq(x))
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if coll is a sequential collection (list, vector, lazy-seq, or cons).',
        arglists: [['coll']],
        docGroup: DocGroup,
      }),
    ]),
  'associative?': v
    .nativeFn('associative?', function associativePredImpl(x: CljValue) {
      return v.boolean(x !== undefined && (is.map(x) || is.vector(x)))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if coll implements Associative (map or vector).',
        arglists: [['coll']],
        docGroup: DocGroup,
      }),
    ]),
  'counted?': v
    .nativeFn('counted?', function countedPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          (is.list(x) ||
            is.vector(x) ||
            is.map(x) ||
            is.set(x) ||
            is.string(x))
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if coll implements count in constant time.',
        arglists: [['coll']],
        docGroup: DocGroup,
      }),
    ]),
  'int?': v
    .nativeFn('int?', function intPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          Number.isInteger((x as import('../../../types').CljNumber).value)
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is a fixed precision integer.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'integer?': v
    .nativeFn('integer?', function integerPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          Number.isInteger((x as CljNumber).value)
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is an integer.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'float?': v
    .nativeFn('float?', function floatPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          !Number.isInteger((x as CljNumber).value)
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is a floating point number.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'pos-int?': v
    .nativeFn('pos-int?', function posIntPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          Number.isInteger((x as CljNumber).value) &&
          (x as CljNumber).value > 0
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is a positive fixed precision integer.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'neg-int?': v
    .nativeFn('neg-int?', function negIntPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          Number.isInteger((x as CljNumber).value) &&
          (x as CljNumber).value < 0
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is a negative fixed precision integer.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'nat-int?': v
    .nativeFn('nat-int?', function natIntPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          Number.isInteger((x as CljNumber).value) &&
          (x as CljNumber).value >= 0
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is a non-negative fixed precision integer.',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'double?': v
    .nativeFn('double?', function doublePredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.number(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Return true if x is a Double (all numbers in JS are doubles).',
        arglists: [['x']],
        docGroup: DocGroup,
      }),
    ]),
  'NaN?': v
    .nativeFn('NaN?', function nanPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined && is.number(x) && isNaN((x as CljNumber).value)
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if num is NaN, else false.',
        arglists: [['num']],
        docGroup: DocGroups.arithmetic,
      }),
    ]),
  'infinite?': v
    .nativeFn('infinite?', function infinitePredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          is.number(x) &&
          !isFinite((x as CljNumber).value) &&
          !isNaN((x as CljNumber).value)
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if num is positive or negative infinity, else false.',
        arglists: [['num']],
        docGroup: DocGroups.arithmetic,
      }),
    ]),
}
