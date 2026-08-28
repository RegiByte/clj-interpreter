export function nowMs(): number {
  if (typeof performance !== 'undefined') return performance.now()
  return Date.now()
}

export function measureSync<T>(body: () => T): { value: T; elapsedMs: number } {
  const start = nowMs()
  const value = body()
  return { value, elapsedMs: nowMs() - start }
}
