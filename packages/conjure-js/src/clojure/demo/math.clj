(ns demo.math)

;; (def pi 3.14159)
(def pi 3.14159)


(defn factorial [n]
  (loop [i n acc 1]
    (if (<= i 1)
      acc
      (recur (dec i) (* acc i)))))


(defn add
  "Adds two numbers together"
  [a b]
  (+ a b))

(defn square [x]
  (+ (* x x) 1))

#'pi

(var? #'pi)
(type #'pi)







(doc add)