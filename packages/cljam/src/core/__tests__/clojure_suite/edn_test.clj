;; clojure.edn user-visible read/pr-str semantics.

(ns clojure-suite.edn-test
  (:require [clojure.test :refer [deftest is thrown?]]
            [clojure.edn :as edn]))

(deftest read-string-scalars-and-collections
  (is (= 42 (edn/read-string "42")))
  (is (= -7 (edn/read-string "-7")))
  (is (= 3.14 (edn/read-string "3.14")))
  (is (= "hello" (edn/read-string "\"hello\"")))
  (is (nil? (edn/read-string "nil")))
  (is (= true (edn/read-string "true")))
  (is (= false (edn/read-string "false")))
  (is (= :plain (edn/read-string ":plain")))
  (is (= :ns/kw (edn/read-string ":ns/kw")))
  (is (= 'sym (edn/read-string "sym")))
  (is (= [1 2 3] (edn/read-string "[1 2 3]")))
  (is (= '(1 2 3) (edn/read-string "(1 2 3)")))
  (is (= {:a 1 :b [2 3]} (edn/read-string "{:a 1 :b [2 3]}")))
  (is (= 1 (edn/read-string "1 2 3"))))

(deftest edn-discard
  (is (= 2 (edn/read-string "#_ 1 2")))
  (is (= [1 3] (edn/read-string "[1 #_ 2 3]")))
  (is (= 3 (edn/read-string "#_#_ 1 2 3"))))

(deftest edn-tag-readers
  (is (= {:x 1 :y 2}
         (edn/read-string {:readers {'point (fn [[x y]] {:x x :y y})}}
                          "#point [1 2]")))
  (is (= [:unknown "my/tag" {:a 1}]
         (edn/read-string {:default (fn [tag form] [:unknown tag form])}
                          "#my/tag {:a 1}")))
  (is (= [:unknown "missing" 1]
         (edn/read-string {:default (fn [tag form] [:unknown tag form])}
                          "#missing 1"))))

(deftest edn-pr-str-and-round-trip
  (is (= "42" (edn/pr-str 42)))
  (is (= "\"hello\"" (edn/pr-str "hello")))
  (is (= "nil" (edn/pr-str nil)))
  (is (= ":kw" (edn/pr-str :kw)))
  (is (= "[1 2 3]" (edn/pr-str [1 2 3])))
  (is (= "true" (edn/pr-str true)))
  (doseq [x [42 "hello" nil true false :kw [1 2] {:a 1} '(1 2)]]
    (is (= x (edn/read-string (edn/pr-str x))))))

;; RB-005: reader errors from runtime data parsing are catchable Clojure
;; errors (JVM: RuntimeException), unlike program-source parse errors which
;; fail before evaluation begins.
(deftest reader-errors-are-catchable
  ;; map with key but no value
  (is (= :caught (try (edn/read-string "{:a}") (catch :default _ :caught))))
  ;; unclosed collection
  (is (= :caught (try (edn/read-string "(1 2") (catch :default _ :caught))))
  ;; unterminated string (tokenizer-level failure)
  (is (= :caught (try (edn/read-string "\"abc") (catch :default _ :caught))))
  ;; thrown? works inside deftest bodies
  (is (thrown? :default (edn/read-string "{:a}")))
  ;; the caught value is an error map with a stable :type
  (is (= :reader/malformed
         (:type (try (edn/read-string "{:a}") (catch :default e e)))))
  ;; clojure.core/read-string translates at the same boundary
  (is (= :caught (try (read-string "{:a}") (catch :default _ :caught))))
  (is (= :reader/malformed
         (:type (try (read-string "[1 2") (catch :default e e))))))
