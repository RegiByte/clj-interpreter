// Auto-generated from src/clojure/cljam/vm.clj — do not edit directly.
// Re-generate with: npm run gen:core-source
export const cljam_vmSource = `\
(ns cljam.vm
  "VM bytecode inspection and first-pass analysis helpers.")

(declare bytecode-info*-impl)

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
`
