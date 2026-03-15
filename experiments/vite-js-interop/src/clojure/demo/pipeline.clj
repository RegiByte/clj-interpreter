(ns demo.pipeline
  (:require [demo.utils :as utils]
            [demo.format :as fmt]))

;; Multi-dependency namespace: CLJ→CLJ symbol requires chain.
;; Validates that a namespace depending on both a pure-CLJ ns and a string-require ns
;; can be loaded and evaluated correctly after build.

(defn process-numbers [nums]
  {:sum-of-squares (utils/sum-of-squares nums)
   :multiplied     (mapv (fn [n] (utils/multiply n 10)) nums)})

(defn pipeline-report [nums iso-date]
  (let [result (process-numbers nums)]
    (str "date=" (fmt/format-iso iso-date "yyyy-MM-dd")
         " sum-sq=" (get result :sum-of-squares)
         " multiplied=" (pr-str (get result :multiplied)))))
