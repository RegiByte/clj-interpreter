;; Collection operation tests written in Clojure.
;; Covers maps, vectors, sets, and lists — construction, access, update.

(ns clojure-suite.collections-test
  (:require [clojure.test :refer [deftest is testing are thrown?]]))

;;; ── Maps ─────────────────────────────────────────────────────────────────────

(deftest map-construction
  (is (= {} (hash-map)))
  (is (= {:a 1} (hash-map :a 1)))
  (is (= {:a 1 :b 2} (hash-map :a 1 :b 2)))
  (is (= {:a 1 :b 2} {:b 2 :a 1})))

(deftest map-access
  (is (= 1 (get {:a 1} :a)))
  (is (nil? (get {:a 1} :missing)))
  (is (= :default (get {:a 1} :missing :default)))
  (is (= 1 (:a {:a 1})))
  (is (nil? (:missing {:a 1})))
  (is (= :default (:missing {:a 1} :default)))
  (is (= 1 ({:a 1} :a)))
  (is (nil? ({:a 1} :missing)))
  (is (= 99 ({:a 1} :missing 99)))
  (is (= 1 ({:a 1} :a 99)))
  (is (= 1 ({"x" 1 "y" 2} "x")))
  (is (= :one ({1 :one 2 :two} 1)))
  (is (= [1 3] (map {:a 1 :b 2 :c 3} [:a :c])))
  (is (= [1 nil nil] (map {:a 1} [:a :b :c])))
  (is (thrown? :default ({:a 1}))))

(deftest map-get-in
  (is (= 42 (get-in {:a {:b 42}} [:a :b])))
  (is (nil? (get-in {:a {:b 42}} [:a :c])))
  (is (= :nope (get-in {:a {}} [:a :b] :nope)))
  (is (= 1 (get-in {:a [0 1 2]} [:a 1]))))

(deftest map-assoc
  (is (= {:a 1 :b 2} (assoc {:a 1} :b 2)))
  (is (= {:a 99} (assoc {:a 1} :a 99)))
  (is (= {:a 1 :b 2 :c 3} (assoc {} :a 1 :b 2 :c 3))))

(deftest map-assoc-in
  (is (= {:a {:b 99}} (assoc-in {} [:a :b] 99)))
  (is (= {:a {:b 99 :c 1}} (assoc-in {:a {:b 1 :c 1}} [:a :b] 99))))

(deftest map-dissoc
  (is (= {:b 2} (dissoc {:a 1 :b 2} :a)))
  (is (= {} (dissoc {:a 1} :a)))
  (is (= {:a 1} (dissoc {:a 1} :missing)))
  (is (= {:c 3} (dissoc {:a 1 :b 2 :c 3} :a :b))))

(deftest map-update
  (is (= {:a 2} (update {:a 1} :a inc)))
  (is (= {:a 11} (update {:a 1} :a + 10)))
  (is (= {:a 1 :b 0} (update {:a 1} :b (fnil inc -1)))))

(deftest map-update-in
  (is (= {:a {:b 2}} (update-in {:a {:b 1}} [:a :b] inc)))
  (is (= {:a {:b [1 2 3]}} (update-in {:a {:b [1 2]}} [:a :b] conj 3))))

(deftest map-merge
  (is (= {:a 1 :b 2} (merge {:a 1} {:b 2})))
  (is (= {:a 2} (merge {:a 1} {:a 2})))
  (is (= {:a 1} (merge {} {:a 1})))
  (is (= {:a 1} (merge {:a 1} {})))
  (is (nil? (merge)))
  (is (= {:a 3} (merge {:a 1} {:a 2} {:a 3}))))

(deftest map-keys-vals
  (let [m {:a 1 :b 2 :c 3}]
    (is (= #{:a :b :c} (set (keys m))))
    (is (= #{1 2 3} (set (vals m))))))

(deftest map-select-keys
  (is (= {:a 1 :c 3} (select-keys {:a 1 :b 2 :c 3} [:a :c])))
  (is (= {} (select-keys {:a 1} [:missing])))
  (is (= {:a 1} (select-keys {:a 1 :b 2} [:a]))))

(deftest map-contains?
  (is (contains? {:a 1} :a))
  (is (not (contains? {:a 1} :b)))
  (is (contains? {:a nil} :a)))

(deftest map-find-key-val
  (testing "find returns a map-entry-like vector when present"
    (let [entry (find {:a 1 :b 2} :a)]
      (is (= [:a 1] entry))
      (is (vector? entry))
      (is (sequential? entry))
      (is (= :a (first entry)))
      (is (= 1 (second entry)))
      (is (= :a (nth entry 0)))
      (is (= 1 (nth entry 1)))
      (is (= :a (key entry)))
      (is (= 1 (val entry)))))
  (testing "find returns nil when key is absent"
    (is (nil? (find {:a 1} :missing))))
  (testing "nil is accepted as an empty map"
    (is (nil? (find nil :a))))
  (testing "key and val reject ordinary vectors"
    (is (thrown? :default (key [:a 1])))
    (is (thrown? :default (val [:a 1])))))

(deftest map-entry-type-distinction
  (is (= :map-entry (type (first {:a 1}))))
  (is (= :vector (type [:a 1])))
  (is (= [:a 1] (first {:a 1}))))

(deftest map-conj
  ;; In cljam, conj on a map accepts vector [k v] pairs.
  ;; conj-ing another map (map merge) is not yet supported.
  (is (= {:a 1 :b 2} (conj {:a 1} [:b 2])))
  (is (= {:a 2} (conj {:a 1} [:a 2]))))

(deftest map-predicates
  (is (map? {}))
  (is (map? {:a 1}))
  (is (not (map? [])))
  (is (not (map? nil)))
  (is (not (map? #{:a}))))

;;; ── Vectors ──────────────────────────────────────────────────────────────────

(deftest vector-construction
  (is (= [] (vector)))
  (is (= [1 2 3] (vector 1 2 3)))
  (is (= [1 2 3] (vec '(1 2 3))))
  (is (= [1 2 3] (vec (range 1 4)))))

(deftest vector-access
  (is (= 1 (get [1 2 3] 0)))
  (is (= 3 (get [1 2 3] 2)))
  (is (nil? (get [1 2 3] 5)))
  (is (= :nope (get [1 2 3] 5 :nope)))
  (is (= 1 (nth [1 2 3] 0)))
  (is (= 2 ([1 2 3] 1)))
  (is (= 30 ([10 20 30] 2)))
  (is (= [10 30] (map [10 20 30] [0 2])))
  (is (= 20 ((comp [10 20 30]) 1)))
  (is (not (fn? [10 20 30])))
  (is (thrown? :default ([10 20 30])))
  (is (thrown? :default ([10 20 30] 3 0)))
  (is (thrown? :default ([10 20 30] :x)))
  (is (thrown? :default ([10 20 30] 3))))

(deftest vector-conj
  (is (= [1 2 3 4] (conj [1 2 3] 4)))
  (is (= [1] (conj [] 1)))
  (is (= [1 2 3] (conj [1 2] 3))))

(deftest vector-assoc
  (is (= [99 2 3] (assoc [1 2 3] 0 99)))
  (is (= [1 99 3] (assoc [1 2 3] 1 99))))

(deftest vector-subvec
  (is (= [2 3] (subvec [1 2 3 4] 1 3)))
  (is (= [3 4] (subvec [1 2 3 4] 2))))

(deftest empty-and-not-empty
  (is (= [] (empty [1 2 3])))
  (is (= '() (empty '(1 2 3))))
  (is (= {} (empty {:a 1})))
  (is (= #{} (empty #{1 2})))
  (is (nil? (not-empty [])))
  (is (= [1] (not-empty [1])))
  (is (nil? (not-empty {})))
  (is (= {:a 1} (not-empty {:a 1}))))

(deftest map-merge-with-and-update-keys-values
  (is (= {:a 1 :b 5 :c 4} (merge-with + {:a 1 :b 2} {:b 3 :c 4})))
  (is (= {:x/a 1 :x/b 2} (update-keys {:a 1 :b 2} #(keyword "x" (name %)))))
  (is (= {:a 2 :b 3} (update-vals {:a 1 :b 2} inc))))

(deftest reduce-kv-semantics
  (is (= 6 (reduce-kv (fn [acc _ v] (+ acc v)) 0 {:a 1 :b 2 :c 3})))
  (is (= [[0 :a] [1 :b]] (reduce-kv (fn [acc k v] (conj acc [k v])) [] [:a :b]))))

(deftest vector-peek-pop
  (is (= 3 (peek [1 2 3])))
  (is (= [1 2] (pop [1 2 3])))
  (is (nil? (peek []))))

(deftest vector-predicates
  (is (vector? []))
  (is (vector? [1 2 3]))
  (is (not (vector? '(1 2 3))))
  (is (not (vector? nil))))

;;; ── Sets ─────────────────────────────────────────────────────────────────────

(deftest set-construction
  (is (= #{} (hash-set)))
  (is (= #{1 2 3} (hash-set 1 2 3)))
  (is (= #{1 2 3} (set [1 2 3 2 1])))
  (is (= #{1 2 3} (set '(3 2 1)))))

(deftest set-contains
  (is (contains? #{:a :b} :a))
  (is (not (contains? #{:a :b} :c)))
  (is (= :a (#{:a :b :c} :a)))
  (is (nil? (#{:a :b :c} :missing))))

(deftest set-conj-disj
  (is (= #{1 2 3} (conj #{1 2} 3)))
  (is (= #{1 2} (disj #{1 2 3} 3)))
  (is (= #{1 2} (disj #{1 2 3} 3 4))))

(deftest set-predicates
  (is (set? #{}))
  (is (set? #{1 2}))
  (is (not (set? [])))
  (is (not (set? nil))))

;;; ── Lists ────────────────────────────────────────────────────────────────────

(deftest list-construction
  (is (= '() (list)))
  (is (= '(1 2 3) (list 1 2 3))))

(deftest list-conj-prepends
  ;; conj on a list prepends, unlike vectors
  (is (= '(3 1 2) (conj '(1 2) 3)))
  (is (= '(1) (conj '() 1))))

(deftest list-peek-pop
  (is (= 1 (peek '(1 2 3))))
  (is (= '(2 3) (pop '(1 2 3)))))

(deftest list-predicates
  (is (list? '()))
  (is (list? '(1 2 3)))
  (is (not (list? [])))
  (is (not (list? nil))))

;;; ── Cross-collection ─────────────────────────────────────────────────────────

(deftest count-works-on-all
  (is (= 0 (count [])))
  (is (= 3 (count [1 2 3])))
  (is (= 0 (count '())))
  (is (= 3 (count '(1 2 3))))
  (is (= 0 (count {})))
  (is (= 2 (count {:a 1 :b 2})))
  (is (= 0 (count #{})))
  (is (= 3 (count #{1 2 3})))
  (is (= 5 (count "hello"))))

(deftest empty?-on-all
  (is (empty? []))
  (is (empty? '()))
  (is (empty? {}))
  (is (empty? #{}))
  (is (empty? ""))
  (is (not (empty? [1])))
  (is (not (empty? {:a 1}))))

(deftest into-transfers-elements
  (is (= [1 2 3] (into [] '(1 2 3))))
  (is (= #{1 2 3} (into #{} [1 2 3 2 1])))
  (is (= {:a 1 :b 2} (into {} [[:a 1] [:b 2]])))
  (is (= [0 1 2 3] (into [0] [1 2 3]))))

(deftest with-meta-preserved-through-collection-ops
  (let [m {:a 1}
        mm (with-meta m {:source :test})]
    (is (= {:source :test} (meta mm)))
    (is (= {:source :test} (meta (conj mm [:b 2]))))))
