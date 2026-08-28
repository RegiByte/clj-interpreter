// ESM with a default export AND named exports — to observe how require() vs
// import() surface the `default` (the dual-package shape question).
export const named = 'i am named'
export default { d: 'i am default', greet: (n) => `hi ${n} (esm-default)` }
