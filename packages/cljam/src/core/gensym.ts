let _counter = 0

export function makeGensym(prefix = 'G'): string {
  return `${prefix}__${_counter++}`
}

export function resetGensymCounter(): void {
  _counter = 0
}
