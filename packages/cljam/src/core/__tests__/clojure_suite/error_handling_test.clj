;; Error handling tests.
;; Covers throw, try/catch/finally, ex-info, ex-message, ex-data, ex-cause,
;; thrown?, and thrown-with-msg?.
;;
;; cljam differences from JVM Clojure noted inline:
;;   - catch discriminators are keywords or predicate fns, not JVM classes.
;;   - :default catches any thrown value.
;;   - runtime EvaluationErrors are catchable as maps with :type :error/runtime.
;;   - ex-info returns a regular map with :message, :data, and optional :cause.

(ns clojure-suite.error-handling-test
  (:require [clojure.test :refer [deftest is testing thrown? thrown-with-msg?]]))

;;; -- try basics ---------------------------------------------------------------

(deftest try-basic
  (testing "try returns the last body value when nothing throws"
    (is (= 42 (try 42)))
    (is (= 3 (try 1 2 3))))

  (testing "catch clauses are skipped when nothing throws"
    (is (= :body
           (try
             :body
             (catch :default e :catch)))))

  (testing "finally result is discarded"
    (is (= :body
           (try
             :body
             (finally :ignored))))))

(deftest try-invalid-shapes
  (testing "finally must be the final try clause"
    (is (thrown? :error/runtime
                 (try 42
                   (finally :ignored)
                   (finally :also-ignored))))))

;;; -- throw / catch ------------------------------------------------------------

(deftest throw-and-catch
  (testing ":default catches any thrown value"
    (is (= "plain"
           (try
             (throw "plain")
             (catch :default e e))))
    (is (= 99
           (try
             (throw 99)
             (catch :default e e)))))

  (testing "keyword catch matches the thrown map :type"
    (is (= "special"
           (try
             (throw {:type :error/special :message "special"})
             (catch :error/other e "wrong")
             (catch :error/special e (:message e))
             (catch :default e "also-wrong")))))

  (testing "first matching catch clause wins"
    (is (= :first
           (try
             (throw {:type :error/test})
             (catch :error/test e :first)
             (catch :error/test e :second)
             (catch :default e :default)))))

  (testing "non-matching catch clauses let the throw escape"
    (is (= :error/test
           (try
             (try
               (throw {:type :error/test})
               (catch :error/other e :wrong))
             (catch :default e (:type e)))))))

(deftest nested-try-catch
  (testing "an inner catch handles before the outer catch can observe"
    (is (= :handled-inner
           (try
             (try
               (throw {:type :error/inner})
               (catch :error/inner e :handled-inner))
             (catch :default e :outer)))))

  (testing "an uncaught inner throw can be handled by the outer try"
    (is (= :caught-by-outer
           (try
             (try
               (throw {:type :error/escaped})
               (catch :error/other e :wrong))
             (catch :error/escaped e :caught-by-outer))))))

(deftest predicate-catch
  (testing "predicate catch clauses can match thrown values"
    (is (= :map
           (try
             (throw {:type :error/test})
             (catch map? e :map))))
    (is (= "got oops"
           (try
             (throw "oops")
             (catch string? e (str "got " e))))))

  (testing "predicate catch clauses can decline a value"
    (is (= :default
           (try
             (throw "oops")
             (catch map? e :map)
             (catch :default e :default))))))

;;; -- finally -----------------------------------------------------------------

(deftest finally-behavior
  (testing "finally runs when body completes normally"
    (let [log (atom [])]
      (is (= :body
             (try
               (swap! log conj :body)
               :body
               (finally
                 (swap! log conj :finally)))))
      (is (= [:body :finally] @log))))

  (testing "finally runs when a throw is caught"
    (let [log (atom [])]
      (is (= :caught
             (try
               (swap! log conj :body)
               (throw {:type :error/test})
               (catch :error/test e
                 (swap! log conj :catch)
                 :caught)
               (finally
                 (swap! log conj :finally)))))
      (is (= [:body :catch :finally] @log))))

  (testing "finally runs when a throw escapes to an outer catch"
    (let [log (atom [])]
      (is (= :outer
             (try
               (try
                 (swap! log conj :inner)
                 (throw {:type :error/test})
                 (finally
                   (swap! log conj :finally)))
               (catch :default e :outer))))
      (is (= [:inner :finally] @log)))))

;;; -- ex-info helpers ----------------------------------------------------------

(deftest ex-info-helpers
  (testing "ex-info stores message and data"
    (let [e (ex-info "not found" {:id 42})]
      (is (= "not found" (ex-message e)))
      (is (= {:id 42} (ex-data e)))
      (is (= nil (ex-cause e)))))

  (testing "ex-info may carry a cause"
    (let [cause (ex-info "root" {:root true})
          e     (ex-info "outer" {:id 1} cause)]
      (is (= "outer" (ex-message e)))
      (is (= {:id 1} (ex-data e)))
      (is (= cause (ex-cause e)))
      (is (= "root" (ex-message (ex-cause e))))
      (is (= {:root true} (ex-data (ex-cause e))))))

  (testing "ex helpers return nil for non-error maps or non-maps"
    (is (= nil (ex-message 42)))
    (is (= nil (ex-data nil)))
    (is (= nil (ex-cause {:message "plain"})))))

(deftest throw-ex-info
  (testing "ex-info values can be thrown and caught"
    (is (= ["boom" {:code :bad}]
           (try
             (throw (ex-info "boom" {:code :bad}))
             (catch :default e
               [(ex-message e) (ex-data e)])))))

  (testing "ex-info with typed data still catches by :default"
    (is (= :not-found
           (try
             (throw (ex-info "missing" {:type :not-found :id 7}))
             (catch :default e (:type (ex-data e))))))))

;;; -- runtime errors and clojure.test helpers ---------------------------------

(deftest runtime-errors-are-catchable
  (testing "runtime errors are caught as :error/runtime"
    (is (= :error/runtime
           (try
             (+ "a" 1)
             (catch :error/runtime e (:type e)))))
    (is (= true
           (try
             (+ "a" 1)
             (catch :error/runtime e (boolean (:message e)))))))

  (testing ":default also catches runtime errors"
    (is (= :error/runtime
           (try
             (+ "a" 1)
             (catch :default e (:type e)))))))

(deftest thrown-macros
  (testing "thrown? returns truthy on matching throws and false when nothing throws"
    (is (thrown? :default (throw "boom")))
    (is (thrown? :error/runtime (+ "a" 1)))
    (is (= false (thrown? :default :no-throw))))

  (testing "thrown? lets wrong-type throws propagate"
    (is (= :error/test
           (try
             (thrown? :error/other (throw {:type :error/test}))
             (catch :default e (:type e))))))

  (testing "thrown-with-msg? matches against runtime and ex-info messages"
    (is (thrown-with-msg? :error/runtime #"expects.*numbers" (+ "a" 1)))
    (is (thrown-with-msg? :default #"boom" (throw (ex-info "boom" {:id 1}))))
    (is (= nil (thrown-with-msg? :default #"nope" (throw "boom"))))))
