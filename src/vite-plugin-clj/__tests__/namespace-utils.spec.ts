import { describe, expect, it } from 'vitest'
import {
  extractNsName,
  extractNsRequires,
  nsToPath,
  pathToNs,
} from '../namespace-utils'

describe('pathToNs', () => {
  it('converts a simple path under a source root', () => {
    expect(pathToNs('src/my/utils.clj', ['src'])).toBe('my.utils')
  })

  it('converts a nested path', () => {
    expect(pathToNs('src/my/app/core.clj', ['src'])).toBe('my.app.core')
  })

  it('converts a single-segment namespace', () => {
    expect(pathToNs('src/utils.clj', ['src'])).toBe('utils')
  })

  it('tries multiple source roots and picks the matching one', () => {
    expect(pathToNs('lib/my/utils.clj', ['src', 'lib'])).toBe('my.utils')
  })

  it('prefers the first matching source root', () => {
    expect(pathToNs('src/my/utils.clj', ['src', 'src/my'])).toBe('my.utils')
  })

  it('handles source root with trailing slash', () => {
    expect(pathToNs('src/my/utils.clj', ['src/'])).toBe('my.utils')
  })

  it('throws if path is not under any source root', () => {
    expect(() => pathToNs('other/my/utils.clj', ['src'])).toThrow(
      'not under any configured source root'
    )
  })

  it('handles Windows-style backslashes', () => {
    expect(pathToNs('src\\my\\utils.clj', ['src'])).toBe('my.utils')
  })
})

describe('nsToPath', () => {
  it('converts a dotted namespace to a path', () => {
    expect(nsToPath('my.utils', 'src')).toBe('src/my/utils.clj')
  })

  it('converts a single-segment namespace', () => {
    expect(nsToPath('utils', 'src')).toBe('src/utils.clj')
  })

  it('converts a deeply nested namespace', () => {
    expect(nsToPath('my.app.core.impl', 'src')).toBe(
      'src/my/app/core/impl.clj'
    )
  })

  it('handles source root with trailing slash', () => {
    expect(nsToPath('my.utils', 'src/')).toBe('src/my/utils.clj')
  })
})

describe('extractNsRequires', () => {
  it('returns empty array when no ns form', () => {
    expect(extractNsRequires('(def x 1)')).toEqual([])
  })

  it('returns empty array when ns has no requires', () => {
    expect(extractNsRequires('(ns my.app)')).toEqual([])
  })

  it('extracts a single require', () => {
    expect(
      extractNsRequires('(ns my.app (:require [my.utils :as u]))')
    ).toEqual(['my.utils'])
  })

  it('extracts multiple requires from one clause', () => {
    expect(
      extractNsRequires(
        '(ns my.app (:require [my.utils :as u] [other.ns :as o]))'
      )
    ).toEqual(['my.utils', 'other.ns'])
  })

  it('extracts requires with :refer', () => {
    expect(
      extractNsRequires(
        '(ns my.app (:require [my.utils :refer [helper]]))'
      )
    ).toEqual(['my.utils'])
  })

  it('extracts requires with :as and :refer combined', () => {
    expect(
      extractNsRequires(
        '(ns my.app (:require [my.utils :as u :refer [helper]]))'
      )
    ).toEqual(['my.utils'])
  })

  it('handles require followed by other code', () => {
    const source = `(ns my.app (:require [my.utils :as u]))
(def x (u/helper 5))`
    expect(extractNsRequires(source)).toEqual(['my.utils'])
  })

  it('handles multiple :require clauses', () => {
    const source = `(ns my.app
  (:require [ns.a :as a])
  (:require [ns.b :as b]))`
    expect(extractNsRequires(source)).toEqual(['ns.a', 'ns.b'])
  })
})

describe('extractNsName', () => {
  it('returns null when no ns form', () => {
    expect(extractNsName('(def x 1)')).toBe(null)
  })

  it('extracts namespace name from ns form', () => {
    expect(extractNsName('(ns my.app)')).toBe('my.app')
  })

  it('extracts namespace name when requires are present', () => {
    expect(
      extractNsName('(ns my.app (:require [my.utils :as u]))')
    ).toBe('my.app')
  })

  it('extracts from source with multiple forms', () => {
    expect(extractNsName('(ns my.app)\n(def x 1)\n(def y 2)')).toBe('my.app')
  })
})
