// Thin wrapper so Vite can bundle Monaco's editor worker via the
// `new URL('./editor.worker.ts', import.meta.url)` pattern.
// Vite only recognises the worker-bundling pattern for relative paths;
// bare package specifiers inside new URL() are not resolved the same way.
import 'monaco-editor/esm/vs/editor/editor.worker'
