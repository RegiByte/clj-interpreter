/**
 * Node/Bun JS Interop Experiment
 *
 * Experimenting with cljam + native ESM dynamic imports.
 * No bundler — just Bun
 *
 *   bun run main.ts
 *
 * Key design under test:
 *   importModule: (s) => import(s)
 *
 * At build time (Vite), a static import table replaces this.
 * Here we use real dynamic import() to validate the runtime contract.
 */

import { readFileSync } from 'node:fs'
import { createSession, printString } from '@regibyte/cljam'
import { startNreplServer } from 'cljam/nrepl'
import { library as dateLib } from '@regibyte/cljam-date'

const session = createSession({
  output: (text) => process.stdout.write(text),
  importModule: (specifier) => import(specifier),
  hostBindings: { Math, console },
  sourceRoots: ['src'],
  readFile: (filePath) => readFileSync(filePath, 'utf-8'),
  libraries: [dateLib],
  allowedPackages: ['cljam.date'],
  allowedHostModules: ['node:'],
})

function section(title: string) {
  console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`)
}

// ── 1. Basic method call via the . special form ─────────────────────────────
//
// (:require ["node:path" :as path]) loads the module via importModule,
// boxes the whole namespace object as CljJsValue, and binds it to `path`
// in the current namespace (NOT in js/).
//
// (. path join "a" "b") → path["join"]("a", "b") → "a/b"
section('1. Basic method call')

const result1 = await session.evaluateAsync(`
  (ns demo.path
    (:require ["node:path" :as path]))
  ; call node path method  
  (. path join "src" "components" "App.tsx")
`)
console.log(
  '(. path join "src" "components" "App.tsx") =>',
  printString(result1)
)

// ── 2. After the module is loaded, sync evaluate() works fine ───────────────
//
// importModule runs during (:require ...) processing, which only happens
// once per ns declaration. Subsequent evaluations of the same namespace
// are fully synchronous.
section('2. Sync evaluate after require')

const result2 = session.evaluate(`
  (. path dirname "/usr/local/bin/conjure")
`)
console.log(
  '(. path dirname "/usr/local/bin/conjure") =>',
  printString(result2)
)

// ── 3. Compose with Clojure higher-order functions ──────────────────────────
//
// path is just a CljJsValue — it composes naturally with core functions.
// The anon-fn #(. path basename %) is idiomatic Clojure style.
section('3. Compose with Clojure HOFs')

const result3 = await session.evaluateAsync(`
  (ns demo.hof
    (:require ["node:path" :as path]))
  (mapv #(. path basename %) ["/foo/bar/baz.txt" "/home/user/app.js" "main.clj"])
`)
console.log('(mapv #(. path basename %) [...]) =>', printString(result3))

// ── 4. Nested calls — return value of . is a Clojure string ─────────────────
//
// (. path join ...) returns a CljString. We can pass it directly into
// another (. path dirname ...) call — jsToClj/cljToJs handle the round-trip.
section('4. Nested calls')

const result4 = await session.evaluateAsync(`
  (ns demo.nested
    (:require ["node:path" :as path]))
  (. path dirname (. path join "/usr/local" "bin/foo.sh"))
`)
console.log('(. path dirname (. path join ...)) =>', printString(result4))

// ── 5. js/get to access a module export as a first-class value ──────────────
//
// Sometimes you want the function itself, not a method call.
// (js/get path "extname") retrieves path.extname as a CljJsValue fn.
// (js/call ext-fn "index.ts") invokes it with no this binding.
section('5. js/get + js/call')

const result5 = await session.evaluateAsync(`
  (ns demo.jsget
    (:require ["node:path" :as path]))
  (let [ext-fn (js/get path "extname")]
    (mapv #(js/call ext-fn %) ["index.ts" "core.clj" "styles.css"]))
`)
console.log('(mapv #(js/call ext-fn %) [...]) =>', printString(result5))

// ── 6. println output routes through the session output fn ──────────────────
//
// Output from (println ...) flows through the output: option on createSession.
// Here that's process.stdout.write, so println output appears inline.
section('6. println in Clojure code')

console.log('Clojure println output:')
await session.evaluateAsync(`
  (ns demo.output
    (:require ["node:path" :as path]))
  (println "resolve src =>" (. path resolve "src"))
  (println "parse /foo/bar.ts =>")
  (let [parsed (js/get path "parse")]
    (println "  base:" (js/get (js/call parsed "/foo/bar.ts") "base")))
`)

// ── 7. Accessing js/Math from hostBindings ───────────────────────────────────
section('7. hostBindings — js/Math')

const result7 = session.evaluate(`
  (let [result (mapv #(. js/Math pow % 2) [1 2 3 4 5])]
    (. js/console log result)
    result)
`)
console.log('(mapv #(. js/Math pow % 2) [1..5]) =>', printString(result7))

// ── 8. Load a Clojure file from disk ────────────────────────────────────────
//
// readFile: (filePath) => readFileSync(filePath, 'utf-8') lets the runtime
// resolve (:require [demo.utils]) by reading src/demo/utils.clj from disk.
//
// The runtime constructs the path as: {sourceRoot}/{ns/path}.clj
// e.g. sourceRoot "src" + ns "demo.utils" → "src/demo/utils.clj"
section('8. Load Clojure file from disk')

// demo.utils has JS string requires inside it (node:path, node:http).
// We evaluate it directly via evaluateAsync so processNsRequiresAsync
// can await those imports before running the defns.
// After this call, demo.utils is in the runtime registry.
const utilsSource = readFileSync('src/demo/utils.clj', 'utf-8')
await session.evaluateAsync(utilsSource)

// [demo.utils] is now a registry cache hit — sync require is safe.
const result8 = session.evaluate(`
  (ns demo.app
    (:require [demo.utils :as utils]))
  (utils/group-by-ext
    ["index.ts" "core.clj" "styles.css" "parser.clj" "main.ts" "repl.clj"])
`)
console.log('(utils/group-by-ext [...]) =>', printString(result8))

const result9 = session.evaluate(`
  (filter utils/clj-file? ["server.ts" "routes.clj" "db.ts" "handlers.clj"])
`)
console.log('(filter utils/clj-file? [...]) =>', printString(result9))

console.log('\n✓ All demos complete\n')

// ── 9. nREPL server ──────────────────────────────────────────────────────────
//
// Snapshot the session (post-demos) and serve it over nREPL.
// Every editor connection gets a fresh clone of this state:
//   - js/Math, js/console  (from hostBindings)
//   - demo.utils namespace (loaded from disk in section 8)
//   - demo.path, demo.hof, etc. (loaded during the demos above)
//   - importModule wired up — string requires work in the REPL too
//
// Connect with Calva → "Connect to a running nREPL server" → port in .nrepl-port
section('9. nREPL server')

startNreplServer({
  session,
  importModule: (s) => import(s),
  sourceRoots: ['src'],
  onOutput: (text) => process.stdout.write(text),
})

// Process stays alive while the TCP server is running.
// Ctrl+C to stop.
