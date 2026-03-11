(ns demo
  (:require [mesh :as m]))

(+ 1 2 3)


(async
 (let [n [1 2 3]]
   (doseq [node n]
     (println node))))

(-> (m/list-nodes)
    (then (fn [nodes]
            (doseq [node nodes]
              (println node)))))



(mesh/set-target! nil)

(println (+ 1 2))

(+ 1 2 3)

(spit "test.txt" "hello")
(slurp "test.txt")


m/*eval-target*


(m/with-node "node2" '(println "hello"))


(mesh/set-target! nil)