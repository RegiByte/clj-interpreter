(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(s){if(s.ep)return;s.ep=!0;const a=n(s);fetch(s.href,a)}})();class V extends Error{context;constructor(t,n){super(t),this.name="TokenizerError",this.context=n}}class $ extends Error{context;pos;constructor(t,n,r){super(t),this.name="ParserError",this.context=n,this.pos=r}}class o extends Error{context;pos;constructor(t,n,r){super(t),this.name="EvaluationError",this.context=n,this.pos=r}}class Re{value;constructor(t){this.value=t}}const g={number:"number",string:"string",boolean:"boolean",keyword:"keyword",nil:"nil",symbol:"symbol",list:"list",vector:"vector",map:"map",function:"function",nativeFunction:"native-function",macro:"macro",multiMethod:"multi-method",atom:"atom",reduced:"reduced",volatile:"volatile",regex:"regex"},x={LParen:"LParen",RParen:"RParen",LBracket:"LBracket",RBracket:"RBracket",LBrace:"LBrace",RBrace:"RBrace",String:"String",Number:"Number",Keyword:"Keyword",Quote:"Quote",Quasiquote:"Quasiquote",Unquote:"Unquote",UnquoteSplicing:"UnquoteSplicing",Comment:"Comment",Whitespace:"Whitespace",Symbol:"Symbol",AnonFnStart:"AnonFnStart",Deref:"Deref",Regex:"Regex"},X={Quote:"quote",Quasiquote:"quasiquote",Unquote:"unquote",UnquoteSplicing:"unquote-splicing",LParen:"(",RParen:")",LBracket:"[",RBracket:"]",LBrace:"{",RBrace:"}"};function h(e){switch(e.kind){case g.number:return e.value.toString();case g.string:let t="";for(const n of e.value)switch(n){case'"':t+='\\"';break;case"\\":t+="\\\\";break;case`
`:t+="\\n";break;case"\r":t+="\\r";break;case"	":t+="\\t";break;default:t+=n}return`"${t}"`;case g.boolean:return e.value?"true":"false";case g.nil:return"nil";case g.keyword:return`${e.name}`;case g.symbol:return`${e.name}`;case g.list:return`(${e.value.map(h).join(" ")})`;case g.vector:return`[${e.value.map(h).join(" ")}]`;case g.map:return`{${e.entries.map(([n,r])=>`${h(n)} ${h(r)}`).join(" ")}}`;case g.function:{if(e.arities.length===1){const r=e.arities[0];return`(fn [${(r.restParam?[...r.params,{kind:"symbol",name:"&"},r.restParam]:r.params).map(h).join(" ")}] ${r.body.map(h).join(" ")})`}return`(fn ${e.arities.map(r=>`([${(r.restParam?[...r.params,{kind:"symbol",name:"&"},r.restParam]:r.params).map(h).join(" ")}] ${r.body.map(h).join(" ")})`).join(" ")})`}case g.nativeFunction:return`(native-fn ${e.name})`;case g.multiMethod:return`(multi-method ${e.name})`;case g.atom:return`#<Atom ${h(e.value)}>`;case g.reduced:return`#<Reduced ${h(e.value)}>`;case g.volatile:return`#<Volatile ${h(e.value)}>`;case g.regex:{const n=e.pattern.replace(/"/g,'\\"');return`#"${e.flags?`(?${e.flags})`:""}${n}"`}default:throw new o(`unhandled value type: ${e.kind}`,{value:e})}}function ke(e){return e.join(`
`)}class yt extends Error{context;constructor(t,n){super(t),this.context=n,this.name="EnvError"}}function he(e){return{bindings:new Map,outer:e??null}}function qe(e,t){let n=t;for(;n;){if(n.bindings.has(e))return n.bindings.get(e);n=n.outer}throw new o(`Symbol ${e} not found`,{name:e})}function Me(e,t){let n=t;for(;n;){if(n.bindings.has(e))return n.bindings.get(e);n=n.outer}}function ee(e,t,n){n.bindings.set(e,t)}function me(e,t,n){if(e.length!==t.length)throw new yt("Number of parameters and arguments must match",{params:e,args:t,outer:n});const r=he(n);for(let s=0;s<e.length;s++)ee(e[s],t[s],r);return r}function ie(e){let t=e;for(;t?.outer;)t=t.outer;return t}function Ee(e){let t=e;for(;t;){if(t.namespace)return t;t=t.outer}return ie(e)}const B=e=>({kind:"number",value:e}),E=e=>({kind:"string",value:e}),k=e=>({kind:"boolean",value:e}),z=e=>({kind:"keyword",name:e}),y=()=>({kind:"nil",value:null}),P=e=>({kind:"symbol",name:e}),L=e=>({kind:"list",value:e}),I=e=>({kind:"vector",value:e}),W=e=>({kind:"map",entries:e}),Xe=(e,t)=>({kind:"function",arities:e,env:t}),c=(e,t)=>({kind:"native-function",name:e,fn:t}),D=(e,t)=>({kind:"native-function",name:e,fn:()=>{throw new o("Native function called without context",{name:e})},fnWithContext:t}),kt=(e,t)=>({kind:"macro",arities:e,env:t}),Ye=(e,t="")=>({kind:"regex",pattern:e,flags:t}),bt=e=>({kind:"atom",value:e}),De=e=>({kind:"reduced",value:e}),xt=e=>({kind:"volatile",value:e}),u=(e,t,n)=>({...e,meta:W([[z(":doc"),E(t)],...n?[[z(":arglists"),I(n.map(r=>I(r.map(P))))]]:[]])}),Pe=(e,t,n,r)=>({kind:"multi-method",name:e,dispatchFn:t,methods:n,defaultMethod:r});function $t(e){if(e.kind==="nil")return[];if(j(e)||F(e))return e.value;throw new o(`Cannot destructure ${e.kind} as a sequential collection`,{value:e})}function H(e,t){const n=e.entries.find(([r])=>M(r,t));return n?n[1]:void 0}function ve(e,t){return e.entries.some(([n])=>M(n,t))}function Rt(e,t,n,r){const s=[],a=[...e],i=a.findIndex(m=>A(m)&&m.kind==="keyword"&&m.name===":as");if(i!==-1){const m=a[i+1];if(!m||!R(m))throw new o(":as must be followed by a symbol",{pattern:e});s.push([m.name,t]),a.splice(i,2)}const l=a.findIndex(m=>R(m)&&m.name==="&");let p=null,f;if(l!==-1){if(p=a[l+1],!p)throw new o("& must be followed by a binding pattern",{pattern:e});f=l,a.splice(l)}else f=a.length;const d=$t(t);for(let m=0;m<f;m++)s.push(...se(a[m],d[m]??y(),n,r));if(p!==null){const m=d.slice(f);let v;if(S(p)&&m.length>0){const b=[];for(let w=0;w<m.length;w+=2)b.push([m[w],m[w+1]??y()]);v={kind:"map",entries:b}}else v=m.length>0?L(m):y();s.push(...se(p,v,n,r))}return s}function qt(e,t,n,r){const s=[],a=H(e,z(":or")),i=a&&S(a)?a:null,l=H(e,z(":as"));if(!S(t)&&t.kind!=="nil")throw new o(`Cannot destructure ${t.kind} as a map`,{value:t,pattern:e});const p=t.kind==="nil"?{entries:[]}:t;for(const[f,d]of e.entries){if(A(f)&&f.name===":or"||A(f)&&f.name===":as")continue;if(A(f)&&f.name===":keys"){if(!F(d))throw new o(":keys must be followed by a vector of symbols",{pattern:e});for(const w of d.value){if(!R(w))throw new o(":keys vector must contain symbols",{pattern:e,sym:w});const q=w.name.indexOf("/"),C=q!==-1?w.name.slice(q+1):w.name,U=z(":"+w.name),N=ve(p,U),T=N?H(p,U):void 0;let K;if(N)K=T;else if(i){const we=H(i,P(C));K=we!==void 0?n.evaluate(we,r):y()}else K=y();s.push([C,K])}continue}if(A(f)&&f.name===":strs"){if(!F(d))throw new o(":strs must be followed by a vector of symbols",{pattern:e});for(const w of d.value){if(!R(w))throw new o(":strs vector must contain symbols",{pattern:e,sym:w});const q=E(w.name),C=ve(p,q),U=C?H(p,q):void 0;let N;if(C)N=U;else if(i){const T=H(i,P(w.name));N=T!==void 0?n.evaluate(T,r):y()}else N=y();s.push([w.name,N])}continue}if(A(f)&&f.name===":syms"){if(!F(d))throw new o(":syms must be followed by a vector of symbols",{pattern:e});for(const w of d.value){if(!R(w))throw new o(":syms vector must contain symbols",{pattern:e,sym:w});const q=P(w.name),C=ve(p,q),U=C?H(p,q):void 0;let N;if(C)N=U;else if(i){const T=H(i,P(w.name));N=T!==void 0?n.evaluate(T,r):y()}else N=y();s.push([w.name,N])}continue}const m=H(p,d),v=ve(p,d);let b;if(v)b=m;else if(i&&R(f)){const w=H(i,P(f.name));b=w!==void 0?n.evaluate(w,r):y()}else b=y();s.push(...se(f,b,n,r))}return l&&R(l)&&s.push([l.name,t]),s}function se(e,t,n,r){if(R(e))return[[e.name,t]];if(F(e))return Rt(e.value,t,n,r);if(S(e))return qt(e,t,n,r);throw new o(`Invalid destructuring pattern: expected symbol, vector, or map, got ${e.kind}`,{pattern:e})}class fe{args;constructor(t){this.args=t}}function Oe(e,t){const n=e.value.findIndex(a=>R(a)&&a.name==="&");let r=[],s=null;if(n===-1)r=e.value;else{if(e.value.filter(i=>R(i)&&i.name==="&").length>1)throw new o("& can only appear once",{args:e,env:t});if(n!==e.value.length-2)throw new o("& must be second-to-last argument",{args:e,env:t});r=e.value.slice(0,n),s=e.value[n+1]}return{params:r,restParam:s}}function Te(e,t){if(e.length===0)throw new o("fn/defmacro requires at least a parameter vector",{forms:e,env:t});if(F(e[0])){const n=e[0],{params:r,restParam:s}=Oe(n,t);return[{params:r,restParam:s,body:e.slice(1)}]}if(j(e[0])){const n=[];for(const s of e){if(!j(s)||s.value.length===0)throw new o("Multi-arity clause must be a list starting with a parameter vector",{form:s,env:t});const a=s.value[0];if(!F(a))throw new o("First element of arity clause must be a parameter vector",{paramVec:a,env:t});const{params:i,restParam:l}=Oe(a,t);n.push({params:i,restParam:l,body:s.value.slice(1)})}if(n.filter(s=>s.restParam!==null).length>1)throw new o("At most one variadic arity is allowed per function",{forms:e,env:t});return n}throw new o("fn/defmacro expects a parameter vector or arity clauses",{forms:e,env:t})}function Ze(e,t,n,r,s,a){if(t===null){if(n.length!==e.length)throw new o(`Arguments length mismatch: fn accepts ${e.length} arguments, but ${n.length} were provided`,{params:e,args:n,outerEnv:r})}else if(n.length<e.length)throw new o(`Arguments length mismatch: fn expects at least ${e.length} arguments, but ${n.length} were provided`,{params:e,args:n,outerEnv:r});const i=[];for(let l=0;l<e.length;l++)i.push(...se(e[l],n[l],s,a));if(t!==null){const l=n.slice(e.length);let p;if(S(t)&&l.length>0){const f=[];for(let d=0;d<l.length;d+=2)f.push([l[d],l[d+1]??y()]);p={kind:"map",entries:f}}else p=l.length>0?L(l):y();i.push(...se(t,p,s,a))}return me(i.map(([l])=>l),i.map(([,l])=>l),r)}function Ve(e,t){const n=e.find(a=>a.restParam===null&&a.params.length===t);if(n)return n;const r=e.find(a=>a.restParam!==null&&t>=a.params.length);if(r)return r;const s=e.map(a=>a.restParam?`${a.params.length}+`:`${a.params.length}`);throw new o(`No matching arity for ${t} arguments. Available arities: ${s.join(", ")}`,{arities:e,argCount:t})}let jt=0;function et(e="G"){return`${e}__${jt++}`}function be(e,t,n=new Map,r){switch(e.kind){case g.vector:case g.list:{const s=j(e);if(s&&e.value.length===2&&R(e.value[0])&&e.value[0].name==="unquote")return r.evaluate(e.value[1],t);const a=[];for(const i of e.value){if(j(i)&&i.value.length===2&&R(i.value[0])&&i.value[0].name==="unquote-splicing"){const l=r.evaluate(i.value[1],t);if(!j(l)&&!F(l))throw new o("Unquote-splicing must evaluate to a list or vector",{elem:i,env:t});a.push(...l.value);continue}a.push(be(i,t,n,r))}return s?L(a):I(a)}case g.map:{const s=[];for(const[a,i]of e.entries){const l=be(a,t,n,r),p=be(i,t,n,r);s.push([l,p])}return W(s)}case g.number:case g.string:case g.boolean:case g.keyword:case g.nil:return e;case g.symbol:return e.name.endsWith("#")?(n.has(e.name)||n.set(e.name,et(e.name.slice(0,-1))),{kind:"symbol",name:n.get(e.name)}):e;default:throw new o(`Unexpected form: ${e.kind}`,{form:e,env:t})}}function tt(e){Ue(e,!0)}function Ft(e){return j(e)&&e.value.length>=1&&R(e.value[0])&&e.value[0].name===Z.recur}function Ue(e,t){for(let n=0;n<e.length;n++)ae(e[n],t&&n===e.length-1)}function ae(e,t){if(!j(e))return;if(Ft(e)){if(!t)throw new o("Can only recur from tail position",{form:e});return}if(e.value.length===0)return;const n=e.value[0];if(!R(n)){for(const s of e.value)ae(s,!1);return}const r=n.name;if(!(r===Z.fn||r===Z.loop||r===Z.quote||r===Z.quasiquote)){if(r===Z.if){e.value[1]&&ae(e.value[1],!1),e.value[2]&&ae(e.value[2],t),e.value[3]&&ae(e.value[3],t);return}if(r===Z.do){Ue(e.value.slice(1),t);return}if(r===Z.let){const s=e.value[1];if(F(s))for(let a=1;a<s.value.length;a+=2)ae(s.value[a],!1);Ue(e.value.slice(2),t);return}for(const s of e.value.slice(1))ae(s,!1)}}const Z={quote:"quote",def:"def",if:"if",do:"do",let:"let",fn:"fn",defmacro:"defmacro",quasiquote:"quasiquote",ns:"ns",loop:"loop",recur:"recur",defmulti:"defmulti",defmethod:"defmethod",try:"try"};function St(e){return c(`kw:${e.name}`,(...t)=>{const n=t[0];if(!S(n))return y();const r=n.entries.find(([s])=>M(s,e));return r?r[1]:y()})}function Et(e,t,n){const r=e.value.slice(1),s=[],a=[];let i=null;for(let d=0;d<r.length;d++){const m=r[d];if(j(m)&&m.value.length>0&&R(m.value[0])){const v=m.value[0].name;if(v==="catch"){if(m.value.length<3)throw new o("catch requires a discriminator and a binding symbol",{form:m,env:t});const b=m.value[1],w=m.value[2];if(!R(w))throw new o("catch binding must be a symbol",{form:m,env:t});a.push({discriminator:b,binding:w.name,body:m.value.slice(3)});continue}if(v==="finally"){if(d!==r.length-1)throw new o("finally clause must be the last in try expression",{form:m,env:t});i=m.value.slice(1);continue}}s.push(m)}function l(d,m){const v=n.evaluate(d,t);if(A(v)){if(v.name===":default")return!0;if(!S(m))return!1;const b=m.entries.find(([w])=>A(w)&&w.name===":type");return b?M(b[1],v):!1}if(O(v)){const b=n.applyFunction(v,[m],t);return Se(b)}throw new o("catch discriminator must be a keyword or a predicate function",{discriminator:v,env:t})}let p=y(),f=null;try{p=n.evaluateForms(s,t)}catch(d){if(d instanceof fe)throw d;let m;if(d instanceof Re)m=d.value;else if(d instanceof o)m=W([[z(":type"),z(":error/runtime")],[z(":message"),E(d.message)]]);else throw d;let v=!1;for(const b of a)if(l(b.discriminator,m)){const w=me([b.binding],[m],t);p=n.evaluateForms(b.body,w),v=!0;break}v||(f=d)}finally{i&&n.evaluateForms(i,t)}if(f!==null)throw f;return p}function Ct(e,t,n){return e.value[1]}function At(e,t,n){return be(e.value[1],t,new Map,n)}function It(e,t,n){const r=e.value[1];if(r.kind!=="symbol")throw new o("First element of list must be a symbol",{name:r,list:e,env:t});return e.value[2]===void 0||ee(r.name,n.evaluate(e.value[2],t),Ee(t)),y()}const Mt=(e,t,n)=>y();function Pt(e,t,n){const r=n.evaluate(e.value[1],t);return Fe(r)?e.value[3]?n.evaluate(e.value[3],t):y():n.evaluate(e.value[2],t)}function Ut(e,t,n){return n.evaluateForms(e.value.slice(1),t)}function Nt(e,t,n){const r=e.value[1];if(!F(r))throw new o("Bindings must be a vector",{bindings:r,env:t});if(r.value.length%2!==0)throw new o("Bindings must be a balanced pair of keys and values",{bindings:r,env:t});const s=e.value.slice(2);let a=t;for(let i=0;i<r.value.length;i+=2){const l=r.value[i],p=n.evaluate(r.value[i+1],a),f=se(l,p,n,a);a=me(f.map(([d])=>d),f.map(([,d])=>d),a)}return n.evaluateForms(s,a)}function Tt(e,t,n){const r=Te(e.value.slice(1),t);for(const s of r)tt(s.body);return Xe(r,t)}function Lt(e,t,n){const r=e.value[1];if(!R(r))throw new o("First element of defmacro must be a symbol",{name:r,list:e,env:t});const s=Te(e.value.slice(2),t),a=kt(s,t);return ee(r.name,a,ie(t)),y()}function Bt(e,t,n){const r=e.value[1];if(!F(r))throw new o("loop bindings must be a vector",{loopBindings:r,env:t});if(r.value.length%2!==0)throw new o("loop bindings must be a balanced pair of keys and values",{loopBindings:r,env:t});const s=e.value.slice(2);tt(s);const a=[],i=[];let l=t;for(let f=0;f<r.value.length;f+=2){const d=r.value[f],m=n.evaluate(r.value[f+1],l);a.push(d),i.push(m);const v=se(d,m,n,l);l=me(v.map(([b])=>b),v.map(([,b])=>b),l)}let p=i;for(;;){let f=t;for(let d=0;d<a.length;d++){const m=se(a[d],p[d],n,f);f=me(m.map(([v])=>v),m.map(([,v])=>v),f)}try{return n.evaluateForms(s,f)}catch(d){if(d instanceof fe){if(d.args.length!==a.length)throw new o(`recur expects ${a.length} arguments but got ${d.args.length}`,{list:e,env:t});p=d.args;continue}throw d}}}function Wt(e,t,n){const r=e.value.slice(1).map(s=>n.evaluate(s,t));throw new fe(r)}function zt(e,t,n){const r=e.value[1];if(!R(r))throw new o("defmulti: first argument must be a symbol",{list:e,env:t});const s=e.value[2];let a;if(A(s))a=St(s);else{const l=n.evaluate(s,t);if(!O(l))throw new o("defmulti: dispatch-fn must be a function or keyword",{list:e,env:t});a=l}const i=Pe(r.name,a,[]);return ee(r.name,i,Ee(t)),y()}function Dt(e,t,n){const r=e.value[1];if(!R(r))throw new o("defmethod: first argument must be a symbol",{list:e,env:t});const s=n.evaluate(e.value[2],t),a=qe(r.name,t);if(!nt(a))throw new o(`defmethod: ${r.name} is not a multimethod`,{list:e,env:t});const i=Te([e.value[3],...e.value.slice(4)],t),l=Xe(i,t),p=A(s)&&s.name===":default";let f;if(p)f=Pe(a.name,a.dispatchFn,a.methods,l);else{const d=a.methods.filter(m=>!M(m.dispatchVal,s));f=Pe(a.name,a.dispatchFn,[...d,{dispatchVal:s,fn:l}])}return ee(r.name,f,Ee(t)),y()}const Ot={try:Et,quote:Ct,quasiquote:At,def:It,ns:Mt,if:Pt,do:Ut,let:Nt,fn:Tt,defmacro:Lt,loop:Bt,recur:Wt,defmulti:zt,defmethod:Dt};function Kt(e,t,n,r){const s=Ot[e];if(s)return s(t,n,r);throw new o(`Unknown special form: ${e}`,{symbol:e,list:t,env:n})}const je=e=>e.kind==="nil",Fe=e=>e.kind==="nil"?!0:e.kind==="boolean"?!e.value:!1,Se=e=>!Fe(e),Qt=e=>e.kind==="symbol"&&e.name in Z,R=e=>e.kind==="symbol",F=e=>e.kind==="vector",j=e=>e.kind==="list",_t=e=>e.kind==="function",Jt=e=>e.kind==="native-function",Ne=e=>e.kind==="macro",S=e=>e.kind==="map",A=e=>e.kind==="keyword",O=e=>_t(e)||Jt(e),xe=e=>O(e)||A(e)||S(e),nt=e=>e.kind==="multi-method",ye=e=>e.kind==="atom",le=e=>e.kind==="reduced",$e=e=>e.kind==="volatile",rt=e=>e.kind==="regex",ue=e=>F(e)||S(e)||j(e),_=e=>ue(e)||e.kind==="string",dr=e=>typeof e=="object"&&e!==null&&"kind"in e&&e.kind in g,Gt={[g.number]:(e,t)=>e.value===t.value,[g.string]:(e,t)=>e.value===t.value,[g.boolean]:(e,t)=>e.value===t.value,[g.nil]:()=>!0,[g.symbol]:(e,t)=>e.name===t.name,[g.keyword]:(e,t)=>e.name===t.name,[g.vector]:(e,t)=>e.value.length!==t.value.length?!1:e.value.every((n,r)=>M(n,t.value[r])),[g.map]:(e,t)=>{if(e.entries.length!==t.entries.length)return!1;const n=new Set([...e.entries.map(([r])=>r),...t.entries.map(([r])=>r)]);for(const r of n){const s=e.entries.find(([i])=>M(i,r));if(!s)return!1;const a=t.entries.find(([i])=>M(i,r));if(!a||!M(s[1],a[1]))return!1}return!0},[g.list]:(e,t)=>e.value.length!==t.value.length?!1:e.value.every((n,r)=>M(n,t.value[r])),[g.atom]:(e,t)=>e===t,[g.reduced]:(e,t)=>M(e.value,t.value),[g.volatile]:(e,t)=>e===t,[g.regex]:(e,t)=>e===t},M=(e,t)=>{if(e.kind!==t.kind)return!1;const n=Gt[e.kind];return n?n(e,t):!1},Ht={"+":u(c("+",(...e)=>{if(e.length===0)return B(0);if(e.some(t=>t.kind!=="number"))throw new o("+ expects all arguments to be numbers",{args:e});return e.reduce((t,n)=>B(t.value+n.value),B(0))}),"Returns the sum of the arguments. Throws on non-number arguments.",[["&","nums"]]),"-":u(c("-",(...e)=>{if(e.length===0)throw new o("- expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("- expects all arguments to be numbers",{args:e});return e.slice(1).reduce((t,n)=>B(t.value-n.value),e[0])}),"Returns the difference of the arguments. Throws on non-number arguments.",[["&","nums"]]),"*":u(c("*",(...e)=>{if(e.length===0)return B(1);if(e.some(t=>t.kind!=="number"))throw new o("* expects all arguments to be numbers",{args:e});return e.slice(1).reduce((t,n)=>B(t.value*n.value),e[0])}),"Returns the product of the arguments. Throws on non-number arguments.",[["&","nums"]]),"/":u(c("/",(...e)=>{if(e.length===0)throw new o("/ expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("/ expects all arguments to be numbers",{args:e});return e.slice(1).reduce((t,n)=>{if(n.value===0)throw new o("division by zero",{args:e});return B(t.value/n.value)},e[0])}),"Returns the quotient of the arguments. Throws on non-number arguments or division by zero.",[["&","nums"]]),">":u(c(">",(...e)=>{if(e.length<2)throw new o("> expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("> expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value>=e[t-1].value)return k(!1);return k(!0)}),"Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.",[["&","nums"]]),"<":u(c("<",(...e)=>{if(e.length<2)throw new o("< expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("< expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value<=e[t-1].value)return k(!1);return k(!0)}),"Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.",[["&","nums"]]),">=":u(c(">=",(...e)=>{if(e.length<2)throw new o(">= expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o(">= expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value>e[t-1].value)return k(!1);return k(!0)}),"Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.",[["&","nums"]]),"<=":u(c("<=",(...e)=>{if(e.length<2)throw new o("<= expects at least two arguments",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("<= expects all arguments to be numbers",{args:e});for(let t=1;t<e.length;t++)if(e[t].value<e[t-1].value)return k(!1);return k(!0)}),"Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.",[["&","nums"]]),"=":u(c("=",(...e)=>{if(e.length<2)throw new o("= expects at least two arguments",{args:e});for(let t=1;t<e.length;t++)if(!M(e[t],e[t-1]))return k(!1);return k(!0)}),"Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.",[["&","vals"]]),inc:u(c("inc",e=>{if(e===void 0||e.kind!=="number")throw new o(`inc expects a number${e!==void 0?`, got ${h(e)}`:""}`,{x:e});return B(e.value+1)}),"Returns the argument incremented by 1. Throws on non-number arguments.",[["x"]]),dec:u(c("dec",e=>{if(e===void 0||e.kind!=="number")throw new o(`dec expects a number${e!==void 0?`, got ${h(e)}`:""}`,{x:e});return B(e.value-1)}),"Returns the argument decremented by 1. Throws on non-number arguments.",[["x"]]),max:u(c("max",(...e)=>{if(e.length===0)throw new o("max expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("max expects all arguments to be numbers",{args:e});return e.reduce((t,n)=>n.value>t.value?n:t)}),"Returns the largest of the arguments. Throws on non-number arguments.",[["&","nums"]]),min:u(c("min",(...e)=>{if(e.length===0)throw new o("min expects at least one argument",{args:e});if(e.some(t=>t.kind!=="number"))throw new o("min expects all arguments to be numbers",{args:e});return e.reduce((t,n)=>n.value<t.value?n:t)}),"Returns the smallest of the arguments. Throws on non-number arguments.",[["&","nums"]]),mod:u(c("mod",(e,t)=>{if(e===void 0||e.kind!=="number")throw new o(`mod expects a number as first argument${e!==void 0?`, got ${h(e)}`:""}`,{n:e});if(t===void 0||t.kind!=="number")throw new o(`mod expects a number as second argument${t!==void 0?`, got ${h(t)}`:""}`,{d:t});if(t.value===0)throw new o("mod: division by zero",{n:e,d:t});const n=e.value%t.value;return B(n<0?n+Math.abs(t.value):n)}),"Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.",[["n","d"]]),"even?":u(c("even?",e=>{if(e===void 0||e.kind!=="number")throw new o(`even? expects a number${e!==void 0?`, got ${h(e)}`:""}`,{n:e});return k(e.value%2===0)}),"Returns true if the argument is an even number, false otherwise.",[["n"]]),"odd?":u(c("odd?",e=>{if(e===void 0||e.kind!=="number")throw new o(`odd? expects a number${e!==void 0?`, got ${h(e)}`:""}`,{n:e});return k(Math.abs(e.value)%2!==0)}),"Returns true if the argument is an odd number, false otherwise.",[["n"]]),"pos?":u(c("pos?",e=>{if(e===void 0||e.kind!=="number")throw new o(`pos? expects a number${e!==void 0?`, got ${h(e)}`:""}`,{n:e});return k(e.value>0)}),"Returns true if the argument is a positive number, false otherwise.",[["n"]]),"neg?":u(c("neg?",e=>{if(e===void 0||e.kind!=="number")throw new o(`neg? expects a number${e!==void 0?`, got ${h(e)}`:""}`,{n:e});return k(e.value<0)}),"Returns true if the argument is a negative number, false otherwise.",[["n"]]),"zero?":u(c("zero?",e=>{if(e===void 0||e.kind!=="number")throw new o(`zero? expects a number${e!==void 0?`, got ${h(e)}`:""}`,{n:e});return k(e.value===0)}),"Returns true if the argument is zero, false otherwise.",[["n"]])},Xt={atom:u(c("atom",e=>bt(e)),"Returns a new atom holding the given value.",[["value"]]),deref:u(c("deref",e=>{if(ye(e)||$e(e)||le(e))return e.value;throw new o(`deref expects an atom, volatile, or reduced value, got ${e.kind}`,{value:e})}),"Returns the wrapped value from an atom, volatile, or reduced value.",[["value"]]),"swap!":u(D("swap!",(e,t,n,r,...s)=>{if(!ye(n))throw new o(`swap! expects an atom as its first argument, got ${n.kind}`,{atomVal:n});if(!O(r))throw new o(`swap! expects a function as its second argument, got ${r.kind}`,{fn:r});const a=e.applyFunction(r,[n.value,...s],t);return n.value=a,a}),"Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.",[["atomVal","fn","&","extraArgs"]]),"reset!":u(c("reset!",(e,t)=>{if(!ye(e))throw new o(`reset! expects an atom as its first argument, got ${e.kind}`,{atomVal:e});return e.value=t,t}),"Sets the value of the atom to newVal and returns the new value.",[["atomVal","newVal"]]),"atom?":u(c("atom?",e=>k(ye(e))),"Returns true if the value is an atom, false otherwise.",[["value"]])};function G(e){switch(e.kind){case g.string:return e.value;case g.number:return e.value.toString();case g.boolean:return e.value?"true":"false";case g.keyword:return e.name;case g.symbol:return e.name;case g.list:return`(${e.value.map(G).join(" ")})`;case g.vector:return`[${e.value.map(G).join(" ")}]`;case g.map:return`{${e.entries.map(([t,n])=>`${G(t)} ${G(n)}`).join(" ")}}`;case g.function:{if(e.arities.length===1){const n=e.arities[0];return`(fn [${(n.restParam?[...n.params,{kind:"symbol",name:"&"},n.restParam]:n.params).map(G).join(" ")}] ${n.body.map(G).join(" ")})`}return`(fn ${e.arities.map(n=>`([${(n.restParam?[...n.params,{kind:"symbol",name:"&"},n.restParam]:n.params).map(G).join(" ")}] ${n.body.map(G).join(" ")})`).join(" ")})`}case g.nativeFunction:return`(native-fn ${e.name})`;case g.nil:return"nil";case g.regex:return`${e.flags?`(?${e.flags})`:""}${e.pattern}`;default:throw new o(`unhandled value type: ${e.kind}`,{value:e})}}const J=e=>{if(j(e)||F(e))return e.value;if(S(e))return e.entries.map(([t,n])=>I([t,n]));if(e.kind==="string")return[...e.value].map(E);throw new o(`toSeq expects a collection or string, got ${h(e)}`,{collection:e})},Yt={list:u(c("list",(...e)=>e.length===0?L([]):L(e)),"Returns a new list containing the given values.",[["&","args"]]),vector:u(c("vector",(...e)=>e.length===0?I([]):I(e)),"Returns a new vector containing the given values.",[["&","args"]]),"hash-map":u(c("hash-map",(...e)=>{if(e.length===0)return W([]);if(e.length%2!==0)throw new o(`hash-map expects an even number of arguments, got ${e.length}`,{args:e});const t=[];for(let n=0;n<e.length;n+=2){const r=e[n],s=e[n+1];t.push([r,s])}return W(t)}),"Returns a new hash-map containing the given key-value pairs.",[["&","kvals"]]),seq:u(c("seq",e=>{if(e.kind==="nil")return y();if(!_(e))throw new o(`seq expects a collection, string, or nil, got ${h(e)}`,{collection:e});const t=J(e);return t.length===0?y():L(t)}),"Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.",[["coll"]]),first:u(c("first",e=>{if(e.kind==="nil")return y();if(!_(e))throw new o("first expects a collection or string",{collection:e});const t=J(e);return t.length===0?y():t[0]}),"Returns the first element of the given collection or string.",[["coll"]]),rest:u(c("rest",e=>{if(e.kind==="nil")return L([]);if(!_(e))throw new o("rest expects a collection or string",{collection:e});if(j(e))return e.value.length===0?e:L(e.value.slice(1));if(F(e))return I(e.value.slice(1));if(S(e))return e.entries.length===0?e:W(e.entries.slice(1));if(e.kind==="string"){const t=J(e);return L(t.slice(1))}throw new o(`rest expects a collection or string, got ${h(e)}`,{collection:e})}),"Returns a sequence of the given collection or string excluding the first element.",[["coll"]]),conj:u(c("conj",(e,...t)=>{if(!e)throw new o("conj expects a collection as first argument",{collection:e});if(t.length===0)return e;if(!ue(e))throw new o(`conj expects a collection, got ${h(e)}`,{collection:e});if(j(e)){const n=[];for(let r=t.length-1;r>=0;r--)n.push(t[r]);return L([...n,...e.value])}if(F(e))return I([...e.value,...t]);if(S(e)){const n=[...e.entries];for(let r=0;r<t.length;r+=1){const s=t[r];if(s.kind!=="vector")throw new o(`conj on maps expects each argument to be a vector key-pair for maps, got ${h(s)}`,{pair:s});if(s.value.length!==2)throw new o(`conj on maps expects each argument to be a vector key-pair for maps, got ${h(s)}`,{pair:s});const a=s.value[0],i=n.findIndex(l=>M(l[0],a));i===-1?n.push([a,s.value[1]]):n[i]=[a,s.value[1]]}return W([...n])}throw new o(`unhandled collection type, got ${h(e)}`,{collection:e})}),"Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail.",[["collection","&","args"]]),cons:u(c("cons",(e,t)=>{if(!ue(t))throw new o(`cons expects a collection as second argument, got ${h(t)}`,{xs:t});if(S(t))throw new o("cons on maps is not supported, use vectors instead",{xs:t});const n=j(t)?L:I,r=[e,...t.value];return n(r)}),"Returns a new collection with x prepended to the head of xs.",[["x","xs"]]),assoc:u(c("assoc",(e,...t)=>{if(!e)throw new o("assoc expects a collection as first argument",{collection:e});if(je(e)&&(e=W([])),j(e))throw new o("assoc on lists is not supported, use vectors instead",{collection:e});if(!ue(e))throw new o(`assoc expects a collection, got ${h(e)}`,{collection:e});if(t.length<2)throw new o("assoc expects at least two arguments",{args:t});if(t.length%2!==0)throw new o("assoc expects an even number of binding arguments",{args:t});if(F(e)){const n=[...e.value];for(let r=0;r<t.length;r+=2){const s=t[r];if(s.kind!=="number")throw new o(`assoc on vectors expects each key argument to be a index (number), got ${h(s)}`,{index:s});if(s.value>n.length)throw new o(`assoc index ${s.value} is out of bounds for vector of length ${n.length}`,{index:s,collection:e});n[s.value]=t[r+1]}return I(n)}if(S(e)){const n=[...e.entries];for(let r=0;r<t.length;r+=2){const s=t[r],a=t[r+1],i=n.findIndex(l=>M(l[0],s));i===-1?n.push([s,a]):n[i]=[s,a]}return W(n)}throw new o(`unhandled collection type, got ${h(e)}`,{collection:e})}),"Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.",[["collection","&","kvals"]]),dissoc:u(c("dissoc",(e,...t)=>{if(!e)throw new o("dissoc expects a collection as first argument",{collection:e});if(j(e))throw new o("dissoc on lists is not supported, use vectors instead",{collection:e});if(!ue(e))throw new o(`dissoc expects a collection, got ${h(e)}`,{collection:e});if(F(e)){if(e.value.length===0)return e;const n=[...e.value];for(let r=0;r<t.length;r+=1){const s=t[r];if(s.kind!=="number")throw new o(`dissoc on vectors expects each key argument to be a index (number), got ${h(s)}`,{index:s});if(s.value>=n.length)throw new o(`dissoc index ${s.value} is out of bounds for vector of length ${n.length}`,{index:s,collection:e});n.splice(s.value,1)}return I(n)}if(S(e)){if(e.entries.length===0)return e;const n=[...e.entries];for(let r=0;r<t.length;r+=1){const s=t[r],a=n.findIndex(i=>M(i[0],s));if(a===-1)return e;n.splice(a,1)}return W(n)}throw new o(`unhandled collection type, got ${h(e)}`,{collection:e})}),"Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.",[["collection","&","keys"]]),get:u(c("get",(e,t,n)=>{const r=n??y();switch(e.kind){case g.map:{const s=e.entries;for(const[a,i]of s)if(M(a,t))return i;return r}case g.vector:{const s=e.value;if(t.kind!=="number")throw new o("get on vectors expects a 0-based index as parameter",{key:t});return t.value<0||t.value>=s.length?r:s[t.value]}default:return r}}),"Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.",[["target","key"],["target","key","not-found"]]),nth:u(c("nth",(e,t,n)=>{if(e===void 0||!j(e)&&!F(e))throw new o(`nth expects a list or vector${e!==void 0?`, got ${h(e)}`:""}`,{coll:e});if(t===void 0||t.kind!=="number")throw new o(`nth expects a number index${t!==void 0?`, got ${h(t)}`:""}`,{n:t});const r=t.value,s=e.value;if(r<0||r>=s.length){if(n!==void 0)return n;throw new o(`nth index ${r} is out of bounds for collection of length ${s.length}`,{coll:e,n:t})}return s[r]}),"Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.",[["coll","n","not-found"]]),concat:u(c("concat",(...e)=>{const t=[];for(const n of e){if(!_(n))throw new o(`concat expects collections or strings, got ${h(n)}`,{coll:n});t.push(...J(n))}return L(t)}),"Returns a new sequence that is the concatenation of the given sequences or strings.",[["&","colls"]]),zipmap:u(c("zipmap",(e,t)=>{if(e===void 0||!_(e))throw new o(`zipmap expects a collection or string as first argument${e!==void 0?`, got ${h(e)}`:""}`,{ks:e});if(t===void 0||!_(t))throw new o(`zipmap expects a collection or string as second argument${t!==void 0?`, got ${h(t)}`:""}`,{vs:t});const n=J(e),r=J(t),s=Math.min(n.length,r.length),a=[];for(let i=0;i<s;i++)a.push([n[i],r[i]]);return W(a)}),"Returns a new map with the keys and values of the given collections.",[["ks","vs"]]),last:u(c("last",e=>{if(e===void 0||!j(e)&&!F(e))throw new o(`last expects a list or vector${e!==void 0?`, got ${h(e)}`:""}`,{coll:e});const t=e.value;return t.length===0?y():t[t.length-1]}),"Returns the last element of the given collection.",[["coll"]]),reverse:u(c("reverse",e=>{if(e===void 0||!j(e)&&!F(e))throw new o(`reverse expects a list or vector${e!==void 0?`, got ${h(e)}`:""}`,{coll:e});return L([...e.value].reverse())}),"Returns a new sequence with the elements of the given collection in reverse order.",[["coll"]]),"empty?":u(c("empty?",e=>{if(e===void 0)throw new o("empty? expects one argument",{});if(e.kind==="nil")return k(!0);if(!_(e))throw new o(`empty? expects a collection, string, or nil, got ${h(e)}`,{coll:e});return k(J(e).length===0)}),"Returns true if coll has no items. Accepts collections, strings, and nil.",[["coll"]]),"contains?":u(c("contains?",(e,t)=>{if(e===void 0)throw new o("contains? expects a collection as first argument",{});if(t===void 0)throw new o("contains? expects a key as second argument",{});if(e.kind==="nil")return k(!1);if(S(e))return k(e.entries.some(([n])=>M(n,t)));if(F(e))return t.kind!=="number"?k(!1):k(t.value>=0&&t.value<e.value.length);throw new o(`contains? expects a map, vector, or nil, got ${h(e)}`,{coll:e})}),"Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.",[["coll","key"]]),repeat:u(c("repeat",(e,t)=>{if(e===void 0||e.kind!=="number")throw new o(`repeat expects a number as first argument${e!==void 0?`, got ${h(e)}`:""}`,{n:e});return L(Array(e.value).fill(t))}),"Returns a sequence of n copies of x.",[["n","x"]]),range:u(c("range",(...e)=>{if(e.length===0||e.length>3)throw new o("range expects 1, 2, or 3 arguments: (range n), (range start end), or (range start end step)",{args:e});if(e.some(a=>a.kind!=="number"))throw new o("range expects number arguments",{args:e});let t,n,r;if(e.length===1?(t=0,n=e[0].value,r=1):e.length===2?(t=e[0].value,n=e[1].value,r=1):(t=e[0].value,n=e[1].value,r=e[2].value),r===0)throw new o("range step cannot be zero",{args:e});const s=[];if(r>0)for(let a=t;a<n;a+=r)s.push(B(a));else for(let a=t;a>n;a+=r)s.push(B(a));return L(s)}),"Returns a sequence of numbers from start (inclusive) to end (exclusive), incrementing by step. If step is positive, the sequence is generated from start to end, otherwise it is generated from end to start.",[["n"],["start","end"],["start","end","step"]]),keys:u(c("keys",e=>{if(e===void 0||!S(e))throw new o(`keys expects a map${e!==void 0?`, got ${h(e)}`:""}`,{m:e});return I(e.entries.map(([t])=>t))}),"Returns a vector of the keys of the given map.",[["m"]]),vals:u(c("vals",e=>{if(e===void 0||!S(e))throw new o(`vals expects a map${e!==void 0?`, got ${h(e)}`:""}`,{m:e});return I(e.entries.map(([,t])=>t))}),"Returns a vector of the values of the given map.",[["m"]]),count:u(c("count",e=>{if(![g.list,g.vector,g.map,g.string].includes(e.kind))throw new o(`count expects a countable value, got ${h(e)}`,{countable:e});switch(e.kind){case g.list:return B(e.value.length);case g.vector:return B(e.value.length);case g.map:return B(e.entries.length);case g.string:return B(e.value.length);default:throw new o(`count expects a countable value, got ${h(e)}`,{countable:e})}}),"Returns the number of elements in the given countable value.",[["countable"]])},Zt={throw:u(c("throw",(...e)=>{throw e.length!==1?new o(`throw requires exactly 1 argument, got ${e.length}`,{args:e}):new Re(e[0])}),"Throws a value as an exception. The value may be any CljValue; maps are idiomatic.",[["value"]]),"ex-info":u(c("ex-info",(...e)=>{if(e.length<2)throw new o(`ex-info requires at least 2 arguments, got ${e.length}`,{args:e});const[t,n,r]=e;if(t.kind!=="string")throw new o("ex-info: first argument must be a string",{msg:t});const s=[[z(":message"),t],[z(":data"),n]];return r!==void 0&&s.push([z(":cause"),r]),W(s)}),"Creates an error map with :message and :data keys. Optionally accepts a :cause.",[["msg","data"],["msg","data","cause"]]),"ex-message":u(c("ex-message",(...e)=>{const[t]=e;if(!S(t))return y();const n=t.entries.find(([r])=>A(r)&&r.name===":message");return n?n[1]:y()}),"Returns the :message of an error map, or nil.",[["e"]]),"ex-data":u(c("ex-data",(...e)=>{const[t]=e;if(!S(t))return y();const n=t.entries.find(([r])=>A(r)&&r.name===":data");return n?n[1]:y()}),"Returns the :data map of an error map, or nil.",[["e"]]),"ex-cause":u(c("ex-cause",(...e)=>{const[t]=e;if(!S(t))return y();const n=t.entries.find(([r])=>A(r)&&r.name===":cause");return n?n[1]:y()}),"Returns the :cause of an error map, or nil.",[["e"]])},Vt={reduce:u(D("reduce",(e,t,n,...r)=>{if(n===void 0||!O(n))throw new o(`reduce expects a function as first argument${n!==void 0?`, got ${h(n)}`:""}`,{fn:n});if(r.length===0||r.length>2)throw new o("reduce expects 2 or 3 arguments: (reduce f coll) or (reduce f init coll)",{fn:n});const s=r.length===2,a=s?r[0]:void 0,i=s?r[1]:r[0];if(i.kind==="nil"){if(!s)throw new o("reduce called on empty collection with no initial value",{fn:n});return a}if(!_(i))throw new o(`reduce expects a collection or string, got ${h(i)}`,{collection:i});const l=J(i);if(!s){if(l.length===0)throw new o("reduce called on empty collection with no initial value",{fn:n});if(l.length===1)return l[0];let f=l[0];for(let d=1;d<l.length;d++){const m=e.applyFunction(n,[f,l[d]],t);if(le(m))return m.value;f=m}return f}let p=a;for(const f of l){const d=e.applyFunction(n,[p,f],t);if(le(d))return d.value;p=d}return p}),"Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).",[["f","coll"],["f","val","coll"]]),apply:u(D("apply",(e,t,n,...r)=>{if(n===void 0||!xe(n))throw new o(`apply expects a callable as first argument${n!==void 0?`, got ${h(n)}`:""}`,{fn:n});if(r.length===0)throw new o("apply expects at least 2 arguments",{fn:n});const s=r[r.length-1];if(!je(s)&&!_(s))throw new o(`apply expects a collection or string as last argument, got ${h(s)}`,{lastArg:s});const a=[...r.slice(0,-1),...je(s)?[]:J(s)];return e.applyCallable(n,a,t)}),"Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.",[["f","args"],["f","&","args"]]),partial:u(c("partial",(e,...t)=>{if(e===void 0||!xe(e))throw new o(`partial expects a callable as first argument${e!==void 0?`, got ${h(e)}`:""}`,{fn:e});const n=e;return D("partial",(r,s,...a)=>r.applyCallable(n,[...t,...a],s))}),"Returns a function that calls f with pre-applied args prepended to any additional arguments.",[["f","&","args"]]),comp:u(c("comp",(...e)=>{if(e.length===0)return c("identity",n=>n);if(e.some(n=>!xe(n)))throw new o("comp expects functions or other callable values (keywords, maps)",{fns:e});const t=e;return D("composed",(n,r,...s)=>{let a=n.applyCallable(t[t.length-1],s,r);for(let i=t.length-2;i>=0;i--)a=n.applyCallable(t[i],[a],r);return a})}),"Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and maps.",[[],["f"],["f","g"],["f","g","&","fns"]]),identity:u(c("identity",e=>{if(e===void 0)throw new o("identity expects one argument",{});return e}),"Returns its single argument unchanged.",[["x"]])},en={meta:u(c("meta",e=>{if(e===void 0)throw new o("meta expects one argument",{});return e.kind==="function"||e.kind==="native-function"?e.meta??y():y()}),"Returns the metadata map of a value, or nil if the value has no metadata.",[["val"]]),"with-meta":u(c("with-meta",(e,t)=>{if(e===void 0)throw new o("with-meta expects two arguments",{});if(t===void 0)throw new o("with-meta expects two arguments",{});if(t.kind!=="map"&&t.kind!=="nil")throw new o(`with-meta expects a map as second argument, got ${h(t)}`,{m:t});if(e.kind!=="function"&&e.kind!=="native-function")throw new o(`with-meta only supports functions, got ${h(e)}`,{val:e});const n=t.kind==="nil"?void 0:t;return{...e,meta:n}}),"Returns a new value with the metadata map m applied to val.",[["val","m"]])};function st(e,t,n,r){if(e.kind==="native-function")return e.fnWithContext?e.fnWithContext(n,r,...t):e.fn(...t);if(e.kind==="function"){const s=Ve(e.arities,t.length);let a=t;for(;;){const i=Ze(s.params,s.restParam,a,e.env,n,r);try{return n.evaluateForms(s.body,i)}catch(l){if(l instanceof fe){a=l.args;continue}throw l}}}throw new o(`${e.kind} is not a callable function`,{fn:e,args:t})}function tn(e,t,n,r){if(O(e))return st(e,t,n,r);if(A(e)){const s=t[0],a=t.length>1?t[1]:y();if(S(s)){const i=s.entries.find(([l])=>M(l,e));return i?i[1]:a}return a}if(S(e)){if(t.length===0)throw new o("Map used as function requires at least one argument",{fn:e,args:t});const s=t[0],a=t.length>1?t[1]:y(),i=e.entries.find(([l])=>M(l,s));return i?i[1]:a}throw new o(`${h(e)} is not a callable value`,{fn:e,args:t})}function nn(e,t,n){const r=Ve(e.arities,t.length),s=Ze(r.params,r.restParam,t,e.env,n,e.env);return n.evaluateForms(r.body,s)}function oe(e,t,n){if(F(e)){const l=e.value.map(p=>oe(p,t,n));return l.every((p,f)=>p===e.value[f])?e:I(l)}if(S(e)){const l=e.entries.map(([p,f])=>[oe(p,t,n),oe(f,t,n)]);return l.every(([p,f],d)=>p===e.entries[d][0]&&f===e.entries[d][1])?e:W(l)}if(!j(e)||e.value.length===0)return e;const r=e.value[0];if(!R(r)){const l=e.value.map(p=>oe(p,t,n));return l.every((p,f)=>p===e.value[f])?e:L(l)}const s=r.name;if(s==="quote"||s==="quasiquote")return e;const a=Me(s,t);if(a!==void 0&&Ne(a)){const l=n.applyMacro(a,e.value.slice(1));return oe(l,t,n)}const i=e.value.map(l=>oe(l,t,n));return i.every((l,p)=>l===e.value[p])?e:L(i)}function re(e,t){Object.defineProperty(e,"_pos",{value:t,enumerable:!1,writable:!0,configurable:!0})}function rn(e){return e._pos}function sn(e,t){const n=e.split(`
`);let r=0;for(let a=0;a<n.length;a++){const i=r+n[a].length;if(t<=i)return{line:a+1,col:t-r,lineText:n[a]};r=i+1}const s=n[n.length-1];return{line:n.length,col:s.length,lineText:s}}function an(e,t){const{line:n,col:r,lineText:s}=sn(e,t.start),a=Math.max(1,t.end-t.start),i=" ".repeat(r)+"^".repeat(a);return`
  at line ${n}, col ${r+1}:
  ${s}
  ${i}`}function on(e,t,n){return I(e.value.map(r=>n.evaluate(r,t)))}function ln(e,t,n){let r=[];for(const[s,a]of e.entries){const i=n.evaluate(s,t),l=n.evaluate(a,t);r.push([i,l])}return W(r)}function un(e,t,n,r){const s=n.applyFunction(e.dispatchFn,t,r),a=e.methods.find(({dispatchVal:i})=>M(i,s));if(a)return n.applyFunction(a.fn,t,r);if(e.defaultMethod)return n.applyFunction(e.defaultMethod,t,r);throw new o(`No method in multimethod '${e.name}' for dispatch value ${h(s)}`,{mm:e,dispatchVal:s})}function cn(e,t,n){if(e.value.length===0)throw new o("Unexpected empty list",{list:e,env:t});const r=e.value[0];if(Qt(r))return Kt(r.name,e,t,n);const s=n.evaluate(r,t);if(nt(s)){const i=e.value.slice(1).map(l=>n.evaluate(l,t));return un(s,i,n,t)}if(!xe(s)){const i=R(r)?r.name:h(r);throw new o(`${i} is not callable`,{list:e,env:t})}const a=e.value.slice(1).map(i=>n.evaluate(i,t));return n.applyCallable(s,a,t)}function fn(e,t,n){try{switch(e.kind){case g.number:case g.string:case g.keyword:case g.nil:case g.function:case g.multiMethod:case g.boolean:case g.regex:return e;case g.symbol:{const r=e.name.indexOf("/");if(r>0&&r<e.name.length-1){const s=e.name.slice(0,r),a=e.name.slice(r+1),l=Ee(t).aliases?.get(s)??ie(t).resolveNs?.(s)??null;if(!l)throw new o(`No such namespace or alias: ${s}`,{symbol:e.name,env:t});return qe(a,l)}return qe(e.name,t)}case g.vector:return on(e,t,n);case g.map:return ln(e,t,n);case g.list:return cn(e,t,n);default:throw new o("Unexpected value",{expr:e,env:t})}}catch(r){if(r instanceof o&&!r.pos){const s=rn(e);s&&(r.pos=s)}throw r}}function dn(e,t,n){let r=y();for(const s of e)r=n.evaluate(s,t);return r}function at(){const e={evaluate:(t,n)=>fn(t,n,e),evaluateForms:(t,n)=>dn(t,n,e),applyFunction:(t,n,r)=>st(t,n,e,r),applyCallable:(t,n,r)=>tn(t,n,e,r),applyMacro:(t,n)=>nn(t,n,e),expandAll:(t,n)=>oe(t,n,e)};return e}function Ke(e,t,n=he()){return at().applyFunction(e,t,n)}const pn={"nil?":u(c("nil?",e=>k(e.kind==="nil")),"Returns true if the value is nil, false otherwise.",[["arg"]]),"true?":u(c("true?",e=>e.kind!=="boolean"?k(!1):k(e.value===!0)),"Returns true if the value is a boolean and true, false otherwise.",[["arg"]]),"false?":u(c("false?",e=>e.kind!=="boolean"?k(!1):k(e.value===!1)),"Returns true if the value is a boolean and false, false otherwise.",[["arg"]]),"truthy?":u(c("truthy?",e=>k(Se(e))),"Returns true if the value is not nil or false, false otherwise.",[["arg"]]),"falsy?":u(c("falsy?",e=>k(Fe(e))),"Returns true if the value is nil or false, false otherwise.",[["arg"]]),"not=":u(c("not=",(...e)=>{if(e.length<2)throw new o("not= expects at least two arguments",{args:e});for(let t=1;t<e.length;t++)if(!M(e[t],e[t-1]))return k(!0);return k(!1)}),"Returns true if any two adjacent arguments are not equal, false otherwise.",[["&","vals"]]),"number?":u(c("number?",e=>k(e!==void 0&&e.kind==="number")),"Returns true if the value is a number, false otherwise.",[["x"]]),"string?":u(c("string?",e=>k(e!==void 0&&e.kind==="string")),"Returns true if the value is a string, false otherwise.",[["x"]]),"boolean?":u(c("boolean?",e=>k(e!==void 0&&e.kind==="boolean")),"Returns true if the value is a boolean, false otherwise.",[["x"]]),"vector?":u(c("vector?",e=>k(e!==void 0&&F(e))),"Returns true if the value is a vector, false otherwise.",[["x"]]),"list?":u(c("list?",e=>k(e!==void 0&&j(e))),"Returns true if the value is a list, false otherwise.",[["x"]]),"map?":u(c("map?",e=>k(e!==void 0&&S(e))),"Returns true if the value is a map, false otherwise.",[["x"]]),"keyword?":u(c("keyword?",e=>k(e!==void 0&&A(e))),"Returns true if the value is a keyword, false otherwise.",[["x"]]),"qualified-keyword?":u(c("qualified-keyword?",e=>k(e!==void 0&&A(e)&&e.name.includes("/"))),"Returns true if the value is a qualified keyword, false otherwise.",[["x"]]),"symbol?":u(c("symbol?",e=>k(e!==void 0&&R(e))),"Returns true if the value is a symbol, false otherwise.",[["x"]]),"qualified-symbol?":u(c("qualified-symbol?",e=>k(e!==void 0&&R(e)&&e.name.includes("/"))),"Returns true if the value is a qualified symbol, false otherwise.",[["x"]]),"fn?":u(c("fn?",e=>k(e!==void 0&&O(e))),"Returns true if the value is a function, false otherwise.",[["x"]]),"coll?":u(c("coll?",e=>k(e!==void 0&&ue(e))),"Returns true if the value is a collection, false otherwise.",[["x"]]),some:u(c("some",(e,t)=>{if(e===void 0||!O(e))throw new o(`some expects a function as first argument${e!==void 0?`, got ${h(e)}`:""}`,{pred:e});if(t===void 0)return y();if(!_(t))throw new o(`some expects a collection or string as second argument, got ${h(t)}`,{coll:t});for(const n of J(t)){const r=Ke(e,[n]);if(Se(r))return r}return y()}),"Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.",[["pred","coll"]]),"every?":u(c("every?",(e,t)=>{if(e===void 0||!O(e))throw new o(`every? expects a function as first argument${e!==void 0?`, got ${h(e)}`:""}`,{pred:e});if(t===void 0||!_(t))throw new o(`every? expects a collection or string as second argument${t!==void 0?`, got ${h(t)}`:""}`,{coll:t});for(const n of J(t))if(Fe(Ke(e,[n])))return k(!1);return k(!0)}),"Returns true if all items in coll satisfy pred, false otherwise.",[["pred","coll"]])};function hn(e){let t=e,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(t))!==null;){for(const a of s[1]){if(a==="x")throw new o("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",{});n.includes(a)||(n+=a)}t=t.slice(s[0].length)}return{pattern:t,flags:n}}function Ce(e,t){if(!rt(e))throw new o(`${t} expects a regex as first argument, got ${h(e)}`,{val:e});return e}function Ae(e,t){if(e.kind!=="string")throw new o(`${t} expects a string as second argument, got ${h(e)}`,{val:e});return e.value}function Ie(e){return e.length===1?E(e[0]):I(e.map(t=>t==null?y():E(t)))}const mn={"regexp?":u(c("regexp?",e=>k(e!==void 0&&rt(e))),"Returns true if x is a regular expression pattern.",[["x"]]),"re-pattern":u(c("re-pattern",e=>{if(e===void 0||e.kind!=="string")throw new o(`re-pattern expects a string argument${e!==void 0?`, got ${h(e)}`:""}`,{s:e});const{pattern:t,flags:n}=hn(e.value);return Ye(t,n)}),`Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.
  (re-pattern "\\\\d+") produces the same pattern as #"\\d+".`,[["s"]]),"re-find":u(c("re-find",(e,t)=>{const n=Ce(e,"re-find"),r=Ae(t,"re-find"),a=new RegExp(n.pattern,n.flags).exec(r);return a?Ie(a):y()}),`Returns the next regex match, if any, of string to pattern, using
  java.util.regex.Matcher.find(). Returns the match or nil. When there
  are groups, returns a vector of the whole match and groups (nil for
  unmatched optional groups).`,[["re","s"]]),"re-matches":u(c("re-matches",(e,t)=>{const n=Ce(e,"re-matches"),r=Ae(t,"re-matches"),a=new RegExp(n.pattern,n.flags).exec(r);return!a||a.index!==0||a[0].length!==r.length?y():Ie(a)}),`Returns the match, if any, of string to pattern, using
  java.util.regex.Matcher.matches(). The entire string must match.
  Returns the match or nil. When there are groups, returns a vector
  of the whole match and groups (nil for unmatched optional groups).`,[["re","s"]]),"re-seq":u(c("re-seq",(e,t)=>{const n=Ce(e,"re-seq"),r=Ae(t,"re-seq"),s=new RegExp(n.pattern,n.flags+"g"),a=[];let i;for(;(i=s.exec(r))!==null;){if(i[0].length===0){s.lastIndex++;continue}a.push(Ie(i))}return a.length===0?y():{kind:"list",value:a}}),`Returns a lazy sequence of successive matches of pattern in string,
  using java.util.regex.Matcher.find(), each such match processed with
  re-groups.`,[["re","s"]]),"str-split*":u(c("str-split*",(e,t,n)=>{if(e===void 0||e.kind!=="string")throw new o(`str-split* expects a string as first argument${e!==void 0?`, got ${h(e)}`:""}`,{sVal:e});const r=e.value,a=n!==void 0&&n.kind!=="nil"&&n.kind==="number"?n.value:void 0;let i,l;if(t.kind!=="regex")throw new o(`str-split* expects a regex pattern as second argument, got ${h(t)}`,{sepVal:t});if(t.pattern===""){const d=[...r];if(a===void 0||a>=d.length)return I(d.map(E));const m=[...d.slice(0,a-1),d.slice(a-1).join("")];return I(m.map(E))}i=t.pattern,l=t.flags;const p=new RegExp(i,l+"g"),f=gn(r,p,a);return I(f.map(d=>E(d)))}),`Internal helper for clojure.string/split. Splits string s by a regex or
  string separator. Optional limit keeps all parts when provided.`,[["s","sep"],["s","sep","limit"]])};function gn(e,t,n){const r=[];let s=0,a,i=0;for(;(a=t.exec(e))!==null;){if(a[0].length===0){t.lastIndex++;continue}if(n!==void 0&&i>=n-1)break;r.push(e.slice(s,a.index)),s=a.index+a[0].length,i++}if(r.push(e.slice(s)),n===void 0)for(;r.length>0&&r[r.length-1]==="";)r.pop();return r}function Q(e,t){if(e===void 0||e.kind!=="string")throw new o(`${t} expects a string as first argument${e!==void 0?`, got ${h(e)}`:""}`,{val:e});return e.value}function de(e,t,n){if(e===void 0||e.kind!=="string")throw new o(`${n} expects a string as ${t} argument${e!==void 0?`, got ${h(e)}`:""}`,{val:e});return e.value}function wn(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function vn(e){return e.replace(/\$/g,"$$$$")}function yn(e,t){let n=-1;for(let s=t.length-1;s>=0;s--)if(typeof t[s]=="number"){n=s;break}const r=n>0?t.slice(0,n):[];return r.length===0?E(e):I([E(e),...r.map(s=>s==null?y():E(String(s)))])}function Qe(e,t,n,r,s,a,i){const l=Q(r,n);if(s===void 0||a===void 0)throw new o(`${n} expects 3 arguments`,{});if(s.kind==="string"){if(a.kind!=="string")throw new o(`${n}: when match is a string, replacement must also be a string, got ${h(a)}`,{replVal:a});const p=new RegExp(wn(s.value),i?"g":"");return E(l.replace(p,vn(a.value)))}if(s.kind==="regex"){const p=s,f=i?p.flags+"g":p.flags,d=new RegExp(p.pattern,f);if(a.kind==="string")return E(l.replace(d,a.value));if(O(a)){const m=a,v=l.replace(d,(b,...w)=>{const q=yn(b,w),C=e.applyFunction(m,[q],t);return G(C)});return E(v)}throw new o(`${n}: replacement must be a string or function, got ${h(a)}`,{replVal:a})}throw new o(`${n}: match must be a string or regex, got ${h(s)}`,{matchVal:s})}const kn={"str-upper-case*":u(c("str-upper-case*",e=>E(Q(e,"str-upper-case*").toUpperCase())),"Internal helper. Converts s to upper-case.",[["s"]]),"str-lower-case*":u(c("str-lower-case*",e=>E(Q(e,"str-lower-case*").toLowerCase())),"Internal helper. Converts s to lower-case.",[["s"]]),"str-trim*":u(c("str-trim*",e=>E(Q(e,"str-trim*").trim())),"Internal helper. Removes whitespace from both ends of s.",[["s"]]),"str-triml*":u(c("str-triml*",e=>E(Q(e,"str-triml*").trimStart())),"Internal helper. Removes whitespace from the left of s.",[["s"]]),"str-trimr*":u(c("str-trimr*",e=>E(Q(e,"str-trimr*").trimEnd())),"Internal helper. Removes whitespace from the right of s.",[["s"]]),"str-reverse*":u(c("str-reverse*",e=>E([...Q(e,"str-reverse*")].reverse().join(""))),"Internal helper. Returns s with its characters reversed (Unicode-safe).",[["s"]]),"str-starts-with*":u(c("str-starts-with*",(e,t)=>{const n=Q(e,"str-starts-with*"),r=de(t,"second","str-starts-with*");return k(n.startsWith(r))}),"Internal helper. Returns true if s starts with substr.",[["s","substr"]]),"str-ends-with*":u(c("str-ends-with*",(e,t)=>{const n=Q(e,"str-ends-with*"),r=de(t,"second","str-ends-with*");return k(n.endsWith(r))}),"Internal helper. Returns true if s ends with substr.",[["s","substr"]]),"str-includes*":u(c("str-includes*",(e,t)=>{const n=Q(e,"str-includes*"),r=de(t,"second","str-includes*");return k(n.includes(r))}),"Internal helper. Returns true if s contains substr.",[["s","substr"]]),"str-index-of*":u(c("str-index-of*",(e,t,n)=>{const r=Q(e,"str-index-of*"),s=de(t,"second","str-index-of*");let a;if(n!==void 0&&n.kind!=="nil"){if(n.kind!=="number")throw new o(`str-index-of* expects a number as third argument, got ${h(n)}`,{fromVal:n});a=r.indexOf(s,n.value)}else a=r.indexOf(s);return a===-1?y():B(a)}),"Internal helper. Returns index of value in s, or nil if not found.",[["s","value"],["s","value","from-index"]]),"str-last-index-of*":u(c("str-last-index-of*",(e,t,n)=>{const r=Q(e,"str-last-index-of*"),s=de(t,"second","str-last-index-of*");let a;if(n!==void 0&&n.kind!=="nil"){if(n.kind!=="number")throw new o(`str-last-index-of* expects a number as third argument, got ${h(n)}`,{fromVal:n});a=r.lastIndexOf(s,n.value)}else a=r.lastIndexOf(s);return a===-1?y():B(a)}),"Internal helper. Returns last index of value in s, or nil if not found.",[["s","value"],["s","value","from-index"]]),"str-replace*":u(D("str-replace*",(e,t,n,r,s)=>Qe(e,t,"str-replace*",n,r,s,!0)),"Internal helper. Replaces all occurrences of match with replacement in s.",[["s","match","replacement"]]),"str-replace-first*":u(D("str-replace-first*",(e,t,n,r,s)=>Qe(e,t,"str-replace-first*",n,r,s,!1)),"Internal helper. Replaces the first occurrence of match with replacement in s.",[["s","match","replacement"]])},bn={reduced:u(c("reduced",e=>{if(e===void 0)throw new o("reduced expects one argument",{});return De(e)}),"Returns a reduced value, indicating termination of the reduction process.",[["value"]]),"reduced?":u(c("reduced?",e=>{if(e===void 0)throw new o("reduced? expects one argument",{});return k(le(e))}),"Returns true if the given value is a reduced value, false otherwise.",[["value"]]),unreduced:u(c("unreduced",e=>{if(e===void 0)throw new o("unreduced expects one argument",{});return le(e)?e.value:e}),"Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.",[["value"]]),"ensure-reduced":u(c("ensure-reduced",e=>{if(e===void 0)throw new o("ensure-reduced expects one argument",{});return le(e)?e:De(e)}),"Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.",[["value"]]),"volatile!":u(c("volatile!",e=>{if(e===void 0)throw new o("volatile! expects one argument",{});return xt(e)}),"Returns a volatile value with the given value as its value.",[["value"]]),"volatile?":u(c("volatile?",e=>{if(e===void 0)throw new o("volatile? expects one argument",{});return k($e(e))}),"Returns true if the given value is a volatile value, false otherwise.",[["value"]]),"vreset!":u(c("vreset!",(e,t)=>{if(!$e(e))throw new o(`vreset! expects a volatile as its first argument, got ${h(e)}`,{vol:e});if(t===void 0)throw new o("vreset! expects two arguments",{vol:e});return e.value=t,t}),"Resets the value of the given volatile to the given new value and returns the new value.",[["vol","newVal"]]),"vswap!":u(D("vswap!",(e,t,n,r,...s)=>{if(!$e(n))throw new o(`vswap! expects a volatile as its first argument, got ${h(n)}`,{vol:n});if(!O(r))throw new o(`vswap! expects a function as its second argument, got ${h(r)}`,{fn:r});const a=e.applyFunction(r,[n.value,...s],t);return n.value=a,a}),"Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.",[["vol","fn"],["vol","fn","&","extraArgs"]]),transduce:u(D("transduce",(e,t,n,r,s,a)=>{if(!O(n))throw new o(`transduce expects a transducer (function) as first argument, got ${h(n)}`,{xf:n});if(!O(r))throw new o(`transduce expects a reducing function as second argument, got ${h(r)}`,{f:r});if(s===void 0)throw new o("transduce expects 3 or 4 arguments: (transduce xf f coll) or (transduce xf f init coll)",{});let i,l;a===void 0?(l=s,i=e.applyFunction(r,[],t)):(i=s,l=a);const p=e.applyFunction(n,[r],t);if(je(l))return e.applyFunction(p,[i],t);if(!_(l))throw new o(`transduce expects a collection or string as ${a===void 0?"third":"fourth"} argument, got ${h(l)}`,{coll:l});const f=J(l);let d=i;for(const m of f){const v=e.applyFunction(p,[d,m],t);if(le(v)){d=v.value;break}d=v}return e.applyFunction(p,[d],t)}),ke(["reduce with a transformation of f (xf). If init is not","supplied, (f) will be called to produce it. f should be a reducing","step function that accepts both 1 and 2 arguments, if it accepts","only 2 you can add the arity-1 with 'completing'. Returns the result","of applying (the transformed) xf to init and the first item in coll,","then applying xf to that result and the 2nd item, etc. If coll","contains no items, returns init and f is not called. Note that","certain transforms may inject or skip items."]),[["xform","f","coll"],["xform","f","init","coll"]])},xn={str:u(c("str",(...e)=>E(e.map(G).join(""))),"Returns a concatenated string representation of the given values.",[["&","args"]]),subs:u(c("subs",(e,t,n)=>{if(e===void 0||e.kind!=="string")throw new o(`subs expects a string as first argument${e!==void 0?`, got ${h(e)}`:""}`,{s:e});if(t===void 0||t.kind!=="number")throw new o(`subs expects a number as second argument${t!==void 0?`, got ${h(t)}`:""}`,{start:t});if(n!==void 0&&n.kind!=="number")throw new o(`subs expects a number as optional third argument${n!==void 0?`, got ${h(n)}`:""}`,{end:n});const r=t.value,s=n?.value;return E(s===void 0?e.value.slice(r):e.value.slice(r,s))}),"Returns the substring of s beginning at start, and optionally ending before end.",[["s","start"],["s","start","end"]]),type:u(c("type",e=>{if(e===void 0)throw new o("type expects an argument",{x:e});const n={number:":number",string:":string",boolean:":boolean",nil:":nil",keyword:":keyword",symbol:":symbol",list:":list",vector:":vector",map:":map",function:":function",regex:":regex","native-function":":function"}[e.kind];if(!n)throw new o(`type: unhandled kind ${e.kind}`,{x:e});return z(n)}),"Returns a keyword representing the type of the given value.",[["x"]]),gensym:u(c("gensym",(...e)=>{if(e.length>1)throw new o("gensym takes 0 or 1 arguments",{args:e});const t=e[0];if(t!==void 0&&t.kind!=="string")throw new o(`gensym prefix must be a string${t!==void 0?`, got ${h(t)}`:""}`,{prefix:t});const n=t?.kind==="string"?t.value:"G";return P(et(n))}),'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',[[],["prefix"]]),eval:u(D("eval",(e,t,n)=>{if(n===void 0)throw new o("eval expects a form as argument",{form:n});const r=ie(t),s=e.expandAll(n,r);return e.evaluate(s,r)}),"Evaluates the given form in the global environment and returns the result.",[["form"]]),"macroexpand-1":u(D("macroexpand-1",(e,t,n)=>{if(!j(n)||n.value.length===0)return n;const r=n.value[0];if(!R(r))return n;const s=Me(r.name,ie(t));return s===void 0||!Ne(s)?n:e.applyMacro(s,n.value.slice(1))}),"If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.",[["form"]]),macroexpand:u(D("macroexpand",(e,t,n)=>{const r=ie(t);let s=n;for(;;){if(!j(s)||s.value.length===0)return s;const a=s.value[0];if(!R(a))return s;const i=Me(a.name,r);if(i===void 0||!Ne(i))return s;s=e.applyMacro(i,s.value.slice(1))}}),ke(["Expands all macros until the expansion is stable (head is no longer a macro)","","Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms"]),[["form"]]),"macroexpand-all":u(D("macroexpand-all",(e,t,n)=>e.expandAll(n,ie(t))),ke(["Fully expands all macros in a form recursively — including in sub-forms.","","Unlike macroexpand, this descends into every sub-expression.","Expansion stops at quote/quasiquote boundaries and fn/loop bodies."]),[["form"]]),namespace:u(c("namespace",e=>{if(e===void 0)throw new o("namespace expects an argument",{x:e});let t;if(A(e))t=e.name.slice(1);else if(R(e))t=e.name;else throw new o(`namespace expects a keyword or symbol, got ${h(e)}`,{x:e});const n=t.indexOf("/");return n<=0?y():E(t.slice(0,n))}),"Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.",[["x"]]),name:u(c("name",e=>{if(e===void 0)throw new o("name expects an argument",{x:e});let t;if(A(e))t=e.name.slice(1);else if(R(e))t=e.name;else{if(e.kind==="string")return e;throw new o(`name expects a keyword, symbol, or string, got ${h(e)}`,{x:e})}const n=t.indexOf("/");return E(n>=0?t.slice(n+1):t)}),"Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.",[["x"]]),keyword:u(c("keyword",(...e)=>{if(e.length===0||e.length>2)throw new o("keyword expects 1 or 2 string arguments",{args:e});if(e[0].kind!=="string")throw new o(`keyword expects a string, got ${h(e[0])}`,{args:e});if(e.length===1)return z(`:${e[0].value}`);if(e[1].kind!=="string")throw new o(`keyword second argument must be a string, got ${h(e[1])}`,{args:e});return z(`:${e[0].value}/${e[1].value}`)}),ke(["Constructs a keyword with the given name and namespace strings. Returns a keyword value.","","Note: do not use : in the keyword strings, it will be added automatically.",'e.g. (keyword "foo") => :foo']),[["name"],["ns","name"]]),boolean:u(c("boolean",e=>k(e===void 0?!1:Se(e))),"Coerces to boolean. Everything is true except false and nil.",[["x"]])},$n={...Ht,...Xt,...Yt,...Zt,...pn,...Vt,...en,...bn,...mn,...kn,...xn};function Rn(e,t){for(const[n,r]of Object.entries($n))ee(n,r,e);t&&ee("println",c("println",(...n)=>{const r=n.map(G).join(" ");return t(r),y()}),e)}const ot=(e,t,n)=>({line:e,col:t,offset:n}),it=(e,t)=>({peek:(n=0)=>{const r=t.offset+n;return r>=e.length?null:e[r]},isAtEnd:()=>t.offset>=e.length,position:()=>({offset:t.offset,line:t.line,col:t.col})});function qn(e){const t=ot(0,0,0),n={...it(e,t),advance:()=>{if(t.offset>=e.length)return null;const r=e[t.offset];return t.offset++,r===`
`?(t.line++,t.col=0):t.col++,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s.join("")}};return n}function jn(e){const t=ot(0,0,0),n={...it(e,t),advance:()=>{if(t.offset>=e.length)return null;const r=e[t.offset];return t.offset++,t.col=r.end.col,t.line=r.end.line,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s},consumeN(r){for(let s=0;s<r;s++)n.advance()}};return n}const Fn=e=>e===`
`,ge=e=>[" ",",",`
`,"\r","	"].includes(e),Le=e=>e===";",lt=e=>e==="(",ut=e=>e===")",ct=e=>e==="[",ft=e=>e==="]",dt=e=>e==="{",pt=e=>e==="}",Sn=e=>e==='"',ht=e=>e==="'",mt=e=>e==="`",En=e=>e==="~",Be=e=>e==="@",ce=e=>{const t=parseInt(e);return isNaN(t)?!1:t>=0&&t<=9},Cn=e=>e===".",gt=e=>e===":",An=e=>e==="#",We=e=>lt(e)||ut(e)||ct(e)||ft(e)||dt(e)||pt(e)||mt(e)||ht(e)||Be(e),In=e=>{const t=e.scanner,n=t.position();return t.consumeWhile(ge),{kind:x.Whitespace,start:n,end:t.position()}},Mn=e=>{const t=e.scanner,n=t.position();t.advance();const r=t.consumeWhile(s=>!Fn(s));return!t.isAtEnd()&&t.peek()===`
`&&t.advance(),{kind:x.Comment,value:r,start:n,end:t.position()}},Pn=e=>{const t=e.scanner,n=t.position();t.advance();const r=[];let s=!1;for(;!t.isAtEnd();){const a=t.peek();if(a==="\\"){t.advance();const i=t.peek();switch(i){case'"':r.push('"');break;case"\\":r.push("\\");break;case"n":r.push(`
`);break;case"r":r.push("\r");break;case"t":r.push("	");break;default:r.push(i)}t.isAtEnd()||t.advance();continue}if(a==='"'){t.advance(),s=!0;break}r.push(t.advance())}if(!s)throw new V(`Unterminated string detected at ${n.offset}`,t.position());return{kind:x.String,value:r.join(""),start:n,end:t.position()}},Un=e=>{const t=e.scanner,n=t.position(),r=t.consumeWhile(s=>gt(s)||!ge(s)&&!We(s)&&!Le(s));return{kind:x.Keyword,value:r,start:n,end:t.position()}};function Nn(e,t){const r=t.scanner.peek(1);return ce(e)||e==="-"&&r!==null&&ce(r)}const Tn=e=>{const t=e.scanner,n=t.position();let r="";if(t.peek()==="-"&&(r+=t.advance()),r+=t.consumeWhile(ce),!t.isAtEnd()&&t.peek()==="."&&t.peek(1)!==null&&ce(t.peek(1))&&(r+=t.advance(),r+=t.consumeWhile(ce)),!t.isAtEnd()&&(t.peek()==="e"||t.peek()==="E")){r+=t.advance(),!t.isAtEnd()&&(t.peek()==="+"||t.peek()==="-")&&(r+=t.advance());const s=t.consumeWhile(ce);if(s.length===0)throw new V(`Invalid number format at line ${n.line} column ${n.col}: "${r}"`,{start:n,end:t.position()});r+=s}if(!t.isAtEnd()&&Cn(t.peek()))throw new V(`Invalid number format at line ${n.line} column ${n.col}: "${r}${t.consumeWhile(s=>!ge(s)&&!We(s))}"`,{start:n,end:t.position()});return{kind:x.Number,value:Number(r),start:n,end:t.position()}},Ln=e=>{const t=e.scanner,n=t.position(),r=t.consumeWhile(s=>!ge(s)&&!We(s)&&!Le(s));return{kind:x.Symbol,value:r,start:n,end:t.position()}},Bn=e=>{const t=e.scanner,n=t.position();return t.advance(),{kind:"Deref",start:n,end:t.position()}},Wn=(e,t)=>{const n=e.scanner;n.advance();const r=[];let s=!1;for(;!n.isAtEnd();){const a=n.peek();if(a==="\\"){n.advance();const i=n.peek();if(i===null)throw new V(`Unterminated regex literal at ${t.offset}`,n.position());i==='"'?r.push('"'):(r.push("\\"),r.push(i)),n.advance();continue}if(a==='"'){n.advance(),s=!0;break}r.push(n.advance())}if(!s)throw new V(`Unterminated regex literal at ${t.offset}`,n.position());return{kind:x.Regex,value:r.join(""),start:t,end:n.position()}};function zn(e){const t=e.scanner,n=t.position();t.advance();const r=t.peek();if(r==="(")return t.advance(),{kind:x.AnonFnStart,start:n,end:t.position()};if(r==='"')return Wn(e,n);throw r==="{"?new V("Set literals are not yet supported",n):new V(`Unknown dispatch character: #${r??"EOF"}`,n)}function ne(e,t){return n=>{const r=n.scanner,s=r.position();return r.advance(),{kind:e,value:t,start:s,end:r.position()}}}function Dn(e){const t=e.scanner,n=t.position();t.advance();const r=t.peek();if(!r)throw new V(`Unexpected end of input while parsing unquote at ${n.offset}`,n);return Be(r)?(t.advance(),{kind:x.UnquoteSplicing,value:X.UnquoteSplicing,start:n,end:t.position()}):{kind:x.Unquote,value:X.Unquote,start:n,end:t.position()}}const On=[[ge,In],[Le,Mn],[lt,ne(x.LParen,X.LParen)],[ut,ne(x.RParen,X.RParen)],[ct,ne(x.LBracket,X.LBracket)],[ft,ne(x.RBracket,X.RBracket)],[dt,ne(x.LBrace,X.LBrace)],[pt,ne(x.RBrace,X.RBrace)],[Sn,Pn],[gt,Un],[Nn,Tn],[ht,ne(x.Quote,X.Quote)],[mt,ne(x.Quasiquote,X.Quasiquote)],[En,Dn],[Be,Bn],[An,zn]];function Kn(e){const n=e.scanner.peek(),r=On.find(([s])=>s(n,e));if(r){const[,s]=r;return s(e)}return Ln(e)}function Qn(e){const t=[];let n;try{for(;!e.scanner.isAtEnd();){const s=Kn(e);if(!s)break;s.kind!==x.Whitespace&&t.push(s)}}catch(s){n=s}return{tokens:t,scanner:e.scanner,error:n}}function te(e){return"value"in e?e.value:""}function _e(e){const t=e.length,r={scanner:qn(e)},s=Qn(r);if(s.error)throw s.error;if(s.scanner.position().offset!==t)throw new V(`Unexpected end of input, expected ${t} characters, got ${s.scanner.position().offset}`,s.scanner.position());return s.tokens}function _n(e){const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input",t.position());switch(n.kind){case x.Symbol:return er(t);case x.String:{t.advance();const r={kind:"string",value:n.value};return re(r,{start:n.start.offset,end:n.end.offset}),r}case x.Number:{t.advance();const r={kind:"number",value:n.value};return re(r,{start:n.start.offset,end:n.end.offset}),r}case x.Keyword:{t.advance();const r=n.value;let s;if(r.startsWith("::")){const a=r.slice(2);if(a.includes("/")){const i=a.indexOf("/"),l=a.slice(0,i),p=a.slice(i+1),f=e.aliases.get(l);if(!f)throw new $(`No namespace alias '${l}' found for ::${l}/${p}`,n,{start:n.start.offset,end:n.end.offset});s={kind:"keyword",name:`:${f}/${p}`}}else s={kind:"keyword",name:`:${e.namespace}/${a}`}}else s={kind:"keyword",name:r};return re(s,{start:n.start.offset,end:n.end.offset}),s}}throw new $(`Unexpected token: ${n.kind}`,n,{start:n.start.offset,end:n.end.offset})}const Jn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing quote",t.position());t.advance();const r=Y(e);if(!r)throw new $(`Unexpected token: ${te(n)}`,n);return{kind:g.list,value:[P("quote"),r]}},Gn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing quasiquote",t.position());t.advance();const r=Y(e);if(!r)throw new $(`Unexpected token: ${te(n)}`,n);return{kind:g.list,value:[P("quasiquote"),r]}},Hn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing unquote",t.position());t.advance();const r=Y(e);if(!r)throw new $(`Unexpected token: ${te(n)}`,n);return{kind:g.list,value:[P("unquote"),r]}},Xn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing deref",t.position());t.advance();const r=Y(e);if(!r)throw new $(`Unexpected token: ${te(n)}`,n);return{kind:g.list,value:[P("deref"),r]}},Yn=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing unquote splicing",t.position());t.advance();const r=Y(e);if(!r)throw new $(`Unexpected token: ${te(n)}`,n);return{kind:g.list,value:[P("unquote-splicing"),r]}},ze=e=>[x.RParen,x.RBracket,x.RBrace].includes(e.kind),wt=(e,t)=>function(n){const r=n.scanner,s=r.peek();if(!s)throw new $("Unexpected end of input while parsing collection",r.position());r.advance();const a=[];let i=!1,l;for(;!r.isAtEnd();){const f=r.peek();if(!f)break;if(ze(f)&&f.kind!==t)throw new $(`Expected '${t}' to close ${e} started at line ${s.start.line} column ${s.start.col}, but got '${te(f)}' at line ${f.start.line} column ${f.start.col}`,f,{start:f.start.offset,end:f.end.offset});if(f.kind===t){l=f.end.offset,r.advance(),i=!0;break}const d=Y(n);a.push(d)}if(!i)throw new $(`Unmatched ${e} started at line ${s.start.line} column ${s.start.col}`,r.peek());const p={kind:e,value:a};return l!==void 0&&re(p,{start:s.start.offset,end:l}),p},Zn=wt("list",x.RParen),Vn=wt("vector",x.RBracket),er=e=>{const t=e.peek();if(!t)throw new $("Unexpected end of input",e.position());if(t.kind!==x.Symbol)throw new $(`Unexpected token: ${te(t)}`,t,{start:t.start.offset,end:t.end.offset});e.advance();let n;switch(t.value){case"true":case"false":n=k(t.value==="true");break;case"nil":n=y();break;default:n=P(t.value)}return re(n,{start:t.start.offset,end:t.end.offset}),n},tr=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing map",t.position());let r=!1,s;t.advance();const a=[];for(;!t.isAtEnd();){const l=t.peek();if(!l)break;if(ze(l)&&l.kind!==x.RBrace)throw new $(`Expected '}' to close map started at line ${n.start.line} column ${n.start.col}, but got '${l.kind}' at line ${l.start.line} column ${l.start.col}`,l,{start:l.start.offset,end:l.end.offset});if(l.kind===x.RBrace){s=l.end.offset,t.advance(),r=!0;break}const p=Y(e),f=t.peek();if(!f)throw new $(`Expected value in map started at line ${n.start.line} column ${n.start.col}, but got end of input`,t.position());if(f.kind===x.RBrace)throw new $(`Map started at line ${n.start.line} column ${n.start.col} has key ${p.kind} but no value`,t.position());const d=Y(e);if(!d)break;a.push([p,d])}if(!r)throw new $(`Unmatched map started at line ${n.start.line} column ${n.start.col}`,t.peek());const i={kind:g.map,entries:a};return s!==void 0&&re(i,{start:n.start.offset,end:s}),i};function nr(e){let t=0,n=!1;function r(s){switch(s.kind){case"symbol":{const a=s.name;a==="%"||a==="%1"?t=Math.max(t,1):/^%[2-9]$/.test(a)?t=Math.max(t,parseInt(a[1])):a==="%&"&&(n=!0);break}case"list":case"vector":for(const a of s.value)r(a);break;case"map":for(const[a,i]of s.entries)r(a),r(i);break}}for(const s of e)r(s);return{maxIndex:t,hasRest:n}}function pe(e){switch(e.kind){case"symbol":{const t=e.name;return t==="%"||t==="%1"?P("p1"):/^%[2-9]$/.test(t)?P(`p${t[1]}`):t==="%&"?P("rest"):e}case"list":return{...e,value:e.value.map(pe)};case"vector":return{...e,value:e.value.map(pe)};case"map":return{...e,entries:e.entries.map(([t,n])=>[pe(t),pe(n)])};default:return e}}const rr=e=>{const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input while parsing anonymous function",t.position());t.advance();const r=[];let s=!1,a;for(;!t.isAtEnd();){const v=t.peek();if(!v)break;if(ze(v)&&v.kind!==x.RParen)throw new $(`Expected ')' to close anonymous function started at line ${n.start.line} column ${n.start.col}, but got '${te(v)}' at line ${v.start.line} column ${v.start.col}`,v,{start:v.start.offset,end:v.end.offset});if(v.kind===x.RParen){a=v.end.offset,t.advance(),s=!0;break}if(v.kind===x.AnonFnStart)throw new $("Nested anonymous functions (#(...)) are not allowed",v,{start:v.start.offset,end:v.end.offset});r.push(Y(e))}if(!s)throw new $(`Unmatched anonymous function started at line ${n.start.line} column ${n.start.col}`,t.peek());const i={kind:"list",value:r},{maxIndex:l,hasRest:p}=nr([i]),f=[];for(let v=1;v<=l;v++)f.push(P(`p${v}`));p&&(f.push(P("&")),f.push(P("rest")));const d=pe(i),m=L([P("fn"),I(f),d]);return a!==void 0&&re(m,{start:n.start.offset,end:a}),m};function sr(e){let t=e,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(t))!==null;){for(const a of s[1]){if(a==="x")throw new $("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",null);n.includes(a)||(n+=a)}t=t.slice(s[0].length)}return{pattern:t,flags:n}}const ar=e=>{const t=e.scanner,n=t.peek();if(!n||n.kind!==x.Regex)throw new $("Expected regex token",t.position());t.advance();const{pattern:r,flags:s}=sr(n.value),a=Ye(r,s);return re(a,{start:n.start.offset,end:n.end.offset}),a};function Y(e){const t=e.scanner,n=t.peek();if(!n)throw new $("Unexpected end of input",t.position());switch(n.kind){case x.String:case x.Number:case x.Keyword:case x.Symbol:return _n(e);case x.LParen:return Zn(e);case x.LBrace:return tr(e);case x.LBracket:return Vn(e);case x.Quote:return Jn(e);case x.Quasiquote:return Gn(e);case x.Unquote:return Hn(e);case x.UnquoteSplicing:return Yn(e);case x.AnonFnStart:return rr(e);case x.Deref:return Xn(e);case x.Regex:return ar(e);default:throw new $(`Unexpected token: ${te(n)} at line ${n.start.line} column ${n.start.col}`,n,{start:n.start.offset,end:n.end.offset})}}function Je(e,t="user",n=new Map){const r=e.filter(l=>l.kind!==x.Comment),s=jn(r),a={scanner:s,namespace:t,aliases:n},i=[];for(;!s.isAtEnd();)i.push(Y(a));return i}const or=`(ns clojure.core)

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
    (reduce (fn [acc f] (conj acc (apply f args))) [] fns)))

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

(defn get-in
  "Returns the value in a nested associative structure, where ks is a
  sequence of keys. Returns nil if the key is not present, or the not-found
  value if supplied."
  ([m ks]
   (reduce get m ks))
  ([m ks not-found]
   (loop [m m, ks (seq ks)]
     (if (nil? ks)
       m
       (if (contains? m (first ks))
         (recur (get m (first ks)) (next ks))
         not-found)))))

(defn assoc-in
  "Associates a value in a nested associative structure, where ks is a
  sequence of keys and v is the new value. Returns a new nested structure."
  [m [k & ks] v]
  (if ks
    (assoc m k (assoc-in (get m k) ks v))
    (assoc m k v)))

(defn update-in
  "Updates a value in a nested associative structure, where ks is a
  sequence of keys and f is a function that will take the old value and any
  supplied args and return the new value. Returns a new nested structure."
  [m ks f & args]
  (assoc-in m ks (apply f (get-in m ks) args)))

(defn fnil
  "Takes a function f, and returns a function that calls f, replacing
  a nil first argument with x, optionally nil second with y, nil third with z."
  ([f x]
   (fn [a & more]
     (apply f (if (nil? a) x a) more)))
  ([f x y]
   (fn [a b & more]
     (apply f (if (nil? a) x a) (if (nil? b) y b) more)))
  ([f x y z]
   (fn [a b c & more]
     (apply f (if (nil? a) x a) (if (nil? b) y b) (if (nil? c) z c) more))))

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

;; sequence: materialise a transducer over a collection into a seq (list)
(defn sequence
  "Coerces coll to a (possibly empty) sequence, if it is not already
  one. Will not force a seq. (sequence nil) yields (), When a
  transducer is supplied, returns a lazy sequence of applications of
  the transform to the items in coll"
  ([coll] (apply list (into [] coll)))
  ([xf coll] (apply list (into [] xf coll))))

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
  ([type message data cause] {:type type :message message :data data :cause cause}))`,ir=`(ns clojure.string)

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
`,vt={"clojure.core":()=>or,"clojure.string":()=>ir};function lr(e){const t=e.filter(n=>n.kind!=="Comment");return t.length<3||t[0].kind!=="LParen"||t[1].kind!=="Symbol"||t[1].value!=="ns"||t[2].kind!=="Symbol"?null:t[2].value}function Ge(e){const t=new Map,n=e.filter(a=>a.kind!=="Comment"&&a.kind!=="Whitespace");if(n.length<3||n[0].kind!=="LParen"||n[1].kind!=="Symbol"||n[1].value!=="ns")return t;let r=3,s=1;for(;r<n.length&&s>0;){const a=n[r];if(a.kind==="LParen"){s++,r++;continue}if(a.kind==="RParen"){s--,r++;continue}if(a.kind==="LBracket"){let i=r+1,l=null;for(;i<n.length&&n[i].kind!=="RBracket";){const p=n[i];p.kind==="Symbol"&&l===null&&(l=p.value),p.kind==="Keyword"&&(p.value===":as"||p.value===":as-alias")&&(i++,i<n.length&&n[i].kind==="Symbol"&&l&&t.set(n[i].value,l)),i++}}r++}return t}function ur(e){const t=e.find(n=>j(n)&&R(n.value[0])&&n.value[0].name==="ns");return!t||!j(t)?null:t}function cr(e){const t=ur(e);if(!t)return[];const n=[];for(let r=2;r<t.value.length;r++){const s=t.value[r];j(s)&&A(s.value[0])&&s.value[0].name===":require"&&n.push(s.value.slice(1))}return n}function He(e,t,n,r){if(!F(e))throw new o("require spec must be a vector, e.g. [my.ns :as alias]",{spec:e});const s=e.value;if(s.length===0||!R(s[0]))throw new o("First element of require spec must be a namespace symbol",{spec:e});const a=s[0].name;if(s.some(f=>A(f)&&f.name===":as-alias")){let f=1;for(;f<s.length;){const d=s[f];if(!A(d))throw new o(`Expected keyword in require spec, got ${d.kind}`,{spec:e,position:f});if(d.name===":as-alias"){f++;const m=s[f];if(!m||!R(m))throw new o(":as-alias expects a symbol alias",{spec:e,position:f});t.readerAliases||(t.readerAliases=new Map),t.readerAliases.set(m.name,a),f++}else throw new o(`:as-alias specs only support :as-alias, got ${d.name}`,{spec:e})}return}let l=n.get(a);if(!l&&r&&(r(a),l=n.get(a)),!l)throw new o(`Namespace ${a} not found. Only already-loaded namespaces can be required.`,{nsName:a});let p=1;for(;p<s.length;){const f=s[p];if(!A(f))throw new o(`Expected keyword in require spec, got ${f.kind}`,{spec:e,position:p});if(f.name===":as"){p++;const d=s[p];if(!d||!R(d))throw new o(":as expects a symbol alias",{spec:e,position:p});t.aliases||(t.aliases=new Map),t.aliases.set(d.name,l),p++}else if(f.name===":refer"){p++;const d=s[p];if(!d||!F(d))throw new o(":refer expects a vector of symbols",{spec:e,position:p});for(const m of d.value){if(!R(m))throw new o(":refer vector must contain only symbols",{spec:e,sym:m});let v;try{v=qe(m.name,l)}catch{throw new o(`Symbol ${m.name} not found in namespace ${a}`,{nsName:a,symbol:m.name})}ee(m.name,v,t)}p++}else throw new o(`Unknown require option ${f.name}. Supported: :as, :refer`,{spec:e,keyword:f.name})}}function fr(e,t){const n=e.registry;let r=e.currentNs;const s=n.get("clojure.core");s.resolveNs=b=>n.get(b)??null;const a=at();function i(b){const w=vt[b];if(w)return m(w(),b),!0;if(!(t?.readFile&&t?.sourceRoots))return!1;for(const q of t.sourceRoots){const C=`${q.replace(/\/$/,"")}/${b.replace(/\./g,"/")}.clj`;try{const U=t.readFile(C);if(U)return m(U),!0}catch{continue}}return!1}function l(b){if(!n.has(b)){const w=he(s);w.namespace=b,n.set(b,w)}return n.get(b)}function p(b){l(b),r=b}function f(b){return n.get(b)??null}ee("require",c("require",(...b)=>{const w=n.get(r);for(const q of b)He(q,w,n,i);return y()}),s);function d(b,w){const q=cr(b);for(const C of q)for(const U of C)He(U,w,n,i)}function m(b,w){const q=_e(b),C=lr(q)??w??"user",U=Ge(q),N=Je(q,C,U),T=l(C);d(N,T);for(const K of N){const we=a.expandAll(K,T);a.evaluate(we,T)}}return{registry:n,get currentNs(){return r},setNs:p,getNs:f,loadFile:m,evaluate(b){try{const w=_e(b),q=f(r),C=Ge(w);q.aliases?.forEach((T,K)=>{T.namespace&&C.set(K,T.namespace)}),q.readerAliases?.forEach((T,K)=>{C.set(K,T)});const U=Je(w,r,C);d(U,q);let N=y();for(const T of U){const K=a.expandAll(T,q);N=a.evaluate(K,q)}return N}catch(w){throw w instanceof Re?new o(`Unhandled throw: ${h(w.value)}`,{thrownValue:w.value}):w instanceof fe?new o("recur called outside of loop or fn",{args:w.args}):((w instanceof o||w instanceof $)&&w.pos&&(w.message+=an(b,w.pos)),w)}},evaluateForms(b){try{const w=f(r);let q=y();for(const C of b){const U=a.expandAll(C,w);q=a.evaluate(U,w)}return q}catch(w){throw w instanceof Re?new o(`Unhandled throw: ${h(w.value)}`,{thrownValue:w.value}):w instanceof fe?new o("recur called outside of loop or fn",{args:w.args}):w}}}}function pr(e){const t=new Map,n=he();n.namespace="clojure.core",Rn(n,e?.output),t.set("clojure.core",n);const r=he(n);r.namespace="user",t.set("user",r);const s=fr({registry:t,currentNs:"user"},e),a=vt["clojure.core"];if(!a)throw new Error("Missing built-in clojure.core source in registry");s.loadFile(a(),"clojure.core");for(const i of e?.entries??[])s.loadFile(i);return s}export{o as E,Ke as a,y as b,pr as c,I as d,z as e,W as f,c as g,k as h,dr as i,E as j,B as k,h as p,_e as t};
