;; Atom and volatile tests.
;; Covers atom, reset!, swap!, atom?, compare-and-set!, swap-vals!, reset-vals!,
;; add-watch, remove-watch, volatile!, vswap!, vreset!, volatile?.
;;
;; cljam differences from JVM Clojure noted inline:
;;   - :meta option to atom is silently ignored — (meta (atom v :meta m)) returns nil.
;;   - :validator option to atom is accepted but not enforced — validators do NOT run.
;;   - get-validator is not implemented.
;;   - with-meta throws on atoms (not supported).
;;   - thrown? IS implemented in cljam (catch type is a keyword, e.g. :default).

(ns clojure-suite.atoms-test
  (:require [clojure.test :refer [deftest is testing thrown?]]))

;;; ── atom basics ──────────────────────────────────────────────────────────────

(deftest atom-basic
  (testing "atom is created and dereffed"
    (is (= 0   @(atom 0)))
    (is (= nil @(atom nil)))
    (is (= []  @(atom [])))
    (is (= :kw @(atom :kw))))

  (testing "atom? predicate"
    (is (true?  (atom? (atom 0))))
    (is (false? (atom? 42)))
    (is (false? (atom? nil)))
    (is (false? (atom? []))))

  (testing "atom holds any value type"
    (is (= "hello"     @(atom "hello")))
    (is (= {:a 1}      @(atom {:a 1})))
    (is (= '(1 2 3)    @(atom '(1 2 3))))
    (is (= #{:a :b}    @(atom #{:a :b})))))

;;; ── reset! ───────────────────────────────────────────────────────────────────

(deftest reset-bang
  (testing "reset! changes value and returns new value"
    (let [a (atom 0)]
      (is (= 42 (reset! a 42)))
      (is (= 42 @a))))

  (testing "reset! to nil"
    (let [a (atom :something)]
      (is (= nil (reset! a nil)))
      (is (= nil @a))))

  (testing "multiple reset! calls"
    (let [a (atom 0)]
      (reset! a 1)
      (reset! a 2)
      (reset! a 3)
      (is (= 3 @a)))))

;;; ── swap! ────────────────────────────────────────────────────────────────────

(deftest swap-bang
  (testing "swap! applies fn and returns new value"
    (let [a (atom 0)]
      (is (= 1 (swap! a inc)))
      (is (= 1 @a))))

  (testing "swap! with extra args"
    (let [a (atom 10)]
      (is (= 15 (swap! a + 5)))
      (is (= 30 (swap! a * 2)))))

  (testing "swap! with multiple extra args"
    (let [a (atom 0)]
      (is (= 6 (swap! a + 1 2 3)))))

  (testing "swap! on collections"
    (let [a (atom [])]
      (swap! a conj 1)
      (swap! a conj 2)
      (swap! a conj 3)
      (is (= [1 2 3] @a))))

  (testing "swap! on map"
    (let [a (atom {:count 0})]
      (swap! a update :count inc)
      (is (= {:count 1} @a))
      (swap! a assoc :name "test")
      (is (= {:count 1 :name "test"} @a)))))

;;; ── compare-and-set! ─────────────────────────────────────────────────────────

(deftest compare-and-set-bang
  (testing "succeeds when expected value matches"
    (let [a (atom 10)]
      (is (= true  (compare-and-set! a 10 20)))
      (is (= 20 @a))))

  (testing "fails when expected value does not match"
    (let [a (atom 10)]
      (is (= false (compare-and-set! a 99 20)))
      (is (= 10 @a))))

  (testing "sequential CAS — only first succeeds"
    (let [a (atom 0)]
      (is (true?  (compare-and-set! a 0 1)))
      (is (false? (compare-and-set! a 0 2)))
      (is (= 1 @a))))

  (testing "CAS uses reference equality for objects"
    ;; Keywords are interned in cljam so same keyword == same ref
    (let [a (atom :ready)]
      (is (true? (compare-and-set! a :ready :done)))
      (is (= :done @a)))))

;;; ── swap-vals! / reset-vals! ─────────────────────────────────────────────────

(deftest swap-vals-bang
  (testing "returns [old new] vector"
    (let [a (atom 10)]
      (is (= [10 15] (swap-vals! a + 5)))))

  (testing "atom holds new value after swap-vals!"
    (let [a (atom 10)]
      (swap-vals! a + 5)
      (is (= 15 @a))))

  (testing "destructure old and new"
    (let [a            (atom {:x 0})
          [before after] (swap-vals! a assoc :x 42)]
      (is (= {:x 0}  before))
      (is (= {:x 42} after)))))

(deftest reset-vals-bang
  (testing "returns [old new] vector"
    (let [a (atom 10)]
      (is (= [10 99] (reset-vals! a 99)))))

  (testing "atom holds new value after reset-vals!"
    (let [a (atom 10)]
      (reset-vals! a 99)
      (is (= 99 @a))))

  (testing "destructure old and new"
    (let [a           (atom :initial)
          [old new]   (reset-vals! a :replaced)]
      (is (= :initial  old))
      (is (= :replaced new)))))

;;; ── add-watch / remove-watch ─────────────────────────────────────────────────

(deftest add-watch-basic
  (testing "add-watch returns the atom itself"
    (let [a (atom 0)]
      (is (= a (add-watch a :w (fn [_ _ _ _] nil))))))

  (testing "watcher receives key, ref, old, new"
    (let [a      (atom 0)
          calls  (atom [])
          watcher (fn [key ref old new]
                    (swap! calls conj {:key key :old old :new new}))]
      (add-watch a :w watcher)
      (swap! a inc)
      (reset! a 10)
      (is (= [{:key :w :old 0  :new 1}
              {:key :w :old 1  :new 10}]
             @calls))))

  (testing "watcher not called when value unchanged"
    (let [a     (atom 0)
          calls (atom 0)]
      (add-watch a :w (fn [_ _ _ _] (swap! calls inc)))
      ;; reset! to same value still fires (Clojure semantics — no equality check)
      (reset! a 0)
      (is (= 1 @calls))))

  (testing "multiple watches fire independently"
    (let [a   (atom 0)
          log (volatile! [])]
      (add-watch a :w1 (fn [k _ _ n] (vswap! log conj [k n])))
      (add-watch a :w2 (fn [k _ _ n] (vswap! log conj [k n])))
      (swap! a inc)
      (is (= #{[:w1 1] [:w2 1]} (set @log)))))

  (testing "same key replaces previous watch"
    (let [a      (atom 0)
          calls1 (atom 0)
          calls2 (atom 0)]
      (add-watch a :w (fn [_ _ _ _] (swap! calls1 inc)))
      (add-watch a :w (fn [_ _ _ _] (swap! calls2 inc)))  ;; replaces :w
      (swap! a inc)
      (is (= 0 @calls1))   ;; first watch never fired
      (is (= 1 @calls2)))))

(deftest remove-watch-basic
  (testing "remove-watch returns the atom itself"
    (let [a (atom 0)]
      (add-watch a :w (fn [_ _ _ _] nil))
      (is (= a (remove-watch a :w)))))

  (testing "watcher stops firing after removal"
    (let [a     (atom 0)
          calls (volatile! [])]
      (add-watch a :w (fn [k _ _ n] (vswap! calls conj [k n])))
      (swap! a inc)        ;; fires → 1
      (remove-watch a :w)
      (swap! a inc)        ;; should NOT fire
      (is (= [[:w 1]] @calls))))

  (testing "removing non-existent key is a no-op"
    (let [a     (atom 0)
          calls (atom 0)]
      (remove-watch a :no-such-key)  ;; should not throw
      (add-watch a :w (fn [_ _ _ _] (swap! calls inc)))
      (swap! a inc)
      (is (= 1 @calls)))))

;;; ── volatile! ────────────────────────────────────────────────────────────────

(deftest volatile-basic
  (testing "volatile! created and dereffed"
    (is (= 0   @(volatile! 0)))
    (is (= nil @(volatile! nil))))

  (testing "volatile? predicate"
    (is (true?  (volatile? (volatile! 0))))
    (is (false? (volatile? (atom 0))))
    (is (false? (volatile? 42))))

  (testing "vswap! applies fn and returns new value"
    (let [v (volatile! 0)]
      (is (= 1 (vswap! v inc)))
      (is (= 1 @v))))

  (testing "vswap! with extra args"
    (let [v (volatile! 10)]
      (is (= 15 (vswap! v + 5)))))

  (testing "vreset! sets value and returns new value"
    (let [v (volatile! 0)]
      (is (= 42 (vreset! v 42)))
      (is (= 42 @v))))

  (testing "volatile! does not support add-watch"
    ;; Volatiles have no watch protocol — add-watch should throw or not fire
    (let [v     (volatile! 0)
          calls (atom 0)]
      (is (thrown? :default
            (add-watch v :w (fn [_ _ _ _] (swap! calls inc))))))))
