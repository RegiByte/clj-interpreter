import { describe, it } from 'vitest'
import { expectChunkParity } from './ir-parity-utils'

describe('ir-parity: const', () => {
  it('number', () => expectChunkParity('42'))
  it('negative number', () => expectChunkParity('-7'))
  it('float', () => expectChunkParity('3.14'))
  it('string', () => expectChunkParity('"hello"'))
  it('keyword', () => expectChunkParity(':foo'))
  it('nil', () => expectChunkParity('nil'))
  it('true', () => expectChunkParity('true'))
  it('false', () => expectChunkParity('false'))
})

describe('ir-parity: quote', () => {
  it('quoted list', () => expectChunkParity("(quote (a b c))"))
  it('quoted symbol', () => expectChunkParity("(quote foo)"))
  it('quoted number', () => expectChunkParity("(quote 42)"))
})

describe('ir-parity: vector', () => {
  it('empty vector', () => expectChunkParity('[]'))
  it('number vector', () => expectChunkParity('[1 2 3]'))
  it('mixed vector', () => expectChunkParity('[:a "b" 3]'))
  it('nested vector', () => expectChunkParity('[[1 2] [3 4]]'))
})

describe('ir-parity: map', () => {
  it('empty map', () => expectChunkParity('{}'))
  it('keyword map', () => expectChunkParity('{:a 1 :b 2}'))
  it('string-keyed map', () => expectChunkParity('{"x" 10}'))
  it('nested map', () => expectChunkParity('{:a {:b 2}}'))
})

describe('ir-parity: set', () => {
  it('set of numbers', () => expectChunkParity('#{1 2 3}'))
  it('set of keywords', () => expectChunkParity('#{:a :b}'))
})

describe('ir-parity: if', () => {
  it('if with else', () => expectChunkParity('(if true 1 2)'))
  it('if without else', () => expectChunkParity('(if nil 1)'))
  it('if with symbol test', () => expectChunkParity('(if false :yes :no)'))
  it('nested if', () => expectChunkParity('(if true (if false 1 2) 3)'))
})

describe('ir-parity: do', () => {
  it('empty do', () => expectChunkParity('(do)'))
  it('single form do', () => expectChunkParity('(do 42)'))
  it('multi-form do', () => expectChunkParity('(do 1 2 3)'))
  it('do with calls', () => expectChunkParity('(do (identity 1) (identity 2) :done)'))
})

describe('ir-parity: invoke (plain calls, no intrinsics)', () => {
  it('single arg', () => expectChunkParity('(inc 41)'))
  it('multi arg', () => expectChunkParity('(list 1 2 3)'))
  it('string args', () => expectChunkParity('(str "hello" " " "world")'))
  it('identity', () => expectChunkParity('(identity :x)'))
  it('vector fn', () => expectChunkParity('(vector 1 2)'))
  it('no args', () => expectChunkParity('(list)'))
  it('nested calls', () => expectChunkParity('(identity (identity 42))'))
})

describe('ir-parity: var (global symbol reference)', () => {
  it('unqualified var', () => expectChunkParity('inc'))
  it('unqualified var 2', () => expectChunkParity('identity'))
  it('qualified var', () => expectChunkParity('clojure.core/list'))
  it('qualified call', () => expectChunkParity('(clojure.core/list 1 2)'))
  it('qualified no-arg call', () => expectChunkParity('(clojure.core/list)'))
})

describe('ir-parity: nested collections with calls', () => {
  it('vector of calls', () => expectChunkParity('[(inc 1) (inc 2)]'))
  it('map with call values', () => expectChunkParity('{:a (identity 1)}'))
  it('if with collections', () => expectChunkParity('(if true [:yes] [:no])'))
  it('call with vector arg', () => expectChunkParity('(identity [1 2 3])'))
  it('call with map arg', () => expectChunkParity('(identity {:a 1})'))
})
