(ns demo
  (:require [mesh :as m]))

*ns*

(+ 1 2 3)

(println "Hello")


(async
 (let [n [1 2 3]]
   (doseq [node n]
     (println node))))

(-> (m/list-nodes)
    (then (fn [nodes]
            (doseq [node nodes]
              (println node)))))



(mesh/set-target! nil)

(println "hello again!!")

(m/list-nodes)

(println (+ 1 2))
mesh/*eval-target*

(async
 (let [[result-a result-b]
       @(all [(mesh/with-node :node1 '(do (println "Hello there node 1") 42))
              (mesh/with-node :node2 '(do (println "Hello there node 2") 3))])]
   (println "local log" result-a result-b)
   (+ result-a result-b)))

(defn fib [x]
  (if (<= x 1)
    x
    (+ (fib (- x 1)) (fib (- x 2)))))

(println (map fib [1 2 3 4 5 6 7 8 9 10]))

(+ 1 2 3)

(spit "test.txt" "hello brooo")
(slurp "test.txt")



(println "hello")

(def source '(do (def x 10) (defn double [x] (* x 2)) (double x)))
(def following-source '(do (println "following") (double 5)))

(def something-local "here")

something-local

(eval source)
(eval following-source)

(m/with-node "node1" '(println "Hello there node 1"))
(m/with-node "node2" '(println "Hello there node 1"))
(m/with-node "node1" source)
(m/with-node "node2" source)
(m/with-node "node1" following-source)
(m/with-node "node2" following-source)
(m/with-node "node2" 'something-local)
(m/with-node "node2" '(def something-local "there"))

(async
 (try
   @(m/with-node "non-existent" '(do (println "hello") 42))
   (catch :default e
     (println "Got an error here" e)
     42)))

(-> (m/with-node "non-existent" '(do (println "hello") 42))
    (catch* (fn [e] (println "Got an error here" e) 42)))

(try
  (m/with-node "non-existent" '(do (println "hello") 42))
  (catch :default e
    (println "Got an error here" e)
    42))

(try
  (/ 1 0)
  (catch :default e
    (println "Got an error here" e)
    :recovered))


(mesh/set-target! nil)