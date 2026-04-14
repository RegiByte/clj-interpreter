(ns cljam.handbook
  "Machine-readable quick-reference for the cljam runtime.
   Intended for LLM agents — dense, example-heavy, no prose.
   Humans: use describe, the REPL, or official docs instead.

   Usage:
     (require '[cljam.handbook :as h])
     (h/topics)            ;; list all topic keys
     (h/lookup :sort)      ;; get a specific entry
     (h/register! :my-tip \"...\")  ;; add/update a topic (session-local)")

;; ── Registry ──────────────────────────────────────────────────────────────

(def ^:dynamic *topics*
  (atom {

   :sort
   "Default comparator is `compare`, NOT `<`.
    `<` is numbers-only — breaks on strings, keywords, chars.
    (sort [\"b\" \"a\"])           ;; ok — compare is default
    (sort [\\c \\a \\b])          ;; ok — chars comparable via compare
    (sort [:b :a :c])          ;; ok
    (sort-by :score > records) ;; explicit comparator always works"

   :char-literals
   "Char literals: \\a \\b ... \\z \\A ... \\Z \\0 ... \\9
    Named: \\space \\newline \\tab \\return \\backspace \\formfeed
    Unicode: \\uXXXX (4 hex digits)
    Type: char? returns true. Distinct from strings.
    (char 65)   ;; => \\A   (codepoint → char)
    (int \\A)    ;; => 65   (char → codepoint)
    (str \\h \\i) ;; => \"hi\" (chars join to string)"

   :dynamic-vars
   "^:dynamic vars + binding = thread-local scope.
    Atoms = shared mutable state (visible across sessions sharing the same atom ref).
    (def ^:dynamic *db* (atom nil))
    (binding [*db* my-conn]     ;; shadow for this scope only
      (do-work))
    @*db*                       ;; still nil after binding exits
    Difference: (swap! *db* f) mutates in place; (binding ...) replaces the reference."

   :require
   "(require '[clojure.string :as str])
    (require '[cljam.schema.core :as s])
    Works for: built-in clojure.* namespaces, cljam.* built-ins, library namespaces
    registered via CljamLibrary.sources.
    No :use. No :refer-all. Aliased requires only.
    Lazy: namespace source is loaded on first require, cached after."

   :jvm-gaps
   "Not in cljam (no JVM):
    - No agents (send, send-off, await)
    - No refs / dosync / STM
    - No Java interop (.method obj, (new ClassName))
    - No gen-class / proxy / reify (use defrecord + defprotocol)
    - No classpath / pom.xml
    - No futures from clojure.core (use JS Promise via async)
    - transients: not implemented
    - clojure.java.* namespaces: not available"

   :types
   "CljValue kinds (value.kind):
    :nil :boolean :number :string :keyword :symbol :char
    :list :vector :map :set
    :fn :macro :multimethod :protocol :record
    :atom :var :namespace :js-object
    (type x) returns the kind keyword.
    (char? x) (string? x) (map? x) etc. — standard predicates all work."

   :records
   "(defrecord Point [x y])
    (->Point 1 2)          ;; positional constructor
    (map->Point {:x 1 :y 2}) ;; map constructor
    (:x p)                 ;; field access
    (record? p)            ;; => true
    (type p)               ;; => :user/Point (or :ns/Point)
    Records implement map semantics: assoc, get, keys all work.
    Use with defprotocol + extend-protocol for polymorphic dispatch."

   :protocols
   "(defprotocol IShape
      (area [this])
      (perimeter [this]))
    (extend-protocol IShape
      :user/Circle
        (area [c] (* Math/PI (:r c) (:r c)))
        (perimeter [c] (* 2 Math/PI (:r c))))
    (satisfies? IShape my-circle)  ;; => true
    (protocols my-circle)          ;; list all protocols it satisfies
    Dispatch key = (type value) = :ns/RecordName for records, :string/:number/... for primitives."

   :schema-primitives
   "Primitive schemas: :string :int :number :boolean :keyword :symbol :nil :any :uuid :char
    (s/validate :string \"hi\")   ;; {:ok true :value \"hi\"}
    (s/validate :int 3.5)       ;; {:ok false :issues [{:error-code :int/wrong-type ...}]}
    :int requires integer (no decimal). :number accepts any number.
    :any always passes. :nil only accepts nil."

   :schema-compound
   "Compound schemas:
    [:map [:k schema] [:k {:optional true} schema] ...]
    [:map-of key-schema val-schema]
    [:vector item-schema]
    [:tuple s1 s2 s3]           ;; fixed-length, positional
    [:maybe schema]             ;; nil or schema
    [:or s1 s2 ...]             ;; first match wins
    [:and s1 s2 ...]            ;; all must pass (no short-circuit on type fail!)
    [:enum v1 v2 ...]           ;; value must be one of these
    [:fn pred]                  ;; arbitrary predicate fn
    Constraints map (second el): {:min n :max n :pattern \"regex\"}"

   :schema-api
   "(require '[cljam.schema.core :as s])
    (s/validate schema value)        ;; {:ok bool :value v} or {:ok false :issues [...]}
    (s/valid? schema value)          ;; boolean shorthand
    (s/explain schema value)         ;; issues include :message (uses default-messages)
    (s/explain schema value {:messages {:kw \"override\" :kw2 (fn [iss] ...)}})
    (s/json-schema schema)           ;; compile to JSON Schema map (draft 2020-12)
    Issues shape: {:error-code :kw :path [...] :schema schema}
    Error codes: :string/wrong-type :int/too-small :map/missing-key :tuple/wrong-length etc."

   :describe
   "(describe value)            ;; returns a plain map describing any cljam value
    (describe (find-ns 'my.ns)) ;; {:kind :namespace :var-count N :vars {...}}
    (describe my-fn)            ;; {:kind :fn :arglists [...] :doc \"...\"}
    (describe #'my-fn)          ;; var-level, includes :doc from var meta
    (ns-map (find-ns 'my.ns))   ;; map of sym → var for full namespace inspection
    Key insight: describe + ns-map let you discover the live runtime without reading source."

   :sessions
   "Sessions are isolated runtimes — defn in session A is invisible in session B.
    To share a definition across sessions: eval the same code into each session explicitly.
    Atoms defined in session A ARE shared if session B holds a reference to the same atom.
    nREPL: multiple Calva sessions + cljam-mcp can all share one nREPL server.
    connect_nrepl { port } → returns other_sessions (find Calva session by namespace).
    nrepl_eval { session_id, code } → eval into any session by ID."

   :pair-programming
   "Start nREPL server: cljam nrepl-server --port 7888 --root-dir /path/to/project
    Calva connects normally. cljam-mcp calls connect_nrepl { port: 7888 }.
    connect_nrepl response includes other_sessions — identify Calva's session by :ns.
    Both sides eval into the same session_id → truly shared state.
    Atoms, defs, registered multimethods — all visible to both parties instantly.
    Workflow: human defines fns, AI calls them (or vice versa)."

   :and-short-circuit
   "[:and s1 s2 ...] does NOT short-circuit on type failure.
    If s1 is a type schema (:int) and s2 is [:fn pred], the pred still runs
    on the wrong-type value and emits :fn/predicate-threw alongside s1's error.
    Discovered: Session 172, validating [:and :int [:fn pos?]] with a string value.
    Workaround: use a single [:fn] that guards both: [:fn #(and (int? %) (pos? %))]
    This is a known gap — fix pending."

   :handbook
   "This namespace. An atom registry of machine-readable tips for LLM agents.
    (require '[cljam.handbook :as h])
    (h/topics)                  ;; list all topic keys
    (h/lookup :sort)            ;; get entry as string
    (h/register! :my-tip \"...\") ;; add/update (session-local unless committed to file)
    Topics are mutable during a session — agents can refine entries and test them live."

   }))

;; ── Public API ────────────────────────────────────────────────────────────

(defn topics
  "List all available handbook topic keys."
  []
  (keys @*topics*))

(defn lookup
  "Look up a handbook topic. Returns the entry string, or a not-found message
   that lists available topics."
  [topic]
  (or (get @*topics* topic)
      (str "No handbook entry for " topic
           ". Available topics: " (sort (map name (keys @*topics*))))))

(defn register!
  "Add or update a handbook topic. Changes are session-local unless committed
   to the source file. Use this to iterate on entries during a live session."
  [topic content]
  (swap! *topics* assoc topic content)
  topic)
