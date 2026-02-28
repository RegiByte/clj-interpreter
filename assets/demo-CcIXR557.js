import{a,b as S,i as _,d as x,e as $,f as q,g as F,h as N,j as E,k as J,c as B,m as K}from"./session-DlbYrfaI.js";class d extends Error{context;constructor(t,e){super(t),this.name="ConversionError",this.context=e}}const M=new Set(["list","vector","map"]);function r(n){switch(n.kind){case"number":return n.value;case"string":return n.value;case"boolean":return n.value;case"nil":return null;case"keyword":return n.name.startsWith(":")?n.name.slice(1):n.name;case"symbol":return n.name;case"list":case"vector":return n.value.map(r);case"map":{const t={};for(const[e,s]of n.entries){if(M.has(e.kind))throw new d(`Rich key types (${e.kind}) are not supported in JS object conversion. Restructure your map to use string, keyword, or number keys.`,{key:e,value:s});const u=String(r(e));t[u]=r(s)}return t}case"function":case"native-function":{const t=n;return(...e)=>{const s=e.map(o),u=a(t,s);return r(u)}}case"macro":throw new d("Macros cannot be exported to JavaScript. Macros are compile-time constructs.",{macro:n})}}function o(n){if(n==null)return S();if(_(n))return n;switch(typeof n){case"number":return J(n);case"string":return E(n);case"boolean":return N(n);case"function":{const t=n;return F("js-fn",(...e)=>{const s=e.map(r),u=t(...s);return o(u)})}case"object":{if(Array.isArray(n))return x(n.map(o));const t=Object.entries(n).map(([e,s])=>[$(`:${e}`),o(s)]);return q(t)}default:throw new d(`Cannot convert JS value of type ${typeof n} to CljValue`,{value:n})}}let l=null;function m(){return l||(l=B({entries:[K]})),l}const g=m();g.loadFile(`(ns demo.math)

;; (def pi 3.14159)
(def pi 3.14159)

(defn add [a b]
  (+ a b))

(defn square [x]
  (* x x))

(defn factorial [n]
  (loop [i n acc 1]
    (if (<= i 1)
      acc
      (recur (dec i) (* acc i)))))`,"demo.math");const R=g.getNs("demo.math");r(R.bindings.get("pi"));const p=m();p.loadFile(`(ns demo
  (:require [demo.math :refer [pi square factorial] :as m]))

(def greeting "Hello from Clojure!")

(def add m/add)

(defn greet [name]
  (str greeting " Welcome, " name "!"))

(defn fibonacci [n]
  (loop [i 0 a 0 b 1]
    (if (= i n)
      a
      (recur (inc i) b (+ a b)))))
`,"demo");const c=p.getNs("demo"),b=r(c.bindings.get("pi"));function j(...n){const t=c.bindings.get("square"),e=n.map(o),s=a(t,e);return r(s)}function h(...n){const t=c.bindings.get("factorial"),e=n.map(o),s=a(t,e);return r(s)}const y=r(c.bindings.get("greeting"));function w(...n){const t=c.bindings.get("add"),e=n.map(o),s=a(t,e);return r(s)}function k(...n){const t=c.bindings.get("greet"),e=n.map(o),s=a(t,e);return r(s)}function C(...n){const t=c.bindings.get("fibonacci"),e=n.map(o),s=a(t,e);return r(s)}const A=document.getElementById("results");function i(n,t){const e=document.createElement("div");e.className="result",e.innerHTML=`<span class="label">${n}</span> → <span class="value">${JSON.stringify(t)}</span>`,A.appendChild(e)}function f(n){const t=document.createElement("h2");t.textContent=n,A.appendChild(t)}f("Values");i("greeting",y);i("pi",b);f("Functions");i("(add 3 4)",w(3,4));i("(square 7)",j(7));i("(factorial 10)",h(10));i('(greet "RegiByte")',k("RegiByte"));f("Fibonacci sequence");for(let n=0;n<=10;n++)i(`(fibonacci ${n})`,C(n));console.log("All Clojure imports working!");window.bindings={greeting:y,pi:b,add:w,square:j,factorial:h,greet:k,fibonacci:C};console.log(window.bindings);
