// Auto-generated from src/clojure/core.clj — do not edit directly.
// Re-generate with: npm run gen:core-source
export const clojure_coreSource = `\
(ns clojure.core)

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
    \`(def ~(with-meta name meta-map) (fn ~name ~@rest-decl))))

(defmacro defn-
  "Same as defn, but marks the var as private."
  [name & fdecl]
  (list* 'defn (with-meta name (assoc (meta name) :private true)) fdecl))

;; defmulti / defmethod: multimethod sugar over native make-multimethod! / add-method!
;; defmulti uses a re-eval guard in make-multimethod! — re-loading a namespace
;; preserves all registered methods.
(defmacro defmulti [name dispatch-fn & opts]
  \`(make-multimethod! ~(str name) ~dispatch-fn ~@opts))

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
  "Returns the items in coll in sorted order. With no comparator, uses
  compare (works on numbers, strings, keywords, chars). Comparator may
  return boolean or number."
  ([coll] (sort compare coll))
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
  determined by comparing (keyfn item). Default comparator is compare."
  ([keyfn coll] (sort-by keyfn compare coll))
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

(defn pprint-str
  "Returns the pretty-printed string representation of x, optionally
  limiting line width to max-width (default 80)."
  ([x] (with-out-str (pprint x)))
  ([x max-width] (with-out-str (pprint x max-width))))

;; ---------------------------------------------------------------------------
;; Protocols and Records
;; ---------------------------------------------------------------------------

(defn- resolve-type-tag
  "Returns the type-tag string for a keyword type specifier.
  Simple keywords map directly to kind strings: :string → \\"string\\".
  Namespaced keywords map to record type tags: :user/Circle → \\"user/Circle\\".
  nil literal is accepted for backward compatibility → \\"nil\\"."
  [type-kw]
  (cond
    (nil? type-kw)     "nil"
    (keyword? type-kw) (if (namespace type-kw)
                         (str (namespace type-kw) "/" (name type-kw))
                         (name type-kw))
    :else (throw (ex-info (str "extend-protocol/extend-type: expected a keyword type tag or nil, got: " type-kw) {}))))

(defn- parse-method-def
  "Parses a single protocol method form (name [& params] doc?) into a
  [name-str arglists doc-str?] triple for make-protocol!."
  [form]
  (let [method-name (first form)
        args        (second form)
        doc         (when (string? (nth form 2 nil)) (nth form 2 nil))]
    [(str method-name) [(mapv str args)] doc]))

(defmacro defprotocol
  "Defines a named protocol. Creates a protocol var and one dispatch
  function var per method in the current namespace.

  (defprotocol IShape
    \\"doc\\"
    (area [this] \\"Compute area.\\")
    (perimeter [this] \\"Compute perimeter.\\"))"
  [name & specs]
  (let [doc        (when (string? (first specs)) (first specs))
        methods    (if doc (rest specs) specs)
        method-defs (mapv parse-method-def methods)]
    \`(make-protocol! ~(str name) ~doc ~method-defs)))

(defn- parse-impl-block
  "Given a flat sequence of (method-name [args] body...) forms, returns a
  code form (hash-map ...) that evaluates to method-name-string → fn."
  [method-forms]
  (let [pairs (mapcat (fn [form]
                        (let [method-name (first form)
                              params      (second form)
                              body        (rest (rest form))]
                          [(str method-name) \`(fn ~params ~@body)]))
                      method-forms)]
    \`(hash-map ~@pairs)))

(defn- group-by-type
  "Partitions a flat impl body into [[delimiter [method ...]] ...].
  Used by extend-protocol (keyword type tags: :string, :user/Circle),
  extend-type (protocol symbols: IShape, IValidator), and
  defrecord (protocol symbols inline).
  Keywords, symbols, and the nil literal are all recognised as block delimiters."
  [specs]
  (let [no-type :__no-type__]
    (loop [remaining specs
           current-type no-type
           current-methods []
           result []]
      (if (empty? remaining)
        (if (not= current-type no-type)
          (conj result [current-type current-methods])
          result)
        (let [form (first remaining)]
          (if (or (keyword? form) (symbol? form) (nil? form))
            ;; New block (keyword type tag, protocol symbol, or nil)
            (recur (rest remaining)
                   form
                   []
                   (if (not= current-type no-type)
                     (conj result [current-type current-methods])
                     result))
            ;; Method form — add to current block
            (recur (rest remaining)
                   current-type
                   (conj current-methods form)
                   result)))))))

(defmacro extend-protocol
  "Extends a protocol to one or more types.

  (extend-protocol IShape
    nil
    (area [_] 0)
    String
    (area [s] (count s)))"
  [proto-sym & specs]
  (let [groups (group-by-type specs)]
    \`(do
       ~@(map (fn [[type-sym method-forms]]
                (let [type-tag  (resolve-type-tag type-sym)
                      impl-map  (parse-impl-block method-forms)]
                  \`(extend-protocol! ~proto-sym ~type-tag ~impl-map)))
              groups))))

(defmacro extend-type
  "Extends a type to implement one or more protocols.

  (extend-type Circle
    IShape
    (area [this] ...)
    ISerializable
    (to-json [this] ...))"
  [type-sym & specs]
  (let [type-tag (resolve-type-tag type-sym)
        groups   (group-by-type specs)]
    \`(do
       ~@(map (fn [[proto-sym method-forms]]
                (let [impl-map (parse-impl-block method-forms)]
                  \`(extend-protocol! ~proto-sym ~type-tag ~impl-map)))
              groups))))

(defn- bind-fields
  "Wraps a method body in a let that binds each field name to (:field this).
  (bind-fields '[radius] 'this '[(* radius radius)])
   => (let [radius (:radius this)] (* radius radius))"
  [fields this-sym body]
  (let [bindings (vec (mapcat (fn [f] [f \`(~(keyword (name f)) ~this-sym)]) fields))]
    \`(let ~bindings ~@body)))

(defmacro defrecord
  "Defines a record type: a named, typed persistent map.
  Creates ->Name (positional) and map->Name (map-based) constructors.
  Optionally implements protocols inline.

  (defrecord Circle [radius]
    IShape
    (area [this] (* js/Math.PI radius radius)))"
  [type-name fields & specs]
  (let [ns-str           (str (ns-name *ns*))
        type-str         (str type-name)
        constructor      (symbol (str "->" type-name))
        map-constructor  (symbol (str "map->" type-name))
        field-keys       (mapv (fn [f] (keyword (name f))) fields)
        field-map-pairs  (vec (mapcat (fn [f] [(keyword (name f)) f]) fields))
        groups           (when (seq specs) (group-by-type specs))
        type-tag         (str ns-str "/" type-str)
        extend-calls     (map (fn [[proto-sym method-forms]]
                                (let [impl-map
                                      (let [pairs (mapcat (fn [form]
                                                            (let [mname  (first form)
                                                                  params (second form)
                                                                  this   (first params)
                                                                  rest-p (vec (rest params))
                                                                  body   (rest (rest form))
                                                                  bound  (bind-fields fields this body)]
                                                              [(str mname)
                                                               \`(fn ~(vec (cons this rest-p)) ~bound)]))
                                                          method-forms)]
                                        \`(hash-map ~@pairs))]
                                  \`(extend-protocol! ~proto-sym ~type-tag ~impl-map)))
                              groups)]
    \`(do
       (defn ~constructor ~fields
         (make-record! ~type-str ~ns-str (hash-map ~@field-map-pairs)))
       (defn ~map-constructor [m#]
         (make-record! ~type-str ~ns-str (select-keys m# ~field-keys)))
       ~@extend-calls)))

; reify — deferred to Phase B

;; ---------------------------------------------------------------------------
;; describe — introspection for any value
;; ---------------------------------------------------------------------------

;; ─── Keyword Hierarchy ───────────────────────────────────────────────────────

(defn make-hierarchy
  "Returns a new, empty hierarchy."
  []
  {:parents {} :ancestors {} :descendants {}})

(def ^:dynamic *hierarchy*
  (make-hierarchy))

(defn parents
  "Returns the immediate parents of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no parents."
  ([tag]   (hierarchy-parents-global tag))
  ([h tag] (get (:parents h) tag)))

(defn ancestors
  "Returns the set of all ancestors of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no ancestors."
  ([tag]   (hierarchy-ancestors-global tag))
  ([h tag] (get (:ancestors h) tag)))

(defn descendants
  "Returns the set of all descendants of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no descendants."
  ([tag]   (hierarchy-descendants-global tag))
  ([h tag] (get (:descendants h) tag)))

(defn isa?
  "Returns true if child is either identical to parent, or child derives from
  parent in the given hierarchy (default: *hierarchy*)."
  ([child parent]   (hierarchy-isa?-global child parent))
  ([h child parent] (hierarchy-isa?* h child parent)))

(defn derive
  "Establishes a parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects."
  ([child parent]
   (hierarchy-derive-global! child parent))
  ([h child parent]
   (hierarchy-derive* h child parent)))

(defn underive
  "Removes the parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects."
  ([child parent]
   (hierarchy-underive-global! child parent))
  ([h child parent]
   (hierarchy-underive* h child parent)))

;; Maximum number of vars shown in (describe namespace).
;; Bind to nil for unlimited output: (binding [*describe-limit* nil] (describe ...))
(def ^:dynamic *describe-limit* 50)

(defn describe
  "Returns a plain map describing any cljam value.

  Works on protocols, records, functions, namespaces, multimethods,
  vars, and all primitive types. Output is always a plain Clojure map —
  composable with get, get-in, filter, and any other map operation.

  For namespaces, the number of vars shown is capped by *describe-limit*
  (default 50). Bind *describe-limit* to nil for unlimited output.

  Examples:
    (describe (->Circle 5))        ;; record
    (describe IShape)              ;; protocol
    (describe area)                ;; protocol dispatch fn
    (describe println)             ;; native fn
    (describe (find-ns 'user))     ;; namespace
    (describe #'my-fn)             ;; var"
  ([x] (describe* x *describe-limit*))
  ([x limit] (describe* x limit)))
`
