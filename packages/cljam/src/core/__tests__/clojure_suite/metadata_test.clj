;; User-visible metadata semantics.

(ns clojure-suite.metadata-test
  (:require [clojure.test :refer [deftest is thrown?]]))

(defn documented-fn
  "Documented."
  [x]
  x)

(defn multi-arity-doc
  "Multi."
  ([] :zero)
  ([x] x)
  ([x y] [x y]))

(def ^:private private-var 1)
(def ^:dynamic *dynamic-var* :root)

(deftest with-meta-and-meta
  (let [f (with-meta (fn [x] x) {:doc "id" :tag :fn})]
    (is (= {:doc "id" :tag :fn} (meta f)))
    (is (= "id" (:doc (meta f)))))
  (is (nil? (meta (fn [x] x))))
  (is (= {:k :v} (meta (with-meta [1 2] {:k :v}))))
  (is (= {:k :v} (meta (with-meta {:a 1} {:k :v}))))
  (is (= {:k :v} (meta (with-meta '(1 2) {:k :v}))))
  (is (= {:k :v} (meta (with-meta 'sym {:k :v}))))
  (is (= [1 2] (with-meta [1 2] {:ignored true}))))

(deftest reader-metadata
  (is (= {:private true} (meta ^:private [1 2])))
  (is (= {:tag :numbers} (meta ^{:tag :numbers} [1 2])))
  (is (= {:private true} (select-keys (meta #'private-var) [:private])))
  (is (= {:dynamic true} (select-keys (meta #'*dynamic-var*) [:dynamic]))))

(deftest defn-metadata
  (is (= "Documented." (:doc (meta #'documented-fn))))
  (is (vector? (:arglists (meta #'documented-fn))))
  (is (= "Multi." (:doc (meta #'multi-arity-doc))))
  (is (= 3 (count (:arglists (meta #'multi-arity-doc)))))
  (is (= "Documented." (:doc (:value (describe #'documented-fn))))))

(deftest vary-meta-and-alter-meta
  (let [v (with-meta [1] {:a 1})]
    (is (= {:a 1 :b 2} (meta (vary-meta v assoc :b 2))))
    (is (= [1] (vary-meta v assoc :b 2))))
  (def alter-target 10)
  (alter-meta! #'alter-target assoc :x 1)
  (is (= 1 (:x (meta #'alter-target))))
  (is (= 10 alter-target))
  (alter-meta! #'alter-target assoc :y 2)
  (is (= {:x 1 :y 2} (select-keys (meta #'alter-target) [:x :y])))
  (is (= nil (alter-meta! #'alter-target (fn [_] nil))))
  (is (thrown? :default (alter-meta! 42 assoc :x 1)))
  (is (thrown? :default (alter-meta! #'alter-target 42)))
  (is (thrown? :default (alter-meta! #'alter-target (fn [_] 42)))))

(deftest atom-metadata
  (let [a (atom 1)]
    (is (= {:watchable true} (alter-meta! a assoc :watchable true)))
    (is (= {:watchable true} (meta a)))
    (is (= 1 @a))))
