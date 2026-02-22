import { describe, it, expect } from 'vitest'
import { define, extend, lookup, makeEnv } from '../env'
import { cljNumber } from '../factories'

describe('env', () => {
  it('should make a new environment', () => {
    const env = makeEnv()
    expect(env).toBeDefined()
    expect(env.bindings).toBeDefined()
    expect(env.outer).toBeNull()
    expect(env.bindings).toBeInstanceOf(Map)
  })

  it('should define a new binding', () => {
    const env = makeEnv()
    define('x', cljNumber(1), env)
    expect(env.bindings.get('x')).toMatchObject(cljNumber(1))
  })

  it('should lookup a binding in the environment', () => {
    const env = makeEnv()
    define('x', cljNumber(1), env)
    expect(lookup('x', env)).toMatchObject(cljNumber(1))
  })

  it('should extend an environment with new bindings', () => {
    const env = makeEnv()
    define('x', cljNumber(1), env)
    const extended = extend(['y'], [cljNumber(2)], env)
    expect(extended.outer).toBe(env)
    expect(extended.outer).toBeDefined()
    expect(extended.bindings).toBeDefined()
    expect(extended.bindings).toBeInstanceOf(Map)
    expect(lookup('x', extended)).toMatchObject(cljNumber(1))
    expect(lookup('y', extended)).toMatchObject(cljNumber(2))
    expect(extended.outer!.bindings.get('x')).toMatchObject(cljNumber(1)) // x is in the parent environment
    expect(extended.bindings.get('y')).toMatchObject(cljNumber(2)) // y is in the extended environment
    // if we were to try and get the x binding from the extended environment directly, it would not be there
    // since extension creates a new environment with the outer as the parent, it doesn't copy the bindings from the parent,
    // it only adds the new bindings to the new child env
  })

  it('should throw when looking up a symbol that is not defined', () => {
    const env = makeEnv()
    expect(() => lookup('x', env)).toThrow('Symbol x not found')
  })

  it('should shadow parent bindings in the child env', () => {
    const outer = makeEnv()
    define('x', cljNumber(1), outer)
    const inner = extend(['x'], [cljNumber(99)], outer)
    expect(lookup('x', inner)).toMatchObject(cljNumber(99))
    expect(lookup('x', outer)).toMatchObject(cljNumber(1))
  })
})
