(ns clojure.core)

(defmacro defn [name & fdecl]
  (let [doc       (if (string? (first fdecl)) (first fdecl) nil)
        rest-decl (if doc (rest fdecl) fdecl)
        arglists  (if (vector? (first rest-decl))
                    (vector (first rest-decl))
                    (reduce (fn [acc arity] (conj acc (first arity))) [] rest-decl))]
    (if doc
      `(def ~name (with-meta (fn ~@rest-decl) {:doc ~doc :arglists '~arglists}))
      `(def ~name (with-meta (fn ~@rest-decl) {:arglists '~arglists})))))

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


(defmacro when [condition & body]
  `(if ~condition (do ~@body) nil))

(defmacro when-not [condition & body]
  `(if ~condition nil (do ~@body)))

(defmacro and [& forms]
  (if (nil? forms)
    true
    (if (nil? (seq (rest forms)))
      (first forms)
      `(let [v# ~(first forms)]
         (if v# (and ~@(rest forms)) v#)))))

(defmacro or [& forms]
  (if (nil? forms)
    nil
    (if (nil? (seq (rest forms)))
      (first forms)
      `(let [v# ~(first forms)]
         (if v# v# (or ~@(rest forms)))))))

(defmacro cond [& clauses]
  (if (nil? clauses)
    nil
    `(if ~(first clauses)
       ~(first (next clauses))
       (cond ~@(rest (rest clauses))))))

(defmacro -> [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     `(~(first form) ~x ~@(rest form))
                     `(~form ~x))]
      `(-> ~threaded ~@more))))

(defmacro ->> [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     `(~(first form) ~@(rest form) ~x)
                     `(~form ~x))]
      `(->> ~threaded ~@more))))

(defmacro comment
  ; Ignores body, yields nil
  [& body])

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

;; sequence: materialise a transducer over a collection into a vector
(defn sequence
  "Coerces coll to a (possibly empty) sequence, if it is not already
  one. Will not force a seq. (sequence nil) yields (), When a
  transducer is supplied, returns a lazy sequence of applications of
  the transform to the items in coll"
  ([coll] (into [] coll))
  ([xf coll] (into [] xf coll)))

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
   (sequence (map f) coll))
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
   (sequence (filter pred) coll)))

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
   (sequence (take n) coll)))

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
   (sequence (take-while pred) coll)))

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
   (sequence (drop n) coll)))

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
   (sequence (drop-while pred) coll)))

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
   (sequence (map-indexed f) coll)))

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
  `(let [v#        ~sym
         m#        (meta v#)
         d#        (:doc m#)
         args#     (:arglists m#)
         args-str# (when args#
                     (reduce
                      (fn [acc# a#]
                        (if (= acc# "")
                          (str "(" a# ")")
                          (str acc# "\n" "(" a# ")")))
                      ""
                      args#))]
     (println (str (if args-str# (str args-str# "\n\n") "")
                   (or d# "No documentation available.")))))
