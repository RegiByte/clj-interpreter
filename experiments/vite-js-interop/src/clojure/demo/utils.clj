(ns demo.utils
  (:require ["../../utils/host" :as host]))

;; Pure Clojure utilities — no JS dependencies.
;; Tests that CLJ→CLJ symbol requires work correctly across the chain.

(defn multiply 
  "Multiplies two numbers together"
  [a b]
  (* a b))

(defn sum-of-squares [nums]
  (reduce + (mapv (fn [n] (* n n)) nums)))

(defn greet [name]
  (str "Hello, " name "!"))

(defn log-text [text]
  (. host logThere text))

(defn math-abs [x]
  (. js/Math abs x))

(defn math-sqrt [x]
  (. js/Math sqrt x))

(comment
  (log-text "Hi there!!")
  (inc 2)
  (println "Olá amandinha")
  (sum-of-squares [4 8])
  (println "Sum of squares" (sum-of-squares [4 8]))
  (multiply 2 3)
  (doc +)

  (js/Math.pow 3 2)

  (def x 10)
  x

  (log-text (str "x is " x))
  (log-text (str "(. js/Math abs -99) -> " (js/Math.abs -99)))
  (def x 20)

  (js/console.log "Hello from JS console.log!")
  
 )
