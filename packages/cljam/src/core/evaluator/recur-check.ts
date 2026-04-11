import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { specialFormKeywords } from '../keywords.ts'
import { getPos } from '../positions'
import type { CljValue } from '../types'

/**
 * Asserts that every `recur` form in `body` appears strictly in tail position.
 *
 * This check runs on a fully macro-expanded body (courtesy of the expansion phase),
 * so it only needs to handle special forms — no macro names are required.
 *
 * Tail-position contexts recognised:
 *   - Last form in a body sequence
 *   - `if`   — both the then-branch and the else-branch
 *   - `do`   — last sub-form
 *   - `let`  — last body form (binding values are never tail)
 *
 * Boundaries (new recur target — stop descending):
 *   - `fn`, `loop`         — a nested fn/loop creates its own recur target
 *   - `quote`, `quasiquote` — literal data, nothing to check
 *
 * Everything else (function calls, arithmetic, etc.):
 *   all sub-forms are treated as non-tail, so `recur` as an argument is an error.
 */
export function assertRecurInTailPosition(body: CljValue[]): void {
  validateForms(body, true)
}

function isRecurForm(form: CljValue): boolean {
  return (
    is.list(form) &&
    form.value.length >= 1 &&
    is.symbol(form.value[0]) &&
    form.value[0].name === specialFormKeywords.recur
  )
}

/** Walk a sequence of forms where only the last one may be in tail position. */
function validateForms(forms: CljValue[], inTail: boolean): void {
  for (let i = 0; i < forms.length; i++) {
    validateForm(forms[i], inTail && i === forms.length - 1)
  }
}

/** Walk a single form; `inTail` = whether a direct recur here is valid. */
function validateForm(form: CljValue, inTail: boolean): void {
  if (!is.list(form)) return

  if (isRecurForm(form)) {
    if (!inTail) {
      throw new EvaluationError('Can only recur from tail position', { form }, getPos(form))
    }
    return
  }

  if (form.value.length === 0) return

  const first = form.value[0]

  if (!is.symbol(first)) {
    // Anonymous fn call etc. — all sub-forms are non-tail
    for (const sub of form.value) validateForm(sub, false)
    return
  }

  const name = first.name

  // Boundaries: new recur target or literal data — stop descending
  if (
    name === 'fn' ||
    name === specialFormKeywords['fn*'] ||
    name === 'loop' ||
    name === specialFormKeywords['loop*'] ||
    name === specialFormKeywords.quote
  ) {
    return
  }

  // `if`: condition is non-tail; both branches inherit inTail
  if (name === specialFormKeywords.if) {
    if (form.value[1]) validateForm(form.value[1], false)
    if (form.value[2]) validateForm(form.value[2], inTail)
    if (form.value[3]) validateForm(form.value[3], inTail)
    return
  }

  // `do`: last sub-form inherits inTail
  if (name === specialFormKeywords.do) {
    validateForms(form.value.slice(1), inTail)
    return
  }

  // `let`/`let*`: binding values are non-tail; last body form inherits inTail
  if (name === 'let' || name === specialFormKeywords['let*']) {
    const bindings = form.value[1]
    if (is.vector(bindings)) {
      for (let i = 1; i < bindings.value.length; i += 2) {
        validateForm(bindings.value[i], false)
      }
    }
    validateForms(form.value.slice(2), inTail)
    return
  }

  // All other forms (function calls, special forms not listed above):
  // sub-expressions are non-tail — recur as an argument is an error
  for (const sub of form.value.slice(1)) {
    validateForm(sub, false)
  }
}
