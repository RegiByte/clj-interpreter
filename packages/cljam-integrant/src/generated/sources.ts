// Auto-generated from src/clojure — do not edit directly.
// Re-generate with: npm run gen:sources

export const sources: Record<string, string> = {
  'cljam.integrant.core': `(ns cljam.integrant.core
  (:require [cljam.integrant.native :as ig-native]))

; ---------------------------------------------------------------------------
; Reference constructors
; A ref is a plain map tagged with :integrant.core/ref — data-driven, printable,
; inspectable at the REPL without any special handling.
; ---------------------------------------------------------------------------

(defn ref [key]
  {:integrant.core/ref key})

(defn refset [key]
  {:integrant.core/refset key})

(defn ref? [x]
  (and (map? x) (contains? x :integrant.core/ref)))

(defn refset? [x]
  (and (map? x) (contains? x :integrant.core/refset)))

(defn reflike? [x]
  (or (ref? x) (refset? x)))

; ---------------------------------------------------------------------------
; Config key validation
; ---------------------------------------------------------------------------

(defn valid-config-key? [key]
  (qualified-keyword? key))

; ---------------------------------------------------------------------------
; Key search — find-derived uses strict equality in v1 (no hierarchy)
; ---------------------------------------------------------------------------

(defn find-derived [m target-key]
  (seq (filter (fn [[k _]] (= k target-key)) m)))

(defn find-derived-1 [m target-key]
  (let [kvs (find-derived m target-key)]
    (when (next kvs)
      (throw (ex-info (str "Multiple config keys match " target-key)
                      {:code "integrant/ambiguous-ref" :key target-key :matches kvs})))
    (first kvs)))

; ---------------------------------------------------------------------------
; Lifecycle multimethods
; All dispatch on the config key (strict equality in v1).
; ---------------------------------------------------------------------------

(defmulti init-key     (fn [key _value] key))
(defmulti halt-key!    (fn [key _value] key))
(defmulti resume-key   (fn [key _value _old-value _old-impl] key))
(defmulti suspend-key! (fn [key _value] key))
(defmulti assert-key   (fn [key _value] key))
(defmulti resolve-key  (fn [key _value] key))

; Default implementations
(defmethod halt-key!    :default [_ _] nil)
(defmethod assert-key   :default [_ _] nil)
(defmethod resolve-key  :default [_ v] v)
(defmethod suspend-key! :default [k v] (halt-key! k v))
(defmethod resume-key   :default [k v _ _] (init-key k v))

; ---------------------------------------------------------------------------
; ig/init — start a system from a config map
;
; Returns a pending (Promise) that resolves to the running system map.
; The system map carries ::origin (original config) and ::build (resolved values)
; as metadata.
;
; Usage:
;   (-> (ig/init config)
;       (then #(reset! *system %)))
; ---------------------------------------------------------------------------

(defn init
  ([config]
   (init config nil))
  ([config keys]
   (let [ordered-keys (ig-native/config->ordered-keys* config keys)]
     (ig-native/build-async* config ordered-keys
       (fn [k v] (init-key k v))
       (fn [k v] (assert-key k v))
       (fn [k v] (resolve-key k v))))))

; ---------------------------------------------------------------------------
; ig/halt! — stop a running system in reverse dependency order
;
; Returns a pending (Promise) that resolves to nil when all halt-key! calls
; have completed.
; ---------------------------------------------------------------------------

(defn halt!
  ([system]
   (halt! system nil))
  ([system keys]
   (let [origin (-> system meta :integrant.core/origin)
         ordered-keys (ig-native/config->ordered-keys* origin keys)
         reversed-keys (into [] (reverse ordered-keys))]
     (ig-native/run-async* system reversed-keys
       (fn [k v] (halt-key! k v))))))

; ---------------------------------------------------------------------------
; ig/suspend! — suspend a running system (for dev reload)
;
; Calls suspend-key! on each component in reverse order.
; Default suspend-key! just calls halt-key!.
; ---------------------------------------------------------------------------

(defn suspend!
  ([system]
   (suspend! system nil))
  ([system keys]
   (let [origin (-> system meta :integrant.core/origin)
         ordered-keys (ig-native/config->ordered-keys* origin keys)
         reversed-keys (into [] (reverse ordered-keys))]
     (ig-native/run-async* system reversed-keys
       (fn [k v] (suspend-key! k v))))))

; ---------------------------------------------------------------------------
; ig/resume — restart a system, reusing unchanged components
;
; For each key: if the resolved config value is unchanged AND the old system
; has a value for the key, calls resume-key (default: calls init-key again).
; Otherwise calls init-key fresh.
;
; Returns a pending that resolves to the new system map.
; ---------------------------------------------------------------------------

(defn resume
  ([config system]
   (resume config system nil))
  ([config system keys]
   (let [ordered-keys (ig-native/config->ordered-keys* config keys)
         old-build (-> system meta :integrant.core/build)]
     (ig-native/resume-async* config system ordered-keys old-build
       (fn [k v] (init-key k v))
       (fn [k v old-v old-impl] (resume-key k v old-v old-impl))
       (fn [k v] (assert-key k v))
       (fn [k v] (resolve-key k v))))))

; ---------------------------------------------------------------------------
; ig/build — low-level primitive (useful for testing or custom lifecycles)
;
; Like init but accepts a custom init-fn instead of the init-key multimethod.
; ---------------------------------------------------------------------------

(defn build
  ([config init-fn]
   (build config nil init-fn))
  ([config keys init-fn]
   (let [ordered-keys (ig-native/config->ordered-keys* config keys)]
     (ig-native/build-async* config ordered-keys
       (fn [k v] (init-fn k v))
       (fn [k v] (assert-key k v))
       (fn [k v] (resolve-key k v))))))

; ---------------------------------------------------------------------------
; ig/run! and ig/reverse-run! — side-effectful traversal
; ---------------------------------------------------------------------------

(defn run! [system f]
  (let [origin (-> system meta :integrant.core/origin)
        ordered-keys (ig-native/config->ordered-keys* origin nil)]
    (ig-native/run-async* system ordered-keys
      (fn [k v] (f k v)))))

(defn reverse-run! [system f]
  (let [origin (-> system meta :integrant.core/origin)
        ordered-keys (ig-native/config->ordered-keys* origin nil)
        reversed-keys (into [] (reverse ordered-keys))]
    (ig-native/run-async* system reversed-keys
      (fn [k v] (f k v)))))

; ---------------------------------------------------------------------------
; ig/fold — reduce over the system in dependency order
; (synchronous; f must be synchronous)
; ---------------------------------------------------------------------------

(defn fold [system f init-val]
  (let [origin (-> system meta :integrant.core/origin)
        ordered-keys (ig-native/config->ordered-keys* origin nil)]
    (reduce (fn [acc k]
              (let [v (get system k)]
                (f acc k v)))
            init-val
            ordered-keys)))
`,
}
