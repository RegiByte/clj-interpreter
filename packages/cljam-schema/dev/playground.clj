;; cljam-schema dev playground
;; Shared live namespace — load this file in your Calva session, or let cljam-mcp load it.
;;
;; Usage:
;;   cljam nrepl-server --root-dir /path/to/cljam --port 7888
;;   (then: Calva connects, cljam-mcp connects via connect_nrepl)
;;   (then: load this file in both clients)

(ns schema.dev
  (:require [cljam.schema.core :as s]
            [cljam.handbook :as h]))

(s/explain :boolean :false)



;; ── Basic validation ──────────────────────────────────────────────────────

(def user-schema
  [:map
   [:name :string]
   [:age  [:int {:min 0 :max 150}]]
   [:email [:string {:pattern "^[^@]+@[^@]+$"}]]])

(def valid-user
  {:name "Alice" :age 30 :email "alice@example.com"})

(def invalid-user
  {:name "Bob" :age -5 :email "not-an-email"})

;; Eval these to see schema in action:
;; (s/validate user-schema valid-user)
;; (s/validate user-schema invalid-user)
;; (s/explain user-schema invalid-user)

;; ── Shared mutable state — change this and the other client sees it ────────

(def ^:dynamic *counter* (atom 0))

(defn tick! []
  (swap! *counter* inc))

(defn current []
  @*counter*)

;; Both Sir RegiByte and cljam-mcp can call (tick!) and see the same counter.
;; (tick!)
;; (current)

(comment
  (tick!)
  (current)
  (describe (find-ns 'schema.dev))
  (all-users)
  (def regibyte-was-here {:author "Sir Regibyte" :age 30, :session 172})
  regibyte-was-here

  claude-was-here
  (greet-user {:name "Sir Regibyte" :age 30})
  (greet-user {:name "Sir Regibyte" :age "foo"})

  (register! :the-real-regibyte 
             {:author "Regibyte", 
              :age 26, 
              :session 172,
              :name "Regibyte" 
              :email "foo@bar.com"})
  
  (h/topics)
  (h/lookup :sort)
  ;
  )
