(ns demo.utils
  (:require [clojure.string :as str]
            ["node:path" :as path]
            ["node:http" :as http]
            [cljam.date :as date]))


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
(js/console.log "Hello through console.log!!")

(map #(. js/Math pow % 2) [1 2 3 4 5])

(file-ext "foo.com/bar.cljss")

*ns*

(println "hi!")

(defn deep [n]
  (if (zero? n)
    :done
    (deep (dec n))))

;; Regular recursion is limited by the JS call stack.
;; In compiled mode, each Conjure call costs ~7 JS frames.
;; JS stack limit (~10k frames) / 7 ≈ ~1400 max recursion depth.
;; Contrast with loop/recur below — that is TCO and handles millions.
(deep 200)
(deep 500)
(deep 800)

(loop [n 1000000]
  (if (zero? n)
    :done
    (recur (dec n))))

(inc 2)

(comment

  (doc js/call)

  
  (date/to-iso (date/now))
  (date/now)

  (date/year (date/now))
  (date/month (date/now))
  (date/day (date/now))
  (date/hour (date/now))
  (let [date (date/from-iso "2026-04-05T12:55:30.000Z")]
    [(date/year date)
     (date/month date)
     (date/day date)
     (date/hour date)
     (date/minute date) 
     (date/second date)])
  (-> (date/from-iso "2026-04-05T12:55:30.000Z")
      (date/to-iso))
  
  (-> (date/now)
      (date/add-days 10)
      (date/to-iso))

  (-> (date/now)
      (date/add-days -2)
      (date/add-hours -3)
      (date/to-iso))
  
  (date/diff-days (date/from-iso "2026-04-05T12:55:30.000Z") 
                  (date/from-iso "2026-04-07T12:55:30.000Z"))

  (deep 800)
  (deep 1000)
  (deep 2000)
  (deep 3000)
  (deep 4000)
  (deep 5000)
  (deep 5500)
  (deep 5530)
  (deep 6000)
  (deep 6500)
  (deep 7000)
  (deep 7500)
  (deep 7778) ;; <-- new max
  )