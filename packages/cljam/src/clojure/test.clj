(ns clojure.test)

;; ---------------------------------------------------------------------------
;; Dynamic vars
;; ---------------------------------------------------------------------------

;; A vector of strings describing the current testing context stack.
;; Pushed by the `testing` macro. Used in failure messages.
(def ^:dynamic *testing-contexts* [])

;; The output stream for test reporting. nil means use *out*.
(def ^:dynamic *test-out* nil)

;; An atom holding {:test 0 :pass 0 :fail 0 :error 0}, or nil when
;; not inside a run-tests call.
(def ^:dynamic *report-counters* nil)

;; A vector of test names currently being executed.
(def ^:dynamic *testing-vars* [])

;; ---------------------------------------------------------------------------
;; Test registry — maps ns-name-string → [{:name "..." :fn fn}]
;; Populated by deftest at load time.
;; ---------------------------------------------------------------------------

(def test-registry (atom {}))

;; ---------------------------------------------------------------------------
;; Fixture registry — maps [ns-name-string :each/:once] → [fixture-fn ...]
;; Populated by use-fixtures at namespace load time.
;; ---------------------------------------------------------------------------

(def fixture-registry (atom {}))

;; Identity fixture — baseline for reduce in join-fixtures.
(defn default-fixture [f] (f))

(defn compose-fixtures
  "Returns a single fixture that wraps f2 inside f1.
  Setup order: f1 setup first, then f2 setup.
  Teardown order: f2 teardown first, then f1 teardown.
  This is the standard middleware-onion composition."
  [f1 f2]
  (fn [g] (f1 (fn [] (f2 g)))))

(defn join-fixtures
  "Compose a sequence of fixture functions into a single fixture.
  Empty sequence returns default-fixture (calls f directly).
  Fixtures run left-to-right for setup, right-to-left for teardown."
  [fixtures]
  (reduce compose-fixtures default-fixture fixtures))

(defn use-fixtures
  "Register fixture functions for the current namespace.
  type must be :each (runs around each individual test) or
  :once (runs around the entire namespace test suite).
  Multiple fixture fns are composed in order."
  [type & fixture-fns]
  (swap! fixture-registry assoc [(str (ns-name *ns*)) type] (vec fixture-fns))
  nil)

;; ---------------------------------------------------------------------------
;; report multimethod — dispatch on :type key of the result map.
;; Override any method to customise test output (e.g. for vitest integration).
;; ---------------------------------------------------------------------------

;; Dispatches on the :type of a test result map.
;; Built-in types: :pass, :fail, :error, :begin-test-var, :end-test-var,
;; :begin-test-ns, :end-test-ns, :summary.
(defmulti report :type)

(defmethod report :default [_] nil)

(defmethod report :pass [_]
  (when *report-counters*
    (swap! *report-counters* update :pass (fnil inc 0))))

(defmethod report :fail [m]
  (when *report-counters*
    (swap! *report-counters* update :fail (fnil inc 0)))
  (println "\nFAIL in" (first *testing-vars*))
  (when (seq *testing-contexts*)
    (println (apply str (interpose " " *testing-contexts*))))
  (when (:message m) (println (:message m)))
  (println "expected:" (pr-str (:expected m)))
  (println "  actual:" (pr-str (:actual m))))

(defmethod report :error [m]
  (when *report-counters*
    (swap! *report-counters* update :error (fnil inc 0)))
  (println "\nERROR in" (first *testing-vars*))
  (when (seq *testing-contexts*)
    (println (apply str (interpose " " *testing-contexts*))))
  (when (:message m) (println (:message m)))
  (println "expected:" (pr-str (:expected m)))
  (println "  actual:" (pr-str (:actual m))))

(defmethod report :begin-test-var [_] nil)
(defmethod report :end-test-var   [_] nil)

(defmethod report :begin-test-ns [m]
  (println "\nTesting" (str (ns-name (:ns m)))))

(defmethod report :end-test-ns [_] nil)

(defmethod report :summary [m]
  (println "\nRan" (:test m) "tests containing"
           (+ (:pass m) (:fail m) (:error m)) "assertions.")
  (println (:fail m) "failures," (:error m) "errors."))

;; ---------------------------------------------------------------------------
;; thrown? / thrown-with-msg? — exception-testing macros
;;
;; These are standalone macros that evaluate to a truthy value (the caught
;; exception) on success, or a falsy value on failure. Designed to compose
;; directly with `is` — no special handling in `is` required.
;;
;; exc-type is a keyword matched against the caught value exactly as cljam's
;; own try/catch does: :default catches anything, :error/runtime catches
;; runtime errors, etc.
;;
;; (is (thrown? :error/runtime (/ 1 0)))           → pass
;; (is (thrown? :default (throw "boom")))           → pass
;; (is (thrown-with-msg? :default #"boom" ...))    → pass if message matches
;; ---------------------------------------------------------------------------

(defmacro thrown?
  "Returns the caught exception if body throws an exception matching exc-type,
  false if no exception is thrown. Wrong-type exceptions propagate unchanged.
  Use :default to match any thrown value."
  [exc-type & body]
  `(try
     ~@body
     false
     (catch ~exc-type e#
       e#)))

(defmacro thrown-with-msg?
  "Returns the caught exception if body throws exc-type AND the exception
  message matches the regex re. Returns false if no throw, nil if message
  does not match. Wrong-type exceptions propagate unchanged.
  Message is extracted via (:message e) for runtime error maps, (str e) otherwise."
  [exc-type re & body]
  `(try
     ~@body
     false
     (catch ~exc-type e#
       (let [err-msg# (or (:message e#) (str e#))]
         (when (re-find ~re (str err-msg#))
           e#)))))

;; ---------------------------------------------------------------------------
;; is — core assertion macro
;;
;; (is form)        — assert form is truthy
;; (is form msg)    — same, with a failure message
;;
;; Reports :pass when form is truthy, :fail when falsy, :error on exception.
;; thrown? and thrown-with-msg? compose naturally — they return truthy/falsy.
;; ---------------------------------------------------------------------------

(defmacro is
  ([form] `(is ~form nil))
  ([form msg]
   `(try
      (let [result# ~form]
        (if result#
          (report {:type :pass :message ~msg :expected '~form :actual result#})
          (report {:type :fail :message ~msg :expected '~form :actual result#})))
      (catch :default e#
        (report {:type :error :message ~msg :expected '~form :actual e#})))))

;; ---------------------------------------------------------------------------
;; are — parameterised assertion helper
;;
;; (are [x y] (= x y)
;;   1 1
;;   2 2)
;;
;; Expands to one `is` call per arg tuple, with x and y bound via let.
;; ---------------------------------------------------------------------------

(defmacro are [argv expr & args]
  (when (seq args)
    (let [tuples (partition (count argv) args)]
      `(do
         ~@(map (fn [vals]
                  `(is (let [~@(interleave argv vals)] ~expr)))
                tuples)))))

;; ---------------------------------------------------------------------------
;; deftest — define a test function and register it in the namespace registry
;;
;; (deftest my-test
;;   (is (= 1 1)))
;;
;; Creates a 0-arity function var and registers it so run-tests can find it.
;; ---------------------------------------------------------------------------

(defmacro deftest [name & body]
  `(do
     (def ~(with-meta name {:test true})
       (fn ~name [] ~@body))
     (swap! test-registry
            update (str (ns-name *ns*)) (fnil conj [])
            {:name ~(str name) :fn ~name})
     ~name))

;; ---------------------------------------------------------------------------
;; testing — label a group of assertions with a context string
;;
;; (testing "addition"
;;   (is (= 2 (+ 1 1))))
;;
;; with-testing-context* is a helper function defined in this namespace so
;; the (binding [*testing-contexts* ...]) form resolves the var correctly.
;; The macro expands to a qualified call so it works from any namespace.
;; ---------------------------------------------------------------------------

(defn with-testing-context* [string thunk]
  (binding [*testing-contexts* (conj *testing-contexts* string)]
    (thunk)))

(defmacro testing [string & body]
  `(with-testing-context* ~string (fn [] ~@body)))

;; ---------------------------------------------------------------------------
;; run-tests — discover and execute tests in one or more namespaces
;;
;; (run-tests)               — run tests in *ns*
;; (run-tests 'my.ns)        — run tests in my.ns
;; (run-tests 'a.ns 'b.ns)   — run tests in both
;;
;; Returns a map: {:test N :pass N :fail N :error N}
;; ---------------------------------------------------------------------------

(defn run-tests
  ([] (run-tests *ns*))
  ([& namespaces]
   (let [counters (atom {:test 0 :pass 0 :fail 0 :error 0})]
     (binding [*report-counters* counters]
       (doseq [ns-ref namespaces]
         (let [ns-str       (str (ns-name ns-ref))
               tests        (get @test-registry ns-str [])
               once-fixture (join-fixtures (get @fixture-registry [ns-str :once] []))
               each-fixture (join-fixtures (get @fixture-registry [ns-str :each] []))]
           (report {:type :begin-test-ns :ns ns-ref})
           (once-fixture
             (fn []
               (doseq [{test-name :name test-fn :fn} tests]
                 (binding [*testing-vars* [test-name]]
                   (report {:type :begin-test-var :var test-name})
                   (swap! *report-counters* update :test (fnil inc 0))
                   (try
                     (each-fixture test-fn)
                     (catch :default e
                       (report {:type :error
                                :message "Uncaught error in test"
                                :expected nil
                                :actual e})))
                   (report {:type :end-test-var :var test-name})))))
           (report {:type :end-test-ns :ns ns-ref})))
       (let [summary @counters]
         (report (assoc summary :type :summary))
         summary)))))

;; ---------------------------------------------------------------------------
;; successful? — summary predicate
;;
;; (successful? (run-tests 'my.ns)) → true / false
;; ---------------------------------------------------------------------------

(defn successful?
  "Returns true if the test summary has zero failures and zero errors."
  [summary]
  (and (zero? (get summary :fail 0))
       (zero? (get summary :error 0))))

;; ---------------------------------------------------------------------------
;; run-test — run a single deftest by name (REPL-friendly)
;;
;; (run-test my-test) — calls my-test with *report-counters* and *testing-vars*
;;                       properly bound; prints summary; returns summary map.
;; ---------------------------------------------------------------------------

(defmacro run-test
  "Runs a single deftest. Returns a summary map.
  Useful for targeted test runs at the REPL without running the whole suite."
  [test-symbol]
  `(let [test-name# ~(str test-symbol)
         counters#  (atom {:test 0 :pass 0 :fail 0 :error 0})]
     (binding [*report-counters* counters#
               *testing-vars*    [test-name#]]
       (report {:type :begin-test-var :var test-name#})
       (swap! *report-counters* update :test (fnil inc 0))
       (try
         (~test-symbol)
         (catch :default e#
           (report {:type :error
                    :message "Uncaught error in test"
                    :expected nil
                    :actual   e#})))
       (report {:type :end-test-var :var test-name#}))
     (let [summary# @counters#]
       (report (assoc summary# :type :summary))
       summary#)))
