// src/vite-plugin-cljam/index.ts
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync as writeFileSync2, readdirSync, statSync } from "node:fs";
import { resolve as resolve2, relative, join as join2, dirname as dirname2 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// src/clojure/generated/clojure-core-source.ts
var clojure_coreSource = `(ns clojure.core)

;; Bootstrap shims: lightweight macros so the Clojure layer owns let/fn/loop
;; from the very first line. The full destructuring-aware versions redefine
;; these below once their dependencies (destructure, maybe-destructured, etc.)
;; are available.
(defmacro let [bindings & body]
  \`(let* ~bindings ~@body))

(defmacro fn [& sigs]
  (cons 'fn* sigs))

(defmacro loop [bindings & body]
  \`(loop* ~bindings ~@body))

;; Host shims, for autocomplete only
(def all)
(def async)
(def catch*)
(def then)

(defmacro defn [name & fdecl]
  (let [doc       (if (string? (first fdecl)) (first fdecl) nil)
        rest-decl (if doc (rest fdecl) fdecl)
        arglists  (if (vector? (first rest-decl))
                    (vector (first rest-decl))
                    (reduce (fn [acc arity] (conj acc (first arity))) [] rest-decl))
        meta-map  (let [m (if doc {:doc doc :arglists arglists} {:arglists arglists})]
                    (if (:private (meta name)) (assoc m :private true) m))]
    \`(def ~(with-meta name meta-map) (fn ~@rest-decl))))

(defmacro defn-
  "Same as defn, but marks the var as private."
  [name & fdecl]
  (list* 'defn (with-meta name (assoc (meta name) :private true)) fdecl))

;; defmulti / defmethod: multimethod sugar over native make-multimethod! / add-method!
;; defmulti uses a re-eval guard in make-multimethod! — re-loading a namespace
;; preserves all registered methods.
(defmacro defmulti [name dispatch-fn]
  \`(make-multimethod! ~(str name) ~dispatch-fn))

(defmacro defmethod [mm-name dispatch-val & fn-tail]
  \`(add-method! (var ~mm-name) ~dispatch-val (fn ~@fn-tail)))

;; delay: wraps body in a zero-arg fn and defers evaluation until forced.
;; make-delay is a native primitive that creates the CljDelay value.
(defmacro delay [& body]
  \`(make-delay (fn* [] ~@body)))


(defn vary-meta
  "Returns an object of the same type and value as obj, with
  (apply f (meta obj) args) as its metadata."
  [obj f & args]
  (with-meta obj (apply f (meta obj) args)))

(defn next
  "Returns a seq of the items after the first. Calls seq on its
  argument.  If there are no more items, returns nil."
  [coll]
  (seq (rest coll)))

(defn not
  "Returns true if x is logical false, false otherwise."
  [x] (if x false true))

(defn second
  "Same as (first (next x))"
  [coll]
  (first (next coll)))


(defmacro when
  "Executes body when condition is true, otherwise returns nil."
  [condition & body]
  \`(if ~condition (do ~@body) nil))

(defmacro when-not
  "Executes body when condition is false, otherwise returns nil."
  [condition & body]
  \`(if ~condition nil (do ~@body)))

(defmacro if-let
  ([bindings then] \`(if-let ~bindings ~then nil))
  ([bindings then else]
   (let [form (first bindings)
         tst  (second bindings)]
     \`(let [~form ~tst]
        (if ~form ~then ~else)))))

(defmacro when-let [bindings & body]
  (let [form (first bindings)
        tst  (second bindings)]
    \`(let [~form ~tst]
       (when ~form ~@body))))

(defmacro and [& forms]
  (if (nil? forms)
    true
    (if (nil? (seq (rest forms)))
      (first forms)
      \`(let [v# ~(first forms)]
         (if v# (and ~@(rest forms)) v#)))))

(defmacro or [& forms]
  (if (nil? forms)
    nil
    (if (nil? (seq (rest forms)))
      (first forms)
      \`(let [v# ~(first forms)]
         (if v# v# (or ~@(rest forms)))))))

(defmacro cond [& clauses]
  (if (nil? clauses)
    nil
    \`(if ~(first clauses)
       ~(first (next clauses))
       (cond ~@(rest (rest clauses))))))

(defmacro -> [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     \`(~(first form) ~x ~@(rest form))
                     \`(~form ~x))]
      \`(-> ~threaded ~@more))))

(defmacro ->> [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     \`(~(first form) ~@(rest form) ~x)
                     \`(~form ~x))]
      \`(->> ~threaded ~@more))))

(defmacro comment
  "Ignores body, yields nil"
  [& body])

(defmacro as->
  [expr name & forms]
  \`(let [~name ~expr
         ~@(reduce (fn [acc form] (conj acc name form)) [] forms)]
     ~name))

(defmacro cond->
  [expr & clauses]
  (let [g (gensym "cv")
        steps (reduce
               (fn [acc pair]
                 (let [test (first pair)
                       form (second pair)
                       threaded (if (list? form)
                                  \`(~(first form) ~g ~@(rest form))
                                  \`(~form ~g))]
                   (conj acc \`(if ~test ~threaded ~g))))
               []
               (partition-all 2 clauses))]
    \`(let [~g ~expr
           ~@(reduce (fn [acc step] (conj acc g step)) [] steps)]
       ~g)))

(defmacro cond->>
  [expr & clauses]
  (let [g (gensym "cv")
        steps (reduce
               (fn [acc pair]
                 (let [test (first pair)
                       form (second pair)
                       threaded (if (list? form)
                                  \`(~(first form) ~@(rest form) ~g)
                                  \`(~form ~g))]
                   (conj acc \`(if ~test ~threaded ~g))))
               []
               (partition-all 2 clauses))]
    \`(let [~g ~expr
           ~@(reduce (fn [acc step] (conj acc g step)) [] steps)]
       ~g)))

(defmacro some->
  [expr & forms]
  (if (nil? forms)
    expr
    \`(let [v# ~expr]
       (if (nil? v#)
         nil
         (some-> (-> v# ~(first forms)) ~@(rest forms))))))

(defmacro some->>
  [expr & forms]
  (if (nil? forms)
    expr
    \`(let [v# ~expr]
       (if (nil? v#)
         nil
         (some->> (->> v# ~(first forms)) ~@(rest forms))))))

(defn constantly
  "Returns a function that takes any number of arguments and returns x."
  [x] (fn [& _] x))

(defn some?
  "Returns true if x is not nil, false otherwise"
  [x] (not (nil? x)))

(defn any?
  "Returns true for any given argument"
  [_x] true)

(defn complement
  "Takes a fn f and returns a fn that takes the same arguments as f,
  has the same effects, if any, and returns the opposite truth value."
  [f]
  (fn
    ([] (not (f)))
    ([x] (not (f x)))
    ([x y] (not (f x y)))
    ([x y & zs] (not (apply f x y zs)))))

(defn juxt
  "Takes a set of functions and returns a fn that is the juxtaposition
  of those fns. The returned fn takes a variable number of args and
  returns a vector containing the result of applying each fn to the args."
  [& fns]
  (fn [& args]
    (reduce (fn [acc f] (conj acc (apply f args))) [] fns)))

(defn merge
  "Returns a map that consists of the rest of the maps conj-ed onto
  the first. If a key occurs in more than one map, the mapping from
  the latter (left-to-right) will be the mapping in the result."
  [& maps]
  (if (nil? maps)
    nil
    (reduce
     (fn [acc m]
       (if (nil? m)
         acc
         (if (nil? acc)
           m
           (reduce
            (fn [macc entry]
              (assoc macc (first entry) (second entry)))
            acc
            m))))
     nil
     maps)))

(defn select-keys
  "Returns a map containing only those entries in map whose key is in keys."
  [m keys]
  (if (or (nil? m) (nil? keys))
    {}
    (let [missing (gensym)]
      (reduce
       (fn [acc k]
         (let [v (get m k missing)]
           (if (= v missing)
             acc
             (assoc acc k v))))
       {}
       keys))))

(defn update
  "Updates a value in an associative structure where k is a key and f is a
  function that will take the old value and any supplied args and return the
  new value, and returns a new structure."
  [m k f & args]
  (let [target (if (nil? m) {} m)]
    (assoc target k (if (nil? args)
                      (f (get target k))
                      (apply f (get target k) args)))))

(defn get-in
  "Returns the value in a nested associative structure, where ks is a
  sequence of keys. Returns nil if the key is not present, or the not-found
  value if supplied."
  ([m ks]
   (reduce get m ks))
  ([m ks not-found]
   (loop [m m, ks (seq ks)]
     (if (nil? ks)
       m
       (if (contains? m (first ks))
         (recur (get m (first ks)) (next ks))
         not-found)))))

(defn assoc-in
  "Associates a value in a nested associative structure, where ks is a
  sequence of keys and v is the new value. Returns a new nested structure."
  [m ks v]
  (let [k    (first ks)
        more (next ks)]
    (if more
      (assoc m k (assoc-in (get m k) more v))
      (assoc m k v))))

(defn update-in
  "Updates a value in a nested associative structure, where ks is a
  sequence of keys and f is a function that will take the old value and any
  supplied args and return the new value. Returns a new nested structure."
  [m ks f & args]
  (assoc-in m ks (apply f (get-in m ks) args)))

(defn fnil
  "Takes a function f, and returns a function that calls f, replacing
  a nil first argument with x, optionally nil second with y, nil third with z."
  ([f x]
   (fn [a & more]
     (apply f (if (nil? a) x a) more)))
  ([f x y]
   (fn [a b & more]
     (apply f (if (nil? a) x a) (if (nil? b) y b) more)))
  ([f x y z]
   (fn [a b c & more]
     (apply f (if (nil? a) x a) (if (nil? b) y b) (if (nil? c) z c) more))))

(defn frequencies
  "Returns a map from distinct items in coll to the number of times they appear."
  [coll]
  (if (nil? coll)
    {}
    (reduce
     (fn [counts item]
       (assoc counts item (inc (get counts item 0))))
     {}
     coll)))

(defn group-by
  "Returns a map of the elements of coll keyed by the result of f on each
  element. The value at each key is a vector of matching elements."
  [f coll]
  (if (nil? coll)
    {}
    (reduce
     (fn [acc item]
       (let [k (f item)]
         (assoc acc k (conj (get acc k []) item))))
     {}
     coll)))

(defn distinct
  "Returns a vector of the elements of coll with duplicates removed,
  preserving first-seen order."
  [coll]
  (if (nil? coll)
    []
    (get
     (reduce
      (fn [state item]
        (let [seen (get state 0)
              out  (get state 1)]
          (if (get seen item false)
            state
            [(assoc seen item true) (conj out item)])))
      [{} []]
      coll)
     1)))

(defn flatten-step
  "Internal helper for flatten."
  [v]
  (if (or (list? v) (vector? v))
    (reduce
     (fn [acc item]
       (into acc (flatten-step item)))
     []
     v)
    [v]))

(defn flatten
  "Takes any nested combination of sequential things (lists/vectors) and
  returns their contents as a single flat vector."
  [x]
  (if (nil? x)
    []
    (flatten-step x)))

(defn reduce-kv
  "Reduces an associative structure. f should be a function of 3
  arguments: accumulator, key/index, value."
  [f init coll]
  (cond
    (map? coll)
    (reduce
     (fn [acc entry]
       (f acc (first entry) (second entry)))
     init
     coll)

    (vector? coll)
    (loop [idx 0
           acc init]
      (if (< idx (count coll))
        (recur (inc idx) (f acc idx (nth coll idx)))
        acc))

    :else
    (throw
     (ex-info
      "reduce-kv expects a map or vector"
      {:coll coll}))))

(defn sort-compare
  "Internal helper: normalizes comparator results."
  [cmp a b]
  (let [r (cmp a b)]
    (if (number? r)
      (< r 0)
      r)))

(defn insert-sorted
  "Internal helper for insertion-sort based sort implementation."
  [cmp x sorted]
  (loop [left  []
         right sorted]
    (if (nil? (seq right))
      (conj left x)
      (let [y (first right)]
        (if (sort-compare cmp x y)
          (into (conj left x) right)
          (recur (conj left y) (rest right)))))))

(defn sort
  "Returns the items in coll in sorted order. With no comparator, sorts
  ascending using <. Comparator may return boolean or number."
  ([coll] (sort < coll))
  ([cmp coll]
   (if (nil? coll)
     []
     (reduce
      (fn [acc item]
        (insert-sorted cmp item acc))
      []
      coll))))

(defn sort-by
  "Returns a sorted sequence of items in coll, where the sort order is
  determined by comparing (keyfn item)."
  ([keyfn coll] (sort-by keyfn < coll))
  ([keyfn cmp coll]
   (sort
    (fn [a b]
      (cmp (keyfn a) (keyfn b)))
    coll)))

(def not-any? (comp not some))

(defn not-every?
  "Returns false if (pred x) is logical true for every x in
  coll, else true."
  [pred coll] (not (every? pred coll)))

;; ── Transducer protocol ──────────────────────────────────────────────────────

;; into: 2-arity uses reduce+conj; 3-arity uses transduce
(defn into
  "Returns a new coll consisting of to-coll with all of the items of
   from-coll conjoined. A transducer may be supplied."
  ([to from] (reduce conj to from))
  ([to xf from] (transduce xf conj to from)))

;; sequence: materialise a transducer over a collection into a seq (list)
(defn sequence
  "Coerces coll to a (possibly empty) sequence, if it is not already
  one. Will not force a seq. (sequence nil) yields (), When a
  transducer is supplied, returns a lazy sequence of applications of
  the transform to the items in coll"
  ([coll] (apply list (into [] coll)))
  ([xf coll] (apply list (into [] xf coll))))

(defn completing
  "Takes a reducing function f of 2 args and returns a fn suitable for
  transduce by adding an arity-1 signature that calls cf (default -
  identity) on the result argument."
  ([f] (completing f identity))
  ([f cf]
   (fn
     ([] (f))
     ([x] (cf x))
     ([x y] (f x y)))))

;; map: 1-arg returns transducer; 2-arg is eager; 3+-arg zips collections
(defn map
  "Returns a sequence consisting of the result of applying f to the set
  of first items of each coll, followed by applying f to the set of
  second items in each coll, until any one of the colls is exhausted.
  Any remaining items in other colls are ignored. Returns a transducer
  when no collection is provided."
  ([f]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input] (rf result (f input))))))
  ([f coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (cons (f (first s)) (map f (rest s))))))
  ([f c1 c2]
   (loop [s1 (seq c1)
          s2 (seq c2)
          acc []]
     (if (or (nil? s1) (nil? s2))
       acc
       (recur
        (next s1)
        (next s2)
        (conj acc (f (first s1) (first s2)))))))
  ([f c1 c2 & colls]
   (loop [seqs (map seq (cons c1 (cons c2 colls)))
          acc []]
     (if (some nil? seqs)
       acc
       (recur (map next seqs) (conj acc (apply f (map first seqs))))))))

;; filter: 1-arg returns transducer; 2-arg is eager
(defn filter
  "Returns a sequence of the items in coll for which
  (pred item) returns logical true. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input]
        (if (pred input)
          (rf result input)
          result)))))
  ([pred coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (if (pred (first s))
         (cons (first s) (filter pred (rest s)))
         (filter pred (rest s)))))))

(defn remove
  "Returns a lazy sequence of the items in coll for which
  (pred item) returns logical false. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred] (filter (complement pred)))
  ([pred coll]
   (filter (complement pred) coll)))



;; take: stateful transducer; signals early termination after n items
;; r > 0 → keep going; r = 0 → take last item and stop; r < 0 → already past limit, stop
(defn take
  "Returns a sequence of the first n items in coll, or all items if
  there are fewer than n.  Returns a stateful transducer when
  no collection is provided."
  ([n]
   (fn [rf]
     (let [remaining (volatile! n)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [n @remaining
                nrem (vswap! remaining dec)
                result (if (pos? n)
                         (rf result input)
                         result)]
            (if (not (pos? nrem))
              (ensure-reduced result)
              result)))))))
  ([n coll]
   (lazy-seq
     (when (pos? n)
       (when-let [s (seq coll)]
         (cons (first s) (take (dec n) (rest s))))))))

;; take-while: stateless transducer; emits reduced when pred fails
(defn take-while
  "Returns a sequence of successive items from coll while
  (pred item) returns logical true. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input]
        (if (pred input)
          (rf result input)
          (reduced result))))))
  ([pred coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (when (pred (first s))
         (cons (first s) (take-while pred (rest s))))))))

;; drop: stateful transducer; skips first n items
;; r >= 0 → still skipping; r < 0 → past the drop zone, start taking
(defn drop
  "Returns a sequence of all but the first n items in coll.
   Returns a stateful transducer when no collection is provided."
  ([n]
   (fn [rf]
     (let [remaining (volatile! n)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [rem @remaining]
            (vswap! remaining dec)
            (if (pos? rem)
              result
              (rf result input))))))))
  ([n coll]
   (if (pos? n)
     (lazy-seq (drop (dec n) (rest coll)))
     (lazy-seq (seq coll)))))

(defn drop-last
  "Return a sequence of all but the last n (default 1) items in coll"
  ([coll] (drop-last 1 coll))
  ([n coll] (map (fn [x _] x) coll (drop n coll))))

(defn take-last
  "Returns a sequence of the last n items in coll.  Depending on the type
  of coll may be no better than linear time.  For vectors, see also subvec."
  [n coll]
  (loop [s (seq coll), lead (seq (drop n coll))]
    (if lead
      (recur (next s) (next lead))
      s)))

;; drop-while: stateful transducer; passes through once pred fails
(defn drop-while
  "Returns a sequence of the items in coll starting from the
  first item for which (pred item) returns logical false.  Returns a
  stateful transducer when no collection is provided."
  ([pred]
   (fn [rf]
     (let [dropping (volatile! true)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (if (and @dropping (pred input))
            result
            (do
              (vreset! dropping false)
              (rf result input))))))))
  ([pred coll]
   (lazy-seq
     (let [s (seq coll)]
       (if (and s (pred (first s)))
         (drop-while pred (rest s))
         s)))))

;; letfn: expands to letfn* (the primitive), which takes a flat vector of
;; [name fn-form name fn-form ...] pairs and evaluates each fn-form in a
;; shared env frame so all fns can see each other (mutual recursion).
(defmacro letfn [fnspecs & body]
  (cons 'letfn*
        (cons (reduce (fn* [acc spec]
                        (conj (conj acc (first spec))
                              (cons 'fn* (rest spec))))
                      []
                      fnspecs)
              body)))

;; map-indexed: stateful transducer; passes index and item to f
(defn map-indexed
  "Returns a sequence consisting of the result of applying f to 0
   and the first item of coll, followed by applying f to 1 and the second
   item in coll, etc, until coll is exhausted. Thus function f should
   accept 2 arguments, index and item. Returns a stateful transducer when
   no collection is provided."
  ([f]
   (fn [rf]
     (let [i (volatile! -1)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (rf result (f (vswap! i inc) input)))))))
  ([f coll]
   (letfn [(step [i s]
             (lazy-seq
               (when-let [xs (seq s)]
                 (cons (f i (first xs)) (step (inc i) (rest xs))))))]
     (step 0 coll))))

;; dedupe: stateful transducer; removes consecutive duplicates
(defn dedupe
  "Returns a sequence removing consecutive duplicates in coll.
   Returns a transducer when no collection is provided."
  ([]
   (fn [rf]
     (let [pv (volatile! ::none)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [prior @pv]
            (vreset! pv input)
            (if (= prior input)
              result
              (rf result input))))))))
  ([coll]
   (sequence (dedupe) coll)))

;; partition-all: stateful transducer; groups items into vectors of size n
(defn partition-all
  "Returns a sequence of lists like partition, but may include
   partitions with fewer than n items at the end.  Returns a stateful
   transducer when no collection is provided."
  ([n]
   (fn [rf]
     (let [buf (volatile! [])]
       (fn
         ([] (rf))
         ([result]
          (let [b @buf]
            (vreset! buf [])
            (if (empty? b)
              (rf result)
              (rf (unreduced (rf result b))))))
         ([result input]
          (let [nb (conj @buf input)]
            (if (= (count nb) n)
              (do
                (vreset! buf [])
                (rf result nb))
              (do
                (vreset! buf nb)
                result))))))))
  ([n coll]
   (sequence (partition-all n) coll)))

;; ── Documentation ────────────────────────────────────────────────────────────

(defmacro doc [sym]
  \`(let [v#        (var ~sym)
         m#        (meta v#)
         d#        (:doc m#)
         args#     (:arglists m#)
         args-str# (when args#
                     (str "("
                          (reduce
                           (fn [acc# a#]
                             (if (= acc# "")
                               (str a#)
                               (str acc# " \\n " a#)))
                           ""
                           args#)
                          ")"))]
     (println (str "-------------------------\\n"
                   ~(str sym) "\\n"
                   (if args-str# (str args-str# "\\n") "")
                   "  " (or d# "No documentation available.")))))

(defn make-err
  "Creates an error map with type, message, data and optionally cause"
  ([type message] (make-err type message nil nil))
  ([type message data] (make-err type message data nil))
  ([type message data cause] {:type type :message message :data data :cause cause}))

;; ── Sequence utilities ──────────────────────────────────────────────────────

(defn butlast
  "Return a seq of all but the last item in coll, in linear time"
  [coll]
  (loop [ret [] s (seq coll)]
    (if (next s)
      (recur (conj ret (first s)) (next s))
      (seq ret))))

(defn fnext
  "Same as (first (next x))"
  [x] (first (next x)))

(defn nfirst
  "Same as (next (first x))"
  [x] (next (first x)))

(defn nnext
  "Same as (next (next x))"
  [x] (next (next x)))

(defn nthrest
  "Returns the nth rest of coll, coll when n is 0."
  [coll n]
  (loop [n n xs coll]
    (if (and (pos? n) (seq xs))
      (recur (dec n) (rest xs))
      xs)))

(defn nthnext
  "Returns the nth next of coll, (seq coll) when n is 0."
  [coll n]
  (loop [n n xs (seq coll)]
    (if (and (pos? n) xs)
      (recur (dec n) (next xs))
      xs)))

(defn list*
  "Creates a new seq containing the items prepended to the rest, the
  last of which will be treated as a sequence."
  ([args] (seq args))
  ([a args] (cons a args))
  ([a b args] (cons a (cons b args)))
  ([a b c args] (cons a (cons b (cons c args))))
  ([a b c d & more]
   (cons a (cons b (cons c (apply list* d more))))))

(defn mapv
  "Returns a vector consisting of the result of applying f to the
  set of first items of each coll, followed by applying f to the set
  of second items in each coll, until any one of the colls is exhausted."
  ([f coll] (into [] (map f) coll))
  ([f c1 c2] (into [] (map f c1 c2)))
  ([f c1 c2 c3] (into [] (map f c1 c2 c3)))
  ([f c1 c2 c3 & colls] (into [] (apply map f c1 c2 c3 colls))))

(defn filterv
  "Returns a vector of the items in coll for which
  (pred item) returns logical true."
  [pred coll]
  (into [] (filter pred) coll))

(defn run!
  "Runs the supplied procedure (via reduce), for purposes of side
  effects, on successive items in the collection. Returns nil."
  [proc coll]
  (reduce (fn [_ x] (proc x) nil) nil coll))

(defn keep
  "Returns a sequence of the non-nil results of (f item). Note,
  this means false return values will be included.  f must be free of
  side-effects.  Returns a transducer when no collection is provided."
  ([f]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input]
        (let [v (f input)]
          (if (nil? v)
            result
            (rf result v)))))))
  ([f coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (let [v (f (first s))]
         (if (nil? v)
           (keep f (rest s))
           (cons v (keep f (rest s)))))))))

(defn keep-indexed
  "Returns a sequence of the non-nil results of (f index item). Note,
  this means false return values will be included.  f must be free of
  side-effects.  Returns a stateful transducer when no collection is provided."
  ([f]
   (fn [rf]
     (let [i (volatile! -1)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [v (f (vswap! i inc) input)]
            (if (nil? v)
              result
              (rf result v))))))))
  ([f coll]
   (letfn [(step [i s]
             (lazy-seq
               (when-let [xs (seq s)]
                 (let [v (f i (first xs))]
                   (if (nil? v)
                     (step (inc i) (rest xs))
                     (cons v (step (inc i) (rest xs))))))))]
     (step 0 coll))))

(defn mapcat
  "Returns the result of applying concat to the result of applying map
  to f and colls.  Thus function f should return a collection. Returns
  a transducer when no collections are provided."
  ([f]
   (fn [rf]
     (let [inner ((map f) (fn
                            ([] (rf))
                            ([result] (rf result))
                            ([result input]
                             (reduce rf result input))))]
       inner)))
  ([f coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (concat (f (first s)) (mapcat f (rest s))))))
  ([f coll & more]
   (apply concat (apply map f coll more))))

(defn interleave
  "Returns a lazy sequence of the first item in each coll, then the second etc.
  Stops as soon as any coll is exhausted."
  ([c1 c2]
   (lazy-seq
     (let [s1 (seq c1) s2 (seq c2)]
       (when (and s1 s2)
         (cons (first s1) (cons (first s2) (interleave (rest s1) (rest s2))))))))
  ([c1 c2 & colls]
   (lazy-seq
     (let [seqs (map seq (cons c1 (cons c2 colls)))]
       (when (every? some? seqs)
         (concat (map first seqs) (apply interleave (map rest seqs))))))))

(defn interpose
  "Returns a sequence of the elements of coll separated by sep.
  Returns a transducer when no collection is provided."
  ([sep]
   (fn [rf]
     (let [started (volatile! false)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (if @started
            (let [sepr (rf result sep)]
              (if (reduced? sepr)
                sepr
                (rf sepr input)))
            (do
              (vreset! started true)
              (rf result input))))))))
  ([sep coll]
   (drop 1 (interleave (repeat sep) coll))))

;; ── Lazy concat (shadows native eager concat) ──────────────────────────────
(defn concat
  "Returns a lazy seq representing the concatenation of the elements in the
  supplied colls."
  ([] nil)
  ([x] (lazy-seq (seq x)))
  ([x y]
   (lazy-seq
     (let [s (seq x)]
       (if s
         (cons (first s) (concat (rest s) y))
         (seq y)))))
  ([x y & zs]
   (let [cat (fn cat [xy zs]
               (lazy-seq
                 (let [xys (seq xy)]
                   (if xys
                     (cons (first xys) (cat (rest xys) zs))
                     (when (seq zs)
                       (cat (first zs) (next zs)))))))]
     (cat (concat x y) zs))))

(defn iterate
  "Returns a lazy sequence of x, (f x), (f (f x)) etc.
  With 3 args, returns a finite sequence of n items (backwards compat)."
  ([f x]
   (lazy-seq (cons x (iterate f (f x)))))
  ([f x n]
   (loop [i 0 v x acc []]
     (if (< i n)
       (recur (inc i) (f v) (conj acc v))
       acc))))

(defn repeatedly
  "Takes a function of no args, presumably with side effects, and
  returns a lazy infinite sequence of calls to it.
  With 2 args (n f), returns a finite sequence of n calls."
  ([f] (lazy-seq (cons (f) (repeatedly f))))
  ([n f]
   (loop [i 0 acc []]
     (if (< i n)
       (recur (inc i) (conj acc (f)))
       acc))))

(defn cycle
  "Returns a lazy infinite sequence of repetitions of the items in coll.
  With 2 args (n coll), returns a finite sequence (backwards compat)."
  ([coll]
   (lazy-seq
     (when (seq coll)
       (concat coll (cycle coll)))))
  ([n coll]
   (let [s (into [] coll)]
     (loop [i 0 acc []]
       (if (< i n)
         (recur (inc i) (into acc s))
         acc)))))

(defn repeat
  "Returns a lazy infinite sequence of xs.
  With 2 args (n x), returns a finite sequence of n copies."
  ([x] (lazy-seq (cons x (repeat x))))
  ([n x] (repeat* n x)))

(defn range
  "Returns a lazy infinite sequence of integers from 0.
  With args, returns a finite sequence (delegates to native range*)."
  ([] (iterate inc 0))
  ([end] (range* end))
  ([start end] (range* start end))
  ([start end step] (range* start end step)))

(defn newline
  "Writes a newline to *out*."
  [] (println ""))

(defn dorun
  "Forces realization of a (possibly lazy) sequence. Walks the sequence
  without retaining the head. Returns nil."
  [coll]
  (when (seq coll)
    (recur (rest coll))))

(defn doall
  "Forces realization of a (possibly lazy) sequence. Unlike dorun,
  retains the head and returns the seq."
  [coll]
  (dorun coll)
  coll)

(defn take-nth
  "Returns a sequence of every nth item in coll.  Returns a stateful
  transducer when no collection is provided."
  ([n]
   (fn [rf]
     (let [i (volatile! -1)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [idx (vswap! i inc)]
            (if (zero? (mod idx n))
              (rf result input)
              result)))))))
  ([n coll]
   (sequence (take-nth n) coll)))

(defn partition
  "Returns a sequence of lists of n items each, at offsets step
  apart. If step is not supplied, defaults to n, i.e. the partitions
  do not overlap. If a pad collection is supplied, use its elements as
  necessary to complete last partition up to n items. In case there are
  not enough padding elements, return a partition with less than n items."
  ([n coll] (partition n n coll))
  ([n step coll]
   (loop [s (seq coll) acc []]
     (if (nil? s)
       acc
       (let [p (into [] (take n) s)]
         (if (< (count p) n)
           acc
           (recur (seq (drop step s)) (conj acc p)))))))
  ([n step pad coll]
   (loop [s (seq coll) acc []]
     (if (nil? s)
       acc
       (let [p (into [] (take n) s)]
         (if (< (count p) n)
           (conj acc (into [] (take n) (concat p pad)))
           (recur (seq (drop step s)) (conj acc p))))))))

(defn partition-by
  "Applies f to each value in coll, splitting it each time f returns a
  new value.  Returns a sequence of partitions.  Returns a stateful
  transducer when no collection is provided."
  ([f]
   (fn [rf]
     (let [pv (volatile! ::none)
           buf (volatile! [])]
       (fn
         ([] (rf))
         ([result]
          (let [b @buf]
            (vreset! buf [])
            (if (empty? b)
              (rf result)
              (rf (unreduced (rf result b))))))
         ([result input]
          (let [v (f input)
                p @pv]
            (vreset! pv v)
            (if (or (= p ::none) (= v p))
              (do (vswap! buf conj input) result)
              (let [b @buf]
                (vreset! buf [input])
                (rf result b)))))))))
  ([f coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (let [fv        (f (first s))
             run       (into [] (cons (first s) (take-while #(= (f %) fv) (next s))))
             remaining (drop-while #(= (f %) fv) (next s))]
         (cons run (partition-by f remaining)))))))

(defn reductions
  "Returns a sequence of the intermediate values of the reduction (as
  by reduce) of coll by f, starting with init."
  ([f coll]
   (if (empty? coll)
     (list (f))
     (reductions f (first coll) (rest coll))))
  ([f init coll]
   (loop [acc [init] val init s (seq coll)]
     (if (nil? s)
       acc
       (let [nval (f val (first s))]
         (if (reduced? nval)
           (conj acc (unreduced nval))
           (recur (conj acc nval) nval (next s))))))))

(defn split-at
  "Returns a vector of [(take n coll) (drop n coll)]"
  [n coll]
  [(into [] (take n) coll) (into [] (drop n) coll)])

(defn split-with
  "Returns a vector of [(take-while pred coll) (drop-while pred coll)]"
  [pred coll]
  [(into [] (take-while pred) coll) (into [] (drop-while pred) coll)])

(defn merge-with
  "Returns a map that consists of the rest of the maps conj-ed onto
  the first.  If a key occurs in more than one map, the mapping(s)
  from the latter (left-to-right) will be combined with the mapping in
  the result by calling (f val-in-result val-in-latter)."
  [f & maps]
  (reduce
   (fn [acc m]
     (if (nil? m)
       acc
       (reduce
        (fn [macc entry]
          (let [k (first entry)
                v (second entry)]
            (if (contains? macc k)
              (assoc macc k (f (get macc k) v))
              (assoc macc k v))))
        (or acc {})
        m)))
   nil
   maps))

(defn update-keys
  "m f => apply f to each key in m"
  [m f]
  (reduce
   (fn [acc entry]
     (assoc acc (f (first entry)) (second entry)))
   {}
   m))

(defn update-vals
  "m f => apply f to each val in m"
  [m f]
  (reduce
   (fn [acc entry]
     (assoc acc (first entry) (f (second entry))))
   {}
   m))

(defn not-empty
  "If coll is empty, returns nil, else coll"
  [coll]
  (when (seq coll) coll))

(defn memoize
  "Returns a memoized version of a referentially transparent function. The
  memoized version of the function keeps a cache of the mapping from arguments
  to results and, when calls with the same arguments are repeated often, has
  higher performance at the expense of higher memory use."
  [f]
  (let [mem (atom {})]
    (fn [& args]
      (let [cached (get @mem args ::not-found)]
        (if (= cached ::not-found)
          (let [ret (apply f args)]
            (swap! mem assoc args ret)
            ret)
          cached)))))

(defn trampoline
  "trampoline can be used to convert algorithms requiring mutual
  recursion without stack consumption. Calls f with supplied args, if
  any. If f returns a fn, calls that fn with no arguments, and
  continues to repeat, until the return value is not a fn, then
  returns that non-fn value."
  ([f]
   (loop [ret (f)]
     (if (fn? ret)
       (recur (ret))
       ret)))
  ([f & args]
   (loop [ret (apply f args)]
     (if (fn? ret)
       (recur (ret))
       ret))))

(defmacro with-redefs
  "binding => var-symbol temp-value-expr
  Temporarily redefines Vars while executing the body. The
  temp-value-exprs will be evaluated and each resulting value will
  replace in parallel the root value of its Var. Always restores
  the original values, even if body throws."
  [bindings & body]
  (let [pairs     (partition 2 bindings)
        names     (mapv first pairs)
        new-vals  (mapv second pairs)
        orig-syms (mapv (fn [_] (gensym "orig")) names)]
    \`(let [~@(interleave orig-syms (map (fn [n] \`(var-get (var ~n))) names))]
       (try
         (do ~@(map (fn [n v] \`(alter-var-root (var ~n) (constantly ~v))) names new-vals)
             ~@body)
         (finally
           ~@(map (fn [n o] \`(alter-var-root (var ~n) (constantly ~o))) names orig-syms))))))

;; ── Macros: conditionals and control flow ───────────────────────────────────

(defmacro if-some
  "bindings => binding-form test
  If test is not nil, evaluates then with binding-form bound to the
  value of test, if not, yields else"
  ([bindings then] \`(if-some ~bindings ~then nil))
  ([bindings then else]
   (let [form (first bindings)
         tst  (second bindings)]
     \`(let [temp# ~tst]
        (if (nil? temp#)
          ~else
          (let [~form temp#]
            ~then))))))

(defmacro when-some
  "bindings => binding-form test
  When test is not nil, evaluates body with binding-form bound to the
  value of test"
  [bindings & body]
  (let [form (first bindings)
        tst  (second bindings)]
    \`(let [temp# ~tst]
       (when (some? temp#)
         (let [~form temp#]
           ~@body)))))

(defmacro when-first
  "bindings => x xs
  Roughly the same as (when (seq xs) (let [x (first xs)] body)) but xs is evaluated only once"
  [bindings & body]
  (let [x  (first bindings)
        xs (second bindings)]
    \`(let [temp# (seq ~xs)]
       (when temp#
         (let [~x (first temp#)]
           ~@body)))))

(defn condp-emit [gpred gexpr clauses]
  (if (nil? clauses)
    \`(throw (ex-info (str "No matching clause: " ~gexpr) {}))
    (if (nil? (next clauses))
      (first clauses)
      \`(if (~gpred ~(first clauses) ~gexpr)
         ~(second clauses)
         ~(condp-emit gpred gexpr (next (next clauses)))))))

(defmacro condp
  "Takes a binary predicate, an expression, and a set of clauses.
  Each clause can take the form of either:
    test-expr result-expr
  The predicate is applied to each test-expr and the expression in turn."
  [pred expr & clauses]
  (let [gpred (gensym "pred__")
        gexpr (gensym "expr__")]
    \`(let [~gpred ~pred
           ~gexpr ~expr]
       ~(condp-emit gpred gexpr clauses))))

(defn case-emit [ge clauses]
  (if (nil? clauses)
    \`(throw (ex-info (str "No matching clause: " ~ge) {}))
    (if (nil? (next clauses))
      (first clauses)
      \`(if (= ~ge ~(first clauses))
         ~(second clauses)
         ~(case-emit ge (next (next clauses)))))))

(defmacro case
  "Takes an expression, and a set of clauses. Each clause can take the form of
  either:
    test-constant result-expr
  If no clause matches, and there is an odd number of forms (a default), the
  last expression is returned."
  [e & clauses]
  (let [ge (gensym "case__")]
    \`(let [~ge ~e]
       ~(case-emit ge clauses))))

(defmacro dotimes
  "bindings => name n
  Repeatedly executes body (presumably for side-effects) with name
  bound to integers from 0 through n-1."
  [bindings & body]
  (let [i (first bindings)
        n (second bindings)]
    \`(let [n# ~n]
       (loop [~i 0]
         (when (< ~i n#)
           ~@body
           (recur (inc ~i)))))))

(defmacro while
  "Repeatedly executes body while test expression is true. Presumes
  some side-effect will cause test to become false/nil."
  [test & body]
  \`(loop []
     (when ~test
       ~@body
       (recur))))

(defmacro doseq
  "Repeatedly executes body (presumably for side-effects) with
  bindings. Supports :let, :when, and :while modifiers."
  [seq-exprs & body]
  (let [bindings (partition 2 seq-exprs)
        first-binding (first bindings)
        rest-bindings (next bindings)]
    (if (nil? first-binding)
      \`(do ~@body nil)
      (let [k (first first-binding)
            v (second first-binding)]
        (cond
          (= k :let)
          \`(let ~v (doseq ~(apply concat rest-bindings) ~@body))

          (= k :when)
          \`(when ~v (doseq ~(apply concat rest-bindings) ~@body))

          (= k :while)
          \`(if ~v (doseq ~(apply concat rest-bindings) ~@body) nil)

          :else
          (if rest-bindings
            \`(run! (fn [~k] (doseq ~(apply concat rest-bindings) ~@body)) ~v)
            \`(run! (fn [~k] ~@body) ~v)))))))

(defmacro for
  "List comprehension. Takes a vector of one or more
  binding-form/collection-expr pairs, each followed by zero or more
  modifiers, and yields a sequence of evaluations of expr.
  Supported modifiers: :let, :when, :while."
  [seq-exprs & body]
  (let [bindings (partition 2 seq-exprs)
        first-binding (first bindings)
        rest-bindings (next bindings)]
    (if (nil? first-binding)
      \`(list ~@body)
      (let [k (first first-binding)
            v (second first-binding)]
        (cond
          (= k :let)
          \`(let ~v (for ~(apply concat rest-bindings) ~@body))

          (= k :when)
          \`(if ~v (for ~(apply concat rest-bindings) ~@body) (list))

          (= k :while)
          \`(if ~v (for ~(apply concat rest-bindings) ~@body) (list))

          :else
          (if rest-bindings
            \`(mapcat (fn [~k] (for ~(apply concat rest-bindings) ~@body)) ~v)
            \`(map (fn [~k] ~@body) ~v)))))))

;; ── Destructure ──────────────────────────────────────────────────────────────
;; Mirrors Clojure's own destructure function. Takes a flat bindings vector
;; (as written in let/loop forms) and expands any destructuring patterns into
;; simple symbol bindings that let*/loop* can handle directly.
;;
;; Key adaptations from Clojure's source:
;;   - reduce1         → reduce
;;   - (new Exception) → ex-info
;;   - Java type hints → removed
;;   - PersistentArrayMap/createAsIfByAssoc → simplified (use map directly)
;;   - (instance? Named x) / (ident? x) → (or (keyword? x) (symbol? x))
;;   - (keyword nil name) → guarded to 1-arity (keyword name) when ns is nil
;;   - (key entry) / (val entry) → (first entry) / (second entry)
(defn destructure [bindings]
  (let* [bents (partition 2 bindings)
         pb    (fn pb [bvec b v]
                 (let* [;; ── vector pattern ───────────────────────────────────
                        pvec
                        (fn [bvec b val]
                          (let* [gvec     (gensym "vec__")
                                 gseq     (gensym "seq__")
                                 gfirst   (gensym "first__")
                                 has-rest (some #{'&} b)]
                            (loop* [ret        (let* [ret (conj bvec gvec val)]
                                                 (if has-rest
                                                   (conj ret gseq (list 'seq gvec))
                                                   ret))
                                    n          0
                                    bs         b
                                    seen-rest? false]
                              (if (seq bs)
                                (let* [firstb (first bs)]
                                  (cond
                                    (= firstb '&)
                                    (recur (pb ret (second bs) gseq)
                                           n
                                           (next (next bs))
                                           true)

                                    (= firstb :as)
                                    (pb ret (second bs) gvec)

                                    :else
                                    (if seen-rest?
                                      (throw (ex-info "Unsupported binding form, only :as can follow & parameter" {}))
                                      (recur (pb (if has-rest
                                                    (-> ret
                                                        (conj gfirst) (conj (list 'first gseq))
                                                        (conj gseq)   (conj (list 'next gseq)))
                                                    ret)
                                                  firstb
                                                  (if has-rest
                                                    gfirst
                                                    (list 'nth gvec n nil)))
                                             (inc n)
                                             (next bs)
                                             seen-rest?))))
                                ret))))

                        ;; ── map pattern ──────────────────────────────────────
                        pmap
                        (fn [bvec b v]
                          (let* [gmap     (gensym "map__")
                                 defaults (:or b)
                                 ;; Expand :keys/:strs/:syms shorthands into direct
                                 ;; {sym lookup-key} entries before the main loop.
                                 bes      (reduce
                                            (fn [acc mk]
                                              (let* [mkn  (name mk)
                                                     mkns (namespace mk)]
                                                (cond
                                                  (= mkn "keys")
                                                  (reduce
                                                    (fn [a sym]
                                                      (assoc (dissoc a mk)
                                                             sym
                                                             (let* [ns-part (or mkns (namespace sym))]
                                                               (if ns-part
                                                                 (keyword ns-part (name sym))
                                                                 (keyword (name sym))))))
                                                    acc (mk acc))

                                                  (= mkn "strs")
                                                  (reduce
                                                    (fn [a sym]
                                                      (assoc (dissoc a mk) sym (name sym)))
                                                    acc (mk acc))

                                                  (= mkn "syms")
                                                  (reduce
                                                    (fn [a sym]
                                                      (assoc (dissoc a mk) sym
                                                             (list 'quote (symbol (name sym)))))
                                                    acc (mk acc))

                                                  :else acc)))
                                            (dissoc b :as :or)
                                            (filter keyword? (keys (dissoc b :as :or))))]
                            ;; Coerce seq values (kwargs-style) to a map.
                            ;; When & is followed by a map pattern, the rest args
                            ;; arrive as a flat seq (:k1 v1 :k2 v2 ...) and must
                            ;; be turned into a map before we can do key lookups.
                            (loop* [ret     (-> bvec
                                               (conj gmap)
                                               (conj (list 'if (list 'map? v) v
                                                           (list 'if (list 'nil? v) (hash-map)
                                                                 (list 'apply 'hash-map v))))
                                               ((fn [r]
                                                  (if (:as b)
                                                    (conj r (:as b) gmap)
                                                    r))))
                                    entries (seq bes)]
                              (if entries
                                (let* [entry (first entries)
                                       bb    (first entry)
                                       bk    (second entry)
                                       local (if (or (keyword? bb) (symbol? bb))
                                               (symbol (name bb))
                                               bb)
                                       ;; Use (if (contains? ...) (get ...) default) so that
                                       ;; :or defaults are only evaluated when the key is absent.
                                       ;; Intentional divergence from JVM Clojure, which generates
                                       ;; (get m k default-expr) and evaluates the default eagerly.
                                       ;; See docs/core-language.md § "Intentional Divergences".
                                       bv    (if (and defaults (contains? defaults local))
                                               (list 'if (list 'contains? gmap bk)
                                                     (list 'get gmap bk)
                                                     (get defaults local))
                                               (list 'get gmap bk))]
                                  (recur (if (or (keyword? bb) (symbol? bb))
                                           (-> ret (conj local bv))
                                           (pb ret bb bv))
                                         (next entries)))
                                ret))))]
                   (cond
                     (symbol? b) (-> bvec (conj b) (conj v))
                     (vector? b) (pvec bvec b v)
                     (map? b)    (pmap bvec b v)
                     :else (throw (ex-info (str "Unsupported binding form: " b) {})))))
         process-entry (fn [bvec b] (pb bvec (first b) (second b)))]
    (if (every? symbol? (map first bents))
      bindings
      (reduce process-entry [] bents))))

(defn maybe-destructured
  [params body]
  (if (every? symbol? params)
    (cons params body)
    (loop* [params params
            new-params []
            lets []]
      (if params
        (if (symbol? (first params))
          (recur (next params) (conj new-params (first params)) lets)
          (let* [gparam (gensym "p__")]
            (recur (next params)
                   (conj new-params gparam)
                   (-> lets (conj (first params)) (conj gparam)))))
        (list (vec new-params)
              (cons 'let (cons (vec lets) body)))))))

(defmacro fn [& sigs]
  (let* [name    (if (symbol? (first sigs)) (first sigs) nil)
         sigs    (if name (next sigs) sigs)
         sigs    (if (vector? (first sigs)) (list sigs) sigs)
         psig    (fn* [sig]
                   (let* [params (first sig)
                          body   (rest sig)]
                     (maybe-destructured params body)))
         new-sigs (map psig sigs)]
    (if name
      (list* 'fn* name new-sigs)
      (cons 'fn* new-sigs))))

(defmacro let [bindings & body]
  (if (not (vector? bindings))
    (throw (ex-info "let requires a vector for its bindings" {}))
    (if (not (even? (count bindings)))
      (throw (ex-info "let requires an even number of forms in binding vector" {}))
      \`(let* ~(destructure bindings) ~@body))))

(defmacro loop [bindings & body]
  (if (not (vector? bindings))
    (throw (ex-info "loop requires a vector for its binding" {}))
    (if (not (even? (count bindings)))
      (throw (ex-info "loop requires an even number of forms in binding vector" {}))
      (let* [db (destructure bindings)]
        (if (= db bindings)
          \`(loop* ~bindings ~@body)
          (let* [vs  (take-nth 2 (drop 1 bindings))
                 bs  (take-nth 2 bindings)
                 gs  (map (fn* [b] (if (symbol? b) b (gensym))) bs)
                 bfs (reduce (fn* [ret bvg]
                               (let* [b (first bvg)
                                      v (second bvg)
                                      g (nth bvg 2)]
                                 (if (symbol? b)
                                   (conj ret g v)
                                   (conj ret g v b g))))
                             [] (map vector bs vs gs))]
            \`(let ~bfs
               (loop* ~(vec (interleave gs gs))
                 (let ~(vec (interleave bs gs))
                   ~@body)))))))))



(defmacro with-out-str
  "Evaluates body in a context in which *out* is bound to a fresh string
  accumulator. Returns the string of all output produced by println, print,
  pr, prn, pprint and newline during the evaluation."
  [& body]
  \`(let [buf# (atom "")]
     (binding [*out* (fn [s#] (swap! buf# str s#))]
       ~@body)
     @buf#))

(defmacro with-err-str
  "Like with-out-str but captures *err* output (warn, etc.)."
  [& body]
  \`(let [buf# (atom "")]
     (binding [*err* (fn [s#] (swap! buf# str s#))]
       ~@body)
     @buf#))
`;

// src/clojure/generated/clojure-set-source.ts
var clojure_setSource = `(ns clojure.set)

(defn union
  "Return a set that is the union of the input sets."
  ([] #{})
  ([s] s)
  ([s1 s2]
   (reduce conj s1 s2))
  ([s1 s2 & sets]
   (reduce union (union s1 s2) sets)))

(defn intersection
  "Return a set that is the intersection of the input sets."
  ([s] s)
  ([s1 s2]
   (reduce (fn [acc x]
             (if (contains? s2 x)
               (conj acc x)
               acc))
           #{}
           s1))
  ([s1 s2 & sets]
   (reduce intersection (intersection s1 s2) sets)))

(defn difference
  "Return a set that is the first set without elements of the remaining sets."
  ([s] s)
  ([s1 s2]
   (reduce (fn [acc x]
             (if (contains? s2 x)
               acc
               (conj acc x)))
           #{}
           s1))
  ([s1 s2 & sets]
   (reduce difference (difference s1 s2) sets)))

(defn select
  "Returns a set of the elements for which pred is true."
  [pred s]
  (reduce (fn [acc x]
            (if (pred x)
              (conj acc x)
              acc))
          #{}
          s))

(defn project
  "Returns a rel of the elements of xrel with only the keys in ks."
  [xrel ks]
  (reduce (fn [acc m]
            (conj acc (select-keys m ks)))
          #{}
          xrel))

(defn rename-keys
  "Returns the map with the keys in kmap renamed to the vals in kmap."
  [m kmap]
  (reduce (fn [acc [old-k new-k]]
            (if (contains? acc old-k)
              (-> acc
                  (assoc new-k (get acc old-k))
                  (dissoc old-k))
              acc))
          m
          kmap))

(defn rename
  "Returns a rel of the maps in xrel with the keys in kmap renamed to the vals in kmap."
  [xrel kmap]
  (reduce (fn [acc m]
            (conj acc (rename-keys m kmap)))
          #{}
          xrel))

(defn index
  "Returns a map of the distinct values of ks in the xrel mapped to a
  set of the maps in xrel with the corresponding values of ks."
  [xrel ks]
  (reduce (fn [acc m]
            (let [k (select-keys m ks)]
              (assoc acc k (conj (get acc k #{}) m))))
          {}
          xrel))

(defn map-invert
  "Returns the map with the vals mapped to the keys."
  [m]
  (reduce (fn [acc [k v]]
            (assoc acc v k))
          {}
          m))

(defn join
  "When passed 2 rels, returns the relation corresponding to the natural
  join. When passed an additional keymap, joins on the corresponding keys."
  ([xrel yrel]
   (if (and (seq xrel) (seq yrel))
     (let [ks (intersection (set (keys (first xrel)))
                            (set (keys (first yrel))))]
       (if (empty? ks)
         (reduce (fn [acc mx]
                   (reduce (fn [acc2 my]
                             (conj acc2 (merge mx my)))
                           acc
                           yrel))
                 #{}
                 xrel)
         (join xrel yrel (zipmap ks ks))))
     #{}))
  ([xrel yrel km]
   (let [idx (index yrel (vals km))]
     (reduce (fn [acc mx]
               (let [found (get idx (rename-keys (select-keys mx (keys km)) km))]
                 (if found
                   (reduce (fn [acc2 my]
                             (conj acc2 (merge my mx)))
                           acc
                           found)
                   acc)))
             #{}
             xrel))))

(defn subset?
  "Is set1 a subset of set2?"
  [s1 s2]
  (every? #(contains? s2 %) s1))

(defn superset?
  "Is set1 a superset of set2?"
  [s1 s2]
  (every? #(contains? s1 %) s2))
`;

// src/clojure/generated/clojure-string-source.ts
var clojure_stringSource = `(ns clojure.string)

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(def str-split*)
(def str-upper-case*)
(def str-lower-case*)
(def str-trim*)
(def str-triml*)
(def str-trimr*)
(def str-reverse*)
(def str-starts-with*)
(def str-ends-with*)
(def str-includes*)
(def str-index-of*)
(def str-last-index-of*)
(def str-replace*)
(def str-replace-first*)

;; ---------------------------------------------------------------------------
;; Joining / splitting
;; ---------------------------------------------------------------------------

(defn join
  "Returns a string of all elements in coll, as returned by (str), separated
  by an optional separator."
  ([coll] (join "" coll))
  ([separator coll]
   (if (nil? coll)
     ""
     (reduce
      (fn [acc x]
        (if (= acc "")
          (str x)
          (str acc separator x)))
      ""
      coll))))

(defn split
  "Splits string on a regular expression. Optional limit is the maximum number
  of parts returned. Trailing empty strings are not returned by default; pass
  a limit of -1 to return all."
  ([s sep] (str-split* s sep))
  ([s sep limit] (str-split* s sep limit)))

(defn split-lines
  "Splits s on \\\\n or \\\\r\\\\n. Trailing empty lines are not returned."
  [s]
  (split s #"\\r?\\n"))

;; ---------------------------------------------------------------------------
;; Case conversion
;; ---------------------------------------------------------------------------

(defn upper-case
  "Converts string to all upper-case."
  [s]
  (str-upper-case* s))

(defn lower-case
  "Converts string to all lower-case."
  [s]
  (str-lower-case* s))

(defn capitalize
  "Converts first character of the string to upper-case, all other
  characters to lower-case."
  [s]
  (if (< (count s) 2)
    (upper-case s)
    (str (upper-case (subs s 0 1)) (lower-case (subs s 1)))))

;; ---------------------------------------------------------------------------
;; Trimming
;; ---------------------------------------------------------------------------

(defn trim
  "Removes whitespace from both ends of string."
  [s]
  (str-trim* s))

(defn triml
  "Removes whitespace from the left side of string."
  [s]
  (str-triml* s))

(defn trimr
  "Removes whitespace from the right side of string."
  [s]
  (str-trimr* s))

(defn trim-newline
  "Removes all trailing newline \\\\n or return \\\\r characters from string.
  Similar to Perl's chomp."
  [s]
  (replace s #"[\\r\\n]+$" ""))

;; ---------------------------------------------------------------------------
;; Predicates
;; ---------------------------------------------------------------------------

(defn blank?
  "True if s is nil, empty, or contains only whitespace."
  [s]
  (or (nil? s) (not (nil? (re-matches #"\\s*" s)))))

(defn starts-with?
  "True if s starts with substr."
  [s substr]
  (str-starts-with* s substr))

(defn ends-with?
  "True if s ends with substr."
  [s substr]
  (str-ends-with* s substr))

(defn includes?
  "True if s includes substr."
  [s substr]
  (str-includes* s substr))

;; ---------------------------------------------------------------------------
;; Search
;; ---------------------------------------------------------------------------

(defn index-of
  "Return index of value (string) in s, optionally searching forward from
  from-index. Return nil if value not found."
  ([s value] (str-index-of* s value))
  ([s value from-index] (str-index-of* s value from-index)))

(defn last-index-of
  "Return last index of value (string) in s, optionally searching backward
  from from-index. Return nil if value not found."
  ([s value] (str-last-index-of* s value))
  ([s value from-index] (str-last-index-of* s value from-index)))

;; ---------------------------------------------------------------------------
;; Replacement
;; ---------------------------------------------------------------------------

(defn replace
  "Replaces all instances of match with replacement in s.

  match/replacement can be:
    string / string   — literal match, literal replacement
    pattern / string  — regex match; $1, $2, etc. substituted from groups
    pattern / fn      — regex match; fn called with match (string or vector
                        of [whole g1 g2 ...]), return value used as replacement.

  See also replace-first."
  [s match replacement]
  (str-replace* s match replacement))

(defn replace-first
  "Replaces the first instance of match with replacement in s.
  Same match/replacement semantics as replace."
  [s match replacement]
  (str-replace-first* s match replacement))

(defn re-quote-replacement
  "Given a replacement string that you wish to be a literal replacement for a
  pattern match in replace or replace-first, escape any special replacement
  characters ($ signs) so they are treated literally."
  [s]
  (replace s #"\\$" "$$$$"))

;; ---------------------------------------------------------------------------
;; Miscellaneous
;; ---------------------------------------------------------------------------

(defn reverse
  "Returns s with its characters reversed."
  [s]
  (str-reverse* s))

(defn escape
  "Return a new string, using cmap to escape each character ch from s as
  follows: if (cmap ch) is nil, append ch to the new string; otherwise append
  (str (cmap ch)).

  cmap may be a map or a function. Maps are callable directly (IFn semantics).

  Note: Clojure uses char literal keys (e.g. {\\\\< \\"&lt;\\"}). This interpreter
  has no char type, so map keys must be single-character strings instead
  (e.g. {\\"<\\" \\"&lt;\\"})."
  [s cmap]
  (apply str (map (fn [c]
                    (let [r (cmap c)]
                      (if (nil? r) c (str r))))
                  (split s #""))))
`;

// src/clojure/generated/clojure-walk-source.ts
var clojure_walkSource = `(ns clojure.walk)

(defn walk
  "Traverses form, an arbitrary data structure. inner and outer are
  functions. Applies inner to each element of form, building up a
  data structure of the same type, then applies outer to the result."
  [inner outer form]
  (cond
    (list? form) (outer (apply list (map inner form)))
    (vector? form) (outer (into [] (map inner) form))
    (map? form) (outer (into {} (map (fn [e] [(inner (first e)) (inner (second e))]) form)))
    (set? form) (outer (into #{} (map inner) form))
    :else (outer form)))

(defn postwalk
  "Performs a depth-first, post-order traversal of form. Calls f on
  each sub-form, uses f's return value in place of the original."
  [f form]
  (walk (fn [x] (postwalk f x)) f form))

(defn prewalk
  "Like postwalk, but does pre-order traversal."
  [f form]
  (walk (fn [x] (prewalk f x)) identity (f form)))

(defn postwalk-replace
  "Recursively transforms form by replacing keys in smap with their
  values. Like clojure/replace but works on any data structure."
  [smap form]
  (postwalk (fn [x] (if (contains? smap x) (get smap x) x)) form))

(defn prewalk-replace
  "Recursively transforms form by replacing keys in smap with their
  values. Like clojure/replace but works on any data structure."
  [smap form]
  (prewalk (fn [x] (if (contains? smap x) (get smap x) x)) form))

(defn keywordize-keys
  "Recursively transforms all map keys from strings to keywords."
  [m]
  (postwalk
   (fn [x]
     (if (map? x)
       (into {} (map (fn [e]
                       (let [k (first e)]
                         (if (string? k)
                           [(keyword k) (second e)]
                           e)))
                     x))
       x))
   m))

(defn stringify-keys
  "Recursively transforms all map keys from keywords to strings."
  [m]
  (postwalk
   (fn [x]
     (if (map? x)
       (into {}
             (map
              (fn [e]
                (let [k (first e)]
                  (if (keyword? k)
                    [(name k) (second e)]
                    e)))
              x))
       x))
   m))
`;

// src/clojure/generated/builtin-namespace-registry.ts
var builtInNamespaceSources = {
  "clojure.core": () => clojure_coreSource,
  "clojure.set": () => clojure_setSource,
  "clojure.string": () => clojure_stringSource,
  "clojure.walk": () => clojure_walkSource
};

// src/core/keywords.ts
var specialFormKeywords = {
  def: "def",
  do: "do",
  "fn*": "fn*",
  if: "if",
  "let*": "let*",
  "loop*": "loop*",
  recur: "recur",
  quote: "quote",
  try: "try",
  var: "var",
  ns: "ns",
  defmacro: "defmacro",
  binding: "binding",
  "set!": "set!",
  "letfn*": "letfn*",
  "lazy-seq": "lazy-seq",
  async: "async",
  ".": ".",
  "js/new": "js/new"
};
var valueKeywords = {
  boolean: "boolean",
  function: "function",
  nativeFunction: "native-function",
  keyword: "keyword",
  list: "list",
  macro: "macro",
  map: "map",
  nil: "nil",
  number: "number",
  regex: "regex",
  set: "set",
  string: "string",
  symbol: "symbol",
  vector: "vector",
  atom: "atom",
  delay: "delay",
  multiMethod: "multi-method",
  volatile: "volatile",
  var: "var",
  cons: "cons",
  lazySeq: "lazy-seq",
  reduced: "reduced",
  pending: "pending",
  namespace: "namespace",
  jsValue: "js-value"
};
var tokenKeywords = {
  LParen: "LParen",
  RParen: "RParen",
  LBracket: "LBracket",
  RBracket: "RBracket",
  LBrace: "LBrace",
  RBrace: "RBrace",
  String: "String",
  Number: "Number",
  Keyword: "Keyword",
  Quote: "Quote",
  Quasiquote: "Quasiquote",
  Unquote: "Unquote",
  UnquoteSplicing: "UnquoteSplicing",
  Comment: "Comment",
  Whitespace: "Whitespace",
  Symbol: "Symbol",
  AnonFnStart: "AnonFnStart",
  Deref: "Deref",
  Regex: "Regex",
  VarQuote: "VarQuote",
  Meta: "Meta",
  SetStart: "SetStart"
};
var tokenSymbols = {
  Quote: "quote",
  Quasiquote: "quasiquote",
  Unquote: "unquote",
  UnquoteSplicing: "unquote-splicing",
  LParen: "(",
  RParen: ")",
  LBracket: "[",
  RBracket: "]",
  LBrace: "{",
  RBrace: "}"
};

// src/core/assertions.ts
var isNil = (value) => value.kind === "nil";
var isBoolean = (value) => value.kind === "boolean";
var isFalsy = (value) => {
  if (value.kind === "nil")
    return true;
  if (isBoolean(value))
    return !value.value;
  return false;
};
var isTruthy = (value) => {
  return !isFalsy(value);
};
var isSpecialForm = (value) => value.kind === "symbol" && (value.name in specialFormKeywords);
var isSymbol = (value) => value.kind === "symbol";
var isVector = (value) => value.kind === "vector";
var isList = (value) => value.kind === "list";
var isFunction = (value) => value.kind === "function";
var isNativeFunction = (value) => value.kind === "native-function";
var isMacro = (value) => value.kind === "macro";
var isMap = (value) => value.kind === "map";
var isKeyword = (value) => value.kind === "keyword";
var isAFunction = (value) => isFunction(value) || isNativeFunction(value);
var isJsValue = (value) => value.kind === "js-value";
var isCallable = (value) => isAFunction(value) || isKeyword(value) || isMap(value) || isSet(value) || isVar(value) || isJsValue(value) && typeof value.value === "function";
var isMultiMethod = (value) => value.kind === "multi-method";
var isAtom = (value) => value.kind === "atom";
var isReduced = (value) => value.kind === "reduced";
var isVolatile = (value) => value.kind === "volatile";
var isRegex = (value) => value.kind === "regex";
var isVar = (value) => value.kind === "var";
var isSet = (value) => value.kind === valueKeywords.set;
var isDelay = (value) => value.kind === "delay";
var isLazySeq = (value) => value.kind === "lazy-seq";
var isCons = (value) => value.kind === "cons";
var isNamespace = (value) => value.kind === "namespace";
var isCollection = (value) => isVector(value) || isMap(value) || isList(value) || isSet(value) || isCons(value);
var isSeqable = (value) => isCollection(value) || value.kind === "string" || isLazySeq(value);
var isCljValue = (value) => {
  return typeof value === "object" && value !== null && "kind" in value && value.kind in valueKeywords;
};
function realizeLazySeqForEquality(ls) {
  let current = ls;
  while (current.kind === "lazy-seq") {
    const lazy = current;
    if (lazy.realized) {
      current = lazy.value;
    } else if (lazy.thunk) {
      lazy.value = lazy.thunk();
      lazy.thunk = null;
      lazy.realized = true;
      current = lazy.value;
    } else {
      return { kind: "nil", value: null };
    }
  }
  return current;
}
var equalityHandlers = {
  [valueKeywords.number]: (a, b) => a.value === b.value,
  [valueKeywords.string]: (a, b) => a.value === b.value,
  [valueKeywords.boolean]: (a, b) => a.value === b.value,
  [valueKeywords.nil]: () => true,
  [valueKeywords.symbol]: (a, b) => a.name === b.name,
  [valueKeywords.keyword]: (a, b) => a.name === b.name,
  [valueKeywords.vector]: (a, b) => {
    if (a.value.length !== b.value.length)
      return false;
    return a.value.every((value, index) => isEqual(value, b.value[index]));
  },
  [valueKeywords.map]: (a, b) => {
    if (a.entries.length !== b.entries.length)
      return false;
    const uniqueKeys = new Set([
      ...a.entries.map(([key]) => key),
      ...b.entries.map(([key]) => key)
    ]);
    for (const key of uniqueKeys) {
      const aEntry = a.entries.find(([k]) => isEqual(k, key));
      if (!aEntry)
        return false;
      const bEntry = b.entries.find(([k]) => isEqual(k, key));
      if (!bEntry)
        return false;
      if (!isEqual(aEntry[1], bEntry[1]))
        return false;
    }
    return true;
  },
  [valueKeywords.list]: (a, b) => {
    if (a.value.length !== b.value.length)
      return false;
    return a.value.every((value, index) => isEqual(value, b.value[index]));
  },
  [valueKeywords.atom]: (a, b) => a === b,
  [valueKeywords.reduced]: (a, b) => isEqual(a.value, b.value),
  [valueKeywords.volatile]: (a, b) => a === b,
  [valueKeywords.regex]: (a, b) => a === b,
  [valueKeywords.var]: (a, b) => a === b,
  [valueKeywords.set]: (a, b) => {
    if (a.values.length !== b.values.length)
      return false;
    return a.values.every((av) => b.values.some((bv) => isEqual(av, bv)));
  },
  [valueKeywords.delay]: (a, b) => a === b,
  [valueKeywords.lazySeq]: (a, b) => {
    const aVal = realizeLazySeqForEquality(a);
    const bVal = realizeLazySeqForEquality(b);
    return isEqual(aVal, bVal);
  },
  [valueKeywords.cons]: (a, b) => isEqual(a.head, b.head) && isEqual(a.tail, b.tail),
  [valueKeywords.namespace]: (a, b) => a === b
};
var isString = (value) => value.kind === "string";
var isEqual = (a, b) => {
  if (a.kind !== b.kind)
    return false;
  const handler = equalityHandlers[a.kind];
  if (!handler)
    return false;
  return handler(a, b);
};
var isNumber = (value) => value.kind === "number";
var isPending = (value) => value.kind === "pending";
var is = {
  nil: isNil,
  number: isNumber,
  string: isString,
  boolean: isBoolean,
  falsy: isFalsy,
  truthy: isTruthy,
  specialForm: isSpecialForm,
  symbol: isSymbol,
  vector: isVector,
  list: isList,
  function: isFunction,
  nativeFunction: isNativeFunction,
  macro: isMacro,
  map: isMap,
  keyword: isKeyword,
  aFunction: isAFunction,
  callable: isCallable,
  multiMethod: isMultiMethod,
  atom: isAtom,
  reduced: isReduced,
  volatile: isVolatile,
  regex: isRegex,
  var: isVar,
  set: isSet,
  delay: isDelay,
  lazySeq: isLazySeq,
  cons: isCons,
  namespace: isNamespace,
  collection: isCollection,
  seqable: isSeqable,
  cljValue: isCljValue,
  equal: isEqual,
  jsValue: isJsValue,
  pending: isPending
};

// src/core/errors.ts
class TokenizerError extends Error {
  context;
  constructor(message, context) {
    super(message);
    this.name = "TokenizerError";
    this.context = context;
  }
}

class ReaderError extends Error {
  context;
  pos;
  constructor(message, context, pos) {
    super(message);
    this.name = "ReaderError";
    this.context = context;
    this.pos = pos;
  }
}

class EvaluationError extends Error {
  context;
  pos;
  data;
  frames;
  code;
  constructor(message, context, pos) {
    super(message);
    this.name = "EvaluationError";
    this.context = context;
    this.pos = pos;
  }
  static atArg(message, context, argIndex) {
    const err = new EvaluationError(message, context);
    err.data = { argIndex };
    return err;
  }
}

class CljThrownSignal {
  value;
  constructor(value) {
    this.value = value;
  }
}

// src/core/factories.ts
var cljNumber = (value) => ({ kind: "number", value });
var cljString = (value) => ({ kind: "string", value });
var cljBoolean = (value) => ({ kind: "boolean", value });
var cljKeyword = (name) => ({ kind: "keyword", name });
var cljNil = () => ({ kind: "nil", value: null });
var cljSymbol = (name) => ({ kind: "symbol", name });
var cljList = (value) => ({ kind: "list", value });
var cljSet = (values) => ({ kind: "set", values });
var cljVector = (value) => ({ kind: "vector", value });
var cljMap = (entries) => ({ kind: "map", entries });
var cljFunction = (params, restParam, body, env) => ({
  kind: "function",
  arities: [{ params, restParam, body }],
  env
});
var cljMultiArityFunction = (arities, env) => ({
  kind: "function",
  arities,
  env
});
var cljMacro = (params, restParam, body, env) => ({
  kind: "macro",
  arities: [{ params, restParam, body }],
  env
});
var cljMultiArityMacro = (arities, env) => ({
  kind: "macro",
  arities,
  env
});
var cljRegex = (pattern, flags = "") => ({
  kind: "regex",
  pattern,
  flags
});
var cljVar = (ns, name, value, meta) => ({ kind: "var", ns, name, value, meta });
var cljAtom = (value) => ({ kind: "atom", value });
var cljReduced = (value) => ({
  kind: "reduced",
  value
});
var cljVolatile = (value) => ({
  kind: "volatile",
  value
});
var cljDelay = (thunk) => ({
  kind: "delay",
  thunk,
  realized: false
});
var cljLazySeq = (thunk) => ({
  kind: "lazy-seq",
  thunk,
  realized: false
});
var cljCons = (head, tail) => ({
  kind: "cons",
  head,
  tail
});
var cljNamespace = (name) => ({
  kind: "namespace",
  name,
  vars: new Map,
  aliases: new Map,
  readerAliases: new Map
});
var cljJsValue = (value) => ({
  kind: "js-value",
  value
});
var cljPending = (promise) => {
  const pending = { kind: "pending", promise };
  promise.then((v) => {
    pending.resolved = true;
    pending.resolvedValue = v;
  }, () => {});
  return pending;
};
function buildDocMeta(text, arglists) {
  return cljMap([
    [cljKeyword(":doc"), cljString(text)],
    ...arglists ? [
      [
        cljKeyword(":arglists"),
        cljVector(arglists.map((args) => cljVector(args.map(cljSymbol))))
      ]
    ] : []
  ]);
}
function makeNativeFnBuilder(def) {
  const plain = {
    kind: "native-function",
    name: def.name,
    fn: def.fn,
    ...def.fnWithContext !== undefined ? { fnWithContext: def.fnWithContext } : {},
    ...def.meta !== undefined ? { meta: def.meta } : {}
  };
  return {
    ...plain,
    doc(text, arglists) {
      return makeNativeFnBuilder({
        ...plain,
        meta: buildDocMeta(text, arglists)
      });
    }
  };
}
var cljMultiMethod = (name, dispatchFn, methods, defaultMethod) => ({
  kind: "multi-method",
  name,
  dispatchFn,
  methods,
  defaultMethod
});
var v = {
  number: cljNumber,
  string: cljString,
  boolean: cljBoolean,
  keyword: cljKeyword,
  nil: cljNil,
  symbol: cljSymbol,
  kw: cljKeyword,
  list: cljList,
  vector: cljVector,
  map: cljMap,
  set: cljSet,
  cons: cljCons,
  function: cljFunction,
  multiArityFunction: cljMultiArityFunction,
  macro: cljMacro,
  multiArityMacro: cljMultiArityMacro,
  multiMethod: cljMultiMethod,
  nativeFn(name, fn) {
    return makeNativeFnBuilder({ kind: "native-function", name, fn });
  },
  nativeFnCtx(name, fn) {
    return makeNativeFnBuilder({
      kind: "native-function",
      name,
      fn: () => {
        throw new EvaluationError("Native function called without context", {
          name
        });
      },
      fnWithContext: fn
    });
  },
  var: cljVar,
  atom: cljAtom,
  regex: cljRegex,
  reduced: cljReduced,
  volatile: cljVolatile,
  delay: cljDelay,
  lazySeq: cljLazySeq,
  namespace: cljNamespace,
  pending: cljPending,
  jsValue: cljJsValue
};

// src/core/conversions.ts
class ConversionError extends Error {
  context;
  constructor(message, context) {
    super(message);
    this.name = "ConversionError";
    this.context = context;
  }
}
var richKeyKinds = new Set(["list", "vector", "map"]);
var _throwingApplier = {
  applyFunction: () => {
    throw new ConversionError("Cannot convert a CLJ function to JS in this context — use session.cljToJs() instead.");
  }
};
function cljToJs(value, applier) {
  switch (value.kind) {
    case "number":
      return value.value;
    case "string":
      return value.value;
    case "boolean":
      return value.value;
    case "nil":
      return null;
    case "keyword":
      return value.name.startsWith(":") ? value.name.slice(1) : value.name;
    case "symbol":
      return value.name;
    case "list":
    case "vector":
      return value.value.map((item) => cljToJs(item, applier));
    case "map": {
      const obj = {};
      for (const [k, val] of value.entries) {
        if (richKeyKinds.has(k.kind)) {
          throw new ConversionError(`Rich key types (${k.kind}) are not supported in JS object conversion. Restructure your map to use string, keyword, or number keys.`, { key: k, value: val });
        }
        const jsKey = String(cljToJs(k, applier));
        obj[jsKey] = cljToJs(val, applier);
      }
      return obj;
    }
    case "function":
    case "native-function": {
      const fn = value;
      return (...jsArgs) => {
        const cljArgs = jsArgs.map((a) => jsToClj(a));
        const result = applier.applyFunction(fn, cljArgs);
        return cljToJs(result, applier);
      };
    }
    case "macro":
      throw new ConversionError("Macros cannot be exported to JavaScript. Macros are compile-time constructs.", { macro: value });
  }
}
function jsToClj(value, opts = {}) {
  const { keywordizeKeys = true } = opts;
  if (value === null)
    return v.nil();
  if (value === undefined)
    return v.jsValue(undefined);
  if (isCljValue(value))
    return value;
  switch (typeof value) {
    case "number":
      return v.number(value);
    case "string":
      return v.string(value);
    case "boolean":
      return v.boolean(value);
    case "function": {
      const jsFn = value;
      return v.nativeFn("js-fn", (...cljArgs) => {
        const jsArgs = cljArgs.map((a) => cljToJs(a, _throwingApplier));
        const result = jsFn(...jsArgs);
        return jsToClj(result, opts);
      });
    }
    case "object": {
      if (Array.isArray(value)) {
        return v.vector(value.map((item) => jsToClj(item, opts)));
      }
      const entries = Object.entries(value).map(([k, val]) => [
        keywordizeKeys ? v.keyword(`:${k}`) : v.string(k),
        jsToClj(val, opts)
      ]);
      return v.map(entries);
    }
    default:
      throw new ConversionError(`Cannot convert JS value of type ${typeof value} to CljValue`, { value });
  }
}

// src/core/env.ts
class EnvError extends Error {
  context;
  constructor(message, context) {
    super(message);
    this.context = context;
    this.name = "EnvError";
  }
}
function derefValue(val) {
  if (val.kind !== "var")
    return val;
  if (val.dynamic && val.bindingStack && val.bindingStack.length > 0) {
    return val.bindingStack[val.bindingStack.length - 1];
  }
  return val.value;
}
function makeNamespace(name) {
  return {
    kind: "namespace",
    name,
    vars: new Map,
    aliases: new Map,
    readerAliases: new Map
  };
}
function makeEnv(outer) {
  return {
    bindings: new Map,
    outer: outer ?? null
  };
}
function lookup(name, env) {
  let current = env;
  while (current) {
    const raw = current.bindings.get(name);
    if (raw !== undefined)
      return raw;
    const theVar = current.ns?.vars.get(name);
    if (theVar !== undefined)
      return derefValue(theVar);
    current = current.outer;
  }
  throw new EvaluationError(`Symbol ${name} not found`, { name });
}
function tryLookup(name, env) {
  let current = env;
  while (current) {
    const raw = current.bindings.get(name);
    if (raw !== undefined)
      return raw;
    const theVar = current.ns?.vars.get(name);
    if (theVar !== undefined)
      return derefValue(theVar);
    current = current.outer;
  }
  return;
}
function internVar(name, value, nsEnv, meta) {
  const ns = nsEnv.ns;
  const existing = ns.vars.get(name);
  if (existing) {
    existing.value = value;
    if (meta)
      existing.meta = meta;
  } else {
    ns.vars.set(name, v.var(ns.name, name, value, meta));
  }
}
function lookupVar(name, env) {
  let current = env;
  while (current) {
    const raw = current.bindings.get(name);
    if (raw !== undefined && raw.kind === "var")
      return raw;
    const v2 = current.ns?.vars.get(name);
    if (v2 !== undefined)
      return v2;
    current = current.outer;
  }
  return;
}
function define(name, value, env) {
  env.bindings.set(name, value);
}
function extend(params, args, outer) {
  if (params.length !== args.length) {
    throw new EnvError("Number of parameters and arguments must match", {
      params,
      args,
      outer
    });
  }
  const env = makeEnv(outer);
  for (let i = 0;i < params.length; i++) {
    define(params[i], args[i], env);
  }
  return env;
}
function getRootEnv(env) {
  let current = env;
  while (current?.outer) {
    current = current.outer;
  }
  return current;
}
function getNamespaceEnv(env) {
  let current = env;
  while (current) {
    if (current.ns)
      return current;
    current = current.outer;
  }
  return getRootEnv(env);
}

// src/core/printer.ts
var LAZY_PRINT_CAP = 100;
function realizeLazy(ls) {
  let current = ls;
  while (is.lazySeq(current)) {
    const lazy = current;
    if (lazy.realized) {
      current = lazy.value;
      continue;
    }
    if (lazy.thunk) {
      lazy.value = lazy.thunk();
      lazy.thunk = null;
      lazy.realized = true;
      current = lazy.value;
    } else {
      return v.nil();
    }
  }
  return current;
}
function collectSeqElements(value, limit, depth) {
  const items = [];
  let current = value;
  while (items.length < limit) {
    if (is.nil(current))
      break;
    if (is.lazySeq(current)) {
      current = realizeLazy(current);
      continue;
    }
    if (is.cons(current)) {
      const c = current;
      items.push(printString(c.head, depth + 1));
      current = c.tail;
      continue;
    }
    if (is.list(current)) {
      for (const v2 of current.value) {
        if (items.length >= limit)
          break;
        items.push(printString(v2, depth + 1));
      }
      break;
    }
    if (is.vector(current)) {
      for (const v2 of current.value) {
        if (items.length >= limit)
          break;
        items.push(printString(v2, depth + 1));
      }
      break;
    }
    items.push(printString(current, depth + 1));
    break;
  }
  return { items, truncated: items.length >= limit };
}
var _printCtx = { printLength: null, printLevel: null };
function getPrintContext() {
  return _printCtx;
}
function withPrintContext(ctx, fn) {
  const prev = _printCtx;
  _printCtx = ctx;
  try {
    return fn();
  } finally {
    _printCtx = prev;
  }
}
function buildPrintContext(ctx) {
  const lenVar = ctx.resolveNs("clojure.core")?.vars.get("*print-length*");
  const lvlVar = ctx.resolveNs("clojure.core")?.vars.get("*print-level*");
  const len = lenVar ? derefValue(lenVar) : undefined;
  const level = lvlVar ? derefValue(lvlVar) : undefined;
  return {
    printLength: len && is.number(len) ? len.value : null,
    printLevel: level && is.number(level) ? level.value : null
  };
}
function printString(value, _depth = 0) {
  const { printLevel } = _printCtx;
  if (printLevel !== null && _depth >= printLevel) {
    if (is.list(value) || is.vector(value) || is.map(value) || is.set(value) || is.cons(value) || is.lazySeq(value))
      return "#";
  }
  return printStringImpl(value, _depth);
}
function printStringImpl(value, depth) {
  switch (value.kind) {
    case valueKeywords.number:
      return value.value.toString();
    case valueKeywords.string:
      let escapedBuffer = "";
      for (const char of value.value) {
        switch (char) {
          case '"':
            escapedBuffer += "\\\"";
            break;
          case "\\":
            escapedBuffer += "\\\\";
            break;
          case `
`:
            escapedBuffer += "\\n";
            break;
          case "\r":
            escapedBuffer += "\\r";
            break;
          case "\t":
            escapedBuffer += "\\t";
            break;
          default:
            escapedBuffer += char;
        }
      }
      return `"${escapedBuffer}"`;
    case valueKeywords.boolean:
      return value.value ? "true" : "false";
    case valueKeywords.nil:
      return "nil";
    case valueKeywords.keyword:
      return `${value.name}`;
    case valueKeywords.symbol:
      return `${value.name}`;
    case valueKeywords.list: {
      const { printLength } = _printCtx;
      const items = printLength !== null ? value.value.slice(0, printLength) : value.value;
      const suffix = printLength !== null && value.value.length > printLength ? " ..." : "";
      return `(${items.map((v2) => printString(v2, depth + 1)).join(" ")}${suffix})`;
    }
    case valueKeywords.vector: {
      const { printLength } = _printCtx;
      const items = printLength !== null ? value.value.slice(0, printLength) : value.value;
      const suffix = printLength !== null && value.value.length > printLength ? " ..." : "";
      return `[${items.map((v2) => printString(v2, depth + 1)).join(" ")}${suffix}]`;
    }
    case valueKeywords.map: {
      const { printLength } = _printCtx;
      const entries = printLength !== null ? value.entries.slice(0, printLength) : value.entries;
      const suffix = printLength !== null && value.entries.length > printLength ? " ..." : "";
      return `{${entries.map(([key, v2]) => `${printString(key, depth + 1)} ${printString(v2, depth + 1)}`).join(" ")}${suffix}}`;
    }
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0];
        const params = a.restParam ? [...a.params, v.symbol("&"), a.restParam] : a.params;
        return `(fn [${params.map(printString).join(" ")}] ${a.body.map(printString).join(" ")})`;
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam ? [...a.params, v.symbol("&"), a.restParam] : a.params;
        return `([${params.map(printString).join(" ")}] ${a.body.map(printString).join(" ")})`;
      });
      return `(fn ${clauses.join(" ")})`;
    }
    case valueKeywords.nativeFunction:
      return `(native-fn ${value.name})`;
    case valueKeywords.multiMethod:
      return `(multi-method ${value.name})`;
    case valueKeywords.atom:
      return `#<Atom ${printString(value.value, depth + 1)}>`;
    case valueKeywords.reduced:
      return `#<Reduced ${printString(value.value, depth + 1)}>`;
    case valueKeywords.volatile:
      return `#<Volatile ${printString(value.value, depth + 1)}>`;
    case valueKeywords.regex: {
      const escaped = value.pattern.replace(/"/g, "\\\"");
      const prefix = value.flags ? `(?${value.flags})` : "";
      return `#"${prefix}${escaped}"`;
    }
    case valueKeywords.var:
      return `#'${value.ns}/${value.name}`;
    case valueKeywords.set: {
      const { printLength } = _printCtx;
      const items = printLength !== null ? value.values.slice(0, printLength) : value.values;
      const suffix = printLength !== null && value.values.length > printLength ? " ..." : "";
      return `#{${items.map((v2) => printString(v2, depth + 1)).join(" ")}${suffix}}`;
    }
    case valueKeywords.delay:
      if (value.realized)
        return `#<Delay @${printString(value.value, depth + 1)}>`;
      return "#<Delay pending>";
    case valueKeywords.lazySeq:
    case valueKeywords.cons: {
      const { printLength } = _printCtx;
      const limit = printLength !== null ? printLength : LAZY_PRINT_CAP;
      const { items, truncated } = collectSeqElements(value, limit, depth);
      const suffix = truncated ? " ..." : "";
      return `(${items.join(" ")}${suffix})`;
    }
    case valueKeywords.namespace:
      return `#namespace[${value.name}]`;
    case "pending":
      if (value.resolved && value.resolvedValue !== undefined)
        return `#<Pending @${printString(value.resolvedValue, depth + 1)}>`;
      return "#<Pending>";
    case valueKeywords.jsValue: {
      const raw = value.value;
      if (raw === null)
        return "#<js null>";
      if (raw === undefined)
        return "#<js undefined>";
      if (raw instanceof Date)
        return raw.toISOString();
      if (typeof raw === "function")
        return "#<js Function>";
      if (Array.isArray(raw))
        return "#<js Array>";
      if (raw instanceof Promise)
        return "#<js Promise>";
      const typeName = raw.constructor?.name ?? "Object";
      return `#<js ${typeName}>`;
    }
    default:
      throw new EvaluationError(`unhandled value type: ${value.kind}`, {
        value
      });
  }
}
function joinLines(lines) {
  return lines.join(`
`);
}
var BODY_FORM_HEADER_COUNT = {
  do: 0,
  try: 0,
  and: 0,
  or: 0,
  cond: 0,
  "->": 0,
  "->>": 0,
  "some->": 0,
  "some->>": 0,
  when: 1,
  "when-not": 1,
  "when-let": 1,
  "when-some": 1,
  "when-first": 1,
  if: 1,
  "if-not": 1,
  "if-let": 1,
  "if-some": 1,
  while: 1,
  let: 1,
  loop: 1,
  binding: 1,
  "with-open": 1,
  "with-local-vars": 1,
  locking: 1,
  fn: 1,
  "fn*": 1,
  def: 1,
  defonce: 1,
  ns: 1,
  doseq: 1,
  dotimes: 1,
  for: 1,
  case: 1,
  "cond->": 1,
  "cond->>": 1,
  defn: 2,
  "defn-": 2,
  defmacro: 2,
  defmethod: 2
};
var BINDING_FORMS = new Set([
  "let",
  "loop",
  specialFormKeywords.binding,
  "with-open",
  "for",
  "doseq",
  "dotimes"
]);
var PAIR_BODY_FORMS = new Set(["cond", "condp", "case", "cond->", "cond->>"]);
function sp(n) {
  return n > 0 ? " ".repeat(n) : "";
}
function lastLineLen(s) {
  const nl = s.lastIndexOf(`
`);
  return nl === -1 ? s.length : s.length - nl - 1;
}
function pp(value, col, maxWidth) {
  const flat = printString(value);
  if (col + flat.length <= maxWidth)
    return flat;
  switch (value.kind) {
    case valueKeywords.list:
      return ppList(value.value, col, maxWidth);
    case valueKeywords.vector:
      return ppVec(value.value, col, maxWidth, false);
    case valueKeywords.map:
      return ppMap(value.entries, col, maxWidth);
    case valueKeywords.set:
      return ppSet(value.values, col, maxWidth);
    case valueKeywords.lazySeq:
    case valueKeywords.cons:
      return flat;
    default:
      return flat;
  }
}
function ppList(items, col, maxWidth) {
  if (items.length === 0)
    return "()";
  const [head, ...args] = items;
  const headStr = printString(head);
  const name = head.kind === valueKeywords.symbol ? head.name : null;
  if (name !== null && name in BODY_FORM_HEADER_COUNT) {
    const hCount = BODY_FORM_HEADER_COUNT[name];
    const headerArgs = args.slice(0, hCount);
    const bodyArgs = args.slice(hCount);
    const bodyIndent = col + 2;
    let result = "(" + headStr;
    let curCol = col + 1 + headStr.length;
    for (let i = 0;i < headerArgs.length; i++) {
      const arg = headerArgs[i];
      const argCol = curCol + 1;
      const isPairVec = BINDING_FORMS.has(name) && i === 0 && arg.kind === valueKeywords.vector;
      const argStr = isPairVec ? ppVec(arg.value, argCol, maxWidth, true) : pp(arg, argCol, maxWidth);
      result += " " + argStr;
      curCol = argStr.includes(`
`) ? lastLineLen(argStr) : argCol + argStr.length - 1;
    }
    if (bodyArgs.length === 0)
      return result + ")";
    const bodyStr = PAIR_BODY_FORMS.has(name) ? ppPairs(bodyArgs, bodyIndent, maxWidth) : bodyArgs.map((a) => sp(bodyIndent) + pp(a, bodyIndent, maxWidth)).join(`
`);
    return result + `
` + bodyStr + ")";
  }
  if (args.length === 0)
    return "(" + headStr + ")";
  const firstArgCol = col + 1 + headStr.length + 1;
  if (args.length === 1) {
    return "(" + headStr + " " + pp(args[0], firstArgCol, maxWidth) + ")";
  }
  const argIndent = headStr.length <= 10 ? firstArgCol : col + 2;
  const argStrs = args.map((a) => pp(a, argIndent, maxWidth));
  if (argIndent === firstArgCol) {
    return "(" + headStr + " " + argStrs[0] + `
` + argStrs.slice(1).map((s) => sp(argIndent) + s).join(`
`) + ")";
  }
  return "(" + headStr + `
` + argStrs.map((s) => sp(argIndent) + s).join(`
`) + ")";
}
function ppVec(items, col, maxWidth, pairMode) {
  if (items.length === 0)
    return "[]";
  const innerCol = col + 1;
  if (pairMode) {
    const lines = [];
    for (let i = 0;i < items.length; i += 2) {
      const prefix = i === 0 ? "" : sp(innerCol);
      const keyFlat = printString(items[i]);
      if (i + 1 >= items.length) {
        lines.push(prefix + keyFlat);
        continue;
      }
      const val = items[i + 1];
      const pairFlat = keyFlat + " " + printString(val);
      if (innerCol + pairFlat.length <= maxWidth) {
        lines.push(prefix + pairFlat);
      } else {
        const valStr = pp(val, innerCol + keyFlat.length + 1, maxWidth);
        lines.push(prefix + keyFlat + " " + valStr);
      }
    }
    return "[" + lines.join(`
`) + "]";
  }
  const strs = items.map((item, i) => {
    const s = pp(item, innerCol, maxWidth);
    return (i === 0 ? "" : sp(innerCol)) + s;
  });
  return "[" + strs.join(`
`) + "]";
}
function ppMap(entries, col, maxWidth) {
  if (entries.length === 0)
    return "{}";
  const innerCol = col + 1;
  const pairs = entries.map(([k, v2], i) => {
    const kStr = printString(k);
    const vStr = pp(v2, innerCol + kStr.length + 1, maxWidth);
    return (i === 0 ? "" : sp(innerCol)) + kStr + " " + vStr;
  });
  return "{" + pairs.join(`
`) + "}";
}
function ppSet(items, col, maxWidth) {
  if (items.length === 0)
    return "#{}";
  const innerCol = col + 2;
  const strs = items.map((item, i) => {
    const s = pp(item, innerCol, maxWidth);
    return (i === 0 ? "" : sp(innerCol)) + s;
  });
  return "#{" + strs.join(`
`) + "}";
}
function ppPairs(items, indent, maxWidth) {
  const lines = [];
  for (let i = 0;i < items.length; i += 2) {
    const testStr = pp(items[i], indent, maxWidth);
    if (i + 1 >= items.length) {
      lines.push(sp(indent) + testStr);
      continue;
    }
    const exprFlat = printString(items[i + 1]);
    const pairFlat = testStr + " " + exprFlat;
    if (indent + pairFlat.length <= maxWidth) {
      lines.push(sp(indent) + pairFlat);
    } else {
      lines.push(sp(indent) + testStr + `
` + sp(indent + 2) + pp(items[i + 1], indent + 2, maxWidth));
    }
  }
  return lines.join(`
`);
}
function prettyPrintString(value, maxWidth = 80) {
  return pp(value, 0, maxWidth);
}

// src/core/positions.ts
function setPos(val, pos) {
  Object.defineProperty(val, "_pos", {
    value: pos,
    enumerable: false,
    writable: true,
    configurable: true
  });
}
function getPos(val) {
  return val._pos;
}
function getLineCol(source, offset) {
  const lines = source.split(`
`);
  let pos = 0;
  for (let i = 0;i < lines.length; i++) {
    const lineEnd = pos + lines[i].length;
    if (offset <= lineEnd) {
      return { line: i + 1, col: offset - pos, lineText: lines[i] };
    }
    pos = lineEnd + 1;
  }
  const last = lines[lines.length - 1];
  return { line: lines.length, col: last.length, lineText: last };
}
function formatErrorContext(source, pos, opts) {
  const { line, col, lineText } = getLineCol(source, pos.start);
  const absLine = line + (opts?.lineOffset ?? 0);
  const absCol = line === 1 ? col + (opts?.colOffset ?? 0) : col;
  const span = Math.max(1, pos.end - pos.start);
  const caret = " ".repeat(col) + "^".repeat(span);
  return `
  at line ${absLine}, col ${absCol + 1}:
  ${lineText}
  ${caret}`;
}
function framesToClj(frames) {
  return v.vector(frames.map((frame) => v.map([
    [v.keyword(":fn"), frame.fnName !== null ? v.string(frame.fnName) : v.nil()],
    [v.keyword(":line"), frame.line !== null ? v.number(frame.line) : v.nil()],
    [v.keyword(":col"), frame.col !== null ? v.number(frame.col) : v.nil()],
    [v.keyword(":source"), frame.source !== null ? v.string(frame.source) : v.nil()]
  ])));
}
function maybeHydrateErrorPos(error, list) {
  if (error instanceof EvaluationError && error.data?.argIndex !== undefined && !error.pos) {
    const argForm = list.value[error.data.argIndex + 1];
    if (argForm) {
      const pos = getPos(argForm);
      if (pos)
        error.pos = pos;
    }
  }
}

// src/core/transformations.ts
function valueToString(value) {
  switch (value.kind) {
    case valueKeywords.string:
      return value.value;
    case valueKeywords.number:
      return value.value.toString();
    case valueKeywords.boolean:
      return value.value ? "true" : "false";
    case valueKeywords.keyword:
      return value.name;
    case valueKeywords.symbol:
      return value.name;
    case valueKeywords.list: {
      const { printLength } = getPrintContext();
      const items = printLength !== null ? value.value.slice(0, printLength) : value.value;
      const suffix = printLength !== null && value.value.length > printLength ? " ..." : "";
      return `(${items.map(valueToString).join(" ")}${suffix})`;
    }
    case valueKeywords.vector: {
      const { printLength } = getPrintContext();
      const items = printLength !== null ? value.value.slice(0, printLength) : value.value;
      const suffix = printLength !== null && value.value.length > printLength ? " ..." : "";
      return `[${items.map(valueToString).join(" ")}${suffix}]`;
    }
    case valueKeywords.map: {
      const { printLength } = getPrintContext();
      const entries = printLength !== null ? value.entries.slice(0, printLength) : value.entries;
      const suffix = printLength !== null && value.entries.length > printLength ? " ..." : "";
      return `{${entries.map(([key, v2]) => `${valueToString(key)} ${valueToString(v2)}`).join(" ")}${suffix}}`;
    }
    case valueKeywords.set: {
      const { printLength } = getPrintContext();
      const items = printLength !== null ? value.values.slice(0, printLength) : value.values;
      const suffix = printLength !== null && value.values.length > printLength ? " ..." : "";
      return `#{${items.map(valueToString).join(" ")}${suffix}}`;
    }
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0];
        const params = a.restParam ? [...a.params, { kind: "symbol", name: "&" }, a.restParam] : a.params;
        return `(fn [${params.map(valueToString).join(" ")}] ${a.body.map(valueToString).join(" ")})`;
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam ? [...a.params, { kind: "symbol", name: "&" }, a.restParam] : a.params;
        return `([${params.map(valueToString).join(" ")}] ${a.body.map(valueToString).join(" ")})`;
      });
      return `(fn ${clauses.join(" ")})`;
    }
    case valueKeywords.nativeFunction:
      return `(native-fn ${value.name})`;
    case valueKeywords.nil:
      return "nil";
    case valueKeywords.regex: {
      const prefix = value.flags ? `(?${value.flags})` : "";
      return `${prefix}${value.pattern}`;
    }
    case valueKeywords.delay:
      return value.realized ? `#<Delay @${valueToString(value.value)}>` : "#<Delay pending>";
    case valueKeywords.lazySeq: {
      const realized = realizeLazySeq(value);
      if (is.nil(realized))
        return "()";
      return valueToString(realized);
    }
    case valueKeywords.cons: {
      const items = consToArray(value);
      const { printLength } = getPrintContext();
      const visible = printLength !== null ? items.slice(0, printLength) : items;
      const suffix = printLength !== null && items.length > printLength ? " ..." : "";
      return `(${visible.map(valueToString).join(" ")}${suffix})`;
    }
    case valueKeywords.namespace:
      return `#namespace[${value.name}]`;
    case "pending":
      if (value.resolved && value.resolvedValue !== undefined)
        return `#<Pending @${valueToString(value.resolvedValue)}>`;
      return "#<Pending>";
    default:
      throw new EvaluationError(`unhandled value type: ${value.kind}`, {
        value
      });
  }
}
function realizeDelay(d) {
  if (d.realized)
    return d.value;
  d.value = d.thunk();
  d.realized = true;
  return d.value;
}
function realizeLazySeq(ls) {
  let current = ls;
  while (current.kind === "lazy-seq") {
    const lazy = current;
    if (lazy.realized) {
      current = lazy.value;
      continue;
    }
    if (lazy.thunk) {
      lazy.value = lazy.thunk();
      lazy.thunk = null;
      lazy.realized = true;
      current = lazy.value;
    } else {
      return { kind: "nil", value: null };
    }
  }
  return current;
}
var toSeq = (collection) => {
  if (is.list(collection)) {
    return collection.value;
  }
  if (is.vector(collection)) {
    return collection.value;
  }
  if (is.map(collection)) {
    return collection.entries.map(([key, value]) => v.vector([key, value]));
  }
  if (is.set(collection)) {
    return collection.values;
  }
  if (collection.kind === "string") {
    return [...collection.value].map(v.string);
  }
  if (is.lazySeq(collection)) {
    const realized = realizeLazySeq(collection);
    if (is.nil(realized))
      return [];
    return toSeq(realized);
  }
  if (is.cons(collection)) {
    return consToArray(collection);
  }
  throw new EvaluationError(`toSeq expects a collection or string, got ${printString(collection)}`, { collection });
};
function consToArray(c) {
  const result = [c.head];
  let tail = c.tail;
  while (true) {
    if (is.nil(tail))
      break;
    if (is.cons(tail)) {
      result.push(tail.head);
      tail = tail.tail;
      continue;
    }
    if (is.lazySeq(tail)) {
      tail = realizeLazySeq(tail);
      continue;
    }
    if (is.list(tail)) {
      result.push(...tail.value);
      break;
    }
    if (is.vector(tail)) {
      result.push(...tail.value);
      break;
    }
    result.push(...toSeq(tail));
    break;
  }
  return result;
}

// src/core/evaluator/destructure.ts
function toSeqSafe(value) {
  if (is.nil(value))
    return [];
  if (is.list(value))
    return value.value;
  if (is.vector(value))
    return value.value;
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value);
    return toSeqSafe(realized);
  }
  if (is.cons(value))
    return consToArray(value);
  throw new EvaluationError(`Cannot destructure ${value.kind} as a sequential collection`, { value });
}
function seqFirst(value) {
  if (is.nil(value))
    return v.nil();
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value);
    return is.nil(realized) ? v.nil() : seqFirst(realized);
  }
  if (is.cons(value))
    return value.head;
  if (is.list(value) || is.vector(value))
    return value.value.length > 0 ? value.value[0] : v.nil();
  return v.nil();
}
function seqRest(value) {
  if (is.nil(value))
    return v.list([]);
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value);
    return is.nil(realized) ? v.list([]) : seqRest(realized);
  }
  if (is.cons(value))
    return value.tail;
  if (is.list(value))
    return v.list(value.value.slice(1));
  if (is.vector(value))
    return v.list(value.value.slice(1));
  return v.list([]);
}
function seqIsEmpty(value) {
  if (is.nil(value))
    return true;
  if (is.lazySeq(value)) {
    const realized = realizeLazySeq(value);
    return seqIsEmpty(realized);
  }
  if (is.cons(value))
    return false;
  if (is.list(value) || is.vector(value))
    return value.value.length === 0;
  return true;
}
function isLazy(value) {
  return is.lazySeq(value) || is.cons(value);
}
function findMapEntry(map, key) {
  const entry = map.entries.find(([k]) => is.equal(k, key));
  return entry ? entry[1] : undefined;
}
function mapContainsKey(map, key) {
  return map.entries.some(([k]) => is.equal(k, key));
}
function destructureVector(pattern, value, ctx, env) {
  const pairs = [];
  const elems = [...pattern];
  const asIdx = elems.findIndex((e) => is.keyword(e) && e.name === ":as");
  if (asIdx !== -1) {
    const asSym = elems[asIdx + 1];
    if (!asSym || !is.symbol(asSym)) {
      throw new EvaluationError(":as must be followed by a symbol", { pattern });
    }
    pairs.push([asSym.name, value]);
    elems.splice(asIdx, 2);
  }
  const ampIdx = elems.findIndex((e) => is.symbol(e) && e.name === "&");
  let restPattern = null;
  let positionalCount;
  if (ampIdx !== -1) {
    restPattern = elems[ampIdx + 1];
    if (!restPattern) {
      throw new EvaluationError("& must be followed by a binding pattern", {
        pattern
      });
    }
    positionalCount = ampIdx;
    elems.splice(ampIdx);
  } else {
    positionalCount = elems.length;
  }
  if (isLazy(value)) {
    let current = value;
    for (let i = 0;i < positionalCount; i++) {
      pairs.push(...destructureBindings(elems[i], seqFirst(current), ctx, env));
      current = seqRest(current);
    }
    if (restPattern !== null) {
      if (is.map(restPattern) && !seqIsEmpty(current)) {
        const restArgs = toSeqSafe(current);
        const entries = [];
        for (let i = 0;i < restArgs.length; i += 2) {
          entries.push([restArgs[i], restArgs[i + 1] ?? v.nil()]);
        }
        pairs.push(...destructureBindings(restPattern, { kind: "map", entries }, ctx, env));
      } else {
        const restValue = seqIsEmpty(current) ? v.nil() : current;
        pairs.push(...destructureBindings(restPattern, restValue, ctx, env));
      }
    }
  } else {
    const seq = toSeqSafe(value);
    for (let i = 0;i < positionalCount; i++) {
      pairs.push(...destructureBindings(elems[i], seq[i] ?? v.nil(), ctx, env));
    }
    if (restPattern !== null) {
      const restArgs = seq.slice(positionalCount);
      let restValue;
      if (is.map(restPattern) && restArgs.length > 0) {
        const entries = [];
        for (let i = 0;i < restArgs.length; i += 2) {
          entries.push([restArgs[i], restArgs[i + 1] ?? v.nil()]);
        }
        restValue = { kind: "map", entries };
      } else {
        restValue = restArgs.length > 0 ? v.list(restArgs) : v.nil();
      }
      pairs.push(...destructureBindings(restPattern, restValue, ctx, env));
    }
  }
  return pairs;
}
function destructureMap(pattern, value, ctx, env) {
  const pairs = [];
  const orMapVal = findMapEntry(pattern, v.keyword(":or"));
  const orMap = orMapVal && is.map(orMapVal) ? orMapVal : null;
  const asVal = findMapEntry(pattern, v.keyword(":as"));
  const isNil2 = is.nil(value);
  if (!is.map(value) && !isNil2) {
    throw new EvaluationError(`Cannot destructure ${value.kind} as a map`, {
      value,
      pattern
    }, getPos(pattern));
  }
  const targetMap = isNil2 ? v.map([]) : value;
  for (const [key, val] of pattern.entries) {
    if (is.keyword(key) && key.name === ":or")
      continue;
    if (is.keyword(key) && key.name === ":as")
      continue;
    if (is.keyword(key) && key.name === ":keys") {
      if (!is.vector(val)) {
        throw new EvaluationError(":keys must be followed by a vector of symbols", { pattern }, getPos(val) ?? getPos(pattern));
      }
      for (const sym of val.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(":keys vector must contain symbols", {
            pattern,
            sym
          }, getPos(sym) ?? getPos(val));
        }
        const slashIdx = sym.name.indexOf("/");
        const localName = slashIdx !== -1 ? sym.name.slice(slashIdx + 1) : sym.name;
        const lookupKey = v.keyword(":" + sym.name);
        const present2 = mapContainsKey(targetMap, lookupKey);
        const entry2 = present2 ? findMapEntry(targetMap, lookupKey) : undefined;
        let result;
        if (present2) {
          result = entry2;
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, v.symbol(localName));
          result = orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil();
        } else {
          result = v.nil();
        }
        pairs.push([localName, result]);
      }
      continue;
    }
    if (is.keyword(key) && key.name === ":strs") {
      if (!is.vector(val)) {
        throw new EvaluationError(":strs must be followed by a vector of symbols", { pattern }, getPos(val) ?? getPos(pattern));
      }
      for (const sym of val.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(":strs vector must contain symbols", {
            pattern,
            sym
          }, getPos(sym) ?? getPos(val));
        }
        const lookupKey = v.string(sym.name);
        const present2 = mapContainsKey(targetMap, lookupKey);
        const entry2 = present2 ? findMapEntry(targetMap, lookupKey) : undefined;
        let result;
        if (present2) {
          result = entry2;
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, v.symbol(sym.name));
          result = orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil();
        } else {
          result = v.nil();
        }
        pairs.push([sym.name, result]);
      }
      continue;
    }
    if (is.keyword(key) && key.name === ":syms") {
      if (!is.vector(val)) {
        throw new EvaluationError(":syms must be followed by a vector of symbols", { pattern }, getPos(val) ?? getPos(pattern));
      }
      for (const sym of val.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(":syms vector must contain symbols", {
            pattern,
            sym
          }, getPos(sym) ?? getPos(val));
        }
        const lookupKey = v.symbol(sym.name);
        const present2 = mapContainsKey(targetMap, lookupKey);
        const entry2 = present2 ? findMapEntry(targetMap, lookupKey) : undefined;
        let result;
        if (present2) {
          result = entry2;
        } else if (orMap) {
          const orDefault = findMapEntry(orMap, v.symbol(sym.name));
          result = orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil();
        } else {
          result = v.nil();
        }
        pairs.push([sym.name, result]);
      }
      continue;
    }
    const entry = findMapEntry(targetMap, val);
    const present = mapContainsKey(targetMap, val);
    let boundVal;
    if (present) {
      boundVal = entry;
    } else if (orMap && is.symbol(key)) {
      const orDefault = findMapEntry(orMap, v.symbol(key.name));
      boundVal = orDefault !== undefined ? ctx.evaluate(orDefault, env) : v.nil();
    } else {
      boundVal = v.nil();
    }
    pairs.push(...destructureBindings(key, boundVal, ctx, env));
  }
  if (asVal && is.symbol(asVal)) {
    pairs.push([asVal.name, value]);
  }
  return pairs;
}
function destructureBindings(pattern, value, ctx, env) {
  if (is.symbol(pattern)) {
    return [[pattern.name, value]];
  }
  if (is.vector(pattern)) {
    return destructureVector(pattern.value, value, ctx, env);
  }
  if (is.map(pattern)) {
    return destructureMap(pattern, value, ctx, env);
  }
  throw new EvaluationError(`Invalid destructuring pattern: expected symbol, vector, or map, got ${pattern.kind}`, { pattern }, getPos(pattern));
}

// src/core/evaluator/arity.ts
var REST_SYMBOL = "&";

class RecurSignal {
  args;
  constructor(args) {
    this.args = args;
  }
}
function parseParamVector(args, env) {
  const ampIdx = args.value.findIndex((a) => is.symbol(a) && a.name === REST_SYMBOL);
  let params = [];
  let restParam = null;
  if (ampIdx === -1) {
    params = args.value;
  } else {
    const ampsCount = args.value.filter((a) => is.symbol(a) && a.name === REST_SYMBOL).length;
    if (ampsCount > 1) {
      throw new EvaluationError(`${REST_SYMBOL} can only appear once`, {
        args,
        env
      }, getPos(args));
    }
    if (ampIdx !== args.value.length - 2) {
      throw new EvaluationError(`${REST_SYMBOL} must be second-to-last argument`, {
        args,
        env
      }, getPos(args));
    }
    params = args.value.slice(0, ampIdx);
    restParam = args.value[ampIdx + 1];
  }
  return { params, restParam };
}
function parseArities(forms, env) {
  if (forms.length === 0) {
    throw new EvaluationError("fn/defmacro requires at least a parameter vector", {
      forms,
      env
    });
  }
  if (is.vector(forms[0])) {
    const paramVec = forms[0];
    const { params, restParam } = parseParamVector(paramVec, env);
    return [{ params, restParam, body: forms.slice(1) }];
  }
  if (is.list(forms[0])) {
    const arities = [];
    for (const form of forms) {
      if (!is.list(form) || form.value.length === 0) {
        throw new EvaluationError("Multi-arity clause must be a list starting with a parameter vector", { form, env }, getPos(form));
      }
      const paramVec = form.value[0];
      if (!is.vector(paramVec)) {
        throw new EvaluationError("First element of arity clause must be a parameter vector", { paramVec, env }, getPos(paramVec) ?? getPos(form));
      }
      const { params, restParam } = parseParamVector(paramVec, env);
      arities.push({ params, restParam, body: form.value.slice(1) });
    }
    const variadicCount = arities.filter((a) => a.restParam !== null).length;
    if (variadicCount > 1) {
      throw new EvaluationError("At most one variadic arity is allowed per function", { forms, env });
    }
    return arities;
  }
  throw new EvaluationError("fn/defmacro expects a parameter vector or arity clauses", { forms, env }, getPos(forms[0]));
}
function bindParams(params, restParam, args, outerEnv, ctx, bindEnv) {
  if (restParam === null) {
    if (args.length !== params.length) {
      throw new EvaluationError(`Arguments length mismatch: fn accepts ${params.length} arguments, but ${args.length} were provided`, { params, args, outerEnv });
    }
  } else {
    if (args.length < params.length) {
      throw new EvaluationError(`Arguments length mismatch: fn expects at least ${params.length} arguments, but ${args.length} were provided`, { params, args, outerEnv });
    }
  }
  const allPairs = [];
  for (let i = 0;i < params.length; i++) {
    allPairs.push(...destructureBindings(params[i], args[i], ctx, bindEnv));
  }
  if (restParam !== null) {
    const restArgs = args.slice(params.length);
    let restValue;
    if (is.map(restParam) && restArgs.length > 0) {
      const entries = [];
      for (let i = 0;i < restArgs.length; i += 2) {
        entries.push([restArgs[i], restArgs[i + 1] ?? cljNil()]);
      }
      restValue = { kind: "map", entries };
    } else {
      restValue = restArgs.length > 0 ? cljList(restArgs) : cljNil();
    }
    allPairs.push(...destructureBindings(restParam, restValue, ctx, bindEnv));
  }
  return extend(allPairs.map(([n]) => n), allPairs.map(([, v2]) => v2), outerEnv);
}
function resolveArity(arities, argCount) {
  const exactMatch = arities.find((a) => a.restParam === null && a.params.length === argCount);
  if (exactMatch)
    return exactMatch;
  const variadicMatch = arities.find((a) => a.restParam !== null && argCount >= a.params.length);
  if (variadicMatch)
    return variadicMatch;
  const counts = arities.map((a) => a.restParam ? `${a.params.length}+` : `${a.params.length}`);
  throw new EvaluationError(`No matching arity for ${argCount} arguments. Available arities: ${counts.join(", ")}`, { arities, argCount });
}

// src/core/evaluator/js-interop.ts
function jsToClj2(raw) {
  if (raw === null)
    return v.nil();
  if (raw === undefined)
    return v.jsValue(undefined);
  if (typeof raw === "number")
    return v.number(raw);
  if (typeof raw === "string")
    return v.string(raw);
  if (typeof raw === "boolean")
    return v.boolean(raw);
  return v.jsValue(raw);
}
function mapKeyToString(key) {
  if (is.string(key))
    return key.value;
  if (is.keyword(key))
    return key.name.slice(1);
  if (is.number(key))
    return String(key.value);
  if (is.boolean(key))
    return String(key.value);
  throw new EvaluationError(`cljToJs: map key must be a string, keyword, number, or boolean — ` + `got ${key.kind} (rich keys are not allowed as JS object keys; reduce to a primitive first)`, { key });
}
function cljToJs2(val, ctx, callEnv) {
  switch (val.kind) {
    case "js-value":
      return val.value;
    case "number":
      return val.value;
    case "string":
      return val.value;
    case "boolean":
      return val.value;
    case "nil":
      return null;
    case "keyword":
      return val.name.slice(1);
    case "function":
    case "native-function": {
      const fn = val;
      return (...jsArgs) => {
        const cljArgs = jsArgs.map(jsToClj2);
        const result = ctx.applyCallable(fn, cljArgs, callEnv);
        return cljToJs2(result, ctx, callEnv);
      };
    }
    case "list":
    case "vector":
      return val.value.map((v2) => cljToJs2(v2, ctx, callEnv));
    case "map": {
      const obj = {};
      for (const [key, value] of val.entries) {
        obj[mapKeyToString(key)] = cljToJs2(value, ctx, callEnv);
      }
      return obj;
    }
    default:
      throw new EvaluationError(`cannot convert ${val.kind} to JS value — no coercion defined`, { val });
  }
}
function extractRawTarget(target, targetForm) {
  switch (target.kind) {
    case "js-value":
      return target.value;
    case "string":
    case "number":
    case "boolean":
      return target.value;
    default:
      throw new EvaluationError(`cannot use . on ${target.kind}`, { target }, getPos(targetForm));
  }
}
function evaluateDot(list, env, ctx) {
  if (list.value.length < 3) {
    throw new EvaluationError(". requires at least 2 arguments: (. obj prop)", {
      list
    }, getPos(list));
  }
  const targetForm = list.value[1];
  const target = ctx.evaluate(targetForm, env);
  const rawTarget = extractRawTarget(target, targetForm);
  if (rawTarget === null || rawTarget === undefined) {
    const label = rawTarget === null ? "null" : "undefined";
    throw new EvaluationError(`cannot use . on ${label} js value — check for nil/undefined before accessing properties`, { target }, getPos(targetForm));
  }
  const propForm = list.value[2];
  if (!is.symbol(propForm)) {
    throw new EvaluationError(`. expects a symbol for property name, got: ${propForm.kind}`, { propForm }, getPos(propForm) ?? getPos(list));
  }
  const propName = propForm.name;
  const rawObj = rawTarget;
  if (list.value.length === 3) {
    const rawProp = rawObj[propName];
    if (typeof rawProp === "function") {
      return v.jsValue(rawProp.bind(rawObj));
    }
    return jsToClj2(rawProp);
  }
  const method = rawObj[propName];
  if (typeof method !== "function") {
    throw new EvaluationError(`method '${propName}' is not callable on ${String(rawObj)}`, { propName, rawObj }, getPos(propForm));
  }
  const cljArgs = list.value.slice(3).map((a) => ctx.evaluate(a, env));
  const jsArgs = cljArgs.map((a) => cljToJs2(a, ctx, env));
  const rawResult = method.apply(rawObj, jsArgs);
  return jsToClj2(rawResult);
}
function evaluateNew(list, env, ctx) {
  if (list.value.length < 2) {
    throw new EvaluationError("js/new requires a constructor argument", {
      list
    }, getPos(list));
  }
  const cls = ctx.evaluate(list.value[1], env);
  if (!is.jsValue(cls) || typeof cls.value !== "function") {
    throw new EvaluationError(`js/new: expected js-value constructor, got ${cls.kind}`, { cls }, getPos(list.value[1]) ?? getPos(list));
  }
  const cljArgs = list.value.slice(2).map((a) => ctx.evaluate(a, env));
  const jsArgs = cljArgs.map((a) => cljToJs2(a, ctx, env));
  const ctor = cls.value;
  return v.jsValue(new ctor(...jsArgs));
}

// src/core/evaluator/apply.ts
function applyFunctionWithContext(fn, args, ctx, callEnv) {
  if (fn.kind === valueKeywords.nativeFunction) {
    if (fn.fnWithContext) {
      return fn.fnWithContext(ctx, callEnv, ...args);
    }
    return fn.fn(...args);
  }
  if (fn.kind === valueKeywords.function) {
    const arity = resolveArity(fn.arities, args.length);
    if (arity.compiledBody && arity.paramSlots) {
      const slots = arity.paramSlots;
      const savedValues = new Array(slots.length);
      for (let i = 0;i < slots.length; i++) {
        savedValues[i] = slots[i].value;
        slots[i].value = args[i];
      }
      try {
        return arity.compiledBody(fn.env, ctx);
      } finally {
        for (let i = 0;i < slots.length; i++) {
          slots[i].value = savedValues[i];
        }
      }
    }
    let currentArgs = args;
    while (true) {
      const localEnv = bindParams(arity.params, arity.restParam, currentArgs, fn.env, ctx, callEnv);
      try {
        if (arity.compiledBody) {
          return arity.compiledBody(localEnv, ctx);
        }
        return ctx.evaluateForms(arity.body, localEnv);
      } catch (e) {
        if (e instanceof RecurSignal) {
          currentArgs = e.args;
          continue;
        }
        throw e;
      }
    }
  }
  throw new EvaluationError(`${fn.kind} is not a callable function`, {
    fn,
    args
  });
}
function applyMacroWithContext(macro, rawArgs, ctx) {
  const arity = resolveArity(macro.arities, rawArgs.length);
  const localEnv = bindParams(arity.params, arity.restParam, rawArgs, macro.env, ctx, macro.env);
  return ctx.evaluateForms(arity.body, localEnv);
}
function applyCallableWithContext(fn, args, ctx, callEnv) {
  if (is.aFunction(fn)) {
    return applyFunctionWithContext(fn, args, ctx, callEnv);
  }
  if (is.jsValue(fn)) {
    if (typeof fn.value !== valueKeywords.function) {
      throw new EvaluationError(`js-value is not callable: ${typeof fn.value}`, { fn, args });
    }
    const jsArgs = args.map((a) => cljToJs2(a, ctx, callEnv));
    const rawResult = fn.value(...jsArgs);
    return jsToClj2(rawResult);
  }
  if (is.keyword(fn)) {
    const target = args[0];
    const defaultVal = args.length > 1 ? args[1] : cljNil();
    if (is.map(target)) {
      const entry = target.entries.find(([k]) => is.equal(k, fn));
      return entry ? entry[1] : defaultVal;
    }
    return defaultVal;
  }
  if (is.map(fn)) {
    if (args.length === 0) {
      throw new EvaluationError("Map used as function requires at least one argument", { fn, args });
    }
    const key = args[0];
    const defaultVal = args.length > 1 ? args[1] : cljNil();
    const entry = fn.entries.find(([k]) => is.equal(k, key));
    return entry ? entry[1] : defaultVal;
  }
  if (is.set(fn)) {
    if (args.length === 0) {
      throw new EvaluationError("Set used as function requires at least one argument", { fn, args });
    }
    const key = args[0];
    const found = fn.values.some((v2) => is.equal(v2, key));
    return found ? key : cljNil();
  }
  if (is.var(fn)) {
    return applyCallableWithContext(fn.value, args, ctx, callEnv);
  }
  throw new EvaluationError(`${printString(fn)} is not a callable value`, {
    fn,
    args
  });
}

// src/core/gensym.ts
var _counter = 0;
function makeGensym(prefix = "G") {
  return `${prefix}__${_counter++}`;
}

// src/core/evaluator/quasiquote.ts
function isUnquoteSplicing(elem) {
  return is.list(elem) && elem.value.length === 2 && is.symbol(elem.value[0]) && elem.value[0].name === "unquote-splicing";
}
function buildConcatSegments(elems, autoGensyms) {
  const segments = [];
  let chunk = [];
  for (const elem of elems) {
    if (isUnquoteSplicing(elem)) {
      if (chunk.length > 0) {
        segments.push(v.list([v.symbol("list"), ...chunk]));
        chunk = [];
      }
      segments.push(elem.value[1]);
    } else {
      chunk.push(expandQuasiquote(elem, autoGensyms));
    }
  }
  if (chunk.length > 0) {
    segments.push(v.list([v.symbol("list"), ...chunk]));
  }
  return segments;
}
function expandQuasiquote(form, autoGensyms = new Map) {
  switch (form.kind) {
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
      return form;
    case valueKeywords.symbol: {
      if (form.name.endsWith("#")) {
        if (!autoGensyms.has(form.name)) {
          autoGensyms.set(form.name, makeGensym(form.name.slice(0, -1)));
        }
        return v.list([v.symbol("quote"), v.symbol(autoGensyms.get(form.name))]);
      }
      return v.list([v.symbol("quote"), form]);
    }
    case valueKeywords.list: {
      if (form.value.length === 2 && is.symbol(form.value[0]) && form.value[0].name === "unquote") {
        return form.value[1];
      }
      const hasSplice = form.value.some(isUnquoteSplicing);
      if (!hasSplice) {
        return v.list([
          v.symbol("list"),
          ...form.value.map((e) => expandQuasiquote(e, autoGensyms))
        ]);
      }
      const segs = buildConcatSegments(form.value, autoGensyms);
      return v.list([
        v.symbol("apply"),
        v.symbol("list"),
        v.list([v.symbol("concat*"), ...segs])
      ]);
    }
    case valueKeywords.vector: {
      const hasSplice = form.value.some(isUnquoteSplicing);
      if (!hasSplice) {
        return v.list([
          v.symbol("vector"),
          ...form.value.map((e) => expandQuasiquote(e, autoGensyms))
        ]);
      }
      const segs = buildConcatSegments(form.value, autoGensyms);
      return v.list([
        v.symbol("apply"),
        v.symbol("vector"),
        v.list([v.symbol("concat*"), ...segs])
      ]);
    }
    case valueKeywords.map: {
      const args = [];
      for (const [key, value] of form.entries) {
        args.push(expandQuasiquote(key, autoGensyms));
        args.push(expandQuasiquote(value, autoGensyms));
      }
      return v.list([v.symbol("hash-map"), ...args]);
    }
    case valueKeywords.set: {
      const hasSplice = form.values.some(isUnquoteSplicing);
      if (!hasSplice) {
        return v.list([
          v.symbol("hash-set"),
          ...form.values.map((e) => expandQuasiquote(e, autoGensyms))
        ]);
      }
      const segs = buildConcatSegments(form.values, autoGensyms);
      return v.list([
        v.symbol("apply"),
        v.symbol("hash-set"),
        v.list([v.symbol("concat*"), ...segs])
      ]);
    }
    default:
      throw new EvaluationError(`Unexpected form in quasiquote: ${form.kind}`, {
        form
      });
  }
}

// src/core/evaluator/expand.ts
function macroExpandAllWithContext(form, env, ctx) {
  if (is.vector(form)) {
    const expanded2 = form.value.map((sub) => macroExpandAllWithContext(sub, env, ctx));
    return expanded2.every((e, i) => e === form.value[i]) ? form : v.vector(expanded2);
  }
  if (is.map(form)) {
    const expanded2 = form.entries.map(([k, v2]) => [
      macroExpandAllWithContext(k, env, ctx),
      macroExpandAllWithContext(v2, env, ctx)
    ]);
    return expanded2.every(([k, v2], i) => k === form.entries[i][0] && v2 === form.entries[i][1]) ? form : v.map(expanded2);
  }
  if (is.cons(form) || is.lazySeq(form)) {
    return macroExpandAllWithContext(v.list(toSeq(form)), env, ctx);
  }
  if (!is.list(form))
    return form;
  if (form.value.length === 0)
    return form;
  const first = form.value[0];
  if (!is.symbol(first)) {
    const expanded2 = form.value.map((sub) => macroExpandAllWithContext(sub, env, ctx));
    return expanded2.every((e, i) => e === form.value[i]) ? form : v.list(expanded2);
  }
  const name = first.name;
  if (name === "quote")
    return form;
  if (name === "quasiquote") {
    const expanded2 = expandQuasiquote(form.value[1]);
    return macroExpandAllWithContext(expanded2, env, ctx);
  }
  let macroOrUnknown;
  const slashIdx = name.indexOf("/");
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const nsPrefix = name.slice(0, slashIdx);
    const localName = name.slice(slashIdx + 1);
    const nsEnv = getNamespaceEnv(env);
    const targetNs = nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null;
    if (targetNs) {
      const v2 = targetNs.vars.get(localName);
      macroOrUnknown = v2 !== undefined ? derefValue(v2) : undefined;
    }
  } else {
    macroOrUnknown = tryLookup(name, env);
  }
  if (macroOrUnknown !== undefined && is.macro(macroOrUnknown)) {
    const expanded2 = ctx.applyMacro(macroOrUnknown, form.value.slice(1));
    return macroExpandAllWithContext(expanded2, env, ctx);
  }
  const expanded = form.value.map((sub) => macroExpandAllWithContext(sub, env, ctx));
  return expanded.every((e, i) => e === form.value[i]) ? form : v.list(expanded);
}

// src/core/evaluator/recur-check.ts
function assertRecurInTailPosition(body) {
  validateForms(body, true);
}
function isRecurForm(form) {
  return is.list(form) && form.value.length >= 1 && is.symbol(form.value[0]) && form.value[0].name === specialFormKeywords.recur;
}
function validateForms(forms, inTail) {
  for (let i = 0;i < forms.length; i++) {
    validateForm(forms[i], inTail && i === forms.length - 1);
  }
}
function validateForm(form, inTail) {
  if (!is.list(form))
    return;
  if (isRecurForm(form)) {
    if (!inTail) {
      throw new EvaluationError("Can only recur from tail position", { form }, getPos(form));
    }
    return;
  }
  if (form.value.length === 0)
    return;
  const first = form.value[0];
  if (!is.symbol(first)) {
    for (const sub of form.value)
      validateForm(sub, false);
    return;
  }
  const name = first.name;
  if (name === "fn" || name === specialFormKeywords["fn*"] || name === "loop" || name === specialFormKeywords["loop*"] || name === specialFormKeywords.quote) {
    return;
  }
  if (name === specialFormKeywords.if) {
    if (form.value[1])
      validateForm(form.value[1], false);
    if (form.value[2])
      validateForm(form.value[2], inTail);
    if (form.value[3])
      validateForm(form.value[3], inTail);
    return;
  }
  if (name === specialFormKeywords.do) {
    validateForms(form.value.slice(1), inTail);
    return;
  }
  if (name === "let" || name === specialFormKeywords["let*"]) {
    const bindings = form.value[1];
    if (is.vector(bindings)) {
      for (let i = 1;i < bindings.value.length; i += 2) {
        validateForm(bindings.value[i], false);
      }
    }
    validateForms(form.value.slice(2), inTail);
    return;
  }
  for (const sub of form.value.slice(1)) {
    validateForm(sub, false);
  }
}

// src/core/compiler/compile-env.ts
function findSlot(symbolName, compileEnv) {
  let current = compileEnv;
  while (current) {
    const slot = current.bindings.get(symbolName);
    if (slot !== undefined)
      return slot;
    current = current.outer;
  }
  return null;
}
function findLoopTarget(compileEnv) {
  if (compileEnv === null)
    return null;
  let current = compileEnv;
  while (current) {
    if (current.loop)
      return current.loop;
    current = current.outer;
  }
  return null;
}

// src/core/evaluator/form-parsers.ts
function validateBindingVector(vec, formName, env) {
  if (!is.vector(vec)) {
    throw new EvaluationError(`${formName} bindings must be a vector`, {
      bindings: vec,
      env
    }, getPos(vec));
  }
  if (vec.value.length % 2 !== 0) {
    throw new EvaluationError(`${formName} bindings must have an even number of forms`, { bindings: vec, env }, getPos(vec));
  }
}
function parseTryStructure(list, env = {}) {
  const forms = list.value.slice(1);
  const bodyForms = [];
  const catchClauses = [];
  let finallyForms = null;
  for (let i = 0;i < forms.length; i++) {
    const form = forms[i];
    if (is.list(form) && form.value.length > 0 && is.symbol(form.value[0])) {
      const head = form.value[0].name;
      if (head === "catch") {
        if (form.value.length < 3) {
          throw new EvaluationError("catch requires a discriminator and a binding symbol", { form, env }, getPos(form));
        }
        const discriminator = form.value[1];
        const bindingSym = form.value[2];
        if (!is.symbol(bindingSym)) {
          throw new EvaluationError("catch binding must be a symbol", {
            form,
            env
          }, getPos(bindingSym) ?? getPos(form));
        }
        catchClauses.push({
          discriminator,
          binding: bindingSym.name,
          body: form.value.slice(3)
        });
        continue;
      }
      if (head === "finally") {
        if (i !== forms.length - 1) {
          throw new EvaluationError("finally clause must be the last in try expression", { form, env }, getPos(form));
        }
        finallyForms = form.value.slice(1);
        continue;
      }
    }
    bodyForms.push(form);
  }
  return { bodyForms, catchClauses, finallyForms };
}
function matchesDiscriminator(discriminator, thrown, env, ctx) {
  let disc;
  try {
    disc = ctx.evaluate(discriminator, env);
  } catch {
    return true;
  }
  if (disc.kind === "symbol")
    return true;
  if (is.keyword(disc)) {
    if (disc.name === ":default")
      return true;
    if (!is.map(thrown))
      return false;
    const typeEntry = thrown.entries.find(([k]) => is.keyword(k) && k.name === ":type");
    if (!typeEntry)
      return false;
    return is.equal(typeEntry[1], disc);
  }
  if (is.aFunction(disc)) {
    const result = ctx.applyFunction(disc, [thrown], env);
    return is.truthy(result);
  }
  throw new EvaluationError("catch discriminator must be a keyword or a predicate function", { discriminator: disc, env });
}

// src/core/compiler/control-flow.ts
var IF_TEST_POS = 1;
var IF_THEN_POS = 2;
var IF_ELSE_POS = 3;
function compileIf(node, compileEnv, compile) {
  const compiledTest = compile(node.value[IF_TEST_POS], compileEnv);
  const compiledThen = compile(node.value[IF_THEN_POS], compileEnv);
  const hasElse = node.value.length > IF_ELSE_POS;
  const compiledElse = hasElse ? compile(node.value[IF_ELSE_POS], compileEnv) : null;
  if (compiledTest === null || compiledThen === null || hasElse && compiledElse === null) {
    return null;
  }
  return (env, ctx) => {
    if (is.truthy(compiledTest(env, ctx))) {
      return compiledThen(env, ctx);
    } else {
      return compiledElse ? compiledElse(env, ctx) : v.nil();
    }
  };
}
function compileTry(node, compileEnv, compile) {
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(node);
  const compiledBody = compileDo(bodyForms, compileEnv, compile);
  if (compiledBody === null)
    return null;
  const compiledClauses = [];
  for (const clause of catchClauses) {
    const catchSlot = { value: null };
    const catchCompileEnv = {
      bindings: new Map([[clause.binding, catchSlot]]),
      outer: compileEnv
    };
    const compiledCatchBody = compileDo(clause.body, catchCompileEnv, compile);
    if (compiledCatchBody === null)
      return null;
    compiledClauses.push({ discriminator: clause.discriminator, catchSlot, compiledCatchBody });
  }
  let compiledFinally = null;
  if (finallyForms !== null && finallyForms.length > 0) {
    compiledFinally = compileDo(finallyForms, compileEnv, compile);
    if (compiledFinally === null)
      return null;
  }
  return (env, ctx) => {
    let result = v.nil();
    let pendingThrow = null;
    try {
      result = compiledBody(env, ctx);
    } catch (e) {
      if (e instanceof RecurSignal)
        throw e;
      let thrownValue;
      if (e instanceof CljThrownSignal) {
        thrownValue = e.value;
      } else if (e instanceof EvaluationError) {
        const entries = [
          [v.keyword(":type"), v.keyword(":error/runtime")],
          [v.keyword(":message"), v.string(e.message)]
        ];
        if (e.frames && e.frames.length > 0) {
          entries.push([v.keyword(":frames"), framesToClj(e.frames)]);
        }
        thrownValue = v.map(entries);
      } else {
        throw e;
      }
      let handled = false;
      for (const { discriminator, catchSlot, compiledCatchBody } of compiledClauses) {
        if (matchesDiscriminator(discriminator, thrownValue, env, ctx)) {
          catchSlot.value = thrownValue;
          result = compiledCatchBody(env, ctx);
          handled = true;
          break;
        }
      }
      if (!handled) {
        pendingThrow = e;
      }
    } finally {
      if (compiledFinally !== null) {
        compiledFinally(env, ctx);
      }
    }
    if (pendingThrow !== null)
      throw pendingThrow;
    return result;
  };
}
function compileDo(node, compileEnv, compile) {
  const compiledForms = [];
  for (const form of node) {
    const compiled = compile(form, compileEnv);
    if (compiled === null)
      return null;
    compiledForms.push(compiled);
  }
  if (compiledForms.length === 1)
    return compiledForms[0];
  return (env, ctx) => {
    let result = v.nil();
    for (const compiled of compiledForms) {
      result = compiled(env, ctx);
    }
    return result;
  };
}

// src/core/compiler/binding.ts
var BINDINGS_POS = 1;
var BODY_START_POS = 2;
function compileLet(node, compileEnv, compile) {
  const bindings = node.value[BINDINGS_POS];
  if (!is.vector(bindings) || bindings.value.length % 2 !== 0)
    return null;
  let currentCompileEnv = compileEnv;
  const slotInits = [];
  for (let i = 0;i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i];
    if (!is.symbol(pattern))
      return null;
    const slot = { value: null };
    const compiledInit = compile(bindings.value[i + 1], currentCompileEnv);
    if (compiledInit === null)
      return null;
    slotInits.push([slot, compiledInit]);
    currentCompileEnv = {
      bindings: new Map([[pattern.name, slot]]),
      outer: currentCompileEnv
    };
  }
  const body = node.value.slice(BODY_START_POS);
  const compiledBody = compileDo(body, currentCompileEnv, compile);
  if (compiledBody === null)
    return null;
  return (env, ctx) => {
    const prevSlotValues = slotInits.map(([slot]) => slot.value);
    for (const [slot, compiledInit] of slotInits) {
      slot.value = compiledInit(env, ctx);
    }
    const result = compiledBody(env, ctx);
    slotInits.forEach(([slot], index) => {
      slot.value = prevSlotValues[index];
    });
    return result;
  };
}
function compileLoop(node, compileEnv, compile) {
  const bindings = node.value[BINDINGS_POS];
  if (!is.vector(bindings) || bindings.value.length % 2 !== 0)
    return null;
  const body = node.value.slice(BODY_START_POS);
  assertRecurInTailPosition(body);
  let currentCompileEnv = compileEnv;
  const slotInits = [];
  const namedSlots = [];
  for (let i = 0;i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i];
    if (!is.symbol(pattern))
      return null;
    const compiledInit = compile(bindings.value[i + 1], currentCompileEnv);
    if (compiledInit === null)
      return null;
    const slot = { value: null };
    slotInits.push([slot, compiledInit]);
    namedSlots.push([pattern.name, slot]);
    currentCompileEnv = {
      bindings: new Map([[pattern.name, slot]]),
      outer: currentCompileEnv
    };
  }
  const slots = slotInits.map((entry) => entry[0]);
  const recurTarget = { args: null };
  const loopCompileEnv = {
    bindings: new Map(namedSlots),
    outer: compileEnv,
    loop: {
      slots,
      recurTarget
    }
  };
  const compiledBody = compileDo(body, loopCompileEnv, compile);
  if (compiledBody === null)
    return null;
  return (env, ctx) => {
    for (const [slot, compiledInit] of slotInits) {
      slot.value = compiledInit(env, ctx);
    }
    while (true) {
      recurTarget.args = null;
      const result = compiledBody(env, ctx);
      if (recurTarget.args !== null) {
        for (let i = 0;i < slots.length; i++) {
          slots[i].value = recurTarget.args[i];
        }
      } else {
        return result;
      }
    }
  };
}
function compileRecur(node, compileEnv, compile) {
  const loopInfo = findLoopTarget(compileEnv);
  if (loopInfo === null)
    return null;
  const { recurTarget, slots } = loopInfo;
  const argForms = node.value.slice(BINDINGS_POS);
  if (argForms.length !== slots.length)
    return null;
  const compiledArgs = [];
  for (const arg of argForms) {
    const compiled = compile(arg, compileEnv);
    if (compiled === null)
      return null;
    compiledArgs.push(compiled);
  }
  return (env, ctx) => {
    const newArgs = compiledArgs.map((compiledArg) => compiledArg(env, ctx));
    recurTarget.args = newArgs;
    return v.nil();
  };
}
function compileFnBody(params, body, compile) {
  const paramSlots = params.map(() => ({ value: null }));
  const recurTarget = { args: null };
  const fnCompileEnv = {
    bindings: new Map(params.map((p, i) => [p.name, paramSlots[i]])),
    outer: null,
    loop: { slots: paramSlots, recurTarget }
  };
  const innerCompiled = compileDo(body, fnCompileEnv, compile);
  if (innerCompiled === null)
    return null;
  const compiledBody = (env, ctx) => {
    while (true) {
      recurTarget.args = null;
      const result = innerCompiled(env, ctx);
      if (recurTarget.args !== null) {
        for (let i = 0;i < paramSlots.length; i++) {
          paramSlots[i].value = recurTarget.args[i];
        }
      } else {
        return result;
      }
    }
  };
  return { compiledBody, paramSlots };
}

// src/core/evaluator/async-evaluator.ts
function createAsyncEvalCtx(syncCtx) {
  const asyncCtx = {
    syncCtx,
    evaluate: (expr, env) => evaluateFormAsync(expr, env, asyncCtx),
    evaluateForms: (forms, env) => evaluateFormsAsync(forms, env, asyncCtx),
    applyCallable: (fn, args, callEnv) => applyCallableAsync(fn, args, callEnv, asyncCtx)
  };
  return asyncCtx;
}
async function evaluateFormAsync(expr, env, asyncCtx) {
  switch (expr.kind) {
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.symbol:
    case valueKeywords.function:
    case valueKeywords.nativeFunction:
    case valueKeywords.macro:
    case valueKeywords.multiMethod:
    case valueKeywords.atom:
    case valueKeywords.reduced:
    case valueKeywords.volatile:
    case valueKeywords.regex:
    case valueKeywords.var:
    case valueKeywords.delay:
    case valueKeywords.lazySeq:
    case valueKeywords.cons:
    case valueKeywords.namespace:
    case valueKeywords.pending:
      return asyncCtx.syncCtx.evaluate(expr, env);
  }
  if (is.vector(expr)) {
    const elements = [];
    for (const el of expr.value) {
      elements.push(await evaluateFormAsync(el, env, asyncCtx));
    }
    return v.vector(elements);
  }
  if (is.map(expr)) {
    const entries = [];
    for (const [k, v2] of expr.entries) {
      const ek = await evaluateFormAsync(k, env, asyncCtx);
      const ev = await evaluateFormAsync(v2, env, asyncCtx);
      entries.push([ek, ev]);
    }
    return v.map(entries);
  }
  if (is.set(expr)) {
    const elements = [];
    for (const el of expr.values) {
      elements.push(await evaluateFormAsync(el, env, asyncCtx));
    }
    return v.set(elements);
  }
  if (is.list(expr)) {
    return evaluateListAsync(expr, env, asyncCtx);
  }
  return asyncCtx.syncCtx.evaluate(expr, env);
}
async function evaluateFormsAsync(forms, env, asyncCtx) {
  let result = v.nil();
  for (const form of forms) {
    const expanded = asyncCtx.syncCtx.expandAll(form, env);
    result = await evaluateFormAsync(expanded, env, asyncCtx);
  }
  return result;
}
var ASYNC_SPECIAL_FORMS = new Set([
  "quote",
  "def",
  "if",
  "do",
  "let",
  "let*",
  "fn",
  "fn*",
  "loop",
  "loop*",
  "recur",
  "binding",
  "set!",
  "try",
  "var",
  "defmacro",
  "letfn*",
  "lazy-seq",
  "ns",
  "async",
  ".",
  "js/new"
]);
async function evaluateListAsync(list, env, asyncCtx) {
  if (list.value.length === 0)
    return list;
  const head = list.value[0];
  if (is.symbol(head) && ASYNC_SPECIAL_FORMS.has(head.name)) {
    return evaluateSpecialFormAsync(head.name, list, env, asyncCtx);
  }
  const fn = await evaluateFormAsync(head, env, asyncCtx);
  if (is.aFunction(fn) && fn.name === "deref" && list.value.length === 2) {
    const val = await evaluateFormAsync(list.value[1], env, asyncCtx);
    if (is.pending(val)) {
      return val.promise;
    }
    return asyncCtx.syncCtx.applyCallable(fn, [val], env);
  }
  const args = [];
  for (const arg of list.value.slice(1)) {
    args.push(await evaluateFormAsync(arg, env, asyncCtx));
  }
  return applyCallableAsync(fn, args, env, asyncCtx);
}
async function evaluateSpecialFormAsync(name, list, env, asyncCtx) {
  switch (name) {
    case specialFormKeywords.quote:
    case specialFormKeywords.var:
    case specialFormKeywords.ns:
    case "fn":
    case "fn*":
      return asyncCtx.syncCtx.evaluate(list, env);
    case specialFormKeywords.recur: {
      const args = [];
      for (const arg of list.value.slice(1)) {
        args.push(await evaluateFormAsync(arg, env, asyncCtx));
      }
      throw new RecurSignal(args);
    }
    case specialFormKeywords.do:
      return evaluateFormsAsync(list.value.slice(1), env, asyncCtx);
    case specialFormKeywords.def:
      throw new EvaluationError("def inside (async ...) is not supported. Define vars outside the async block.", { list, env });
    case specialFormKeywords.if: {
      const condition = await evaluateFormAsync(list.value[1], env, asyncCtx);
      const isTruthy2 = !is.nil(condition) && !(is.boolean(condition) && !condition.value);
      if (isTruthy2) {
        return evaluateFormAsync(list.value[2], env, asyncCtx);
      }
      return list.value[3] !== undefined ? evaluateFormAsync(list.value[3], env, asyncCtx) : v.nil();
    }
    case "let": {
      const expanded = asyncCtx.syncCtx.expandAll(list, env);
      return evaluateFormAsync(expanded, env, asyncCtx);
    }
    case specialFormKeywords["let*"]:
      return evaluateLetAsync(list, env, asyncCtx);
    case "loop": {
      const expanded = asyncCtx.syncCtx.expandAll(list, env);
      return evaluateFormAsync(expanded, env, asyncCtx);
    }
    case specialFormKeywords["loop*"]:
      return evaluateLoopAsync(list, env, asyncCtx);
    case specialFormKeywords.binding:
      return evaluateBindingAsync(list, env, asyncCtx);
    case specialFormKeywords.try:
      return evaluateTryAsync(list, env, asyncCtx);
    case specialFormKeywords["set!"]: {
      const newVal = await evaluateFormAsync(list.value[2], env, asyncCtx);
      const quoted = v.list([v.symbol(specialFormKeywords.quote), newVal]);
      const newList = v.list([list.value[0], list.value[1], quoted]);
      return asyncCtx.syncCtx.evaluate(newList, env);
    }
    default:
      return asyncCtx.syncCtx.evaluate(list, env);
  }
}
async function evaluateLetAsync(list, env, asyncCtx) {
  const bindings = list.value[1];
  validateBindingVector(bindings, "let*", env);
  let currentEnv = env;
  const pairs = bindings.value;
  for (let i = 0;i < pairs.length; i += 2) {
    const pattern = pairs[i];
    const valueForm = pairs[i + 1];
    const value = await evaluateFormAsync(valueForm, currentEnv, asyncCtx);
    const boundPairs = destructureBindings(pattern, value, asyncCtx.syncCtx, currentEnv);
    currentEnv = extend(boundPairs.map(([n]) => n), boundPairs.map(([, v2]) => v2), currentEnv);
  }
  return evaluateFormsAsync(list.value.slice(2), currentEnv, asyncCtx);
}
async function evaluateLoopAsync(list, env, asyncCtx) {
  const loopBindings = list.value[1];
  validateBindingVector(loopBindings, "loop*", env);
  const loopBody = list.value.slice(2);
  const patterns = [];
  let currentValues = [];
  let initEnv = env;
  for (let i = 0;i < loopBindings.value.length; i += 2) {
    const pattern = loopBindings.value[i];
    const value = await evaluateFormAsync(loopBindings.value[i + 1], initEnv, asyncCtx);
    patterns.push(pattern);
    currentValues.push(value);
    const boundPairs = destructureBindings(pattern, value, asyncCtx.syncCtx, initEnv);
    initEnv = extend(boundPairs.map(([n]) => n), boundPairs.map(([, v2]) => v2), initEnv);
  }
  while (true) {
    let loopEnv = env;
    for (let i = 0;i < patterns.length; i++) {
      const boundPairs = destructureBindings(patterns[i], currentValues[i], asyncCtx.syncCtx, loopEnv);
      loopEnv = extend(boundPairs.map(([n]) => n), boundPairs.map(([, v2]) => v2), loopEnv);
    }
    try {
      return await evaluateFormsAsync(loopBody, loopEnv, asyncCtx);
    } catch (e) {
      if (e instanceof RecurSignal) {
        if (e.args.length !== patterns.length) {
          throw new EvaluationError(`recur expects ${patterns.length} arguments but got ${e.args.length}`, { list, env });
        }
        currentValues = e.args;
        continue;
      }
      throw e;
    }
  }
}
async function evaluateBindingAsync(list, env, asyncCtx) {
  return asyncCtx.syncCtx.evaluate(list, env);
}
async function evaluateTryAsync(list, env, asyncCtx) {
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(list, env);
  let result = v.nil();
  let pendingThrow = null;
  try {
    result = await evaluateFormsAsync(bodyForms, env, asyncCtx);
  } catch (e) {
    if (e instanceof RecurSignal)
      throw e;
    let thrownValue;
    if (e instanceof CljThrownSignal) {
      thrownValue = e.value;
    } else if (e instanceof EvaluationError) {
      thrownValue = {
        kind: valueKeywords.map,
        entries: [
          [v.keyword(":type"), v.keyword(":error/runtime")],
          [v.keyword(":message"), v.string(e.message)]
        ]
      };
    } else {
      throw e;
    }
    let handled = false;
    for (const clause of catchClauses) {
      if (matchesDiscriminator(clause.discriminator, thrownValue, env, asyncCtx.syncCtx)) {
        const catchEnv = extend([clause.binding], [thrownValue], env);
        result = await evaluateFormsAsync(clause.body, catchEnv, asyncCtx);
        handled = true;
        break;
      }
    }
    if (!handled) {
      pendingThrow = e;
    }
  } finally {
    if (finallyForms) {
      await evaluateFormsAsync(finallyForms, env, asyncCtx);
    }
  }
  if (pendingThrow !== null)
    throw pendingThrow;
  return result;
}
async function applyCallableAsync(fn, args, callEnv, asyncCtx) {
  if (is.nativeFunction(fn)) {
    if (fn.fnWithContext) {
      return fn.fnWithContext(asyncCtx.syncCtx, callEnv, ...args);
    }
    return fn.fn(...args);
  }
  if (is.function(fn)) {
    const arity = resolveArity(fn.arities, args.length);
    let currentArgs = args;
    while (true) {
      const localEnv = bindParams(arity.params, arity.restParam, currentArgs, fn.env, asyncCtx.syncCtx, callEnv);
      try {
        return await evaluateFormsAsync(arity.body, localEnv, asyncCtx);
      } catch (e) {
        if (e instanceof RecurSignal) {
          currentArgs = e.args;
          continue;
        }
        throw e;
      }
    }
  }
  return asyncCtx.syncCtx.applyCallable(fn, args, callEnv);
}

// src/core/evaluator/special-forms.ts
function hasDynamicMeta(meta) {
  if (!meta)
    return false;
  for (const [k, v2] of meta.entries) {
    if (is.keyword(k) && k.name === ":dynamic" && is.boolean(v2) && v2.value === true) {
      return true;
    }
  }
  return false;
}
function evaluateTry(list, env, ctx) {
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(list, env);
  let result = v.nil();
  let pendingThrow = null;
  try {
    result = ctx.evaluateForms(bodyForms, env);
  } catch (e) {
    if (e instanceof RecurSignal)
      throw e;
    let thrownValue;
    if (e instanceof CljThrownSignal) {
      thrownValue = e.value;
    } else if (e instanceof EvaluationError) {
      const entries = [
        [v.keyword(":type"), v.keyword(":error/runtime")],
        [v.keyword(":message"), v.string(e.message)]
      ];
      if (e.frames && e.frames.length > 0) {
        entries.push([v.keyword(":frames"), framesToClj(e.frames)]);
      }
      thrownValue = v.map(entries);
    } else {
      throw e;
    }
    let handled = false;
    for (const clause of catchClauses) {
      if (matchesDiscriminator(clause.discriminator, thrownValue, env, ctx)) {
        const catchEnv = extend([clause.binding], [thrownValue], env);
        result = ctx.evaluateForms(clause.body, catchEnv);
        handled = true;
        break;
      }
    }
    if (!handled) {
      pendingThrow = e;
    }
  } finally {
    if (finallyForms) {
      ctx.evaluateForms(finallyForms, env);
    }
  }
  if (pendingThrow !== null)
    throw pendingThrow;
  return result;
}
function evaluateQuote(list, _env, _ctx) {
  return list.value[1];
}
function buildVarMeta(symMeta, ctx, nameVal) {
  const pos = nameVal ? getPos(nameVal) : undefined;
  const hasPosInfo = pos && ctx.currentSource;
  if (!symMeta && !hasPosInfo)
    return;
  const posEntries = [];
  if (hasPosInfo) {
    const { line, col } = getLineCol(ctx.currentSource, pos.start);
    const lineOffset = ctx.currentLineOffset ?? 0;
    const colOffset = ctx.currentColOffset ?? 0;
    posEntries.push([v.keyword(":line"), v.number(line + lineOffset)]);
    posEntries.push([
      v.keyword(":column"),
      v.number(line === 1 ? col + colOffset : col)
    ]);
    if (ctx.currentFile) {
      posEntries.push([v.keyword(":file"), v.string(ctx.currentFile)]);
    }
  }
  const POS_KEYS = new Set([":line", ":column", ":file"]);
  const baseEntries = (symMeta?.entries ?? []).filter(([k]) => !(k.kind === "keyword" && POS_KEYS.has(k.name)));
  const allEntries = [...baseEntries, ...posEntries];
  return allEntries.length > 0 ? v.map(allEntries) : undefined;
}
function evaluateDef(list, env, ctx) {
  const name = list.value[1];
  if (name.kind !== "symbol") {
    throw new EvaluationError("First element of list must be a symbol", {
      name,
      list,
      env
    }, getPos(list));
  }
  if (list.value[2] === undefined)
    return v.nil();
  const nsEnv = getNamespaceEnv(env);
  const cljNs = nsEnv.ns;
  const newValue = ctx.evaluate(list.value[2], env);
  const varMeta = buildVarMeta(name.meta, ctx, name);
  const existing = cljNs.vars.get(name.name);
  if (existing) {
    existing.value = newValue;
    if (varMeta) {
      existing.meta = varMeta;
      if (hasDynamicMeta(varMeta))
        existing.dynamic = true;
    }
  } else {
    const newVar = v.var(cljNs.name, name.name, newValue, varMeta);
    if (hasDynamicMeta(varMeta))
      newVar.dynamic = true;
    cljNs.vars.set(name.name, newVar);
  }
  return v.nil();
}
var evaluateNs = (_list, _env, _ctx) => {
  return v.nil();
};
function evaluateIf(list, env, ctx) {
  const condition = ctx.evaluate(list.value[1], env);
  if (!is.falsy(condition)) {
    return ctx.evaluate(list.value[2], env);
  }
  if (!list.value[3]) {
    return v.nil();
  }
  return ctx.evaluate(list.value[3], env);
}
function evaluateDo(list, env, ctx) {
  return ctx.evaluateForms(list.value.slice(1), env);
}
function evaluateLetStar(list, env, ctx) {
  const bindings = list.value[1];
  validateBindingVector(bindings, "let*", env);
  const body = list.value.slice(2);
  let localEnv = env;
  for (let i = 0;i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i];
    if (!is.symbol(pattern)) {
      throw new EvaluationError("let* only supports simple symbol bindings; use let for destructuring", { pattern, env }, getPos(pattern) ?? getPos(list));
    }
    const value = ctx.evaluate(bindings.value[i + 1], localEnv);
    localEnv = extend([pattern.name], [value], localEnv);
  }
  return ctx.evaluateForms(body, localEnv);
}
function evaluateFnStar(list, env, _ctx) {
  const rest = list.value.slice(1);
  let fnName;
  let arityForms = rest;
  if (rest[0] && is.symbol(rest[0])) {
    fnName = rest[0].name;
    arityForms = rest.slice(1);
  }
  const arities = parseArities(arityForms, env);
  for (const arity of arities) {
    for (const param of arity.params) {
      if (!is.symbol(param)) {
        throw new EvaluationError("fn* only supports simple symbol params; use fn for destructuring", { param, env }, getPos(param) ?? getPos(list));
      }
    }
    if (arity.restParam !== null && !is.symbol(arity.restParam)) {
      throw new EvaluationError("fn* only supports simple symbol rest param; use fn for destructuring", { restParam: arity.restParam, env }, getPos(arity.restParam) ?? getPos(list));
    }
    assertRecurInTailPosition(arity.body);
    if (arity.restParam === null) {
      const result = compileFnBody(arity.params, arity.body, compile);
      if (result !== null) {
        arity.compiledBody = result.compiledBody;
        arity.paramSlots = result.paramSlots;
      }
    } else {
      const compiled = compile(v.list([v.symbol(specialFormKeywords.do), ...arity.body]));
      if (compiled !== null) {
        arity.compiledBody = compiled;
      }
    }
  }
  const fn = v.multiArityFunction(arities, env);
  if (fnName) {
    fn.name = fnName;
    const selfEnv = makeEnv(env);
    selfEnv.bindings.set(fnName, fn);
    fn.env = selfEnv;
  }
  return fn;
}
function evaluateLoopStar(list, env, ctx) {
  const loopBindings = list.value[1];
  validateBindingVector(loopBindings, "loop*", env);
  const loopBody = list.value.slice(2);
  assertRecurInTailPosition(loopBody);
  const names = [];
  const initValues = [];
  let initEnv = env;
  for (let i = 0;i < loopBindings.value.length; i += 2) {
    const pattern = loopBindings.value[i];
    if (!is.symbol(pattern)) {
      throw new EvaluationError("loop* only supports simple symbol bindings; use loop for destructuring", { pattern, env }, getPos(pattern) ?? getPos(list));
    }
    const value = ctx.evaluate(loopBindings.value[i + 1], initEnv);
    names.push(pattern.name);
    initValues.push(value);
    initEnv = extend([pattern.name], [value], initEnv);
  }
  let currentValues = initValues;
  while (true) {
    const loopEnv = extend(names, currentValues, env);
    try {
      return ctx.evaluateForms(loopBody, loopEnv);
    } catch (e) {
      if (e instanceof RecurSignal) {
        if (e.args.length !== names.length) {
          throw new EvaluationError(`recur expects ${names.length} arguments but got ${e.args.length}`, { list, env }, getPos(list));
        }
        currentValues = e.args;
        continue;
      }
      throw e;
    }
  }
}
function evaluateLetfnStar(list, env, ctx) {
  const bindings = list.value[1];
  if (!is.vector(bindings)) {
    throw new EvaluationError("letfn* bindings must be a vector", {
      bindings,
      env
    }, getPos(list));
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError("letfn* bindings must have an even number of forms", { bindings, env }, getPos(bindings) ?? getPos(list));
  }
  const body = list.value.slice(2);
  const sharedEnv = makeEnv(env);
  for (let i = 0;i < bindings.value.length; i += 2) {
    const name = bindings.value[i];
    const fnForm = bindings.value[i + 1];
    if (!is.symbol(name)) {
      throw new EvaluationError("letfn* binding names must be symbols", {
        name,
        env
      }, getPos(name) ?? getPos(list));
    }
    const fn = ctx.evaluate(fnForm, sharedEnv);
    if (!is.aFunction(fn)) {
      throw new EvaluationError("letfn* binding values must be functions", {
        fn,
        env
      }, getPos(fnForm) ?? getPos(list));
    }
    if (is.function(fn))
      fn.name = name.name;
    sharedEnv.bindings.set(name.name, fn);
  }
  return ctx.evaluateForms(body, sharedEnv);
}
function mergeDocIntoMeta(base, docstring) {
  const docEntry = [
    v.keyword(":doc"),
    v.string(docstring)
  ];
  const existing = (base?.entries ?? []).filter(([k]) => !(k.kind === "keyword" && k.name === ":doc"));
  return { kind: "map", entries: [...existing, docEntry] };
}
function evaluateDefmacro(list, env, ctx) {
  const name = list.value[1];
  if (!is.symbol(name)) {
    throw new EvaluationError("First element of defmacro must be a symbol", {
      name,
      list,
      env
    }, getPos(list));
  }
  const rest = list.value.slice(2);
  const docstring = rest[0]?.kind === "string" ? rest[0].value : undefined;
  const arityForms = docstring ? rest.slice(1) : rest;
  const arities = parseArities(arityForms, env);
  const macro = v.multiArityMacro(arities, env);
  macro.name = name.name;
  const varMeta = buildVarMeta(name.meta, ctx, name);
  const finalMeta = docstring ? mergeDocIntoMeta(varMeta, docstring) : varMeta;
  internVar(name.name, macro, getNamespaceEnv(env), finalMeta);
  return v.nil();
}
function evaluateRecur(list, env, ctx) {
  const args = list.value.slice(1).map((v2) => ctx.evaluate(v2, env));
  throw new RecurSignal(args);
}
function evaluateVar(list, env, ctx) {
  const sym = list.value[1];
  if (!is.symbol(sym)) {
    throw new EvaluationError("var expects a symbol", { list }, getPos(list));
  }
  const slashIdx = sym.name.indexOf("/");
  if (slashIdx > 0 && slashIdx < sym.name.length - 1) {
    const alias = sym.name.slice(0, slashIdx);
    const localName = sym.name.slice(slashIdx + 1);
    const nsEnv = getNamespaceEnv(env);
    const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null;
    if (!targetNs) {
      throw new EvaluationError(`No such namespace: ${alias}`, { sym }, getPos(sym));
    }
    const v3 = targetNs.vars.get(localName);
    if (!v3)
      throw new EvaluationError(`Var ${sym.name} not found`, { sym }, getPos(sym));
    return v3;
  }
  const v2 = lookupVar(sym.name, env);
  if (!v2) {
    throw new EvaluationError(`Unable to resolve var: ${sym.name} in this context`, { sym }, getPos(sym));
  }
  return v2;
}
function evaluateBinding(list, env, ctx) {
  const bindings = list.value[1];
  if (!is.vector(bindings)) {
    throw new EvaluationError("binding requires a vector of bindings", {
      list,
      env
    }, getPos(list));
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError("binding vector must have an even number of forms", { list, env }, getPos(bindings) ?? getPos(list));
  }
  const body = list.value.slice(2);
  const boundVars = [];
  for (let i = 0;i < bindings.value.length; i += 2) {
    const sym = bindings.value[i];
    if (!is.symbol(sym)) {
      throw new EvaluationError("binding left-hand side must be a symbol", {
        sym
      }, getPos(sym) ?? getPos(list));
    }
    const newVal = ctx.evaluate(bindings.value[i + 1], env);
    const v2 = lookupVar(sym.name, env);
    if (!v2) {
      throw new EvaluationError(`No var found for symbol '${sym.name}' in binding form`, { sym }, getPos(sym));
    }
    if (!v2.dynamic) {
      throw new EvaluationError(`Cannot use binding with non-dynamic var ${v2.ns}/${v2.name}. Mark it dynamic with (def ^:dynamic ${sym.name} ...)`, { sym }, getPos(sym));
    }
    v2.bindingStack ??= [];
    v2.bindingStack.push(newVal);
    boundVars.push(v2);
  }
  try {
    return ctx.evaluateForms(body, env);
  } finally {
    for (const v2 of boundVars) {
      v2.bindingStack.pop();
    }
  }
}
function evaluateSet(list, env, ctx) {
  if (list.value.length !== 3) {
    throw new EvaluationError(`set! requires exactly 2 arguments, got ${list.value.length - 1}`, { list, env }, getPos(list));
  }
  const symForm = list.value[1];
  if (!is.symbol(symForm)) {
    throw new EvaluationError(`set! first argument must be a symbol, got ${symForm.kind}`, { symForm, env }, getPos(symForm) ?? getPos(list));
  }
  const v2 = lookupVar(symForm.name, env);
  if (!v2) {
    throw new EvaluationError(`Unable to resolve var: ${symForm.name} in this context`, { symForm, env }, getPos(symForm));
  }
  if (!v2.dynamic) {
    throw new EvaluationError(`Cannot set! non-dynamic var ${v2.ns}/${v2.name}. Mark it with ^:dynamic.`, { symForm, env }, getPos(symForm));
  }
  if (!v2.bindingStack || v2.bindingStack.length === 0) {
    throw new EvaluationError(`Cannot set! ${v2.ns}/${v2.name} — no active binding. Use set! only inside a (binding [...] ...) form.`, { symForm, env }, getPos(symForm));
  }
  const newVal = ctx.evaluate(list.value[2], env);
  v2.bindingStack[v2.bindingStack.length - 1] = newVal;
  return newVal;
}
function evaluateLazySeqForm(list, env, ctx) {
  const body = list.value.slice(1);
  return v.lazySeq(() => ctx.evaluateForms(body, env));
}
function evaluateAsyncBlock(list, env, ctx) {
  const body = list.value.slice(1);
  if (body.length === 0)
    return v.pending(Promise.resolve(v.nil()));
  const asyncCtx = createAsyncEvalCtx(ctx);
  const promise = asyncCtx.evaluateForms(body, env);
  return v.pending(promise);
}
var specialFormEvaluatorEntries = {
  try: evaluateTry,
  quote: evaluateQuote,
  def: evaluateDef,
  ns: evaluateNs,
  if: evaluateIf,
  do: evaluateDo,
  "let*": evaluateLetStar,
  "fn*": evaluateFnStar,
  defmacro: evaluateDefmacro,
  "loop*": evaluateLoopStar,
  recur: evaluateRecur,
  var: evaluateVar,
  binding: evaluateBinding,
  "set!": evaluateSet,
  "letfn*": evaluateLetfnStar,
  "lazy-seq": evaluateLazySeqForm,
  async: evaluateAsyncBlock,
  ".": evaluateDot,
  "js/new": evaluateNew
};
function evaluateSpecialForm(symbol, list, env, ctx) {
  const evalFn = specialFormEvaluatorEntries[symbol];
  if (evalFn) {
    return evalFn(list, env, ctx);
  }
  throw new EvaluationError(`Unknown special form: ${symbol}`, {
    symbol,
    list,
    env
  }, getPos(list));
}

// src/core/evaluator/dispatch.ts
var LIST_HEAD_POS = 0;
var LIST_BODY_POS = 1;
function dispatchMultiMethod(mm, args, ctx, env, callSite) {
  const dispatchVal = ctx.applyFunction(mm.dispatchFn, args, env);
  const method = mm.methods.find(({ dispatchVal: dv }) => is.equal(dv, dispatchVal));
  if (method)
    return ctx.applyFunction(method.fn, args, env);
  if (mm.defaultMethod)
    return ctx.applyFunction(mm.defaultMethod, args, env);
  throw new EvaluationError(`No method in multimethod '${mm.name}' for dispatch value ${printString(dispatchVal)}`, { mm, dispatchVal }, callSite ? getPos(callSite) : undefined);
}
function evaluateList(list, env, ctx) {
  if (list.value.length === 0) {
    return list;
  }
  const head = list.value[LIST_HEAD_POS];
  if (is.specialForm(head)) {
    return evaluateSpecialForm(head.name, list, env, ctx);
  }
  let evaledHead = ctx.evaluate(head, env);
  if (is.var(evaledHead)) {
    evaledHead = evaledHead.value;
  }
  if (is.multiMethod(evaledHead)) {
    const args2 = list.value.slice(LIST_BODY_POS).map((arg) => ctx.evaluate(arg, env));
    return dispatchMultiMethod(evaledHead, args2, ctx, env, list);
  }
  if (!is.callable(evaledHead)) {
    const name = is.symbol(head) ? head.name : printString(head);
    throw new EvaluationError(`${name} is not callable`, { list, env }, getPos(list));
  }
  const args = list.value.slice(LIST_BODY_POS).map((arg) => ctx.evaluate(arg, env));
  const rawPos = getPos(list);
  let line = null;
  let col = null;
  if (rawPos && ctx.currentSource) {
    const lc = getLineCol(ctx.currentSource, rawPos.start);
    line = lc.line;
    col = lc.col + 1;
  }
  const frame = {
    fnName: is.symbol(head) ? head.name : null,
    line,
    col,
    source: ctx.currentFile ?? null,
    pos: rawPos ?? null
  };
  ctx.frameStack.push(frame);
  try {
    return ctx.applyCallable(evaledHead, args, env);
  } catch (e) {
    maybeHydrateErrorPos(e, list);
    if (e instanceof EvaluationError && !e.frames) {
      e.frames = [...ctx.frameStack].reverse();
    }
    throw e;
  } finally {
    ctx.frameStack.pop();
  }
}

// src/core/compiler/callable.ts
function compileCall(node, compileEnv, compile2) {
  const head = node.value[0];
  const compiledOp = compile2(head, compileEnv);
  if (compiledOp === null)
    return null;
  const compiledArgs = [];
  for (const arg of node.value.slice(1)) {
    const compiled = compile2(arg, compileEnv);
    if (compiled === null)
      return null;
    compiledArgs.push(compiled);
  }
  const argCount = compiledArgs.length;
  return (env, ctx) => {
    const op = compiledOp(env, ctx);
    if (is.multiMethod(op)) {
      const args2 = compiledArgs.map((c) => c(env, ctx));
      return dispatchMultiMethod(op, args2, ctx, env, node);
    }
    if (!is.callable(op)) {
      const name = is.symbol(head) ? head.name : printString(head);
      throw new EvaluationError(`${name} is not callable`, { list: node, env }, getPos(node));
    }
    const args = compiledArgs.map((carg) => carg(env, ctx));
    const rawPos = getPos(node);
    let line = null;
    let col = null;
    if (rawPos && ctx.currentSource) {
      const lc = getLineCol(ctx.currentSource, rawPos.start);
      line = lc.line;
      col = lc.col + 1;
    }
    const frame = {
      fnName: is.symbol(head) ? head.name : null,
      line,
      col,
      source: ctx.currentFile ?? null,
      pos: rawPos ?? null
    };
    ctx.frameStack.push(frame);
    try {
      if (op.kind === "function") {
        const arity = resolveArity(op.arities, argCount);
        if (arity.compiledBody && arity.paramSlots) {
          const slots = arity.paramSlots;
          const saved = new Array(slots.length);
          for (let i = 0;i < slots.length; i++) {
            saved[i] = slots[i].value;
            slots[i].value = args[i];
          }
          try {
            return arity.compiledBody(op.env, ctx);
          } finally {
            for (let i = 0;i < slots.length; i++) {
              slots[i].value = saved[i];
            }
          }
        }
      }
      return ctx.applyCallable(op, args, env);
    } catch (ex) {
      maybeHydrateErrorPos(ex, node);
      if (ex instanceof EvaluationError && !ex.frames) {
        ex.frames = [...ctx.frameStack].reverse();
      }
      throw ex;
    } finally {
      ctx.frameStack.pop();
    }
  };
}

// src/core/compiler/collections.ts
function compileVector(node, compileEnv, compile2) {
  const compiledElements = [];
  for (const el of node.value) {
    const compiled = compile2(el, compileEnv);
    if (compiled === null)
      return null;
    compiledElements.push(compiled);
  }
  const meta = node.meta;
  return (env, ctx) => {
    const evaluated = compiledElements.map((c) => c(env, ctx));
    if (meta)
      return { kind: valueKeywords.vector, value: evaluated, meta };
    return v.vector(evaluated);
  };
}
function compileMap(node, compileEnv, compile2) {
  const compiledPairs = [];
  for (const [key, val] of node.entries) {
    const compiledKey = compile2(key, compileEnv);
    const compiledVal = compile2(val, compileEnv);
    if (compiledKey === null || compiledVal === null)
      return null;
    compiledPairs.push([compiledKey, compiledVal]);
  }
  const meta = node.meta;
  return (env, ctx) => {
    const entries = [];
    for (const [ck, cv] of compiledPairs) {
      entries.push([ck(env, ctx), cv(env, ctx)]);
    }
    if (meta)
      return { kind: valueKeywords.map, entries, meta };
    return v.map(entries);
  };
}
function compileSet(node, compileEnv, compile2) {
  const compiledElements = [];
  for (const el of node.values) {
    const compiled = compile2(el, compileEnv);
    if (compiled === null)
      return null;
    compiledElements.push(compiled);
  }
  return (env, ctx) => {
    const evaluated = [];
    for (const c of compiledElements) {
      const ev = c(env, ctx);
      if (!evaluated.some((existing) => is.equal(existing, ev))) {
        evaluated.push(ev);
      }
    }
    return v.set(evaluated);
  };
}

// src/core/compiler/index.ts
function compileList(node, compileEnv, compile2) {
  if (node.value.length === 0)
    return () => node;
  const head = node.value[0];
  if (is.symbol(head)) {
    switch (head.name) {
      case specialFormKeywords.if:
        return compileIf(node, compileEnv, compile2);
      case specialFormKeywords.do:
        return compileDo(node.value.slice(1), compileEnv, compile2);
      case specialFormKeywords["let*"]:
        return compileLet(node, compileEnv, compile2);
      case specialFormKeywords["loop*"]:
        return compileLoop(node, compileEnv, compile2);
      case specialFormKeywords.recur:
        return compileRecur(node, compileEnv, compile2);
      case specialFormKeywords.try:
        return compileTry(node, compileEnv, compile2);
    }
  }
  if (!is.specialForm(head)) {
    return compileCall(node, compileEnv, compile2);
  }
  return null;
}
function compileSymbol(node, compileEnv) {
  const symbolName = node.name;
  const slashIdx = symbolName.indexOf("/");
  if (slashIdx > 0 && slashIdx < symbolName.length - 1) {
    const alias = symbolName.slice(0, slashIdx);
    const localName = symbolName.slice(slashIdx + 1);
    if (localName.includes(".")) {
      const segments = localName.split(".");
      return (env, ctx) => {
        const nsEnv = getNamespaceEnv(env);
        const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null;
        if (!targetNs) {
          throw new EvaluationError(`No such namespace or alias: ${alias}`, {
            symbol: symbolName,
            env
          }, getPos(node));
        }
        const rootVar = targetNs.vars.get(segments[0]);
        if (rootVar === undefined) {
          throw new EvaluationError(`Symbol ${alias}/${segments[0]} not found`, {
            symbol: symbolName,
            env
          }, getPos(node));
        }
        let current = derefValue(rootVar);
        for (let i = 1;i < segments.length; i++) {
          let raw;
          if (current.kind === "js-value") {
            raw = current.value;
          } else if (current.kind === "string" || current.kind === "number" || current.kind === "boolean") {
            raw = current.value;
          } else {
            throw new EvaluationError(`Cannot access property '${segments[i]}' on ${current.kind} while resolving ${symbolName}`, { symbol: symbolName }, getPos(node));
          }
          if (raw === null || raw === undefined) {
            throw new EvaluationError(`Cannot access property '${segments[i]}' on ${raw === null ? "null" : "undefined"} while resolving ${symbolName}`, { symbol: symbolName }, getPos(node));
          }
          const obj = raw;
          const prop = obj[segments[i]];
          if (typeof prop === "function") {
            current = jsToClj2(prop.bind(obj));
          } else {
            current = jsToClj2(prop);
          }
        }
        return current;
      };
    }
    return (env, ctx) => {
      const nsEnv = getNamespaceEnv(env);
      const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null;
      if (!targetNs) {
        throw new EvaluationError(`No such namespace or alias: ${alias}`, {
          symbol: symbolName,
          env
        }, getPos(node));
      }
      const varObj = targetNs.vars.get(localName);
      if (varObj === undefined) {
        throw new EvaluationError(`Symbol ${symbolName} not found`, {
          symbol: symbolName,
          env
        }, getPos(node));
      }
      return derefValue(varObj);
    };
  }
  const slot = findSlot(symbolName, compileEnv);
  if (slot !== null) {
    return (_env, _ctx) => slot.value;
  }
  return (env, _ctx) => lookup(symbolName, env);
}
function compile(node, compileEnv = null) {
  switch (node.kind) {
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.boolean:
    case valueKeywords.regex:
      return () => node;
    case valueKeywords.symbol: {
      return compileSymbol(node, compileEnv);
    }
    case valueKeywords.vector:
      return compileVector(node, compileEnv, compile);
    case valueKeywords.map:
      return compileMap(node, compileEnv, compile);
    case valueKeywords.set:
      return compileSet(node, compileEnv, compile);
    case valueKeywords.list: {
      return compileList(node, compileEnv, compile);
    }
  }
  return null;
}

// src/core/evaluator/collections.ts
function evaluateVector(vector, env, ctx) {
  const evaluated = vector.value.map((v2) => ctx.evaluate(v2, env));
  if (vector.meta)
    return {
      kind: valueKeywords.vector,
      value: evaluated,
      meta: vector.meta
    };
  return v.vector(evaluated);
}
function evaluateSet2(set, env, ctx) {
  const evaluated = [];
  for (const v2 of set.values) {
    const ev = ctx.evaluate(v2, env);
    if (!evaluated.some((existing) => is.equal(existing, ev))) {
      evaluated.push(ev);
    }
  }
  return v.set(evaluated);
}
function evaluateMap(map, env, ctx) {
  let entries = [];
  for (const [key, value] of map.entries) {
    const evaluatedKey = ctx.evaluate(key, env);
    const evaluatedValue = ctx.evaluate(value, env);
    entries.push([evaluatedKey, evaluatedValue]);
  }
  if (map.meta)
    return { kind: valueKeywords.map, entries, meta: map.meta };
  return v.map(entries);
}

// src/core/evaluator/evaluate.ts
function evaluateWithContext(expr, env, ctx) {
  const compiled = compile(expr);
  if (compiled !== null) {
    return compiled(env, ctx);
  }
  switch (expr.kind) {
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.function:
    case valueKeywords.multiMethod:
    case valueKeywords.boolean:
    case valueKeywords.regex:
    case valueKeywords.delay:
    case valueKeywords.lazySeq:
    case valueKeywords.cons:
    case valueKeywords.namespace:
      return expr;
    case valueKeywords.symbol: {
      const slashIdx = expr.name.indexOf("/");
      if (slashIdx > 0 && slashIdx < expr.name.length - 1) {
        const alias = expr.name.slice(0, slashIdx);
        const sym = expr.name.slice(slashIdx + 1);
        const nsEnv = getNamespaceEnv(env);
        const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null;
        if (!targetNs) {
          throw new EvaluationError(`No such namespace or alias: ${alias}`, {
            symbol: expr.name,
            env
          }, getPos(expr));
        }
        const v2 = targetNs.vars.get(sym);
        if (v2 === undefined) {
          throw new EvaluationError(`Symbol ${expr.name} not found`, {
            symbol: expr.name,
            env
          }, getPos(expr));
        }
        return derefValue(v2);
      }
      return lookup(expr.name, env);
    }
    case valueKeywords.vector:
      return evaluateVector(expr, env, ctx);
    case valueKeywords.map:
      return evaluateMap(expr, env, ctx);
    case valueKeywords.set:
      return evaluateSet2(expr, env, ctx);
    case valueKeywords.list:
      return evaluateList(expr, env, ctx);
    default:
      throw new EvaluationError("Unexpected value", { expr, env }, getPos(expr));
  }
}
function evaluateFormsWithContext(forms, env, ctx) {
  let result = v.nil();
  for (const form of forms) {
    result = ctx.evaluate(form, env);
  }
  return result;
}

// src/core/evaluator/index.ts
function createEvaluationContext() {
  const ctx = {
    evaluate: (expr, env) => evaluateWithContext(expr, env, ctx),
    evaluateForms: (forms, env) => evaluateFormsWithContext(forms, env, ctx),
    applyFunction: (fn, args, callEnv) => applyFunctionWithContext(fn, args, ctx, callEnv),
    applyCallable: (fn, args, callEnv) => applyCallableWithContext(fn, args, ctx, callEnv),
    applyMacro: (macro, rawArgs) => applyMacroWithContext(macro, rawArgs, ctx),
    expandAll: (form, env) => macroExpandAllWithContext(form, env, ctx),
    resolveNs: (_name) => null,
    io: {
      stdout: (text) => console.log(text),
      stderr: (text) => console.error(text)
    },
    frameStack: []
  };
  return ctx;
}

// src/core/ns-forms.ts
function extractNsNameFromTokens(tokens) {
  const meaningful = tokens.filter((t) => t.kind !== tokenKeywords.Comment);
  if (meaningful.length < 3)
    return null;
  if (meaningful[0].kind !== "LParen")
    return null;
  if (meaningful[1].kind !== "Symbol" || meaningful[1].value !== "ns")
    return null;
  if (meaningful[2].kind !== "Symbol")
    return null;
  return meaningful[2].value;
}
function extractAliasMapFromTokens(tokens) {
  const aliases = new Map;
  const meaningful = tokens.filter((t) => t.kind !== tokenKeywords.Comment && t.kind !== tokenKeywords.Whitespace);
  if (meaningful.length < 3)
    return aliases;
  if (meaningful[0].kind !== tokenKeywords.LParen)
    return aliases;
  if (meaningful[1].kind !== tokenKeywords.Symbol || meaningful[1].value !== "ns")
    return aliases;
  let i = 3;
  let depth = 1;
  while (i < meaningful.length && depth > 0) {
    const tok = meaningful[i];
    if (tok.kind === tokenKeywords.LParen) {
      depth++;
      i++;
      continue;
    }
    if (tok.kind === tokenKeywords.RParen) {
      depth--;
      i++;
      continue;
    }
    if (tok.kind === tokenKeywords.LBracket) {
      let j = i + 1;
      let nsSym = null;
      while (j < meaningful.length && meaningful[j].kind !== tokenKeywords.RBracket) {
        const t = meaningful[j];
        if (t.kind === tokenKeywords.Symbol && nsSym === null) {
          nsSym = t.value;
        }
        if (t.kind === tokenKeywords.Keyword && (t.value === ":as" || t.value === ":as-alias")) {
          j++;
          if (j < meaningful.length && meaningful[j].kind === tokenKeywords.Symbol && nsSym) {
            aliases.set(meaningful[j].value, nsSym);
          }
        }
        j++;
      }
    }
    i++;
  }
  return aliases;
}
function findNsForm(forms) {
  const nsForm = forms.find((f) => is.list(f) && f.value.length > 0 && is.symbol(f.value[0]) && f.value[0].name === "ns");
  if (!nsForm || !is.list(nsForm))
    return null;
  return nsForm;
}
function extractRequireClauses(forms) {
  const nsForm = findNsForm(forms);
  if (!nsForm)
    return [];
  const clauses = [];
  for (let i = 2;i < nsForm.value.length; i++) {
    const clause = nsForm.value[i];
    if (is.list(clause) && is.keyword(clause.value[0]) && clause.value[0].name === ":require") {
      clauses.push(clause.value.slice(1));
    }
  }
  return clauses;
}

// src/core/scanners.ts
var createCursor = (line, col, offset) => ({
  line,
  col,
  offset
});
var makeScannerPrimitives = (input, cursor) => {
  return {
    peek: (ahead = 0) => {
      const idx = cursor.offset + ahead;
      if (idx >= input.length)
        return null;
      return input[idx];
    },
    isAtEnd: () => {
      return cursor.offset >= input.length;
    },
    position: () => {
      return {
        offset: cursor.offset,
        line: cursor.line,
        col: cursor.col
      };
    }
  };
};
function makeCharScanner(input) {
  const cursor = createCursor(0, 0, 0);
  const api = {
    ...makeScannerPrimitives(input, cursor),
    advance: () => {
      if (cursor.offset >= input.length)
        return null;
      const ch = input[cursor.offset];
      cursor.offset++;
      if (ch === `
`) {
        cursor.line++;
        cursor.col = 0;
      } else {
        cursor.col++;
      }
      return ch;
    },
    consumeWhile(predicate) {
      const buffer = [];
      while (!api.isAtEnd() && predicate(api.peek())) {
        buffer.push(api.advance());
      }
      return buffer.join("");
    }
  };
  return api;
}
function makeTokenScanner(input) {
  const cursor = createCursor(0, 0, 0);
  const api = {
    ...makeScannerPrimitives(input, cursor),
    advance: () => {
      if (cursor.offset >= input.length)
        return null;
      const token = input[cursor.offset];
      cursor.offset++;
      cursor.col = token.end.col;
      cursor.line = token.end.line;
      return token;
    },
    consumeWhile(predicate) {
      const buffer = [];
      while (!api.isAtEnd() && predicate(api.peek())) {
        buffer.push(api.advance());
      }
      return buffer;
    },
    consumeN(n) {
      for (let i = 0;i < n; i++) {
        api.advance();
      }
    }
  };
  return api;
}

// src/core/tokenizer.ts
var isNewline = (char) => char === `
`;
var isWhitespace = (char) => [" ", ",", `
`, "\r", "\t"].includes(char);
var isComment = (char) => char === ";";
var isLParen = (char) => char === "(";
var isRParen = (char) => char === ")";
var isLBracket = (char) => char === "[";
var isRBracket = (char) => char === "]";
var isLBrace = (char) => char === "{";
var isRBrace = (char) => char === "}";
var isDoubleQuote = (char) => char === '"';
var isSingleQuote = (char) => char === "'";
var isBacktick = (char) => char === "`";
var isTilde = (char) => char === "~";
var isAt = (char) => char === "@";
var isNumber2 = (char) => {
  const parsed = parseInt(char);
  if (isNaN(parsed)) {
    return false;
  }
  return parsed >= 0 && parsed <= 9;
};
var isDot = (char) => char === ".";
var isKeywordStart = (char) => char === ":";
var isHash = (char) => char === "#";
var isCaret = (char) => char === "^";
var isDelimiter = (char) => isLParen(char) || isRParen(char) || isLBracket(char) || isRBracket(char) || isLBrace(char) || isRBrace(char) || isBacktick(char) || isSingleQuote(char) || isAt(char) || isCaret(char);
var parseWhitespace = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.consumeWhile(isWhitespace);
  return {
    kind: tokenKeywords.Whitespace,
    start,
    end: scanner.position()
  };
};
var parseComment = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.advance();
  const value = scanner.consumeWhile((char) => !isNewline(char));
  if (!scanner.isAtEnd() && scanner.peek() === `
`) {
    scanner.advance();
  }
  return {
    kind: tokenKeywords.Comment,
    value,
    start,
    end: scanner.position()
  };
};
var parseString = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.advance();
  const buffer = [];
  let foundClosingQuote = false;
  while (!scanner.isAtEnd()) {
    const ch = scanner.peek();
    if (ch === "\\") {
      scanner.advance();
      const nextChar = scanner.peek();
      switch (nextChar) {
        case '"':
          buffer.push('"');
          break;
        case "\\":
          buffer.push("\\");
          break;
        case "n":
          buffer.push(`
`);
          break;
        case "r":
          buffer.push("\r");
          break;
        case "t":
          buffer.push("\t");
          break;
        default:
          buffer.push(nextChar);
      }
      if (!scanner.isAtEnd()) {
        scanner.advance();
      }
      continue;
    }
    if (ch === '"') {
      scanner.advance();
      foundClosingQuote = true;
      break;
    }
    buffer.push(scanner.advance());
  }
  if (!foundClosingQuote) {
    throw new TokenizerError(`Unterminated string detected at ${start.offset}`, scanner.position());
  }
  return {
    kind: tokenKeywords.String,
    value: buffer.join(""),
    start,
    end: scanner.position()
  };
};
var parseKeyword = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  const value = scanner.consumeWhile((char) => isKeywordStart(char) || !isWhitespace(char) && !isDelimiter(char) && !isComment(char));
  return {
    kind: tokenKeywords.Keyword,
    value,
    start,
    end: scanner.position()
  };
};
function isNumberToken(char, ctx) {
  const scanner = ctx.scanner;
  const next = scanner.peek(1);
  return isNumber2(char) || char === "-" && next !== null && isNumber2(next);
}
var parseNumber = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  let value = "";
  if (scanner.peek() === "-") {
    value += scanner.advance();
  }
  value += scanner.consumeWhile(isNumber2);
  if (!scanner.isAtEnd() && scanner.peek() === "." && scanner.peek(1) !== null && isNumber2(scanner.peek(1))) {
    value += scanner.advance();
    value += scanner.consumeWhile(isNumber2);
  }
  if (!scanner.isAtEnd() && (scanner.peek() === "e" || scanner.peek() === "E")) {
    value += scanner.advance();
    if (!scanner.isAtEnd() && (scanner.peek() === "+" || scanner.peek() === "-")) {
      value += scanner.advance();
    }
    const exponentDigits = scanner.consumeWhile(isNumber2);
    if (exponentDigits.length === 0) {
      throw new TokenizerError(`Invalid number format at line ${start.line} column ${start.col}: "${value}"`, { start, end: scanner.position() });
    }
    value += exponentDigits;
  }
  if (!scanner.isAtEnd() && isDot(scanner.peek())) {
    throw new TokenizerError(`Invalid number format at line ${start.line} column ${start.col}: "${value}${scanner.consumeWhile((ch) => !isWhitespace(ch) && !isDelimiter(ch))}"`, { start, end: scanner.position() });
  }
  return {
    kind: tokenKeywords.Number,
    value: Number(value),
    start,
    end: scanner.position()
  };
};
var parseSymbol = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  const value = scanner.consumeWhile((char) => !isWhitespace(char) && !isDelimiter(char) && !isComment(char));
  return {
    kind: tokenKeywords.Symbol,
    value,
    start,
    end: scanner.position()
  };
};
var parseDerefToken = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.advance();
  return { kind: "Deref", start, end: scanner.position() };
};
var parseMetaToken = (ctx) => {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.advance();
  return { kind: "Meta", start, end: scanner.position() };
};
var parseRegexLiteral = (ctx, start) => {
  const scanner = ctx.scanner;
  scanner.advance();
  const buffer = [];
  let foundClosingQuote = false;
  while (!scanner.isAtEnd()) {
    const ch = scanner.peek();
    if (ch === "\\") {
      scanner.advance();
      const next = scanner.peek();
      if (next === null) {
        throw new TokenizerError(`Unterminated regex literal at ${start.offset}`, scanner.position());
      }
      if (next === '"') {
        buffer.push('"');
      } else {
        buffer.push("\\");
        buffer.push(next);
      }
      scanner.advance();
      continue;
    }
    if (ch === '"') {
      scanner.advance();
      foundClosingQuote = true;
      break;
    }
    buffer.push(scanner.advance());
  }
  if (!foundClosingQuote) {
    throw new TokenizerError(`Unterminated regex literal at ${start.offset}`, scanner.position());
  }
  return {
    kind: tokenKeywords.Regex,
    value: buffer.join(""),
    start,
    end: scanner.position()
  };
};
function parseDispatch(ctx) {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.advance();
  const next = scanner.peek();
  if (next === "(") {
    scanner.advance();
    return { kind: tokenKeywords.AnonFnStart, start, end: scanner.position() };
  }
  if (next === '"') {
    return parseRegexLiteral(ctx, start);
  }
  if (next === "'") {
    scanner.advance();
    return { kind: tokenKeywords.VarQuote, start, end: scanner.position() };
  }
  if (next === "{") {
    scanner.advance();
    return { kind: tokenKeywords.SetStart, start, end: scanner.position() };
  }
  throw new TokenizerError(`Unknown dispatch character: #${next ?? "EOF"}`, start);
}
function parseCharToken(kind, value) {
  return (ctx) => {
    const scanner = ctx.scanner;
    const start = scanner.position();
    scanner.advance();
    return {
      kind,
      value,
      start,
      end: scanner.position()
    };
  };
}
function parseTilde(ctx) {
  const scanner = ctx.scanner;
  const start = scanner.position();
  scanner.advance();
  const nextChar = scanner.peek();
  if (!nextChar) {
    throw new TokenizerError(`Unexpected end of input while parsing unquote at ${start.offset}`, start);
  }
  if (isAt(nextChar)) {
    scanner.advance();
    return {
      kind: tokenKeywords.UnquoteSplicing,
      value: tokenSymbols.UnquoteSplicing,
      start,
      end: scanner.position()
    };
  }
  return {
    kind: tokenKeywords.Unquote,
    value: tokenSymbols.Unquote,
    start,
    end: scanner.position()
  };
}
var tokenParseEntries = [
  [isWhitespace, parseWhitespace],
  [isComment, parseComment],
  [isLParen, parseCharToken(tokenKeywords.LParen, tokenSymbols.LParen)],
  [isRParen, parseCharToken(tokenKeywords.RParen, tokenSymbols.RParen)],
  [isLBracket, parseCharToken(tokenKeywords.LBracket, tokenSymbols.LBracket)],
  [isRBracket, parseCharToken(tokenKeywords.RBracket, tokenSymbols.RBracket)],
  [isLBrace, parseCharToken(tokenKeywords.LBrace, tokenSymbols.LBrace)],
  [isRBrace, parseCharToken(tokenKeywords.RBrace, tokenSymbols.RBrace)],
  [isDoubleQuote, parseString],
  [isKeywordStart, parseKeyword],
  [isNumberToken, parseNumber],
  [isSingleQuote, parseCharToken(tokenKeywords.Quote, tokenSymbols.Quote)],
  [
    isBacktick,
    parseCharToken(tokenKeywords.Quasiquote, tokenSymbols.Quasiquote)
  ],
  [isTilde, parseTilde],
  [isAt, parseDerefToken],
  [isCaret, parseMetaToken],
  [isHash, parseDispatch]
];
function parseNextToken(ctx) {
  const scanner = ctx.scanner;
  const char = scanner.peek();
  const entry = tokenParseEntries.find(([check]) => check(char, ctx));
  if (entry) {
    const [, parse] = entry;
    return parse(ctx);
  }
  return parseSymbol(ctx);
}
function parseAllTokens(ctx) {
  const tokens = [];
  let error = undefined;
  try {
    while (!ctx.scanner.isAtEnd()) {
      const result = parseNextToken(ctx);
      if (!result) {
        break;
      }
      if (result.kind === tokenKeywords.Whitespace) {
        continue;
      }
      tokens.push(result);
    }
  } catch (e) {
    error = e;
  }
  const parsed = {
    tokens,
    scanner: ctx.scanner,
    error
  };
  return parsed;
}
function getTokenValue(token) {
  if ("value" in token) {
    return token.value;
  }
  return "";
}
function tokenize(input) {
  const inputLength = input.length;
  const scanner = makeCharScanner(input);
  const tokenizationContext = {
    scanner
  };
  const tokensResult = parseAllTokens(tokenizationContext);
  if (tokensResult.error) {
    throw tokensResult.error;
  }
  if (tokensResult.scanner.position().offset !== inputLength) {
    throw new TokenizerError(`Unexpected end of input, expected ${inputLength} characters, got ${tokensResult.scanner.position().offset}`, tokensResult.scanner.position());
  }
  return tokensResult.tokens;
}

// src/core/reader.ts
function readAtom(ctx) {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input", scanner.position());
  }
  switch (token.kind) {
    case tokenKeywords.Symbol:
      return readSymbol(scanner);
    case tokenKeywords.String: {
      scanner.advance();
      const val = v.string(token.value);
      setPos(val, { start: token.start.offset, end: token.end.offset });
      return val;
    }
    case tokenKeywords.Number: {
      scanner.advance();
      const val = v.number(token.value);
      setPos(val, { start: token.start.offset, end: token.end.offset });
      return val;
    }
    case tokenKeywords.Keyword: {
      scanner.advance();
      const kwName = token.value;
      let val;
      if (kwName.startsWith("::")) {
        const rest = kwName.slice(2);
        if (rest.includes("/")) {
          const slashIdx = rest.indexOf("/");
          const alias = rest.slice(0, slashIdx);
          const localName = rest.slice(slashIdx + 1);
          const fullNs = ctx.aliases.get(alias);
          if (!fullNs) {
            throw new ReaderError(`No namespace alias '${alias}' found for ::${alias}/${localName}`, token, { start: token.start.offset, end: token.end.offset });
          }
          val = v.keyword(`:${fullNs}/${localName}`);
        } else {
          val = v.keyword(`:${ctx.namespace}/${rest}`);
        }
      } else {
        val = v.keyword(kwName);
      }
      setPos(val, { start: token.start.offset, end: token.end.offset });
      return val;
    }
  }
  throw new ReaderError(`Unexpected token: ${token.kind}`, token, {
    start: token.start.offset,
    end: token.end.offset
  });
}
var readQuote = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing quote", scanner.position());
  }
  scanner.advance();
  const value = readForm(ctx);
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token);
  }
  return v.list([v.symbol("quote"), value]);
};
var readQuasiquote = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing quasiquote", scanner.position());
  }
  scanner.advance();
  const value = readForm(ctx);
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token);
  }
  return v.list([v.symbol("quasiquote"), value]);
};
var readUnquote = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing unquote", scanner.position());
  }
  scanner.advance();
  const value = readForm(ctx);
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token);
  }
  return v.list([v.symbol("unquote"), value]);
};
var readMeta = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing metadata", scanner.position());
  }
  scanner.advance();
  const metaForm = readForm(ctx);
  const target = readForm(ctx);
  let metaEntries;
  if (is.keyword(metaForm)) {
    metaEntries = [[metaForm, v.boolean(true)]];
  } else if (is.map(metaForm)) {
    metaEntries = metaForm.entries;
  } else if (is.symbol(metaForm)) {
    metaEntries = [[v.keyword(":tag"), metaForm]];
  } else {
    throw new ReaderError("Metadata must be a keyword, map, or symbol", token);
  }
  if (is.symbol(target) || is.list(target) || is.vector(target) || is.map(target)) {
    const existingEntries = target.meta ? target.meta.entries : [];
    const result = {
      ...target,
      meta: v.map([...existingEntries, ...metaEntries])
    };
    const pos = getPos(target);
    if (pos)
      setPos(result, pos);
    return result;
  }
  return target;
};
var readVarQuote = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing var quote", scanner.position());
  }
  scanner.advance();
  const value = readForm(ctx);
  return v.list([v.symbol("var"), value]);
};
var readDeref = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing deref", scanner.position());
  }
  scanner.advance();
  const value = readForm(ctx);
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token);
  }
  return { kind: valueKeywords.list, value: [v.symbol("deref"), value] };
};
var readUnquoteSplicing = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input while parsing unquote splicing", scanner.position());
  }
  scanner.advance();
  const value = readForm(ctx);
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token);
  }
  return v.list([v.symbol(tokenSymbols.UnquoteSplicing), value]);
};
var isClosingToken = (token) => {
  return [
    tokenKeywords.RParen,
    tokenKeywords.RBracket,
    tokenKeywords.RBrace
  ].includes(token.kind);
};
var collectionReader = (valueType, closeToken) => {
  return function(ctx) {
    const scanner = ctx.scanner;
    const startToken = scanner.peek();
    if (!startToken) {
      throw new ReaderError("Unexpected end of input while parsing collection", scanner.position());
    }
    scanner.advance();
    const values = [];
    let pairMatched = false;
    let closingEnd;
    while (!scanner.isAtEnd()) {
      const token = scanner.peek();
      if (!token) {
        break;
      }
      if (isClosingToken(token) && token.kind !== closeToken) {
        throw new ReaderError(`Expected '${closeToken}' to close ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`, token, { start: token.start.offset, end: token.end.offset });
      }
      if (token.kind === closeToken) {
        closingEnd = token.end.offset;
        scanner.advance();
        pairMatched = true;
        break;
      }
      const value = readForm(ctx);
      values.push(value);
    }
    if (!pairMatched) {
      throw new ReaderError(`Unmatched ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}`, scanner.peek());
    }
    const result = { kind: valueType, value: values };
    if (closingEnd !== undefined) {
      setPos(result, { start: startToken.start.offset, end: closingEnd });
    }
    return result;
  };
};
var readList = collectionReader("list", tokenKeywords.RParen);
var readVector = collectionReader("vector", tokenKeywords.RBracket);
var readSet = (ctx) => {
  const scanner = ctx.scanner;
  const startToken = scanner.peek();
  if (!startToken) {
    throw new ReaderError("Unexpected end of input while parsing set", scanner.position());
  }
  scanner.advance();
  const values = [];
  let pairMatched = false;
  let closingEnd;
  while (!scanner.isAtEnd()) {
    const token = scanner.peek();
    if (!token)
      break;
    if (isClosingToken(token) && token.kind !== tokenKeywords.RBrace) {
      throw new ReaderError(`Expected '}' to close set started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`, token, { start: token.start.offset, end: token.end.offset });
    }
    if (token.kind === tokenKeywords.RBrace) {
      closingEnd = token.end.offset;
      scanner.advance();
      pairMatched = true;
      break;
    }
    values.push(readForm(ctx));
  }
  if (!pairMatched) {
    throw new ReaderError(`Unmatched set started at line ${startToken.start.line} column ${startToken.start.col}`, scanner.peek());
  }
  const deduped = [];
  for (const v2 of values) {
    if (!deduped.some((existing) => is.equal(existing, v2))) {
      deduped.push(v2);
    }
  }
  const result = v.set(deduped);
  if (closingEnd !== undefined) {
    setPos(result, { start: startToken.start.offset, end: closingEnd });
  }
  return result;
};
var readSymbol = (scanner) => {
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input", scanner.position());
  }
  if (token.kind !== tokenKeywords.Symbol) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token, {
      start: token.start.offset,
      end: token.end.offset
    });
  }
  scanner.advance();
  let val;
  switch (token.value) {
    case "true":
    case "false":
      val = v.boolean(token.value === "true");
      break;
    case "nil":
      val = v.nil();
      break;
    default:
      val = v.symbol(token.value);
  }
  setPos(val, { start: token.start.offset, end: token.end.offset });
  return val;
};
var readMap = (ctx) => {
  const scanner = ctx.scanner;
  const startToken = scanner.peek();
  if (!startToken) {
    throw new ReaderError("Unexpected end of input while parsing map", scanner.position());
  }
  let pairMatched = false;
  let closingEnd;
  scanner.advance();
  const entries = [];
  while (!scanner.isAtEnd()) {
    const token = scanner.peek();
    if (!token) {
      break;
    }
    if (isClosingToken(token) && token.kind !== tokenKeywords.RBrace) {
      throw new ReaderError(`Expected '}' to close map started at line ${startToken.start.line} column ${startToken.start.col}, but got '${token.kind}' at line ${token.start.line} column ${token.start.col}`, token, { start: token.start.offset, end: token.end.offset });
    }
    if (token.kind === tokenKeywords.RBrace) {
      closingEnd = token.end.offset;
      scanner.advance();
      pairMatched = true;
      break;
    }
    const key = readForm(ctx);
    const nextToken = scanner.peek();
    if (!nextToken) {
      throw new ReaderError(`Expected value in map started at line ${startToken.start.line} column ${startToken.start.col}, but got end of input`, scanner.position());
    }
    if (nextToken.kind === tokenKeywords.RBrace) {
      throw new ReaderError(`Map started at line ${startToken.start.line} column ${startToken.start.col} has key ${key.kind} but no value`, scanner.position());
    }
    const value = readForm(ctx);
    if (!value) {
      break;
    }
    entries.push([key, value]);
  }
  if (!pairMatched) {
    throw new ReaderError(`Unmatched map started at line ${startToken.start.line} column ${startToken.start.col}`, scanner.peek());
  }
  const result = { kind: valueKeywords.map, entries };
  if (closingEnd !== undefined) {
    setPos(result, { start: startToken.start.offset, end: closingEnd });
  }
  return result;
};
function collectAnonFnParams(forms) {
  let maxIndex = 0;
  let hasRest = false;
  function walk(form) {
    switch (form.kind) {
      case "symbol": {
        const name = form.name;
        if (name === "%" || name === "%1") {
          maxIndex = Math.max(maxIndex, 1);
        } else if (/^%[2-9]$/.test(name)) {
          maxIndex = Math.max(maxIndex, parseInt(name[1]));
        } else if (name === "%&") {
          hasRest = true;
        }
        break;
      }
      case "list":
      case "vector":
        for (const child of form.value)
          walk(child);
        break;
      case "map":
        for (const [k, v2] of form.entries) {
          walk(k);
          walk(v2);
        }
        break;
      default:
        break;
    }
  }
  for (const form of forms)
    walk(form);
  return { maxIndex, hasRest };
}
function substituteAnonFnParams(form) {
  switch (form.kind) {
    case "symbol": {
      const name = form.name;
      if (name === "%" || name === "%1")
        return v.symbol("p1");
      if (/^%[2-9]$/.test(name))
        return v.symbol(`p${name[1]}`);
      if (name === "%&")
        return v.symbol("rest");
      return form;
    }
    case "list":
      return { ...form, value: form.value.map(substituteAnonFnParams) };
    case "vector":
      return { ...form, value: form.value.map(substituteAnonFnParams) };
    case "map":
      return {
        ...form,
        entries: form.entries.map(([k, v2]) => [substituteAnonFnParams(k), substituteAnonFnParams(v2)])
      };
    default:
      return form;
  }
}
var readAnonFn = (ctx) => {
  const scanner = ctx.scanner;
  const startToken = scanner.peek();
  if (!startToken) {
    throw new ReaderError("Unexpected end of input while parsing anonymous function", scanner.position());
  }
  scanner.advance();
  const bodyForms = [];
  let pairMatched = false;
  let closingEnd;
  while (!scanner.isAtEnd()) {
    const token = scanner.peek();
    if (!token)
      break;
    if (isClosingToken(token) && token.kind !== tokenKeywords.RParen) {
      throw new ReaderError(`Expected ')' to close anonymous function started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`, token, { start: token.start.offset, end: token.end.offset });
    }
    if (token.kind === tokenKeywords.RParen) {
      closingEnd = token.end.offset;
      scanner.advance();
      pairMatched = true;
      break;
    }
    if (token.kind === tokenKeywords.AnonFnStart) {
      throw new ReaderError("Nested anonymous functions (#(...)) are not allowed", token, { start: token.start.offset, end: token.end.offset });
    }
    bodyForms.push(readForm(ctx));
  }
  if (!pairMatched) {
    throw new ReaderError(`Unmatched anonymous function started at line ${startToken.start.line} column ${startToken.start.col}`, scanner.peek());
  }
  const bodyList = v.list(bodyForms);
  const { maxIndex, hasRest } = collectAnonFnParams([bodyList]);
  const paramSymbols = [];
  for (let i = 1;i <= maxIndex; i++) {
    paramSymbols.push(v.symbol(`p${i}`));
  }
  if (hasRest) {
    paramSymbols.push(v.symbol("&"));
    paramSymbols.push(v.symbol("rest"));
  }
  const substitutedBody = substituteAnonFnParams(bodyList);
  const result = v.list([
    v.symbol("fn"),
    v.vector(paramSymbols),
    substitutedBody
  ]);
  if (closingEnd !== undefined) {
    setPos(result, { start: startToken.start.offset, end: closingEnd });
  }
  return result;
};
function extractInlineFlags(raw) {
  let remaining = raw;
  let flags = "";
  const flagGroupRe = /^\(\?([imsx]+)\)/;
  let m;
  while ((m = flagGroupRe.exec(remaining)) !== null) {
    for (const f of m[1]) {
      if (f === "x") {
        throw new ReaderError("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported", null);
      }
      if (!flags.includes(f))
        flags += f;
    }
    remaining = remaining.slice(m[0].length);
  }
  return { pattern: remaining, flags };
}
var readRegex = (ctx) => {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token || token.kind !== tokenKeywords.Regex) {
    throw new ReaderError("Expected regex token", scanner.position());
  }
  scanner.advance();
  const { pattern, flags } = extractInlineFlags(token.value);
  const val = v.regex(pattern, flags);
  setPos(val, { start: token.start.offset, end: token.end.offset });
  return val;
};
function readForm(ctx) {
  const scanner = ctx.scanner;
  const token = scanner.peek();
  if (!token) {
    throw new ReaderError("Unexpected end of input", scanner.position());
  }
  switch (token.kind) {
    case tokenKeywords.String:
    case tokenKeywords.Number:
    case tokenKeywords.Keyword:
    case tokenKeywords.Symbol:
      return readAtom(ctx);
    case tokenKeywords.LParen:
      return readList(ctx);
    case tokenKeywords.LBrace:
      return readMap(ctx);
    case tokenKeywords.LBracket:
      return readVector(ctx);
    case tokenKeywords.Quote:
      return readQuote(ctx);
    case tokenKeywords.Quasiquote:
      return readQuasiquote(ctx);
    case tokenKeywords.Unquote:
      return readUnquote(ctx);
    case tokenKeywords.UnquoteSplicing:
      return readUnquoteSplicing(ctx);
    case tokenKeywords.AnonFnStart:
      return readAnonFn(ctx);
    case tokenKeywords.SetStart:
      return readSet(ctx);
    case tokenKeywords.Deref:
      return readDeref(ctx);
    case tokenKeywords.VarQuote:
      return readVarQuote(ctx);
    case tokenKeywords.Meta:
      return readMeta(ctx);
    case tokenKeywords.Regex:
      return readRegex(ctx);
    default:
      throw new ReaderError(`Unexpected token: ${getTokenValue(token)} at line ${token.start.line} column ${token.start.col}`, token, { start: token.start.offset, end: token.end.offset });
  }
}
function readForms(input, currentNs = "user", aliases = new Map) {
  const withoutComments = input.filter((t) => t.kind !== tokenKeywords.Comment);
  const scanner = makeTokenScanner(withoutComments);
  const ctx = {
    scanner,
    namespace: currentNs,
    aliases
  };
  const values = [];
  while (!scanner.isAtEnd()) {
    values.push(readForm(ctx));
  }
  return values;
}

// src/core/registry.ts
var ALWAYS_ALLOWED = ["clojure", "user"];
function isNamespaceAllowed(nsName, allowedPackages) {
  if (allowedPackages === "all")
    return true;
  const rootPackage = nsName.split(".")[0];
  if (ALWAYS_ALLOWED.includes(rootPackage))
    return true;
  return allowedPackages.some((pkg) => nsName === pkg || nsName.startsWith(pkg + "."));
}
function cloneBindings(bindings) {
  const out = new Map;
  for (const [k, v2] of bindings) {
    out.set(k, v2.kind === "var" ? { ...v2 } : v2);
  }
  return out;
}
function cloneEnv(env, memo) {
  if (memo.has(env))
    return memo.get(env);
  const cloned = {
    bindings: cloneBindings(env.bindings),
    outer: null
  };
  if (env.ns) {
    cloned.ns = {
      kind: "namespace",
      name: env.ns.name,
      vars: new Map([...env.ns.vars].map(([k, v2]) => [k, { ...v2 }])),
      aliases: new Map,
      readerAliases: new Map(env.ns.readerAliases)
    };
  }
  memo.set(env, cloned);
  if (env.outer)
    cloned.outer = cloneEnv(env.outer, memo);
  return cloned;
}
function cloneRegistry(registry) {
  const memo = new Map;
  const next = new Map;
  for (const [name, env] of registry) {
    next.set(name, cloneEnv(env, memo));
  }
  for (const [name, env] of registry) {
    const clonedEnv = next.get(name);
    if (env.ns && clonedEnv.ns) {
      for (const [alias, origNs] of env.ns.aliases) {
        const targetCloned = next.get(origNs.name);
        if (targetCloned?.ns)
          clonedEnv.ns.aliases.set(alias, targetCloned.ns);
      }
    }
  }
  return next;
}
function ensureNamespaceInRegistry(registry, coreEnv, name) {
  if (!registry.has(name)) {
    const nsEnv = makeEnv(coreEnv);
    nsEnv.ns = makeNamespace(name);
    registry.set(name, nsEnv);
  }
  return registry.get(name);
}
function processRequireSpec(spec, currentEnv, registry, resolveNs, allowedPackages, isLibraryNamespace) {
  if (!is.vector(spec)) {
    throw new EvaluationError("require spec must be a vector, e.g. [my.ns :as alias]", { spec });
  }
  const elements = spec.value;
  if (elements.length === 0 || !is.symbol(elements[0])) {
    throw new EvaluationError("First element of require spec must be a namespace symbol", { spec });
  }
  const nsName = elements[0].name;
  const isLibrary = isLibraryNamespace ? isLibraryNamespace(nsName) : true;
  if (isLibrary && allowedPackages !== undefined && !isNamespaceAllowed(nsName, allowedPackages)) {
    const allowedList = allowedPackages === "all" ? [] : allowedPackages;
    const err = new EvaluationError(`Access denied: namespace '${nsName}' is not in the allowed packages for this session.
` + `Allowed packages: ${JSON.stringify(allowedList)}
` + `To allow all packages, use: allowedPackages: 'all'`, { nsName, allowedPackages });
    err.code = "namespace/access-denied";
    throw err;
  }
  const hasAsAlias = elements.some((el) => is.keyword(el) && el.name === ":as-alias");
  if (hasAsAlias) {
    let i2 = 1;
    while (i2 < elements.length) {
      const kw = elements[i2];
      if (!is.keyword(kw)) {
        throw new EvaluationError(`Expected keyword in require spec, got ${kw.kind}`, { spec, position: i2 });
      }
      if (kw.name === ":as-alias") {
        i2++;
        const alias = elements[i2];
        if (!alias || !is.symbol(alias)) {
          throw new EvaluationError(":as-alias expects a symbol alias", {
            spec,
            position: i2
          });
        }
        currentEnv.ns.readerAliases.set(alias.name, nsName);
        i2++;
      } else {
        throw new EvaluationError(`:as-alias specs only support :as-alias, got ${kw.name}`, { spec });
      }
    }
    return;
  }
  let targetEnv = registry.get(nsName);
  if (!targetEnv && resolveNs) {
    resolveNs(nsName);
    targetEnv = registry.get(nsName);
  }
  if (!targetEnv) {
    const err = new EvaluationError(`Namespace '${nsName}' not found. Only already-loaded namespaces can be required.`, { nsName });
    err.code = "namespace/not-found";
    throw err;
  }
  let i = 1;
  while (i < elements.length) {
    const kw = elements[i];
    if (!is.keyword(kw)) {
      throw new EvaluationError(`Expected keyword in require spec, got ${kw.kind}`, { spec, position: i });
    }
    if (kw.name === ":as") {
      i++;
      const alias = elements[i];
      if (!alias || !is.symbol(alias)) {
        throw new EvaluationError(":as expects a symbol alias", {
          spec,
          position: i
        });
      }
      currentEnv.ns.aliases.set(alias.name, targetEnv.ns);
      i++;
    } else if (kw.name === ":refer") {
      i++;
      const symsVec = elements[i];
      if (!symsVec || !is.vector(symsVec)) {
        throw new EvaluationError(":refer expects a vector of symbols", {
          spec,
          position: i
        });
      }
      for (const sym of symsVec.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(":refer vector must contain only symbols", {
            spec,
            sym
          });
        }
        const v2 = targetEnv.ns.vars.get(sym.name);
        if (v2 === undefined) {
          throw new EvaluationError(`Symbol ${sym.name} not found in namespace ${nsName}`, { nsName, symbol: sym.name });
        }
        currentEnv.ns.vars.set(sym.name, v2);
      }
      i++;
    } else {
      throw new EvaluationError(`Unknown require option ${kw.name}. Supported: :as, :refer`, { spec, keyword: kw.name });
    }
  }
}

// src/core/bootstrap.ts
function wireNsCore(registry, coreEnv, getCurrentNs, resolveNamespace) {
  const initialNsObj = registry.get("user")?.ns ?? makeNamespace("user");
  internVar("*ns*", initialNsObj, coreEnv);
  const nsVar = coreEnv.ns?.vars.get("*ns*");
  if (nsVar)
    nsVar.dynamic = true;
  function resolveNsSym(sym) {
    if (sym === undefined)
      return null;
    if (isNamespace(sym))
      return sym;
    if (!isSymbol(sym))
      return null;
    return registry.get(sym.name)?.ns ?? null;
  }
  internVar("ns-name", v.nativeFn("ns-name", (x) => {
    if (x === undefined)
      return v.nil();
    if (x.kind === "namespace")
      return v.symbol(x.name);
    if (x.kind === "symbol")
      return x;
    if (x.kind === "string")
      return v.symbol(x.value);
    return v.nil();
  }), coreEnv);
  internVar("all-ns", v.nativeFn("all-ns", () => v.list([...registry.values()].map((env) => env.ns).filter(Boolean))), coreEnv);
  internVar("find-ns", v.nativeFn("find-ns", (sym) => {
    if (sym === undefined || !isSymbol(sym))
      return v.nil();
    return registry.get(sym.name)?.ns ?? v.nil();
  }), coreEnv);
  internVar("in-ns", v.nativeFnCtx("in-ns", (ctx, _callEnv, sym) => {
    if (!sym || !isSymbol(sym)) {
      throw new EvaluationError("in-ns expects a symbol", { sym });
    }
    if (ctx.setCurrentNs)
      ctx.setCurrentNs(sym.name);
    return registry.get(sym.name)?.ns ?? v.nil();
  }), coreEnv);
  internVar("ns-aliases", v.nativeFn("ns-aliases", (sym) => {
    const ns = resolveNsSym(sym);
    if (!ns)
      return v.map([]);
    const entries = [];
    ns.aliases.forEach((targetNs, alias) => {
      entries.push([v.symbol(alias), targetNs]);
    });
    return v.map(entries);
  }), coreEnv);
  internVar("ns-interns", v.nativeFn("ns-interns", (sym) => {
    const ns = resolveNsSym(sym);
    if (!ns)
      return v.map([]);
    const entries = [];
    ns.vars.forEach((theVar, name) => {
      if (theVar.ns === ns.name)
        entries.push([v.symbol(name), theVar]);
    });
    return v.map(entries);
  }), coreEnv);
  internVar("ns-publics", v.nativeFn("ns-publics", (sym) => {
    const ns = resolveNsSym(sym);
    if (!ns)
      return v.map([]);
    const entries = [];
    ns.vars.forEach((theVar, name) => {
      if (theVar.ns !== ns.name)
        return;
      const isPrivate = (theVar.meta?.entries ?? []).some(([k, val]) => k.kind === "keyword" && k.name === ":private" && val.kind === "boolean" && val.value === true);
      if (!isPrivate)
        entries.push([v.symbol(name), theVar]);
    });
    return v.map(entries);
  }), coreEnv);
  internVar("ns-refers", v.nativeFn("ns-refers", (sym) => {
    const ns = resolveNsSym(sym);
    if (!ns)
      return v.map([]);
    const entries = [];
    ns.vars.forEach((theVar, name) => {
      if (theVar.ns !== ns.name)
        entries.push([v.symbol(name), theVar]);
    });
    return v.map(entries);
  }), coreEnv);
  internVar("ns-map", v.nativeFn("ns-map", (sym) => {
    const ns = resolveNsSym(sym);
    if (!ns)
      return v.map([]);
    const entries = [];
    ns.vars.forEach((theVar, name) => {
      entries.push([v.symbol(name), theVar]);
    });
    return v.map(entries);
  }), coreEnv);
  internVar("ns-imports", v.nativeFn("ns-imports", (_sym) => v.map([])), coreEnv);
  internVar("the-ns", v.nativeFn("the-ns", (sym) => {
    if (sym === undefined)
      return v.nil();
    if (isNamespace(sym))
      return sym;
    if (!isSymbol(sym))
      return v.nil();
    return registry.get(sym.name)?.ns ?? v.nil();
  }), coreEnv);
  internVar("instance?", v.nativeFn("instance?", (_cls, _obj) => v.boolean(false)), coreEnv);
  internVar("class", v.nativeFn("class", (x) => {
    if (x === undefined)
      return v.nil();
    return v.string(`conjure.${x.kind}`);
  }), coreEnv);
  internVar("class?", v.nativeFn("class?", (_x) => v.boolean(false)), coreEnv);
  internVar("special-symbol?", v.nativeFn("special-symbol?", (sym) => {
    if (sym === undefined || !isSymbol(sym))
      return v.boolean(false);
    const specials = new Set([
      ...Object.values(specialFormKeywords),
      "import"
    ]);
    return v.boolean(specials.has(sym.name));
  }), coreEnv);
  internVar("loaded-libs", v.nativeFn("loaded-libs", () => v.set([...registry.keys()].map(v.symbol))), coreEnv);
  internVar("require", v.nativeFnCtx("require", (ctx, _callEnv, ...args) => {
    const currentEnv = registry.get(getCurrentNs());
    for (const arg of args) {
      processRequireSpec(arg, currentEnv, registry, (nsName) => resolveNamespace(nsName, ctx));
    }
    return v.nil();
  }), coreEnv);
  internVar("resolve", v.nativeFn("resolve", (sym) => {
    if (!isSymbol(sym))
      return v.nil();
    const slashIdx = sym.name.indexOf("/");
    if (slashIdx > 0) {
      const nsName = sym.name.slice(0, slashIdx);
      const symName = sym.name.slice(slashIdx + 1);
      const nsEnv = registry.get(nsName) ?? null;
      if (!nsEnv)
        return v.nil();
      return tryLookup(symName, nsEnv) ?? v.nil();
    }
    const currentEnv = registry.get(getCurrentNs());
    return tryLookup(sym.name, currentEnv) ?? v.nil();
  }), coreEnv);
}
function wireIdeStubs(registry, coreEnv) {
  const reflectEnv = ensureNamespaceInRegistry(registry, coreEnv, "clojure.reflect");
  internVar("parse-flags", v.nativeFn("parse-flags", (_flags, _kind) => v.set([])), reflectEnv);
  internVar("reflect", v.nativeFn("reflect", (_obj) => v.map([])), reflectEnv);
  internVar("type-reflect", v.nativeFn("type-reflect", (_typeobj, ..._opts) => v.map([])), reflectEnv);
  const cursiveEnv = ensureNamespaceInRegistry(registry, coreEnv, "cursive.repl.runtime");
  internVar("completions", v.nativeFn("completions", (..._args) => v.nil()), cursiveEnv);
  for (const javaClass of [
    "Class",
    "Object",
    "String",
    "Number",
    "Boolean",
    "Integer",
    "Long",
    "Double",
    "Float",
    "Byte",
    "Short",
    "Character",
    "Void",
    "Math",
    "System",
    "Runtime",
    "Thread",
    "Throwable",
    "Exception",
    "Error",
    "Iterable",
    "Comparable",
    "Runnable",
    "Cloneable"
  ]) {
    internVar(javaClass, v.keyword(`:java.lang/${javaClass}`), coreEnv);
  }
}

// src/core/module.ts
function resolveModuleOrder(modules, existingNamespaces) {
  const byId = new Map;
  for (const m of modules) {
    if (byId.has(m.id)) {
      throw new Error(`Duplicate module ID: '${m.id}'`);
    }
    byId.set(m.id, m);
  }
  const nsProviders = new Map;
  for (const m of modules) {
    for (const decl of m.declareNs) {
      const providers = nsProviders.get(decl.name) ?? [];
      providers.push(m.id);
      nsProviders.set(decl.name, providers);
    }
  }
  const graph = new Map;
  const inDegree = new Map;
  for (const m of modules) {
    graph.set(m.id, []);
    inDegree.set(m.id, 0);
  }
  for (const m of modules) {
    for (const depNs of m.dependsOn ?? []) {
      if (existingNamespaces?.has(depNs))
        continue;
      const providers = nsProviders.get(depNs);
      if (!providers || providers.length === 0) {
        throw new Error(`No module provides namespace '${depNs}' (required by '${m.id}')`);
      }
      for (const providerId of providers) {
        if (providerId === m.id)
          continue;
        graph.get(providerId).push(m.id);
        inDegree.set(m.id, inDegree.get(m.id) + 1);
      }
    }
  }
  const queue = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0)
      queue.push(id);
  }
  const result = [];
  while (queue.length > 0) {
    const id = queue.shift();
    result.push(byId.get(id));
    for (const dependentId of graph.get(id)) {
      const newDegree = inDegree.get(dependentId) - 1;
      inDegree.set(dependentId, newDegree);
      if (newDegree === 0)
        queue.push(dependentId);
    }
  }
  if (result.length !== modules.length) {
    const unprocessed = modules.map((m) => m.id).filter((id) => !result.some((m) => m.id === id));
    throw new Error(`Circular dependency detected in module system. Modules in cycle: ${unprocessed.join(", ")}`);
  }
  return result;
}

// src/core/modules/core/stdlib/arithmetic.ts
var arithmeticFunctions = {
  "+": v.nativeFn("+", function add(...nums) {
    if (nums.length === 0) {
      return v.number(0);
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("+ expects all arguments to be numbers", { args: nums }, badIdx);
    }
    return nums.reduce(function sumNumbers(acc, arg) {
      return v.number(acc.value + arg.value);
    }, v.number(0));
  }).doc("Returns the sum of the arguments. Throws on non-number arguments.", [
    ["&", "nums"]
  ]),
  "-": v.nativeFn("-", function subtract(...nums) {
    if (nums.length === 0) {
      throw new EvaluationError("- expects at least one argument", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("- expects all arguments to be numbers", { args: nums }, badIdx);
    }
    return nums.slice(1).reduce(function subtractNumbers(acc, arg) {
      return v.number(acc.value - arg.value);
    }, nums[0]);
  }).doc("Returns the difference of the arguments. Throws on non-number arguments.", [["&", "nums"]]),
  "*": v.nativeFn("*", function multiply(...nums) {
    if (nums.length === 0) {
      return v.number(1);
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("* expects all arguments to be numbers", { args: nums }, badIdx);
    }
    return nums.slice(1).reduce(function multiplyNumbers(acc, arg) {
      return v.number(acc.value * arg.value);
    }, nums[0]);
  }).doc("Returns the product of the arguments. Throws on non-number arguments.", [["&", "nums"]]),
  "/": v.nativeFn("/", function divide(...nums) {
    if (nums.length === 0) {
      throw new EvaluationError("/ expects at least one argument", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("/ expects all arguments to be numbers", { args: nums }, badIdx);
    }
    return nums.slice(1).reduce(function divideNumbers(acc, arg, reduceIdx) {
      if (arg.value === 0) {
        const err = new EvaluationError("division by zero", { args: nums });
        err.data = { argIndex: reduceIdx + 1 };
        throw err;
      }
      return v.number(acc.value / arg.value);
    }, nums[0]);
  }).doc("Returns the quotient of the arguments. Throws on non-number arguments or division by zero.", [["&", "nums"]]),
  ">": v.nativeFn(">", function greaterThan(...nums) {
    if (nums.length < 2) {
      throw new EvaluationError("> expects at least two arguments", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("> expects all arguments to be numbers", { args: nums }, badIdx);
    }
    for (let i = 1;i < nums.length; i++) {
      if (nums[i].value >= nums[i - 1].value) {
        return v.boolean(false);
      }
    }
    return v.boolean(true);
  }).doc("Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.", [["&", "nums"]]),
  "<": v.nativeFn("<", function lessThan(...nums) {
    if (nums.length < 2) {
      throw new EvaluationError("< expects at least two arguments", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("< expects all arguments to be numbers", { args: nums }, badIdx);
    }
    for (let i = 1;i < nums.length; i++) {
      if (nums[i].value <= nums[i - 1].value) {
        return v.boolean(false);
      }
    }
    return v.boolean(true);
  }).doc("Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.", [["&", "nums"]]),
  ">=": v.nativeFn(">=", function greaterThanOrEqual(...nums) {
    if (nums.length < 2) {
      throw new EvaluationError(">= expects at least two arguments", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg(">= expects all arguments to be numbers", { args: nums }, badIdx);
    }
    for (let i = 1;i < nums.length; i++) {
      if (nums[i].value > nums[i - 1].value) {
        return v.boolean(false);
      }
    }
    return v.boolean(true);
  }).doc("Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.", [["&", "nums"]]),
  "<=": v.nativeFn("<=", function lessThanOrEqual(...nums) {
    if (nums.length < 2) {
      throw new EvaluationError("<= expects at least two arguments", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("<= expects all arguments to be numbers", { args: nums }, badIdx);
    }
    for (let i = 1;i < nums.length; i++) {
      if (nums[i].value < nums[i - 1].value) {
        return v.boolean(false);
      }
    }
    return v.boolean(true);
  }).doc("Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.", [["&", "nums"]]),
  "=": v.nativeFn("=", function equals(...vals) {
    if (vals.length < 2) {
      throw new EvaluationError("= expects at least two arguments", {
        args: vals
      });
    }
    for (let i = 1;i < vals.length; i++) {
      if (!is.equal(vals[i], vals[i - 1])) {
        return v.boolean(false);
      }
    }
    return v.boolean(true);
  }).doc("Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.", [["&", "vals"]]),
  inc: v.nativeFn("inc", function increment(x) {
    if (x === undefined || x.kind !== "number") {
      throw EvaluationError.atArg(`inc expects a number${x !== undefined ? `, got ${printString(x)}` : ""}`, { x }, 0);
    }
    return v.number(x.value + 1);
  }).doc("Returns the argument incremented by 1. Throws on non-number arguments.", [["x"]]),
  dec: v.nativeFn("dec", function decrement(x) {
    if (x === undefined || x.kind !== "number") {
      throw EvaluationError.atArg(`dec expects a number${x !== undefined ? `, got ${printString(x)}` : ""}`, { x }, 0);
    }
    return v.number(x.value - 1);
  }).doc("Returns the argument decremented by 1. Throws on non-number arguments.", [["x"]]),
  max: v.nativeFn("max", function maximum(...nums) {
    if (nums.length === 0) {
      throw new EvaluationError("max expects at least one argument", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("max expects all arguments to be numbers", { args: nums }, badIdx);
    }
    return nums.reduce(function findMax(best, arg) {
      return arg.value > best.value ? arg : best;
    });
  }).doc("Returns the largest of the arguments. Throws on non-number arguments.", [["&", "nums"]]),
  min: v.nativeFn("min", function minimum(...nums) {
    if (nums.length === 0) {
      throw new EvaluationError("min expects at least one argument", {
        args: nums
      });
    }
    const badIdx = nums.findIndex(function isNotNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("min expects all arguments to be numbers", { args: nums }, badIdx);
    }
    return nums.reduce(function findMin(best, arg) {
      return arg.value < best.value ? arg : best;
    });
  }).doc("Returns the smallest of the arguments. Throws on non-number arguments.", [["&", "nums"]]),
  mod: v.nativeFn("mod", function modulo(n, d) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`mod expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    if (d === undefined || d.kind !== "number") {
      throw EvaluationError.atArg(`mod expects a number as second argument${d !== undefined ? `, got ${printString(d)}` : ""}`, { d }, 1);
    }
    if (d.value === 0) {
      const err = new EvaluationError("mod: division by zero", { n, d });
      err.data = { argIndex: 1 };
      throw err;
    }
    const result = n.value % d.value;
    return v.number(result < 0 ? result + Math.abs(d.value) : result);
  }).doc("Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.", [["n", "d"]]),
  "even?": v.nativeFn("even?", function isEven(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`even? expects a number${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.boolean(n.value % 2 === 0);
  }).doc("Returns true if the argument is an even number, false otherwise.", [
    ["n"]
  ]),
  "odd?": v.nativeFn("odd?", function isOdd(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`odd? expects a number${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.boolean(Math.abs(n.value) % 2 !== 0);
  }).doc("Returns true if the argument is an odd number, false otherwise.", [
    ["n"]
  ]),
  "pos?": v.nativeFn("pos?", function isPositive(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`pos? expects a number${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.boolean(n.value > 0);
  }).doc("Returns true if the argument is a positive number, false otherwise.", [["n"]]),
  "neg?": v.nativeFn("neg?", function isNegative(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`neg? expects a number${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.boolean(n.value < 0);
  }).doc("Returns true if the argument is a negative number, false otherwise.", [["n"]]),
  "zero?": v.nativeFn("zero?", function isZero(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`zero? expects a number${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.boolean(n.value === 0);
  }).doc("Returns true if the argument is zero, false otherwise.", [["n"]]),
  abs: v.nativeFn("abs", function absImpl(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`abs expects a number${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.number(Math.abs(n.value));
  }).doc("Returns the absolute value of a.", [["a"]]),
  quot: v.nativeFn("quot", function quotImpl(num, div) {
    if (num === undefined || num.kind !== "number") {
      throw EvaluationError.atArg(`quot expects a number as first argument`, { num }, 0);
    }
    if (div === undefined || div.kind !== "number") {
      throw EvaluationError.atArg(`quot expects a number as second argument`, { div }, 1);
    }
    if (div.value === 0) {
      throw EvaluationError.atArg("quot: division by zero", { num, div }, 1);
    }
    return v.number(Math.trunc(num.value / div.value));
  }).doc("quot[ient] of dividing numerator by denominator.", [["num", "div"]]),
  rem: v.nativeFn("rem", function remImpl(num, div) {
    if (num === undefined || num.kind !== "number") {
      throw EvaluationError.atArg(`rem expects a number as first argument`, { num }, 0);
    }
    if (div === undefined || div.kind !== "number") {
      throw EvaluationError.atArg(`rem expects a number as second argument`, { div }, 1);
    }
    if (div.value === 0) {
      throw EvaluationError.atArg("rem: division by zero", { num, div }, 1);
    }
    return v.number(num.value % div.value);
  }).doc("remainder of dividing numerator by denominator.", [["num", "div"]]),
  rand: v.nativeFn("rand", function randImpl(...args) {
    if (args.length === 0)
      return v.number(Math.random());
    if (args[0].kind !== "number") {
      throw EvaluationError.atArg(`rand expects a number`, { n: args[0] }, 0);
    }
    return v.number(Math.random() * args[0].value);
  }).doc("Returns a random floating point number between 0 (inclusive) and n (default 1) (exclusive).", [[], ["n"]]),
  "rand-int": v.nativeFn("rand-int", function randIntImpl(n) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`rand-int expects a number`, { n }, 0);
    }
    return v.number(Math.floor(Math.random() * n.value));
  }).doc("Returns a random integer between 0 (inclusive) and n (exclusive).", [
    ["n"]
  ]),
  "rand-nth": v.nativeFn("rand-nth", function randNthImpl(coll) {
    if (coll === undefined || !is.list(coll) && !is.vector(coll)) {
      throw EvaluationError.atArg(`rand-nth expects a list or vector`, { coll }, 0);
    }
    const items = coll.value;
    if (items.length === 0) {
      throw EvaluationError.atArg("rand-nth called on empty collection", { coll }, 0);
    }
    return items[Math.floor(Math.random() * items.length)];
  }).doc("Return a random element of the (sequential) collection.", [["coll"]]),
  shuffle: v.nativeFn("shuffle", function shuffleImpl(coll) {
    if (coll === undefined || coll.kind === "nil")
      return v.vector([]);
    if (!is.seqable(coll)) {
      throw EvaluationError.atArg(`shuffle expects a collection, got ${printString(coll)}`, { coll }, 0);
    }
    const arr = [...toSeq(coll)];
    for (let i = arr.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return v.vector(arr);
  }).doc("Return a random permutation of coll.", [["coll"]]),
  "bit-and": v.nativeFn("bit-and", function bitAndImpl(x, y) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("bit-and expects numbers", { x }, 0);
    if (y?.kind !== "number")
      throw EvaluationError.atArg("bit-and expects numbers", { y }, 1);
    return v.number(x.value & y.value);
  }).doc("Bitwise and", [["x", "y"]]),
  "bit-or": v.nativeFn("bit-or", function bitOrImpl(x, y) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("bit-or expects numbers", { x }, 0);
    if (y?.kind !== "number")
      throw EvaluationError.atArg("bit-or expects numbers", { y }, 1);
    return v.number(x.value | y.value);
  }).doc("Bitwise or", [["x", "y"]]),
  "bit-xor": v.nativeFn("bit-xor", function bitXorImpl(x, y) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("bit-xor expects numbers", { x }, 0);
    if (y?.kind !== "number")
      throw EvaluationError.atArg("bit-xor expects numbers", { y }, 1);
    return v.number(x.value ^ y.value);
  }).doc("Bitwise exclusive or", [["x", "y"]]),
  "bit-not": v.nativeFn("bit-not", function bitNotImpl(x) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("bit-not expects a number", { x }, 0);
    return v.number(~x.value);
  }).doc("Bitwise complement", [["x"]]),
  "bit-shift-left": v.nativeFn("bit-shift-left", function bitShiftLeftImpl(x, n) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("bit-shift-left expects numbers", { x }, 0);
    if (n?.kind !== "number")
      throw EvaluationError.atArg("bit-shift-left expects numbers", { n }, 1);
    return v.number(x.value << n.value);
  }).doc("Bitwise shift left", [["x", "n"]]),
  "bit-shift-right": v.nativeFn("bit-shift-right", function bitShiftRightImpl(x, n) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("bit-shift-right expects numbers", { x }, 0);
    if (n?.kind !== "number")
      throw EvaluationError.atArg("bit-shift-right expects numbers", { n }, 1);
    return v.number(x.value >> n.value);
  }).doc("Bitwise shift right", [["x", "n"]]),
  "unsigned-bit-shift-right": v.nativeFn("unsigned-bit-shift-right", function unsignedBitShiftRightImpl(x, n) {
    if (x?.kind !== "number")
      throw EvaluationError.atArg("unsigned-bit-shift-right expects numbers", { x }, 0);
    if (n?.kind !== "number")
      throw EvaluationError.atArg("unsigned-bit-shift-right expects numbers", { n }, 1);
    return v.number(x.value >>> n.value);
  }).doc("Bitwise shift right, without sign-extension", [["x", "n"]])
};

// src/core/modules/core/stdlib/atoms.ts
function validateAtom(a, newVal, ctx, callEnv) {
  if (a.validator && is.aFunction(a.validator)) {
    const result = ctx.applyFunction(a.validator, [newVal], callEnv);
    if (is.falsy(result)) {
      throw new EvaluationError("Invalid reference state", { newVal });
    }
  }
}
function notifyWatches(a, oldVal, newVal) {
  if (a.watches) {
    for (const [, { key, fn, ctx, callEnv }] of a.watches) {
      ctx.applyFunction(fn, [key, { kind: "atom", value: newVal }, oldVal, newVal], callEnv);
    }
  }
}
var atomFunctions = {
  atom: v.nativeFn("atom", function atom(value) {
    return v.atom(value);
  }).doc("Returns a new atom holding the given value.", [["value"]]),
  deref: v.nativeFn("deref", function deref(value) {
    if (is.atom(value))
      return value.value;
    if (is.volatile(value))
      return value.value;
    if (is.reduced(value))
      return value.value;
    if (is.delay(value))
      return realizeDelay(value);
    if (value.kind === "pending") {
      throw EvaluationError.atArg("@ on a pending value requires an (async ...) context. Use (async @x) or compose with then/catch.", { value }, 0);
    }
    throw EvaluationError.atArg(`deref expects an atom, volatile, reduced, or delay value, got ${value.kind}`, { value }, 0);
  }).doc("Returns the wrapped value from an atom, volatile, reduced, or delay value.", [["value"]]),
  "swap!": v.nativeFnCtx("swap!", function swap(ctx, callEnv, atomVal, fn, ...extraArgs) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`swap! expects an atom as its first argument, got ${atomVal.kind}`, { atomVal }, 0);
    }
    if (!is.aFunction(fn)) {
      throw EvaluationError.atArg(`swap! expects a function as its second argument, got ${fn.kind}`, { fn }, 1);
    }
    const a = atomVal;
    const oldVal = a.value;
    const newVal = ctx.applyFunction(fn, [oldVal, ...extraArgs], callEnv);
    validateAtom(a, newVal, ctx, callEnv);
    a.value = newVal;
    notifyWatches(a, oldVal, newVal);
    return newVal;
  }).doc("Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.", [["atomVal", "fn", "&", "extraArgs"]]),
  "reset!": v.nativeFnCtx("reset!", function reset(ctx, callEnv, atomVal, newVal) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`reset! expects an atom as its first argument, got ${atomVal.kind}`, { atomVal }, 0);
    }
    const a = atomVal;
    const oldVal = a.value;
    validateAtom(a, newVal, ctx, callEnv);
    a.value = newVal;
    notifyWatches(a, oldVal, newVal);
    return newVal;
  }).doc("Sets the value of the atom to newVal and returns the new value.", [
    ["atomVal", "newVal"]
  ]),
  "atom?": v.nativeFn("atom?", function isAtomPredicate(value) {
    return v.boolean(is.atom(value));
  }).doc("Returns true if the value is an atom, false otherwise.", [["value"]]),
  "swap-vals!": v.nativeFnCtx("swap-vals!", function swapVals(ctx, callEnv, atomVal, fn, ...extraArgs) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`swap-vals! expects an atom, got ${printString(atomVal)}`, { atomVal }, 0);
    }
    if (!is.aFunction(fn)) {
      throw EvaluationError.atArg(`swap-vals! expects a function, got ${printString(fn)}`, { fn }, 1);
    }
    const oldVal = atomVal.value;
    const newVal = ctx.applyFunction(fn, [oldVal, ...extraArgs], callEnv);
    atomVal.value = newVal;
    return v.vector([oldVal, newVal]);
  }).doc("Atomically swaps the value of atom to be (apply f current-value-of-atom args). Returns [old new].", [["atom", "f", "&", "args"]]),
  "reset-vals!": v.nativeFn("reset-vals!", function resetVals(atomVal, newVal) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`reset-vals! expects an atom, got ${printString(atomVal)}`, { atomVal }, 0);
    }
    const oldVal = atomVal.value;
    atomVal.value = newVal;
    return v.vector([oldVal, newVal]);
  }).doc("Sets the value of atom to newVal. Returns [old new].", [
    ["atom", "newval"]
  ]),
  "compare-and-set!": v.nativeFn("compare-and-set!", function compareAndSet(atomVal, oldv, newv) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`compare-and-set! expects an atom, got ${printString(atomVal)}`, { atomVal }, 0);
    }
    if (is.equal(atomVal.value, oldv)) {
      atomVal.value = newv;
      return v.boolean(true);
    }
    return v.boolean(false);
  }).doc("Atomically sets the value of atom to newval if and only if the current value of the atom is identical to oldval. Returns true if set happened, else false.", [["atom", "oldval", "newval"]]),
  "add-watch": v.nativeFnCtx("add-watch", function addWatch(ctx, callEnv, atomVal, key, fn) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`add-watch expects an atom, got ${printString(atomVal)}`, { atomVal }, 0);
    }
    if (!is.aFunction(fn)) {
      throw EvaluationError.atArg(`add-watch expects a function, got ${printString(fn)}`, { fn }, 2);
    }
    const a = atomVal;
    if (!a.watches)
      a.watches = new Map;
    a.watches.set(printString(key), { key, fn, ctx, callEnv });
    return atomVal;
  }).doc("Adds a watch function to an atom. The watch fn must be a fn of 4 args: a key, the atom, its old-state, its new-state.", [["atom", "key", "fn"]]),
  "remove-watch": v.nativeFn("remove-watch", function removeWatch(atomVal, key) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`remove-watch expects an atom, got ${printString(atomVal)}`, { atomVal }, 0);
    }
    const a = atomVal;
    if (a.watches)
      a.watches.delete(printString(key));
    return atomVal;
  }).doc("Removes a watch (set by add-watch) from an atom.", [["atom", "key"]]),
  "set-validator!": v.nativeFnCtx("set-validator!", function setValidator(_ctx, _callEnv, atomVal, fn) {
    if (!is.atom(atomVal)) {
      throw EvaluationError.atArg(`set-validator! expects an atom, got ${printString(atomVal)}`, { atomVal }, 0);
    }
    if (fn.kind === "nil") {
      atomVal.validator = undefined;
      return v.nil();
    }
    if (!is.aFunction(fn)) {
      throw EvaluationError.atArg(`set-validator! expects a function or nil, got ${printString(fn)}`, { fn }, 1);
    }
    atomVal.validator = fn;
    return v.nil();
  }).doc("Sets the validator-fn for an atom. fn must be nil or a side-effect-free fn of one argument.", [["atom", "fn"]])
};

// src/core/modules/core/stdlib/maps-sets.ts
var mapsSetsFunctions = {
  "hash-map": v.nativeFn("hash-map", function hashMapImpl(...kvals) {
    if (kvals.length === 0) {
      return v.map([]);
    }
    if (kvals.length % 2 !== 0) {
      throw new EvaluationError(`hash-map expects an even number of arguments, got ${kvals.length}`, { args: kvals });
    }
    const entries = [];
    for (let i = 0;i < kvals.length; i += 2) {
      const key = kvals[i];
      const value = kvals[i + 1];
      entries.push([key, value]);
    }
    return v.map(entries);
  }).doc("Returns a new hash-map containing the given key-value pairs.", [
    ["&", "kvals"]
  ]),
  assoc: v.nativeFn("assoc", function assocImpl(collection, ...args) {
    if (!collection) {
      throw new EvaluationError("assoc expects a collection as first argument", { collection });
    }
    if (is.nil(collection)) {
      collection = v.map([]);
    }
    if (is.list(collection)) {
      throw new EvaluationError("assoc on lists is not supported, use vectors instead", { collection });
    }
    if (!is.collection(collection)) {
      throw EvaluationError.atArg(`assoc expects a collection, got ${printString(collection)}`, { collection }, 0);
    }
    if (args.length < 2) {
      throw new EvaluationError("assoc expects at least two arguments", {
        args
      });
    }
    if (args.length % 2 !== 0) {
      throw new EvaluationError("assoc expects an even number of binding arguments", {
        args
      });
    }
    if (is.vector(collection)) {
      const newValues = [...collection.value];
      for (let i = 0;i < args.length; i += 2) {
        const index = args[i];
        if (index.kind !== "number") {
          throw EvaluationError.atArg(`assoc on vectors expects each key argument to be a index (number), got ${printString(index)}`, { index }, i + 1);
        }
        if (index.value > newValues.length) {
          throw EvaluationError.atArg(`assoc index ${index.value} is out of bounds for vector of length ${newValues.length}`, { index, collection }, i + 1);
        }
        newValues[index.value] = args[i + 1];
      }
      return v.vector(newValues);
    }
    if (is.map(collection)) {
      const newEntries = [...collection.entries];
      for (let i = 0;i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        const entryIdx = newEntries.findIndex(function findEntryByKey(entry) {
          return is.equal(entry[0], key);
        });
        if (entryIdx === -1) {
          newEntries.push([key, value]);
        } else {
          newEntries[entryIdx] = [key, value];
        }
      }
      return v.map(newEntries);
    }
    throw new EvaluationError(`unhandled collection type, got ${printString(collection)}`, { collection });
  }).doc("Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.", [["collection", "&", "kvals"]]),
  dissoc: v.nativeFn("dissoc", function dissocImpl(collection, ...args) {
    if (!collection) {
      throw new EvaluationError("dissoc expects a collection as first argument", { collection });
    }
    if (is.list(collection)) {
      throw EvaluationError.atArg("dissoc on lists is not supported, use vectors instead", { collection }, 0);
    }
    if (!is.collection(collection)) {
      throw EvaluationError.atArg(`dissoc expects a collection, got ${printString(collection)}`, { collection }, 0);
    }
    if (is.vector(collection)) {
      if (collection.value.length === 0) {
        return collection;
      }
      const newValues = [...collection.value];
      for (let i = 0;i < args.length; i += 1) {
        const index = args[i];
        if (index.kind !== "number") {
          throw EvaluationError.atArg(`dissoc on vectors expects each key argument to be a index (number), got ${printString(index)}`, { index }, i + 1);
        }
        if (index.value >= newValues.length) {
          throw EvaluationError.atArg(`dissoc index ${index.value} is out of bounds for vector of length ${newValues.length}`, { index, collection }, i + 1);
        }
        newValues.splice(index.value, 1);
      }
      return v.vector(newValues);
    }
    if (is.map(collection)) {
      if (collection.entries.length === 0) {
        return collection;
      }
      const newEntries = [...collection.entries];
      for (let i = 0;i < args.length; i += 1) {
        const key = args[i];
        const entryIdx = newEntries.findIndex(function findEntryByKey(entry) {
          return is.equal(entry[0], key);
        });
        if (entryIdx === -1) {
          continue;
        }
        newEntries.splice(entryIdx, 1);
      }
      return v.map(newEntries);
    }
    throw new EvaluationError(`unhandled collection type, got ${printString(collection)}`, { collection });
  }).doc("Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.", [["collection", "&", "keys"]]),
  zipmap: v.nativeFn("zipmap", function zipmapImpl(ks, vs) {
    if (ks === undefined || !is.seqable(ks)) {
      throw new EvaluationError(`zipmap expects a collection or string as first argument${ks !== undefined ? `, got ${printString(ks)}` : ""}`, { ks });
    }
    if (vs === undefined || !is.seqable(vs)) {
      throw new EvaluationError(`zipmap expects a collection or string as second argument${vs !== undefined ? `, got ${printString(vs)}` : ""}`, { vs });
    }
    const keys = toSeq(ks);
    const vals = toSeq(vs);
    const len = Math.min(keys.length, vals.length);
    const entries = [];
    for (let i = 0;i < len; i++) {
      entries.push([keys[i], vals[i]]);
    }
    return v.map(entries);
  }).doc("Returns a new map with the keys and values of the given collections.", [["ks", "vs"]]),
  keys: v.nativeFn("keys", function keysImpl(m) {
    if (m === undefined || !is.map(m)) {
      throw EvaluationError.atArg(`keys expects a map${m !== undefined ? `, got ${printString(m)}` : ""}`, { m }, 0);
    }
    return v.vector(m.entries.map(function extractKey([k]) {
      return k;
    }));
  }).doc("Returns a vector of the keys of the given map.", [["m"]]),
  vals: v.nativeFn("vals", function valsImpl(m) {
    if (m === undefined || !is.map(m)) {
      throw EvaluationError.atArg(`vals expects a map${m !== undefined ? `, got ${printString(m)}` : ""}`, { m }, 0);
    }
    return v.vector(m.entries.map(function extractVal([, v2]) {
      return v2;
    }));
  }).doc("Returns a vector of the values of the given map.", [["m"]]),
  "hash-set": v.nativeFn("hash-set", function hashSetImpl(...args) {
    const deduped = [];
    for (const v2 of args) {
      if (!deduped.some((existing) => is.equal(existing, v2))) {
        deduped.push(v2);
      }
    }
    return v.set(deduped);
  }).doc("Returns a set containing the given values.", [["&", "xs"]]),
  set: v.nativeFn("set", function setImpl(coll) {
    if (coll === undefined || coll.kind === "nil")
      return v.set([]);
    const items = toSeq(coll);
    const deduped = [];
    for (const v2 of items) {
      if (!deduped.some((existing) => is.equal(existing, v2))) {
        deduped.push(v2);
      }
    }
    return v.set(deduped);
  }).doc("Returns a set of the distinct elements of the given collection.", [
    ["coll"]
  ]),
  "set?": v.nativeFn("set?", function setPredicateImpl(x) {
    return v.boolean(x !== undefined && x.kind === "set");
  }).doc("Returns true if x is a set.", [["x"]]),
  disj: v.nativeFn("disj", function disjImpl(s, ...items) {
    if (s === undefined || s.kind === "nil")
      return v.set([]);
    if (s.kind !== "set") {
      throw EvaluationError.atArg(`disj expects a set, got ${printString(s)}`, { s }, 0);
    }
    const newValues = s.values.filter((v2) => !items.some((item) => is.equal(item, v2)));
    return v.set(newValues);
  }).doc("Returns a set with the given items removed.", [["s", "&", "items"]])
};

// src/core/modules/core/stdlib/seq.ts
var seqFunctions = {
  list: v.nativeFn("list", function listImpl(...args) {
    if (args.length === 0) {
      return v.list([]);
    }
    return v.list(args);
  }).doc("Returns a new list containing the given values.", [["&", "args"]]),
  seq: v.nativeFn("seq", function seqImpl(coll) {
    if (coll.kind === "nil")
      return v.nil();
    if (is.lazySeq(coll)) {
      const realized = realizeLazySeq(coll);
      if (is.nil(realized))
        return v.nil();
      return seqImpl(realized);
    }
    if (is.cons(coll))
      return coll;
    if (!is.seqable(coll)) {
      throw EvaluationError.atArg(`seq expects a collection, string, or nil, got ${printString(coll)}`, { collection: coll }, 0);
    }
    const items = toSeq(coll);
    return items.length === 0 ? v.nil() : v.list(items);
  }).doc("Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.", [["coll"]]),
  first: v.nativeFn("first", function firstImpl(collection) {
    if (collection.kind === "nil")
      return v.nil();
    if (is.lazySeq(collection)) {
      const realized = realizeLazySeq(collection);
      if (is.nil(realized))
        return v.nil();
      return firstImpl(realized);
    }
    if (is.cons(collection))
      return collection.head;
    if (!is.seqable(collection)) {
      throw EvaluationError.atArg("first expects a collection or string", { collection }, 0);
    }
    const entries = toSeq(collection);
    return entries.length === 0 ? v.nil() : entries[0];
  }).doc("Returns the first element of the given collection or string.", [
    ["coll"]
  ]),
  rest: v.nativeFn("rest", function restImpl(collection) {
    if (collection.kind === "nil")
      return v.list([]);
    if (is.lazySeq(collection)) {
      const realized = realizeLazySeq(collection);
      if (is.nil(realized))
        return v.list([]);
      return restImpl(realized);
    }
    if (is.cons(collection))
      return collection.tail;
    if (!is.seqable(collection)) {
      throw EvaluationError.atArg("rest expects a collection or string", { collection }, 0);
    }
    if (is.list(collection)) {
      if (collection.value.length === 0) {
        return collection;
      }
      return v.list(collection.value.slice(1));
    }
    if (is.vector(collection)) {
      return v.vector(collection.value.slice(1));
    }
    if (is.map(collection)) {
      if (collection.entries.length === 0) {
        return collection;
      }
      return v.map(collection.entries.slice(1));
    }
    if (collection.kind === "string") {
      const chars = toSeq(collection);
      return v.list(chars.slice(1));
    }
    throw EvaluationError.atArg(`rest expects a collection or string, got ${printString(collection)}`, { collection }, 0);
  }).doc("Returns a sequence of the given collection or string excluding the first element.", [["coll"]]),
  conj: v.nativeFn("conj", function conjImpl(collection, ...args) {
    if (!collection) {
      throw new EvaluationError("conj expects a collection as first argument", { collection });
    }
    if (args.length === 0) {
      return collection;
    }
    if (!is.collection(collection)) {
      throw EvaluationError.atArg(`conj expects a collection, got ${printString(collection)}`, { collection }, 0);
    }
    if (is.list(collection)) {
      const newItems = [];
      for (let i = args.length - 1;i >= 0; i--) {
        newItems.push(args[i]);
      }
      return v.list([...newItems, ...collection.value]);
    }
    if (is.vector(collection)) {
      return v.vector([...collection.value, ...args]);
    }
    if (is.map(collection)) {
      const newEntries = [...collection.entries];
      for (let i = 0;i < args.length; i += 1) {
        const pair = args[i];
        const pairArgIndex = i + 1;
        if (pair.kind !== "vector") {
          throw EvaluationError.atArg(`conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`, { pair }, pairArgIndex);
        }
        if (pair.value.length !== 2) {
          throw EvaluationError.atArg(`conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`, { pair }, pairArgIndex);
        }
        const key = pair.value[0];
        const keyIdx = newEntries.findIndex(function findKeyEntry(entry) {
          return is.equal(entry[0], key);
        });
        if (keyIdx === -1) {
          newEntries.push([key, pair.value[1]]);
        } else {
          newEntries[keyIdx] = [key, pair.value[1]];
        }
      }
      return v.map([...newEntries]);
    }
    if (is.set(collection)) {
      const newValues = [...collection.values];
      for (const v2 of args) {
        if (!newValues.some((existing) => is.equal(existing, v2))) {
          newValues.push(v2);
        }
      }
      return v.set(newValues);
    }
    throw new EvaluationError(`unhandled collection type, got ${printString(collection)}`, { collection });
  }).doc("Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.", [["collection", "&", "args"]]),
  cons: v.nativeFn("cons", function consImpl(x, xs) {
    if (is.lazySeq(xs) || is.cons(xs)) {
      return v.cons(x, xs);
    }
    if (is.nil(xs)) {
      return v.list([x]);
    }
    if (!is.collection(xs)) {
      throw EvaluationError.atArg(`cons expects a collection as second argument, got ${printString(xs)}`, { xs }, 1);
    }
    if (is.map(xs) || is.set(xs)) {
      throw EvaluationError.atArg("cons on maps and sets is not supported, use vectors instead", { xs }, 1);
    }
    const wrap = is.list(xs) ? v.list : v.vector;
    const newItems = [x, ...xs.value];
    return wrap(newItems);
  }).doc("Returns a new collection with x prepended to the head of xs.", [
    ["x", "xs"]
  ]),
  get: v.nativeFn("get", function getImpl(target, key, notFound) {
    const defaultValue = notFound ?? v.nil();
    switch (target.kind) {
      case valueKeywords.map: {
        const entries = target.entries;
        for (const [k, v2] of entries) {
          if (is.equal(k, key)) {
            return v2;
          }
        }
        return defaultValue;
      }
      case valueKeywords.vector: {
        const values = target.value;
        if (key.kind !== "number") {
          throw new EvaluationError("get on vectors expects a 0-based index as parameter", { key });
        }
        if (key.value < 0 || key.value >= values.length) {
          return defaultValue;
        }
        return values[key.value];
      }
      default:
        return defaultValue;
    }
  }).doc("Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.", [
    ["target", "key"],
    ["target", "key", "not-found"]
  ]),
  nth: v.nativeFn("nth", function nthImpl(coll, n, notFound) {
    if (n === undefined || n.kind !== "number") {
      throw new EvaluationError(`nth expects a number index${n !== undefined ? `, got ${printString(n)}` : ""}`, { n });
    }
    const index = n.value;
    if (coll === undefined || is.nil(coll)) {
      if (notFound !== undefined)
        return notFound;
      throw new EvaluationError(`nth index ${index} is out of bounds for collection of length 0`, { coll, n });
    }
    if (is.lazySeq(coll) || is.cons(coll)) {
      const items2 = toSeq(coll);
      if (index < 0 || index >= items2.length) {
        if (notFound !== undefined)
          return notFound;
        const err = new EvaluationError(`nth index ${index} is out of bounds for collection of length ${items2.length}`, { coll, n });
        err.data = { argIndex: 1 };
        throw err;
      }
      return items2[index];
    }
    if (!is.list(coll) && !is.vector(coll)) {
      throw new EvaluationError(`nth expects a list or vector, got ${printString(coll)}`, { coll });
    }
    const items = coll.value;
    if (index < 0 || index >= items.length) {
      if (notFound !== undefined)
        return notFound;
      const err = new EvaluationError(`nth index ${index} is out of bounds for collection of length ${items.length}`, { coll, n });
      err.data = { argIndex: 1 };
      throw err;
    }
    return items[index];
  }).doc("Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.", [["coll", "n", "not-found"]]),
  last: v.nativeFn("last", function lastImpl(coll) {
    if (coll === undefined || !is.list(coll) && !is.vector(coll)) {
      throw new EvaluationError(`last expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ""}`, { coll });
    }
    const items = coll.value;
    return items.length === 0 ? v.nil() : items[items.length - 1];
  }).doc("Returns the last element of the given collection.", [["coll"]]),
  reverse: v.nativeFn("reverse", function reverseImpl(coll) {
    if (coll === undefined || !is.list(coll) && !is.vector(coll)) {
      throw EvaluationError.atArg(`reverse expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ""}`, { coll }, 0);
    }
    return v.list([...coll.value].reverse());
  }).doc("Returns a new sequence with the elements of the given collection in reverse order.", [["coll"]]),
  "empty?": v.nativeFn("empty?", function emptyPredImpl(coll) {
    if (coll === undefined) {
      throw EvaluationError.atArg("empty? expects one argument", {}, 0);
    }
    if (coll.kind === "nil")
      return v.boolean(true);
    if (!is.seqable(coll)) {
      throw EvaluationError.atArg(`empty? expects a collection, string, or nil, got ${printString(coll)}`, { coll }, 0);
    }
    return v.boolean(toSeq(coll).length === 0);
  }).doc("Returns true if coll has no items. Accepts collections, strings, and nil.", [["coll"]]),
  "contains?": v.nativeFn("contains?", function containsPredImpl(coll, key) {
    if (coll === undefined) {
      throw EvaluationError.atArg("contains? expects a collection as first argument", {}, 0);
    }
    if (key === undefined) {
      throw EvaluationError.atArg("contains? expects a key as second argument", {}, 1);
    }
    if (coll.kind === "nil")
      return v.boolean(false);
    if (is.map(coll)) {
      return v.boolean(coll.entries.some(function checkKeyMatch([k]) {
        return is.equal(k, key);
      }));
    }
    if (is.vector(coll)) {
      if (key.kind !== "number")
        return v.boolean(false);
      return v.boolean(key.value >= 0 && key.value < coll.value.length);
    }
    if (is.set(coll)) {
      return v.boolean(coll.values.some((v2) => is.equal(v2, key)));
    }
    throw EvaluationError.atArg(`contains? expects a map, set, vector, or nil, got ${printString(coll)}`, { coll }, 0);
  }).doc("Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.", [["coll", "key"]]),
  "repeat*": v.nativeFn("repeat*", function repeatImpl(n, x) {
    if (n === undefined || n.kind !== "number") {
      throw EvaluationError.atArg(`repeat expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ""}`, { n }, 0);
    }
    return v.list(Array(n.value).fill(x));
  }).doc("Returns a finite sequence of n copies of x (native helper).", [
    ["n", "x"]
  ]),
  "range*": v.nativeFn("range*", function rangeImpl(...args) {
    if (args.length === 0 || args.length > 3) {
      throw new EvaluationError("range expects 1, 2, or 3 arguments: (range n), (range start end), or (range start end step)", { args });
    }
    const badIdx = args.findIndex(function checkIsNumber(a) {
      return a.kind !== "number";
    });
    if (badIdx !== -1) {
      throw EvaluationError.atArg("range expects number arguments", { args }, badIdx);
    }
    let start;
    let end;
    let step;
    if (args.length === 1) {
      start = 0;
      end = args[0].value;
      step = 1;
    } else if (args.length === 2) {
      start = args[0].value;
      end = args[1].value;
      step = 1;
    } else {
      start = args[0].value;
      end = args[1].value;
      step = args[2].value;
    }
    if (step === 0) {
      throw EvaluationError.atArg("range step cannot be zero", { args }, args.length - 1);
    }
    const result = [];
    if (step > 0) {
      for (let i = start;i < end; i += step) {
        result.push(v.number(i));
      }
    } else {
      for (let i = start;i > end; i += step) {
        result.push(v.number(i));
      }
    }
    return v.list(result);
  }).doc("Returns a finite sequence of numbers (native helper).", [
    ["n"],
    ["start", "end"],
    ["start", "end", "step"]
  ]),
  "concat*": v.nativeFn("concat*", function concatStarImpl(...args) {
    const result = [];
    for (const arg of args) {
      if (is.nil(arg))
        continue;
      if (is.list(arg) || is.vector(arg)) {
        result.push(...arg.value);
      } else if (is.cons(arg) || is.lazySeq(arg)) {
        result.push(...toSeq(arg));
      } else if (is.set(arg)) {
        result.push(...arg.values);
      } else {
        throw new EvaluationError(`concat* expects seqable arguments, got ${printString(arg)}`, { arg });
      }
    }
    return v.list(result);
  }).doc("Eagerly concatenates seqable collections into a list (quasiquote bootstrap helper).", [
    ["&", "colls"]
  ]),
  count: v.nativeFn("count", function countImpl(countable) {
    if (countable.kind === "nil")
      return v.number(0);
    if (is.lazySeq(countable) || is.cons(countable)) {
      return v.number(toSeq(countable).length);
    }
    if (![
      valueKeywords.list,
      valueKeywords.vector,
      valueKeywords.map,
      valueKeywords.set,
      valueKeywords.string
    ].includes(countable.kind)) {
      throw EvaluationError.atArg(`count expects a countable value, got ${printString(countable)}`, { countable }, 0);
    }
    switch (countable.kind) {
      case valueKeywords.list:
        return v.number(countable.value.length);
      case valueKeywords.vector:
        return v.number(countable.value.length);
      case valueKeywords.map:
        return v.number(countable.entries.length);
      case valueKeywords.set:
        return v.number(countable.values.length);
      case valueKeywords.string:
        return v.number(countable.value.length);
      default:
        throw new EvaluationError(`count expects a countable value, got ${printString(countable)}`, { countable });
    }
  }).doc("Returns the number of elements in the given countable value.", [
    ["countable"]
  ]),
  empty: v.nativeFn("empty", function emptyImpl(coll) {
    if (coll === undefined || coll.kind === "nil")
      return v.nil();
    switch (coll.kind) {
      case "list":
        return v.list([]);
      case "vector":
        return v.vector([]);
      case "map":
        return v.map([]);
      case "set":
        return v.set([]);
      default:
        return v.nil();
    }
  }).doc("Returns an empty collection of the same category as coll, or nil.", [
    ["coll"]
  ])
};

// src/core/modules/core/stdlib/vectors.ts
var vectorFunctions = {
  vector: v.nativeFn("vector", function vectorImpl(...args) {
    if (args.length === 0) {
      return v.vector([]);
    }
    return v.vector(args);
  }).doc("Returns a new vector containing the given values.", [["&", "args"]]),
  vec: v.nativeFn("vec", function vecImpl(coll) {
    if (coll === undefined || coll.kind === "nil")
      return v.vector([]);
    if (is.vector(coll))
      return coll;
    if (!is.seqable(coll)) {
      throw EvaluationError.atArg(`vec expects a collection or string, got ${printString(coll)}`, { coll }, 0);
    }
    return v.vector(toSeq(coll));
  }).doc("Creates a new vector containing the contents of coll.", [["coll"]]),
  subvec: v.nativeFn("subvec", function subvecImpl(vector, start, end) {
    if (vector === undefined || !is.vector(vector)) {
      throw EvaluationError.atArg(`subvec expects a vector, got ${printString(vector)}`, { v: vector }, 0);
    }
    if (start === undefined || start.kind !== "number") {
      throw EvaluationError.atArg(`subvec expects a number start index`, { start }, 1);
    }
    const s = start.value;
    const e = end !== undefined && end.kind === "number" ? end.value : vector.value.length;
    if (s < 0 || e > vector.value.length || s > e) {
      throw new EvaluationError(`subvec index out of bounds: start=${s}, end=${e}, length=${vector.value.length}`, { v: vector, start, end });
    }
    return v.vector(vector.value.slice(s, e));
  }).doc("Returns a persistent vector of the items in vector from start (inclusive) to end (exclusive).", [
    ["v", "start"],
    ["v", "start", "end"]
  ]),
  peek: v.nativeFn("peek", function peekImpl(coll) {
    if (coll === undefined || coll.kind === "nil")
      return v.nil();
    if (is.vector(coll)) {
      return coll.value.length === 0 ? v.nil() : coll.value[coll.value.length - 1];
    }
    if (is.list(coll)) {
      return coll.value.length === 0 ? v.nil() : coll.value[0];
    }
    throw EvaluationError.atArg(`peek expects a list or vector, got ${printString(coll)}`, { coll }, 0);
  }).doc("For a list, same as first. For a vector, same as last.", [["coll"]]),
  pop: v.nativeFn("pop", function popImpl(coll) {
    if (coll === undefined || coll.kind === "nil") {
      throw EvaluationError.atArg("Can't pop empty list", { coll }, 0);
    }
    if (is.vector(coll)) {
      if (coll.value.length === 0)
        throw EvaluationError.atArg("Can't pop empty vector", { coll }, 0);
      return v.vector(coll.value.slice(0, -1));
    }
    if (is.list(coll)) {
      if (coll.value.length === 0)
        throw EvaluationError.atArg("Can't pop empty list", { coll }, 0);
      return v.list(coll.value.slice(1));
    }
    throw EvaluationError.atArg(`pop expects a list or vector, got ${printString(coll)}`, { coll }, 0);
  }).doc("For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.", [["coll"]])
};

// src/core/modules/core/stdlib/errors.ts
var errorFunctions = {
  throw: v.nativeFn("throw", function throwImpl(...args) {
    if (args.length !== 1) {
      throw new EvaluationError(`throw requires exactly 1 argument, got ${args.length}`, { args });
    }
    throw new CljThrownSignal(args[0]);
  }).doc("Throws a value as an exception. The value may be any CljValue; maps are idiomatic.", [["value"]]),
  "ex-info": v.nativeFn("ex-info", function exInfoImpl(...args) {
    if (args.length < 2) {
      throw new EvaluationError(`ex-info requires at least 2 arguments, got ${args.length}`, { args });
    }
    const [msg, data, cause] = args;
    if (!is.string(msg)) {
      throw new EvaluationError("ex-info: first argument must be a string", {
        msg
      });
    }
    const entries = [
      [v.keyword(":message"), msg],
      [v.keyword(":data"), data]
    ];
    if (cause !== undefined) {
      entries.push([v.keyword(":cause"), cause]);
    }
    return v.map(entries);
  }).doc("Creates an error map with :message and :data keys. Optionally accepts a :cause.", [
    ["msg", "data"],
    ["msg", "data", "cause"]
  ]),
  "ex-message": v.nativeFn("ex-message", function exMessageImpl(...args) {
    const [e] = args;
    if (!is.map(e))
      return v.nil();
    const entry = e.entries.find(function findMessageKey([k]) {
      return is.keyword(k) && k.name === ":message";
    });
    return entry ? entry[1] : v.nil();
  }).doc("Returns the :message of an error map, or nil.", [["e"]]),
  "ex-data": v.nativeFn("ex-data", function exDataImpl(...args) {
    const [e] = args;
    if (!is.map(e))
      return v.nil();
    const entry = e.entries.find(function findDataKey([k]) {
      return is.keyword(k) && k.name === ":data";
    });
    return entry ? entry[1] : v.nil();
  }).doc("Returns the :data map of an error map, or nil.", [["e"]]),
  "ex-cause": v.nativeFn("ex-cause", function exCauseImpl(...args) {
    const [e] = args;
    if (!is.map(e))
      return v.nil();
    const entry = e.entries.find(function findCauseKey([k]) {
      return is.keyword(k) && k.name === ":cause";
    });
    return entry ? entry[1] : v.nil();
  }).doc("Returns the :cause of an error map, or nil.", [["e"]])
};

// src/core/modules/core/stdlib/hof.ts
var hofFunctions = {
  reduce: v.nativeFnCtx("reduce", function reduce(ctx, callEnv, fn, ...rest) {
    if (fn === undefined || !is.aFunction(fn)) {
      throw EvaluationError.atArg(`reduce expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ""}`, { fn }, 0);
    }
    if (rest.length === 0 || rest.length > 2) {
      throw new EvaluationError("reduce expects 2 or 3 arguments: (reduce f coll) or (reduce f init coll)", { fn });
    }
    const hasInit = rest.length === 2;
    const init = hasInit ? rest[0] : undefined;
    const collection = hasInit ? rest[1] : rest[0];
    if (collection.kind === "nil") {
      if (!hasInit) {
        throw new EvaluationError("reduce called on empty collection with no initial value", { fn });
      }
      return init;
    }
    if (!is.seqable(collection)) {
      throw EvaluationError.atArg(`reduce expects a collection or string, got ${printString(collection)}`, { collection }, rest.length);
    }
    const items = toSeq(collection);
    if (!hasInit) {
      if (items.length === 0) {
        throw new EvaluationError("reduce called on empty collection with no initial value", { fn });
      }
      if (items.length === 1)
        return items[0];
      let acc2 = items[0];
      for (let i = 1;i < items.length; i++) {
        const result = ctx.applyFunction(fn, [acc2, items[i]], callEnv);
        if (is.reduced(result))
          return result.value;
        acc2 = result;
      }
      return acc2;
    }
    let acc = init;
    for (const item of items) {
      const result = ctx.applyFunction(fn, [acc, item], callEnv);
      if (is.reduced(result))
        return result.value;
      acc = result;
    }
    return acc;
  }).doc("Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).", [
    ["f", "coll"],
    ["f", "val", "coll"]
  ]),
  apply: v.nativeFnCtx("apply", (ctx, callEnv, fn, ...rest) => {
    if (fn === undefined || !is.callable(fn)) {
      throw EvaluationError.atArg(`apply expects a callable as first argument${fn !== undefined ? `, got ${printString(fn)}` : ""}`, { fn }, 0);
    }
    if (rest.length === 0) {
      throw new EvaluationError("apply expects at least 2 arguments", {
        fn
      });
    }
    const lastArg = rest[rest.length - 1];
    if (!is.nil(lastArg) && !is.seqable(lastArg)) {
      throw EvaluationError.atArg(`apply expects a collection or string as last argument, got ${printString(lastArg)}`, { lastArg }, rest.length);
    }
    const args = [
      ...rest.slice(0, -1),
      ...is.nil(lastArg) ? [] : toSeq(lastArg)
    ];
    return ctx.applyCallable(fn, args, callEnv);
  }).doc("Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.", [
    ["f", "args"],
    ["f", "&", "args"]
  ]),
  partial: v.nativeFn("partial", (fn, ...preArgs) => {
    if (fn === undefined || !is.callable(fn)) {
      throw EvaluationError.atArg(`partial expects a callable as first argument${fn !== undefined ? `, got ${printString(fn)}` : ""}`, { fn }, 0);
    }
    const capturedFn = fn;
    return v.nativeFnCtx("partial", (ctx, callEnv, ...moreArgs) => {
      return ctx.applyCallable(capturedFn, [...preArgs, ...moreArgs], callEnv);
    });
  }).doc("Returns a function that calls f with pre-applied args prepended to any additional arguments.", [["f", "&", "args"]]),
  comp: v.nativeFn("comp", (...fns) => {
    if (fns.length === 0) {
      return v.nativeFn("identity", (x) => x);
    }
    const badIdx = fns.findIndex((f) => !is.callable(f));
    if (badIdx !== -1) {
      throw EvaluationError.atArg("comp expects functions or other callable values (keywords, maps)", { fns }, badIdx);
    }
    const capturedFns = fns;
    return v.nativeFnCtx("composed", (ctx, callEnv, ...args) => {
      let result = ctx.applyCallable(capturedFns[capturedFns.length - 1], args, callEnv);
      for (let i = capturedFns.length - 2;i >= 0; i--) {
        result = ctx.applyCallable(capturedFns[i], [result], callEnv);
      }
      return result;
    });
  }).doc("Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and maps.", [[], ["f"], ["f", "g"], ["f", "g", "&", "fns"]]),
  identity: v.nativeFn("identity", (x) => {
    if (x === undefined) {
      throw EvaluationError.atArg("identity expects one argument", {}, 0);
    }
    return x;
  }).doc("Returns its single argument unchanged.", [["x"]])
};

// src/core/modules/core/stdlib/meta.ts
var metaFunctions = {
  meta: v.nativeFn("meta", function metaImpl(val) {
    if (val === undefined) {
      throw EvaluationError.atArg("meta expects one argument", {}, 0);
    }
    if (val.kind === "function" || val.kind === "native-function" || val.kind === "var" || val.kind === "list" || val.kind === "vector" || val.kind === "map" || val.kind === "symbol" || val.kind === "atom") {
      return val.meta ?? v.nil();
    }
    return v.nil();
  }).doc("Returns the metadata map of a value, or nil if the value has no metadata.", [["val"]]),
  "with-meta": v.nativeFn("with-meta", function withMetaImpl(val, m) {
    if (val === undefined) {
      throw EvaluationError.atArg("with-meta expects two arguments", {}, 0);
    }
    if (m === undefined) {
      throw EvaluationError.atArg("with-meta expects two arguments", {}, 1);
    }
    if (m.kind !== "map" && m.kind !== "nil") {
      throw EvaluationError.atArg(`with-meta expects a map as second argument, got ${printString(m)}`, { m }, 1);
    }
    const metaSupported = val.kind === "function" || val.kind === "native-function" || val.kind === "list" || val.kind === "vector" || val.kind === "map" || val.kind === "symbol";
    if (!metaSupported) {
      throw EvaluationError.atArg(`with-meta does not support ${val.kind}, got ${printString(val)}`, { val }, 0);
    }
    const meta = m.kind === "nil" ? undefined : m;
    return { ...val, meta };
  }).doc("Returns a new value with the metadata map m applied to val.", [
    ["val", "m"]
  ]),
  "alter-meta!": v.nativeFnCtx("alter-meta!", function alterMetaImpl(ctx, callEnv, ref, f, ...args) {
    if (ref === undefined) {
      throw EvaluationError.atArg("alter-meta! expects at least two arguments", {}, 0);
    }
    if (f === undefined) {
      throw EvaluationError.atArg("alter-meta! expects at least two arguments", {}, 1);
    }
    if (ref.kind !== "var" && ref.kind !== "atom") {
      throw EvaluationError.atArg(`alter-meta! expects a Var or Atom as first argument, got ${ref.kind}`, {}, 0);
    }
    if (!is.aFunction(f)) {
      throw EvaluationError.atArg(`alter-meta! expects a function as second argument, got ${f.kind}`, {}, 1);
    }
    const currentMeta = ref.meta ?? v.nil();
    const newMeta = ctx.applyCallable(f, [currentMeta, ...args], callEnv);
    if (newMeta.kind !== "map" && newMeta.kind !== "nil") {
      throw new EvaluationError(`alter-meta! function must return a map or nil, got ${newMeta.kind}`, {});
    }
    ref.meta = newMeta.kind === "nil" ? undefined : newMeta;
    return newMeta;
  }).doc("Applies f to ref's current metadata (with optional args), sets the result as the new metadata, and returns it.", [["ref", "f", "&", "args"]])
};

// src/core/modules/core/stdlib/predicates.ts
var predicateFunctions = {
  "nil?": v.nativeFn("nil?", function nilPredImpl(arg) {
    return v.boolean(arg.kind === "nil");
  }).doc("Returns true if the value is nil, false otherwise.", [["arg"]]),
  "true?": v.nativeFn("true?", function truePredImpl(arg) {
    if (arg.kind !== "boolean") {
      return v.boolean(false);
    }
    return v.boolean(arg.value === true);
  }).doc("Returns true if the value is a boolean and true, false otherwise.", [
    ["arg"]
  ]),
  "false?": v.nativeFn("false?", function falsePredImpl(arg) {
    if (arg.kind !== "boolean") {
      return v.boolean(false);
    }
    return v.boolean(arg.value === false);
  }).doc("Returns true if the value is a boolean and false, false otherwise.", [
    ["arg"]
  ]),
  "truthy?": v.nativeFn("truthy?", function truthyPredImpl(arg) {
    return v.boolean(is.truthy(arg));
  }).doc("Returns true if the value is not nil or false, false otherwise.", [
    ["arg"]
  ]),
  "falsy?": v.nativeFn("falsy?", function falsyPredImpl(arg) {
    return v.boolean(is.falsy(arg));
  }).doc("Returns true if the value is nil or false, false otherwise.", [
    ["arg"]
  ]),
  "not=": v.nativeFn("not=", function notEqualImpl(...vals) {
    if (vals.length < 2) {
      throw new EvaluationError("not= expects at least two arguments", {
        args: vals
      });
    }
    for (let i = 1;i < vals.length; i++) {
      if (!is.equal(vals[i], vals[i - 1])) {
        return v.boolean(true);
      }
    }
    return v.boolean(false);
  }).doc("Returns true if any two adjacent arguments are not equal, false otherwise.", [["&", "vals"]]),
  "number?": v.nativeFn("number?", function numberPredImpl(x) {
    return v.boolean(x !== undefined && x.kind === "number");
  }).doc("Returns true if the value is a number, false otherwise.", [["x"]]),
  "string?": v.nativeFn("string?", function stringPredImpl(x) {
    return v.boolean(x !== undefined && is.string(x));
  }).doc("Returns true if the value is a string, false otherwise.", [["x"]]),
  "boolean?": v.nativeFn("boolean?", function booleanPredImpl(x) {
    return v.boolean(x !== undefined && x.kind === "boolean");
  }).doc("Returns true if the value is a boolean, false otherwise.", [["x"]]),
  "vector?": v.nativeFn("vector?", function vectorPredImpl(x) {
    return v.boolean(x !== undefined && is.vector(x));
  }).doc("Returns true if the value is a vector, false otherwise.", [["x"]]),
  "list?": v.nativeFn("list?", function listPredImpl(x) {
    return v.boolean(x !== undefined && is.list(x));
  }).doc("Returns true if the value is a list, false otherwise.", [["x"]]),
  "map?": v.nativeFn("map?", function mapPredImpl(x) {
    return v.boolean(x !== undefined && is.map(x));
  }).doc("Returns true if the value is a map, false otherwise.", [["x"]]),
  "keyword?": v.nativeFn("keyword?", function keywordPredImpl(x) {
    return v.boolean(x !== undefined && is.keyword(x));
  }).doc("Returns true if the value is a keyword, false otherwise.", [["x"]]),
  "qualified-keyword?": v.nativeFn("qualified-keyword?", function qualifiedKeywordPredImpl(x) {
    return v.boolean(x !== undefined && is.keyword(x) && x.name.includes("/"));
  }).doc("Returns true if the value is a qualified keyword, false otherwise.", [
    ["x"]
  ]),
  "symbol?": v.nativeFn("symbol?", function symbolPredImpl(x) {
    return v.boolean(x !== undefined && is.symbol(x));
  }).doc("Returns true if the value is a symbol, false otherwise.", [["x"]]),
  "namespace?": v.nativeFn("namespace?", function namespaceQImpl(x) {
    return v.boolean(x !== undefined && x.kind === "namespace");
  }).doc("Returns true if x is a namespace.", [["x"]]),
  "qualified-symbol?": v.nativeFn("qualified-symbol?", function qualifiedSymbolPredImpl(x) {
    return v.boolean(x !== undefined && is.symbol(x) && x.name.includes("/"));
  }).doc("Returns true if the value is a qualified symbol, false otherwise.", [
    ["x"]
  ]),
  "fn?": v.nativeFn("fn?", function fnPredImpl(x) {
    return v.boolean(x !== undefined && is.aFunction(x));
  }).doc("Returns true if the value is a function, false otherwise.", [["x"]]),
  "coll?": v.nativeFn("coll?", function collPredImpl(x) {
    return v.boolean(x !== undefined && is.collection(x));
  }).doc("Returns true if the value is a collection, false otherwise.", [
    ["x"]
  ]),
  some: v.nativeFnCtx("some", function someImpl(ctx, callEnv, pred, coll) {
    if (pred === undefined || !is.callable(pred)) {
      throw EvaluationError.atArg(`some expects a callable as first argument${pred !== undefined ? `, got ${printString(pred)}` : ""}`, { pred }, 0);
    }
    if (coll === undefined) {
      return v.nil();
    }
    if (!is.seqable(coll)) {
      throw EvaluationError.atArg(`some expects a collection or string as second argument, got ${printString(coll)}`, { coll }, 1);
    }
    for (const item of toSeq(coll)) {
      const result = ctx.applyCallable(pred, [item], callEnv);
      if (is.truthy(result)) {
        return result;
      }
    }
    return v.nil();
  }).doc("Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.", [["pred", "coll"]]),
  "every?": v.nativeFnCtx("every?", function everyPredImpl(ctx, callEnv, pred, coll) {
    if (pred === undefined || !is.aFunction(pred)) {
      throw EvaluationError.atArg(`every? expects a function as first argument${pred !== undefined ? `, got ${printString(pred)}` : ""}`, { pred }, 0);
    }
    if (coll === undefined || !is.seqable(coll)) {
      throw EvaluationError.atArg(`every? expects a collection or string as second argument${coll !== undefined ? `, got ${printString(coll)}` : ""}`, { coll }, 1);
    }
    for (const item of toSeq(coll)) {
      if (is.falsy(ctx.applyFunction(pred, [item], callEnv))) {
        return v.boolean(false);
      }
    }
    return v.boolean(true);
  }).doc("Returns true if all items in coll satisfy pred, false otherwise.", [
    ["pred", "coll"]
  ]),
  "identical?": v.nativeFn("identical?", function identicalPredImpl(x, y) {
    return v.boolean(x === y);
  }).doc("Tests if 2 arguments are the same object (reference equality).", [
    ["x", "y"]
  ]),
  "seqable?": v.nativeFn("seqable?", function seqablePredImpl(x) {
    return v.boolean(x !== undefined && is.seqable(x));
  }).doc("Return true if the seq function is supported for x.", [["x"]]),
  "sequential?": v.nativeFn("sequential?", function sequentialPredImpl(x) {
    return v.boolean(x !== undefined && (is.list(x) || is.vector(x)));
  }).doc("Returns true if coll is a sequential collection (list or vector).", [
    ["coll"]
  ]),
  "associative?": v.nativeFn("associative?", function associativePredImpl(x) {
    return v.boolean(x !== undefined && (is.map(x) || is.vector(x)));
  }).doc("Returns true if coll implements Associative (map or vector).", [
    ["coll"]
  ]),
  "counted?": v.nativeFn("counted?", function countedPredImpl(x) {
    return v.boolean(x !== undefined && (is.list(x) || is.vector(x) || is.map(x) || x.kind === "set" || is.string(x)));
  }).doc("Returns true if coll implements count in constant time.", [["coll"]]),
  "int?": v.nativeFn("int?", function intPredImpl(x) {
    return v.boolean(x !== undefined && x.kind === "number" && Number.isInteger(x.value));
  }).doc("Return true if x is a fixed precision integer.", [["x"]]),
  "double?": v.nativeFn("double?", function doublePredImpl(x) {
    return v.boolean(x !== undefined && x.kind === "number");
  }).doc("Return true if x is a Double (all numbers in JS are doubles).", [
    ["x"]
  ]),
  "NaN?": v.nativeFn("NaN?", function nanPredImpl(x) {
    return v.boolean(x !== undefined && x.kind === "number" && isNaN(x.value));
  }).doc("Returns true if num is NaN, else false.", [["num"]]),
  "infinite?": v.nativeFn("infinite?", function infinitePredImpl(x) {
    return v.boolean(x !== undefined && x.kind === "number" && !isFinite(x.value));
  }).doc("Returns true if num is positive or negative infinity, else false.", [
    ["num"]
  ]),
  compare: v.nativeFn("compare", function compareImpl(x, y) {
    if (is.nil(x) && is.nil(y))
      return v.number(0);
    if (is.nil(x))
      return v.number(-1);
    if (is.nil(y))
      return v.number(1);
    if (is.number(x) && is.number(y)) {
      return v.number(x.value < y.value ? -1 : x.value > y.value ? 1 : 0);
    }
    if (is.string(x) && is.string(y)) {
      return v.number(x.value < y.value ? -1 : x.value > y.value ? 1 : 0);
    }
    if (is.keyword(x) && is.keyword(y)) {
      return v.number(x.name < y.name ? -1 : x.name > y.name ? 1 : 0);
    }
    throw new EvaluationError(`compare: cannot compare ${printString(x)} to ${printString(y)}`, { x, y });
  }).doc("Comparator. Returns a negative number, zero, or a positive number.", [
    ["x", "y"]
  ]),
  hash: v.nativeFn("hash", function hashImpl(x) {
    const s = printString(x);
    let h = 0;
    for (let i = 0;i < s.length; i++) {
      h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    }
    return v.number(h);
  }).doc("Returns the hash code of its argument.", [["x"]])
};

// src/core/modules/core/stdlib/regex.ts
function extractInlineFlags2(raw) {
  let remaining = raw;
  let flags = "";
  const flagGroupRe = /^\(\?([imsx]+)\)/;
  let m;
  while ((m = flagGroupRe.exec(remaining)) !== null) {
    for (const f of m[1]) {
      if (f === "x") {
        throw new EvaluationError("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported", {});
      }
      if (!flags.includes(f))
        flags += f;
    }
    remaining = remaining.slice(m[0].length);
  }
  return { pattern: remaining, flags };
}
function assertRegex(val, fnName) {
  if (!is.regex(val)) {
    throw new EvaluationError(`${fnName} expects a regex as first argument, got ${printString(val)}`, { val });
  }
  return val;
}
function assertStringArg(val, fnName) {
  if (val.kind !== "string") {
    throw new EvaluationError(`${fnName} expects a string as second argument, got ${printString(val)}`, { val });
  }
  return val.value;
}
function matchToClj(match) {
  if (match.length === 1)
    return v.string(match[0]);
  return v.vector(match.map(function mapMatchToClj(m) {
    return m == null ? v.nil() : v.string(m);
  }));
}
var regexFunctions = {
  "regexp?": v.nativeFn("regexp?", function regexpPredImpl(x) {
    return v.boolean(x !== undefined && is.regex(x));
  }).doc("Returns true if x is a regular expression pattern.", [["x"]]),
  "re-pattern": v.nativeFn("re-pattern", function rePatternImpl(s) {
    if (s === undefined || s.kind !== "string") {
      throw new EvaluationError(`re-pattern expects a string argument${s !== undefined ? `, got ${printString(s)}` : ""}`, { s });
    }
    const { pattern, flags } = extractInlineFlags2(s.value);
    return v.regex(pattern, flags);
  }).doc(`Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.
  (re-pattern "\\\\d+") produces the same pattern as #"\\d+".`, [["s"]]),
  "re-find": v.nativeFn("re-find", function reFindImpl(reVal, sVal) {
    const re = assertRegex(reVal, "re-find");
    const s = assertStringArg(sVal, "re-find");
    const jsRe = new RegExp(re.pattern, re.flags);
    const match = jsRe.exec(s);
    if (!match)
      return v.nil();
    return matchToClj(match);
  }).doc(`Returns the next regex match, if any, of string to pattern, using
  java.util.regex.Matcher.find(). Returns the match or nil. When there
  are groups, returns a vector of the whole match and groups (nil for
  unmatched optional groups).`, [["re", "s"]]),
  "re-matches": v.nativeFn("re-matches", function reMatchesImpl(reVal, sVal) {
    const re = assertRegex(reVal, "re-matches");
    const s = assertStringArg(sVal, "re-matches");
    const jsRe = new RegExp(re.pattern, re.flags);
    const match = jsRe.exec(s);
    if (!match || match.index !== 0 || match[0].length !== s.length) {
      return v.nil();
    }
    return matchToClj(match);
  }).doc(`Returns the match, if any, of string to pattern, using
  java.util.regex.Matcher.matches(). The entire string must match.
  Returns the match or nil. When there are groups, returns a vector
  of the whole match and groups (nil for unmatched optional groups).`, [["re", "s"]]),
  "re-seq": v.nativeFn("re-seq", function reSeqImpl(reVal, sVal) {
    const re = assertRegex(reVal, "re-seq");
    const s = assertStringArg(sVal, "re-seq");
    const jsRe = new RegExp(re.pattern, re.flags + "g");
    const results = [];
    let match;
    while ((match = jsRe.exec(s)) !== null) {
      if (match[0].length === 0) {
        jsRe.lastIndex++;
        continue;
      }
      results.push(matchToClj(match));
    }
    if (results.length === 0)
      return v.nil();
    return { kind: "list", value: results };
  }).doc(`Returns a lazy sequence of successive matches of pattern in string,
  using java.util.regex.Matcher.find(), each such match processed with
  re-groups.`, [["re", "s"]]),
  "str-split*": v.nativeFn("str-split*", function strSplitImpl(sVal, sepVal, limitVal) {
    if (sVal === undefined || sVal.kind !== "string") {
      throw new EvaluationError(`str-split* expects a string as first argument${sVal !== undefined ? `, got ${printString(sVal)}` : ""}`, { sVal });
    }
    const s = sVal.value;
    const hasLimit = limitVal !== undefined && limitVal.kind !== "nil";
    const limit = hasLimit && limitVal.kind === "number" ? limitVal.value : undefined;
    let jsPattern;
    let jsFlags;
    if (sepVal.kind !== "regex") {
      throw new EvaluationError(`str-split* expects a regex pattern as second argument, got ${printString(sepVal)}`, { sepVal });
    }
    if (sepVal.pattern === "") {
      const chars = [...s];
      if (limit === undefined || limit >= chars.length) {
        return v.vector(chars.map(v.string));
      }
      const parts = [
        ...chars.slice(0, limit - 1),
        chars.slice(limit - 1).join("")
      ];
      return v.vector(parts.map(function mapPartToString(p) {
        return v.string(p);
      }));
    }
    jsPattern = sepVal.pattern;
    jsFlags = sepVal.flags;
    const re = new RegExp(jsPattern, jsFlags + "g");
    const rawParts = splitWithRegex(s, re, limit);
    return v.vector(rawParts.map(function mapRawPartToString(p) {
      return v.string(p);
    }));
  }).doc(`Internal helper for clojure.string/split. Splits string s by a regex or
  string separator. Optional limit keeps all parts when provided.`, [
    ["s", "sep"],
    ["s", "sep", "limit"]
  ])
};
function splitWithRegex(s, re, limit) {
  const parts = [];
  let lastIndex = 0;
  let match;
  let count = 0;
  while ((match = re.exec(s)) !== null) {
    if (match[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    if (limit !== undefined && count >= limit - 1)
      break;
    parts.push(s.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;
    count++;
  }
  parts.push(s.slice(lastIndex));
  if (limit === undefined) {
    while (parts.length > 0 && parts[parts.length - 1] === "") {
      parts.pop();
    }
  }
  return parts;
}

// src/core/modules/core/stdlib/strings.ts
function assertStr(val, fnName) {
  if (val === undefined || val.kind !== "string") {
    throw new EvaluationError(`${fnName} expects a string as first argument${val !== undefined ? `, got ${printString(val)}` : ""}`, { val });
  }
  return val.value;
}
function assertStrArg(val, pos, fnName) {
  if (val === undefined || val.kind !== "string") {
    throw new EvaluationError(`${fnName} expects a string as ${pos} argument${val !== undefined ? `, got ${printString(val)}` : ""}`, { val });
  }
  return val.value;
}
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function escapeDollarInReplacement(s) {
  return s.replace(/\$/g, "$$$$");
}
function buildMatchValue(whole, args) {
  let offsetIdx = -1;
  for (let i = args.length - 1;i >= 0; i--) {
    if (typeof args[i] === "number") {
      offsetIdx = i;
      break;
    }
  }
  const groups = offsetIdx > 0 ? args.slice(0, offsetIdx) : [];
  if (groups.length === 0)
    return v.string(whole);
  return v.vector([
    v.string(whole),
    ...groups.map(function mapGroupToClj(g) {
      return g == null ? v.nil() : v.string(String(g));
    })
  ]);
}
function doReplace(ctx, callEnv, fnName, sVal, matchVal, replVal, global) {
  const s = assertStr(sVal, fnName);
  if (matchVal === undefined || replVal === undefined) {
    throw new EvaluationError(`${fnName} expects 3 arguments`, {});
  }
  if (matchVal.kind === "string") {
    if (replVal.kind !== "string") {
      throw new EvaluationError(`${fnName}: when match is a string, replacement must also be a string, got ${printString(replVal)}`, { replVal });
    }
    const re = new RegExp(escapeRegex(matchVal.value), global ? "g" : "");
    return v.string(s.replace(re, escapeDollarInReplacement(replVal.value)));
  }
  if (matchVal.kind === "regex") {
    const re = matchVal;
    const flags = global ? re.flags + "g" : re.flags;
    const jsRe = new RegExp(re.pattern, flags);
    if (replVal.kind === "string") {
      return v.string(s.replace(jsRe, replVal.value));
    }
    if (is.aFunction(replVal)) {
      const fn = replVal;
      const result = s.replace(jsRe, function replaceCallback(whole, ...args) {
        const matchClj = buildMatchValue(whole, args);
        const replResult = ctx.applyFunction(fn, [matchClj], callEnv);
        return valueToString(replResult);
      });
      return v.string(result);
    }
    throw new EvaluationError(`${fnName}: replacement must be a string or function, got ${printString(replVal)}`, { replVal });
  }
  throw new EvaluationError(`${fnName}: match must be a string or regex, got ${printString(matchVal)}`, { matchVal });
}
var stringFunctions = {
  "str-upper-case*": v.nativeFn("str-upper-case*", function strUpperCaseImpl(sVal) {
    return v.string(assertStr(sVal, "str-upper-case*").toUpperCase());
  }).doc("Internal helper. Converts s to upper-case.", [["s"]]),
  "str-lower-case*": v.nativeFn("str-lower-case*", function strLowerCaseImpl(sVal) {
    return v.string(assertStr(sVal, "str-lower-case*").toLowerCase());
  }).doc("Internal helper. Converts s to lower-case.", [["s"]]),
  "str-trim*": v.nativeFn("str-trim*", function strTrimImpl(sVal) {
    return v.string(assertStr(sVal, "str-trim*").trim());
  }).doc("Internal helper. Removes whitespace from both ends of s.", [["s"]]),
  "str-triml*": v.nativeFn("str-triml*", function strTrimlImpl(sVal) {
    return v.string(assertStr(sVal, "str-triml*").trimStart());
  }).doc("Internal helper. Removes whitespace from the left of s.", [["s"]]),
  "str-trimr*": v.nativeFn("str-trimr*", function strTrimrImpl(sVal) {
    return v.string(assertStr(sVal, "str-trimr*").trimEnd());
  }).doc("Internal helper. Removes whitespace from the right of s.", [["s"]]),
  "str-reverse*": v.nativeFn("str-reverse*", function strReverseImpl(sVal) {
    return v.string([...assertStr(sVal, "str-reverse*")].reverse().join(""));
  }).doc("Internal helper. Returns s with its characters reversed (Unicode-safe).", [["s"]]),
  "str-starts-with*": v.nativeFn("str-starts-with*", function strStartsWithImpl(sVal, substrVal) {
    const s = assertStr(sVal, "str-starts-with*");
    const substr = assertStrArg(substrVal, "second", "str-starts-with*");
    return v.boolean(s.startsWith(substr));
  }).doc("Internal helper. Returns true if s starts with substr.", [
    ["s", "substr"]
  ]),
  "str-ends-with*": v.nativeFn("str-ends-with*", function strEndsWithImpl(sVal, substrVal) {
    const s = assertStr(sVal, "str-ends-with*");
    const substr = assertStrArg(substrVal, "second", "str-ends-with*");
    return v.boolean(s.endsWith(substr));
  }).doc("Internal helper. Returns true if s ends with substr.", [
    ["s", "substr"]
  ]),
  "str-includes*": v.nativeFn("str-includes*", function strIncludesImpl(sVal, substrVal) {
    const s = assertStr(sVal, "str-includes*");
    const substr = assertStrArg(substrVal, "second", "str-includes*");
    return v.boolean(s.includes(substr));
  }).doc("Internal helper. Returns true if s contains substr.", [
    ["s", "substr"]
  ]),
  "str-index-of*": v.nativeFn("str-index-of*", function strIndexOfImpl(sVal, valVal, fromVal) {
    const s = assertStr(sVal, "str-index-of*");
    const needle = assertStrArg(valVal, "second", "str-index-of*");
    let idx;
    if (fromVal !== undefined && fromVal.kind !== "nil") {
      if (fromVal.kind !== "number") {
        throw new EvaluationError(`str-index-of* expects a number as third argument, got ${printString(fromVal)}`, { fromVal });
      }
      idx = s.indexOf(needle, fromVal.value);
    } else {
      idx = s.indexOf(needle);
    }
    return idx === -1 ? v.nil() : v.number(idx);
  }).doc("Internal helper. Returns index of value in s, or nil if not found.", [
    ["s", "value"],
    ["s", "value", "from-index"]
  ]),
  "str-last-index-of*": v.nativeFn("str-last-index-of*", function strLastIndexOfImpl(sVal, valVal, fromVal) {
    const s = assertStr(sVal, "str-last-index-of*");
    const needle = assertStrArg(valVal, "second", "str-last-index-of*");
    let idx;
    if (fromVal !== undefined && fromVal.kind !== "nil") {
      if (fromVal.kind !== "number") {
        throw new EvaluationError(`str-last-index-of* expects a number as third argument, got ${printString(fromVal)}`, { fromVal });
      }
      idx = s.lastIndexOf(needle, fromVal.value);
    } else {
      idx = s.lastIndexOf(needle);
    }
    return idx === -1 ? v.nil() : v.number(idx);
  }).doc("Internal helper. Returns last index of value in s, or nil if not found.", [
    ["s", "value"],
    ["s", "value", "from-index"]
  ]),
  "str-replace*": v.nativeFnCtx("str-replace*", function strReplaceImpl(ctx, callEnv, sVal, matchVal, replVal) {
    return doReplace(ctx, callEnv, "str-replace*", sVal, matchVal, replVal, true);
  }).doc("Internal helper. Replaces all occurrences of match with replacement in s.", [["s", "match", "replacement"]]),
  "str-replace-first*": v.nativeFnCtx("str-replace-first*", function strReplaceFirstImpl(ctx, callEnv, sVal, matchVal, replVal) {
    return doReplace(ctx, callEnv, "str-replace-first*", sVal, matchVal, replVal, false);
  }).doc("Internal helper. Replaces the first occurrence of match with replacement in s.", [["s", "match", "replacement"]])
};

// src/core/modules/core/stdlib/transducers.ts
var transducerFunctions = {
  reduced: v.nativeFn("reduced", function reducedImpl(value) {
    if (value === undefined) {
      throw new EvaluationError("reduced expects one argument", {});
    }
    return v.reduced(value);
  }).doc("Returns a reduced value, indicating termination of the reduction process.", [["value"]]),
  "reduced?": v.nativeFn("reduced?", function isReducedImpl(value) {
    if (value === undefined) {
      throw new EvaluationError("reduced? expects one argument", {});
    }
    return v.boolean(is.reduced(value));
  }).doc("Returns true if the given value is a reduced value, false otherwise.", [["value"]]),
  unreduced: v.nativeFn("unreduced", function unreducedImpl(value) {
    if (value === undefined) {
      throw new EvaluationError("unreduced expects one argument", {});
    }
    return is.reduced(value) ? value.value : value;
  }).doc("Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.", [["value"]]),
  "ensure-reduced": v.nativeFn("ensure-reduced", function ensureReducedImpl(value) {
    if (value === undefined) {
      throw new EvaluationError("ensure-reduced expects one argument", {});
    }
    return is.reduced(value) ? value : v.reduced(value);
  }).doc("Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.", [["value"]]),
  "volatile!": v.nativeFn("volatile!", function volatileImpl(value) {
    if (value === undefined) {
      throw new EvaluationError("volatile! expects one argument", {});
    }
    return v.volatile(value);
  }).doc("Returns a volatile value with the given value as its value.", [
    ["value"]
  ]),
  "volatile?": v.nativeFn("volatile?", function isVolatileImpl(value) {
    if (value === undefined) {
      throw new EvaluationError("volatile? expects one argument", {});
    }
    return v.boolean(is.volatile(value));
  }).doc("Returns true if the given value is a volatile value, false otherwise.", [["value"]]),
  "vreset!": v.nativeFn("vreset!", function vresetImpl(vol, newVal) {
    if (!is.volatile(vol)) {
      throw new EvaluationError(`vreset! expects a volatile as its first argument, got ${printString(vol)}`, { vol });
    }
    if (newVal === undefined) {
      throw new EvaluationError("vreset! expects two arguments", { vol });
    }
    vol.value = newVal;
    return newVal;
  }).doc("Resets the value of the given volatile to the given new value and returns the new value.", [["vol", "newVal"]]),
  "vswap!": v.nativeFnCtx("vswap!", function vswapImpl(ctx, callEnv, vol, fn, ...extraArgs) {
    if (!is.volatile(vol)) {
      throw new EvaluationError(`vswap! expects a volatile as its first argument, got ${printString(vol)}`, { vol });
    }
    if (!is.aFunction(fn)) {
      throw new EvaluationError(`vswap! expects a function as its second argument, got ${printString(fn)}`, { fn });
    }
    const newVal = ctx.applyFunction(fn, [vol.value, ...extraArgs], callEnv);
    vol.value = newVal;
    return newVal;
  }).doc("Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.", [
    ["vol", "fn"],
    ["vol", "fn", "&", "extraArgs"]
  ]),
  transduce: v.nativeFnCtx("transduce", function transduceImpl(ctx, callEnv, xform, f, init, coll) {
    if (!is.aFunction(xform)) {
      throw new EvaluationError(`transduce expects a transducer (function) as first argument, got ${printString(xform)}`, { xf: xform });
    }
    if (!is.aFunction(f)) {
      throw new EvaluationError(`transduce expects a reducing function as second argument, got ${printString(f)}`, { f });
    }
    if (init === undefined) {
      throw new EvaluationError("transduce expects 3 or 4 arguments: (transduce xf f coll) or (transduce xf f init coll)", {});
    }
    let actualInit;
    let actualColl;
    if (coll === undefined) {
      actualColl = init;
      actualInit = ctx.applyFunction(f, [], callEnv);
    } else {
      actualInit = init;
      actualColl = coll;
    }
    const rf = ctx.applyFunction(xform, [f], callEnv);
    if (is.nil(actualColl)) {
      return ctx.applyFunction(rf, [actualInit], callEnv);
    }
    if (!is.seqable(actualColl)) {
      throw new EvaluationError(`transduce expects a collection or string as ${coll === undefined ? "third" : "fourth"} argument, got ${printString(actualColl)}`, { coll: actualColl });
    }
    const items = toSeq(actualColl);
    let acc = actualInit;
    for (const item of items) {
      const result = ctx.applyFunction(rf, [acc, item], callEnv);
      if (is.reduced(result)) {
        acc = result.value;
        break;
      }
      acc = result;
    }
    return ctx.applyFunction(rf, [acc], callEnv);
  }).doc(joinLines([
    "reduce with a transformation of f (xf). If init is not",
    "supplied, (f) will be called to produce it. f should be a reducing",
    "step function that accepts both 1 and 2 arguments, if it accepts",
    "only 2 you can add the arity-1 with 'completing'. Returns the result",
    "of applying (the transformed) xf to init and the first item in coll,",
    "then applying xf to that result and the 2nd item, etc. If coll",
    "contains no items, returns init and f is not called. Note that",
    "certain transforms may inject or skip items."
  ]), [
    ["xform", "f", "coll"],
    ["xform", "f", "init", "coll"]
  ])
};

// src/core/modules/core/stdlib/utils.ts
var utilFunctions = {
  str: v.nativeFn("str", function strImpl(...args) {
    return v.string(args.map((v2) => v2.kind === "nil" ? "" : valueToString(v2)).join(""));
  }).doc("Returns a concatenated string representation of the given values.", [
    ["&", "args"]
  ]),
  subs: v.nativeFn("subs", function subsImpl(s, start, end) {
    if (s === undefined || s.kind !== "string") {
      throw EvaluationError.atArg(`subs expects a string as first argument${s !== undefined ? `, got ${printString(s)}` : ""}`, { s }, 0);
    }
    if (start === undefined || start.kind !== "number") {
      throw EvaluationError.atArg(`subs expects a number as second argument${start !== undefined ? `, got ${printString(start)}` : ""}`, { start }, 1);
    }
    if (end !== undefined && end.kind !== "number") {
      throw EvaluationError.atArg(`subs expects a number as optional third argument${end !== undefined ? `, got ${printString(end)}` : ""}`, { end }, 2);
    }
    const from = start.value;
    const to = end?.value;
    return v.string(to === undefined ? s.value.slice(from) : s.value.slice(from, to));
  }).doc("Returns the substring of s beginning at start, and optionally ending before end.", [
    ["s", "start"],
    ["s", "start", "end"]
  ]),
  type: v.nativeFn("type", function typeImpl(x) {
    if (x === undefined) {
      throw new EvaluationError("type expects an argument", { x });
    }
    const kindToKeyword = {
      number: ":number",
      string: ":string",
      boolean: ":boolean",
      nil: ":nil",
      keyword: ":keyword",
      symbol: ":symbol",
      list: ":list",
      vector: ":vector",
      map: ":map",
      function: ":function",
      regex: ":regex",
      var: ":var",
      "native-function": ":function"
    };
    const name = kindToKeyword[x.kind];
    if (!name) {
      throw new EvaluationError(`type: unhandled kind ${x.kind}`, { x });
    }
    return v.keyword(name);
  }).doc("Returns a keyword representing the type of the given value.", [
    ["x"]
  ]),
  gensym: v.nativeFn("gensym", function gensymImpl(...args) {
    if (args.length > 1) {
      throw new EvaluationError("gensym takes 0 or 1 arguments", { args });
    }
    const prefix = args[0];
    if (prefix !== undefined && prefix.kind !== "string") {
      throw EvaluationError.atArg(`gensym prefix must be a string${prefix !== undefined ? `, got ${printString(prefix)}` : ""}`, { prefix }, 0);
    }
    const p = prefix?.kind === "string" ? prefix.value : "G";
    return v.symbol(makeGensym(p));
  }).doc('Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.', [[], ["prefix"]]),
  eval: v.nativeFnCtx("eval", function evalImpl(ctx, callEnv, form) {
    if (form === undefined) {
      throw new EvaluationError("eval expects a form as argument", {
        form
      });
    }
    const expanded = ctx.expandAll(form, callEnv);
    return ctx.evaluate(expanded, callEnv);
  }).doc("Evaluates the given form in the global environment and returns the result.", [["form"]]),
  "macroexpand-1": v.nativeFnCtx("macroexpand-1", function macroexpand1Impl(ctx, callEnv, form) {
    if (!is.list(form) || form.value.length === 0)
      return form;
    const head = form.value[0];
    if (!is.symbol(head))
      return form;
    const macroValue = tryLookup(head.name, callEnv);
    if (macroValue === undefined)
      return form;
    if (!is.macro(macroValue))
      return form;
    return ctx.applyMacro(macroValue, form.value.slice(1));
  }).doc("If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.", [["form"]]),
  macroexpand: v.nativeFnCtx("macroexpand", function macroexpandImpl(ctx, callEnv, form) {
    let current = form;
    while (true) {
      if (!is.list(current) || current.value.length === 0)
        return current;
      const head = current.value[0];
      if (!is.symbol(head))
        return current;
      const macroValue = tryLookup(head.name, callEnv);
      if (macroValue === undefined)
        return current;
      if (!is.macro(macroValue))
        return current;
      current = ctx.applyMacro(macroValue, current.value.slice(1));
    }
  }).doc(joinLines([
    "Expands all macros until the expansion is stable (head is no longer a macro)",
    "",
    "Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms"
  ]), [["form"]]),
  "macroexpand-all": v.nativeFnCtx("macroexpand-all", function macroexpandAllImpl(ctx, callEnv, form) {
    return ctx.expandAll(form, callEnv);
  }).doc(joinLines([
    "Fully expands all macros in a form recursively — including in sub-forms.",
    "",
    "Unlike macroexpand, this descends into every sub-expression.",
    "Expansion stops at quote/quasiquote boundaries and fn/loop bodies."
  ]), [["form"]]),
  namespace: v.nativeFn("namespace", function namespaceImpl(x) {
    if (x === undefined) {
      throw EvaluationError.atArg("namespace expects an argument", { x }, 0);
    }
    let raw;
    if (is.keyword(x)) {
      raw = x.name.slice(1);
    } else if (is.symbol(x)) {
      raw = x.name;
    } else {
      throw EvaluationError.atArg(`namespace expects a keyword or symbol, got ${printString(x)}`, { x }, 0);
    }
    const slashIdx = raw.indexOf("/");
    if (slashIdx <= 0)
      return v.nil();
    return v.string(raw.slice(0, slashIdx));
  }).doc("Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.", [["x"]]),
  name: v.nativeFn("name", function nameImpl(x) {
    if (x === undefined) {
      throw EvaluationError.atArg("name expects an argument", { x }, 0);
    }
    let raw;
    if (is.keyword(x)) {
      raw = x.name.slice(1);
    } else if (is.symbol(x)) {
      raw = x.name;
    } else if (x.kind === "string") {
      return x;
    } else {
      throw EvaluationError.atArg(`name expects a keyword, symbol, or string, got ${printString(x)}`, { x }, 0);
    }
    const slashIdx = raw.indexOf("/");
    return v.string(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw);
  }).doc("Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.", [["x"]]),
  keyword: v.nativeFn("keyword", function keywordImpl(...args) {
    if (args.length === 0 || args.length > 2) {
      throw new EvaluationError("keyword expects 1 or 2 string arguments", {
        args
      });
    }
    if (args[0].kind !== "string") {
      throw EvaluationError.atArg(`keyword expects a string, got ${printString(args[0])}`, { args }, 0);
    }
    if (args.length === 1) {
      return v.keyword(`:${args[0].value}`);
    }
    if (args[1].kind !== "string") {
      throw EvaluationError.atArg(`keyword second argument must be a string, got ${printString(args[1])}`, { args }, 1);
    }
    return v.keyword(`:${args[0].value}/${args[1].value}`);
  }).doc(joinLines([
    "Constructs a keyword with the given name and namespace strings. Returns a keyword value.",
    "",
    "Note: do not use : in the keyword strings, it will be added automatically.",
    'e.g. (keyword "foo") => :foo'
  ]), [["name"], ["ns", "name"]]),
  boolean: v.nativeFn("boolean", function booleanImpl(x) {
    if (x === undefined)
      return v.boolean(false);
    return v.boolean(is.truthy(x));
  }).doc("Coerces to boolean. Everything is true except false and nil.", [
    ["x"]
  ]),
  "clojure-version": v.nativeFn("clojure-version", function clojureVersionImpl() {
    return v.string("1.12.0");
  }).doc("Returns a string describing the current Clojure version.", [[]]),
  "pr-str": v.nativeFnCtx("pr-str", function prStrImpl(ctx, _callEnv, ...args) {
    return withPrintContext(buildPrintContext(ctx), () => v.string(args.map(printString).join(" ")));
  }).doc("Returns a readable string representation of the given values (strings are quoted).", [["&", "args"]]),
  "pretty-print-str": v.nativeFnCtx("pretty-print-str", function prettyPrintStrImpl(ctx, _callEnv, ...args) {
    if (args.length === 0)
      return v.string("");
    const form = args[0];
    const widthArg = args[1];
    const maxWidth = widthArg !== undefined && widthArg.kind === "number" ? widthArg.value : 80;
    return withPrintContext(buildPrintContext(ctx), () => v.string(prettyPrintString(form, maxWidth)));
  }).doc("Returns a pretty-printed string representation of form.", [
    ["form"],
    ["form", "max-width"]
  ]),
  "read-string": v.nativeFn("read-string", function readStringImpl(s) {
    if (s === undefined || s.kind !== "string") {
      throw EvaluationError.atArg(`read-string expects a string${s !== undefined ? `, got ${printString(s)}` : ""}`, { s }, 0);
    }
    const tokens = tokenize(s.value);
    const forms = readForms(tokens);
    if (forms.length === 0)
      return v.nil();
    return forms[0];
  }).doc("Reads one object from the string s. Returns nil if string is empty.", [["s"]]),
  "prn-str": v.nativeFnCtx("prn-str", function prnStrImpl(ctx, _callEnv, ...args) {
    return withPrintContext(buildPrintContext(ctx), () => v.string(args.map(printString).join(" ") + `
`));
  }).doc("pr-str to a string, followed by a newline.", [["&", "args"]]),
  "print-str": v.nativeFnCtx("print-str", function printStrImpl(ctx, _callEnv, ...args) {
    return withPrintContext(buildPrintContext(ctx), () => v.string(args.map(valueToString).join(" ")));
  }).doc("print to a string (human-readable, no quotes on strings).", [
    ["&", "args"]
  ]),
  "println-str": v.nativeFn("println-str", function printlnStrImpl(...args) {
    return v.string(args.map(valueToString).join(" ") + `
`);
  }).doc("println to a string.", [["&", "args"]]),
  symbol: v.nativeFn("symbol", function symbolImpl(...args) {
    if (args.length === 0 || args.length > 2) {
      throw new EvaluationError("symbol expects 1 or 2 string arguments", {
        args
      });
    }
    if (args.length === 1) {
      if (is.symbol(args[0]))
        return args[0];
      if (args[0].kind !== "string") {
        throw EvaluationError.atArg(`symbol expects a string, got ${printString(args[0])}`, { args }, 0);
      }
      return v.symbol(args[0].value);
    }
    if (args[0].kind !== "string" || args[1].kind !== "string") {
      throw new EvaluationError("symbol expects string arguments", { args });
    }
    return v.symbol(`${args[0].value}/${args[1].value}`);
  }).doc("Returns a Symbol with the given namespace and name.", [
    ["name"],
    ["ns", "name"]
  ])
};

// src/core/modules/core/stdlib/lazy.ts
var lazyFunctions = {
  force: v.nativeFn("force", function force(value) {
    if (is.delay(value))
      return realizeDelay(value);
    if (is.lazySeq(value))
      return realizeLazySeq(value);
    return value;
  }).doc("If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.", [["x"]]),
  "delay?": v.nativeFn("delay?", function isDelayPred(value) {
    return v.boolean(is.delay(value));
  }).doc("Returns true if x is a Delay.", [["x"]]),
  "lazy-seq?": v.nativeFn("lazy-seq?", function isLazySeqPred(value) {
    return v.boolean(is.lazySeq(value));
  }).doc("Returns true if x is a LazySeq.", [["x"]]),
  "realized?": v.nativeFn("realized?", function isRealized(value) {
    if (is.delay(value))
      return v.boolean(value.realized);
    if (is.lazySeq(value))
      return v.boolean(value.realized);
    return v.boolean(false);
  }).doc("Returns true if a Delay or LazySeq has been realized.", [["x"]]),
  "make-delay": v.nativeFnCtx("make-delay", function makeDelayImpl(ctx, callEnv, fn) {
    if (!is.aFunction(fn)) {
      throw new EvaluationError(`make-delay: argument must be a function, got ${fn.kind}`, { fn });
    }
    return v.delay(() => ctx.applyCallable(fn, [], callEnv));
  }).doc("Creates a Delay that invokes thunk-fn (a zero-arg function) on first force.", [["thunk-fn"]])
};

// src/core/modules/core/stdlib/vars.ts
var varFunctions = {
  "var?": v.nativeFn("var?", function isVarImpl(x) {
    return v.boolean(is.var(x));
  }).doc("Returns true if x is a Var.", [["x"]]),
  "var-get": v.nativeFn("var-get", function varGetImpl(x) {
    if (!is.var(x)) {
      throw new EvaluationError(`var-get expects a Var, got ${x.kind}`, { x });
    }
    return x.value;
  }).doc("Returns the value in the Var object.", [["x"]]),
  "alter-var-root": v.nativeFnCtx("alter-var-root", function alterVarRootImpl(ctx, callEnv, varVal, f, ...args) {
    if (!is.var(varVal)) {
      throw new EvaluationError(`alter-var-root expects a Var as its first argument, got ${varVal.kind}`, { varVal });
    }
    if (!is.aFunction(f)) {
      throw new EvaluationError(`alter-var-root expects a function as its second argument, got ${f.kind}`, { f });
    }
    const newVal = ctx.applyFunction(f, [varVal.value, ...args], callEnv);
    varVal.value = newVal;
    return newVal;
  }).doc("Atomically alters the root binding of var v by applying f to its current value plus any additional args.", [["v", "f", "&", "args"]])
};

// src/core/modules/core/stdlib/multimethods.ts
function keywordToDispatchFn(kw) {
  return v.nativeFn(`kw:${kw.name}`, (...args) => {
    const target = args[0];
    if (!is.map(target))
      return v.nil();
    const entry = target.entries.find(([k]) => is.equal(k, kw));
    return entry ? entry[1] : v.nil();
  });
}
var multimethodFunctions = {
  "multimethod?": v.nativeFn("multimethod?", function isMultimethodImpl(x) {
    return v.boolean(is.multiMethod(x));
  }).doc("Returns true if x is a multimethod.", [["x"]]),
  "make-multimethod!": v.nativeFnCtx("make-multimethod!", function makeMultimethodImpl(_ctx, callEnv, nameVal, dispatchFnVal) {
    if (!is.string(nameVal)) {
      throw new EvaluationError(`make-multimethod!: first argument must be a string, got ${nameVal.kind}`, { nameVal });
    }
    const name = nameVal.value;
    const nsEnv = getNamespaceEnv(callEnv);
    const existing = nsEnv.ns.vars.get(name);
    if (existing && is.multiMethod(existing.value)) {
      return v.nil();
    }
    let dispatchFn;
    if (is.keyword(dispatchFnVal)) {
      dispatchFn = keywordToDispatchFn(dispatchFnVal);
    } else if (is.aFunction(dispatchFnVal)) {
      dispatchFn = dispatchFnVal;
    } else {
      throw new EvaluationError(`make-multimethod!: dispatch-fn must be a function or keyword, got ${dispatchFnVal.kind}`, { dispatchFnVal });
    }
    const mm = v.multiMethod(name, dispatchFn, []);
    internVar(name, mm, nsEnv);
    return v.nil();
  }).doc("Creates a multimethod with the given name and dispatch-fn in the current namespace. No-op if already a multimethod (re-eval safe).", [["name", "dispatch-fn"]]),
  "add-method!": v.nativeFnCtx("add-method!", function addMethodImpl(_ctx, _callEnv, varVal, dispatchVal, methodFn) {
    if (!is.var(varVal)) {
      throw new EvaluationError(`add-method!: first argument must be a Var, got ${varVal.kind}`, { varVal });
    }
    if (!is.multiMethod(varVal.value)) {
      throw new EvaluationError(`add-method!: ${varVal.name} is not a multimethod`, { varVal });
    }
    if (!is.aFunction(methodFn)) {
      throw new EvaluationError(`add-method!: method must be a function, got ${methodFn.kind}`, { methodFn });
    }
    const existing = varVal.value;
    const isDefault = is.keyword(dispatchVal) && dispatchVal.name === ":default";
    let updated;
    if (isDefault) {
      updated = v.multiMethod(existing.name, existing.dispatchFn, existing.methods, methodFn);
    } else {
      const filtered = existing.methods.filter((m) => !is.equal(m.dispatchVal, dispatchVal));
      updated = v.multiMethod(existing.name, existing.dispatchFn, [
        ...filtered,
        { dispatchVal, fn: methodFn }
      ]);
    }
    varVal.value = updated;
    return v.nil();
  }).doc("Adds or replaces a method on a multimethod var. Uses :default as the fallback dispatch value.", [["mm-var", "dispatch-val", "fn"]])
};

// src/core/modules/core/stdlib/async-fns.ts
var asyncFunctions = {
  then: v.nativeFnCtx("then", (ctx, callEnv, val, f) => {
    if (!is.callable(f)) {
      throw new EvaluationError(`${printString(f)} is not a callable value`, { fn: f, args: [] });
    }
    if (val.kind !== "pending") {
      return ctx.applyCallable(f, [val], callEnv);
    }
    const promise = val.promise.then((resolved) => {
      try {
        const result = ctx.applyCallable(f, [resolved], callEnv);
        return result.kind === "pending" ? result.promise : result;
      } catch (e) {
        return Promise.reject(e);
      }
    });
    return v.pending(promise);
  }).doc("Applies f to the resolved value of a pending, or to val directly if not pending.", [["val", "f"]]),
  "catch*": v.nativeFnCtx("catch*", (ctx, callEnv, val, f) => {
    if (!is.callable(f)) {
      throw new EvaluationError(`${printString(f)} is not a callable value`, { fn: f, args: [] });
    }
    if (val.kind !== "pending")
      return val;
    const promise = val.promise.catch((err) => {
      let errVal;
      if (err instanceof CljThrownSignal) {
        errVal = err.value;
      } else {
        errVal = {
          kind: "map",
          entries: [
            [
              { kind: "keyword", name: ":type" },
              { kind: "keyword", name: ":error/js" }
            ],
            [
              { kind: "keyword", name: ":message" },
              {
                kind: "string",
                value: err instanceof Error ? err.message : String(err)
              }
            ]
          ]
        };
      }
      try {
        const result = ctx.applyCallable(f, [errVal], callEnv);
        return result.kind === "pending" ? result.promise : result;
      } catch (e) {
        return Promise.reject(e);
      }
    });
    return v.pending(promise);
  }).doc("Handles rejection of a pending value by calling f with the thrown value or an error map.", [["val", "f"]]),
  "pending?": v.nativeFn("pending?", (val) => {
    return v.boolean(val.kind === "pending");
  }).doc("Returns true if val is a pending (async) value.", [["val"]]),
  "promise-of": v.nativeFn("promise-of", (val) => {
    return v.pending(Promise.resolve(val));
  }).doc("Wraps val in an immediately-resolving pending value. Useful for testing async composition.", [["val"]]),
  all: v.nativeFn("all", (val) => {
    const items = val.kind === "nil" ? [] : toSeq(val);
    const promises = items.map((item) => item.kind === "pending" ? item.promise : Promise.resolve(item));
    return v.pending(Promise.all(promises).then((results) => v.vector(results)));
  }).doc("Returns a pending that resolves with a vector of all results when every input resolves.", [["pendings"]])
};

// src/core/modules/core/stdlib/print.ts
function emitToOut(ctx, callEnv, text) {
  const outVar = ctx.resolveNs("clojure.core")?.vars.get("*out*");
  const out = outVar ? derefValue(outVar) : undefined;
  if (out && (out.kind === "function" || out.kind === "native-function")) {
    ctx.applyCallable(out, [v.string(text)], callEnv);
  } else {
    ctx.io.stdout(text);
  }
}
function emitToErr(ctx, callEnv, text) {
  const errVar = ctx.resolveNs("clojure.core")?.vars.get("*err*");
  const err = errVar ? derefValue(errVar) : undefined;
  if (err && (err.kind === "function" || err.kind === "native-function")) {
    ctx.applyCallable(err, [v.string(text)], callEnv);
  } else {
    ctx.io.stderr(text);
  }
}
var printFunctions = {
  println: v.nativeFnCtx("println", (ctx, callEnv, ...args) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map(valueToString).join(" ") + `
`);
    });
    return v.nil();
  }),
  print: v.nativeFnCtx("print", (ctx, callEnv, ...args) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map(valueToString).join(" "));
    });
    return v.nil();
  }),
  newline: v.nativeFnCtx("newline", (ctx, callEnv) => {
    emitToOut(ctx, callEnv, `
`);
    return v.nil();
  }),
  pr: v.nativeFnCtx("pr", (ctx, callEnv, ...args) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map((v2) => printString(v2)).join(" "));
    });
    return v.nil();
  }),
  prn: v.nativeFnCtx("prn", (ctx, callEnv, ...args) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, args.map((v2) => printString(v2)).join(" ") + `
`);
    });
    return v.nil();
  }),
  pprint: v.nativeFnCtx("pprint", (ctx, callEnv, form, widthArg) => {
    if (form === undefined)
      return v.nil();
    const maxWidth = widthArg?.kind === "number" ? widthArg.value : 80;
    withPrintContext(buildPrintContext(ctx), () => {
      emitToOut(ctx, callEnv, prettyPrintString(form, maxWidth) + `
`);
    });
    return v.nil();
  }),
  warn: v.nativeFnCtx("warn", (ctx, callEnv, ...args) => {
    withPrintContext(buildPrintContext(ctx), () => {
      emitToErr(ctx, callEnv, args.map(valueToString).join(" ") + `
`);
    });
    return v.nil();
  })
};
var printVars = {
  "*out*": v.nil(),
  "*err*": v.nil(),
  "*print-length*": v.nil(),
  "*print-level*": v.nil(),
  "*compiler-options*": v.map([])
};

// src/core/modules/core/index.ts
var nativeFunctions = {
  ...arithmeticFunctions,
  ...atomFunctions,
  ...seqFunctions,
  ...vectorFunctions,
  ...mapsSetsFunctions,
  ...errorFunctions,
  ...predicateFunctions,
  ...hofFunctions,
  ...metaFunctions,
  ...transducerFunctions,
  ...regexFunctions,
  ...stringFunctions,
  ...utilFunctions,
  ...varFunctions,
  ...multimethodFunctions,
  ...lazyFunctions,
  ...printFunctions,
  ...asyncFunctions
};
var nativeDynamicVars = {
  ...printVars
};
function makeCoreModule() {
  return {
    id: "clojure/core",
    declareNs: [
      {
        name: "clojure.core",
        vars(_ctx) {
          const map = new Map;
          for (const [name, fn] of Object.entries(nativeFunctions)) {
            const meta = fn.meta;
            map.set(name, { value: fn, ...meta ? { meta } : {} });
          }
          for (const [name, value] of Object.entries(nativeDynamicVars)) {
            map.set(name, { value, dynamic: true });
          }
          return map;
        }
      }
    ]
  };
}

// src/core/modules/js/index.ts
function resolveJsKey(key, fnName) {
  if (is.string(key))
    return key.value;
  if (is.keyword(key))
    return key.name.slice(1);
  if (is.number(key))
    return String(key.value);
  throw new EvaluationError(`${fnName}: key must be a string, keyword, or number, got ${key.kind}`, { key });
}
function extractJsTarget(val, fnName) {
  switch (val.kind) {
    case valueKeywords.jsValue:
      return val.value;
    case valueKeywords.string:
    case valueKeywords.number:
    case valueKeywords.boolean:
      return val.value;
    case valueKeywords.nil:
      throw new EvaluationError(`${fnName}: cannot access properties on nil`, {
        val
      });
    default:
      throw new EvaluationError(`${fnName}: expected a js-value or primitive, got ${val.kind}`, { val });
  }
}
var coreNativeFunctions = {
  "clj->js": v.nativeFnCtx("clj->js", (ctx, callEnv, val) => {
    if (is.jsValue(val))
      return val;
    const applier = {
      applyFunction: (fn, args) => ctx.applyCallable(fn, args, callEnv)
    };
    return v.jsValue(cljToJs(val, applier));
  }),
  "js->clj": v.nativeFn("js->clj", (val, opts) => {
    if (val.kind === "nil")
      return val;
    if (!is.jsValue(val)) {
      throw new EvaluationError(`js->clj expects a js-value, got ${val.kind}`, {
        val
      });
    }
    const keywordizeKeys = (() => {
      if (!opts || opts.kind !== "map")
        return false;
      for (const [k, flag] of opts.entries) {
        if (k.kind === "keyword" && k.name === ":keywordize-keys") {
          return flag.kind !== "boolean" || flag.value !== false;
        }
      }
      return false;
    })();
    return jsToClj(val.value, { keywordizeKeys });
  })
};
var moduleNativeFunctions = {
  get: v.nativeFn("js/get", (obj, key, ...rest) => {
    const raw = extractJsTarget(obj, "js/get");
    const jsKey = resolveJsKey(key, "js/get");
    const result = raw[jsKey];
    if (result === undefined && rest.length > 0)
      return rest[0];
    return jsToClj2(result);
  }),
  "set!": v.nativeFnCtx("js/set!", (ctx, callEnv, obj, key, val) => {
    const raw = extractJsTarget(obj, "js/set!");
    const jsKey = resolveJsKey(key, "js/set!");
    raw[jsKey] = cljToJs2(val, ctx, callEnv);
    return val;
  }),
  call: v.nativeFnCtx("js/call", (ctx, callEnv, fn, ...args) => {
    const rawFn = fn.kind === "js-value" ? fn.value : undefined;
    if (typeof rawFn !== "function") {
      throw new EvaluationError(`js/call: expected a js-value wrapping a function, got ${fn.kind}`, { fn });
    }
    const jsArgs = args.map((a) => cljToJs2(a, ctx, callEnv));
    return jsToClj2(rawFn(...jsArgs));
  }),
  typeof: v.nativeFn("js/typeof", (x) => {
    switch (x.kind) {
      case "nil":
        return v.string("object");
      case "number":
        return v.string("number");
      case "string":
        return v.string("string");
      case "boolean":
        return v.string("boolean");
      case "js-value":
        return v.string(typeof x.value);
      default:
        throw new EvaluationError(`js/typeof: cannot determine JS type of Clojure ${x.kind}`, { x });
    }
  }),
  "instanceof?": v.nativeFn("js/instanceof?", (obj, cls) => {
    if (obj.kind !== "js-value") {
      throw new EvaluationError(`js/instanceof?: expected js-value, got ${obj.kind}`, { obj });
    }
    if (cls.kind !== "js-value") {
      throw new EvaluationError(`js/instanceof?: expected js-value constructor, got ${cls.kind}`, { cls });
    }
    return v.boolean(obj.value instanceof cls.value);
  }),
  "array?": v.nativeFn("js/array?", (x) => {
    if (x.kind !== "js-value")
      return v.boolean(false);
    return v.boolean(Array.isArray(x.value));
  }),
  "null?": v.nativeFn("js/null?", (x) => {
    return v.boolean(x.kind === "nil");
  }),
  "undefined?": v.nativeFn("js/undefined?", (x) => {
    return v.boolean(x.kind === "js-value" && x.value === undefined);
  }),
  "some?": v.nativeFn("js/some?", (x) => {
    if (x.kind === "nil")
      return v.boolean(false);
    if (x.kind === "js-value" && x.value === undefined)
      return v.boolean(false);
    return v.boolean(true);
  }),
  "get-in": v.nativeFn("js/get-in", (obj, path, ...rest) => {
    if (path.kind !== "vector") {
      throw new EvaluationError(`js/get-in: path must be a vector, got ${path.kind}`, { path });
    }
    if (obj.kind === "nil") {
      throw new EvaluationError("js/get-in: cannot access properties on nil", { obj });
    }
    const notFound = rest.length > 0 ? rest[0] : v.jsValue(undefined);
    let current = obj;
    for (const key of path.value) {
      if (current.kind === "nil")
        return notFound;
      if (current.kind === "js-value" && current.value === undefined)
        return notFound;
      const raw = extractJsTarget(current, "js/get-in");
      const jsKey = resolveJsKey(key, "js/get-in");
      current = jsToClj2(raw[jsKey]);
    }
    if (current.kind === "js-value" && current.value === undefined && rest.length > 0) {
      return notFound;
    }
    return current;
  }),
  prop: v.nativeFn("js/prop", (key, ...rest) => {
    const notFound = rest.length > 0 ? rest[0] : v.nil();
    return v.nativeFn("js/prop-accessor", (obj) => {
      const raw = extractJsTarget(obj, "js/prop");
      const jsKey = resolveJsKey(key, "js/prop");
      const result = raw[jsKey];
      if (result === undefined)
        return notFound;
      return jsToClj2(result);
    });
  }),
  method: v.nativeFn("js/method", (key, ...partialArgs) => {
    return v.nativeFnCtx("js/method-caller", (ctx, callEnv, obj, ...callArgs) => {
      const rawObj = extractJsTarget(obj, "js/method");
      const jsKey = resolveJsKey(key, "js/method");
      const method = rawObj[jsKey];
      if (typeof method !== "function") {
        throw new EvaluationError(`js/method: property '${jsKey}' is not callable`, { jsKey });
      }
      const allArgs = [...partialArgs, ...callArgs].map((a) => cljToJs2(a, ctx, callEnv));
      return jsToClj2(method.apply(rawObj, allArgs));
    });
  }),
  merge: v.nativeFnCtx("js/merge", (ctx, callEnv, ...args) => {
    const result = Object.assign({}, ...args.map((a) => cljToJs2(a, ctx, callEnv)));
    return v.jsValue(result);
  }),
  seq: v.nativeFn("js/seq", (arr) => {
    if (arr.kind !== "js-value" || !Array.isArray(arr.value)) {
      throw new EvaluationError(`js/seq: expected a js-value wrapping an array, got ${arr.kind}`, { arr });
    }
    return v.vector(arr.value.map(jsToClj2));
  }),
  array: v.nativeFnCtx("js/array", (ctx, callEnv, ...args) => {
    return v.jsValue(args.map((a) => cljToJs2(a, ctx, callEnv)));
  }),
  obj: v.nativeFnCtx("js/obj", (ctx, callEnv, ...args) => {
    if (args.length % 2 !== 0) {
      throw new EvaluationError("js/obj: requires even number of arguments", {
        count: args.length
      });
    }
    const result = {};
    for (let i = 0;i < args.length; i += 2) {
      const jsKey = resolveJsKey(args[i], "js/obj");
      result[jsKey] = cljToJs2(args[i + 1], ctx, callEnv);
    }
    return v.jsValue(result);
  }),
  keys: v.nativeFn("js/keys", (obj) => {
    const raw = extractJsTarget(obj, "js/keys");
    return v.vector(Object.keys(raw).map(v.string));
  }),
  values: v.nativeFn("js/values", (obj) => {
    const raw = extractJsTarget(obj, "js/values");
    return v.vector(Object.values(raw).map(jsToClj2));
  }),
  entries: v.nativeFn("js/entries", (obj) => {
    const raw = extractJsTarget(obj, "js/entries");
    return v.vector(Object.entries(raw).map(([k, val]) => v.vector([v.string(k), jsToClj2(val)])));
  })
};
function makeJsModule() {
  return {
    id: "cljam/js-namespace",
    declareNs: [
      {
        name: "clojure.core",
        vars(_ctx) {
          const map = new Map;
          for (const [name, fn] of Object.entries(coreNativeFunctions)) {
            map.set(name, { value: fn });
          }
          return map;
        }
      },
      {
        name: "js",
        vars(_ctx) {
          const map = new Map;
          for (const [name, fn] of Object.entries(moduleNativeFunctions)) {
            map.set(name, { value: fn });
          }
          return map;
        }
      }
    ]
  };
}

// src/core/runtime.ts
function buildRuntime(registry, coreEnv, options) {
  const sourceRoots = new Set(options?.sourceRoots ?? []);
  const varOwners = new Map;
  let currentNsRef = "user";
  function resolveNamespace(nsName, ctx) {
    const builtInLoader = builtInNamespaceSources[nsName];
    if (builtInLoader) {
      runtime.loadFile(builtInLoader(), nsName, undefined, ctx);
      return true;
    }
    const registeredSource = options?.registeredSources?.get(nsName);
    if (registeredSource !== undefined) {
      runtime.loadFile(registeredSource, nsName, undefined, ctx);
      return true;
    }
    if (!options?.readFile || sourceRoots.size === 0)
      return false;
    for (const root of sourceRoots) {
      const filePath = `${root.replace(/\/$/, "")}/${nsName.replace(/\./g, "/")}.clj`;
      try {
        const source = options.readFile(filePath);
        if (source) {
          runtime.loadFile(source, undefined, undefined, ctx);
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }
  function isLibraryNamespace(nsName) {
    return options?.registeredSources?.has(nsName) ?? false;
  }
  function isHostModuleAllowed(specifier, allowedHostModules) {
    if (allowedHostModules === "all")
      return true;
    return allowedHostModules.some((allowed) => specifier === allowed || specifier.startsWith(allowed));
  }
  wireNsCore(registry, coreEnv, () => currentNsRef, resolveNamespace);
  wireIdeStubs(registry, coreEnv);
  const runtime = {
    get registry() {
      return registry;
    },
    ensureNamespace(name) {
      return ensureNamespaceInRegistry(registry, coreEnv, name);
    },
    getNamespaceEnv(name) {
      return registry.get(name) ?? null;
    },
    getNs(name) {
      return registry.get(name)?.ns ?? null;
    },
    syncNsVar(name) {
      currentNsRef = name;
      const nsVarInner = coreEnv.ns?.vars.get("*ns*");
      if (nsVarInner) {
        const nsObj = registry.get(name)?.ns;
        if (nsObj)
          nsVarInner.value = nsObj;
      }
    },
    addSourceRoot(path) {
      sourceRoots.add(path);
    },
    processRequireSpec(spec, fromEnv, ctx) {
      processRequireSpec(spec, fromEnv, registry, (nsName) => resolveNamespace(nsName, ctx), ctx.allowedPackages, isLibraryNamespace);
    },
    processNsRequires(forms, fromEnv, ctx) {
      const requireClauses = extractRequireClauses(forms);
      for (const specs of requireClauses) {
        for (const spec of specs) {
          if (is.vector(spec) && spec.value.length > 0 && is.string(spec.value[0])) {
            const specifier = spec.value[0].value;
            throw new EvaluationError(`String module require ["${specifier}" :as ...] is async — use evaluateAsync() instead of evaluate()`, { specifier });
          }
          processRequireSpec(spec, fromEnv, registry, (nsName) => resolveNamespace(nsName, ctx), ctx.allowedPackages, isLibraryNamespace);
        }
      }
    },
    async processNsRequiresAsync(forms, fromEnv, ctx) {
      const requireClauses = extractRequireClauses(forms);
      for (const specs of requireClauses) {
        for (const spec of specs) {
          if (is.vector(spec) && spec.value.length > 0 && is.string(spec.value[0])) {
            const specifier = spec.value[0].value;
            if (!ctx.importModule) {
              throw new EvaluationError(`importModule is not configured; cannot require "${specifier}". Pass importModule to createSession().`, { specifier });
            }
            if (ctx.allowedHostModules !== undefined && !isHostModuleAllowed(specifier, ctx.allowedHostModules)) {
              const allowedList = ctx.allowedHostModules === "all" ? [] : ctx.allowedHostModules;
              const err = new EvaluationError(`Access denied: host module '${specifier}' is not in the allowed host modules for this session.
` + `Allowed host modules: ${JSON.stringify(allowedList)}
` + `To allow all host modules, use: allowedHostModules: 'all'`, { specifier, allowedHostModules: ctx.allowedHostModules });
              err.code = "namespace/access-denied";
              throw err;
            }
            const elements = spec.value;
            let aliasName = null;
            for (let i = 1;i < elements.length; i++) {
              if (is.keyword(elements[i]) && elements[i].name === ":as") {
                i++;
                const aliasSym = elements[i];
                if (!aliasSym || !is.symbol(aliasSym)) {
                  throw new EvaluationError(":as expects a symbol alias", {
                    spec
                  });
                }
                aliasName = aliasSym.name;
                break;
              }
            }
            if (aliasName === null) {
              throw new EvaluationError(`String require spec must have an :as alias: ["${specifier}" :as Alias]`, { spec });
            }
            const rawModule = await ctx.importModule(specifier);
            internVar(aliasName, v.jsValue(rawModule), fromEnv);
          } else {
            processRequireSpec(spec, fromEnv, registry, (nsName) => resolveNamespace(nsName, ctx), ctx.allowedPackages, isLibraryNamespace);
          }
        }
      }
    },
    loadFile(source, nsName, filePath, ctx) {
      const tokens = tokenize(source);
      const targetNs = extractNsNameFromTokens(tokens) ?? nsName ?? "user";
      const aliasMap = extractAliasMapFromTokens(tokens);
      const forms = readForms(tokens, targetNs, aliasMap);
      const env = this.ensureNamespace(targetNs);
      ctx.currentSource = source;
      ctx.currentFile = filePath;
      ctx.currentLineOffset = 0;
      ctx.currentColOffset = 0;
      this.processNsRequires(forms, env, ctx);
      try {
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env);
          ctx.evaluate(expanded, env);
        }
      } finally {
        ctx.currentSource = undefined;
        ctx.currentFile = undefined;
      }
      return targetNs;
    },
    installModules(modules) {
      const ordered = resolveModuleOrder(modules, new Set(registry.keys()));
      for (const mod of ordered) {
        for (const decl of mod.declareNs) {
          const nsEnv = ensureNamespaceInRegistry(registry, coreEnv, decl.name);
          const ctx = {
            getVar(ns, name) {
              const nsEnv2 = registry.get(ns);
              const v2 = nsEnv2?.ns?.vars.get(name);
              return v2 ?? null;
            },
            getNamespace(name) {
              return registry.get(name)?.ns ?? null;
            }
          };
          const varMap = decl.vars(ctx);
          for (const [varName, decl2] of varMap) {
            const key = `${nsEnv.ns.name}/${varName}`;
            const existing = varOwners.get(key);
            if (existing !== undefined) {
              throw new Error(`var '${varName}' in '${nsEnv.ns.name}' already declared by module '${existing}'`);
            }
            internVar(varName, decl2.value, nsEnv, decl2.meta);
            if (decl2.dynamic) {
              const v2 = nsEnv.ns.vars.get(varName);
              v2.dynamic = true;
            }
            varOwners.set(key, mod.id);
          }
        }
      }
    },
    snapshot() {
      return { registry: cloneRegistry(registry) };
    }
  };
  return runtime;
}
function createRuntime(options) {
  const registry = new Map;
  const coreEnv = makeEnv();
  coreEnv.ns = makeNamespace("clojure.core");
  registry.set("clojure.core", coreEnv);
  const userEnv = makeEnv(coreEnv);
  userEnv.ns = makeNamespace("user");
  registry.set("user", userEnv);
  const runtime = buildRuntime(registry, coreEnv, options);
  runtime.installModules([makeCoreModule(), makeJsModule()]);
  return runtime;
}

// src/core/session.ts
function buildSessionFacade(runtime, initialNs, options) {
  let currentNs = initialNs;
  const ctx = createEvaluationContext();
  ctx.resolveNs = (name) => runtime.getNs(name);
  ctx.io = {
    stdout: options?.output ?? ((text) => console.log(text)),
    stderr: options?.stderr ?? ((text) => console.error(text))
  };
  ctx.importModule = options?.importModule;
  ctx.allowedPackages = options?.allowedPackages ?? "all";
  ctx.allowedHostModules = options?.allowedHostModules ?? "all";
  ctx.setCurrentNs = (name) => {
    runtime.ensureNamespace(name);
    currentNs = name;
    runtime.syncNsVar(name);
  };
  const capabilities = {
    allowedPackages: options?.allowedPackages ?? "all",
    allowedHostModules: options?.allowedHostModules ?? "all",
    hostBindings: Object.keys(options?.hostBindings ?? {}),
    allowDynamicImport: options?.importModule !== undefined,
    libraries: (options?.libraries ?? []).map((lib) => lib.id)
  };
  const session = {
    get runtime() {
      return runtime;
    },
    get capabilities() {
      return capabilities;
    },
    get registry() {
      return runtime.registry;
    },
    get currentNs() {
      return currentNs;
    },
    setNs(name) {
      runtime.ensureNamespace(name);
      currentNs = name;
      runtime.syncNsVar(name);
    },
    getNs(name) {
      return runtime.getNs(name);
    },
    loadFile(source, nsName, filePath) {
      return runtime.loadFile(source, nsName, filePath, ctx);
    },
    async loadFileAsync(source, nsName, filePath) {
      if (nsName) {
        const tokens = tokenize(source);
        if (!extractNsNameFromTokens(tokens)) {
          runtime.ensureNamespace(nsName);
          currentNs = nsName;
          runtime.syncNsVar(nsName);
        }
      }
      await session.evaluateAsync(source, { file: filePath });
      return currentNs;
    },
    addSourceRoot(path) {
      runtime.addSourceRoot(path);
    },
    evaluate(source, opts) {
      ctx.currentSource = source;
      ctx.currentFile = opts?.file;
      ctx.currentLineOffset = opts?.lineOffset ?? 0;
      ctx.currentColOffset = opts?.colOffset ?? 0;
      try {
        const tokens = tokenize(source);
        const declaredNs = extractNsNameFromTokens(tokens);
        if (declaredNs) {
          runtime.ensureNamespace(declaredNs);
          currentNs = declaredNs;
          runtime.syncNsVar(declaredNs);
        }
        const env = runtime.getNamespaceEnv(currentNs);
        const aliasMap = extractAliasMapFromTokens(tokens);
        env.ns?.aliases.forEach((ns, alias) => {
          aliasMap.set(alias, ns.name);
        });
        env.ns?.readerAliases.forEach((nsName, alias) => {
          aliasMap.set(alias, nsName);
        });
        const forms = readForms(tokens, currentNs, aliasMap);
        runtime.processNsRequires(forms, env, ctx);
        let result = v.nil();
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env);
          result = ctx.evaluate(expanded, env);
        }
        return result;
      } catch (e) {
        if (e instanceof CljThrownSignal) {
          throw new EvaluationError(`Unhandled throw: ${printString(e.value)}`, { thrownValue: e.value });
        }
        if (e instanceof RecurSignal) {
          throw new EvaluationError("recur called outside of loop or fn", {
            args: e.args
          });
        }
        if (e instanceof EvaluationError || e instanceof ReaderError) {
          const pos = e.pos ?? (e instanceof EvaluationError ? e.frames?.[0]?.pos : undefined);
          if (pos) {
            e.message += formatErrorContext(source, pos, {
              lineOffset: ctx.currentLineOffset,
              colOffset: ctx.currentColOffset
            });
          }
        }
        throw e;
      } finally {
        ctx.currentSource = undefined;
        ctx.currentFile = undefined;
        ctx.frameStack = [];
      }
    },
    async evaluateAsync(source, opts) {
      ctx.currentSource = source;
      ctx.currentFile = opts?.file;
      ctx.currentLineOffset = opts?.lineOffset ?? 0;
      ctx.currentColOffset = opts?.colOffset ?? 0;
      try {
        const tokens = tokenize(source);
        const declaredNs = extractNsNameFromTokens(tokens);
        if (declaredNs) {
          runtime.ensureNamespace(declaredNs);
          currentNs = declaredNs;
          runtime.syncNsVar(declaredNs);
        }
        const env = runtime.getNamespaceEnv(currentNs);
        const aliasMap = extractAliasMapFromTokens(tokens);
        env.ns?.aliases.forEach((ns, alias) => {
          aliasMap.set(alias, ns.name);
        });
        env.ns?.readerAliases.forEach((nsName, alias) => {
          aliasMap.set(alias, nsName);
        });
        const forms = readForms(tokens, currentNs, aliasMap);
        await runtime.processNsRequiresAsync(forms, env, ctx);
        let result = v.nil();
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env);
          result = ctx.evaluate(expanded, env);
        }
        if (result.kind !== "pending")
          return result;
        try {
          return await result.promise;
        } catch (e) {
          if (e instanceof CljThrownSignal) {
            throw new EvaluationError(`Unhandled throw: ${printString(e.value)}`, { thrownValue: e.value });
          }
          throw e;
        }
      } catch (e) {
        if (e instanceof CljThrownSignal) {
          throw new EvaluationError(`Unhandled throw: ${printString(e.value)}`, { thrownValue: e.value });
        }
        if (e instanceof RecurSignal) {
          throw new EvaluationError("recur called outside of loop or fn", {
            args: e.args
          });
        }
        if (e instanceof EvaluationError || e instanceof ReaderError) {
          const pos = e.pos ?? (e instanceof EvaluationError ? e.frames?.[0]?.pos : undefined);
          if (pos) {
            e.message += formatErrorContext(source, pos, {
              lineOffset: ctx.currentLineOffset,
              colOffset: ctx.currentColOffset
            });
          }
        }
        throw e;
      } finally {
        ctx.currentSource = undefined;
        ctx.currentFile = undefined;
        ctx.frameStack = [];
      }
    },
    applyFunction(fn, args) {
      return ctx.applyCallable(fn, args, makeEnv());
    },
    cljToJs(value) {
      return cljToJs(value, {
        applyFunction: (fn, args) => ctx.applyCallable(fn, args, makeEnv())
      });
    },
    evaluateForms(forms) {
      try {
        const env = runtime.getNamespaceEnv(currentNs);
        let result = v.nil();
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env);
          result = ctx.evaluate(expanded, env);
        }
        return result;
      } catch (e) {
        if (e instanceof CljThrownSignal) {
          throw new EvaluationError(`Unhandled throw: ${printString(e.value)}`, { thrownValue: e.value });
        }
        if (e instanceof RecurSignal) {
          throw new EvaluationError("recur called outside of loop or fn", {
            args: e.args
          });
        }
        throw e;
      }
    },
    getCompletions(prefix, nsName) {
      let env = runtime.registry.get(nsName ?? currentNs) ?? null;
      const seen = new Set;
      while (env) {
        for (const key of env.bindings.keys())
          seen.add(key);
        if (env.ns)
          for (const key of env.ns.vars.keys())
            seen.add(key);
        env = env.outer;
      }
      const candidates = [...seen];
      if (!prefix)
        return candidates.sort();
      return candidates.filter((k) => k.startsWith(prefix)).sort();
    }
  };
  return session;
}
function createSession(options) {
  const modules = options?.modules ?? [];
  const libraries = options?.libraries ?? [];
  const registeredSources = new Map;
  const sourceOwners = new Map;
  for (const lib of libraries) {
    for (const [nsName, source] of Object.entries(lib.sources ?? {})) {
      const existing = sourceOwners.get(nsName);
      if (existing !== undefined) {
        throw new Error(`Library '${lib.id}' tried to register namespace '${nsName}', already registered by '${existing}'.`);
      }
      registeredSources.set(nsName, source);
      sourceOwners.set(nsName, lib.id);
    }
  }
  const runtime = createRuntime({
    sourceRoots: options?.sourceRoots,
    readFile: options?.readFile,
    registeredSources: registeredSources.size > 0 ? registeredSources : undefined
  });
  const session = buildSessionFacade(runtime, "user", options);
  const coreLoader = builtInNamespaceSources["clojure.core"];
  if (!coreLoader) {
    throw new Error("Missing built-in clojure.core source in registry");
  }
  session.loadFile(coreLoader(), "clojure.core");
  if (modules.length > 0) {
    session.runtime.installModules(modules);
  }
  const libraryModules = libraries.flatMap((lib) => lib.module ? [lib.module] : []);
  if (libraryModules.length > 0) {
    session.runtime.installModules(libraryModules);
  }
  if (options?.hostBindings) {
    const jsEnv = runtime.getNamespaceEnv("js");
    if (jsEnv) {
      for (const [name, rawValue] of Object.entries(options.hostBindings)) {
        if (jsEnv.ns?.vars.has(name)) {
          throw new Error(`createSession: hostBindings key '${name}' conflicts with built-in js/${name} — choose a different key`);
        }
        internVar(name, jsToClj2(rawValue), jsEnv);
      }
    }
  }
  for (const source of options?.entries ?? []) {
    session.loadFile(source);
  }
  return session;
}

// src/vite-plugin-cljam/namespace-utils.ts
import { resolve, dirname } from "node:path";
function pathToNs(filePath, sourceRoots) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const root of sourceRoots) {
    const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "") + "/";
    if (normalized.startsWith(normalizedRoot)) {
      return normalized.slice(normalizedRoot.length).replace(/\.clj$/, "").replace(/\//g, ".");
    }
  }
  throw new Error(`File ${filePath} is not under any configured source root: ${sourceRoots.join(", ")}`);
}
function nsToPath(nsName, sourceRoot) {
  const root = sourceRoot.replace(/\/$/, "");
  return `${root}/${nsName.replace(/\./g, "/")}.clj`;
}
function extractNsRequires(source) {
  const forms = readForms(tokenize(source));
  const nsForm = forms.find((f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === "ns");
  if (!nsForm || !isList(nsForm))
    return [];
  const requires = [];
  for (let i = 2;i < nsForm.value.length; i++) {
    const clause = nsForm.value[i];
    if (isList(clause) && isKeyword(clause.value[0]) && clause.value[0].name === ":require") {
      for (let j = 1;j < clause.value.length; j++) {
        const spec = clause.value[j];
        if (isVector(spec) && spec.value.length > 0 && isSymbol(spec.value[0])) {
          requires.push(spec.value[0].name);
        }
      }
    }
  }
  return requires;
}
function extractStringRequires(source, filePath) {
  const forms = readForms(tokenize(source));
  const nsForm = forms.find((f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === "ns");
  if (!nsForm || !isList(nsForm))
    return [];
  const specifiers = [];
  for (let i = 2;i < nsForm.value.length; i++) {
    const clause = nsForm.value[i];
    if (isList(clause) && isKeyword(clause.value[0]) && clause.value[0].name === ":require") {
      for (let j = 1;j < clause.value.length; j++) {
        const spec = clause.value[j];
        const first = isVector(spec) && spec.value.length > 0 ? spec.value[0] : null;
        if (!first || first.kind !== "string")
          continue;
        let specifier = first.value;
        if (filePath && (specifier.startsWith("./") || specifier.startsWith("../"))) {
          specifier = resolve(dirname(filePath), specifier);
        }
        specifiers.push(specifier);
      }
    }
  }
  return [...new Set(specifiers)];
}
function extractNsName(source) {
  const forms = readForms(tokenize(source));
  const nsForm = forms.find((f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === "ns");
  if (!nsForm)
    return null;
  const nameSymbol = nsForm.value[1];
  return isSymbol(nameSymbol) ? nameSymbol.name : null;
}

// src/vite-plugin-cljam/static-analysis.ts
function readNamespaceVars(source) {
  const forms = readForms(tokenize(source));
  const descriptors = [];
  for (const form of forms) {
    if (!isList(form) || form.value.length < 2)
      continue;
    const head = form.value[0];
    if (!isSymbol(head))
      continue;
    const descriptor = parseTopLevelDef(form, head.name);
    if (descriptor)
      descriptors.push(descriptor);
  }
  return descriptors;
}
function hasPrivateMeta(meta) {
  return (meta?.entries ?? []).some(([k, val]) => k.kind === "keyword" && k.name === ":private" && val.kind === "boolean" && val.value === true);
}
function parseTopLevelDef(form, op) {
  switch (op) {
    case "defn":
      return parseDefn(form, false, false);
    case "defn-":
      return parseDefn(form, true, false);
    case "defmacro":
      return parseDefn(form, false, true);
    case "def":
    case "defonce":
      return parseDef(form);
    case "declare":
      return parseDeclare(form);
    default:
      return null;
  }
}
function parseDefn(form, isPrivate, isMacro2) {
  const nameSym = form.value[1];
  if (!isSymbol(nameSym))
    return null;
  const private_ = isPrivate || hasPrivateMeta(nameSym.meta);
  const rest = form.value.slice(2);
  const start = rest.length > 0 && rest[0].kind === "string" ? 1 : 0;
  const bodyForms = rest.slice(start);
  if (bodyForms.length === 0) {
    return { name: nameSym.name, kind: "fn", arities: [], isPrivate: private_, isMacro: isMacro2 };
  }
  const arities = isList(bodyForms[0]) ? bodyForms.filter(isList).map(parseArityClause) : isVector(bodyForms[0]) ? [vectorToArity(bodyForms[0])] : [];
  return { name: nameSym.name, kind: "fn", arities, isPrivate: private_, isMacro: isMacro2 };
}
function parseArityClause(clause) {
  const paramVec = clause.value[0];
  return isVector(paramVec) ? vectorToArity(paramVec) : { params: [], restParam: null, body: [] };
}
function vectorToArity(paramVec) {
  const params = [];
  let restParam = null;
  for (let i = 0;i < paramVec.value.length; i++) {
    const p = paramVec.value[i];
    if (isSymbol(p) && p.name === "&") {
      const next = paramVec.value[i + 1];
      if (next)
        restParam = next;
      break;
    }
    params.push(p);
  }
  return { params, restParam, body: [] };
}
function parseDef(form) {
  const nameSym = form.value[1];
  if (!isSymbol(nameSym))
    return null;
  const isPrivate = hasPrivateMeta(nameSym.meta);
  const value = form.value[2];
  if (!value) {
    return { name: nameSym.name, kind: "unknown", isPrivate, isMacro: false };
  }
  const fnArities = tryExtractFnArities(value);
  if (fnArities !== null) {
    return { name: nameSym.name, kind: "fn", arities: fnArities, isPrivate, isMacro: false };
  }
  const tsType = inferLiteralTsType(value);
  if (tsType !== null) {
    return { name: nameSym.name, kind: "const", tsType, isPrivate, isMacro: false };
  }
  return { name: nameSym.name, kind: "unknown", isPrivate, isMacro: false };
}
function inferLiteralTsType(value) {
  switch (value.kind) {
    case "number":
      return "number";
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "nil":
      return "null";
    case "keyword":
      return "string";
    case "vector":
    case "set":
      return "unknown[]";
    case "map":
      return "Record<string, unknown>";
    default:
      return null;
  }
}
function parseDeclare(form) {
  const nameSym = form.value[1];
  if (!isSymbol(nameSym))
    return null;
  return { name: nameSym.name, kind: "unknown", isPrivate: false, isMacro: false };
}
function tryExtractFnArities(value) {
  if (!isList(value))
    return null;
  const head = value.value[0];
  if (!isSymbol(head) || head.name !== "fn")
    return null;
  let rest = value.value.slice(1);
  if (rest.length > 0 && isSymbol(rest[0]))
    rest = rest.slice(1);
  if (rest.length === 0)
    return [];
  if (isVector(rest[0])) {
    return [vectorToArity(rest[0])];
  }
  return rest.filter(isList).map(parseArityClause);
}

// src/vite-plugin-cljam/codegen.ts
function generateModuleCode(ctx, nsNameFromPath, source, filePath) {
  const nsName = extractNsName(source) ?? nsNameFromPath;
  const hasStringRequires = extractStringRequires(source, filePath).length > 0;
  const requires = extractNsRequires(source);
  const depImports = requires.map((depNs) => {
    const depPath = ctx.resolveDepPath(depNs);
    if (depPath)
      return `import ${JSON.stringify(depPath)};`;
    return null;
  }).filter(Boolean).join(`
`);
  const vars = readNamespaceVars(source);
  const exportLines = [];
  for (const descriptor of vars) {
    if (descriptor.isMacro)
      continue;
    if (descriptor.isPrivate)
      continue;
    const safeName = safeJsIdentifier(descriptor.name);
    const deref2 = `__ns.vars.get(${JSON.stringify(descriptor.name)}).value`;
    if (descriptor.kind === "fn") {
      exportLines.push(`export function ${safeName}(...args) {` + `  const fn = ${deref2};` + `  const cljArgs = args.map(jsToClj);` + `  const result = __session.applyFunction(fn, cljArgs);` + `  return cljToJs(result, __session);` + `}`);
    } else {
      exportLines.push(`export const ${safeName} = cljToJs(${deref2}, __session);`);
    }
  }
  const escapedSource = JSON.stringify(source);
  const loadCall = hasStringRequires ? `await __session.loadFileAsync(${escapedSource}, ${JSON.stringify(nsName)});` : `__session.loadFile(${escapedSource}, ${JSON.stringify(nsName)});`;
  if (exportLines.length === 0) {
    return [
      `import { getSession } from ${JSON.stringify(ctx.virtualSessionId)};`,
      depImports,
      ``,
      `const __session = getSession();`,
      loadCall,
      ``,
      `if (import.meta.hot) { import.meta.hot.accept() }`
    ].join(`
`);
  }
  return [
    `import { getSession } from ${JSON.stringify(ctx.virtualSessionId)};`,
    `import { cljToJs, jsToClj } from ${JSON.stringify(ctx.coreIndexPath)};`,
    depImports,
    ``,
    `const __session = getSession();`,
    loadCall,
    `const __ns = __session.getNs(${JSON.stringify(nsName)});`,
    ``,
    ...exportLines,
    ``,
    `// Self-accept HMR: re-execute this module on save (updates browser session)`,
    `// without propagating to parent modules — prevents full page reload.`,
    `if (import.meta.hot) { import.meta.hot.accept() }`
  ].join(`
`);
}
function generateDts(_ctx, nsNameFromPath, source) {
  const nsName = extractNsName(source) ?? nsNameFromPath;
  const vars = readNamespaceVars(source);
  const declarations = [];
  for (const descriptor of vars) {
    if (descriptor.isMacro)
      continue;
    if (descriptor.isPrivate)
      continue;
    const safeName = safeJsIdentifier(descriptor.name);
    if (descriptor.kind === "fn") {
      if (descriptor.arities && descriptor.arities.length > 0) {
        for (const arity of descriptor.arities) {
          declarations.push(`export function ${safeName}${arityToSignature(arity)};`);
        }
      } else {
        declarations.push(`export function ${safeName}(...args: unknown[]): unknown;`);
      }
    } else {
      const tsType = descriptor.tsType ?? "unknown";
      declarations.push(`export const ${safeName}: ${tsType};`);
    }
  }
  return declarations.join(`
`);
}
function patternName(p, index) {
  if (p.kind === "symbol")
    return safeJsIdentifier(p.name);
  return `arg${index}`;
}
function arityToSignature(arity) {
  const fixedParams = arity.params.map((p, i) => `${patternName(p, i)}: unknown`).join(", ");
  if (arity.restParam) {
    const restName = arity.restParam.kind === "symbol" ? safeJsIdentifier(arity.restParam.name) : "rest";
    const params = fixedParams ? `${fixedParams}, ...${restName}: unknown[]` : `...${restName}: unknown[]`;
    return `(${params}): unknown`;
  }
  return `(${fixedParams}): unknown`;
}
var JS_RESERVED_WORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "enum",
  "await"
]);
function safeJsIdentifier(name) {
  const transformed = name.replace(/(?<=[a-zA-Z0-9])-(?=[a-zA-Z0-9])/g, "_").replace(/-/g, "_MINUS_").replace(/\//g, "_DIV_").replace(/\?/g, "_QMARK_").replace(/!/g, "_BANG_").replace(/\*/g, "_STAR_").replace(/\+/g, "_PLUS_").replace(/>/g, "_GT_").replace(/</g, "_LT_").replace(/=/g, "_EQ_").replace(/\./g, "_DOT_").replace(/'/g, "_QUOTE_");
  return JS_RESERVED_WORDS.has(transformed) ? `$${transformed}` : transformed;
}

// src/nrepl/relay.ts
import * as net from "node:net";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

// src/bin/bencode.ts
import * as stream from "stream";
import { Buffer } from "buffer";
var bencode = (value) => {
  if (value === null || value === undefined) {
    value = 0;
  }
  if (typeof value == "boolean") {
    value = value ? 1 : 0;
  }
  if (typeof value == "number") {
    return "i" + value + "e";
  }
  if (typeof value == "string") {
    return Buffer.byteLength(value, "utf8") + ":" + value;
  }
  if (value instanceof Array) {
    return "l" + value.map(bencode).join("") + "e";
  }
  let out = "d";
  for (const prop in value) {
    out += bencode(prop) + bencode(value[prop]);
  }
  return out + "e";
};

class BEncoderStream extends stream.Transform {
  data = [];
  constructor() {
    super({ objectMode: true });
  }
  _transform(object, _encoding, cb) {
    const enc = bencode(object);
    this.push(enc);
    cb();
  }
}

class BIncrementalDecoder {
  state = { id: "ready" };
  stack = [];
  complete(data) {
    if (this.stack.length) {
      this.state = this.stack.pop();
      if (this.state.id == "list") {
        this.state.accum.push(data);
        this.stack.push(this.state);
        this.state = { id: "ready" };
      } else if (this.state.id == "dict") {
        if (this.state.key !== null) {
          this.state.accum[this.state.key] = data;
          this.state.key = null;
        } else {
          this.state.key = data;
        }
        this.stack.push(this.state);
        this.state = { id: "ready" };
      }
    } else {
      this.state = { id: "ready" };
      return data;
    }
  }
  write(byte) {
    const ch = String.fromCharCode(byte);
    if (this.state.id == "ready") {
      switch (ch) {
        case "i":
          this.state = { id: "int", accum: "" };
          break;
        case "d":
          this.stack.push({ id: "dict", accum: {}, key: null });
          break;
        case "l":
          this.stack.push({ id: "list", accum: [] });
          break;
        case "e":
          if (!this.stack.length) {
            throw "unexpected end";
          }
          this.state = this.stack.pop();
          if (this.state.id == "dict") {
            if (this.state.key !== null) {
              throw "Missing value in dict";
            }
            return this.complete(this.state.accum);
          } else if (this.state.id == "list") {
            return this.complete(this.state.accum);
          }
          break;
        default:
          if (ch >= "0" && ch <= "9") {
            this.state = { id: "string-start", accum: ch };
          } else {
            throw "Malformed input in bencode";
          }
      }
    } else if (this.state.id == "int") {
      if (ch == "e") {
        return this.complete(parseInt(this.state.accum));
      } else {
        this.state.accum += ch;
      }
    } else if (this.state.id == "string-start") {
      if (ch == ":") {
        if (!isFinite(+this.state.accum)) {
          throw new Error("Invalid string length: " + this.state.accum);
        }
        if (+this.state.accum == 0) {
          return this.complete("");
        }
        this.state = {
          id: "string-body",
          accum: [],
          length: +this.state.accum
        };
      } else {
        this.state.accum += ch;
      }
    } else if (this.state.id == "string-body") {
      this.state.accum.push(byte);
      if (this.state.accum.length >= this.state.length) {
        return this.complete(Buffer.from(this.state.accum).toString("utf8"));
      }
    } else if (this.state.id == "list") {
      return this.complete(this.state.accum);
    } else if (this.state.id == "dict") {
      return this.complete(this.state.accum);
    } else {
      throw "Junk in bencode";
    }
  }
}

class BDecoderStream extends stream.Transform {
  decoder = new BIncrementalDecoder;
  constructor() {
    super({ objectMode: true });
  }
  _transform(data, _encoding, cb) {
    for (let i = 0;i < data.length; i++) {
      const res = this.decoder.write(data[i]);
      if (res) {
        this.push(res);
      }
    }
    cb();
  }
}

// src/bin/version.ts
var VERSION = "0.0.14";

// src/bin/nrepl-symbol.ts
function resolveSymbol(sym, session, contextNs) {
  const ns = contextNs ?? session.currentNs;
  const slashIdx = sym.indexOf("/");
  if (slashIdx > 0) {
    const qualifier = sym.slice(0, slashIdx);
    const localName2 = sym.slice(slashIdx + 1);
    const nsEnvFull2 = session.registry.get(qualifier);
    if (nsEnvFull2) {
      const value2 = tryLookup(localName2, nsEnvFull2);
      if (value2 !== undefined) {
        const varObj2 = lookupVar(localName2, nsEnvFull2);
        return { value: value2, resolvedNs: qualifier, localName: localName2, varObj: varObj2 };
      }
    }
    const currentNsData = session.getNs(ns);
    const aliasedNs = currentNsData?.aliases.get(qualifier);
    if (aliasedNs) {
      const varObj2 = aliasedNs.vars.get(localName2);
      if (varObj2 !== undefined)
        return { value: varObj2.value, resolvedNs: aliasedNs.name, localName: localName2, varObj: varObj2 };
    }
    return null;
  }
  const localName = sym;
  const nsEnvFull = session.registry.get(ns);
  if (!nsEnvFull)
    return null;
  const value = tryLookup(sym, nsEnvFull);
  if (value === undefined)
    return null;
  const varObj = lookupVar(sym, nsEnvFull);
  let resolvedNs;
  if (varObj) {
    resolvedNs = varObj.ns;
  } else if (value.kind === "function" || value.kind === "macro") {
    resolvedNs = getNamespaceEnv(value.env).ns?.name ?? ns;
  } else if (value.kind === "native-function") {
    const i = value.name.indexOf("/");
    resolvedNs = i > 0 ? value.name.slice(0, i) : ns;
  } else {
    resolvedNs = ns;
  }
  return { value, resolvedNs, localName, varObj };
}
function extractMeta(value, varMeta) {
  const type = value.kind === "macro" ? "macro" : value.kind === "function" || value.kind === "native-function" ? "function" : "var";
  const meta = varMeta ?? (value.kind === "function" ? value.meta : value.kind === "native-function" ? value.meta : undefined);
  let doc = "";
  let arglistsStr = "";
  let eldocArgs = null;
  if (meta) {
    const docEntry = meta.entries.find(([k]) => k.kind === "keyword" && k.name === ":doc");
    if (docEntry && docEntry[1].kind === "string")
      doc = docEntry[1].value;
    const argsEntry = meta.entries.find(([k]) => k.kind === "keyword" && k.name === ":arglists");
    if (argsEntry && argsEntry[1].kind === "vector") {
      const arglists = argsEntry[1];
      arglistsStr = "(" + arglists.value.map((al) => printString(al)).join(" ") + ")";
      eldocArgs = arglists.value.map((al) => {
        if (al.kind !== "vector")
          return [printString(al)];
        return al.value.map((p) => p.kind === "symbol" ? p.name : printString(p));
      });
    }
  }
  if (arglistsStr === "" && (value.kind === "function" || value.kind === "macro")) {
    const arityStrs = value.arities.map((arity) => {
      const params = arity.params.map((p) => printString(p));
      if (arity.restParam)
        params.push("&", printString(arity.restParam));
      return "[" + params.join(" ") + "]";
    });
    arglistsStr = "(" + arityStrs.join(" ") + ")";
    eldocArgs = value.arities.map((arity) => {
      const params = arity.params.map((p) => printString(p));
      if (arity.restParam)
        params.push("&", printString(arity.restParam));
      return params;
    });
  }
  return { doc, arglistsStr, eldocArgs, type };
}

// src/nrepl/relay.ts
function makeId() {
  return crypto.randomUUID();
}
function send(encoder, msg) {
  encoder.write(msg);
}
function done(encoder, id, sessionId, extra = {}) {
  send(encoder, {
    id,
    ...sessionId ? { session: sessionId } : {},
    status: ["done"],
    ...extra
  });
}
async function forwardToB(event, data, ws, pending, timeoutMs = 15000) {
  const correlationId = makeId();
  if (ws.clients.size === 0) {
    return { id: correlationId, error: "No browser tab connected to Vite dev server" };
  }
  return new Promise((resolve2) => {
    const timer = setTimeout(() => {
      if (pending.has(correlationId)) {
        pending.delete(correlationId);
        resolve2({ id: correlationId, error: "Timed out — no response from browser (15s)" });
      }
    }, timeoutMs);
    pending.set(correlationId, (result) => {
      clearTimeout(timer);
      resolve2(result);
    });
    ws.send({ type: "custom", event, data: { ...data, id: correlationId } });
  });
}
function handleClone(msg, sessions, encoder) {
  const id = msg["id"] ?? "";
  const newId = makeId();
  sessions.set(newId, { id: newId, currentNs: "user" });
  done(encoder, id, undefined, { "new-session": newId });
}
function handleDescribe(msg, encoder) {
  const id = msg["id"] ?? "";
  const sessionId = msg["session"];
  done(encoder, id, sessionId, {
    ops: {
      eval: {},
      clone: {},
      close: {},
      complete: {},
      describe: {},
      eldoc: {},
      info: {},
      lookup: {},
      "load-file": {}
    },
    versions: { conjure: { "version-string": VERSION } }
  });
}
function handleComplete(msg, session, encoder, serverSession) {
  const id = msg["id"] ?? "";
  const prefix = msg["prefix"] ?? "";
  const nsName = msg["ns"] ?? session.currentNs;
  const names = serverSession.getCompletions(prefix, nsName);
  const completions = names.map((c) => ({
    candidate: c,
    type: "var",
    ns: session.currentNs
  }));
  done(encoder, id, session.id, { completions });
}
function handleClose(msg, sessions, encoder) {
  const id = msg["id"] ?? "";
  const sessionId = msg["session"] ?? "";
  sessions.delete(sessionId);
  send(encoder, { id, session: sessionId, status: ["done"] });
}
function handleInfo(msg, session, encoder, serverSession) {
  const id = msg["id"] ?? "";
  const sym = msg["sym"];
  const nsOverride = msg["ns"];
  if (!sym) {
    done(encoder, id, session.id, { status: ["no-info", "done"] });
    return;
  }
  const resolved = resolveSymbol(sym, serverSession, nsOverride ?? session.currentNs);
  if (!resolved) {
    done(encoder, id, session.id, { status: ["no-info", "done"] });
    return;
  }
  const meta = extractMeta(resolved.value, resolved.varObj?.meta);
  done(encoder, id, session.id, {
    ns: resolved.resolvedNs,
    name: resolved.localName,
    doc: meta.doc,
    "arglists-str": meta.arglistsStr,
    type: meta.type
  });
}
function handleEldoc(msg, session, encoder, serverSession) {
  const id = msg["id"] ?? "";
  const sym = msg["sym"];
  const nsOverride = msg["ns"];
  if (!sym) {
    done(encoder, id, session.id, { status: ["no-eldoc", "done"] });
    return;
  }
  const resolved = resolveSymbol(sym, serverSession, nsOverride ?? session.currentNs);
  if (!resolved) {
    done(encoder, id, session.id, { status: ["no-eldoc", "done"] });
    return;
  }
  const meta = extractMeta(resolved.value, resolved.varObj?.meta);
  if (!meta.eldocArgs) {
    done(encoder, id, session.id, { status: ["no-eldoc", "done"] });
    return;
  }
  done(encoder, id, session.id, {
    name: resolved.localName,
    ns: resolved.resolvedNs,
    type: meta.type,
    eldoc: meta.eldocArgs
  });
}
function handleUnknown(msg, encoder) {
  const id = msg["id"] ?? "";
  send(encoder, { id, status: ["unknown-op", "done"] });
}
async function handleEval(msg, session, encoder, ws, pending) {
  const id = msg["id"] ?? "";
  const code = msg["code"] ?? "";
  const result = await forwardToB("conjure:eval", { code, ns: session.currentNs }, ws, pending);
  if (result.ns)
    session.currentNs = result.ns;
  if (result.out)
    send(encoder, { id, session: session.id, out: result.out });
  if (result.error) {
    done(encoder, id, session.id, {
      ex: result.error,
      err: result.error + `
`,
      ns: session.currentNs,
      status: ["eval-error", "done"]
    });
  } else {
    done(encoder, id, session.id, { value: result.value ?? "nil", ns: session.currentNs });
  }
}
async function handleLoadFile(msg, session, encoder, ws, pending) {
  const id = msg["id"] ?? "";
  const source = msg["file"] ?? "";
  const fileName = msg["file-name"] ?? "";
  const filePath = msg["file-path"] ?? "";
  const nsHint = fileName.replace(/\.clj$/, "").replace(/\//g, ".") || undefined;
  const result = await forwardToB("conjure:load-file", { source, nsHint, filePath }, ws, pending);
  if (result.ns)
    session.currentNs = result.ns;
  if (result.out)
    send(encoder, { id, session: session.id, out: result.out });
  if (result.error) {
    done(encoder, id, session.id, {
      ex: result.error,
      err: result.error + `
`,
      ns: session.currentNs,
      status: ["eval-error", "done"]
    });
  } else {
    done(encoder, id, session.id, { value: result.value ?? "nil", ns: session.currentNs });
  }
}
async function handleMessage(msg, sessions, defaultSession, encoder, ws, pending, serverSession) {
  const op = msg["op"];
  const sessionId = msg["session"];
  const session = sessionId ? sessions.get(sessionId) ?? defaultSession : defaultSession;
  switch (op) {
    case "clone":
      handleClone(msg, sessions, encoder);
      break;
    case "describe":
      handleDescribe(msg, encoder);
      break;
    case "eval":
      await handleEval(msg, session, encoder, ws, pending);
      break;
    case "load-file":
      await handleLoadFile(msg, session, encoder, ws, pending);
      break;
    case "complete":
      handleComplete(msg, session, encoder, serverSession);
      break;
    case "close":
      handleClose(msg, sessions, encoder);
      break;
    case "info":
    case "lookup":
      handleInfo(msg, session, encoder, serverSession);
      break;
    case "eldoc":
      handleEldoc(msg, session, encoder, serverSession);
      break;
    default:
      handleUnknown(msg, encoder);
  }
}
function startBrowserNreplRelay(options) {
  const port = options.port ?? 7888;
  const host = options.host ?? "127.0.0.1";
  const { ws, serverSession, cwd } = options;
  const pending = new Map;
  ws.on("conjure:eval-result", (data) => {
    const resolve2 = pending.get(data.id);
    if (resolve2) {
      pending.delete(data.id);
      resolve2(data);
    }
  });
  ws.on("conjure:load-file-result", (data) => {
    const resolve2 = pending.get(data.id);
    if (resolve2) {
      pending.delete(data.id);
      resolve2(data);
    }
  });
  const server = net.createServer((socket) => {
    const encoder = new BEncoderStream;
    const decoder = new BDecoderStream;
    encoder.pipe(socket);
    socket.pipe(decoder);
    const sessions = new Map;
    const defaultId = makeId();
    const defaultSession = { id: defaultId, currentNs: "user" };
    sessions.set(defaultId, defaultSession);
    decoder.on("data", (msg) => {
      handleMessage(msg, sessions, defaultSession, encoder, ws, pending, serverSession).catch((err) => {
        console.error("[conjure] relay error:", err);
      });
    });
    socket.on("error", () => {});
    socket.on("close", () => {
      sessions.clear();
    });
  });
  const portFile = join(cwd, ".nrepl-port");
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`[conjure] Port ${port} already in use — browser nREPL relay not started. ` + `Kill the process holding the port or set a different nreplPort.`);
    } else {
      console.error("[conjure] nREPL relay error:", err.message);
    }
  });
  server.listen(port, host, () => {
    writeFileSync(portFile, String(port), "utf8");
    console.log(`[conjure] Browser nREPL relay started on port ${port}`);
  });
  const cleanup = () => {
    if (existsSync(portFile))
      unlinkSync(portFile);
  };
  server.on("close", cleanup);
  return server;
}

// src/vite-plugin-cljam/index.ts
function resolveCoreIndexPath() {
  const thisDir = dirname2(fileURLToPath(import.meta.url));
  const fromSource = resolve2(thisDir, "../core/index.ts");
  try {
    statSync(fromSource);
    return fromSource;
  } catch {
    return resolve2(thisDir, "../src/core/index.ts");
  }
}
var VIRTUAL_SESSION_ID = "virtual:clj-session";
var RESOLVED_VIRTUAL_SESSION_ID = "\x00" + VIRTUAL_SESSION_ID;
function cljPlugin(options) {
  const sourceRoots = options?.sourceRoots ?? ["src"];
  let projectRoot = "";
  let serverSession;
  let coreIndexPath;
  let codegenCtx;
  let generatorScriptPath;
  let serveMode = false;
  let stringRequires = [];
  let entrypointPath = null;
  function writeFileIfChanged(path, content) {
    try {
      const existing = readFileSync(path, "utf-8");
      if (existing === content) {
        return;
      }
    } catch {}
    writeFileSync2(path, content, "utf-8");
  }
  function collectCljFiles(dir) {
    let results = [];
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return results;
    }
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules")
        continue;
      const fullPath = join2(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(collectCljFiles(fullPath));
        } else if (entry.endsWith(".clj")) {
          results.push(fullPath);
        }
      } catch {
        continue;
      }
    }
    return results;
  }
  function eagerlyGenerateDts() {
    for (const root of sourceRoots) {
      const rootPath = resolve2(projectRoot, root);
      for (const filePath of collectCljFiles(rootPath)) {
        try {
          const source = readFileSync(filePath, "utf-8");
          const nsNameFromPath = pathToNs(relative(projectRoot, filePath), sourceRoots);
          const dts = generateDts(codegenCtx, nsNameFromPath, source);
          if (dts)
            writeFileIfChanged(filePath + ".d.ts", dts);
        } catch {
          continue;
        }
      }
    }
  }
  function initServerSession() {
    const projectRequire = createRequire(resolve2(projectRoot, "package.json"));
    serverSession = createSession({
      sourceRoots,
      readFile: (filePath) => readFileSync(resolve2(projectRoot, filePath), "utf-8"),
      output: () => {},
      importModule: async (s) => {
        if (!s.startsWith(".") && !s.startsWith("/")) {
          try {
            const resolved = projectRequire.resolve(s);
            return import(pathToFileURL(resolved).href);
          } catch {
            try {
              return await import(s);
            } catch {
              return {};
            }
          }
        }
        try {
          return await import(s);
        } catch {
          return {};
        }
      }
    });
    codegenCtx = {
      sourceRoots,
      coreIndexPath,
      virtualSessionId: VIRTUAL_SESSION_ID,
      resolveDepPath: (depNs) => {
        for (const root of sourceRoots) {
          const depPath = resolve2(projectRoot, nsToPath(depNs, root));
          try {
            readFileSync(depPath);
            return depPath;
          } catch {
            continue;
          }
        }
        return null;
      }
    };
  }
  function scanStringRequires() {
    const seen = new Map;
    for (const root of sourceRoots) {
      const rootPath = resolve2(projectRoot, root);
      for (const filePath of collectCljFiles(rootPath)) {
        try {
          const source = readFileSync(filePath, "utf-8");
          const originals = extractStringRequires(source);
          const resolved = extractStringRequires(source, filePath);
          for (let i = 0;i < originals.length; i++) {
            seen.set(originals[i], resolved[i]);
          }
        } catch {
          continue;
        }
      }
    }
    stringRequires = [...seen.entries()].map(([original, resolved]) => ({
      original,
      resolved
    }));
  }
  function regenerateBuiltInNamespaceSources() {
    try {
      statSync(generatorScriptPath);
    } catch {
      return;
    }
    try {
      execFileSync(process.execPath, [generatorScriptPath], {
        cwd: projectRoot,
        stdio: "pipe"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate built-in namespace sources: ${message}`);
    }
  }
  function buildImportTable() {
    const importLines = [];
    const mapEntries = [];
    stringRequires.forEach(({ original, resolved }, i) => {
      const varName = `_imp_${i}`;
      importLines.push(`import * as ${varName} from ${JSON.stringify(resolved)};`);
      mapEntries.push(`  ${JSON.stringify(original)}: ${varName},`);
    });
    return { importLines, mapEntries };
  }
  return {
    name: "vite-plugin-cljam",
    configResolved(config) {
      projectRoot = config.root;
      serveMode = config.command === "serve";
      generatorScriptPath = resolve2(projectRoot, "scripts/gen-core-source.mjs");
      regenerateBuiltInNamespaceSources();
      coreIndexPath = resolveCoreIndexPath();
      initServerSession();
      if (options?.entrypoint) {
        const ep = resolve2(projectRoot, options.entrypoint);
        try {
          statSync(ep);
          entrypointPath = ep;
        } catch {
          console.warn(`[vite-plugin-cljam] entrypoint not found: ${options.entrypoint} — falling back to auto-generated session`);
        }
      }
      scanStringRequires();
      eagerlyGenerateDts();
    },
    configureServer(server) {
      startBrowserNreplRelay({
        port: options?.nreplPort,
        cwd: projectRoot,
        ws: server.ws,
        serverSession
      });
    },
    resolveId(source) {
      if (source === VIRTUAL_SESSION_ID) {
        return RESOLVED_VIRTUAL_SESSION_ID;
      }
      if (source.endsWith(".clj") && !source.includes("?")) {
        return null;
      }
      return;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_SESSION_ID) {
        const { importLines, mapEntries } = buildImportTable();
        const lines = [
          `import { createSession, printString } from ${JSON.stringify(coreIndexPath)};`,
          ...importLines,
          ...entrypointPath ? [`import __conjureFactory from ${JSON.stringify(entrypointPath)};`] : [],
          ``,
          `const __importMap = {`,
          ...mapEntries,
          `};`,
          ``,
          `let _session = null;`,
          `let _outputLines = [];`
        ];
        if (entrypointPath) {
          lines.push(`export function getSession() {`, `  if (!_session) {`, `    const __userOpts = __conjureFactory(__importMap) ?? {};`, `    _session = createSession({`, `      ...(__userOpts),`, `      importModule: (s) => __importMap[s],`, `      output: (text) => { _outputLines.push(text); console.log(text.replace(/\\n$/, '')); },`, `    });`, `  }`, `  return _session;`, `}`);
        } else {
          lines.push(`export function getSession() {`, `  if (!_session) {`, `    _session = createSession({`, `      importModule: (s) => __importMap[s],`, `      output: (text) => { _outputLines.push(text); console.log(text.replace(/\\n$/, '')); },`, `    });`, `  }`, `  return _session;`, `}`);
        }
        if (serveMode) {
          lines.push(``, `// Browser nREPL relay — active only in Vite dev server`, `if (import.meta.hot) {`, `  import.meta.hot.on('conjure:eval', async ({ id, code, ns }) => {`, `    const session = getSession();`, `    _outputLines = [];`, `    try {`, `      if (ns && ns !== session.currentNs) session.setNs(ns);`, `      const result = await session.evaluateAsync(code);`, `      const out = _outputLines.join('');`, `      import.meta.hot.send('conjure:eval-result', { id, value: printString(result), ns: session.currentNs, ...(out ? { out } : {}) });`, `    } catch (err) {`, `      console.error(err);`, `      const out = _outputLines.join('');`, `      import.meta.hot.send('conjure:eval-result', { id, error: err instanceof Error ? err.message : String(err), ns: session.currentNs, ...(out ? { out } : {}) });`, `    }`, `  });`, ``, `  import.meta.hot.on('conjure:load-file', async ({ id, source, nsHint, filePath }) => {`, `    const session = getSession();`, `    _outputLines = [];`, `    try {`, `      const loadedNs = await session.loadFileAsync(source, nsHint, filePath || undefined);`, `      if (loadedNs) session.setNs(loadedNs);`, `      const out = _outputLines.join('');`, `      import.meta.hot.send('conjure:load-file-result', { id, value: 'nil', ns: session.currentNs, ...(out ? { out } : {}) });`, `    } catch (err) {`, `      console.error(err);`, `      const out = _outputLines.join('');`, `      import.meta.hot.send('conjure:load-file-result', { id, error: err instanceof Error ? err.message : String(err), ns: session.currentNs, ...(out ? { out } : {}) });`, `    }`, `  });`, `}`);
        }
        return lines.join(`
`);
      }
      if (id.endsWith(".clj") && !id.includes("?")) {
        const source = readFileSync(id, "utf-8");
        const nsNameFromPath = pathToNs(relative(projectRoot, id), sourceRoots);
        const code = generateModuleCode(codegenCtx, nsNameFromPath, source, id);
        const dts = generateDts(codegenCtx, nsNameFromPath, source);
        if (dts)
          writeFileIfChanged(id + ".d.ts", dts);
        return code;
      }
    },
    hotUpdate({ file, modules, read }) {
      if (!file.endsWith(".clj"))
        return;
      const doUpdate = async () => {
        if (file.startsWith(resolve2(projectRoot, "src/clojure") + "/")) {
          regenerateBuiltInNamespaceSources();
        }
        const source = await read();
        try {
          const nsNameFromPath = pathToNs(relative(projectRoot, file), sourceRoots);
          await serverSession.loadFileAsync(source, nsNameFromPath);
          const dts = generateDts(codegenCtx, nsNameFromPath, source);
          writeFileIfChanged(file + ".d.ts", dts);
        } catch {}
        return modules;
      };
      return doUpdate();
    }
  };
}
export {
  safeJsIdentifier,
  generateModuleCode,
  generateDts,
  cljPlugin
};
