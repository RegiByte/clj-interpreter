import type { Session } from '../core'

/**
 * Inject browser-native host functions into a session.
 *
 * This is the browser counterpart to host/node.ts. The browser host exposes
 * web-native APIs (fetch, localStorage, etc.) rather than Node/Bun filesystem
 * APIs. Currently a stub — implementations will be added as needed.
 */
export function injectBrowserHostFunctions(_session: Session): void {
  // TODO: inject browser-specific host functions (fetch, localStorage, etc.)
}
