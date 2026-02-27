(ns demo.math)

;; (def pi 3.14159)
(def pi 3.14159)

(defn add [a b]
  (+ a b))

(defn square [x]
  (* x x))

(defn factorial [n]
  (loop [i n acc 1]
    (if (<= i 1)
      acc
      (recur (dec i) (* acc i)))))