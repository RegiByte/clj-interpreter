;; Character literal and core character function semantics.

(ns clojure-suite.chars-test
  (:require [clojure.test :refer [deftest is testing thrown?]]))

(deftest character-literals
  (testing "basic and named literals"
    (is (= \a \a))
    (is (= \Z \Z))
    (is (= \1 \1))
    (is (= \! \!))
    (is (= \space \u0020))
    (is (= \newline (char 10)))
    (is (= \tab (char 9)))
    (is (= \return (char 13)))
    (is (= \backspace (char 8)))
    (is (= \formfeed (char 12))))

  (testing "unicode escapes"
    (is (= \A \u0041))
    (is (= \λ \u03BB))))

(deftest character-equality-and-predicate
  (is (= \a \a))
  (is (not= \a \b))
  (is (not= \a "a"))
  (is (char? \a))
  (is (char? \space))
  (is (not (char? "a")))
  (is (not (char? 65)))
  (is (not (char? nil))))

(deftest character-codepoint-conversion
  (testing "char converts numeric codepoints"
    (is (= \A (char 65)))
    (is (= \a (char 97)))
    (is (= \space (char 32)))
    (is (= \λ (char 955))))

  (testing "int converts chars and truncates numbers"
    (is (= 65 (int \A)))
    (is (= 97 (int \a)))
    (is (= 32 (int \space)))
    (is (= 10 (int \newline)))
    (is (= 3 (int 3.7)))
    (is (= -3 (int -3.7)))
    (is (= \Z (char (int \Z)))))

  (testing "invalid char input throws"
    (is (thrown? :default (char "a")))))

(deftest characters-in-strings-and-collections
  (is (= "a" (str \a)))
  (is (= "hello" (str \h \e \l \l \o)))
  (is (= " " (str \space)))
  (is (= "prefix!suffix" (str "prefix" \! "suffix")))
  (is (= [\a \b \c] [\a \b \c]))
  (is (= 1 (get {\a 1 \b 2} \a))))

(deftest character-compare
  (is (neg? (compare \a \b)))
  (is (pos? (compare \b \a)))
  (is (= 0 (compare \a \a)))
  (is (= [\a \b \c] (sort compare [\c \a \b]))))
