// Plain ESM fixture — named exports, no top-level await.
export function greet(name) {
  return `hello ${name} (esm)`
}
export const kind = 'esm'
export const answer = 42
