;; String operation tests written in Clojure.
;; Covers str, subs, clojure.string functions, and string-as-sequence.

(ns cljam.suite.strings-test
  (:require [clojure.test :refer [deftest is testing are]]
            [clojure.string :as str]))

;;; ── str construction ─────────────────────────────────────────────────────────

(deftest str-concatenates
  (is (= "" (str)))
  (is (= "hello" (str "hello")))
  (is (= "hello world" (str "hello" " " "world")))
  (is (= "abc" (str "a" "b" "c"))))

(deftest str-coerces-types
  (is (= "42" (str 42)))
  (is (= "-1" (str -1)))
  (is (= "3.14" (str 3.14)))
  (is (= "true" (str true)))
  (is (= "false" (str false)))
  (is (= "" (str nil)))
  (is (= ":hello" (str :hello)))
  (is (= "foo" (str 'foo)))
  (is (= "[:a :b]" (str [:a :b])))
  (is (= "(:a :b)" (str '(:a :b)))))

;;; ── subs / count ─────────────────────────────────────────────────────────────

(deftest subs-works
  (is (= "ello" (subs "hello" 1)))
  (is (= "ell" (subs "hello" 1 4)))
  (is (= "" (subs "hello" 3 3)))
  (is (= "hello" (subs "hello" 0))))

(deftest string-count
  (is (= 0 (count "")))
  (is (= 5 (count "hello")))
  (is (= 1 (count "a"))))

;;; ── predicates ───────────────────────────────────────────────────────────────

(deftest string-predicates
  (is (string? ""))
  (is (string? "hello"))
  (is (not (string? nil)))
  (is (not (string? :hello)))
  (is (not (string? 42))))

;;; ── clojure.string ───────────────────────────────────────────────────────────

(deftest str-upper-lower
  (is (= "HELLO" (str/upper-case "hello")))
  (is (= "hello" (str/lower-case "HELLO")))
  (is (= "Hello world" (str/capitalize "hello world"))))

(deftest str-trim
  (is (= "hello" (str/trim "  hello  ")))
  (is (= "hello  " (str/triml "  hello  ")))
  (is (= "  hello" (str/trimr "  hello  "))))

(deftest str-split-join
  (is (= ["a" "b" "c"] (str/split "a,b,c" #",")))
  (is (= ["a" "b" "c"] (str/split "a  b  c" #"\s+")))
  (is (= "a,b,c" (str/join "," ["a" "b" "c"])))
  (is (= "abc" (str/join ["a" "b" "c"])))
  (is (= "" (str/join ","  []))))

(deftest str-replace
  (is (= "hXllX" (str/replace "hello" #"[eo]" "X")))
  (is (= "hello world" (str/replace "hello clojure" "clojure" "world")))
  (is (= "abc" (str/replace "abc" #"z" "x"))))

(deftest str-starts-ends-includes
  (is (str/starts-with? "hello" "hel"))
  (is (not (str/starts-with? "hello" "world")))
  (is (str/ends-with? "hello" "llo"))
  (is (not (str/ends-with? "hello" "he")))
  (is (str/includes? "hello world" "world"))
  (is (not (str/includes? "hello" "xyz"))))

(deftest str-blank?
  (is (str/blank? ""))
  (is (str/blank? "   "))
  (is (str/blank? nil))
  (is (not (str/blank? "hello")))
  (is (not (str/blank? " a "))))

(deftest str-reverse
  (is (= "olleh" (str/reverse "hello")))
  (is (= "" (str/reverse ""))))

;;; ── Strings as sequences ─────────────────────────────────────────────────────

(deftest string-seqable
  ;; In cljam, (seq "hello") produces a sequence of single-char strings,
  ;; not CljChar values. Character literals like \h are CljChar and do not
  ;; equal single-char strings — this is a known cljam/JVM Clojure difference.
  (is (= 5 (count "hello")))
  (is (= 5 (count (seq "hello"))))
  (is (= "h" (first "hello")))
  ;; NOTE: (last "hello") is not supported — last only works on lists/vectors.
  ;; Use (nth "hello" 4) or (peek (vec "hello")) instead.
  (is (= "hello" (apply str (seq "hello")))))

;;; ── name / namespace ─────────────────────────────────────────────────────────

(deftest name-and-namespace
  (is (= "foo" (name :foo)))
  (is (= "foo" (name :ns/foo)))
  (is (= "ns" (namespace :ns/foo)))
  (is (nil? (namespace :foo)))
  (is (= "foo" (name 'foo)))
  (is (= "foo" (name 'ns/foo)))
  (is (= "ns" (namespace 'ns/foo)))
  (is (nil? (namespace 'foo)))
  (is (= "hello" (name "hello"))))

;;; ── pr-str / print-str ───────────────────────────────────────────────────────

(deftest pr-str-produces-readable
  (is (= "42" (pr-str 42)))
  (is (= "\"hello\"" (pr-str "hello")))
  (is (= "nil" (pr-str nil)))
  (is (= "true" (pr-str true)))
  (is (= ":foo" (pr-str :foo))))

(deftest print-str-no-quotes
  (is (= "hello" (print-str "hello")))
  (is (= "42" (print-str 42)))
  (is (= "nil" (print-str nil))))
