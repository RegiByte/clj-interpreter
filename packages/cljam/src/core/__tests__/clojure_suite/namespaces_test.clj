;; Namespace and var semantic tests written in Clojure.
;; Covers supported user-visible namespace behavior from the jank reference
;; and the existing TypeScript namespace semantic specs.

(ns clojure-suite.namespaces-test
  (:require [clojure.test :refer [deftest is testing are thrown?]]
            [clojure.string :as str :refer [upper-case]]
            [clojure-suite.alias-only :as-alias alias-only]))

(def public-value :visible)
(def ^:private private-value :hidden)
(def ^:dynamic *dynamic-value* :root)
(defn public-fn [x] x)
(defn- private-fn [x] x)

(deftest namespace-name-function
  (are [expected x] (= expected (namespace x))
    "clojure.core" 'clojure.core/+
    "abc"          :abc/def
    "abc"          'abc/def
    nil            :abc
    nil            'abc)
  (is (thrown? :default (namespace nil))))

(deftest current-namespace-value
  (is (namespace? *ns*))
  (is (= 'clojure-suite.namespaces-test (ns-name *ns*)))
  (is (= "#namespace[clojure-suite.namespaces-test]" (pr-str *ns*)))
  (is (= *ns* (find-ns 'clojure-suite.namespaces-test)))
  (is (not (namespace? 'clojure-suite.namespaces-test))))

(deftest find-ns-and-the-ns
  (is (namespace? (find-ns 'clojure.core)))
  (is (= 'clojure.core (ns-name (find-ns 'clojure.core))))
  (is (nil? (find-ns 'clojure-suite.no-such-ns)))
  (is (= 'clojure-suite.namespaces-test
         (ns-name (the-ns 'clojure-suite.namespaces-test))))
  (is (nil? (the-ns 'clojure-suite.no-such-ns)))
  (is (every? namespace? (all-ns))))

(deftest namespace-utility-functions
  (is (= 'user (ns-name 'user)))
  (is (= 'user (ns-name "user")))
  (is (nil? (ns-name 42)))
  (is (map? (ns-imports 'clojure-suite.namespaces-test)))
  (is (empty? (ns-imports 'clojure-suite.namespaces-test)))
  (is (set? (loaded-libs)))
  (is (contains? (loaded-libs) 'clojure.core))
  (is (= false (instance? String "x")))
  (is (= "conjure.string" (class "x")))
  (is (nil? (class)))
  (is (not (class? String)))
  (is (the-ns 'clojure-suite.namespaces-test))
  (is (special-symbol? 'def))
  (is (special-symbol? 'if))
  (is (not (special-symbol? 'not-special))))

(deftest require-alias-and-refer
  (is (= "HELLO" (upper-case "hello")))
  (is (= "hello" (str/lower-case "HELLO")))
  (is (= "abc" (clojure.string/lower-case "ABC")))
  (is (thrown? :default str/missing)))

(deftest qualified-lookup
  (is (= :visible clojure-suite.namespaces-test/public-value))
  (is (= 3 (clojure.core/+ 1 2)))
  (is (= [2 3 4] (vec (clojure.core/map inc [1 2 3]))))
  (is (= 42 (clojure.core/when true 42)))
  (is (nil? (clojure.core/when false 42))))

(deftest auto-qualified-keywords
  (is (= :clojure-suite.namespaces-test/local ::local))
  ;; Alias-qualified keyword reader behavior is covered in TypeScript specs
  ;; because the Clojure file runner reads this file before its aliases exist.
  (is (= :clojure-suite.alias-only/id
         (keyword "clojure-suite.alias-only" "id"))))

(deftest namespace-introspection-maps
  (testing "interns contain locally defined vars"
    (is (contains? (ns-interns 'clojure-suite.namespaces-test) 'public-value))
    (is (contains? (ns-interns 'clojure-suite.namespaces-test) 'private-value))
    (is (var? (get (ns-interns 'clojure-suite.namespaces-test) 'public-value))))

  (testing "publics exclude private vars"
    (is (contains? (ns-publics 'clojure-suite.namespaces-test) 'public-value))
    (is (contains? (ns-publics 'clojure-suite.namespaces-test) 'public-fn))
    (is (not (contains? (ns-publics 'clojure-suite.namespaces-test) 'private-value)))
    (is (not (contains? (ns-publics 'clojure-suite.namespaces-test) 'private-fn))))

  (testing "refers contain required referred vars, not local interns"
    (is (contains? (ns-refers 'clojure-suite.namespaces-test) 'upper-case))
    (is (not (contains? (ns-refers 'clojure-suite.namespaces-test) 'public-value)))
    (is (not (contains? (ns-interns 'clojure-suite.namespaces-test) 'upper-case)))))

(deftest ns-aliases-and-map
  (is (= 'clojure.string
         (ns-name (get (ns-aliases 'clojure-suite.namespaces-test) 'str))))
  (is (contains? (ns-map 'clojure-suite.namespaces-test) 'public-value))
  (is (contains? (ns-map 'clojure-suite.namespaces-test) 'upper-case))
  (is (var? (get (ns-map 'clojure-suite.namespaces-test) 'public-value))))

(deftest var-and-var-predicate
  (is (var? #'public-value))
  (is (var? #'clojure.string/lower-case))
  (is (not (var? public-value)))
  (is (not (var? 'public-value)))
  (is (= :visible (var-get #'public-value)))
  (is (fn? (var-get #'clojure.string/lower-case))))

(deftest qualified-dynamic-var-deref
  (is (= :bound
         (binding [*dynamic-value* :bound]
           clojure-suite.namespaces-test/*dynamic-value*))))

(deftest ns-form-docstring
  (is (= nil (:doc (describe *ns*)))))
