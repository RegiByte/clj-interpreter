(ns demo.utils
  (:require [clojure.string :as str]
            [cljam.date :as date]
            [cljam.integrant.core :as ig]
            [clojure.math :as math]
            [clojure.walk :as walk]
            [clojure.edn :as edn]
            ["node:path" :as path]
            ["node:http" :as http]
            ["node:fs" :as fs]))


(defn file-ext
  "Returns the extension (without dot) for a filename, or nil if no dot."
  [filename]
  (let [parts (str/split filename #"\.")]
    (when (> (count parts) 1)
      (last parts))))

(defn clj-file? [filename]
  (= (file-ext filename) "clj"))

(defn group-by-ext
  "Groups a collection of filenames by their extension."
  [filenames]
  (group-by file-ext filenames))

(comment
  (inc 2)
  (inc 3)
  (+ 1 2 3)

  (range 1 20)
  (->> (range 1 20 2)
       (map #(* math/TAU %)))


  (describe mapv)


  (+ 1 2 3)

  (describe some)


  (some even? [1 3])

  (def iatom (atom 1))
  @iatom

  (swap! iatom inc)
  (js/setTimeout #(do (println "Hello, World!") (swap! iatom inc)) 1000)
  (inc 3)

  (js/clearInterval @iatom)
  (reset! iatom nil)

  (let [t1 (js/setTimeout #(println "Hello, World! From timeout 1!") 5000)
        t2 (js/setTimeout #(do (js/clearTimeout t1) (println "Hello, World! From timeout 2!")) 3000)]
    [t1 t2])

  (cwd)
  (pwd)
  (cd "src")

  (def config-str (slurp "system.config.edn"))


  (meta #'+)

  (meta #'filter)

  (math/log 10)

  (pprint (describe (find-ns 'clojure.math)))

  (meta #'math/math-floor*)

  ;
  )