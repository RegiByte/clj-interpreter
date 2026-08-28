(ns cljam.vm
  "VM bytecode inspection and first-pass analysis helpers.")

(declare bytecode-info*-impl)
(declare value-summary*-impl)
(declare bytecode-census-item*-impl)
(declare namespace-census-impl*)

(defmacro
  bytecode-info*
  "Returns structured VM bytecode information for form, or nil when the target is not bytecode-backed."
  [form]
  `(bytecode-info*-impl '~form))

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

(defn- merge-ngram-frequencies
  [left right]
  (reduce-kv
   (fn [acc n freq-map]
     (assoc acc n (merge-counts (get acc n {}) freq-map)))
   left
   right))

(defn- normalize-census-opts
  [opts]
  {:include-private? (get opts :include-private? false)
   :ngrams           (get opts :ngrams [2 3 4 5])
   :top-limit        (get opts :top-limit 25)})

(defn
  namespace-census
  "Returns compact VM bytecode census data for a namespace symbol. Requires the namespace first."
  ([ns-sym] (namespace-census ns-sym {}))
  ([ns-sym opts]
   (let [opts (normalize-census-opts opts)
         _    (require [ns-sym])]
     (namespace-census-impl* ns-sym (:include-private? opts) (:ngrams opts)))))

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
