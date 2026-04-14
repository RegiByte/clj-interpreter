;; vitest-integration.test.clj
;;
;; Smoke tests for the clojure.test → vitest bridge.
;; These run as native vitest tests when `bun test` (or `vitest`) is invoked.
;; Each (deftest ...) maps to one vitest test() call.

(ns cljam.vitest-integration-test
  (:require [clojure.test :refer [deftest is testing are thrown? thrown-with-msg? successful?
                                  use-fixtures compose-fixtures join-fixtures]]))

(deftest arithmetic-works
  (is (= (+ 1 2) 3))
  (is (= (* 3 4) 12))
  (is (= (- 10 4) 6)))

(deftest string-operations
  (is (= (str "hello" " " "world") "hello world"))
  (is (= (count "cljam") 5)))

(deftest testing-context-works
  (testing "nested contexts"
    (is (= 1 1))
    (is (string? "ok"))))

(deftest are-macro-works
  (are [x y] (= x y)
    1    1
    "a"  "a"
    true true))

(deftest predicates
  (is (number? 42))
  (is (string? "hello"))
  (is (nil? nil))
  (is (not (nil? 0))))

(deftest async-deftest-works
  ;; A deftest whose body is an (async ...) block returns a CljPending.
  ;; The test runner must await that pending before checking failures —
  ;; otherwise assertions inside the block are silently ignored.
  (async
   (let [x @(promise-of 42)]
     (is (= x 42))
     (is (not (pending? x))))))

(deftest thrown?-works
  ;; thrown? is a standalone macro that composes with is.
  ;; It returns the exception on success, false if no throw.
  (is (thrown? :error/runtime (/ 1 0)))
  (is (thrown? :default (throw "any value")))
  (is (not (thrown? :default 42))))

(deftest thrown-with-msg?-works
  ;; thrown-with-msg? additionally checks the exception message.
  (is (thrown-with-msg? :error/runtime #"zero" (/ 1 0)))
  (is (not (thrown-with-msg? :error/runtime #"no-match" (/ 1 0)))))

(deftest successful?-works
  ;; successful? is a simple predicate on run-tests summary maps.
  (is (successful? {:test 3 :pass 3 :fail 0 :error 0}))
  (is (not (successful? {:test 2 :pass 1 :fail 1 :error 0}))))

(deftest use-fixtures-api-exists
  ;; Verify the fixture API is accessible from a .test.clj file.
  (is (fn? use-fixtures))
  (is (fn? join-fixtures))
  (is (fn? compose-fixtures))
  (is (map? @clojure.test/fixture-registry)))

(deftest compose-fixtures-works
  ;; Verify setup order: f1 before f2, teardown: f2 before f1.
  (let [log (atom [])
        f1  (fn [g] (swap! log conj :f1-before) (g) (swap! log conj :f1-after))
        f2  (fn [g] (swap! log conj :f2-before) (g) (swap! log conj :f2-after))
        cf  (compose-fixtures f1 f2)]
    (cf (fn [] (swap! log conj :test)))
    (is (= @log [:f1-before :f2-before :test :f2-after :f1-after]))))

(deftest join-fixtures-works
  ;; Empty → identity. Single → wraps correctly.
  (let [called (atom false)]
    ((join-fixtures []) (fn [] (reset! called true)))
    (is @called))
  (let [log (atom [])
        fx  (fn [g] (swap! log conj :setup) (g) (swap! log conj :teardown))]
    ((join-fixtures [fx]) (fn [] (swap! log conj :body)))
    (is (= @log [:setup :body :teardown]))))
