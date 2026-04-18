(ns dev)

(defn hello []
  (println "Hello, World!"))

(comment
  (hello)
  (def x 10)
  x

  (def div (js/document.createElement "div"))

  (println js/document)

  (describe (find-ns 'js))
  (js/Math.abs -10)

  (let [div (js/document.createElement "div")
        header (js/document.createElement "h1")
        text (js/document.createTextNode "Hello, World!")]
    (. header appendChild text)
    (. div appendChild header)
    (js/document.body.appendChild div)
    )
  
  (js/get (js/document.querySelectorAll "h1") 0)
  (. (js/document.querySelectorAll "h1") length)

  (. js/document title)
  
  (let [els (js/document.querySelectorAll "h1")])



  )