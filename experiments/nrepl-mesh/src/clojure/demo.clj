(ns demo
   (:require [mesh :as m]))

(+ 1 2 3)


(-> (m/list-nodes)
    (then println))

(mesh/set-target! "node2")

(println (+ 1 2))

m/*eval-target*

(m/with-node "node2" '(println "hello"))


(mesh/set-target! nil)