(ns cljam.schema.core
  "Data-driven schema validation and JSON Schema generation for cljam.
   Inspired by malli. Schemas are plain data — keywords or vectors.

   Primitive schemas (bare keywords):
     :string  :int  :number  :boolean  :keyword  :symbol  :nil  :any  :uuid

   Compound schemas (vectors — [type ?props ...children]):
     [:string  {:min N :max N :pattern \"...\"}]
     [:int     {:min N :max N}]
     [:number  {:min N :max N}]
     [:map  ?{:closed true}  [key ?{:optional true} schema] ...]
     [:map-of  key-schema  value-schema]
     [:vector  ?{:min N :max N}  child-schema]
     [:tuple   child1  child2  ...]
     [:maybe   child-schema]
     [:or      s1  s2  ...]
     [:and     s1  s2  ...]
     [:enum    v1  v2  ...]
     [:fn      pred]

   Map entry format:  [key ?field-props schema]
     field-props → PRESENCE  ({:optional true}, {:default v})
     schema-props → VALIDITY ({:min N}, {:max N}, {:pattern re})

   Error codes returned by s/validate:
     :string/wrong-type  :string/too-short  :string/too-long  :string/pattern-mismatch
     :int/wrong-type     :int/too-small     :int/too-large
     :number/wrong-type  :number/too-small  :number/too-large
     :boolean/wrong-type :keyword/wrong-type :symbol/wrong-type :nil/wrong-type
     :uuid/wrong-type    :uuid/invalid-format
     :map/wrong-type     :map/missing-key   :map/extra-key
     :map-of/wrong-type
     :vector/wrong-type  :vector/too-short  :vector/too-long
     :tuple/wrong-type   :tuple/wrong-length
     :or/no-match        :enum/no-match
     :fn/predicate-failed  :fn/predicate-threw"
  (:require [cljam.schema.native :as schema-native]
            [clojure.string :as cljstr]))

; ---------------------------------------------------------------------------
; Private helpers for message formatters
; ---------------------------------------------------------------------------

(defn- schema-props
  "Extract the props map from a compound schema vector [type {props} ...].
   Returns nil for bare keyword schemas or vectors without a props map."
  [issue]
  (let [s (:schema issue)]
    (when (and (vector? s) (> (count s) 1))
      (let [sec (second s)]
        (when (map? sec) sec)))))

; ---------------------------------------------------------------------------
; Default message formatters
; ---------------------------------------------------------------------------

(def default-messages
  "Map from :error-code keyword → message formatter.
   Each value is either a static string or a (fn [issue] string).
   The issue map contains :error-code, :path, :schema.

   Used by s/explain. Override specific entries via the :messages option:
     (s/explain schema value {:messages {:string/too-short \"too short\"}})"
  {:string/wrong-type
   (fn [_] "expected a string")

   :string/too-short
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (or (get props :min) (get props :min-length)))]
       (if n (str "minimum length is " n) "string is too short")))

   :string/too-long
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (or (get props :max) (get props :max-length)))]
       (if n (str "maximum length is " n) "string is too long")))

   :string/pattern-mismatch
   (fn [iss]
     (let [props (schema-props iss)
           p (when props (get props :pattern))]
       (if p (str "must match pattern \"" p "\"") "does not match required pattern")))

   :int/wrong-type
   (fn [_] "expected an integer")

   :int/too-small
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (get props :min))]
       (if n (str "minimum value is " n) "value is too small")))

   :int/too-large
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (get props :max))]
       (if n (str "maximum value is " n) "value is too large")))

   :number/wrong-type
   (fn [_] "expected a number")

   :number/too-small
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (get props :min))]
       (if n (str "minimum value is " n) "value is too small")))

   :number/too-large
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (get props :max))]
       (if n (str "maximum value is " n) "value is too large")))

   :boolean/wrong-type
   (fn [_] "expected a boolean")

   :keyword/wrong-type
   (fn [_] "expected a keyword")

   :symbol/wrong-type
   (fn [_] "expected a symbol")

   :nil/wrong-type
   (fn [_] "expected nil")

   :uuid/wrong-type
   (fn [_] "expected a UUID string")

   :uuid/invalid-format
   (fn [_] "invalid UUID format")

   :map/wrong-type
   (fn [_] "expected a map")

   :map/missing-key
   (fn [iss]
     (let [k (last (:path iss))]
       (str "missing required key " k)))

   :map/extra-key
   (fn [iss]
     (let [k (last (:path iss))]
       (str "unexpected key " k " not allowed in closed map")))

   :map-of/wrong-type
   (fn [_] "expected a map")

   :vector/wrong-type
   (fn [_] "expected a vector")

   :vector/too-short
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (get props :min))]
       (if n (str "minimum length is " n) "vector is too short")))

   :vector/too-long
   (fn [iss]
     (let [props (schema-props iss)
           n (when props (get props :max))]
       (if n (str "maximum length is " n) "vector is too long")))

   :tuple/wrong-type
   (fn [_] "expected a vector (tuple)")

   :tuple/wrong-length
   (fn [iss]
     (let [s (:schema iss)
           expected (when (vector? s) (dec (count s)))]
       (if expected
         (str "expected tuple of length " expected)
         "wrong tuple length")))

   :or/no-match
   (fn [_] "value does not match any of the allowed schemas")

   :enum/no-match
   (fn [iss]
     (let [s (:schema iss)
           opts (when (vector? s) (rest s))]
       (str "expected one of: " (cljstr/join ", " (map str opts)))))

   :fn/predicate-failed
   (fn [_] "value failed predicate check")

   :fn/predicate-threw
   (fn [_] "predicate threw an error during validation")})

(def default-options
  "Default options map for s/explain.
   Contains the full default-messages registry.

   To customize a specific error message:
     (s/explain schema value {:messages {:string/too-short \"too short\"}})

   To extend with domain-specific codes:
     (s/explain schema value {:messages (merge s/default-messages my-messages)})"
  {:messages default-messages})

; ---------------------------------------------------------------------------
; Private: apply a single message formatter to one issue
; ---------------------------------------------------------------------------

(defn- apply-message [messages issue]
  (let [code (:error-code issue)
        fmt  (get messages code)]
    (if (nil? fmt)
      issue
      (let [msg (if (string? fmt) fmt (fmt issue))]
        (assoc issue :message msg)))))

; ---------------------------------------------------------------------------
; Public API
; ---------------------------------------------------------------------------

(defn validate
  "Validate value against schema. Returns {:ok true :value v} on success
   or {:ok false :issues [{:error-code kw :path [...] :schema schema}]} on failure.

   Issues contain :error-code keywords (e.g. :string/wrong-type) but no :message.
   Use s/explain to add formatted messages.

   Schema is data: a keyword (:string, :int, ...) or a vector
   [:map ...], [:map-of key-s val-s], [:vector s], [:maybe s],
   [:or s1 s2], [:enum v1 v2], [:fn pred], etc.

   Examples:
     (s/validate :string \"hello\")           ;; {:ok true :value \"hello\"}
     (s/validate [:map [:name :string]] {:name \"Alice\"})
     (s/validate [:int {:min 0 :max 100}] 42)"
  [schema value]
  (schema-native/validate* schema value))

(defn valid?
  "Returns true if value matches schema, false otherwise."
  [schema value]
  (:ok (validate schema value)))

(defn explain
  "Validate value against schema and attach a formatted :message to each issue.

   Without options, uses default-messages for formatting.
   Pass {:messages overrides-map} to customize specific error codes:

     ;; Static string override
     (s/explain schema value {:messages {:string/too-short \"too short!\"}})

     ;; Dynamic override — fn receives the full issue map {:error-code :path :schema}
     (s/explain schema value {:messages {:map/missing-key (fn [iss] (str \"need \" (last (:path iss))))}})

   The override map is merged on top of default-messages, so only specified
   codes are affected — all others continue to use their defaults.

   Returns {:ok true :value v} on success, or
           {:ok false :issues [{:error-code kw :message str :path [...] :schema schema}]} on failure."
  ([schema value]
   (explain schema value {}))
  ([schema value opts]
   (let [user-messages (get opts :messages {})
         messages      (merge default-messages user-messages)
         result        (validate schema value)]
     (if (:ok result)
       result
       (update result :issues #(mapv (partial apply-message messages) %))))))

(defn json-schema
  "Compile a cljam schema to a JSON Schema map (draft 2020-12).

   The result is a plain cljam map suitable for serialisation via pr-str,
   cljToJs, or clojure.edn/pr-str. It can be passed directly as a JSON
   Schema description to any tool that consumes it (e.g. MCP tool definitions).

   Examples:
     (s/json-schema :string)        ;; {:type \"string\"}
     (s/json-schema [:int {:min 0}]) ;; {:type \"integer\" :minimum 0}
     (s/json-schema [:map-of :string :int]) ;; {:type \"object\" :additionalProperties {:type \"integer\"}}
     (s/json-schema [:map [:name :string] [:age [:int {:min 0}]]])
     ;; {:type \"object\"
     ;;  :properties {:name {:type \"string\"} :age {:type \"integer\" :minimum 0}}
     ;;  :required [\"name\" \"age\"]}"
  [schema]
  (schema-native/json-schema* schema))
