const identityHashMap = new WeakMap<object, number>()
let nextIdentityHash = 1

export function identityHash(obj: object): number {
  let h = identityHashMap.get(obj)
  if (h === undefined) {
    h = nextIdentityHash
    nextIdentityHash = nextIdentityHash >= 0x40000000 ? 1 : nextIdentityHash + 1
    identityHashMap.set(obj, h)
  }
  return h
}
