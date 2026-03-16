(ns demo.format
  (:require ["date-fns" :as date-fns]))

;; This namespace proves the static import table is working:
;; date-fns is required as a string spec, which the plugin must scan at build time
;; and emit as a static import. At runtime, importModule("date-fns") is a synchronous
;; map lookup — no dynamic import() call in the bundle.

(defn format-iso [iso-string pattern]
  ;; parseISO("2024-01-15") → Date object; format(date, pattern) → "2024-01-15"
  (let [parse-iso (js/get date-fns "parseISO")
        fmt       (js/get date-fns "format")
        date      (js/call parse-iso iso-string)]
    (js/call fmt date pattern)))

(defn compare-dates [ts-a ts-b]
  ;; compareAsc works with numeric timestamps; returns -1, 0, or 1
  (let [compare-asc (js/get date-fns "compareAsc")]
    (js/call compare-asc ts-a ts-b)))
