(ns demo
  (:require [demo.math :refer [pi square factorial] :as m]))

(def greeting "Hello from Clojure!")

(def add m/add)

(defn greet [name]
  (str greeting " Welcome, " name "!"))

(defn fibonacci [n]
  (loop [i 0 a 0 b 1]
    (if (= i n)
      a
      (recur (inc i) b (+ a b)))))
