;; String operation tests written in Clojure.
;; Covers str, subs, clojure.string functions, and string-as-sequence.

(ns clojure-suite.strings-test
  (:require [clojure.test :refer [deftest is testing are thrown?]]
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
  (is (= "abc" (str/replace "abc" #"z" "x")))
  (is (= "a$b" (str/replace "a.b" "." "$")))
  (is (= "abc123def" (str/replace "abc123def" #"(\d+)" "$1")))
  (is (= "abc[123]def" (str/replace "abc123def" #"(\d+)" #(str "[" (second %) "]")))))

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

(deftest expanded-clojure-string-functions
  (is (= "hello" (str/trim-newline "hello\n\r\n")))
  (is (= "hello  " (str/trim-newline "hello  ")))
  (is (= 1 (str/index-of "hello" "e")))
  (is (nil? (str/index-of "hello" "z")))
  (is (= 3 (str/index-of "hello" "l" 3)))
  (is (= 3 (str/last-index-of "hello" "l")))
  (is (nil? (str/last-index-of "hello" "z")))
  (is (= 2 (str/last-index-of "hello" "l" 2)))
  (is (= "Xbcabc" (str/replace-first "abcabc" "a" "X")))
  (is (= "abc[123]def456" (str/replace-first "abc123def456" #"(\d+)" #(str "[" (second %) "]"))))
  (is (= "$1 world" (str/replace "hello" #"hello" (str/re-quote-replacement "$1 world"))))
  (is (= ["a" "b"] (str/split-lines "a\nb")))
  (is (= ["a" "b"] (str/split-lines "a\r\nb")))
  (is (= ["a"] (str/split-lines "a\n")))
  (is (= "h2ll4" (str/escape "hello" {"e" "2" "o" "4"}))))

;;; ── Regex semantics ─────────────────────────────────────────────────────────

(deftest regex-literals-and-patterns
  (is (regexp? #"abc"))
  (is (not (regexp? "abc")))
  (is (not (regexp? nil)))
  (is (regexp? (re-pattern "abc")))
  (is (= "abc" (str #"abc")))
  (is (= "\\d+" (str #"\d+")))
  (is (thrown? :default (re-pattern 42)))
  (is (thrown? :default (re-pattern "(?x)abc"))))

(deftest regex-find-match-and-seq
  (is (= "123" (re-find #"\d+" "abc123def")))
  (is (nil? (re-find #"\d+" "abcdef")))
  (is (= ["123" "123"] (re-find #"(\d+)" "abc123def")))
  (is (= ["a" "a" nil] (re-find #"(a)(z)?" "ab")))
  (is (= "ABC" (re-find #"(?i)abc" "ABC")))
  (is (= "abc123" (re-matches #"[a-z]+\d+" "abc123")))
  (is (nil? (re-matches #"\d+" "abc123")))
  (is (= ["abc123" "abc" "123"] (re-matches #"([a-z]+)(\d+)" "abc123")))
  (is (= ["1" "22" "333"] (vec (re-seq #"\d+" "a1b22c333"))))
  (is (nil? (re-seq #"\d+" "abc")))
  (is (= [["a1" "a" "1"] ["b2" "b" "2"]]
         (vec (re-seq #"([a-z])(\d)" "a1 b2")))))

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

;;; ── parse-* functions ───────────────────────────────────────────────────────

(deftest parse-long-semantics
  (is (= 42 (parse-long "42")))
  (is (= -7 (parse-long "-7")))
  (is (= 100 (parse-long "+100")))
  (is (= 0 (parse-long "0")))
  (is (nil? (parse-long "abc")))
  (is (nil? (parse-long "3.14")))
  (is (nil? (parse-long "")))
  (is (nil? (parse-long "12abc")))
  (is (nil? (parse-long " 42")))
  (is (thrown? :default (parse-long 42)))
  (is (thrown? :default (parse-long nil))))

(deftest parse-double-semantics
  (is (= 3.14 (parse-double "3.14")))
  (is (= 100000 (parse-double "1e5")))
  (is (= -0.5 (parse-double "-0.5")))
  (is (= 0 (parse-double "0")))
  (is (= 42 (parse-double "42")))
  (is (nil? (parse-double "nope")))
  (is (nil? (parse-double "")))
  (is (nil? (parse-double "1.2.3")))
  (is (nil? (parse-double "1e5abc")))
  (is (thrown? :default (parse-double 3.14)))
  (is (thrown? :default (parse-double nil))))

(deftest parse-boolean-semantics
  (is (= true (parse-boolean "true")))
  (is (= false (parse-boolean "false")))
  (is (nil? (parse-boolean "yes")))
  (is (nil? (parse-boolean "no")))
  (is (nil? (parse-boolean "TRUE")))
  (is (nil? (parse-boolean "1")))
  (is (nil? (parse-boolean "")))
  (is (thrown? :default (parse-boolean true)))
  (is (thrown? :default (parse-boolean nil))))
