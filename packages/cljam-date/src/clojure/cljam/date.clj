(ns cljam.date
  (:require [cljam.date.native :as n]))

; now — returns the current instant as a date value
(defn now [] (n/now*))

; from-millis — constructs a date from epoch milliseconds
(defn from-millis [ms] (n/from-millis* ms))

; from-iso — constructs a date from an ISO 8601 string
(defn from-iso [s] (n/from-iso* s))

; to-millis — returns the date as epoch milliseconds
(defn to-millis [d] (n/to-millis* d))

; to-iso — returns the date as an ISO 8601 string
(defn to-iso [d] (n/to-iso* d))

; year — returns the full year (e.g. 2026)
(defn year [d] (n/year* d))

; month — returns the month, 1-indexed (January = 1, December = 12)
(defn month [d] (n/month* d))

; day — returns the day of the month (1-31)
(defn day [d] (n/day* d))

; hour — returns the hours component (0-23)
(defn hour [d] (n/hour* d))

; minute — returns the minutes component (0-59)
(defn minute [d] (n/minute* d))

; second — returns the seconds component (0-59)
(defn second [d] (n/second* d))

; format — formats a date using Intl.DateTimeFormat
; 1-arity: system locale, default options
; 2-arity: explicit locale string, e.g. en-US
; 3-arity: locale + options map e.g. {:year numeric :month long}
(defn format
  ([d] (n/format* d nil nil))
  ([d locale] (n/format* d locale nil))
  ([d locale opts] (n/format* d locale opts)))

; add-days — returns a new date that is n days after d
(defn add-days [d n] (n/add-millis* d (* n 86400000)))
(defn add-hours [d n] (n/add-millis* d (* n 3600000)))

; diff-days — returns whole days between a and b (b minus a)
(defn diff-days [a b] (quot (- (to-millis b) (to-millis a)) 86400000))
