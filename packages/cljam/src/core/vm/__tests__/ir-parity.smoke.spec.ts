import { describe, expect, it } from 'vitest'
import { compileBoth, normalizeChunk, prepareForm } from './ir-parity-utils'

describe('ir-parity harness wiring', () => {
  it('reads and expands a single form against a core-loaded session', () => {
    const { form } = prepareForm('(+ 1 2)')
    expect(form.kind).toBe('list')
  })

  it('runs both compilers and the legacy one succeeds on a literal', () => {
    const { legacy, ir } = compileBoth('42')
    expect(legacy.ok).toBe(true)
    expect(typeof ir.ok).toBe('boolean')
  })

  it('normalizeChunk drops position side-arrays', () => {
    const { legacy } = compileBoth('42')
    if (!legacy.ok) throw new Error('expected legacy compile')
    const normalized = normalizeChunk(legacy.chunk) as Record<string, unknown>
    expect(normalized).not.toHaveProperty('positions')
    expect(normalized).not.toHaveProperty('callArgPositions')
    expect(normalized).toHaveProperty('code')
  })
})
