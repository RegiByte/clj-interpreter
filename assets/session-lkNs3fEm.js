(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(s){if(s.ep)return;s.ep=!0;const a=n(s);fetch(s.href,a)}})();class X extends Error{context;constructor(t,n){super(t),this.name="TokenizerError",this.context=n}}class $ extends Error{context;pos;constructor(t,n,r){super(t),this.name="ParserError",this.context=n,this.pos=r}}class o extends Error{context;pos;constructor(t,n,r){super(t),this.name="EvaluationError",this.context=n,this.pos=r}}class ye{value;constructor(t){this.value=t}}const h={number:"number",string:"string",boolean:"boolean",keyword:"keyword",nil:"nil",symbol:"symbol",list:"list",vector:"vector",map:"map",function:"function",nativeFunction:"native-function",macro:"macro",multiMethod:"multi-method",atom:"atom",reduced:"reduced",volatile:"volatile",regex:"regex"},w={LParen:"LParen",RParen:"RParen",LBracket:"LBracket",RBracket:"RBracket",LBrace:"LBrace",RBrace:"RBrace",String:"String",Number:"Number",Keyword:"Keyword",Quote:"Quote",Quasiquote:"Quasiquote",Unquote:"Unquote",UnquoteSplicing:"UnquoteSplicing",Comment:"Comment",Whitespace:"Whitespace",Symbol:"Symbol",AnonFnStart:"AnonFnStart",Deref:"Deref",Regex:"Regex"},J={Quote:"quote",Quasiquote:"quasiquote",Unquote:"unquote",UnquoteSplicing:"unquote-splicing",LParen:"(",RParen:")",LBracket:"[",RBracket:"]",LBrace:"{",RBrace:"}"};function p(e){switch(e.kind){case h.number:return e.value.toString();case h.string:let t="";for(const n of e.value)switch(n){case'"':t+='\\"';break;case"\\":t+="\\\\";break;case`
`:t+="\\n";break;case"\r":t+="\\r";break;case"	":t+="\\t";break;default:t+=n}return`"${t}"`;case h.boolean:return e.value?"true":"false";case h.nil:return"nil";case h.keyword:return`${e.name}`;case h.symbol:return`${e.name}`;case h.list:return`(${e.value.map(p).join(" ")})`;case h.vector:return`[${e.value.map(p).join(" ")}]`;case h.map:return`{${e.entries.map(([n,r])=>`${p(n)} ${p(r)}`).join(" ")}}`;case h.function:{if(e.arities.length===1){const r=e.arities[0];return`(fn [${(r.restParam?[...r.params,{kind:"symbol",name:"&"},r.restParam]:r.params).map(p).join(" ")}] ${r.body.map(p).join(" ")})`}return`(fn ${e.arities.map(r=>`([${(r.restParam?[...r.params,{kind:"symbol",name:"&"},r.restParam]:r.params).map(p).join(" ")}] ${r.body.map(p).join(" ")})`).join(" ")})`}case h.nativeFunction:return`(native-fn ${e.name})`;case h.multiMethod:return`(multi-method ${e.name})`;case h.atom:return`#<Atom ${p(e.value)}>`;case h.reduced:return`#<Reduced ${p(e.value)}>`;case h.volatile:return`#<Volatile ${p(e.value)}>`;case h.regex:{const n=e.pattern.replace(/"/g,'\\"');return`#"${e.flags?`(?${e.flags})`:""}${n}"`}default:throw new o(`unhandled value type: ${e.kind}`,{value:e})}}function ge(e){return e.join(`
`)}class dt extends Error{context;constructor(t,n){super(t),this.context=n,this.name="EnvError"}}function pe(e){return{bindings:new Map,outer:e??null}}function ie(e,t){let n=t;for(;n;){if(n.bindings.has(e))return n.bindings.get(e);n=n.outer}throw new o(`Symbol ${e} not found`,{name:e})}function qe(e,t){let n=t;for(;n;){if(n.bindings.has(e))return n.bindings.get(e);n=n.outer}}function Y(e,t,n){n.bindings.set(e,t)}function ue(e,t,n){if(e.length!==t.length)throw new dt("Number of parameters and arguments must match",{params:e,args:t,outer:n});const r=pe(n);for(let s=0;s<e.length;s++)Y(e[s],t[s],r);return r}function se(e){let t=e;for(;t?.outer;)t=t.outer;return t}function be(e){let t=e;for(;t;){if(t.namespace)return t;t=t.outer}return se(e)}const A=e=>({kind:"number",value:e}),j=e=>({kind:"string",value:e}),v=e=>({kind:"boolean",value:e}),K=e=>({kind:"keyword",name:e}),b=()=>({kind:"nil",value:null}),T=e=>({kind:"symbol",name:e}),N=e=>({kind:"list",value:e}),F=e=>({kind:"vector",value:e}),B=e=>({kind:"map",entries:e}),Oe=(e,t)=>({kind:"function",arities:e,env:t}),c=(e,t)=>({kind:"native-function",name:e,fn:t}),W=(e,t)=>({kind:"native-function",name:e,fn:()=>{throw new o("Native function called without context",{name:e})},fnWithContext:t}),pt=(e,t)=>({kind:"macro",arities:e,env:t}),Qe=(e,t="")=>({kind:"regex",pattern:e,flags:t}),ht=e=>({kind:"atom",value:e}),Ue=e=>({kind:"reduced",value:e}),mt=e=>({kind:"volatile",value:e}),u=(e,t,n)=>({...e,meta:B([[K(":doc"),j(t)],...n?[[K(":arglists"),F(n.map(r=>F(r.map(T))))]]:[]])}),je=(e,t,n,r)=>({kind:"multi-method",name:e,dispatchFn:t,methods:n,defaultMethod:r});class le{args;constructor(t){this.args=t}}function Ne(e,t){const n=e.value.findIndex(a=>R(a)&&a.name==="&");let r=[],s=null;if(n===-1)r=e.value.map(a=>a);else{if(e.value.filter(i=>R(i)&&i.name==="&").length>1)throw new o("& can only appear once",{args:e,env:t});if(n!==e.value.length-2)throw new o("& must be second-to-last argument",{args:e,env:t});r=e.value.slice(0,n).map(i=>i),s=e.value[n+1]}return{params:r,restParam:s}}function Ae(e,t){if(e.length===0)throw new o("fn/defmacro requires at least a parameter vector",{forms:e,env:t});if(E(e[0])){const n=e[0];if(n.value.some(a=>!R(a)))throw new o("Parameters must be symbols",{paramVec:n,env:t});const{params:r,restParam:s}=Ne(n,t);return[{params:r,restParam:s,body:e.slice(1)}]}if(q(e[0])){const n=[];for(const s of e){if(!q(s)||s.value.length===0)throw new o("Multi-arity clause must be a list starting with a parameter vector",{form:s,env:t});const a=s.value[0];if(!E(a))throw new o("First element of arity clause must be a parameter vector",{paramVec:a,env:t});if(a.value.some(f=>!R(f)))throw new o("Parameters must be symbols",{paramVec:a,env:t});const{params:i,restParam:l}=Ne(a,t);n.push({params:i,restParam:l,body:s.value.slice(1)})}if(n.filter(s=>s.restParam!==null).length>1)throw new o("At most one variadic arity is allowed per function",{forms:e,env:t});return n}throw new o("fn/defmacro expects a parameter vector or arity clauses",{forms:e,env:t})}function Ke(e,t,n,r){const s=e.map(i=>i.name),a=n.slice(0,s.length);if(t===null){if(n.length!==e.length)throw new o(`Arguments length mismatch: fn accepts ${e.length} arguments, but ${n.length} were provided`,{params:e,args:n,outerEnv:r})}else{if(n.length<e.length)throw new o(`Arguments length mismatch: fn expects at least ${e.length} arguments, but ${n.length} were provided`,{params:e,args:n,outerEnv:r});const i=n.slice(s.length),l=i.length>0?N(i):b();return s.push(t.name),a.push(l),ue(s,a,r)}return ue(s,a,r)}function _e(e,t){const n=e.find(a=>a.restParam===null&&a.params.length===t);if(n)return n;const r=e.find(a=>a.restParam!==null&&t>=a.params.length);if(r)return r;const s=e.map(a=>a.restParam?`${a.params.length}+`:`${a.params.length}`);throw new o(`No matching arity for ${t} arguments. Available arities: ${s.join(", ")}`,{arities:e,argCount:t})}let gt=0;function Je(e="G"){return`${e}__${gt++}`}function we(e,t,n=new Map,r){switch(e.kind){case h.vector:case h.list:{const s=q(e);if(s&&e.value.length===2&&R(e.value[0])&&e.value[0].name==="unquote")return r.evaluate(e.value[1],t);const a=[];for(const i of e.value){if(q(i)&&i.value.length===2&&R(i.value[0])&&i.value[0].name==="unquote-splicing"){const l=r.evaluate(i.value[1],t);if(!q(l)&&!E(l))throw new o("Unquote-splicing must evaluate to a list or vector",{elem:i,env:t});a.push(...l.value);continue}a.push(we(i,t,n,r))}return s?N(a):F(a)}case h.map:{const s=[];for(const[a,i]of e.entries){const l=we(a,t,n,r),f=we(i,t,n,r);s.push([l,f])}return B(s)}case h.number:case h.string:case h.boolean:case h.keyword:case h.nil:return e;case h.symbol:return e.name.endsWith("#")?(n.has(e.name)||n.set(e.name,Je(e.name.slice(0,-1))),{kind:"symbol",name:n.get(e.name)}):e;default:throw new o(`Unexpected form: ${e.kind}`,{form:e,env:t})}}function Ge(e){Fe(e,!0)}function wt(e){return q(e)&&e.value.length>=1&&R(e.value[0])&&e.value[0].name===H.recur}function Fe(e,t){for(let n=0;n<e.length;n++)ne(e[n],t&&n===e.length-1)}function ne(e,t){if(!q(e))return;if(wt(e)){if(!t)throw new o("Can only recur from tail position",{form:e});return}if(e.value.length===0)return;const n=e.value[0];if(!R(n)){for(const s of e.value)ne(s,!1);return}const r=n.name;if(!(r===H.fn||r===H.loop||r===H.quote||r===H.quasiquote)){if(r===H.if){e.value[1]&&ne(e.value[1],!1),e.value[2]&&ne(e.value[2],t),e.value[3]&&ne(e.value[3],t);return}if(r===H.do){Fe(e.value.slice(1),t);return}if(r===H.let){const s=e.value[1];if(E(s))for(let a=1;a<s.value.length;a+=2)ne(s.value[a],!1);Fe(e.value.slice(2),t);return}for(const s of e.value.slice(1))ne(s,!1)}}const H={quote:"quote",def:"def",if:"if",do:"do",let:"let",fn:"fn",defmacro:"defmacro",quasiquote:"quasiquote",ns:"ns",loop:"loop",recur:"recur",defmulti:"defmulti",defmethod:"defmethod",try:"try"};function vt(e){return c(`kw:${e.name}`,(...t)=>{const n=t[0];if(!I(n))return b();const r=n.entries.find(([s])=>C(s,e));return r?r[1]:b()})}function yt(e,t,n){const r=e.value.slice(1),s=[],a=[];let i=null;for(let m=0;m<r.length;m++){const g=r[m];if(q(g)&&g.value.length>0&&R(g.value[0])){const k=g.value[0].name;if(k==="catch"){if(g.value.length<3)throw new o("catch requires a discriminator and a binding symbol",{form:g,env:t});const x=g.value[1],y=g.value[2];if(!R(y))throw new o("catch binding must be a symbol",{form:g,env:t});a.push({discriminator:x,binding:y.name,body:g.value.slice(3)});continue}if(k==="finally"){if(m!==r.length-1)throw new o("finally clause must be the last in try expression",{form:g,env:t});i=g.value.slice(1);continue}}s.push(g)}function l(m,g){const k=n.evaluate(m,t);if(U(k)){if(k.name===":default")return!0;if(!I(g))return!1;const x=g.entries.find(([y])=>U(y)&&y.name===":type");return x?C(x[1],k):!1}if(M(k)){const x=n.applyFunction(k,[g],t);return Se(x)}throw new o("catch discriminator must be a keyword or a predicate function",{discriminator:k,env:t})}let f=b(),d=null;try{f=n.evaluateForms(s,t)}catch(m){if(m instanceof le)throw m;let g;if(m instanceof ye)g=m.value;else if(m instanceof o)g=B([[K(":type"),K(":error/runtime")],[K(":message"),j(m.message)]]);else throw m;let k=!1;for(const x of a)if(l(x.discriminator,g)){const y=ue([x.binding],[g],t);f=n.evaluateForms(x.body,y),k=!0;break}k||(d=m)}finally{i&&n.evaluateForms(i,t)}if(d!==null)throw d;return f}function kt(e,t,n){return e.value[1]}function bt(e,t,n){return we(e.value[1],t,new Map,n)}function xt(e,t,n){const r=e.value[1];if(r.kind!=="symbol")throw new o("First element of list must be a symbol",{name:r,list:e,env:t});return e.value[2]===void 0||Y(r.name,n.evaluate(e.value[2],t),be(t)),b()}const $t=(e,t,n)=>b();function Rt(e,t,n){const r=n.evaluate(e.value[1],t);return ke(r)?e.value[3]?n.evaluate(e.value[3],t):b():n.evaluate(e.value[2],t)}function qt(e,t,n){return n.evaluateForms(e.value.slice(1),t)}function jt(e,t,n){const r=e.value[1];if(!E(r))throw new o("Bindings must be a vector",{bindings:r,env:t});if(r.value.length%2!==0)throw new o("Bindings must be a balanced pair of keys and values",{bindings:r,env:t});const s=e.value.slice(2);let a=t;for(let i=0;i<r.value.length;i+=2){const l=r.value[i];if(!R(l))throw new o("Keys must be symbols",{key:l,env:t});const f=n.evaluate(r.value[i+1],a);a=ue([l.name],[f],a)}return n.evaluateForms(s,a)}function Ft(e,t,n){const r=Ae(e.value.slice(1),t);for(const s of r)Ge(s.body);return Oe(r,t)}function St(e,t,n){const r=e.value[1];if(!R(r))throw new o("First element of defmacro must be a symbol",{name:r,list:e,env:t});const s=Ae(e.value.slice(2),t),a=pt(s,t);return Y(r.name,a,se(t)),b()}function Et(e,t,n){const r=e.value[1];if(!E(r))throw new o("loop bindings must be a vector",{loopBindings:r,env:t});if(r.value.length%2!==0)throw new o("loop bindings must be a balanced pair of keys and values",{loopBindings:r,env:t});const s=e.value.slice(2);Ge(s);const a=[];let i=t;for(let f=0;f<r.value.length;f+=2){const d=r.value[f];if(!R(d))throw new o("loop binding keys must be symbols",{key:d,env:t});a.push(d.name);const m=n.evaluate(r.value[f+1],i);i=ue([d.name],[m],i)}let l=a.map(f=>ie(f,i));for(;;){const f=ue(a,l,t);try{return n.evaluateForms(s,f)}catch(d){if(d instanceof le){if(d.args.length!==a.length)throw new o(`recur expects ${a.length} arguments but got ${d.args.length}`,{list:e,env:t});l=d.args;continue}throw d}}}function At(e,t,n){const r=e.value.slice(1).map(s=>n.evaluate(s,t));throw new le(r)}function It(e,t,n){const r=e.value[1];if(!R(r))throw new o("defmulti: first argument must be a symbol",{list:e,env:t});const s=e.value[2];let a;if(U(s))a=vt(s);else{const l=n.evaluate(s,t);if(!M(l))throw new o("defmulti: dispatch-fn must be a function or keyword",{list:e,env:t});a=l}const i=je(r.name,a,[]);return Y(r.name,i,be(t)),b()}function Ct(e,t,n){const r=e.value[1];if(!R(r))throw new o("defmethod: first argument must be a symbol",{list:e,env:t});const s=n.evaluate(e.value[2],t),a=ie(r.name,t);if(!He(a))throw new o(`defmethod: ${r.name} is not a multimethod`,{list:e,env:t});const i=Ae([e.value[3],...e.value.slice(4)],t),l=Oe(i,t),f=U(s)&&s.name===":default";let d;if(f)d=je(a.name,a.dispatchFn,a.methods,l);else{const m=a.methods.filter(g=>!C(g.dispatchVal,s));d=je(a.name,a.dispatchFn,[...m,{dispatchVal:s,fn:l}])}return Y(r.name,d,be(t)),b()}const Pt={try:yt,quote:kt,quasiquote:bt,def:xt,ns:$t,if:Rt,do:qt,let:jt,fn:Ft,defmacro:St,loop:Et,recur:At,defmulti:It,defmethod:Ct};function Mt(e,t,n,r){const s=Pt[e];if(s)return s(t,n,r);throw new o(`Unknown special form: ${e}`,{symbol:e,list:t,env:n})}const Ut=e=>e.kind==="nil",ke=e=>e.kind==="nil"?!0:e.kind==="boolean"?!e.value:!1,Se=e=>!ke(e),Nt=e=>e.kind==="symbol"&&e.name in H,R=e=>e.kind==="symbol",E=e=>e.kind==="vector",q=e=>e.kind==="list",Tt=e=>e.kind==="function",Lt=e=>e.kind==="native-function",Ee=e=>e.kind==="macro",I=e=>e.kind==="map",U=e=>e.kind==="keyword",M=e=>Tt(e)||Lt(e),He=e=>e.kind==="multi-method",me=e=>e.kind==="atom",ae=e=>e.kind==="reduced",ve=e=>e.kind==="volatile",Xe=e=>e.kind==="regex",P=e=>E(e)||I(e)||q(e),rr=e=>typeof e=="object"&&e!==null&&"kind"in e&&e.kind in h,Bt={[h.number]:(e,t)=>e.value===t.value,[h.string]:(e,t)=>e.value===t.value,[h.boolean]:(e,t)=>e.value===t.value,[h.nil]:()=>!0,[h.symbol]:(e,t)=>e.name===t.name,[h.keyword]:(e,t)=>e.name===t.name,[h.vector]:(e,t)=>e.value.length!==t.value.length?!1:e.value.every((n,r)=>C(n,t.value[r])),[h.map]:(e,t)=>{if(e.entries.length!==t.entries.length)return!1;const n=new Set([...e.entries.map(([r])=>r),...t.entries.map(([r])=>r)]);for(const r of n){const s=e.entries.find(([i])=>C(i,r));if(!s)return!1;const a=t.entries.find(([i])=>C(i,r));if(!a||!C(s[1],a[1]))return!1}return!0},[h.list]:(e,t)=>e.value.length!==t.value.length?!1:e.value.every((n,r)=>C(n,t.value[r])),[h.atom]:(e,t)=>e===t,[h.reduced]:(e,t)=>C(e.value,t.value),[h.volatile]:(e,t)=>e===t,[h.regex]:(e,t)=>e===t},C=(e,t)=>{if(e.kind!==t.kind)return!1;const n=Bt[e.kind];return n?n(e,t):!1},Wt={"+":u(c("+",(...e)=>{if(e.length===0)return A(0);if(e.some(t=>t.kind!=="number"))throw new o("+ expects all arguments to be numbers",{args:e});return e.reduce((t,n)=>A(t.value+n.value),A(0))}),"Returns the sum of the arguments. Throws on non-number arguments.",[["&","nums"]]),"-":u(c("-",(...e)=>{if(e.length===0)throw new o("- expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("- expects all arguments to be numbers",{args:e});return e.slice(1).reduce((t,n)=>A(t.value-n.value),e[0])}),"Returns the difference of the arguments. Throws on non-number arguments.",[["&","nums"]]),"*":u(c("*",(...e)=>{if(e.length===0)return A(1);if(e.some(t=>t.kind!=="number"))throw new o("* expects all arguments to be numbers",{args:e});return e.slice(1).reduce((t,n)=>A(t.value*n.value),e[0])}),"Returns the product of the arguments. Throws on non-number arguments.",[["&","nums"]]),"/":u(c("/",(...e)=>{if(e.length===0)throw new o("/ expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("/ expects all arguments to be numbers",{args:e});return e.slice(1).reduce((t,n)=>{if(n.value===0)throw new o("division by zero",{args:e});return A(t.value/n.value)},e[0])}),"Returns the quotient of the arguments. Throws on non-number arguments or division by zero.",[["&","nums"]]),">":u(c(">",(...e)=>{if(e.length<2)throw new o("> expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("> expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value>=e[t-1].value)return v(!1);return v(!0)}),"Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.",[["&","nums"]]),"<":u(c("<",(...e)=>{if(e.length<2)throw new o("< expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("< expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value<=e[t-1].value)return v(!1);return v(!0)}),"Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.",[["&","nums"]]),">=":u(c(">=",(...e)=>{if(e.length<2)throw new o(">= expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o(">= expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value>e[t-1].value)return v(!1);return v(!0)}),"Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.",[["&","nums"]]),"<=":u(c("<=",(...e)=>{if(e.length<2)throw new o("<= expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("<= expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value<e[t-1].value)return v(!1);return v(!0)}),"Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.",[["&","nums"]]),"=":u(c("=",(...e)=>{if(e.length<2)throw new o("= expects at least two arguments",{args:e});for(let t=1;t<e.length;t++)if(!C(e[t],e[t-1]))return v(!1);return v(!0)}),"Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.",[["&","vals"]]),inc:u(c("inc",e=>{if(e===void 0||e.kind!=="number")throw new o(`inc expects a number${e!==void 0?`, got ${p(e)}`:""}`,{x:e});return A(e.value+1)}),"Returns the argument incremented by 1. Throws on non-number arguments.",[["x"]]),dec:u(c("dec",e=>{if(e===void 0||e.kind!=="number")throw new o(`dec expects a number${e!==void 0?`, got ${p(e)}`:""}`,{x:e});return A(e.value-1)}),"Returns the argument decremented by 1. Throws on non-number arguments.",[["x"]]),max:u(c("max",(...e)=>{if(e.length===0)throw new o("max expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("max expects all arguments to be numbers",{args:e});return e.reduce((t,n)=>n.value>t.value?n:t)}),"Returns the largest of the arguments. Throws on non-number arguments.",[["&","nums"]]),min:u(c("min",(...e)=>{if(e.length===0)throw new o("min expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("min expects all arguments to be numbers",{args:e});return e.reduce((t,n)=>n.value<t.value?n:t)}),"Returns the smallest of the arguments. Throws on non-number arguments.",[["&","nums"]]),mod:u(c("mod",(e,t)=>{if(e===void 0||e.kind!=="number")throw new o(`mod expects a number as first argument${e!==void 0?`, got ${p(e)}`:""}`,{n:e});if(t===void 0||t.kind!=="number")throw new o(`mod expects a number as second argument${t!==void 0?`, got ${p(t)}`:""}`,{d:t});if(t.value===0)throw new o("mod: division by zero",{n:e,d:t});const n=e.value%t.value;return A(n<0?n+Math.abs(t.value):n)}),"Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.",[["n","d"]]),"even?":u(c("even?",e=>{if(e===void 0||e.kind!=="number")throw new o(`even? expects a number${e!==void 0?`, got ${p(e)}`:""}`,{n:e});return v(e.value%2===0)}),"Returns true if the argument is an even number, false otherwise.",[["n"]]),"odd?":u(c("odd?",e=>{if(e===void 0||e.kind!=="number")throw new o(`odd? expects a number${e!==void 0?`, got ${p(e)}`:""}`,{n:e});return v(Math.abs(e.value)%2!==0)}),"Returns true if the argument is an odd number, false otherwise.",[["n"]]),"pos?":u(c("pos?",e=>{if(e===void 0||e.kind!=="number")throw new o(`pos? expects a number${e!==void 0?`, got ${p(e)}`:""}`,{n:e});return v(e.value>0)}),"Returns true if the argument is a positive number, false otherwise.",[["n"]]),"neg?":u(c("neg?",e=>{if(e===void 0||e.kind!=="number")throw new o(`neg? expects a number${e!==void 0?`, got ${p(e)}`:""}`,{n:e});return v(e.value<0)}),"Returns true if the argument is a negative number, false otherwise.",[["n"]]),"zero?":u(c("zero?",e=>{if(e===void 0||e.kind!=="number")throw new o(`zero? expects a number${e!==void 0?`, got ${p(e)}`:""}`,{n:e});return v(e.value===0)}),"Returns true if the argument is zero, false otherwise.",[["n"]])},zt={atom:u(c("atom",e=>ht(e)),"Returns a new atom holding the given value.",[["value"]]),deref:u(c("deref",e=>{if(me(e)||ve(e)||ae(e))return e.value;throw new o(`deref expects an atom, volatile, or reduced value, got ${e.kind}`,{value:e})}),"Returns the wrapped value from an atom, volatile, or reduced value.",[["value"]]),"swap!":u(W("swap!",(e,t,n,r,...s)=>{if(!me(n))throw new o(`swap! expects an atom as its first argument, got ${n.kind}`,{atomVal:n});if(!M(r))throw new o(`swap! expects a function as its second argument, got ${r.kind}`,{fn:r});const a=e.applyFunction(r,[n.value,...s],t);return n.value=a,a}),"Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.",[["atomVal","fn","&","extraArgs"]]),"reset!":u(c("reset!",(e,t)=>{if(!me(e))throw new o(`reset! expects an atom as its first argument, got ${e.kind}`,{atomVal:e});return e.value=t,t}),"Sets the value of the atom to newVal and returns the new value.",[["atomVal","newVal"]]),"atom?":u(c("atom?",e=>v(me(e))),"Returns true if the value is an atom, false otherwise.",[["value"]])};function O(e){switch(e.kind){case h.string:return e.value;case h.number:return e.value.toString();case h.boolean:return e.value?"true":"false";case h.keyword:return e.name;case h.symbol:return e.name;case h.list:return`(${e.value.map(O).join(" ")})`;case h.vector:return`[${e.value.map(O).join(" ")}]`;case h.map:return`{${e.entries.map(([t,n])=>`${O(t)} ${O(n)}`).join(" ")}}`;case h.function:{if(e.arities.length===1){const n=e.arities[0];return`(fn [${(n.restParam?[...n.params,{kind:"symbol",name:"&"},n.restParam]:n.params).map(O).join(" ")}] ${n.body.map(O).join(" ")})`}return`(fn ${e.arities.map(n=>`([${(n.restParam?[...n.params,{kind:"symbol",name:"&"},n.restParam]:n.params).map(O).join(" ")}] ${n.body.map(O).join(" ")})`).join(" ")})`}case h.nativeFunction:return`(native-fn ${e.name})`;case h.nil:return"nil";case h.regex:return`${e.flags?`(?${e.flags})`:""}${e.pattern}`;default:throw new o(`unhandled value type: ${e.kind}`,{value:e})}}const Q=e=>{if(q(e)||E(e))return e.value;if(I(e))return e.entries.map(([t,n])=>F([t,n]));throw new o(`toSeq expects a collection, got ${p(e)}`,{collection:e})},Dt={list:u(c("list",(...e)=>e.length===0?N([]):N(e)),"Returns a new list containing the given values.",[["&","args"]]),vector:u(c("vector",(...e)=>e.length===0?F([]):F(e)),"Returns a new vector containing the given values.",[["&","args"]]),"hash-map":u(c("hash-map",(...e)=>{if(e.length===0)return B([]);if(e.length%2!==0)throw new o(`hash-map expects an even number of arguments, got ${e.length}`,{args:e});const t=[];for(let n=0;n<e.length;n+=2){const r=e[n],s=e[n+1];t.push([r,s])}return B(t)}),"Returns a new hash-map containing the given key-value pairs.",[["&","kvals"]]),seq:u(c("seq",e=>{if(e.kind==="nil")return b();if(!P(e))throw new o(`seq expects a collection or nil, got ${p(e)}`,{collection:e});const t=Q(e);return t.length===0?b():N(t)}),"Returns a sequence of the given collection.",[["coll"]]),first:u(c("first",e=>{if(!P(e))throw new o("first expects a collection",{collection:e});const t=Q(e);return t.length===0?b():t[0]}),"Returns the first element of the given collection.",[["coll"]]),rest:u(c("rest",e=>{if(!P(e))throw new o("rest expects a collection",{collection:e});if(q(e))return e.value.length===0?e:N(e.value.slice(1));if(E(e))return F(e.value.slice(1));if(I(e))return e.entries.length===0?e:B(e.entries.slice(1));throw new o(`rest expects a collection, got ${p(e)}`,{collection:e})}),"Returns a sequence of the given collection excluding the first element.",[["coll"]]),conj:u(c("conj",(e,...t)=>{if(!e)throw new o("conj expects a collection as first argument",{collection:e});if(t.length===0)return e;if(!P(e))throw new o(`conj expects a collection, got ${p(e)}`,{collection:e});if(q(e)){const n=[];for(let r=t.length-1;r>=0;r--)n.push(t[r]);return N([...n,...e.value])}if(E(e))return F([...e.value,...t]);if(I(e)){const n=[...e.entries];for(let r=0;r<t.length;r+=1){const s=t[r];if(s.kind!=="vector")throw new o(`conj on maps expects each argument to be a vector key-pair for maps, got ${p(s)}`,{pair:s});if(s.value.length!==2)throw new o(`conj on maps expects each argument to be a vector key-pair for maps, got ${p(s)}`,{pair:s});const a=s.value[0],i=n.findIndex(l=>C(l[0],a));i===-1?n.push([a,s.value[1]]):n[i]=[a,s.value[1]]}return B([...n])}throw new o(`unhandled collection type, got ${p(e)}`,{collection:e})}),"Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail.",[["collection","&","args"]]),cons:u(c("cons",(e,t)=>{if(!P(t))throw new o(`cons expects a collection as second argument, got ${p(t)}`,{xs:t});if(I(t))throw new o("cons on maps is not supported, use vectors instead",{xs:t});const n=q(t)?N:F,r=[e,...t.value];return n(r)}),"Returns a new collection with x prepended to the head of xs.",[["x","xs"]]),assoc:u(c("assoc",(e,...t)=>{if(!e)throw new o("assoc expects a collection as first argument",{collection:e});if(q(e))throw new o("assoc on lists is not supported, use vectors instead",{collection:e});if(!P(e))throw new o(`assoc expects a collection, got ${p(e)}`,{collection:e});if(t.length<2)throw new o("assoc expects at least two arguments",{args:t});if(t.length%2!==0)throw new o("assoc expects an even number of binding arguments",{args:t});if(E(e)){const n=[...e.value];for(let r=0;r<t.length;r+=2){const s=t[r];if(s.kind!=="number")throw new o(`assoc on vectors expects each key argument to be a index (number), got ${p(s)}`,{index:s});if(s.value>n.length)throw new o(`assoc index ${s.value} is out of bounds for vector of length ${n.length}`,{index:s,collection:e});n[s.value]=t[r+1]}return F(n)}if(I(e)){const n=[...e.entries];for(let r=0;r<t.length;r+=2){const s=t[r],a=t[r+1],i=n.findIndex(l=>C(l[0],s));i===-1?n.push([s,a]):n[i]=[s,a]}return B(n)}throw new o(`unhandled collection type, got ${p(e)}`,{collection:e})}),"Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.",[["collection","&","kvals"]]),dissoc:u(c("dissoc",(e,...t)=>{if(!e)throw new o("dissoc expects a collection as first argument",{collection:e});if(q(e))throw new o("dissoc on lists is not supported, use vectors instead",{collection:e});if(!P(e))throw new o(`dissoc expects a collection, got ${p(e)}`,{collection:e});if(E(e)){if(e.value.length===0)return e;const n=[...e.value];for(let r=0;r<t.length;r+=1){const s=t[r];if(s.kind!=="number")throw new o(`dissoc on vectors expects each key argument to be a index (number), got ${p(s)}`,{index:s});if(s.value>=n.length)throw new o(`dissoc index ${s.value} is out of bounds for vector of length ${n.length}`,{index:s,collection:e});n.splice(s.value,1)}return F(n)}if(I(e)){if(e.entries.length===0)return e;const n=[...e.entries];for(let r=0;r<t.length;r+=1){const s=t[r],a=n.findIndex(i=>C(i[0],s));if(a===-1)return e;n.splice(a,1)}return B(n)}throw new o(`unhandled collection type, got ${p(e)}`,{collection:e})}),"Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.",[["collection","&","keys"]]),get:u(c("get",(e,t,n)=>{const r=n??b();switch(e.kind){case h.map:{const s=e.entries;for(const[a,i]of s)if(C(a,t))return i;return r}case h.vector:{const s=e.value;if(t.kind!=="number")throw new o("get on vectors expects a 0-based index as parameter",{key:t});return t.value<0||t.value>=s.length?r:s[t.value]}default:return r}}),"Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.",[["target","key"],["target","key","not-found"]]),nth:u(c("nth",(e,t,n)=>{if(e===void 0||!q(e)&&!E(e))throw new o(`nth expects a list or vector${e!==void 0?`, got ${p(e)}`:""}`,{coll:e});if(t===void 0||t.kind!=="number")throw new o(`nth expects a number index${t!==void 0?`, got ${p(t)}`:""}`,{n:t});const r=t.value,s=e.value;if(r<0||r>=s.length){if(n!==void 0)return n;throw new o(`nth index ${r} is out of bounds for collection of length ${s.length}`,{coll:e,n:t})}return s[r]}),"Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.",[["coll","n","not-found"]]),concat:u(c("concat",(...e)=>{const t=[];for(const n of e){if(!P(n))throw new o(`concat expects collections, got ${p(n)}`,{coll:n});t.push(...Q(n))}return N(t)}),"Returns a new sequence that is the concatenation of the given sequences.",[["&","colls"]]),zipmap:u(c("zipmap",(e,t)=>{if(e===void 0||!P(e))throw new o(`zipmap expects a collection as first argument${e!==void 0?`, got ${p(e)}`:""}`,{ks:e});if(t===void 0||!P(t))throw new o(`zipmap expects a collection as second argument${t!==void 0?`, got ${p(t)}`:""}`,{vs:t});const n=Q(e),r=Q(t),s=Math.min(n.length,r.length),a=[];for(let i=0;i<s;i++)a.push([n[i],r[i]]);return B(a)}),"Returns a new map with the keys and values of the given collections.",[["ks","vs"]]),last:u(c("last",e=>{if(e===void 0||!q(e)&&!E(e))throw new o(`last expects a list or vector${e!==void 0?`, got ${p(e)}`:""}`,{coll:e});const t=e.value;return t.length===0?b():t[t.length-1]}),"Returns the last element of the given collection.",[["coll"]]),reverse:u(c("reverse",e=>{if(e===void 0||!q(e)&&!E(e))throw new o(`reverse expects a list or vector${e!==void 0?`, got ${p(e)}`:""}`,{coll:e});return N([...e.value].reverse())}),"Returns a new sequence with the elements of the given collection in reverse order.",[["coll"]]),"empty?":u(c("empty?",e=>{if(e===void 0||!P(e))throw new o(`empty? expects a collection${e!==void 0?`, got ${p(e)}`:""}`,{coll:e});return v(Q(e).length===0)}),"Returns true if the given collection is empty, false otherwise.",[["coll"]]),repeat:u(c("repeat",(e,t)=>{if(e===void 0||e.kind!=="number")throw new o(`repeat expects a number as first argument${e!==void 0?`, got ${p(e)}`:""}`,{n:e});return N(Array(e.value).fill(t))}),"Returns a sequence of n copies of x.",[["n","x"]]),range:u(c("range",(...e)=>{if(e.length===0||e.length>3)throw new o("range expects 1, 2, or 3 arguments: (range n), (range start end), or (range start end step)",{args:e});if(e.some(a=>a.kind!=="number"))throw new o("range expects number arguments",{args:e});let t,n,r;if(e.length===1?(t=0,n=e[0].value,r=1):e.length===2?(t=e[0].value,n=e[1].value,r=1):(t=e[0].value,n=e[1].value,r=e[2].value),r===0)throw new o("range step cannot be zero",{args:e});const s=[];if(r>0)for(let a=t;a<n;a+=r)s.push(A(a));else for(let a=t;a>n;a+=r)s.push(A(a));return N(s)}),"Returns a sequence of numbers from start (inclusive) to end (exclusive), incrementing by step. If step is positive, the sequence is generated from start to end, otherwise it is generated from end to start.",[["n"],["start","end"],["start","end","step"]]),keys:u(c("keys",e=>{if(e===void 0||!I(e))throw new o(`keys expects a map${e!==void 0?`, got ${p(e)}`:""}`,{m:e});return F(e.entries.map(([t])=>t))}),"Returns a vector of the keys of the given map.",[["m"]]),vals:u(c("vals",e=>{if(e===void 0||!I(e))throw new o(`vals expects a map${e!==void 0?`, got ${p(e)}`:""}`,{m:e});return F(e.entries.map(([,t])=>t))}),"Returns a vector of the values of the given map.",[["m"]]),count:u(c("count",e=>{if(![h.list,h.vector,h.map,h.string].includes(e.kind))throw new o(`count expects a countable value, got ${p(e)}`,{countable:e});switch(e.kind){case h.list:return A(e.value.length);case h.vector:return A(e.value.length);case h.map:return A(e.entries.length);case h.string:return A(e.value.length);default:throw new o(`count expects a countable value, got ${p(e)}`,{countable:e})}}),"Returns the number of elements in the given countable value.",[["countable"]])},Ot={throw:u(c("throw",(...e)=>{throw e.length!==1?new o(`throw requires exactly 1 argument, got ${e.length}`,{args:e}):new ye(e[0])}),"Throws a value as an exception. The value may be any CljValue; maps are idiomatic.",[["value"]]),"ex-info":u(c("ex-info",(...e)=>{if(e.length<2)throw new o(`ex-info requires at least 2 arguments, got ${e.length}`,{args:e});const[t,n,r]=e;if(t.kind!=="string")throw new o("ex-info: first argument must be a string",{msg:t});const s=[[K(":message"),t],[K(":data"),n]];return r!==void 0&&s.push([K(":cause"),r]),B(s)}),"Creates an error map with :message and :data keys. Optionally accepts a :cause.",[["msg","data"],["msg","data","cause"]]),"ex-message":u(c("ex-message",(...e)=>{const[t]=e;if(!I(t))return b();const n=t.entries.find(([r])=>U(r)&&r.name===":message");return n?n[1]:b()}),"Returns the :message of an error map, or nil.",[["e"]]),"ex-data":u(c("ex-data",(...e)=>{const[t]=e;if(!I(t))return b();const n=t.entries.find(([r])=>U(r)&&r.name===":data");return n?n[1]:b()}),"Returns the :data map of an error map, or nil.",[["e"]]),"ex-cause":u(c("ex-cause",(...e)=>{const[t]=e;if(!I(t))return b();const n=t.entries.find(([r])=>U(r)&&r.name===":cause");return n?n[1]:b()}),"Returns the :cause of an error map, or nil.",[["e"]])},Qt={reduce:u(W("reduce",(e,t,n,...r)=>{if(n===void 0||!M(n))throw new o(`reduce expects a function as first argument${n!==void 0?`, got ${p(n)}`:""}`,{fn:n});if(r.length===0||r.length>2)throw new o("reduce expects 2 or 3 arguments: (reduce f coll) or (reduce f init coll)",{fn:n});const s=r.length===2,a=s?r[0]:void 0,i=s?r[1]:r[0];if(!P(i))throw new o(`reduce expects a collection, got ${p(i)}`,{collection:i});const l=Q(i);if(!s){if(l.length===0)throw new o("reduce called on empty collection with no initial value",{fn:n});if(l.length===1)return l[0];let d=l[0];for(let m=1;m<l.length;m++){const g=e.applyFunction(n,[d,l[m]],t);if(ae(g))return g.value;d=g}return d}let f=a;for(const d of l){const m=e.applyFunction(n,[f,d],t);if(ae(m))return m.value;f=m}return f}),"Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).",[["f","coll"],["f","val","coll"]]),apply:u(W("apply",(e,t,n,...r)=>{if(n===void 0||!M(n))throw new o(`apply expects a function as first argument${n!==void 0?`, got ${p(n)}`:""}`,{fn:n});if(r.length===0)throw new o("apply expects at least 2 arguments",{fn:n});const s=r[r.length-1];if(!P(s))throw new o(`apply expects a collection as last argument, got ${p(s)}`,{lastArg:s});const a=[...r.slice(0,-1),...Q(s)];return e.applyFunction(n,a,t)}),"Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.",[["f","args"],["f","&","args"]]),partial:u(c("partial",(e,...t)=>{if(e===void 0||!M(e))throw new o(`partial expects a function as first argument${e!==void 0?`, got ${p(e)}`:""}`,{fn:e});const n=e;return W("partial",(r,s,...a)=>r.applyFunction(n,[...t,...a],s))}),"Returns a function that calls f with pre-applied args prepended to any additional arguments.",[["f","&","args"]]),comp:u(c("comp",(...e)=>{if(e.length===0)return c("identity",n=>n);if(e.some(n=>!M(n)))throw new o("comp expects functions",{fns:e});const t=e;return W("composed",(n,r,...s)=>{let a=n.applyFunction(t[t.length-1],s,r);for(let i=t.length-2;i>=0;i--)a=n.applyFunction(t[i],[a],r);return a})}),"Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))).",[[],["f"],["f","g"],["f","g","&","fns"]]),identity:u(c("identity",e=>{if(e===void 0)throw new o("identity expects one argument",{});return e}),"Returns its single argument unchanged.",[["x"]])},Kt={meta:u(c("meta",e=>{if(e===void 0)throw new o("meta expects one argument",{});return e.kind==="function"||e.kind==="native-function"?e.meta??b():b()}),"Returns the metadata map of a value, or nil if the value has no metadata.",[["val"]]),"with-meta":u(c("with-meta",(e,t)=>{if(e===void 0)throw new o("with-meta expects two arguments",{});if(t===void 0)throw new o("with-meta expects two arguments",{});if(t.kind!=="map"&&t.kind!=="nil")throw new o(`with-meta expects a map as second argument, got ${p(t)}`,{m:t});if(e.kind!=="function"&&e.kind!=="native-function")throw new o(`with-meta only supports functions, got ${p(e)}`,{val:e});const n=t.kind==="nil"?void 0:t;return{...e,meta:n}}),"Returns a new value with the metadata map m applied to val.",[["val","m"]])};function _t(e,t,n,r){if(e.kind==="native-function")return e.fnWithContext?e.fnWithContext(n,r,...t):e.fn(...t);if(e.kind==="function"){const s=_e(e.arities,t.length);let a=t;for(;;){const i=Ke(s.params,s.restParam,a,e.env);try{return n.evaluateForms(s.body,i)}catch(l){if(l instanceof le){a=l.args;continue}throw l}}}throw new o(`${e.kind} is not a callable function`,{fn:e,args:t})}function Jt(e,t,n){const r=_e(e.arities,t.length),s=Ke(r.params,r.restParam,t,e.env);return n.evaluateForms(r.body,s)}function re(e,t,n){if(E(e)){const l=e.value.map(f=>re(f,t,n));return l.every((f,d)=>f===e.value[d])?e:F(l)}if(I(e)){const l=e.entries.map(([f,d])=>[re(f,t,n),re(d,t,n)]);return l.every(([f,d],m)=>f===e.entries[m][0]&&d===e.entries[m][1])?e:B(l)}if(!q(e)||e.value.length===0)return e;const r=e.value[0];if(!R(r)){const l=e.value.map(f=>re(f,t,n));return l.every((f,d)=>f===e.value[d])?e:N(l)}const s=r.name;if(s==="quote"||s==="quasiquote")return e;const a=qe(s,t);if(a!==void 0&&Ee(a)){const l=n.applyMacro(a,e.value.slice(1));return re(l,t,n)}const i=e.value.map(l=>re(l,t,n));return i.every((l,f)=>l===e.value[f])?e:N(i)}function ee(e,t){Object.defineProperty(e,"_pos",{value:t,enumerable:!1,writable:!0,configurable:!0})}function Gt(e){return e._pos}function Ht(e,t){const n=e.split(`
`);let r=0;for(let a=0;a<n.length;a++){const i=r+n[a].length;if(t<=i)return{line:a+1,col:t-r,lineText:n[a]};r=i+1}const s=n[n.length-1];return{line:n.length,col:s.length,lineText:s}}function Xt(e,t){const{line:n,col:r,lineText:s}=Ht(e,t.start),a=Math.max(1,t.end-t.start),i=" ".repeat(r)+"^".repeat(a);return`
  at line ${n}, col ${r+1}:
  ${s}
  ${i}`}function Yt(e,t,n){return F(e.value.map(r=>n.evaluate(r,t)))}function Zt(e,t,n){let r=[];for(const[s,a]of e.entries){const i=n.evaluate(s,t),l=n.evaluate(a,t);r.push([i,l])}return B(r)}function Vt(e,t,n,r){const s=n.applyFunction(e.dispatchFn,t,r),a=e.methods.find(({dispatchVal:i})=>C(i,s));if(a)return n.applyFunction(a.fn,t,r);if(e.defaultMethod)return n.applyFunction(e.defaultMethod,t,r);throw new o(`No method in multimethod '${e.name}' for dispatch value ${p(s)}`,{mm:e,dispatchVal:s})}function en(e,t,n){if(e.value.length===0)throw new o("Unexpected empty list",{list:e,env:t});const r=e.value[0];if(Nt(r))return Mt(r.name,e,t,n);const s=n.evaluate(r,t);if(M(s)){const f=e.value.slice(1).map(d=>n.evaluate(d,t));return n.applyFunction(s,f,t)}if(U(s)){const f=n.evaluate(e.value[1],t),d=e.value.length>2?n.evaluate(e.value[2],t):b();if(I(f)){const m=f.entries.find(([g])=>C(g,s));return m?m[1]:d}return d}if(I(s)){if(e.value.length<2)throw new o("Map used as function requires at least one argument",{list:e,env:t});const f=n.evaluate(e.value[1],t),d=e.value.length>2?n.evaluate(e.value[2],t):b(),m=s.entries.find(([g])=>C(g,f));return m?m[1]:d}if(He(s)){const f=e.value.slice(1).map(d=>n.evaluate(d,t));return Vt(s,f,n,t)}if(!R(r))throw new o("First element of list must be a function or special form",{list:e,env:t});const a=r.name,i=ie(a,t);if(!M(i))throw new o(`${a} is not a function`,{list:e,env:t});const l=e.value.slice(1).map(f=>n.evaluate(f,t));return n.applyFunction(i,l,t)}function tn(e,t,n){try{switch(e.kind){case h.number:case h.string:case h.keyword:case h.nil:case h.function:case h.multiMethod:case h.boolean:case h.regex:return e;case h.symbol:{const r=e.name.indexOf("/");if(r>0&&r<e.name.length-1){const s=e.name.slice(0,r),a=e.name.slice(r+1),l=be(t).aliases?.get(s)??se(t).resolveNs?.(s)??null;if(!l)throw new o(`No such namespace or alias: ${s}`,{symbol:e.name,env:t});return ie(a,l)}return ie(e.name,t)}case h.vector:return Yt(e,t,n);case h.map:return Zt(e,t,n);case h.list:return en(e,t,n);default:throw new o("Unexpected value",{expr:e,env:t})}}catch(r){if(r instanceof o&&!r.pos){const s=Gt(e);s&&(r.pos=s)}throw r}}function nn(e,t,n){let r=b();for(const s of e)r=n.evaluate(s,t);return r}function Ye(){const e={evaluate:(t,n)=>tn(t,n,e),evaluateForms:(t,n)=>nn(t,n,e),applyFunction:(t,n,r)=>_t(t,n,e,r),applyMacro:(t,n)=>Jt(t,n,e),expandAll:(t,n)=>re(t,n,e)};return e}function Te(e,t,n=pe()){return Ye().applyFunction(e,t,n)}const rn={"nil?":u(c("nil?",e=>v(e.kind==="nil")),"Returns true if the value is nil, false otherwise.",[["arg"]]),"true?":u(c("true?",e=>e.kind!=="boolean"?v(!1):v(e.value===!0)),"Returns true if the value is a boolean and true, false otherwise.",[["arg"]]),"false?":u(c("false?",e=>e.kind!=="boolean"?v(!1):v(e.value===!1)),"Returns true if the value is a boolean and false, false otherwise.",[["arg"]]),"truthy?":u(c("truthy?",e=>v(Se(e))),"Returns true if the value is not nil or false, false otherwise.",[["arg"]]),"falsy?":u(c("falsy?",e=>v(ke(e))),"Returns true if the value is nil or false, false otherwise.",[["arg"]]),"not=":u(c("not=",(...e)=>{if(e.length<2)throw new o("not= expects at least two arguments",{args:e});for(let t=1;t<e.length;t++)if(!C(e[t],e[t-1]))return v(!0);return v(!1)}),"Returns true if any two adjacent arguments are not equal, false otherwise.",[["&","vals"]]),"number?":u(c("number?",e=>v(e!==void 0&&e.kind==="number")),"Returns true if the value is a number, false otherwise.",[["x"]]),"string?":u(c("string?",e=>v(e!==void 0&&e.kind==="string")),"Returns true if the value is a string, false otherwise.",[["x"]]),"boolean?":u(c("boolean?",e=>v(e!==void 0&&e.kind==="boolean")),"Returns true if the value is a boolean, false otherwise.",[["x"]]),"vector?":u(c("vector?",e=>v(e!==void 0&&E(e))),"Returns true if the value is a vector, false otherwise.",[["x"]]),"list?":u(c("list?",e=>v(e!==void 0&&q(e))),"Returns true if the value is a list, false otherwise.",[["x"]]),"map?":u(c("map?",e=>v(e!==void 0&&I(e))),"Returns true if the value is a map, false otherwise.",[["x"]]),"keyword?":u(c("keyword?",e=>v(e!==void 0&&U(e))),"Returns true if the value is a keyword, false otherwise.",[["x"]]),"qualified-keyword?":u(c("qualified-keyword?",e=>v(e!==void 0&&U(e)&&e.name.includes("/"))),"Returns true if the value is a qualified keyword, false otherwise.",[["x"]]),"symbol?":u(c("symbol?",e=>v(e!==void 0&&R(e))),"Returns true if the value is a symbol, false otherwise.",[["x"]]),"qualified-symbol?":u(c("qualified-symbol?",e=>v(e!==void 0&&R(e)&&e.name.includes("/"))),"Returns true if the value is a qualified symbol, false otherwise.",[["x"]]),"fn?":u(c("fn?",e=>v(e!==void 0&&M(e))),"Returns true if the value is a function, false otherwise.",[["x"]]),"coll?":u(c("coll?",e=>v(e!==void 0&&P(e))),"Returns true if the value is a collection, false otherwise.",[["x"]]),some:u(c("some",(e,t)=>{if(e===void 0||!M(e))throw new o(`some expects a function as first argument${e!==void 0?`, got ${p(e)}`:""}`,{pred:e});if(t===void 0)return b();if(!P(t))throw new o(`some expects a collection as second argument, got ${p(t)}`,{coll:t});for(const n of Q(t)){const r=Te(e,[n]);if(Se(r))return r}return b()}),"Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.",[["pred","coll"]]),"every?":u(c("every?",(e,t)=>{if(e===void 0||!M(e))throw new o(`every? expects a function as first argument${e!==void 0?`, got ${p(e)}`:""}`,{pred:e});if(t===void 0||!P(t))throw new o(`every? expects a collection as second argument${t!==void 0?`, got ${p(t)}`:""}`,{coll:t});for(const n of Q(t))if(ke(Te(e,[n])))return v(!1);return v(!0)}),"Returns true if all items in coll satisfy pred, false otherwise.",[["pred","coll"]])};function sn(e){let t=e,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(t))!==null;){for(const a of s[1]){if(a==="x")throw new o("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",{});n.includes(a)||(n+=a)}t=t.slice(s[0].length)}return{pattern:t,flags:n}}function xe(e,t){if(!Xe(e))throw new o(`${t} expects a regex as first argument, got ${p(e)}`,{val:e});return e}function $e(e,t){if(e.kind!=="string")throw new o(`${t} expects a string as second argument, got ${p(e)}`,{val:e});return e.value}function Re(e){return e.length===1?j(e[0]):F(e.map(t=>t==null?b():j(t)))}const an={"regexp?":u(c("regexp?",e=>v(e!==void 0&&Xe(e))),"Returns true if x is a regular expression pattern.",[["x"]]),"re-pattern":u(c("re-pattern",e=>{if(e===void 0||e.kind!=="string")throw new o(`re-pattern expects a string argument${e!==void 0?`, got ${p(e)}`:""}`,{s:e});const{pattern:t,flags:n}=sn(e.value);return Qe(t,n)}),`Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.
  (re-pattern "\\\\d+") produces the same pattern as #"\\d+".`,[["s"]]),"re-find":u(c("re-find",(e,t)=>{const n=xe(e,"re-find"),r=$e(t,"re-find"),a=new RegExp(n.pattern,n.flags).exec(r);return a?Re(a):b()}),`Returns the next regex match, if any, of string to pattern, using
  java.util.regex.Matcher.find(). Returns the match or nil. When there
  are groups, returns a vector of the whole match and groups (nil for
  unmatched optional groups).`,[["re","s"]]),"re-matches":u(c("re-matches",(e,t)=>{const n=xe(e,"re-matches"),r=$e(t,"re-matches"),a=new RegExp(n.pattern,n.flags).exec(r);return!a||a.index!==0||a[0].length!==r.length?b():Re(a)}),`Returns the match, if any, of string to pattern, using
  java.util.regex.Matcher.matches(). The entire string must match.
  Returns the match or nil. When there are groups, returns a vector
  of the whole match and groups (nil for unmatched optional groups).`,[["re","s"]]),"re-seq":u(c("re-seq",(e,t)=>{const n=xe(e,"re-seq"),r=$e(t,"re-seq"),s=new RegExp(n.pattern,n.flags+"g"),a=[];let i;for(;(i=s.exec(r))!==null;){if(i[0].length===0){s.lastIndex++;continue}a.push(Re(i))}return a.length===0?b():{kind:"list",value:a}}),`Returns a lazy sequence of successive matches of pattern in string,
  using java.util.regex.Matcher.find(), each such match processed with
  re-groups.`,[["re","s"]]),"str-split*":u(c("str-split*",(e,t,n)=>{if(e===void 0||e.kind!=="string")throw new o(`str-split* expects a string as first argument${e!==void 0?`, got ${p(e)}`:""}`,{sVal:e});const r=e.value,a=n!==void 0&&n.kind!=="nil"&&n.kind==="number"?n.value:void 0;let i,l;if(t.kind!=="regex")throw new o(`str-split* expects a regex pattern as second argument, got ${p(t)}`,{sepVal:t});if(t.pattern===""){const m=[...r];if(a===void 0||a>=m.length)return F(m.map(j));const g=[...m.slice(0,a-1),m.slice(a-1).join("")];return F(g.map(j))}i=t.pattern,l=t.flags;const f=new RegExp(i,l+"g"),d=on(r,f,a);return F(d.map(m=>j(m)))}),`Internal helper for clojure.string/split. Splits string s by a regex or
  string separator. Optional limit keeps all parts when provided.`,[["s","sep"],["s","sep","limit"]])};function on(e,t,n){const r=[];let s=0,a,i=0;for(;(a=t.exec(e))!==null;){if(a[0].length===0){t.lastIndex++;continue}if(n!==void 0&&i>=n-1)break;r.push(e.slice(s,a.index)),s=a.index+a[0].length,i++}if(r.push(e.slice(s)),n===void 0)for(;r.length>0&&r[r.length-1]==="";)r.pop();return r}function z(e,t){if(e===void 0||e.kind!=="string")throw new o(`${t} expects a string as first argument${e!==void 0?`, got ${p(e)}`:""}`,{val:e});return e.value}function fe(e,t,n){if(e===void 0||e.kind!=="string")throw new o(`${n} expects a string as ${t} argument${e!==void 0?`, got ${p(e)}`:""}`,{val:e});return e.value}function un(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function ln(e){return e.replace(/\$/g,"$$$$")}function cn(e,t){let n=-1;for(let s=t.length-1;s>=0;s--)if(typeof t[s]=="number"){n=s;break}const r=n>0?t.slice(0,n):[];return r.length===0?j(e):F([j(e),...r.map(s=>s==null?b():j(String(s)))])}function Le(e,t,n,r,s,a,i){const l=z(r,n);if(s===void 0||a===void 0)throw new o(`${n} expects 3 arguments`,{});if(s.kind==="string"){if(a.kind!=="string")throw new o(`${n}: when match is a string, replacement must also be a string, got ${p(a)}`,{replVal:a});const f=new RegExp(un(s.value),i?"g":"");return j(l.replace(f,ln(a.value)))}if(s.kind==="regex"){const f=s,d=i?f.flags+"g":f.flags,m=new RegExp(f.pattern,d);if(a.kind==="string")return j(l.replace(m,a.value));if(M(a)){const g=a,k=l.replace(m,(x,...y)=>{const S=cn(x,y),L=e.applyFunction(g,[S],t);return O(L)});return j(k)}throw new o(`${n}: replacement must be a string or function, got ${p(a)}`,{replVal:a})}throw new o(`${n}: match must be a string or regex, got ${p(s)}`,{matchVal:s})}const fn={"str-upper-case*":u(c("str-upper-case*",e=>j(z(e,"str-upper-case*").toUpperCase())),"Internal helper. Converts s to upper-case.",[["s"]]),"str-lower-case*":u(c("str-lower-case*",e=>j(z(e,"str-lower-case*").toLowerCase())),"Internal helper. Converts s to lower-case.",[["s"]]),"str-trim*":u(c("str-trim*",e=>j(z(e,"str-trim*").trim())),"Internal helper. Removes whitespace from both ends of s.",[["s"]]),"str-triml*":u(c("str-triml*",e=>j(z(e,"str-triml*").trimStart())),"Internal helper. Removes whitespace from the left of s.",[["s"]]),"str-trimr*":u(c("str-trimr*",e=>j(z(e,"str-trimr*").trimEnd())),"Internal helper. Removes whitespace from the right of s.",[["s"]]),"str-reverse*":u(c("str-reverse*",e=>j([...z(e,"str-reverse*")].reverse().join(""))),"Internal helper. Returns s with its characters reversed (Unicode-safe).",[["s"]]),"str-starts-with*":u(c("str-starts-with*",(e,t)=>{const n=z(e,"str-starts-with*"),r=fe(t,"second","str-starts-with*");return v(n.startsWith(r))}),"Internal helper. Returns true if s starts with substr.",[["s","substr"]]),"str-ends-with*":u(c("str-ends-with*",(e,t)=>{const n=z(e,"str-ends-with*"),r=fe(t,"second","str-ends-with*");return v(n.endsWith(r))}),"Internal helper. Returns true if s ends with substr.",[["s","substr"]]),"str-includes*":u(c("str-includes*",(e,t)=>{const n=z(e,"str-includes*"),r=fe(t,"second","str-includes*");return v(n.includes(r))}),"Internal helper. Returns true if s contains substr.",[["s","substr"]]),"str-index-of*":u(c("str-index-of*",(e,t,n)=>{const r=z(e,"str-index-of*"),s=fe(t,"second","str-index-of*");let a;if(n!==void 0&&n.kind!=="nil"){if(n.kind!=="number")throw new o(`str-index-of* expects a number as third argument, got ${p(n)}`,{fromVal:n});a=r.indexOf(s,n.value)}else a=r.indexOf(s);return a===-1?b():A(a)}),"Internal helper. Returns index of value in s, or nil if not found.",[["s","value"],["s","value","from-index"]]),"str-last-index-of*":u(c("str-last-index-of*",(e,t,n)=>{const r=z(e,"str-last-index-of*"),s=fe(t,"second","str-last-index-of*");let a;if(n!==void 0&&n.kind!=="nil"){if(n.kind!=="number")throw new o(`str-last-index-of* expects a number as third argument, got ${p(n)}`,{fromVal:n});a=r.lastIndexOf(s,n.value)}else a=r.lastIndexOf(s);return a===-1?b():A(a)}),"Internal helper. Returns last index of value in s, or nil if not found.",[["s","value"],["s","value","from-index"]]),"str-replace*":u(W("str-replace*",(e,t,n,r,s)=>Le(e,t,"str-replace*",n,r,s,!0)),"Internal helper. Replaces all occurrences of match with replacement in s.",[["s","match","replacement"]]),"str-replace-first*":u(W("str-replace-first*",(e,t,n,r,s)=>Le(e,t,"str-replace-first*",n,r,s,!1)),"Internal helper. Replaces the first occurrence of match with replacement in s.",[["s","match","replacement"]])},dn={reduced:u(c("reduced",e=>{if(e===void 0)throw new o("reduced expects one argument",{});return Ue(e)}),"Returns a reduced value, indicating termination of the reduction process.",[["value"]]),"reduced?":u(c("reduced?",e=>{if(e===void 0)throw new o("reduced? expects one argument",{});return v(ae(e))}),"Returns true if the given value is a reduced value, false otherwise.",[["value"]]),unreduced:u(c("unreduced",e=>{if(e===void 0)throw new o("unreduced expects one argument",{});return ae(e)?e.value:e}),"Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.",[["value"]]),"ensure-reduced":u(c("ensure-reduced",e=>{if(e===void 0)throw new o("ensure-reduced expects one argument",{});return ae(e)?e:Ue(e)}),"Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.",[["value"]]),"volatile!":u(c("volatile!",e=>{if(e===void 0)throw new o("volatile! expects one argument",{});return mt(e)}),"Returns a volatile value with the given value as its value.",[["value"]]),"volatile?":u(c("volatile?",e=>{if(e===void 0)throw new o("volatile? expects one argument",{});return v(ve(e))}),"Returns true if the given value is a volatile value, false otherwise.",[["value"]]),"vreset!":u(c("vreset!",(e,t)=>{if(!ve(e))throw new o(`vreset! expects a volatile as its first argument, got ${p(e)}`,{vol:e});if(t===void 0)throw new o("vreset! expects two arguments",{vol:e});return e.value=t,t}),"Resets the value of the given volatile to the given new value and returns the new value.",[["vol","newVal"]]),"vswap!":u(W("vswap!",(e,t,n,r,...s)=>{if(!ve(n))throw new o(`vswap! expects a volatile as its first argument, got ${p(n)}`,{vol:n});if(!M(r))throw new o(`vswap! expects a function as its second argument, got ${p(r)}`,{fn:r});const a=e.applyFunction(r,[n.value,...s],t);return n.value=a,a}),"Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.",[["vol","fn"],["vol","fn","&","extraArgs"]]),transduce:u(W("transduce",(e,t,n,r,s,a)=>{if(!M(n))throw new o(`transduce expects a transducer (function) as first argument, got ${p(n)}`,{xf:n});if(!M(r))throw new o(`transduce expects a reducing function as second argument, got ${p(r)}`,{f:r});if(s===void 0)throw new o("transduce expects 3 or 4 arguments: (transduce xf f coll) or (transduce xf f init coll)",{});let i,l;a===void 0?(l=s,i=e.applyFunction(r,[],t)):(i=s,l=a);const f=e.applyFunction(n,[r],t);if(Ut(l))return e.applyFunction(f,[i],t);if(!P(l))throw new o(`transduce expects a collection as ${a===void 0?"third":"fourth"} argument, got ${p(l)}`,{coll:l});const d=Q(l);let m=i;for(const g of d){const k=e.applyFunction(f,[m,g],t);if(ae(k)){m=k.value;break}m=k}return e.applyFunction(f,[m],t)}),ge(["reduce with a transformation of f (xf). If init is not","supplied, (f) will be called to produce it. f should be a reducing","step function that accepts both 1 and 2 arguments, if it accepts","only 2 you can add the arity-1 with 'completing'. Returns the result","of applying (the transformed) xf to init and the first item in coll,","then applying xf to that result and the 2nd item, etc. If coll","contains no items, returns init and f is not called. Note that","certain transforms may inject or skip items."]),[["xform","f","coll"],["xform","f","init","coll"]])},pn={str:u(c("str",(...e)=>j(e.map(O).join(""))),"Returns a concatenated string representation of the given values.",[["&","args"]]),subs:u(c("subs",(e,t,n)=>{if(e===void 0||e.kind!=="string")throw new o(`subs expects a string as first argument${e!==void 0?`, got ${p(e)}`:""}`,{s:e});if(t===void 0||t.kind!=="number")throw new o(`subs expects a number as second argument${t!==void 0?`, got ${p(t)}`:""}`,{start:t});if(n!==void 0&&n.kind!=="number")throw new o(`subs expects a number as optional third argument${n!==void 0?`, got ${p(n)}`:""}`,{end:n});const r=t.value,s=n?.value;return j(s===void 0?e.value.slice(r):e.value.slice(r,s))}),"Returns the substring of s beginning at start, and optionally ending before end.",[["s","start"],["s","start","end"]]),type:u(c("type",e=>{if(e===void 0)throw new o("type expects an argument",{x:e});const n={number:":number",string:":string",boolean:":boolean",nil:":nil",keyword:":keyword",symbol:":symbol",list:":list",vector:":vector",map:":map",function:":function",regex:":regex","native-function":":function"}[e.kind];if(!n)throw new o(`type: unhandled kind ${e.kind}`,{x:e});return K(n)}),"Returns a keyword representing the type of the given value.",[["x"]]),gensym:u(c("gensym",(...e)=>{if(e.length>1)throw new o("gensym takes 0 or 1 arguments",{args:e});const t=e[0];if(t!==void 0&&t.kind!=="string")throw new o(`gensym prefix must be a string${t!==void 0?`, got ${p(t)}`:""}`,{prefix:t});const n=t?.kind==="string"?t.value:"G";return T(Je(n))}),'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',[[],["prefix"]]),eval:u(W("eval",(e,t,n)=>{if(n===void 0)throw new o("eval expects a form as argument",{form:n});const r=se(t),s=e.expandAll(n,r);return e.evaluate(s,r)}),"Evaluates the given form in the global environment and returns the result.",[["form"]]),"macroexpand-1":u(W("macroexpand-1",(e,t,n)=>{if(!q(n)||n.value.length===0)return n;const r=n.value[0];if(!R(r))return n;const s=qe(r.name,se(t));return s===void 0||!Ee(s)?n:e.applyMacro(s,n.value.slice(1))}),"If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.",[["form"]]),macroexpand:u(W("macroexpand",(e,t,n)=>{const r=se(t);let s=n;for(;;){if(!q(s)||s.value.length===0)return s;const a=s.value[0];if(!R(a))return s;const i=qe(a.name,r);if(i===void 0||!Ee(i))return s;s=e.applyMacro(i,s.value.slice(1))}}),ge(["Expands all macros until the expansion is stable (head is no longer a macro)","","Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms"]),[["form"]]),"macroexpand-all":u(W("macroexpand-all",(e,t,n)=>e.expandAll(n,se(t))),ge(["Fully expands all macros in a form recursively — including in sub-forms.","","Unlike macroexpand, this descends into every sub-expression.","Expansion stops at quote/quasiquote boundaries and fn/loop bodies."]),[["form"]]),namespace:u(c("namespace",e=>{if(e===void 0)throw new o("namespace expects an argument",{x:e});let t;if(U(e))t=e.name.slice(1);else if(R(e))t=e.name;else throw new o(`namespace expects a keyword or symbol, got ${p(e)}`,{x:e});const n=t.indexOf("/");return n<=0?b():j(t.slice(0,n))}),"Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.",[["x"]]),name:u(c("name",e=>{if(e===void 0)throw new o("name expects an argument",{x:e});let t;if(U(e))t=e.name.slice(1);else if(R(e))t=e.name;else{if(e.kind==="string")return e;throw new o(`name expects a keyword, symbol, or string, got ${p(e)}`,{x:e})}const n=t.indexOf("/");return j(n>=0?t.slice(n+1):t)}),"Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.",[["x"]]),keyword:u(c("keyword",(...e)=>{if(e.length===0||e.length>2)throw new o("keyword expects 1 or 2 string arguments",{args:e});if(e[0].kind!=="string")throw new o(`keyword expects a string, got ${p(e[0])}`,{args:e});if(e.length===1)return K(`:${e[0].value}`);if(e[1].kind!=="string")throw new o(`keyword second argument must be a string, got ${p(e[1])}`,{args:e});return K(`:${e[0].value}/${e[1].value}`)}),ge(["Constructs a keyword with the given name and namespace strings. Returns a keyword value.","","Note: do not use : in the keyword strings, it will be added automatically.",'e.g. (keyword "foo") => :foo']),[["name"],["ns","name"]])},hn={...Wt,...zt,...Dt,...Ot,...rn,...Qt,...Kt,...dn,...an,...fn,...pn};function mn(e,t){for(const[n,r]of Object.entries(hn))Y(n,r,e);t&&Y("println",c("println",(...n)=>{const r=n.map(O).join(" ");return t(r),b()}),e)}const Ze=(e,t,n)=>({line:e,col:t,offset:n}),Ve=(e,t)=>({peek:(n=0)=>{const r=t.offset+n;return r>=e.length?null:e[r]},isAtEnd:()=>t.offset>=e.length,position:()=>({offset:t.offset,line:t.line,col:t.col})});function gn(e){const t=Ze(0,0,0),n={...Ve(e,t),advance:()=>{if(t.offset>=e.length)return null;const r=e[t.offset];return t.offset++,r===`
`?(t.line++,t.col=0):t.col++,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s.join("")}};return n}function wn(e){const t=Ze(0,0,0),n={...Ve(e,t),advance:()=>{if(t.offset>=e.length)return null;const r=e[t.offset];return t.offset++,t.col=r.end.col,t.line=r.end.line,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s},consumeN(r){for(let s=0;s<r;s++)n.advance()}};return n}const vn=e=>e===`
`,he=e=>[" ",",",`
`,"\r","	"].includes(e),Ie=e=>e===";",et=e=>e==="(",tt=e=>e===")",nt=e=>e==="[",rt=e=>e==="]",st=e=>e==="{",at=e=>e==="}",yn=e=>e==='"',ot=e=>e==="'",it=e=>e==="`",kn=e=>e==="~",Ce=e=>e==="@",oe=e=>{const t=parseInt(e);return isNaN(t)?!1:t>=0&&t<=9},bn=e=>e===".",ut=e=>e===":",xn=e=>e==="#",Pe=e=>et(e)||tt(e)||nt(e)||rt(e)||st(e)||at(e)||it(e)||ot(e)||Ce(e),$n=e=>{const t=e.scanner,n=t.position();return t.consumeWhile(he),{kind:w.Whitespace,start:n,end:t.position()}},Rn=e=>{const t=e.scanner,n=t.position();t.advance();const r=t.consumeWhile(s=>!vn(s));return!t.isAtEnd()&&t.peek()===`
`&&t.advance(),{kind:w.Comment,value:r,start:n,end:t.position()}},qn=e=>{const t=e.scanner,n=t.position();t.advance();const r=[];let s=!1;for(;!t.isAtEnd();){const a=t.peek();if(a==="\\"){t.advance();const i=t.peek();switch(i){case'"':r.push('"');break;case"\\":r.push("\\");break;case"n":r.push(`
`);break;case"r":r.push("\r");break;case"t":r.push("	");break;default:r.push(i)}t.isAtEnd()||t.advance();continue}if(a==='"'){t.advance(),s=!0;break}r.push(t.advance())}if(!s)throw new X(`Unterminated string detected at ${n.offset}`,t.position());return{kind:w.String,value:r.join(""),start:n,end:t.position()}},jn=e=>{const t=e.scanner,n=t.position(),r=t.consumeWhile(s=>ut(s)||!he(s)&&!Pe(s)&&!Ie(s));return{kind:w.Keyword,value:r,start:n,end:t.position()}};function Fn(e,t){const r=t.scanner.peek(1);return oe(e)||e==="-"&&r!==null&&oe(r)}const Sn=e=>{const t=e.scanner,n=t.position();let r="";if(t.peek()==="-"&&(r+=t.advance()),r+=t.consumeWhile(oe),!t.isAtEnd()&&t.peek()==="."&&t.peek(1)!==null&&oe(t.peek(1))&&(r+=t.advance(),r+=t.consumeWhile(oe)),!t.isAtEnd()&&(t.peek()==="e"||t.peek()==="E")){r+=t.advance(),!t.isAtEnd()&&(t.peek()==="+"||t.peek()==="-")&&(r+=t.advance());const s=t.consumeWhile(oe);if(s.length===0)throw new X(`Invalid number format at line ${n.line} column ${n.col}: "${r}"`,{start:n,end:t.position()});r+=s}if(!t.isAtEnd()&&bn(t.peek()))throw new X(`Invalid number format at line ${n.line} column ${n.col}: "${r}${t.consumeWhile(s=>!he(s)&&!Pe(s))}"`,{start:n,end:t.position()});return{kind:w.Number,value:Number(r),start:n,end:t.position()}},En=e=>{const t=e.scanner,n=t.position(),r=t.consumeWhile(s=>!he(s)&&!Pe(s)&&!Ie(s));return{kind:w.Symbol,value:r,start:n,end:t.position()}},An=e=>{const t=e.scanner,n=t.position();return t.advance(),{kind:"Deref",start:n,end:t.position()}},In=(e,t)=>{const n=e.scanner;n.advance();const r=[];let s=!1;for(;!n.isAtEnd();){const a=n.peek();if(a==="\\"){n.advance();const i=n.peek();if(i===null)throw new X(`Unterminated regex literal at ${t.offset}`,n.position());i==='"'?r.push('"'):(r.push("\\"),r.push(i)),n.advance();continue}if(a==='"'){n.advance(),s=!0;break}r.push(n.advance())}if(!s)throw new X(`Unterminated regex literal at ${t.offset}`,n.position());return{kind:w.Regex,value:r.join(""),start:t,end:n.position()}};function Cn(e){const t=e.scanner,n=t.position();t.advance();const r=t.peek();if(r==="(")return t.advance(),{kind:w.AnonFnStart,start:n,end:t.position()};if(r==='"')return In(e,n);throw r==="{"?new X("Set literals are not yet supported",n):new X(`Unknown dispatch character: #${r??"EOF"}`,n)}function V(e,t){return n=>{const r=n.scanner,s=r.position();return r.advance(),{kind:e,value:t,start:s,end:r.position()}}}function Pn(e){const t=e.scanner,n=t.position();t.advance();const r=t.peek();if(!r)throw new X(`Unexpected end of input while parsing unquote at ${n.offset}`,n);return Ce(r)?(t.advance(),{kind:w.UnquoteSplicing,value:J.UnquoteSplicing,start:n,end:t.position()}):{kind:w.Unquote,value:J.Unquote,start:n,end:t.position()}}const Mn=[[he,$n],[Ie,Rn],[et,V(w.LParen,J.LParen)],[tt,V(w.RParen,J.RParen)],[nt,V(w.LBracket,J.LBracket)],[rt,V(w.RBracket,J.RBracket)],[st,V(w.LBrace,J.LBrace)],[at,V(w.RBrace,J.RBrace)],[yn,qn],[ut,jn],[Fn,Sn],[ot,V(w.Quote,J.Quote)],[it,V(w.Quasiquote,J.Quasiquote)],[kn,Pn],[Ce,An],[xn,Cn]];function Un(e){const n=e.scanner.peek(),r=Mn.find(([s])=>s(n,e));if(r){const[,s]=r;return s(e)}return En(e)}function Nn(e){const t=[];let n;try{for(;!e.scanner.isAtEnd();){const s=Un(e);if(!s)break;s.kind!==w.Whitespace&&t.push(s)}}catch(s){n=s}return{tokens:t,scanner:e.scanner,error:n}}function Z(e){return"value"in e?e.value:""}function Be(e){const t=e.length,r={scanner:gn(e)},s=Nn(r);if(s.error)throw s.error;if(s.scanner.position().offset!==t)throw new X(`Unexpected end of input, expected ${t} characters, got ${s.scanner.position().offset}`,s.scanner.position());return s.tokens}function Tn(e){const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input",t.position());switch(n.kind){case w.Symbol:return Kn(t);case w.String:{t.advance();const r={kind:"string",value:n.value};return ee(r,{start:n.start.offset,end:n.end.offset}),r}case w.Number:{t.advance();const r={kind:"number",value:n.value};return ee(r,{start:n.start.offset,end:n.end.offset}),r}case w.Keyword:{t.advance();const r=n.value;let s;if(r.startsWith("::")){const a=r.slice(2);if(a.includes("/")){const i=a.indexOf("/"),l=a.slice(0,i),f=a.slice(i+1),d=e.aliases.get(l);if(!d)throw new $(`No namespace alias '${l}' found for ::${l}/${f}`,n,{start:n.start.offset,end:n.end.offset});s={kind:"keyword",name:`:${d}/${f}`}}else s={kind:"keyword",name:`:${e.namespace}/${a}`}}else s={kind:"keyword",name:r};return ee(s,{start:n.start.offset,end:n.end.offset}),s}}throw new $(`Unexpected token: ${n.kind}`,n,{start:n.start.offset,end:n.end.offset})}const Ln=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing quote",t.position());t.advance();const r=G(e);if(!r)throw new $(`Unexpected token: ${Z(n)}`,n);return{kind:h.list,value:[T("quote"),r]}},Bn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing quasiquote",t.position());t.advance();const r=G(e);if(!r)throw new $(`Unexpected token: ${Z(n)}`,n);return{kind:h.list,value:[T("quasiquote"),r]}},Wn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing unquote",t.position());t.advance();const r=G(e);if(!r)throw new $(`Unexpected token: ${Z(n)}`,n);return{kind:h.list,value:[T("unquote"),r]}},zn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing deref",t.position());t.advance();const r=G(e);if(!r)throw new $(`Unexpected token: ${Z(n)}`,n);return{kind:h.list,value:[T("deref"),r]}},Dn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing unquote splicing",t.position());t.advance();const r=G(e);if(!r)throw new $(`Unexpected token: ${Z(n)}`,n);return{kind:h.list,value:[T("unquote-splicing"),r]}},Me=e=>[w.RParen,w.RBracket,w.RBrace].includes(e.kind),lt=(e,t)=>function(n){const r=n.scanner,s=r.peek();if(!s)throw new $("Unexpected end of input while parsing collection",r.position());r.advance();const a=[];let i=!1,l;for(;!r.isAtEnd();){const d=r.peek();if(!d)break;if(Me(d)&&d.kind!==t)throw new $(`Expected '${t}' to close ${e} started at line ${s.start.line} column ${s.start.col}, but got '${Z(d)}' at line ${d.start.line} column ${d.start.col}`,d,{start:d.start.offset,end:d.end.offset});if(d.kind===t){l=d.end.offset,r.advance(),i=!0;break}const m=G(n);a.push(m)}if(!i)throw new $(`Unmatched ${e} started at line ${s.start.line} column ${s.start.col}`,r.peek());const f={kind:e,value:a};return l!==void 0&&ee(f,{start:s.start.offset,end:l}),f},On=lt("list",w.RParen),Qn=lt("vector",w.RBracket),Kn=e=>{const t=e.peek();if(!t)throw new $("Unexpected end of input",e.position());if(t.kind!==w.Symbol)throw new $(`Unexpected token: ${Z(t)}`,t,{start:t.start.offset,end:t.end.offset});e.advance();let n;switch(t.value){case"true":case"false":n=v(t.value==="true");break;case"nil":n=b();break;default:n=T(t.value)}return ee(n,{start:t.start.offset,end:t.end.offset}),n},_n=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing map",t.position());let r=!1,s;t.advance();const a=[];for(;!t.isAtEnd();){const l=t.peek();if(!l)break;if(Me(l)&&l.kind!==w.RBrace)throw new $(`Expected '}' to close map started at line ${n.start.line} column ${n.start.col}, but got '${l.kind}' at line ${l.start.line} column ${l.start.col}`,l,{start:l.start.offset,end:l.end.offset});if(l.kind===w.RBrace){s=l.end.offset,t.advance(),r=!0;break}const f=G(e),d=t.peek();if(!d)throw new $(`Expected value in map started at line ${n.start.line} column ${n.start.col}, but got end of input`,t.position());if(d.kind===w.RBrace)throw new $(`Map started at line ${n.start.line} column ${n.start.col} has key ${f.kind} but no value`,t.position());const m=G(e);if(!m)break;a.push([f,m])}if(!r)throw new $(`Unmatched map started at line ${n.start.line} column ${n.start.col}`,t.peek());const i={kind:h.map,entries:a};return s!==void 0&&ee(i,{start:n.start.offset,end:s}),i};function Jn(e){let t=0,n=!1;function r(s){switch(s.kind){case"symbol":{const a=s.name;a==="%"||a==="%1"?t=Math.max(t,1):/^%[2-9]$/.test(a)?t=Math.max(t,parseInt(a[1])):a==="%&"&&(n=!0);break}case"list":case"vector":for(const a of s.value)r(a);break;case"map":for(const[a,i]of s.entries)r(a),r(i);break}}for(const s of e)r(s);return{maxIndex:t,hasRest:n}}function de(e){switch(e.kind){case"symbol":{const t=e.name;return t==="%"||t==="%1"?T("p1"):/^%[2-9]$/.test(t)?T(`p${t[1]}`):t==="%&"?T("rest"):e}case"list":return{...e,value:e.value.map(de)};case"vector":return{...e,value:e.value.map(de)};case"map":return{...e,entries:e.entries.map(([t,n])=>[de(t),de(n)])};default:return e}}const Gn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing anonymous function",t.position());t.advance();const r=[];let s=!1,a;for(;!t.isAtEnd();){const k=t.peek();if(!k)break;if(Me(k)&&k.kind!==w.RParen)throw new $(`Expected ')' to close anonymous function started at line ${n.start.line} column ${n.start.col}, but got '${Z(k)}' at line ${k.start.line} column ${k.start.col}`,k,{start:k.start.offset,end:k.end.offset});if(k.kind===w.RParen){a=k.end.offset,t.advance(),s=!0;break}if(k.kind===w.AnonFnStart)throw new $("Nested anonymous functions (#(...)) are not allowed",k,{start:k.start.offset,end:k.end.offset});r.push(G(e))}if(!s)throw new $(`Unmatched anonymous function started at line ${n.start.line} column ${n.start.col}`,t.peek());const i={kind:"list",value:r},{maxIndex:l,hasRest:f}=Jn([i]),d=[];for(let k=1;k<=l;k++)d.push(T(`p${k}`));f&&(d.push(T("&")),d.push(T("rest")));const m=de(i),g=N([T("fn"),F(d),m]);return a!==void 0&&ee(g,{start:n.start.offset,end:a}),g};function Hn(e){let t=e,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(t))!==null;){for(const a of s[1]){if(a==="x")throw new $("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",null);n.includes(a)||(n+=a)}t=t.slice(s[0].length)}return{pattern:t,flags:n}}const Xn=e=>{const t=e.scanner,n=t.peek();if(!n||n.kind!==w.Regex)throw new $("Expected regex token",t.position());t.advance();const{pattern:r,flags:s}=Hn(n.value),a=Qe(r,s);return ee(a,{start:n.start.offset,end:n.end.offset}),a};function G(e){const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input",t.position());switch(n.kind){case w.String:case w.Number:case w.Keyword:case w.Symbol:return Tn(e);case w.LParen:return On(e);case w.LBrace:return _n(e);case w.LBracket:return Qn(e);case w.Quote:return Ln(e);case w.Quasiquote:return Bn(e);case w.Unquote:return Wn(e);case w.UnquoteSplicing:return Dn(e);case w.AnonFnStart:return Gn(e);case w.Deref:return zn(e);case w.Regex:return Xn(e);default:throw new $(`Unexpected token: ${Z(n)} at line ${n.start.line} column ${n.start.col}`,n,{start:n.start.offset,end:n.end.offset})}}function We(e,t="user",n=new Map){const r=e.filter(l=>l.kind!==w.Comment),s=wn(r),a={scanner:s,namespace:t,aliases:n},i=[];for(;!s.isAtEnd();)i.push(G(a));return i}const Yn=`(ns clojure.core)

(defmacro defn [name & fdecl]
  (let [doc       (if (string? (first fdecl)) (first fdecl) nil)
        rest-decl (if doc (rest fdecl) fdecl)
        arglists  (if (vector? (first rest-decl))
                    (vector (first rest-decl))
                    (reduce (fn [acc arity] (conj acc (first arity))) [] rest-decl))]
    (if doc
      \`(def ~name (with-meta (fn ~@rest-decl) {:doc ~doc :arglists '~arglists}))
      \`(def ~name (with-meta (fn ~@rest-decl) {:arglists '~arglists})))))

(defn next
  "Returns a seq of the items after the first. Calls seq on its
  argument.  If there are no more items, returns nil."
  [coll]
  (seq (rest coll)))

(defn not
  "Returns true if x is logical false, false otherwise."
  [x] (if x false true))

(defn second
  "Same as (first (next x))"
  [coll]
  (first (next coll)))


(defmacro when [condition & body]
  \`(if ~condition (do ~@body) nil))

(defmacro when-not [condition & body]
  \`(if ~condition nil (do ~@body)))

(defmacro and [& forms]
  (if (nil? forms)
    true
    (if (nil? (seq (rest forms)))
      (first forms)
      \`(let [v# ~(first forms)]
         (if v# (and ~@(rest forms)) v#)))))

(defmacro or [& forms]
  (if (nil? forms)
    nil
    (if (nil? (seq (rest forms)))
      (first forms)
      \`(let [v# ~(first forms)]
         (if v# v# (or ~@(rest forms)))))))

(defmacro cond [& clauses]
  (if (nil? clauses)
    nil
    \`(if ~(first clauses)
       ~(first (next clauses))
       (cond ~@(rest (rest clauses))))))

(defmacro -> [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     \`(~(first form) ~x ~@(rest form))
                     \`(~form ~x))]
      \`(-> ~threaded ~@more))))

(defmacro ->> [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     \`(~(first form) ~@(rest form) ~x)
                     \`(~form ~x))]
      \`(->> ~threaded ~@more))))

(defmacro comment
  ; Ignores body, yields nil
  [& body])

(defn constantly
  "Returns a function that takes any number of arguments and returns x."
  [x] (fn [& _] x))

(defn some?
  "Returns true if x is not nil, false otherwise"
  [x] (not (nil? x)))

(defn any?
  "Returns true for any given argument"
  [_x] true)

(defn complement
  "Takes a fn f and returns a fn that takes the same arguments as f,
  has the same effects, if any, and returns the opposite truth value."
  [f]
  (fn
    ([] (not (f)))
    ([x] (not (f x)))
    ([x y] (not (f x y)))
    ([x y & zs] (not (apply f x y zs)))))

(defn juxt
  "Takes a set of functions and returns a fn that is the juxtaposition
  of those fns. The returned fn takes a variable number of args and
  returns a vector containing the result of applying each fn to the args."
  [& fns]
  (fn [& args]
    (map (fn [f] (apply f args)) fns)))

(defn merge
  "Returns a map that consists of the rest of the maps conj-ed onto
  the first. If a key occurs in more than one map, the mapping from
  the latter (left-to-right) will be the mapping in the result."
  [& maps]
  (if (nil? maps)
    nil
    (reduce
     (fn [acc m]
       (if (nil? m)
         acc
         (if (nil? acc)
           m
           (reduce
            (fn [macc entry]
              (assoc macc (first entry) (second entry)))
            acc
            m))))
     nil
     maps)))

(defn select-keys
  "Returns a map containing only those entries in map whose key is in keys."
  [m keys]
  (if (or (nil? m) (nil? keys))
    {}
    (let [missing (gensym)]
      (reduce
       (fn [acc k]
         (let [v (get m k missing)]
           (if (= v missing)
             acc
             (assoc acc k v))))
       {}
       keys))))

(defn update
  "Updates a value in an associative structure where k is a key and f is a
  function that will take the old value and any supplied args and return the
  new value, and returns a new structure."
  [m k f & args]
  (let [target (if (nil? m) {} m)]
    (assoc target k (if (nil? args)
                      (f (get target k))
                      (apply f (get target k) args)))))

(defn frequencies
  "Returns a map from distinct items in coll to the number of times they appear."
  [coll]
  (if (nil? coll)
    {}
    (reduce
     (fn [counts item]
       (assoc counts item (inc (get counts item 0))))
     {}
     coll)))

(defn group-by
  "Returns a map of the elements of coll keyed by the result of f on each
  element. The value at each key is a vector of matching elements."
  [f coll]
  (if (nil? coll)
    {}
    (reduce
     (fn [acc item]
       (let [k (f item)]
         (assoc acc k (conj (get acc k []) item))))
     {}
     coll)))

(defn distinct
  "Returns a vector of the elements of coll with duplicates removed,
  preserving first-seen order."
  [coll]
  (if (nil? coll)
    []
    (get
     (reduce
      (fn [state item]
        (let [seen (get state 0)
              out  (get state 1)]
          (if (get seen item false)
            state
            [(assoc seen item true) (conj out item)])))
      [{} []]
      coll)
     1)))

(defn flatten-step
  "Internal helper for flatten."
  [v]
  (if (or (list? v) (vector? v))
    (reduce
     (fn [acc item]
       (into acc (flatten-step item)))
     []
     v)
    [v]))

(defn flatten
  "Takes any nested combination of sequential things (lists/vectors) and
  returns their contents as a single flat vector."
  [x]
  (if (nil? x)
    []
    (flatten-step x)))

(defn reduce-kv
  "Reduces an associative structure. f should be a function of 3
  arguments: accumulator, key/index, value."
  [f init coll]
  (cond
    (map? coll)
    (reduce
     (fn [acc entry]
       (f acc (first entry) (second entry)))
     init
     coll)

    (vector? coll)
    (loop [idx 0
           acc init]
      (if (< idx (count coll))
        (recur (inc idx) (f acc idx (nth coll idx)))
        acc))

    :else
    (throw
     (ex-info
      "reduce-kv expects a map or vector"
      {:coll coll}))))

(defn sort-compare
  "Internal helper: normalizes comparator results."
  [cmp a b]
  (let [r (cmp a b)]
    (if (number? r)
      (< r 0)
      r)))

(defn insert-sorted
  "Internal helper for insertion-sort based sort implementation."
  [cmp x sorted]
  (loop [left  []
         right sorted]
    (if (nil? (seq right))
      (conj left x)
      (let [y (first right)]
        (if (sort-compare cmp x y)
          (into (conj left x) right)
          (recur (conj left y) (rest right)))))))

(defn sort
  "Returns the items in coll in sorted order. With no comparator, sorts
  ascending using <. Comparator may return boolean or number."
  ([coll] (sort < coll))
  ([cmp coll]
   (if (nil? coll)
     []
     (reduce
      (fn [acc item]
        (insert-sorted cmp item acc))
      []
      coll))))

(defn sort-by
  "Returns a sorted sequence of items in coll, where the sort order is
  determined by comparing (keyfn item)."
  ([keyfn coll] (sort-by keyfn < coll))
  ([keyfn cmp coll]
   (sort
    (fn [a b]
      (cmp (keyfn a) (keyfn b)))
    coll)))

(def not-any? (comp not some))

(defn not-every?
  "Returns false if (pred x) is logical true for every x in
  coll, else true."
  [pred coll] (not (every? pred coll)))

;; ── Transducer protocol ──────────────────────────────────────────────────────

;; into: 2-arity uses reduce+conj; 3-arity uses transduce
(defn into
  "Returns a new coll consisting of to-coll with all of the items of
   from-coll conjoined. A transducer may be supplied."
  ([to from] (reduce conj to from))
  ([to xf from] (transduce xf conj to from)))

;; sequence: materialise a transducer over a collection into a vector
(defn sequence
  "Coerces coll to a (possibly empty) sequence, if it is not already
  one. Will not force a seq. (sequence nil) yields (), When a
  transducer is supplied, returns a lazy sequence of applications of
  the transform to the items in coll"
  ([coll] (into [] coll))
  ([xf coll] (into [] xf coll)))

(defn completing
  "Takes a reducing function f of 2 args and returns a fn suitable for
  transduce by adding an arity-1 signature that calls cf (default -
  identity) on the result argument."
  ([f] (completing f identity))
  ([f cf]
   (fn
     ([] (f))
     ([x] (cf x))
     ([x y] (f x y)))))

;; map: 1-arg returns transducer; 2-arg is eager; 3+-arg zips collections
(defn map
  "Returns a sequence consisting of the result of applying f to the set
  of first items of each coll, followed by applying f to the set of
  second items in each coll, until any one of the colls is exhausted.
  Any remaining items in other colls are ignored. Returns a transducer
  when no collection is provided."
  ([f]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input] (rf result (f input))))))
  ([f coll]
   (sequence (map f) coll))
  ([f c1 c2]
   (loop [s1 (seq c1)
          s2 (seq c2)
          acc []]
     (if (or (nil? s1) (nil? s2))
       acc
       (recur
        (next s1)
        (next s2)
        (conj acc (f (first s1) (first s2)))))))
  ([f c1 c2 & colls]
   (loop [seqs (map seq (cons c1 (cons c2 colls)))
          acc []]
     (if (some nil? seqs)
       acc
       (recur (map next seqs) (conj acc (apply f (map first seqs))))))))

;; filter: 1-arg returns transducer; 2-arg is eager
(defn filter
  "Returns a sequence of the items in coll for which
  (pred item) returns logical true. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input]
        (if (pred input)
          (rf result input)
          result)))))
  ([pred coll]
   (sequence (filter pred) coll)))

(defn remove
  "Returns a lazy sequence of the items in coll for which
  (pred item) returns logical false. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred] (filter (complement pred)))
  ([pred coll]
   (filter (complement pred) coll)))



;; take: stateful transducer; signals early termination after n items
;; r > 0 → keep going; r = 0 → take last item and stop; r < 0 → already past limit, stop
(defn take
  "Returns a sequence of the first n items in coll, or all items if
  there are fewer than n.  Returns a stateful transducer when
  no collection is provided."
  ([n]
   (fn [rf]
     (let [remaining (volatile! n)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [n @remaining
                nrem (vswap! remaining dec)
                result (if (pos? n)
                         (rf result input)
                         result)]
            (if (not (pos? nrem))
              (ensure-reduced result)
              result)))))))
  ([n coll]
   (sequence (take n) coll)))

;; take-while: stateless transducer; emits reduced when pred fails
(defn take-while
  "Returns a sequence of successive items from coll while
  (pred item) returns logical true. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input]
        (if (pred input)
          (rf result input)
          (reduced result))))))
  ([pred coll]
   (sequence (take-while pred) coll)))

;; drop: stateful transducer; skips first n items
;; r >= 0 → still skipping; r < 0 → past the drop zone, start taking
(defn drop
  "Returns a sequence of all but the first n items in coll.
   Returns a stateful transducer when no collection is provided."
  ([n]
   (fn [rf]
     (let [remaining (volatile! n)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [rem @remaining]
            (vswap! remaining dec)
            (if (pos? rem)
              result
              (rf result input))))))))
  ([n coll]
   (sequence (drop n) coll)))

(defn drop-last
  "Return a sequence of all but the last n (default 1) items in coll"
  ([coll] (drop-last 1 coll))
  ([n coll] (map (fn [x _] x) coll (drop n coll))))

(defn take-last
  "Returns a sequence of the last n items in coll.  Depending on the type
  of coll may be no better than linear time.  For vectors, see also subvec."
  [n coll]
  (loop [s (seq coll), lead (seq (drop n coll))]
    (if lead
      (recur (next s) (next lead))
      s)))

;; drop-while: stateful transducer; passes through once pred fails
(defn drop-while
  "Returns a sequence of the items in coll starting from the
  first item for which (pred item) returns logical false.  Returns a
  stateful transducer when no collection is provided."
  ([pred]
   (fn [rf]
     (let [dropping (volatile! true)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (if (and @dropping (pred input))
            result
            (do
              (vreset! dropping false)
              (rf result input))))))))
  ([pred coll]
   (sequence (drop-while pred) coll)))

;; map-indexed: stateful transducer; passes index and item to f
(defn map-indexed
  "Returns a sequence consisting of the result of applying f to 0
   and the first item of coll, followed by applying f to 1 and the second
   item in coll, etc, until coll is exhausted. Thus function f should
   accept 2 arguments, index and item. Returns a stateful transducer when
   no collection is provided."
  ([f]
   (fn [rf]
     (let [i (volatile! -1)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (rf result (f (vswap! i inc) input)))))))
  ([f coll]
   (sequence (map-indexed f) coll)))

;; dedupe: stateful transducer; removes consecutive duplicates
(defn dedupe
  "Returns a sequence removing consecutive duplicates in coll.
   Returns a transducer when no collection is provided."
  ([]
   (fn [rf]
     (let [pv (volatile! ::none)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [prior @pv]
            (vreset! pv input)
            (if (= prior input)
              result
              (rf result input))))))))
  ([coll]
   (sequence (dedupe) coll)))

;; partition-all: stateful transducer; groups items into vectors of size n
(defn partition-all
  "Returns a sequence of lists like partition, but may include
   partitions with fewer than n items at the end.  Returns a stateful
   transducer when no collection is provided."
  ([n]
   (fn [rf]
     (let [buf (volatile! [])]
       (fn
         ([] (rf))
         ([result]
          (let [b @buf]
            (vreset! buf [])
            (if (empty? b)
              (rf result)
              (rf (unreduced (rf result b))))))
         ([result input]
          (let [nb (conj @buf input)]
            (if (= (count nb) n)
              (do
                (vreset! buf [])
                (rf result nb))
              (do
                (vreset! buf nb)
                result))))))))
  ([n coll]
   (sequence (partition-all n) coll)))

;; ── Documentation ────────────────────────────────────────────────────────────

(defmacro doc [sym]
  \`(let [v#        ~sym
         m#        (meta v#)
         d#        (:doc m#)
         args#     (:arglists m#)
         args-str# (when args#
                     (reduce
                      (fn [acc# a#]
                        (if (= acc# "")
                          (str "(" a# ")")
                          (str acc# "\\n" "(" a# ")")))
                      ""
                      args#))]
     (println (str (if args-str# (str args-str# "\\n\\n") "")
                   (or d# "No documentation available.")))))

(defn err
  "Creates an error map with type, message, data and optionally cause"
  ([type message] (err type message nil nil))
  ([type message data] (err type message data nil))
  ([type message data cause] {:type type :message message :data data :cause cause}))`,Zn=`(ns clojure.string)

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(def str-split*)
(def str-upper-case*)
(def str-lower-case*)
(def str-trim*)
(def str-triml*)
(def str-trimr*)
(def str-reverse*)
(def str-starts-with*)
(def str-ends-with*)
(def str-includes*)
(def str-index-of*)
(def str-last-index-of*)
(def str-replace*)
(def str-replace-first*)

;; ---------------------------------------------------------------------------
;; Joining / splitting
;; ---------------------------------------------------------------------------

(defn join
  "Returns a string of all elements in coll, as returned by (str), separated
  by an optional separator."
  ([coll] (join "" coll))
  ([separator coll]
   (if (nil? coll)
     ""
     (reduce
      (fn [acc x]
        (if (= acc "")
          (str x)
          (str acc separator x)))
      ""
      coll))))

(defn split
  "Splits string on a regular expression. Optional limit is the maximum number
  of parts returned. Trailing empty strings are not returned by default; pass
  a limit of -1 to return all."
  ([s sep] (str-split* s sep))
  ([s sep limit] (str-split* s sep limit)))

(defn split-lines
  "Splits s on \\\\n or \\\\r\\\\n. Trailing empty lines are not returned."
  [s]
  (split s #"\\r?\\n"))

;; ---------------------------------------------------------------------------
;; Case conversion
;; ---------------------------------------------------------------------------

(defn upper-case
  "Converts string to all upper-case."
  [s]
  (str-upper-case* s))

(defn lower-case
  "Converts string to all lower-case."
  [s]
  (str-lower-case* s))

(defn capitalize
  "Converts first character of the string to upper-case, all other
  characters to lower-case."
  [s]
  (if (< (count s) 2)
    (upper-case s)
    (str (upper-case (subs s 0 1)) (lower-case (subs s 1)))))

;; ---------------------------------------------------------------------------
;; Trimming
;; ---------------------------------------------------------------------------

(defn trim
  "Removes whitespace from both ends of string."
  [s]
  (str-trim* s))

(defn triml
  "Removes whitespace from the left side of string."
  [s]
  (str-triml* s))

(defn trimr
  "Removes whitespace from the right side of string."
  [s]
  (str-trimr* s))

(defn trim-newline
  "Removes all trailing newline \\\\n or return \\\\r characters from string.
  Similar to Perl's chomp."
  [s]
  (replace s #"[\\r\\n]+$" ""))

;; ---------------------------------------------------------------------------
;; Predicates
;; ---------------------------------------------------------------------------

(defn blank?
  "True if s is nil, empty, or contains only whitespace."
  [s]
  (or (nil? s) (not (nil? (re-matches #"\\s*" s)))))

(defn starts-with?
  "True if s starts with substr."
  [s substr]
  (str-starts-with* s substr))

(defn ends-with?
  "True if s ends with substr."
  [s substr]
  (str-ends-with* s substr))

(defn includes?
  "True if s includes substr."
  [s substr]
  (str-includes* s substr))

;; ---------------------------------------------------------------------------
;; Search
;; ---------------------------------------------------------------------------

(defn index-of
  "Return index of value (string) in s, optionally searching forward from
  from-index. Return nil if value not found."
  ([s value] (str-index-of* s value))
  ([s value from-index] (str-index-of* s value from-index)))

(defn last-index-of
  "Return last index of value (string) in s, optionally searching backward
  from from-index. Return nil if value not found."
  ([s value] (str-last-index-of* s value))
  ([s value from-index] (str-last-index-of* s value from-index)))

;; ---------------------------------------------------------------------------
;; Replacement
;; ---------------------------------------------------------------------------

(defn replace
  "Replaces all instances of match with replacement in s.

  match/replacement can be:
    string / string   — literal match, literal replacement
    pattern / string  — regex match; $1, $2, etc. substituted from groups
    pattern / fn      — regex match; fn called with match (string or vector
                        of [whole g1 g2 ...]), return value used as replacement.

  See also replace-first."
  [s match replacement]
  (str-replace* s match replacement))

(defn replace-first
  "Replaces the first instance of match with replacement in s.
  Same match/replacement semantics as replace."
  [s match replacement]
  (str-replace-first* s match replacement))

(defn re-quote-replacement
  "Given a replacement string that you wish to be a literal replacement for a
  pattern match in replace or replace-first, escape any special replacement
  characters ($ signs) so they are treated literally."
  [s]
  (replace s #"\\$" "$$$$"))

;; ---------------------------------------------------------------------------
;; Miscellaneous
;; ---------------------------------------------------------------------------

(defn reverse
  "Returns s with its characters reversed."
  [s]
  (str-reverse* s))

(defn escape
  "Return a new string, using cmap to escape each character ch from s as
  follows: if (cmap ch) is nil, append ch to the new string; otherwise append
  (str (cmap ch)).

  cmap may be a map or a function. Maps are callable directly (IFn semantics).

  Note: Clojure uses char literal keys (e.g. {\\\\< \\"&lt;\\"}). This interpreter
  has no char type, so map keys must be single-character strings instead
  (e.g. {\\"<\\" \\"&lt;\\"})."
  [s cmap]
  (apply str (map (fn [c]
                    (let [r (cmap c)]
                      (if (nil? r) c (str r))))
                  (split s #""))))
`,ct={"clojure.core":()=>Yn,"clojure.string":()=>Zn};function Vn(e){const t=e.filter(n=>n.kind!=="Comment");return t.length<3||t[0].kind!=="LParen"||t[1].kind!=="Symbol"||t[1].value!=="ns"||t[2].kind!=="Symbol"?null:t[2].value}function ze(e){const t=new Map,n=e.filter(a=>a.kind!=="Comment"&&a.kind!=="Whitespace");if(n.length<3||n[0].kind!=="LParen"||n[1].kind!=="Symbol"||n[1].value!=="ns")return t;let r=3,s=1;for(;r<n.length&&s>0;){const a=n[r];if(a.kind==="LParen"){s++,r++;continue}if(a.kind==="RParen"){s--,r++;continue}if(a.kind==="LBracket"){let i=r+1,l=null;for(;i<n.length&&n[i].kind!=="RBracket";){const f=n[i];f.kind==="Symbol"&&l===null&&(l=f.value),f.kind==="Keyword"&&(f.value===":as"||f.value===":as-alias")&&(i++,i<n.length&&n[i].kind==="Symbol"&&l&&t.set(n[i].value,l)),i++}}r++}return t}function er(e){const t=e.find(n=>q(n)&&R(n.value[0])&&n.value[0].name==="ns");return!t||!q(t)?null:t}function tr(e){const t=er(e);if(!t)return[];const n=[];for(let r=2;r<t.value.length;r++){const s=t.value[r];q(s)&&U(s.value[0])&&s.value[0].name===":require"&&n.push(s.value.slice(1))}return n}function De(e,t,n,r){if(!E(e))throw new o("require spec must be a vector, e.g. [my.ns :as alias]",{spec:e});const s=e.value;if(s.length===0||!R(s[0]))throw new o("First element of require spec must be a namespace symbol",{spec:e});const a=s[0].name;if(s.some(d=>U(d)&&d.name===":as-alias")){let d=1;for(;d<s.length;){const m=s[d];if(!U(m))throw new o(`Expected keyword in require spec, got ${m.kind}`,{spec:e,position:d});if(m.name===":as-alias"){d++;const g=s[d];if(!g||!R(g))throw new o(":as-alias expects a symbol alias",{spec:e,position:d});t.readerAliases||(t.readerAliases=new Map),t.readerAliases.set(g.name,a),d++}else throw new o(`:as-alias specs only support :as-alias, got ${m.name}`,{spec:e})}return}let l=n.get(a);if(!l&&r&&(r(a),l=n.get(a)),!l)throw new o(`Namespace ${a} not found. Only already-loaded namespaces can be required.`,{nsName:a});let f=1;for(;f<s.length;){const d=s[f];if(!U(d))throw new o(`Expected keyword in require spec, got ${d.kind}`,{spec:e,position:f});if(d.name===":as"){f++;const m=s[f];if(!m||!R(m))throw new o(":as expects a symbol alias",{spec:e,position:f});t.aliases||(t.aliases=new Map),t.aliases.set(m.name,l),f++}else if(d.name===":refer"){f++;const m=s[f];if(!m||!E(m))throw new o(":refer expects a vector of symbols",{spec:e,position:f});for(const g of m.value){if(!R(g))throw new o(":refer vector must contain only symbols",{spec:e,sym:g});let k;try{k=ie(g.name,l)}catch{throw new o(`Symbol ${g.name} not found in namespace ${a}`,{nsName:a,symbol:g.name})}Y(g.name,k,t)}f++}else throw new o(`Unknown require option ${d.name}. Supported: :as, :refer`,{spec:e,keyword:d.name})}}function nr(e,t){const n=e.registry;let r=e.currentNs;const s=n.get("clojure.core");s.resolveNs=x=>n.get(x)??null;const a=Ye();function i(x){const y=ct[x];if(y)return g(y(),x),!0;if(!(t?.readFile&&t?.sourceRoots))return!1;for(const S of t.sourceRoots){const L=`${S.replace(/\/$/,"")}/${x.replace(/\./g,"/")}.clj`;try{const D=t.readFile(L);if(D)return g(D),!0}catch{continue}}return!1}function l(x){if(!n.has(x)){const y=pe(s);y.namespace=x,n.set(x,y)}return n.get(x)}function f(x){l(x),r=x}function d(x){return n.get(x)??null}Y("require",c("require",(...x)=>{const y=n.get(r);for(const S of x)De(S,y,n,i);return b()}),s);function m(x,y){const S=tr(x);for(const L of S)for(const D of L)De(D,y,n,i)}function g(x,y){const S=Be(x),L=Vn(S)??y??"user",D=ze(S),ce=We(S,L,D),_=l(L);m(ce,_);for(const te of ce){const ft=a.expandAll(te,_);a.evaluate(ft,_)}}return{registry:n,get currentNs(){return r},setNs:f,getNs:d,loadFile:g,evaluate(x){try{const y=Be(x),S=d(r),L=ze(y);S.aliases?.forEach((_,te)=>{_.namespace&&L.set(te,_.namespace)}),S.readerAliases?.forEach((_,te)=>{L.set(te,_)});const D=We(y,r,L);m(D,S);let ce=b();for(const _ of D){const te=a.expandAll(_,S);ce=a.evaluate(te,S)}return ce}catch(y){throw y instanceof ye?new o(`Unhandled throw: ${p(y.value)}`,{thrownValue:y.value}):y instanceof le?new o("recur called outside of loop or fn",{args:y.args}):((y instanceof o||y instanceof $)&&y.pos&&(y.message+=Xt(x,y.pos)),y)}},evaluateForms(x){try{const y=d(r);let S=b();for(const L of x){const D=a.expandAll(L,y);S=a.evaluate(D,y)}return S}catch(y){throw y instanceof ye?new o(`Unhandled throw: ${p(y.value)}`,{thrownValue:y.value}):y instanceof le?new o("recur called outside of loop or fn",{args:y.args}):y}}}}function sr(e){const t=new Map,n=pe();n.namespace="clojure.core",mn(n,e?.output),t.set("clojure.core",n);const r=pe(n);r.namespace="user",t.set("user",r);const s=nr({registry:t,currentNs:"user"},e),a=ct["clojure.core"];if(!a)throw new Error("Missing built-in clojure.core source in registry");s.loadFile(a(),"clojure.core");for(const i of e?.entries??[])s.loadFile(i);return s}export{o as E,Te as a,b,sr as c,F as d,K as e,B as f,c as g,v as h,rr as i,j,A as k,p,Be as t};
