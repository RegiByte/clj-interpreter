// ESM with TOP-LEVEL AWAIT — the module graph is asynchronous. This is the case
// require() fundamentally cannot load synchronously (ERR_REQUIRE_ASYNC_MODULE).
const delayed = await Promise.resolve('resolved-via-tla')
export const value = delayed
export function greet(name) {
  return `hello ${name} (tla)`
}
