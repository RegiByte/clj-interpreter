(ns demo.utils
  (:require [clojure.string :as str]
            ["node:path" :as path]
            ["node:http" :as http]))

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


(. js/console log "Hello through console.log!!")

(map #(. js/Math pow % 2) [1 2 3 4 5])

(file-ext "foo.com/bar.cljss")

*ns*

(println "hi!")

(defn deep [n]
  (if (zero? n)
    :done
    (deep (dec n))))

(deep 3936)

(loop [n 1000000]
  (if (zero? n)
    :done
    (recur (dec n))))

(inc 2)