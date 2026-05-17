// Auto-generated from src/clojure/cljam/vm.clj — do not edit directly.
// Re-generate with: npm run gen:core-source
export const cljam_vmSource = `\
(ns cljam.vm
  "VM bytecode inspection and first-pass analysis helpers.")

(declare bytecode-info*-impl)
(declare value-summary*-impl)

(defmacro
  bytecode-info*
  "Returns structured VM bytecode information for form, or nil when the target is not bytecode-backed."
  [form]
  \`(bytecode-info*-impl '~form))

(defn- instructions
  [info]
  (mapcat :instructions (:chunks info)))

(defn
  opcode-sequence
  "Returns opcode keywords from bytecode-info* in chunk order."
  [info]
  (into [] (map :op) (instructions info)))

(defn
  opcode-frequencies
  "Returns a frequency map of opcode keywords from bytecode-info*."
  [info]
  (frequencies (opcode-sequence info)))

(defn- chunk-opcodes
  [chunk]
  (into [] (map :op) (:instructions chunk)))

(defn- ngrams-for-ops
  [ops n]
  (loop [idx 0
         acc []]
    (if (> (+ idx n) (count ops))
      acc
      (recur (inc idx) (conj acc (into [] (take n) (drop idx ops)))))))

(defn
  opcode-ngrams
  "Returns a frequency map of per-chunk opcode windows of size n."
  [info n]
  (frequencies
   (mapcat
    (fn [chunk] (ngrams-for-ops (chunk-opcodes chunk) n))
    (:chunks info))))

(defn
  invocation-frequencies
  "Returns a frequency map of conservative direct callee hints from bytecode-info*."
  [info]
  (frequencies
   (map :callee
        (filter :callee (instructions info)))))

(defn- merge-counts
  [& maps]
  (apply merge-with + maps))

(defn- normalize-census-opts
  [opts]
  {:include-private? (get opts :include-private? false)
   :ngrams           (get opts :ngrams [2 3 4 5])
   :top-limit        (get opts :top-limit 25)})

(defn- bytecode-info-counts
  [info]
  (if (nil? info)
    {:chunk-count       0
     :instruction-count 0}
    {:chunk-count       (count (:chunks info))
     :instruction-count (reduce
                         (fn [acc chunk] (+ acc (count (:instructions chunk))))
                         0
                         (:chunks info))}))

(defn- ngram-frequencies-for-info
  [info ns]
  (if (nil? info)
    {}
    (reduce
     (fn [acc n]
       (assoc acc n (opcode-ngrams info n)))
     {}
     ns)))

(defn- item-kind
  [summary info]
  (let [kind (:kind summary)]
    (if (and (nil? info)
             (or (= kind :function) (= kind :macro)))
      :unsupported
      kind)))

(defn- census-item
  [entry opts]
  (let [name    (first entry)
        the-var (second entry)
        summary (value-summary*-impl the-var)
        info    (:bytecode-info summary)
        counts  (bytecode-info-counts info)]
    {:name                   name
     :kind                   (item-kind summary info)
     :bytecode?              (not (nil? info))
     :arity-count            (:arity-count summary)
     :bytecode-arity-count   (:bytecode-arity-count summary)
     :chunk-count            (:chunk-count counts)
     :instruction-count      (:instruction-count counts)
     :opcode-frequencies     (if (nil? info) {} (opcode-frequencies info))
     :invocation-frequencies (if (nil? info) {} (invocation-frequencies info))
     :opcode-ngrams          (ngram-frequencies-for-info info (:ngrams opts))}))

(defn- merge-ngram-frequencies
  [left right]
  (reduce-kv
   (fn [acc n freq-map]
     (assoc acc n (merge-counts (get acc n {}) freq-map)))
   left
   right))

(defn- aggregate-ngram-frequencies
  [items]
  (reduce
   (fn [acc item]
     (merge-ngram-frequencies acc (:opcode-ngrams item)))
   {}
   items))

(defn- namespace-totals
  [items]
  {:vars              (count items)
   :bytecode-vars     (count (filter :bytecode? items))
   :native-vars       (count (filter #(= (:kind %) :native) items))
   :other-vars        (count (filter #(= (:kind %) :other) items))
   :unsupported-vars  (count (filter #(= (:kind %) :unsupported) items))
   :arities           (reduce (fn [acc item] (+ acc (:arity-count item))) 0 items)
   :bytecode-arities  (reduce (fn [acc item] (+ acc (:bytecode-arity-count item))) 0 items)
   :chunks            (reduce (fn [acc item] (+ acc (:chunk-count item))) 0 items)
   :instructions      (reduce (fn [acc item] (+ acc (:instruction-count item))) 0 items)})

(defn- aggregate-frequency-key
  [items key]
  (reduce
   (fn [acc item]
     (merge-counts acc (get item key {})))
   {}
   items))

(defn- namespace-var-map
  [ns-sym include-private?]
  (if include-private?
    (ns-interns ns-sym)
    (ns-publics ns-sym)))

(defn
  namespace-census
  "Returns compact VM bytecode census data for a namespace symbol. Requires the namespace first."
  ([ns-sym] (namespace-census ns-sym {}))
  ([ns-sym opts]
   (let [opts     (normalize-census-opts opts)
         _        (require [ns-sym])
         scope    (if (:include-private? opts) :interns :publics)
         items    (into [] (map #(census-item % opts)) (namespace-var-map ns-sym (:include-private? opts)))]
     {:namespace              ns-sym
      :scope                  scope
      :totals                 (namespace-totals items)
      :opcode-frequencies     (aggregate-frequency-key items :opcode-frequencies)
      :invocation-frequencies (aggregate-frequency-key items :invocation-frequencies)
      :opcode-ngrams          (aggregate-ngram-frequencies items)
      :items                  items})))

(defn- merge-totals
  [left right]
  (merge-counts left right))

(defn
  corpus-census
  "Returns aggregate VM bytecode census data for a sequence of namespace symbols."
  ([ns-syms] (corpus-census ns-syms {}))
  ([ns-syms opts]
   (let [opts       (normalize-census-opts opts)
         namespaces (into [] (map #(namespace-census % opts)) ns-syms)]
     {:namespaces             namespaces
      :totals                 (reduce
                               (fn [acc census] (merge-totals acc (:totals census)))
                               {}
                               namespaces)
      :opcode-frequencies     (reduce
                               (fn [acc census] (merge-counts acc (:opcode-frequencies census)))
                               {}
                               namespaces)
      :invocation-frequencies (reduce
                               (fn [acc census] (merge-counts acc (:invocation-frequencies census)))
                               {}
                               namespaces)
      :opcode-ngrams          (reduce
                               (fn [acc census] (merge-ngram-frequencies acc (:opcode-ngrams census)))
                               {}
                               namespaces)})))

(defn
  top-frequencies
  "Returns the top frequency entries as [key count] vectors sorted descending by count."
  [freq-map limit]
  (into [] (take limit) (sort-by (fn [entry] (- 0 (second entry))) freq-map)))

(defn
  top-opcodes
  "Returns the most frequent opcodes in a namespace or corpus census."
  [census limit]
  (top-frequencies (:opcode-frequencies census) limit))

(defn
  top-invocations
  "Returns the most frequent conservative direct invocation hints in a namespace or corpus census."
  [census limit]
  (top-frequencies (:invocation-frequencies census) limit))

(defn
  top-ngrams
  "Returns the most frequent opcode n-grams of size n in a namespace or corpus census."
  [census n limit]
  (top-frequencies (get (:opcode-ngrams census) n {}) limit))
`
