(ns demo.math)

;; (def pi 3.14159)
(def pi 3.14159)


(defn factorial 
  "The classic factorial function.
   Uses loop/recur to avoid growing the stack, a single lexical env
   is used for the whole operation"
  [n]
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