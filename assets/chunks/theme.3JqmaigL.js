const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/chunks/VPLocalSearchBox.9IVIEGPx.js","assets/chunks/framework.CGSRRTbQ.js","assets/chunks/editor.main.CpwxIn4y.js","assets/chunks/clojure-tokens.Co1bCbEI.js","assets/chunks/clojure.Dnu-v4kV.js","assets/chunks/find-form.BMLo6Wt5.js"])))=>i.map(i=>d[i]);
var vc=Object.defineProperty;var yc=(e,t,n)=>t in e?vc(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var Oe=(e,t,n)=>yc(e,typeof t!="symbol"?t+"":t,n);import{d as z,c as I,r as j,n as pe,o as k,a as Mt,t as fe,b as Q,w as N,T as Is,e as D,_ as Y,u as bc,i as wc,f as kc,g as Cs,h as ee,j as C,k as q,l as rn,m as Zr,p as te,q as vt,s as wr,v as yt,x as kr,y as Rs,z as xc,A as $c,F as ge,B as Ne,C as cn,D as xr,E as K,G as ca,H as mt,I as la,J as $r,K as Lt,L as Mr,M as Mc,N as ua,O as es,P as hn,Q as da,R as Sr,S as Sc,U as qc,V as ar,W as fa,X as ma,Y as Fc,Z as Ic,$ as Cc,a0 as Rc,a1 as jc,a2 as pa,a3 as Ac,a4 as _c,a5 as Pc}from"./framework.CGSRRTbQ.js";const Nc=z({__name:"VPBadge",props:{text:{},type:{default:"tip"}},setup(e){return(t,n)=>(k(),I("span",{class:pe(["VPBadge",e.type])},[j(t.$slots,"default",{},()=>[Mt(fe(e.text),1)])],2))}}),Lc={key:0,class:"VPBackdrop"},Ec=z({__name:"VPBackdrop",props:{show:{type:Boolean}},setup(e){return(t,n)=>(k(),Q(Is,{name:"fade"},{default:N(()=>[e.show?(k(),I("div",Lc)):D("",!0)]),_:1}))}}),Tc=Y(Ec,[["__scopeId","data-v-fc0a18d6"]]),ae=bc;function Vc(e,t){let n,r=!1;return()=>{n&&clearTimeout(n),r?n=setTimeout(e,t):(e(),(r=!0)&&setTimeout(()=>r=!1,t))}}function ts(e){return e.startsWith("/")?e:`/${e}`}function js(e){const{pathname:t,search:n,hash:r,protocol:s}=new URL(e,"http://a.com");if(wc(e)||e.startsWith("#")||!s.startsWith("http")||!kc(t))return e;const{site:o}=ae(),i=t.endsWith("/")||t.endsWith(".html")?e:e.replace(/(?:(^\.+)\/)?.*$/,`$1${t.replace(/(\.md)?$/,o.value.cleanUrls?"":".html")}${n}${r}`);return Cs(i)}function Kn({correspondingLink:e=!1}={}){const{site:t,localeIndex:n,page:r,theme:s,hash:o}=ae(),i=ee(()=>{var l,d;return{label:(l=t.value.locales[n.value])==null?void 0:l.label,link:((d=t.value.locales[n.value])==null?void 0:d.link)||(n.value==="root"?"/":`/${n.value}/`)}});return{localeLinks:ee(()=>Object.entries(t.value.locales).flatMap(([l,d])=>i.value.label===d.label?[]:{text:d.label,link:Oc(d.link||(l==="root"?"/":`/${l}/`),s.value.i18nRouting!==!1&&e,r.value.relativePath.slice(i.value.link.length-1),!t.value.cleanUrls)+o.value})),currentLang:i}}function Oc(e,t,n,r){return t?e.replace(/\/$/,"")+ts(n.replace(/(^|\/)index\.md$/,"$1").replace(/\.md$/,r?".html":"")):e}const Dc={class:"NotFound"},Gc={class:"code"},zc={class:"title"},Bc={class:"quote"},Hc={class:"action"},Uc=["href","aria-label"],Kc=z({__name:"NotFound",setup(e){const{theme:t}=ae(),{currentLang:n}=Kn();return(r,s)=>{var o,i,u,l,d;return k(),I("div",Dc,[C("p",Gc,fe(((o=q(t).notFound)==null?void 0:o.code)??"404"),1),C("h1",zc,fe(((i=q(t).notFound)==null?void 0:i.title)??"PAGE NOT FOUND"),1),s[0]||(s[0]=C("div",{class:"divider"},null,-1)),C("blockquote",Bc,fe(((u=q(t).notFound)==null?void 0:u.quote)??"But if you don't change your direction, and if you keep looking, you may end up where you are heading."),1),C("div",Hc,[C("a",{class:"link",href:q(Cs)(q(n).link),"aria-label":((l=q(t).notFound)==null?void 0:l.linkLabel)??"go to home"},fe(((d=q(t).notFound)==null?void 0:d.linkText)??"Take me home"),9,Uc)])])}}}),Wc=Y(Kc,[["__scopeId","data-v-ed822235"]]);function ha(e,t){if(Array.isArray(e))return ir(e);if(e==null)return[];t=ts(t);const n=Object.keys(e).sort((s,o)=>o.split("/").length-s.split("/").length).find(s=>t.startsWith(ts(s))),r=n?e[n]:[];return Array.isArray(r)?ir(r):ir(r.items,r.base)}function Jc(e){const t=[];let n=0;for(const r in e){const s=e[r];if(s.items){n=t.push(s);continue}t[n]||t.push({items:[]}),t[n].items.push(s)}return t}function Qc(e){const t=[];function n(r){for(const s of r)s.text&&s.link&&t.push({text:s.text,link:s.link,docFooterText:s.docFooterText}),s.items&&n(s.items)}return n(e),t}function ns(e,t){return Array.isArray(t)?t.some(n=>ns(e,n)):rn(e,t.link)?!0:t.items?ns(e,t.items):!1}function ir(e,t){return[...e].map(n=>{const r={...n},s=r.base||t;return s&&r.link&&(r.link=s+r.link),r.items&&(r.items=ir(r.items,s)),r})}function St(){const{frontmatter:e,page:t,theme:n}=ae(),r=Zr("(min-width: 960px)"),s=te(!1),o=ee(()=>{const y=n.value.sidebar,$=t.value.relativePath;return y?ha(y,$):[]}),i=te(o.value);vt(o,(y,$)=>{JSON.stringify(y)!==JSON.stringify($)&&(i.value=o.value)});const u=ee(()=>e.value.sidebar!==!1&&i.value.length>0&&e.value.layout!=="home"),l=ee(()=>d?e.value.aside==null?n.value.aside==="left":e.value.aside==="left":!1),d=ee(()=>e.value.layout==="home"?!1:e.value.aside!=null?!!e.value.aside:n.value.aside!==!1),m=ee(()=>u.value&&r.value),h=ee(()=>u.value?Jc(i.value):[]);function b(){s.value=!0}function M(){s.value=!1}function v(){s.value?M():b()}return{isOpen:s,sidebar:i,sidebarGroups:h,hasSidebar:u,hasAside:d,leftAside:l,isSidebarEnabled:m,open:b,close:M,toggle:v}}function Yc(e,t){let n;wr(()=>{n=e.value?document.activeElement:void 0}),yt(()=>{window.addEventListener("keyup",r)}),kr(()=>{window.removeEventListener("keyup",r)});function r(s){s.key==="Escape"&&e.value&&(t(),n==null||n.focus())}}function Xc(e){const{page:t,hash:n}=ae(),r=te(!1),s=ee(()=>e.value.collapsed!=null),o=ee(()=>!!e.value.link),i=te(!1),u=()=>{i.value=rn(t.value.relativePath,e.value.link)};vt([t,e,n],u),yt(u);const l=ee(()=>i.value?!0:e.value.items?ns(t.value.relativePath,e.value.items):!1),d=ee(()=>!!(e.value.items&&e.value.items.length));wr(()=>{r.value=!!(s.value&&e.value.collapsed)}),Rs(()=>{(i.value||l.value)&&(r.value=!1)});function m(){s.value&&(r.value=!r.value)}return{collapsed:r,collapsible:s,isLink:o,isActiveLink:i,hasActiveLink:l,hasChildren:d,toggle:m}}function Zc(){const{hasSidebar:e}=St(),t=Zr("(min-width: 960px)"),n=Zr("(min-width: 1280px)");return{isAsideEnabled:ee(()=>!n.value&&!t.value?!1:e.value?n.value:t.value)}}const el=/\b(?:VPBadge|header-anchor|footnote-ref|ignore-header)\b/,rs=[];function ga(e){return typeof e.outline=="object"&&!Array.isArray(e.outline)&&e.outline.label||e.outlineTitle||"On this page"}function As(e){const t=[...document.querySelectorAll(".VPDoc :where(h1,h2,h3,h4,h5,h6)")].filter(n=>n.id&&n.hasChildNodes()).map(n=>{const r=Number(n.tagName[1]);return{element:n,title:tl(n),link:"#"+n.id,level:r}});return nl(t,e)}function tl(e){let t="";for(const n of e.childNodes)if(n.nodeType===1){if(el.test(n.className))continue;t+=n.textContent}else n.nodeType===3&&(t+=n.textContent);return t.trim()}function nl(e,t){if(t===!1)return[];const n=(typeof t=="object"&&!Array.isArray(t)?t.level:t)||2,[r,s]=typeof n=="number"?[n,n]:n==="deep"?[2,6]:n;return ol(e,r,s)}function rl(e,t){const{isAsideEnabled:n}=Zc(),r=Vc(o,100);let s=null;yt(()=>{requestAnimationFrame(o),window.addEventListener("scroll",r)}),xc(()=>{i(location.hash)}),kr(()=>{window.removeEventListener("scroll",r)});function o(){if(!n.value)return;const u=window.scrollY,l=window.innerHeight,d=document.body.offsetHeight,m=Math.abs(u+l-d)<1,h=rs.map(({element:M,link:v})=>({link:v,top:sl(M)})).filter(({top:M})=>!Number.isNaN(M)).sort((M,v)=>M.top-v.top);if(!h.length){i(null);return}if(u<1){i(null);return}if(m){i(h[h.length-1].link);return}let b=null;for(const{link:M,top:v}of h){if(v>u+$c()+4)break;b=M}i(b)}function i(u){s&&s.classList.remove("active"),u==null?s=null:s=e.value.querySelector(`a[href="${decodeURIComponent(u)}"]`);const l=s;l?(l.classList.add("active"),t.value.style.top=l.offsetTop+39+"px",t.value.style.opacity="1"):(t.value.style.top="33px",t.value.style.opacity="0")}}function sl(e){let t=0;for(;e!==document.body;){if(e===null)return NaN;t+=e.offsetTop,e=e.offsetParent}return t}function ol(e,t,n){rs.length=0;const r=[],s=[];return e.forEach(o=>{const i={...o,children:[]};let u=s[s.length-1];for(;u&&u.level>=i.level;)s.pop(),u=s[s.length-1];if(i.element.classList.contains("ignore-header")||u&&"shouldIgnore"in u){s.push({level:i.level,shouldIgnore:!0});return}i.level>n||i.level<t||(rs.push({element:i.element,link:i.link}),u?u.children.push(i):r.push(i),s.push(i))}),r}const al=["href","title"],il=z({__name:"VPDocOutlineItem",props:{headers:{},root:{type:Boolean}},setup(e){function t({target:n}){const r=n.href.split("#")[1],s=document.getElementById(decodeURIComponent(r));s==null||s.focus({preventScroll:!0})}return(n,r)=>{const s=cn("VPDocOutlineItem",!0);return k(),I("ul",{class:pe(["VPDocOutlineItem",e.root?"root":"nested"])},[(k(!0),I(ge,null,Ne(e.headers,({children:o,link:i,title:u})=>(k(),I("li",null,[C("a",{class:"outline-link",href:i,onClick:t,title:u},fe(u),9,al),o!=null&&o.length?(k(),Q(s,{key:0,headers:o},null,8,["headers"])):D("",!0)]))),256))],2)}}}),va=Y(il,[["__scopeId","data-v-c0c3f437"]]),cl={class:"content"},ll={"aria-level":"2",class:"outline-title",id:"doc-outline-aria-label",role:"heading"},ul=z({__name:"VPDocAsideOutline",setup(e){const{frontmatter:t,theme:n}=ae(),r=ca([]);xr(()=>{r.value=As(t.value.outline??n.value.outline)});const s=te(),o=te();return rl(s,o),(i,u)=>(k(),I("nav",{"aria-labelledby":"doc-outline-aria-label",class:pe(["VPDocAsideOutline",{"has-outline":r.value.length>0}]),ref_key:"container",ref:s},[C("div",cl,[C("div",{class:"outline-marker",ref_key:"marker",ref:o},null,512),C("div",ll,fe(q(ga)(q(n))),1),K(va,{headers:r.value,root:!0},null,8,["headers"])])],2))}}),dl=Y(ul,[["__scopeId","data-v-84120bb0"]]),fl={class:"VPDocAsideCarbonAds"},ml=z({__name:"VPDocAsideCarbonAds",props:{carbonAds:{}},setup(e){const t=()=>null;return(n,r)=>(k(),I("div",fl,[K(q(t),{"carbon-ads":e.carbonAds},null,8,["carbon-ads"])]))}}),pl={class:"VPDocAside"},hl=z({__name:"VPDocAside",setup(e){const{theme:t}=ae();return(n,r)=>(k(),I("div",pl,[j(n.$slots,"aside-top",{},void 0,!0),j(n.$slots,"aside-outline-before",{},void 0,!0),K(dl),j(n.$slots,"aside-outline-after",{},void 0,!0),r[0]||(r[0]=C("div",{class:"spacer"},null,-1)),j(n.$slots,"aside-ads-before",{},void 0,!0),q(t).carbonAds?(k(),Q(ml,{key:0,"carbon-ads":q(t).carbonAds},null,8,["carbon-ads"])):D("",!0),j(n.$slots,"aside-ads-after",{},void 0,!0),j(n.$slots,"aside-bottom",{},void 0,!0)]))}}),gl=Y(hl,[["__scopeId","data-v-1a9fdb38"]]);function vl(){const{theme:e,page:t}=ae();return ee(()=>{const{text:n="Edit this page",pattern:r=""}=e.value.editLink||{};let s;return typeof r=="function"?s=r(t.value):s=r.replace(/:path/g,t.value.filePath),{url:s,text:n}})}function yl(){const{page:e,theme:t,frontmatter:n}=ae();return ee(()=>{var d,m,h,b,M,v,y,$;const r=ha(t.value.sidebar,e.value.relativePath),s=Qc(r),o=bl(s,R=>R.link.replace(/[?#].*$/,"")),i=o.findIndex(R=>rn(e.value.relativePath,R.link)),u=((d=t.value.docFooter)==null?void 0:d.prev)===!1&&!n.value.prev||n.value.prev===!1,l=((m=t.value.docFooter)==null?void 0:m.next)===!1&&!n.value.next||n.value.next===!1;return{prev:u?void 0:{text:(typeof n.value.prev=="string"?n.value.prev:typeof n.value.prev=="object"?n.value.prev.text:void 0)??((h=o[i-1])==null?void 0:h.docFooterText)??((b=o[i-1])==null?void 0:b.text),link:(typeof n.value.prev=="object"?n.value.prev.link:void 0)??((M=o[i-1])==null?void 0:M.link)},next:l?void 0:{text:(typeof n.value.next=="string"?n.value.next:typeof n.value.next=="object"?n.value.next.text:void 0)??((v=o[i+1])==null?void 0:v.docFooterText)??((y=o[i+1])==null?void 0:y.text),link:(typeof n.value.next=="object"?n.value.next.link:void 0)??(($=o[i+1])==null?void 0:$.link)}}})}function bl(e,t){const n=new Set;return e.filter(r=>{const s=t(r);return n.has(s)?!1:n.add(s)})}const pt=z({__name:"VPLink",props:{tag:{},href:{},noIcon:{type:Boolean},target:{},rel:{}},setup(e){const t=e,n=ee(()=>t.tag??(t.href?"a":"span")),r=ee(()=>t.href&&la.test(t.href)||t.target==="_blank");return(s,o)=>(k(),Q(mt(n.value),{class:pe(["VPLink",{link:e.href,"vp-external-link-icon":r.value,"no-icon":e.noIcon}]),href:e.href?q(js)(e.href):void 0,target:e.target??(r.value?"_blank":void 0),rel:e.rel??(r.value?"noreferrer":void 0)},{default:N(()=>[j(s.$slots,"default")]),_:3},8,["class","href","target","rel"]))}}),wl={class:"VPLastUpdated"},kl=["datetime"],xl=z({__name:"VPDocFooterLastUpdated",setup(e){const{theme:t,page:n,lang:r}=ae(),s=ee(()=>new Date(n.value.lastUpdated)),o=ee(()=>s.value.toISOString()),i=te("");return yt(()=>{wr(()=>{var u,l,d;i.value=new Intl.DateTimeFormat((l=(u=t.value.lastUpdated)==null?void 0:u.formatOptions)!=null&&l.forceLocale?r.value:void 0,((d=t.value.lastUpdated)==null?void 0:d.formatOptions)??{dateStyle:"short",timeStyle:"short"}).format(s.value)})}),(u,l)=>{var d;return k(),I("p",wl,[Mt(fe(((d=q(t).lastUpdated)==null?void 0:d.text)||q(t).lastUpdatedText||"Last updated")+": ",1),C("time",{datetime:o.value},fe(i.value),9,kl)])}}}),$l=Y(xl,[["__scopeId","data-v-4bb7494d"]]),Ml={key:0,class:"VPDocFooter"},Sl={key:0,class:"edit-info"},ql={key:0,class:"edit-link"},Fl={key:1,class:"last-updated"},Il={key:1,class:"prev-next","aria-labelledby":"doc-footer-aria-label"},Cl={class:"pager"},Rl=["innerHTML"],jl=["innerHTML"],Al={class:"pager"},_l=["innerHTML"],Pl=["innerHTML"],Nl=z({__name:"VPDocFooter",setup(e){const{theme:t,page:n,frontmatter:r}=ae(),s=vl(),o=yl(),i=ee(()=>t.value.editLink&&r.value.editLink!==!1),u=ee(()=>n.value.lastUpdated),l=ee(()=>i.value||u.value||o.value.prev||o.value.next);return(d,m)=>{var h,b,M,v;return l.value?(k(),I("footer",Ml,[j(d.$slots,"doc-footer-before",{},void 0,!0),i.value||u.value?(k(),I("div",Sl,[i.value?(k(),I("div",ql,[K(pt,{class:"edit-link-button",href:q(s).url,"no-icon":!0},{default:N(()=>[m[0]||(m[0]=C("span",{class:"vpi-square-pen edit-link-icon"},null,-1)),Mt(" "+fe(q(s).text),1)]),_:1},8,["href"])])):D("",!0),u.value?(k(),I("div",Fl,[K($l)])):D("",!0)])):D("",!0),(h=q(o).prev)!=null&&h.link||(b=q(o).next)!=null&&b.link?(k(),I("nav",Il,[m[1]||(m[1]=C("span",{class:"visually-hidden",id:"doc-footer-aria-label"},"Pager",-1)),C("div",Cl,[(M=q(o).prev)!=null&&M.link?(k(),Q(pt,{key:0,class:"pager-link prev",href:q(o).prev.link},{default:N(()=>{var y;return[C("span",{class:"desc",innerHTML:((y=q(t).docFooter)==null?void 0:y.prev)||"Previous page"},null,8,Rl),C("span",{class:"title",innerHTML:q(o).prev.text},null,8,jl)]}),_:1},8,["href"])):D("",!0)]),C("div",Al,[(v=q(o).next)!=null&&v.link?(k(),Q(pt,{key:0,class:"pager-link next",href:q(o).next.link},{default:N(()=>{var y;return[C("span",{class:"desc",innerHTML:((y=q(t).docFooter)==null?void 0:y.next)||"Next page"},null,8,_l),C("span",{class:"title",innerHTML:q(o).next.text},null,8,Pl)]}),_:1},8,["href"])):D("",!0)])])):D("",!0)])):D("",!0)}}}),Ll=Y(Nl,[["__scopeId","data-v-6db15822"]]),El={class:"container"},Tl={class:"aside-container"},Vl={class:"aside-content"},Ol={class:"content"},Dl={class:"content-container"},Gl={class:"main"},zl=z({__name:"VPDoc",setup(e){const{theme:t}=ae(),n=$r(),{hasSidebar:r,hasAside:s,leftAside:o}=St(),i=ee(()=>n.path.replace(/[./]+/g,"_").replace(/_html$/,""));return(u,l)=>{const d=cn("Content");return k(),I("div",{class:pe(["VPDoc",{"has-sidebar":q(r),"has-aside":q(s)}])},[j(u.$slots,"doc-top",{},void 0,!0),C("div",El,[q(s)?(k(),I("div",{key:0,class:pe(["aside",{"left-aside":q(o)}])},[l[0]||(l[0]=C("div",{class:"aside-curtain"},null,-1)),C("div",Tl,[C("div",Vl,[K(gl,null,{"aside-top":N(()=>[j(u.$slots,"aside-top",{},void 0,!0)]),"aside-bottom":N(()=>[j(u.$slots,"aside-bottom",{},void 0,!0)]),"aside-outline-before":N(()=>[j(u.$slots,"aside-outline-before",{},void 0,!0)]),"aside-outline-after":N(()=>[j(u.$slots,"aside-outline-after",{},void 0,!0)]),"aside-ads-before":N(()=>[j(u.$slots,"aside-ads-before",{},void 0,!0)]),"aside-ads-after":N(()=>[j(u.$slots,"aside-ads-after",{},void 0,!0)]),_:3})])])],2)):D("",!0),C("div",Ol,[C("div",Dl,[j(u.$slots,"doc-before",{},void 0,!0),C("main",Gl,[K(d,{class:pe(["vp-doc",[i.value,q(t).externalLinkIcon&&"external-link-icon-enabled"]])},null,8,["class"])]),K(Ll,null,{"doc-footer-before":N(()=>[j(u.$slots,"doc-footer-before",{},void 0,!0)]),_:3}),j(u.$slots,"doc-after",{},void 0,!0)])])]),j(u.$slots,"doc-bottom",{},void 0,!0)],2)}}}),Bl=Y(zl,[["__scopeId","data-v-93379269"]]),Hl=z({__name:"VPButton",props:{tag:{},size:{default:"medium"},theme:{default:"brand"},text:{},href:{},target:{},rel:{}},setup(e){const t=e,n=ee(()=>t.href&&la.test(t.href)),r=ee(()=>t.tag||(t.href?"a":"button"));return(s,o)=>(k(),Q(mt(r.value),{class:pe(["VPButton",[e.size,e.theme]]),href:e.href?q(js)(e.href):void 0,target:t.target??(n.value?"_blank":void 0),rel:t.rel??(n.value?"noreferrer":void 0)},{default:N(()=>[Mt(fe(e.text),1)]),_:1},8,["class","href","target","rel"]))}}),Ul=Y(Hl,[["__scopeId","data-v-39bf7037"]]),Kl=["src","alt"],Wl=z({inheritAttrs:!1,__name:"VPImage",props:{image:{},alt:{}},setup(e){return(t,n)=>{const r=cn("VPImage",!0);return e.image?(k(),I(ge,{key:0},[typeof e.image=="string"||"src"in e.image?(k(),I("img",Lt({key:0,class:"VPImage"},typeof e.image=="string"?t.$attrs:{...e.image,...t.$attrs},{src:q(Cs)(typeof e.image=="string"?e.image:e.image.src),alt:e.alt??(typeof e.image=="string"?"":e.image.alt||"")}),null,16,Kl)):(k(),I(ge,{key:1},[K(r,Lt({class:"dark",image:e.image.dark,alt:e.image.alt},t.$attrs),null,16,["image","alt"]),K(r,Lt({class:"light",image:e.image.light,alt:e.image.alt},t.$attrs),null,16,["image","alt"])],64))],64)):D("",!0)}}}),mr=Y(Wl,[["__scopeId","data-v-43ef5b53"]]),Jl={class:"container"},Ql={class:"main"},Yl={class:"heading"},Xl=["innerHTML"],Zl=["innerHTML"],eu=["innerHTML"],tu={key:0,class:"actions"},nu={key:0,class:"image"},ru={class:"image-container"},su=z({__name:"VPHero",props:{name:{},text:{},tagline:{},image:{},actions:{}},setup(e){const t=Mr("hero-image-slot-exists");return(n,r)=>(k(),I("div",{class:pe(["VPHero",{"has-image":e.image||q(t)}])},[C("div",Jl,[C("div",Ql,[j(n.$slots,"home-hero-info-before",{},void 0,!0),j(n.$slots,"home-hero-info",{},()=>[C("h1",Yl,[e.name?(k(),I("span",{key:0,innerHTML:e.name,class:"name clip"},null,8,Xl)):D("",!0),e.text?(k(),I("span",{key:1,innerHTML:e.text,class:"text"},null,8,Zl)):D("",!0)]),e.tagline?(k(),I("p",{key:0,innerHTML:e.tagline,class:"tagline"},null,8,eu)):D("",!0)],!0),j(n.$slots,"home-hero-info-after",{},void 0,!0),e.actions?(k(),I("div",tu,[(k(!0),I(ge,null,Ne(e.actions,s=>(k(),I("div",{key:s.link,class:"action"},[K(Ul,{tag:"a",size:"medium",theme:s.theme,text:s.text,href:s.link,target:s.target,rel:s.rel},null,8,["theme","text","href","target","rel"])]))),128))])):D("",!0),j(n.$slots,"home-hero-actions-after",{},void 0,!0)]),e.image||q(t)?(k(),I("div",nu,[C("div",ru,[r[0]||(r[0]=C("div",{class:"image-bg"},null,-1)),j(n.$slots,"home-hero-image",{},()=>[e.image?(k(),Q(mr,{key:0,class:"image-src",image:e.image},null,8,["image"])):D("",!0)],!0)])])):D("",!0)])],2))}}),ou=Y(su,[["__scopeId","data-v-dfd664d4"]]),au=z({__name:"VPHomeHero",setup(e){const{frontmatter:t}=ae();return(n,r)=>q(t).hero?(k(),Q(ou,{key:0,class:"VPHomeHero",name:q(t).hero.name,text:q(t).hero.text,tagline:q(t).hero.tagline,image:q(t).hero.image,actions:q(t).hero.actions},{"home-hero-info-before":N(()=>[j(n.$slots,"home-hero-info-before")]),"home-hero-info":N(()=>[j(n.$slots,"home-hero-info")]),"home-hero-info-after":N(()=>[j(n.$slots,"home-hero-info-after")]),"home-hero-actions-after":N(()=>[j(n.$slots,"home-hero-actions-after")]),"home-hero-image":N(()=>[j(n.$slots,"home-hero-image")]),_:3},8,["name","text","tagline","image","actions"])):D("",!0)}}),iu={class:"box"},cu={key:0,class:"icon"},lu=["innerHTML"],uu=["innerHTML"],du=["innerHTML"],fu={key:4,class:"link-text"},mu={class:"link-text-value"},pu=z({__name:"VPFeature",props:{icon:{},title:{},details:{},link:{},linkText:{},rel:{},target:{}},setup(e){return(t,n)=>(k(),Q(pt,{class:"VPFeature",href:e.link,rel:e.rel,target:e.target,"no-icon":!0,tag:e.link?"a":"div"},{default:N(()=>[C("article",iu,[typeof e.icon=="object"&&e.icon.wrap?(k(),I("div",cu,[K(mr,{image:e.icon,alt:e.icon.alt,height:e.icon.height||48,width:e.icon.width||48},null,8,["image","alt","height","width"])])):typeof e.icon=="object"?(k(),Q(mr,{key:1,image:e.icon,alt:e.icon.alt,height:e.icon.height||48,width:e.icon.width||48},null,8,["image","alt","height","width"])):e.icon?(k(),I("div",{key:2,class:"icon",innerHTML:e.icon},null,8,lu)):D("",!0),C("h2",{class:"title",innerHTML:e.title},null,8,uu),e.details?(k(),I("p",{key:3,class:"details",innerHTML:e.details},null,8,du)):D("",!0),e.linkText?(k(),I("div",fu,[C("p",mu,[Mt(fe(e.linkText)+" ",1),n[0]||(n[0]=C("span",{class:"vpi-arrow-right link-text-icon"},null,-1))])])):D("",!0)])]),_:1},8,["href","rel","target","tag"]))}}),hu=Y(pu,[["__scopeId","data-v-5ebdd286"]]),gu={key:0,class:"VPFeatures"},vu={class:"container"},yu={class:"items"},bu=z({__name:"VPFeatures",props:{features:{}},setup(e){const t=e,n=ee(()=>{const r=t.features.length;if(r){if(r===2)return"grid-2";if(r===3)return"grid-3";if(r%3===0)return"grid-6";if(r>3)return"grid-4"}else return});return(r,s)=>e.features?(k(),I("div",gu,[C("div",vu,[C("div",yu,[(k(!0),I(ge,null,Ne(e.features,o=>(k(),I("div",{key:o.title,class:pe(["item",[n.value]])},[K(hu,{icon:o.icon,title:o.title,details:o.details,link:o.link,"link-text":o.linkText,rel:o.rel,target:o.target},null,8,["icon","title","details","link","link-text","rel","target"])],2))),128))])])])):D("",!0)}}),wu=Y(bu,[["__scopeId","data-v-10da97be"]]),ku=z({__name:"VPHomeFeatures",setup(e){const{frontmatter:t}=ae();return(n,r)=>q(t).features?(k(),Q(wu,{key:0,class:"VPHomeFeatures",features:q(t).features},null,8,["features"])):D("",!0)}}),xu=z({__name:"VPHomeContent",setup(e){const{width:t}=Mc({initialWidth:0,includeScrollbar:!1});return(n,r)=>(k(),I("div",{class:"vp-doc container",style:ua(q(t)?{"--vp-offset":`calc(50% - ${q(t)/2}px)`}:{})},[j(n.$slots,"default",{},void 0,!0)],4))}}),$u=Y(xu,[["__scopeId","data-v-a2ea7f0f"]]),Mu=z({__name:"VPHome",setup(e){const{frontmatter:t,theme:n}=ae();return(r,s)=>{const o=cn("Content");return k(),I("div",{class:pe(["VPHome",{"external-link-icon-enabled":q(n).externalLinkIcon}])},[j(r.$slots,"home-hero-before",{},void 0,!0),K(au,null,{"home-hero-info-before":N(()=>[j(r.$slots,"home-hero-info-before",{},void 0,!0)]),"home-hero-info":N(()=>[j(r.$slots,"home-hero-info",{},void 0,!0)]),"home-hero-info-after":N(()=>[j(r.$slots,"home-hero-info-after",{},void 0,!0)]),"home-hero-actions-after":N(()=>[j(r.$slots,"home-hero-actions-after",{},void 0,!0)]),"home-hero-image":N(()=>[j(r.$slots,"home-hero-image",{},void 0,!0)]),_:3}),j(r.$slots,"home-hero-after",{},void 0,!0),j(r.$slots,"home-features-before",{},void 0,!0),K(ku),j(r.$slots,"home-features-after",{},void 0,!0),q(t).markdownStyles!==!1?(k(),Q($u,{key:0},{default:N(()=>[K(o)]),_:1})):(k(),Q(o,{key:1}))],2)}}}),Su=Y(Mu,[["__scopeId","data-v-290658a7"]]),qu={},Fu={class:"VPPage"};function Iu(e,t){const n=cn("Content");return k(),I("div",Fu,[j(e.$slots,"page-top"),K(n),j(e.$slots,"page-bottom")])}const Cu=Y(qu,[["render",Iu]]),Ru=z({__name:"VPContent",setup(e){const{page:t,frontmatter:n}=ae(),{hasSidebar:r}=St();return(s,o)=>(k(),I("div",{class:pe(["VPContent",{"has-sidebar":q(r),"is-home":q(n).layout==="home"}]),id:"VPContent"},[q(t).isNotFound?j(s.$slots,"not-found",{key:0},()=>[K(Wc)],!0):q(n).layout==="page"?(k(),Q(Cu,{key:1},{"page-top":N(()=>[j(s.$slots,"page-top",{},void 0,!0)]),"page-bottom":N(()=>[j(s.$slots,"page-bottom",{},void 0,!0)]),_:3})):q(n).layout==="home"?(k(),Q(Su,{key:2},{"home-hero-before":N(()=>[j(s.$slots,"home-hero-before",{},void 0,!0)]),"home-hero-info-before":N(()=>[j(s.$slots,"home-hero-info-before",{},void 0,!0)]),"home-hero-info":N(()=>[j(s.$slots,"home-hero-info",{},void 0,!0)]),"home-hero-info-after":N(()=>[j(s.$slots,"home-hero-info-after",{},void 0,!0)]),"home-hero-actions-after":N(()=>[j(s.$slots,"home-hero-actions-after",{},void 0,!0)]),"home-hero-image":N(()=>[j(s.$slots,"home-hero-image",{},void 0,!0)]),"home-hero-after":N(()=>[j(s.$slots,"home-hero-after",{},void 0,!0)]),"home-features-before":N(()=>[j(s.$slots,"home-features-before",{},void 0,!0)]),"home-features-after":N(()=>[j(s.$slots,"home-features-after",{},void 0,!0)]),_:3})):q(n).layout&&q(n).layout!=="doc"?(k(),Q(mt(q(n).layout),{key:3})):(k(),Q(Bl,{key:4},{"doc-top":N(()=>[j(s.$slots,"doc-top",{},void 0,!0)]),"doc-bottom":N(()=>[j(s.$slots,"doc-bottom",{},void 0,!0)]),"doc-footer-before":N(()=>[j(s.$slots,"doc-footer-before",{},void 0,!0)]),"doc-before":N(()=>[j(s.$slots,"doc-before",{},void 0,!0)]),"doc-after":N(()=>[j(s.$slots,"doc-after",{},void 0,!0)]),"aside-top":N(()=>[j(s.$slots,"aside-top",{},void 0,!0)]),"aside-outline-before":N(()=>[j(s.$slots,"aside-outline-before",{},void 0,!0)]),"aside-outline-after":N(()=>[j(s.$slots,"aside-outline-after",{},void 0,!0)]),"aside-ads-before":N(()=>[j(s.$slots,"aside-ads-before",{},void 0,!0)]),"aside-ads-after":N(()=>[j(s.$slots,"aside-ads-after",{},void 0,!0)]),"aside-bottom":N(()=>[j(s.$slots,"aside-bottom",{},void 0,!0)]),_:3}))],2))}}),ju=Y(Ru,[["__scopeId","data-v-bfddb552"]]),Au={class:"container"},_u=["innerHTML"],Pu=["innerHTML"],Nu=z({__name:"VPFooter",setup(e){const{theme:t,frontmatter:n}=ae(),{hasSidebar:r}=St();return(s,o)=>q(t).footer&&q(n).footer!==!1?(k(),I("footer",{key:0,class:pe(["VPFooter",{"has-sidebar":q(r)}])},[C("div",Au,[q(t).footer.message?(k(),I("p",{key:0,class:"message",innerHTML:q(t).footer.message},null,8,_u)):D("",!0),q(t).footer.copyright?(k(),I("p",{key:1,class:"copyright",innerHTML:q(t).footer.copyright},null,8,Pu)):D("",!0)])],2)):D("",!0)}}),Lu=Y(Nu,[["__scopeId","data-v-d59a17c9"]]);function Eu(){const{theme:e,frontmatter:t}=ae(),n=ca([]),r=ee(()=>n.value.length>0);return xr(()=>{n.value=As(t.value.outline??e.value.outline)}),{headers:n,hasLocalNav:r}}const Tu={class:"menu-text"},Vu={class:"header"},Ou={class:"outline"},Du=z({__name:"VPLocalNavOutlineDropdown",props:{headers:{},navHeight:{}},setup(e){const t=e,{theme:n}=ae(),r=te(!1),s=te(0),o=te(),i=te();function u(h){var b;(b=o.value)!=null&&b.contains(h.target)||(r.value=!1)}vt(r,h=>{if(h){document.addEventListener("click",u);return}document.removeEventListener("click",u)}),es("Escape",()=>{r.value=!1}),xr(()=>{r.value=!1});function l(){r.value=!r.value,s.value=window.innerHeight+Math.min(window.scrollY-t.navHeight,0)}function d(h){h.target.classList.contains("outline-link")&&(i.value&&(i.value.style.transition="none"),hn(()=>{r.value=!1}))}function m(){r.value=!1,window.scrollTo({top:0,left:0,behavior:"smooth"})}return(h,b)=>(k(),I("div",{class:"VPLocalNavOutlineDropdown",style:ua({"--vp-vh":s.value+"px"}),ref_key:"main",ref:o},[e.headers.length>0?(k(),I("button",{key:0,onClick:l,class:pe({open:r.value})},[C("span",Tu,fe(q(ga)(q(n))),1),b[0]||(b[0]=C("span",{class:"vpi-chevron-right icon"},null,-1))],2)):(k(),I("button",{key:1,onClick:m},fe(q(n).returnToTopLabel||"Return to top"),1)),K(Is,{name:"flyout"},{default:N(()=>[r.value?(k(),I("div",{key:0,ref_key:"items",ref:i,class:"items",onClick:d},[C("div",Vu,[C("a",{class:"top-link",href:"#",onClick:m},fe(q(n).returnToTopLabel||"Return to top"),1)]),C("div",Ou,[K(va,{headers:e.headers},null,8,["headers"])])],512)):D("",!0)]),_:1})],4))}}),Gu=Y(Du,[["__scopeId","data-v-c94ad9b1"]]),zu={class:"container"},Bu=["aria-expanded"],Hu={class:"menu-text"},Uu=z({__name:"VPLocalNav",props:{open:{type:Boolean}},emits:["open-menu"],setup(e){const{theme:t,frontmatter:n}=ae(),{hasSidebar:r}=St(),{headers:s}=Eu(),{y:o}=da(),i=te(0);yt(()=>{i.value=parseInt(getComputedStyle(document.documentElement).getPropertyValue("--vp-nav-height"))}),xr(()=>{s.value=As(n.value.outline??t.value.outline)});const u=ee(()=>s.value.length===0),l=ee(()=>u.value&&!r.value),d=ee(()=>({VPLocalNav:!0,"has-sidebar":r.value,empty:u.value,fixed:l.value}));return(m,h)=>q(n).layout!=="home"&&(!l.value||q(o)>=i.value)?(k(),I("div",{key:0,class:pe(d.value)},[C("div",zu,[q(r)?(k(),I("button",{key:0,class:"menu","aria-expanded":e.open,"aria-controls":"VPSidebarNav",onClick:h[0]||(h[0]=b=>m.$emit("open-menu"))},[h[1]||(h[1]=C("span",{class:"vpi-align-left menu-icon"},null,-1)),C("span",Hu,fe(q(t).sidebarMenuLabel||"Menu"),1)],8,Bu)):D("",!0),K(Gu,{headers:q(s),navHeight:i.value},null,8,["headers","navHeight"])])],2)):D("",!0)}}),Ku=Y(Uu,[["__scopeId","data-v-90a15421"]]);function Wu(){const e=te(!1);function t(){e.value=!0,window.addEventListener("resize",s)}function n(){e.value=!1,window.removeEventListener("resize",s)}function r(){e.value?n():t()}function s(){window.outerWidth>=768&&n()}const o=$r();return vt(()=>o.path,n),{isScreenOpen:e,openScreen:t,closeScreen:n,toggleScreen:r}}const Ju={},Qu={class:"VPSwitch",type:"button",role:"switch"},Yu={class:"check"},Xu={key:0,class:"icon"};function Zu(e,t){return k(),I("button",Qu,[C("span",Yu,[e.$slots.default?(k(),I("span",Xu,[j(e.$slots,"default",{},void 0,!0)])):D("",!0)])])}const ed=Y(Ju,[["render",Zu],["__scopeId","data-v-2bcb9b0f"]]),td=z({__name:"VPSwitchAppearance",setup(e){const{isDark:t,theme:n}=ae(),r=Mr("toggle-appearance",()=>{t.value=!t.value}),s=te("");return Rs(()=>{s.value=t.value?n.value.lightModeSwitchTitle||"Switch to light theme":n.value.darkModeSwitchTitle||"Switch to dark theme"}),(o,i)=>(k(),Q(ed,{title:s.value,class:"VPSwitchAppearance","aria-checked":q(t),onClick:q(r)},{default:N(()=>[...i[0]||(i[0]=[C("span",{class:"vpi-sun sun"},null,-1),C("span",{class:"vpi-moon moon"},null,-1)])]),_:1},8,["title","aria-checked","onClick"]))}}),_s=Y(td,[["__scopeId","data-v-93c6ed3a"]]),nd={key:0,class:"VPNavBarAppearance"},rd=z({__name:"VPNavBarAppearance",setup(e){const{site:t}=ae();return(n,r)=>q(t).appearance&&q(t).appearance!=="force-dark"&&q(t).appearance!=="force-auto"?(k(),I("div",nd,[K(_s)])):D("",!0)}}),sd=Y(rd,[["__scopeId","data-v-157d017f"]]),Ps=te();let ya=!1,Dr=0;function od(e){const t=te(!1);if(Sr){!ya&&ad(),Dr++;const n=vt(Ps,r=>{var s,o,i;r===e.el.value||(s=e.el.value)!=null&&s.contains(r)?(t.value=!0,(o=e.onFocus)==null||o.call(e)):(t.value=!1,(i=e.onBlur)==null||i.call(e))});kr(()=>{n(),Dr--,Dr||id()})}return Sc(t)}function ad(){document.addEventListener("focusin",ba),ya=!0,Ps.value=document.activeElement}function id(){document.removeEventListener("focusin",ba)}function ba(){Ps.value=document.activeElement}const cd={class:"VPMenuLink"},ld=["innerHTML"],ud=z({__name:"VPMenuLink",props:{item:{}},setup(e){const{page:t}=ae();return(n,r)=>(k(),I("div",cd,[K(pt,{class:pe({active:q(rn)(q(t).relativePath,e.item.activeMatch||e.item.link,!!e.item.activeMatch)}),href:e.item.link,target:e.item.target,rel:e.item.rel,"no-icon":e.item.noIcon},{default:N(()=>[C("span",{innerHTML:e.item.text},null,8,ld)]),_:1},8,["class","href","target","rel","no-icon"])]))}}),qr=Y(ud,[["__scopeId","data-v-7368d406"]]),dd={class:"VPMenuGroup"},fd={key:0,class:"title"},md=z({__name:"VPMenuGroup",props:{text:{},items:{}},setup(e){return(t,n)=>(k(),I("div",dd,[e.text?(k(),I("p",fd,fe(e.text),1)):D("",!0),(k(!0),I(ge,null,Ne(e.items,r=>(k(),I(ge,null,["link"in r?(k(),Q(qr,{key:0,item:r},null,8,["item"])):D("",!0)],64))),256))]))}}),pd=Y(md,[["__scopeId","data-v-601ffdd4"]]),hd={class:"VPMenu"},gd={key:0,class:"items"},vd=z({__name:"VPMenu",props:{items:{}},setup(e){return(t,n)=>(k(),I("div",hd,[e.items?(k(),I("div",gd,[(k(!0),I(ge,null,Ne(e.items,r=>(k(),I(ge,{key:JSON.stringify(r)},["link"in r?(k(),Q(qr,{key:0,item:r},null,8,["item"])):"component"in r?(k(),Q(mt(r.component),Lt({key:1,ref_for:!0},r.props),null,16)):(k(),Q(pd,{key:2,text:r.text,items:r.items},null,8,["text","items"]))],64))),128))])):D("",!0),j(t.$slots,"default",{},void 0,!0)]))}}),yd=Y(vd,[["__scopeId","data-v-07c4f27f"]]),bd=["aria-expanded","aria-label"],wd={key:0,class:"text"},kd=["innerHTML"],xd={key:1,class:"vpi-more-horizontal icon"},$d={class:"menu"},Md=z({__name:"VPFlyout",props:{icon:{},button:{},label:{},items:{}},setup(e){const t=te(!1),n=te();od({el:n,onBlur:r});function r(){t.value=!1}return(s,o)=>(k(),I("div",{class:"VPFlyout",ref_key:"el",ref:n,onMouseenter:o[1]||(o[1]=i=>t.value=!0),onMouseleave:o[2]||(o[2]=i=>t.value=!1)},[C("button",{type:"button",class:"button","aria-haspopup":"true","aria-expanded":t.value,"aria-label":e.label,onClick:o[0]||(o[0]=i=>t.value=!t.value)},[e.button||e.icon?(k(),I("span",wd,[e.icon?(k(),I("span",{key:0,class:pe([e.icon,"option-icon"])},null,2)):D("",!0),e.button?(k(),I("span",{key:1,innerHTML:e.button},null,8,kd)):D("",!0),o[3]||(o[3]=C("span",{class:"vpi-chevron-down text-icon"},null,-1))])):(k(),I("span",xd))],8,bd),C("div",$d,[K(yd,{items:e.items},{default:N(()=>[j(s.$slots,"default",{},void 0,!0)]),_:3},8,["items"])])],544))}}),Ns=Y(Md,[["__scopeId","data-v-b0a8f767"]]),Sd=["href","aria-label","innerHTML"],qd=z({__name:"VPSocialLink",props:{icon:{},link:{},ariaLabel:{}},setup(e){const t=e,n=te();yt(async()=>{var o;await hn();const s=(o=n.value)==null?void 0:o.children[0];s instanceof HTMLElement&&s.className.startsWith("vpi-social-")&&(getComputedStyle(s).maskImage||getComputedStyle(s).webkitMaskImage)==="none"&&s.style.setProperty("--icon",`url('https://api.iconify.design/simple-icons/${t.icon}.svg')`)});const r=ee(()=>typeof t.icon=="object"?t.icon.svg:`<span class="vpi-social-${t.icon}"></span>`);return(s,o)=>(k(),I("a",{ref_key:"el",ref:n,class:"VPSocialLink no-icon",href:e.link,"aria-label":e.ariaLabel??(typeof e.icon=="string"?e.icon:""),target:"_blank",rel:"noopener",innerHTML:r.value},null,8,Sd))}}),Fd=Y(qd,[["__scopeId","data-v-345450f8"]]),Id={class:"VPSocialLinks"},Cd=z({__name:"VPSocialLinks",props:{links:{}},setup(e){return(t,n)=>(k(),I("div",Id,[(k(!0),I(ge,null,Ne(e.links,({link:r,icon:s,ariaLabel:o})=>(k(),Q(Fd,{key:r,icon:s,link:r,ariaLabel:o},null,8,["icon","link","ariaLabel"]))),128))]))}}),Ls=Y(Cd,[["__scopeId","data-v-0f37f347"]]),Rd={key:0,class:"group translations"},jd={class:"trans-title"},Ad={key:1,class:"group"},_d={class:"item appearance"},Pd={class:"label"},Nd={class:"appearance-action"},Ld={key:2,class:"group"},Ed={class:"item social-links"},Td=z({__name:"VPNavBarExtra",setup(e){const{site:t,theme:n}=ae(),{localeLinks:r,currentLang:s}=Kn({correspondingLink:!0}),o=ee(()=>r.value.length&&s.value.label||t.value.appearance||n.value.socialLinks);return(i,u)=>o.value?(k(),Q(Ns,{key:0,class:"VPNavBarExtra",label:"extra navigation"},{default:N(()=>[q(r).length&&q(s).label?(k(),I("div",Rd,[C("p",jd,fe(q(s).label),1),(k(!0),I(ge,null,Ne(q(r),l=>(k(),Q(qr,{key:l.link,item:l},null,8,["item"]))),128))])):D("",!0),q(t).appearance&&q(t).appearance!=="force-dark"&&q(t).appearance!=="force-auto"?(k(),I("div",Ad,[C("div",_d,[C("p",Pd,fe(q(n).darkModeSwitchLabel||"Appearance"),1),C("div",Nd,[K(_s)])])])):D("",!0),q(n).socialLinks?(k(),I("div",Ld,[C("div",Ed,[K(Ls,{class:"social-links-list",links:q(n).socialLinks},null,8,["links"])])])):D("",!0)]),_:1})):D("",!0)}}),Vd=Y(Td,[["__scopeId","data-v-d5e0aa94"]]),Od=["aria-expanded"],Dd=z({__name:"VPNavBarHamburger",props:{active:{type:Boolean}},emits:["click"],setup(e){return(t,n)=>(k(),I("button",{type:"button",class:pe(["VPNavBarHamburger",{active:e.active}]),"aria-label":"mobile navigation","aria-expanded":e.active,"aria-controls":"VPNavScreen",onClick:n[0]||(n[0]=r=>t.$emit("click"))},[...n[1]||(n[1]=[C("span",{class:"container"},[C("span",{class:"top"}),C("span",{class:"middle"}),C("span",{class:"bottom"})],-1)])],10,Od))}}),Gd=Y(Dd,[["__scopeId","data-v-fbcb2ae9"]]),zd=["innerHTML"],Bd=z({__name:"VPNavBarMenuLink",props:{item:{}},setup(e){const{page:t}=ae();return(n,r)=>(k(),Q(pt,{class:pe({VPNavBarMenuLink:!0,active:q(rn)(q(t).relativePath,e.item.activeMatch||e.item.link,!!e.item.activeMatch)}),href:e.item.link,target:e.item.target,rel:e.item.rel,"no-icon":e.item.noIcon,tabindex:"0"},{default:N(()=>[C("span",{innerHTML:e.item.text},null,8,zd)]),_:1},8,["class","href","target","rel","no-icon"]))}}),Hd=Y(Bd,[["__scopeId","data-v-1773fc94"]]),Ud=z({__name:"VPNavBarMenuGroup",props:{item:{}},setup(e){const t=e,{page:n}=ae(),r=o=>"component"in o?!1:"link"in o?rn(n.value.relativePath,o.link,!!t.item.activeMatch):o.items.some(r),s=ee(()=>r(t.item));return(o,i)=>(k(),Q(Ns,{class:pe({VPNavBarMenuGroup:!0,active:q(rn)(q(n).relativePath,e.item.activeMatch,!!e.item.activeMatch)||s.value}),button:e.item.text,items:e.item.items},null,8,["class","button","items"]))}}),Kd={key:0,"aria-labelledby":"main-nav-aria-label",class:"VPNavBarMenu"},Wd=z({__name:"VPNavBarMenu",setup(e){const{theme:t}=ae();return(n,r)=>q(t).nav?(k(),I("nav",Kd,[r[0]||(r[0]=C("span",{id:"main-nav-aria-label",class:"visually-hidden"}," Main Navigation ",-1)),(k(!0),I(ge,null,Ne(q(t).nav,s=>(k(),I(ge,{key:JSON.stringify(s)},["link"in s?(k(),Q(Hd,{key:0,item:s},null,8,["item"])):"component"in s?(k(),Q(mt(s.component),Lt({key:1,ref_for:!0},s.props),null,16)):(k(),Q(Ud,{key:2,item:s},null,8,["item"]))],64))),128))])):D("",!0)}}),Jd=Y(Wd,[["__scopeId","data-v-9e20df12"]]);function Qd(e){const{localeIndex:t,theme:n}=ae();function r(s){var v,y,$;const o=s.split("."),i=(v=n.value.search)==null?void 0:v.options,u=i&&typeof i=="object",l=u&&(($=(y=i.locales)==null?void 0:y[t.value])==null?void 0:$.translations)||null,d=u&&i.translations||null;let m=l,h=d,b=e;const M=o.pop();for(const R of o){let E=null;const U=b==null?void 0:b[R];U&&(E=b=U);const le=h==null?void 0:h[R];le&&(E=h=le);const P=m==null?void 0:m[R];P&&(E=m=P),U||(b=E),le||(h=E),P||(m=E)}return(m==null?void 0:m[M])??(h==null?void 0:h[M])??(b==null?void 0:b[M])??""}return r}const Yd=["aria-label"],Xd={class:"DocSearch-Button-Container"},Zd={class:"DocSearch-Button-Placeholder"},Mo=z({__name:"VPNavBarSearchButton",setup(e){const n=Qd({button:{buttonText:"Search",buttonAriaLabel:"Search"}});return(r,s)=>(k(),I("button",{type:"button",class:"DocSearch DocSearch-Button","aria-label":q(n)("button.buttonAriaLabel")},[C("span",Xd,[s[0]||(s[0]=C("span",{class:"vp-icon DocSearch-Search-Icon"},null,-1)),C("span",Zd,fe(q(n)("button.buttonText")),1)]),s[1]||(s[1]=C("span",{class:"DocSearch-Button-Keys"},[C("kbd",{class:"DocSearch-Button-Key"}),C("kbd",{class:"DocSearch-Button-Key"},"K")],-1))],8,Yd))}}),ef={class:"VPNavBarSearch"},tf={id:"local-search"},nf={key:1,id:"docsearch"},rf=z({__name:"VPNavBarSearch",setup(e){const t=qc(()=>ar(()=>import("./VPLocalSearchBox.9IVIEGPx.js"),__vite__mapDeps([0,1]))),n=()=>null,{theme:r}=ae(),s=te(!1),o=te(!1);yt(()=>{});function i(){s.value||(s.value=!0,setTimeout(u,16))}function u(){const h=new Event("keydown");h.key="k",h.metaKey=!0,window.dispatchEvent(h),setTimeout(()=>{document.querySelector(".DocSearch-Modal")||u()},16)}function l(h){const b=h.target,M=b.tagName;return b.isContentEditable||M==="INPUT"||M==="SELECT"||M==="TEXTAREA"}const d=te(!1);es("k",h=>{(h.ctrlKey||h.metaKey)&&(h.preventDefault(),d.value=!0)}),es("/",h=>{l(h)||(h.preventDefault(),d.value=!0)});const m="local";return(h,b)=>{var M;return k(),I("div",ef,[q(m)==="local"?(k(),I(ge,{key:0},[d.value?(k(),Q(q(t),{key:0,onClose:b[0]||(b[0]=v=>d.value=!1)})):D("",!0),C("div",tf,[K(Mo,{onClick:b[1]||(b[1]=v=>d.value=!0)})])],64)):q(m)==="algolia"?(k(),I(ge,{key:1},[s.value?(k(),Q(q(n),{key:0,algolia:((M=q(r).search)==null?void 0:M.options)??q(r).algolia,onVnodeBeforeMount:b[2]||(b[2]=v=>o.value=!0)},null,8,["algolia"])):D("",!0),o.value?D("",!0):(k(),I("div",nf,[K(Mo,{onClick:i})]))],64)):D("",!0)])}}}),sf=z({__name:"VPNavBarSocialLinks",setup(e){const{theme:t}=ae();return(n,r)=>q(t).socialLinks?(k(),Q(Ls,{key:0,class:"VPNavBarSocialLinks",links:q(t).socialLinks},null,8,["links"])):D("",!0)}}),of=Y(sf,[["__scopeId","data-v-69fa8c55"]]),af=["href","rel","target"],cf=["innerHTML"],lf={key:2},uf=z({__name:"VPNavBarTitle",setup(e){const{site:t,theme:n}=ae(),{hasSidebar:r}=St(),{currentLang:s}=Kn(),o=ee(()=>{var l;return typeof n.value.logoLink=="string"?n.value.logoLink:(l=n.value.logoLink)==null?void 0:l.link}),i=ee(()=>{var l;return typeof n.value.logoLink=="string"||(l=n.value.logoLink)==null?void 0:l.rel}),u=ee(()=>{var l;return typeof n.value.logoLink=="string"||(l=n.value.logoLink)==null?void 0:l.target});return(l,d)=>(k(),I("div",{class:pe(["VPNavBarTitle",{"has-sidebar":q(r)}])},[C("a",{class:"title",href:o.value??q(js)(q(s).link),rel:i.value,target:u.value},[j(l.$slots,"nav-bar-title-before",{},void 0,!0),q(n).logo?(k(),Q(mr,{key:0,class:"logo",image:q(n).logo},null,8,["image"])):D("",!0),q(n).siteTitle?(k(),I("span",{key:1,innerHTML:q(n).siteTitle},null,8,cf)):q(n).siteTitle===void 0?(k(),I("span",lf,fe(q(t).title),1)):D("",!0),j(l.$slots,"nav-bar-title-after",{},void 0,!0)],8,af)],2))}}),df=Y(uf,[["__scopeId","data-v-a629d822"]]),ff={class:"items"},mf={class:"title"},pf=z({__name:"VPNavBarTranslations",setup(e){const{theme:t}=ae(),{localeLinks:n,currentLang:r}=Kn({correspondingLink:!0});return(s,o)=>q(n).length&&q(r).label?(k(),Q(Ns,{key:0,class:"VPNavBarTranslations",icon:"vpi-languages",label:q(t).langMenuLabel||"Change language"},{default:N(()=>[C("div",ff,[C("p",mf,fe(q(r).label),1),(k(!0),I(ge,null,Ne(q(n),i=>(k(),Q(qr,{key:i.link,item:i},null,8,["item"]))),128))])]),_:1},8,["label"])):D("",!0)}}),hf=Y(pf,[["__scopeId","data-v-35c3d22b"]]),gf={class:"wrapper"},vf={class:"container"},yf={class:"title"},bf={class:"content"},wf={class:"content-body"},kf=z({__name:"VPNavBar",props:{isScreenOpen:{type:Boolean}},emits:["toggle-screen"],setup(e){const t=e,{y:n}=da(),{hasSidebar:r}=St(),{frontmatter:s}=ae(),o=te({});return Rs(()=>{o.value={"has-sidebar":r.value,home:s.value.layout==="home",top:n.value===0,"screen-open":t.isScreenOpen}}),(i,u)=>(k(),I("div",{class:pe(["VPNavBar",o.value])},[C("div",gf,[C("div",vf,[C("div",yf,[K(df,null,{"nav-bar-title-before":N(()=>[j(i.$slots,"nav-bar-title-before",{},void 0,!0)]),"nav-bar-title-after":N(()=>[j(i.$slots,"nav-bar-title-after",{},void 0,!0)]),_:3})]),C("div",bf,[C("div",wf,[j(i.$slots,"nav-bar-content-before",{},void 0,!0),K(rf,{class:"search"}),K(Jd,{class:"menu"}),K(hf,{class:"translations"}),K(sd,{class:"appearance"}),K(of,{class:"social-links"}),K(Vd,{class:"extra"}),j(i.$slots,"nav-bar-content-after",{},void 0,!0),K(Gd,{class:"hamburger",active:e.isScreenOpen,onClick:u[0]||(u[0]=l=>i.$emit("toggle-screen"))},null,8,["active"])])])])]),u[1]||(u[1]=C("div",{class:"divider"},[C("div",{class:"divider-line"})],-1))],2))}}),xf=Y(kf,[["__scopeId","data-v-e36a249e"]]),$f={key:0,class:"VPNavScreenAppearance"},Mf={class:"text"},Sf=z({__name:"VPNavScreenAppearance",setup(e){const{site:t,theme:n}=ae();return(r,s)=>q(t).appearance&&q(t).appearance!=="force-dark"&&q(t).appearance!=="force-auto"?(k(),I("div",$f,[C("p",Mf,fe(q(n).darkModeSwitchLabel||"Appearance"),1),K(_s)])):D("",!0)}}),qf=Y(Sf,[["__scopeId","data-v-4ec6e970"]]),Ff=["innerHTML"],If=z({__name:"VPNavScreenMenuLink",props:{item:{}},setup(e){const t=Mr("close-screen");return(n,r)=>(k(),Q(pt,{class:"VPNavScreenMenuLink",href:e.item.link,target:e.item.target,rel:e.item.rel,"no-icon":e.item.noIcon,onClick:q(t)},{default:N(()=>[C("span",{innerHTML:e.item.text},null,8,Ff)]),_:1},8,["href","target","rel","no-icon","onClick"]))}}),Cf=Y(If,[["__scopeId","data-v-36991e72"]]),Rf=["innerHTML"],jf=z({__name:"VPNavScreenMenuGroupLink",props:{item:{}},setup(e){const t=Mr("close-screen");return(n,r)=>(k(),Q(pt,{class:"VPNavScreenMenuGroupLink",href:e.item.link,target:e.item.target,rel:e.item.rel,"no-icon":e.item.noIcon,onClick:q(t)},{default:N(()=>[C("span",{innerHTML:e.item.text},null,8,Rf)]),_:1},8,["href","target","rel","no-icon","onClick"]))}}),wa=Y(jf,[["__scopeId","data-v-4388d42b"]]),Af={class:"VPNavScreenMenuGroupSection"},_f={key:0,class:"title"},Pf=z({__name:"VPNavScreenMenuGroupSection",props:{text:{},items:{}},setup(e){return(t,n)=>(k(),I("div",Af,[e.text?(k(),I("p",_f,fe(e.text),1)):D("",!0),(k(!0),I(ge,null,Ne(e.items,r=>(k(),Q(wa,{key:r.text,item:r},null,8,["item"]))),128))]))}}),Nf=Y(Pf,[["__scopeId","data-v-8292e6a2"]]),Lf=["aria-controls","aria-expanded"],Ef=["innerHTML"],Tf=["id"],Vf={key:0,class:"item"},Of={key:1,class:"item"},Df={key:2,class:"group"},Gf=z({__name:"VPNavScreenMenuGroup",props:{text:{},items:{}},setup(e){const t=e,n=te(!1),r=ee(()=>`NavScreenGroup-${t.text.replace(" ","-").toLowerCase()}`);function s(){n.value=!n.value}return(o,i)=>(k(),I("div",{class:pe(["VPNavScreenMenuGroup",{open:n.value}])},[C("button",{class:"button","aria-controls":r.value,"aria-expanded":n.value,onClick:s},[C("span",{class:"button-text",innerHTML:e.text},null,8,Ef),i[0]||(i[0]=C("span",{class:"vpi-plus button-icon"},null,-1))],8,Lf),C("div",{id:r.value,class:"items"},[(k(!0),I(ge,null,Ne(e.items,u=>(k(),I(ge,{key:JSON.stringify(u)},["link"in u?(k(),I("div",Vf,[K(wa,{item:u},null,8,["item"])])):"component"in u?(k(),I("div",Of,[(k(),Q(mt(u.component),Lt({ref_for:!0},u.props,{"screen-menu":""}),null,16))])):(k(),I("div",Df,[K(Nf,{text:u.text,items:u.items},null,8,["text","items"])]))],64))),128))],8,Tf)],2))}}),zf=Y(Gf,[["__scopeId","data-v-0eac47a7"]]),Bf={key:0,class:"VPNavScreenMenu"},Hf=z({__name:"VPNavScreenMenu",setup(e){const{theme:t}=ae();return(n,r)=>q(t).nav?(k(),I("nav",Bf,[(k(!0),I(ge,null,Ne(q(t).nav,s=>(k(),I(ge,{key:JSON.stringify(s)},["link"in s?(k(),Q(Cf,{key:0,item:s},null,8,["item"])):"component"in s?(k(),Q(mt(s.component),Lt({key:1,ref_for:!0},s.props,{"screen-menu":""}),null,16)):(k(),Q(zf,{key:2,text:s.text||"",items:s.items},null,8,["text","items"]))],64))),128))])):D("",!0)}}),Uf=z({__name:"VPNavScreenSocialLinks",setup(e){const{theme:t}=ae();return(n,r)=>q(t).socialLinks?(k(),Q(Ls,{key:0,class:"VPNavScreenSocialLinks",links:q(t).socialLinks},null,8,["links"])):D("",!0)}}),Kf={class:"list"},Wf=z({__name:"VPNavScreenTranslations",setup(e){const{localeLinks:t,currentLang:n}=Kn({correspondingLink:!0}),r=te(!1);function s(){r.value=!r.value}return(o,i)=>q(t).length&&q(n).label?(k(),I("div",{key:0,class:pe(["VPNavScreenTranslations",{open:r.value}])},[C("button",{class:"title",onClick:s},[i[0]||(i[0]=C("span",{class:"vpi-languages icon lang"},null,-1)),Mt(" "+fe(q(n).label)+" ",1),i[1]||(i[1]=C("span",{class:"vpi-chevron-down icon chevron"},null,-1))]),C("ul",Kf,[(k(!0),I(ge,null,Ne(q(t),u=>(k(),I("li",{key:u.link,class:"item"},[K(pt,{class:"link",href:u.link},{default:N(()=>[Mt(fe(u.text),1)]),_:2},1032,["href"])]))),128))])],2)):D("",!0)}}),Jf=Y(Wf,[["__scopeId","data-v-053b4abb"]]),Qf={class:"container"},Yf=z({__name:"VPNavScreen",props:{open:{type:Boolean}},setup(e){const t=te(null),n=fa(Sr?document.body:null);return(r,s)=>(k(),Q(Is,{name:"fade",onEnter:s[0]||(s[0]=o=>n.value=!0),onAfterLeave:s[1]||(s[1]=o=>n.value=!1)},{default:N(()=>[e.open?(k(),I("div",{key:0,class:"VPNavScreen",ref_key:"screen",ref:t,id:"VPNavScreen"},[C("div",Qf,[j(r.$slots,"nav-screen-content-before",{},void 0,!0),K(Hf,{class:"menu"}),K(Jf,{class:"translations"}),K(qf,{class:"appearance"}),K(Uf,{class:"social-links"}),j(r.$slots,"nav-screen-content-after",{},void 0,!0)])],512)):D("",!0)]),_:3}))}}),Xf=Y(Yf,[["__scopeId","data-v-457e1fb7"]]),Zf={key:0,class:"VPNav"},em=z({__name:"VPNav",setup(e){const{isScreenOpen:t,closeScreen:n,toggleScreen:r}=Wu(),{frontmatter:s}=ae(),o=ee(()=>s.value.navbar!==!1);return ma("close-screen",n),wr(()=>{Sr&&document.documentElement.classList.toggle("hide-nav",!o.value)}),(i,u)=>o.value?(k(),I("header",Zf,[K(xf,{"is-screen-open":q(t),onToggleScreen:q(r)},{"nav-bar-title-before":N(()=>[j(i.$slots,"nav-bar-title-before",{},void 0,!0)]),"nav-bar-title-after":N(()=>[j(i.$slots,"nav-bar-title-after",{},void 0,!0)]),"nav-bar-content-before":N(()=>[j(i.$slots,"nav-bar-content-before",{},void 0,!0)]),"nav-bar-content-after":N(()=>[j(i.$slots,"nav-bar-content-after",{},void 0,!0)]),_:3},8,["is-screen-open","onToggleScreen"]),K(Xf,{open:q(t)},{"nav-screen-content-before":N(()=>[j(i.$slots,"nav-screen-content-before",{},void 0,!0)]),"nav-screen-content-after":N(()=>[j(i.$slots,"nav-screen-content-after",{},void 0,!0)]),_:3},8,["open"])])):D("",!0)}}),tm=Y(em,[["__scopeId","data-v-26811152"]]),nm=["role","tabindex"],rm={key:1,class:"items"},sm=z({__name:"VPSidebarItem",props:{item:{},depth:{}},setup(e){const t=e,{collapsed:n,collapsible:r,isLink:s,isActiveLink:o,hasActiveLink:i,hasChildren:u,toggle:l}=Xc(ee(()=>t.item)),d=ee(()=>u.value?"section":"div"),m=ee(()=>s.value?"a":"div"),h=ee(()=>u.value?t.depth+2===7?"p":`h${t.depth+2}`:"p"),b=ee(()=>s.value?void 0:"button"),M=ee(()=>[[`level-${t.depth}`],{collapsible:r.value},{collapsed:n.value},{"is-link":s.value},{"is-active":o.value},{"has-active":i.value}]);function v($){"key"in $&&$.key!=="Enter"||!t.item.link&&l()}function y(){t.item.link&&l()}return($,R)=>{const E=cn("VPSidebarItem",!0);return k(),Q(mt(d.value),{class:pe(["VPSidebarItem",M.value])},{default:N(()=>[e.item.text?(k(),I("div",Lt({key:0,class:"item",role:b.value},Fc(e.item.items?{click:v,keydown:v}:{},!0),{tabindex:e.item.items&&0}),[R[1]||(R[1]=C("div",{class:"indicator"},null,-1)),e.item.link?(k(),Q(pt,{key:0,tag:m.value,class:"link",href:e.item.link,rel:e.item.rel,target:e.item.target},{default:N(()=>[(k(),Q(mt(h.value),{class:"text",innerHTML:e.item.text},null,8,["innerHTML"]))]),_:1},8,["tag","href","rel","target"])):(k(),Q(mt(h.value),{key:1,class:"text",innerHTML:e.item.text},null,8,["innerHTML"])),e.item.collapsed!=null&&e.item.items&&e.item.items.length?(k(),I("div",{key:2,class:"caret",role:"button","aria-label":"toggle section",onClick:y,onKeydown:Ic(y,["enter"]),tabindex:"0"},[...R[0]||(R[0]=[C("span",{class:"vpi-chevron-right caret-icon"},null,-1)])],32)):D("",!0)],16,nm)):D("",!0),e.item.items&&e.item.items.length?(k(),I("div",rm,[e.depth<5?(k(!0),I(ge,{key:0},Ne(e.item.items,U=>(k(),Q(E,{key:U.text,item:U,depth:e.depth+1},null,8,["item","depth"]))),128)):D("",!0)])):D("",!0)]),_:1},8,["class"])}}}),om=Y(sm,[["__scopeId","data-v-2e44fd86"]]),am=z({__name:"VPSidebarGroup",props:{items:{}},setup(e){const t=te(!0);let n=null;return yt(()=>{n=setTimeout(()=>{n=null,t.value=!1},300)}),Cc(()=>{n!=null&&(clearTimeout(n),n=null)}),(r,s)=>(k(!0),I(ge,null,Ne(e.items,o=>(k(),I("div",{key:o.text,class:pe(["group",{"no-transition":t.value}])},[K(om,{item:o,depth:0},null,8,["item"])],2))),128))}}),im=Y(am,[["__scopeId","data-v-8334613f"]]),cm={class:"nav",id:"VPSidebarNav","aria-labelledby":"sidebar-aria-label",tabindex:"-1"},lm=z({__name:"VPSidebar",props:{open:{type:Boolean}},setup(e){const{sidebarGroups:t,hasSidebar:n}=St(),r=e,s=te(null),o=fa(Sr?document.body:null);vt([r,s],()=>{var u;r.open?(o.value=!0,(u=s.value)==null||u.focus()):o.value=!1},{immediate:!0,flush:"post"});const i=te(0);return vt(t,()=>{i.value+=1},{deep:!0}),(u,l)=>q(n)?(k(),I("aside",{key:0,class:pe(["VPSidebar",{open:e.open}]),ref_key:"navEl",ref:s,onClick:l[0]||(l[0]=Rc(()=>{},["stop"]))},[l[2]||(l[2]=C("div",{class:"curtain"},null,-1)),C("nav",cm,[l[1]||(l[1]=C("span",{class:"visually-hidden",id:"sidebar-aria-label"}," Sidebar Navigation ",-1)),j(u.$slots,"sidebar-nav-before",{},void 0,!0),(k(),Q(im,{items:q(t),key:i.value},null,8,["items"])),j(u.$slots,"sidebar-nav-after",{},void 0,!0)])],2)):D("",!0)}}),um=Y(lm,[["__scopeId","data-v-ef718f6c"]]),dm=z({__name:"VPSkipLink",setup(e){const{theme:t}=ae(),n=$r(),r=te();vt(()=>n.path,()=>r.value.focus());function s({target:o}){const i=document.getElementById(decodeURIComponent(o.hash).slice(1));if(i){const u=()=>{i.removeAttribute("tabindex"),i.removeEventListener("blur",u)};i.setAttribute("tabindex","-1"),i.addEventListener("blur",u),i.focus(),window.scrollTo(0,0)}}return(o,i)=>(k(),I(ge,null,[C("span",{ref_key:"backToTop",ref:r,tabindex:"-1"},null,512),C("a",{href:"#VPContent",class:"VPSkipLink visually-hidden",onClick:s},fe(q(t).skipToContentLabel||"Skip to content"),1)],64))}}),fm=Y(dm,[["__scopeId","data-v-784f2ba1"]]),mm=z({__name:"Layout",setup(e){const{isOpen:t,open:n,close:r}=St(),s=$r();vt(()=>s.path,r),Yc(t,r);const{frontmatter:o}=ae(),i=jc(),u=ee(()=>!!i["home-hero-image"]);return ma("hero-image-slot-exists",u),(l,d)=>{const m=cn("Content");return q(o).layout!==!1?(k(),I("div",{key:0,class:pe(["Layout",q(o).pageClass])},[j(l.$slots,"layout-top",{},void 0,!0),K(fm),K(Tc,{class:"backdrop",show:q(t),onClick:q(r)},null,8,["show","onClick"]),K(tm,null,{"nav-bar-title-before":N(()=>[j(l.$slots,"nav-bar-title-before",{},void 0,!0)]),"nav-bar-title-after":N(()=>[j(l.$slots,"nav-bar-title-after",{},void 0,!0)]),"nav-bar-content-before":N(()=>[j(l.$slots,"nav-bar-content-before",{},void 0,!0)]),"nav-bar-content-after":N(()=>[j(l.$slots,"nav-bar-content-after",{},void 0,!0)]),"nav-screen-content-before":N(()=>[j(l.$slots,"nav-screen-content-before",{},void 0,!0)]),"nav-screen-content-after":N(()=>[j(l.$slots,"nav-screen-content-after",{},void 0,!0)]),_:3}),K(Ku,{open:q(t),onOpenMenu:q(n)},null,8,["open","onOpenMenu"]),K(um,{open:q(t)},{"sidebar-nav-before":N(()=>[j(l.$slots,"sidebar-nav-before",{},void 0,!0)]),"sidebar-nav-after":N(()=>[j(l.$slots,"sidebar-nav-after",{},void 0,!0)]),_:3},8,["open"]),K(ju,null,{"page-top":N(()=>[j(l.$slots,"page-top",{},void 0,!0)]),"page-bottom":N(()=>[j(l.$slots,"page-bottom",{},void 0,!0)]),"not-found":N(()=>[j(l.$slots,"not-found",{},void 0,!0)]),"home-hero-before":N(()=>[j(l.$slots,"home-hero-before",{},void 0,!0)]),"home-hero-info-before":N(()=>[j(l.$slots,"home-hero-info-before",{},void 0,!0)]),"home-hero-info":N(()=>[j(l.$slots,"home-hero-info",{},void 0,!0)]),"home-hero-info-after":N(()=>[j(l.$slots,"home-hero-info-after",{},void 0,!0)]),"home-hero-actions-after":N(()=>[j(l.$slots,"home-hero-actions-after",{},void 0,!0)]),"home-hero-image":N(()=>[j(l.$slots,"home-hero-image",{},void 0,!0)]),"home-hero-after":N(()=>[j(l.$slots,"home-hero-after",{},void 0,!0)]),"home-features-before":N(()=>[j(l.$slots,"home-features-before",{},void 0,!0)]),"home-features-after":N(()=>[j(l.$slots,"home-features-after",{},void 0,!0)]),"doc-footer-before":N(()=>[j(l.$slots,"doc-footer-before",{},void 0,!0)]),"doc-before":N(()=>[j(l.$slots,"doc-before",{},void 0,!0)]),"doc-after":N(()=>[j(l.$slots,"doc-after",{},void 0,!0)]),"doc-top":N(()=>[j(l.$slots,"doc-top",{},void 0,!0)]),"doc-bottom":N(()=>[j(l.$slots,"doc-bottom",{},void 0,!0)]),"aside-top":N(()=>[j(l.$slots,"aside-top",{},void 0,!0)]),"aside-bottom":N(()=>[j(l.$slots,"aside-bottom",{},void 0,!0)]),"aside-outline-before":N(()=>[j(l.$slots,"aside-outline-before",{},void 0,!0)]),"aside-outline-after":N(()=>[j(l.$slots,"aside-outline-after",{},void 0,!0)]),"aside-ads-before":N(()=>[j(l.$slots,"aside-ads-before",{},void 0,!0)]),"aside-ads-after":N(()=>[j(l.$slots,"aside-ads-after",{},void 0,!0)]),_:3}),K(Lu),j(l.$slots,"layout-bottom",{},void 0,!0)],2)):(k(),Q(m,{key:1}))}}}),pm=Y(mm,[["__scopeId","data-v-ebe20898"]]),hm={Layout:pm,enhanceApp:({app:e})=>{e.component("Badge",Nc)}},gm=`(ns cljam.handbook
  "Machine-readable quick-reference for the cljam runtime.
   Intended for LLM agents — dense, example-heavy, no prose.
   Humans: use describe, the REPL, or official docs instead.

   Usage:
     (require '[cljam.handbook :as h])
     (h/topics)            ;; list all topic keys
     (h/lookup :sort)      ;; get a specific entry
     (h/register! :my-tip \\"...\\")  ;; add/update a topic (session-local)")

;; ── Registry ──────────────────────────────────────────────────────────────

(def ^:dynamic *topics*
  (atom {

   :sort
   "Default comparator is \`compare\`, NOT \`<\`.
    \`<\` is numbers-only — breaks on strings, keywords, chars.
    (sort [\\"b\\" \\"a\\"])           ;; ok — compare is default
    (sort [\\\\c \\\\a \\\\b])          ;; ok — chars comparable via compare
    (sort [:b :a :c])          ;; ok
    (sort-by :score > records) ;; explicit comparator always works"

   :char-literals
   "Char literals: \\\\a \\\\b ... \\\\z \\\\A ... \\\\Z \\\\0 ... \\\\9
    Named: \\\\space \\\\newline \\\\tab \\\\return \\\\backspace \\\\formfeed
    Unicode: \\\\uXXXX (4 hex digits)
    Type: char? returns true. Distinct from strings.
    (char 65)   ;; => \\\\A   (codepoint → char)
    (int \\\\A)    ;; => 65   (char → codepoint)
    (str \\\\h \\\\i) ;; => \\"hi\\" (chars join to string)"

   :dynamic-vars
   "^:dynamic vars + binding = thread-local scope.
    Atoms = shared mutable state (swap!/reset! mutate in place).
    ;; Dynamic var — binding temporarily shadows the var
    (def ^:dynamic *level* :info)
    (binding [*level* :debug]   ;; lexical shadow — only visible inside this block
      *level*)                  ;; => :debug
    *level*                     ;; => :info (restored after binding exits)
    ;; Atom — mutation persists globally
    (def counter (atom 0))
    (swap! counter inc)         ;; => 1
    @counter                    ;; => 1 (visible everywhere)
    Difference: swap!/reset! on atoms mutates shared state; binding only affects
    the current dynamic scope and restores the original value on exit."

   :require
   "(require '[clojure.string :as str])
    (require '[cljam.schema.core :as s])
    (require '[clojure.test :refer [deftest is run-tests]])
    Works for: built-in clojure.* namespaces, cljam.* built-ins, library namespaces
    registered via CljamLibrary.sources.
    :refer [specific-names] works — :refer :all does NOT (error).
    :use is not available — use :require with :as or :refer instead.
    Lazy: namespace source is loaded on first require, cached after."

   :jvm-gaps
   "Not in cljam (no JVM):
    - No agents (send, send-off, await)
    - No refs / dosync / STM
    - No Java interop (.method obj, (new ClassName))
    - No gen-class / proxy / reify (use defrecord + defprotocol)
    - No classpath / pom.xml
    - No futures from clojure.core (use JS Promise via async)
    - transients: not implemented
    - clojure.java.* namespaces: not available"

   :types
   "CljValue kinds — what (type x) returns:
    :nil :boolean :number :string :keyword :symbol :char
    :list :vector :map :set
    :function          ;; NOT :fn — (type (fn [x] x)) => :function
    :protocol          ;; (type IFoo) => :protocol
    :ns/RecordName     ;; records return :ns/RecordName, e.g. :user/Point
    :atom :var :namespace :lazy-seq :cons
    Note: (type multimethod) throws — use (instance? ...) checks instead.
    (type x) returns the kind keyword.
    (char? x) (string? x) (map? x) etc. — standard predicates all work."

   :records
   "(defrecord Point [x y])
    (->Point 1 2)          ;; positional constructor
    (map->Point {:x 1 :y 2}) ;; map constructor
    (:x p)                 ;; field access
    (record? p)            ;; => true
    (type p)               ;; => :user/Point (or :ns/Point)
    Records implement map semantics: get, keys work.
    CAVEAT: (assoc record :field val) returns a plain map, NOT a record.
    Use map->RecordName to reconstruct a record after modifying fields.
    Use with defprotocol + extend-protocol for polymorphic dispatch."

   :protocols
   "(defprotocol IShape
      (area [this])
      (perimeter [this]))
    (extend-protocol IShape
      :user/Circle
        (area [c] (* clojure.math/PI (:r c) (:r c)))
        (perimeter [c] (* 2 clojure.math/PI (:r c))))
    (satisfies? IShape my-circle)  ;; => true
    (protocols my-circle)          ;; list all protocols it satisfies
    Dispatch key = (type value) = :ns/RecordName for records, :string/:number/... for primitives.
    Note: Math/PI is JVM Java interop — does NOT work in cljam.
    Use clojure.math/PI or js/Math.PI instead."

   :schema-primitives
   "Primitive schemas: :string :int :number :boolean :keyword :symbol :nil :any :uuid :char
    (s/validate :string \\"hi\\")   ;; {:ok true :value \\"hi\\"}
    (s/validate :int 3.5)       ;; {:ok false :issues [{:error-code :int/wrong-type ...}]}
    :int requires integer (no decimal). :number accepts any number.
    :any always passes. :nil only accepts nil."

   :schema-compound
   "Compound schemas:
    [:map [:k schema] [:k {:optional true} schema] ...]
    [:map-of key-schema val-schema]
    [:vector item-schema]
    [:tuple s1 s2 s3]           ;; fixed-length, positional
    [:maybe schema]             ;; nil or schema
    [:or s1 s2 ...]             ;; first match wins
    [:and s1 s2 ...]            ;; all must pass (short-circuits at first failure)
    [:enum v1 v2 ...]           ;; value must be one of these
    [:fn pred]                  ;; arbitrary predicate fn
    Constraints map (second el): {:min n :max n :pattern \\"regex\\"}"

   :schema-api
   "(require '[cljam.schema.core :as s])
    (s/validate schema value)        ;; {:ok bool :value v} or {:ok false :issues [...]}
    (s/valid? schema value)          ;; boolean shorthand
    (s/explain schema value)         ;; issues include :message (uses default-messages)
    (s/explain schema value {:messages {:kw \\"override\\" :kw2 (fn [iss] ...)}})
    (s/json-schema schema)           ;; compile to JSON Schema map (draft 2020-12)
    Issues shape: {:error-code :kw :path [...] :schema schema}
    Error codes: :string/wrong-type :int/too-small :map/missing-key :tuple/wrong-length etc."

   :describe
   "(describe value)            ;; returns a plain map describing any cljam value
    (describe (find-ns 'my.ns)) ;; {:kind :namespace :var-count N :vars {...}}
    (describe my-fn)            ;; {:kind :fn :arglists [...] :doc \\"...\\"}
    (describe #'my-fn)          ;; var-level, includes :doc from var meta
    (ns-map (find-ns 'my.ns))   ;; map of sym → var for full namespace inspection
    Key insight: describe + ns-map let you discover the live runtime without reading source."

   :sessions
   "Sessions are isolated runtimes — defn in session A is invisible in session B.
    To share a definition across sessions: eval the same code into each session explicitly.
    Atoms defined in session A ARE shared if session B holds a reference to the same atom.
    nREPL: multiple Calva sessions + cljam-mcp can all share one nREPL server.
    connect_nrepl { port } → returns other_sessions (find Calva session by namespace).
    nrepl_eval { session_id, code } → eval into any session by ID."

   :pair-programming
   "Start nREPL server: cljam nrepl-server --port 7888 --root-dir /path/to/project
    Calva connects normally. cljam-mcp calls connect_nrepl { port: 7888 }.
    connect_nrepl response includes other_sessions — identify Calva's session by :ns.
    Both sides eval into the same session_id → truly shared state.
    Atoms, defs, registered multimethods — all visible to both parties instantly.
    Workflow: human defines fns, AI calls them (or vice versa)."

   :and-short-circuit
   "[:and s1 s2 ...] short-circuits at the first failing branch.
    If s1 is a type schema (:int) and s2 is [:fn pred], and the value fails :int,
    the [:fn] branch is never evaluated — only :int/wrong-type is reported.
    This means [:and :int [:fn pos?]] is safe: the predicate never runs on a non-int.
    Contrast with old behavior (pre-fix): both :int/wrong-type AND :fn/predicate-threw."

   :async
   "cljam async: (async ...) returns a CljPending immediately — NOT the evaluated value.
    @ (deref) inside an async block awaits a CljPending. @ outside async THROWS.
    (async 42)                 ;; → CljPending (type :pending), not 42
    (pending? (async 42))      ;; → true
    (async @(promise-of 10))   ;; → CljPending that resolves to 10
    (promise-of v)             ;; wrap any value in a CljPending
    (then p f)                 ;; chain: apply f to resolved value, returns new CljPending
    (catch* p f)               ;; error handling: f called with thrown value if p rejects
    (all [p1 p2 p3])           ;; fan-out: resolves when all resolve → vector of results
    ;; WRONG: @(promise-of 42) at top level → throws 'requires an (async ...) context'
    ;; RIGHT: (async @(promise-of 42))  — deref inside async block
    evaluateAsync              ;; embedding API: auto-unwraps CljPending, surfaces errors
    JS Promises auto-become CljPending at every interop boundary — no wrapping needed:
      (js/fetch url)                      ;; → CljPending, NOT a js-value
      (then (js/fetch url) #((. % json))) ;; chains naturally
      (async (let [r @(js/fetch url)] r)) ;; @ works inside async
    Deref with timeout (JVM-style): (deref p ms) — defaults to 30 000ms.
      (async (deref slow-pending 5000))   ;; throws after 5s if not resolved
      (async (try (deref p 1000) (catch :default e :timed-out)))
    Catching rejections: use (catch :default e body) — NOT (catch Exception e body).
      (catch* p #(println \\"rejected:\\" %))  ;; monad style
      (async (try @p (catch :default e e))) ;; async/try style"

   :js-interop
   "cljam JS interop — NOT ClojureScript. Different dot syntax.
    Property access:  (. obj field)            ;; e.g. (. \\"hello\\" length) → 5
    Method with args: (. obj method arg...)    ;; e.g. (. \\"hello\\" indexOf \\"l\\") → 2
    Zero-arg method:  ((. obj method))         ;; e.g. ((. \\"hello\\" toUpperCase)) → \\"HELLO\\"
    !! GOTCHA: (. res json) returns the bound function — does NOT call it.
               ((. res json)) with double parens CALLS the method. Silent wrong-result otherwise.
    Dot-chain symbol: js/Math.floor, js/Math.PI  ;; walk property chain from hostBinding
    Dot-chain call:   (js/Math.floor 3.7) → 3    ;; call result of dot-chain walk
    Dynamic access:   (js/get obj \\"key\\") or (js/get obj :key)
    Dynamic set:      (js/set! obj \\"key\\" value)
    Construct:        (js/new Constructor args...)  ;; Constructor must be a js-value
                      If Constructor returns a Promise, js/new returns CljPending automatically.
    JS objects ≠ Clojure maps: use js/get, js/keys, js/merge — NOT get/select-keys/assoc.
    Inject globals:   createSession({ hostBindings: { Math, console, fetch } })
    String requires:  (ns my.ns (:require [\\"react\\" :as React])) — needs importModule option
    Sandbox preset has Math pre-injected as js/Math.
    Caveat: JS globals are NOT available by default — inject via hostBindings explicitly."

   :node-io
   "Node.js IO functions — available in clojure.core when running in CLI, nREPL, or cljam-mcp.
    (slurp path)               ;; read file as string; path relative to session currentDir
    (spit path content)        ;; write string to file
    (pwd)                      ;; current working directory as string
    (cd path)                  ;; change working directory; returns new absolute path
    (load path)                ;; load + eval a .clj file; sets ns to the file's ns
    String requires for Node built-ins (needs allowDynamicImport: true):
      (ns my.ns (:require [\\"node:path\\" :as path]
                          [\\"node:child_process\\" :as cp]
                          [\\"node:fs/promises\\" :as fs]))
    Shell execution (sync):
      (defn sh [cmd]
        (let [cp ((. js/process getBuiltinModule) \\"child_process\\")]
          ((. (. cp execSync cmd) toString))))
    Directory listing (sync):
      (defn ls [dir]
        (let [fs ((. js/process getBuiltinModule) \\"fs\\")]
          (vec (js/seq (. fs readdirSync dir)))))
    NOTE: (async @(. fs readFile path \\"utf-8\\")) does NOT work — @  only deref's CljPending,
    not raw JS Promises. Use slurp for sync reads or string-require node:fs/promises + then."

   :testing
   "clojure.test requires an explicit require — deftest is NOT auto-loaded.
    (require '[clojure.test :refer [deftest is testing run-tests thrown? thrown-with-msg?]])
    (deftest my-test
      (is (= 1 1))
      (testing \\"edge case\\"
        (is (nil? nil))))
    (run-tests)  ;; → {:test 1 :pass 2 :fail 0 :error 0}
    thrown? takes a KEYWORD error type (NOT a class like JVM Clojure):
      (is (thrown? :default (boom!)))           ;; catches anything
      (is (thrown? :error/runtime (/ 1 0)))     ;; catches runtime errors only
      (is (thrown-with-msg? :default #\\"oops\\" (boom!)))
    use-fixtures: (use-fixtures :each {:before setup-fn :after teardown-fn})
    Vitest integration: add cljTestPlugin to vite.config.ts.
    IMPORTANT: import { cljTestPlugin } from '@regibyte/cljam/vite-plugin' (NOT '@regibyte/cljam')
    Each (deftest ...) becomes a Vitest test — failures surface in vitest output."

   :handbook
   "This namespace. An atom registry of machine-readable tips for LLM agents.
    (require '[cljam.handbook :as h])
    (h/topics)                  ;; list all topic keys
    (h/lookup :sort)            ;; get entry as string
    (h/register! :my-tip \\"...\\") ;; add/update (session-local unless committed to file)
    Topics are mutable during a session — agents can refine entries and test them live."

   }))

;; ── Public API ────────────────────────────────────────────────────────────

(defn topics
  "List all available handbook topic keys."
  []
  (keys @*topics*))

(defn lookup
  "Look up a handbook topic. Returns the entry string, or a not-found message
   that lists available topics."
  [topic]
  (or (get @*topics* topic)
      (str "No handbook entry for " topic
           ". Available topics: " (sort (map name (keys @*topics*))))))

(defn register!
  "Add or update a handbook topic. Changes are session-local unless committed
   to the source file. Use this to iterate on entries during a live session."
  [topic content]
  (swap! *topics* assoc topic content)
  topic)
`,vm=`(ns cljam.vm
  "VM bytecode inspection and first-pass analysis helpers.")

(declare bytecode-info*-impl)
(declare value-summary*-impl)
(declare bytecode-census-item*-impl)
(declare namespace-census-impl*)

(defmacro
  bytecode-info*
  "Returns structured VM bytecode information for form, or nil when the target is not bytecode-backed."
  [form]
  \`(bytecode-info*-impl '~form))

(defn- instructions
  [info]
  (mapcat :instructions (:chunks info)))

(defn
  opcode-sequence
  "Returns opcode keywords from bytecode-info* in chunk order."
  [info]
  (into [] (map :op) (instructions info)))

(defn
  opcode-frequencies
  "Returns a frequency map of opcode keywords from bytecode-info*."
  [info]
  (frequencies (opcode-sequence info)))

(defn- chunk-opcodes
  [chunk]
  (into [] (map :op) (:instructions chunk)))

(defn- ngrams-for-ops
  [ops n]
  (loop [idx 0
         acc []]
    (if (> (+ idx n) (count ops))
      acc
      (recur (inc idx) (conj acc (into [] (take n) (drop idx ops)))))))

(defn
  opcode-ngrams
  "Returns a frequency map of per-chunk opcode windows of size n."
  [info n]
  (frequencies
   (mapcat
    (fn [chunk] (ngrams-for-ops (chunk-opcodes chunk) n))
    (:chunks info))))

(defn
  invocation-frequencies
  "Returns a frequency map of conservative direct callee hints from bytecode-info*."
  [info]
  (frequencies
   (map :callee
        (filter :callee (instructions info)))))

(defn- merge-counts
  [& maps]
  (apply merge-with + maps))

(defn- merge-ngram-frequencies
  [left right]
  (reduce-kv
   (fn [acc n freq-map]
     (assoc acc n (merge-counts (get acc n {}) freq-map)))
   left
   right))

(defn- normalize-census-opts
  [opts]
  {:include-private? (get opts :include-private? false)
   :ngrams           (get opts :ngrams [2 3 4 5])
   :top-limit        (get opts :top-limit 25)})

(defn
  namespace-census
  "Returns compact VM bytecode census data for a namespace symbol. Requires the namespace first."
  ([ns-sym] (namespace-census ns-sym {}))
  ([ns-sym opts]
   (let [opts (normalize-census-opts opts)
         _    (require [ns-sym])]
     (namespace-census-impl* ns-sym (:include-private? opts) (:ngrams opts)))))

(defn- merge-totals
  [left right]
  (merge-counts left right))

(defn
  corpus-census
  "Returns aggregate VM bytecode census data for a sequence of namespace symbols."
  ([ns-syms] (corpus-census ns-syms {}))
  ([ns-syms opts]
   (let [opts       (normalize-census-opts opts)
         namespaces (into [] (map #(namespace-census % opts)) ns-syms)]
     {:namespaces             namespaces
      :totals                 (reduce
                               (fn [acc census] (merge-totals acc (:totals census)))
                               {}
                               namespaces)
      :opcode-frequencies     (reduce
                               (fn [acc census] (merge-counts acc (:opcode-frequencies census)))
                               {}
                               namespaces)
      :invocation-frequencies (reduce
                               (fn [acc census] (merge-counts acc (:invocation-frequencies census)))
                               {}
                               namespaces)
      :opcode-ngrams          (reduce
                               (fn [acc census] (merge-ngram-frequencies acc (:opcode-ngrams census)))
                               {}
                               namespaces)})))

(defn
  top-frequencies
  "Returns the top frequency entries as [key count] vectors sorted descending by count."
  [freq-map limit]
  (into [] (take limit) (sort-by (fn [entry] (- 0 (second entry))) freq-map)))

(defn
  top-opcodes
  "Returns the most frequent opcodes in a namespace or corpus census."
  [census limit]
  (top-frequencies (:opcode-frequencies census) limit))

(defn
  top-invocations
  "Returns the most frequent conservative direct invocation hints in a namespace or corpus census."
  [census limit]
  (top-frequencies (:invocation-frequencies census) limit))

(defn
  top-ngrams
  "Returns the most frequent opcode n-grams of size n in a namespace or corpus census."
  [census n limit]
  (top-frequencies (get (:opcode-ngrams census) n {}) limit))
`,ym=`(ns clojure.core
  "The core Clojure standard library. Provides the fundamental building blocks
  of the language: collection operations, sequence processing, arithmetic,
  destructuring, macros, protocols, multimethods, atoms, and more.

  This namespace is automatically loaded in every cljam session.")


;; Bootstrap primitives
;; Only special forms (if, let*, def, fn*, do, quote) + native fns.                                       
;; No Clojure-defined macros here.   

;; Bootstrap shims: lightweight macros so the Clojure layer owns let/fn/loop
;; from the very first line. The full destructuring-aware versions redefine
;; these below once their dependencies (destructure, maybe-destructured, etc.)
;; are available.
(defmacro let [bindings & body]
  \`(let* ~bindings ~@body))

(defmacro fn [& sigs]
  (cons 'fn* sigs))

(defmacro loop [bindings & body]
  \`(loop* ~bindings ~@body))

(defmacro declare
  "defs the supplied var names with no bindings, useful for making forward declarations."
  [sym]
  \`(def ~sym))


(defmacro
  ^{:doc-group "Control Flow"}
  and
  "Evaluates exprs one at a time, from left to right. If a form returns logical false, returns that value without evaluating the rest. Otherwise returns the value of the last expr. (and) returns true."
  [& forms]
  (if (nil? forms)
    true
    (if (nil? (seq (rest forms)))
      (first forms)
      \`(let [v# ~(first forms)]
         (if v# (and ~@(rest forms)) v#)))))

(defmacro
  ^{:doc-group "Control Flow"}
  or
  "Evaluates exprs one at a time, from left to right. If a form returns a logical true value, returns that value without evaluating the rest. Otherwise returns the value of the last expr. (or) returns nil."
  [& forms]
  (if (nil? forms)
    nil
    (if (nil? (seq (rest forms)))
      (first forms)
      \`(let [v# ~(first forms)]
         (if v# v# (or ~@(rest forms)))))))


;; Native shims, for autocomplete only.
(declare all)
(declare async)
(declare catch*)
(declare then)
(declare loop*)
(declare let*)
(declare repeat*)
(declare seen-rest?)
(declare pprint)
(declare hierarchy-descendants-global)
(declare hierarchy-isa?-global)
(declare hierarchy-isa?*)
(declare hierarchy-derive-global!)
(declare hierarchy-derive*)
(declare hierarchy-underive-global!)
(declare hierarchy-underive*)
(declare hierarchy-parents-global)
(declare hierarchy-ancestors-global)
(declare describe*)
(declare disassemble*-impl)
(declare analyze*-impl)
(declare ast*-impl)

(defmacro
  ^{:doc-group "Runtime"}
  measure*
  "Evaluates body and returns a map with the final :value, total :elapsed-ms, selected :path, and ordered timing :stages."
  [& body]
  \`(measure*-impl '~body))

(defmacro
  ^{:doc-group "Runtime"}
  time
  "Evaluates body, prints elapsed time, and returns the final value."
  [& body]
  \`(time*-impl '~body))

(defmacro
  ^{:doc-group "Runtime"}
  disassemble*
  "Returns formatted VM bytecode disassembly lines for form or a bytecode-backed function, var, or macro target. Does not evaluate the target form."
  [form]
  \`(disassemble*-impl '~form))

(defmacro
  ^{:doc-group "Runtime"}
  analyze*
  "Returns the human-readable analyzer AST printout for form. Does not evaluate the form."
  [form]
  \`(analyze*-impl '~form))

(defmacro
  ^{:doc-group "Runtime"}
  ast*
  "Returns the faithful analyzer AST as cljam data for form. Does not evaluate the form."
  [form]
  \`(ast*-impl '~form))

(defmacro
  ^{:doc-group "Functions"}
  defn
  "Same as (def name (fn [params*] exprs*)). Optionally accepts a docstring and attribute-map before params. Attaches :doc and :arglists metadata to the var."
  [name & fdecl]
  (let [doc       (if (string? (first fdecl)) (first fdecl) nil)
        rest-decl (if doc (rest fdecl) fdecl)
        arglists  (if (vector? (first rest-decl))
                    (vector (first rest-decl))
                    (reduce (fn [acc arity] (conj acc (first arity))) [] rest-decl))
        meta-map  (let [sym-meta (if (meta name) (meta name) {})]
                    (if doc
                      (assoc sym-meta :doc doc :arglists arglists)
                      (assoc sym-meta :arglists arglists)))]
    \`(def ~(with-meta name meta-map) (fn ~name ~@rest-decl))))

(defmacro defn-
  "Same as defn, but marks the var as private."
  [name & fdecl]
  (list* 'defn (with-meta name (assoc (meta name) :private true)) fdecl))

;; defmulti / defmethod: multimethod sugar over native make-multimethod! / add-method!
;; defmulti uses a re-eval guard in make-multimethod! — re-loading a namespace
;; preserves all registered methods.
(defmacro
  ^{:doc-group "Abstractions"}
  defmulti
  "Creates a new multimethod with the given name and dispatch function. Re-evaluating a defmulti preserves all previously registered methods."
  [name dispatch-fn & opts]
  \`(make-multimethod! ~(str name) ~dispatch-fn ~@opts))

(defmacro
  ^{:doc-group "Abstractions"}
  defmethod
  "Creates and installs a new method for multimethod mm-name with dispatch value dispatch-val."
  [mm-name dispatch-val & fn-tail]
  \`(add-method! (var ~mm-name) ~dispatch-val (fn ~@fn-tail)))

;; delay: wraps body in a zero-arg fn and defers evaluation until forced.
;; make-delay is a native primitive that creates the CljDelay value.
(defmacro
  ^{:doc-group "Abstractions"}
  delay
  "Takes a body of expressions and yields a Delay object that will invoke the body only the first time it is forced (via force or deref/@), and will cache the result and return it on all subsequent force calls."
  [& body]
  \`(make-delay (fn* [] ~@body)))

;; lazy-seq: wraps body in a zero-arg fn and defers evaluation until realized.
;; make-lazy-seq is a native primitive that creates the CljLazySeq value.
(defmacro
  ^{:doc-group "Sequences"}
  lazy-seq
  "Takes a body of expressions that returns a seq or nil, and yields a LazySeq that will invoke the body only the first time it is realized."
  [& body]
  \`(make-lazy-seq (fn* lazy-seq-thunk [] ~@body)))


(defn
  ^{:doc-group "Metadata"}
  vary-meta
  "Returns an object of the same type and value as obj, with
  (apply f (meta obj) args) as its metadata."
  [obj f & args]
  (with-meta obj (apply f (meta obj) args)))

(defn
  ^{:doc-group "Comparison"}
  not
  "Returns true if x is logical false, false otherwise."
  [x] (if x false true))

(defn
  ^{:doc-group "Sequences"}
  next
  "Returns a seq of the items after the first. Calls seq on its
  argument.  If there are no more items, returns nil."
  [coll]
  (seq (rest coll)))


(defn
  ^{:doc-group "Sequences"}
  second
  "Same as (first (next x))"
  [coll]
  (first (next coll)))


(defmacro
  ^{:doc-group "Control Flow"}
  when
  "Executes body when condition is true, otherwise returns nil."
  [condition & body]
  \`(if ~condition (do ~@body) nil))

(defmacro
  ^{:doc-group "Control Flow"}
  when-not
  "Executes body when condition is false, otherwise returns nil."
  [condition & body]
  \`(if ~condition nil (do ~@body)))

(defmacro
  ^{:doc-group "Control Flow"}
  if-let
  "bindings => binding-form test
  If test is true, evaluates then with binding-form bound to the value of test, otherwise evaluates else."
  ([bindings then] \`(if-let ~bindings ~then nil))
  ([bindings then else]
   (let [form (first bindings)
         tst  (second bindings)]
     \`(let [~form ~tst]
        (if ~form ~then ~else)))))

(defmacro
  ^{:doc-group "Control Flow"}
  when-let
  "bindings => binding-form test
  When test is true, evaluates body with binding-form bound to the value of test."
  [bindings & body]
  (let [form (first bindings)
        tst  (second bindings)]
    \`(let [~form ~tst]
       (when ~form ~@body))))

(defmacro
  ^{:doc-group "Control Flow"}
  cond
  "Takes a set of test/expr pairs. Evaluates each test one at a time from left to right. If a test returns logical true, returns the value of the corresponding expr without evaluating the remaining tests."
  [& clauses]
  (if (nil? clauses)
    nil
    \`(if ~(first clauses)
       ~(first (next clauses))
       (cond ~@(rest (rest clauses))))))

(defmacro
  ^{:doc-group "Threading"}
  ->
  "Threads the expr through the forms. Inserts x as the second item in the first form, making a list of it if it is not a list already. If there are more forms, inserts the first form as the second item in second form, etc."
  [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     \`(~(first form) ~x ~@(rest form))
                     \`(~form ~x))]
      \`(-> ~threaded ~@more))))

(defmacro
  ^{:doc-group "Threading"}
  ->>
  "Threads the expr through the forms. Inserts x as the last item in the first form, making a list of it if it is not a list already. If there are more forms, inserts the first form as the last item in second form, etc."
  [x & forms]
  (if (nil? forms)
    x
    (let [form (first forms)
          more (rest forms)
          threaded (if (list? form)
                     \`(~(first form) ~@(rest form) ~x)
                     \`(~form ~x))]
      \`(->> ~threaded ~@more))))

#_{:clj-kondo/ignore [:unused-binding]}
(defmacro comment
  "Ignores body, yields nil"
  [& body] nil)

(defmacro
  ^{:doc-group "Threading"}
  as->
  "Binds name to expr, evaluates the first form in the lexical context of that binding, then binds name to that result, repeating for each successive form. Returns the result of the last form."
  [expr name & forms]
  \`(let [~name ~expr
         ~@(reduce (fn [acc form] (conj acc name form)) [] forms)]
     ~name))

(defmacro
  ^{:doc-group "Threading"}
  cond->
  "Takes an expression and a set of test/form pairs. Threads expr through each form (via ->) whose corresponding test returns logical true."
  [expr & clauses]
  (let [g (gensym "cv")
        steps (reduce
               (fn [acc pair]
                 (let [test (first pair)
                       form (second pair)
                       threaded (if (list? form)
                                  \`(~(first form) ~g ~@(rest form))
                                  \`(~form ~g))]
                   (conj acc \`(if ~test ~threaded ~g))))
               []
               (partition-all 2 clauses))]
    \`(let [~g ~expr
           ~@(reduce (fn [acc step] (conj acc g step)) [] steps)]
       ~g)))

(defmacro
  ^{:doc-group "Threading"}
  cond->>
  "Takes an expression and a set of test/form pairs. Threads expr through each form (via ->>) whose corresponding test returns logical true."
  [expr & clauses]
  (let [g (gensym "cv")
        steps (reduce
               (fn [acc pair]
                 (let [test (first pair)
                       form (second pair)
                       threaded (if (list? form)
                                  \`(~(first form) ~@(rest form) ~g)
                                  \`(~form ~g))]
                   (conj acc \`(if ~test ~threaded ~g))))
               []
               (partition-all 2 clauses))]
    \`(let [~g ~expr
           ~@(reduce (fn [acc step] (conj acc g step)) [] steps)]
       ~g)))

(defmacro
  ^{:doc-group "Threading"}
  some->
  "When expr is not nil, threads it into the first form (via ->), and when that result is not nil, through the next etc."
  [expr & forms]
  (if (nil? forms)
    expr
    \`(let [v# ~expr]
       (if (nil? v#)
         nil
         (some-> (-> v# ~(first forms)) ~@(rest forms))))))

(defmacro
  ^{:doc-group "Threading"}
  some->>
  "When expr is not nil, threads it into the first form (via ->>), and when that result is not nil, through the next etc."
  [expr & forms]
  (if (nil? forms)
    expr
    \`(let [v# ~expr]
       (if (nil? v#)
         nil
         (some->> (->> v# ~(first forms)) ~@(rest forms))))))

(defn
  ^{:doc-group "Higher-order"}
  constantly
  "Returns a function that takes any number of arguments and returns x."
  [x] (fn [& _] x))

(defn
  ^{:doc-group "Predicates"}
  some?
  "Returns true if x is not nil, false otherwise"
  [x] (not (nil? x)))

#_{:clj-kondo/ignore [:unused-binding]}
(defn
  ^{:doc-group "Predicates"}
  any?
  "Returns true for any given argument"
  [x] true)

(defn
  ^{:doc-group "Higher-order"}
  complement
  "Takes a fn f and returns a fn that takes the same arguments as f,
  has the same effects, if any, and returns the opposite truth value."
  [f]
  (fn
    ([] (not (f)))
    ([x] (not (f x)))
    ([x y] (not (f x y)))
    ([x y & zs] (not (apply f x y zs)))))

(defn
  ^{:doc-group "Higher-order"}
  juxt
  "Takes a set of functions and returns a fn that is the juxtaposition
  of those fns. The returned fn takes a variable number of args and
  returns a vector containing the result of applying each fn to the args."
  [& fns]
  (fn [& args]
    (reduce (fn [acc f] (conj acc (apply f args))) [] fns)))

(defn
  ^{:doc-group "Maps"}
  merge
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

(defn
  ^{:doc-group "Maps"}
  select-keys
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

(defn
  ^{:doc-group "Maps"}
  update
  "Updates a value in an associative structure where k is a key and f is a
  function that will take the old value and any supplied args and return the
  new value, and returns a new structure."
  [m k f & args]
  (let [target (if (nil? m) {} m)]
    (assoc target k (if (nil? args)
                      (f (get target k))
                      (apply f (get target k) args)))))

(defn
  ^{:doc-group "Maps"}
  get-in
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

(defn
  ^{:doc-group "Maps"}
  assoc-in
  "Associates a value in a nested associative structure, where ks is a
  sequence of keys and v is the new value. Returns a new nested structure."
  [m ks v]
  (let [k    (first ks)
        more (next ks)]
    (if more
      (assoc m k (assoc-in (get m k) more v))
      (assoc m k v))))

(defn
  ^{:doc-group "Maps"}
  update-in
  "Updates a value in a nested associative structure, where ks is a
  sequence of keys and f is a function that will take the old value and any
  supplied args and return the new value. Returns a new nested structure."
  [m ks f & args]
  (assoc-in m ks (apply f (get-in m ks) args)))

(defn
  ^{:doc-group "Maps"}
  fnil
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

(defn
  ^{:doc-group "Maps"}
  frequencies
  "Returns a map from distinct items in coll to the number of times they appear."
  [coll]
  (if (nil? coll)
    {}
    (reduce
     (fn [counts item]
       (assoc counts item (inc (get counts item 0))))
     {}
     coll)))

(defn
  ^{:doc-group "Maps"}
  group-by
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

(defn
  ^{:doc-group "Sequences"}
  distinct
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

(defn
  ^{:doc-group "Sequences"}
  flatten-step
  "Internal helper for flatten."
  [v]
  (if (or (list? v) (vector? v))
    (reduce
     (fn [acc item]
       (into acc (flatten-step item)))
     []
     v)
    [v]))

(defn
  ^{:doc-group "Sequences"}
  flatten
  "Takes any nested combination of sequential things (lists/vectors) and
  returns their contents as a single flat vector."
  [x]
  (if (nil? x)
    []
    (flatten-step x)))

(defn
  ^{:doc-group "Sequences"}
  reduce-kv
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

(defn
  ^{:doc-group "Sequences"}
  sort-compare
  "Internal helper: normalizes comparator results."
  [cmp a b]
  (let [r (cmp a b)]
    (if (number? r)
      (< r 0)
      r)))

(defn
  ^{:doc-group "Sequences"}
  insert-sorted
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

(defn
  ^{:doc-group "Sequences"}
  sort
  "Returns the items in coll in sorted order. With no comparator, uses
  compare (works on numbers, strings, keywords, chars). Comparator may
  return boolean or number."
  ([coll] (sort compare coll))
  ([cmp coll]
   (if (nil? coll)
     []
     (reduce
      (fn [acc item]
        (insert-sorted cmp item acc))
      []
      coll))))

(defn
  ^{:doc-group "Sequences"}
  sort-by
  "Returns a sorted sequence of items in coll, where the sort order is
  determined by comparing (keyfn item). Default comparator is compare."
  ([keyfn coll] (sort-by keyfn compare coll))
  ([keyfn cmp coll]
   (sort
    (fn [a b]
      (cmp (keyfn a) (keyfn b)))
    coll)))

(def
  ^{:doc-group "Predicates"}
  not-any? (comp not some))

(defn
  ^{:doc-group "Predicates"}
  not-every?
  "Returns false if (pred x) is logical true for every x in
  coll, else true."
  [pred coll] (not (every? pred coll)))

;; ── Transducer protocol ──────────────────────────────────────────────────────

;; into: 2-arity uses reduce+conj; 3-arity uses transduce
(defn
  ^{:doc-group "Sequences"}
  into
  "Returns a new coll consisting of to-coll with all of the items of
   from-coll conjoined. A transducer may be supplied."
  ([to from] (reduce conj to from))
  ([to xf from] (transduce xf conj to from)))

(defn
  ^{:doc-group "Sequences"}
  sequence
  "Coerces coll to a (possibly empty) sequence, if it is not already
  one. Will not force a lazy seq. (sequence nil) yields (). When a
  transducer is supplied, returns a lazy sequence of applications of
  the transform to the items in coll."
  ([coll]
   (if (seq? coll)
     coll
     (or (seq coll) '())))
  ([xf coll]
   ;; Pull/push adapter: pulls source items one at a time, pushes through xf,
   ;; and yields outputs lazily. Handles stateful transducers (partition-all),
   ;; early termination (take), and infinite sources.
   ;;
   ;; After finalization, (step nil) drains the pending buffer naturally:
   ;; (when-not @finalized) blocks further source pulling, so we only yield
   ;; remaining buffered items and then return nil.
   (let [pending   (volatile! [])
         finalized (volatile! false)
         xrf (xf (fn
                   ([] nil)
                   ([_] nil)
                   ([_ x] (vswap! pending conj x) nil)))
         step (fn step [s]
                (lazy-seq
                  (if (seq @pending)
                    (let [item (first @pending)]
                      (vswap! pending (fn [v] (subvec v 1)))
                      (cons item (step s)))
                    (when-not @finalized
                      (if-let [s (seq s)]
                        (let [res (xrf nil (first s))]
                          (if (reduced? res)
                            (do (vreset! finalized true)
                                (xrf (unreduced res))
                                (step nil))
                            (step (rest s))))
                        (do (vreset! finalized true)
                            (xrf nil)
                            (step nil)))))))]
     (or (seq (step coll)) '()))))


(defn
  ^{:doc-group "Sequences"}
  completing
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
(defn
  ^{:doc-group "Sequences"}
  map
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
   (lazy-seq
    (when-let [s (seq coll)]
      (cons (f (first s)) (map f (rest s))))))
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
(defn
  ^{:doc-group "Sequences"}
  filter
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
   (lazy-seq
    (when-let [s (seq coll)]
      (if (pred (first s))
        (cons (first s) (filter pred (rest s)))
        (filter pred (rest s)))))))

(defn
  ^{:doc-group "Sequences"}
  remove
  "Returns a lazy sequence of the items in coll for which
  (pred item) returns logical false. pred must be free of side-effects.
  Returns a transducer when no collection is provided."
  ([pred] (filter (complement pred)))
  ([pred coll]
   (filter (complement pred) coll)))



;; take: stateful transducer; signals early termination after n items
;; r > 0 → keep going; r = 0 → take last item and stop; r < 0 → already past limit, stop
(defn
  ^{:doc-group "Sequences"}
  take
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
   (lazy-seq
    (when (pos? n)
      (when-let [s (seq coll)]
        (cons (first s) (take (dec n) (rest s))))))))

;; take-while: stateless transducer; emits reduced when pred fails
(defn
  ^{:doc-group "Sequences"}
  take-while
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
   (lazy-seq
    (when-let [s (seq coll)]
      (when (pred (first s))
        (cons (first s) (take-while pred (rest s))))))))

;; drop: stateful transducer; skips first n items
;; r >= 0 → still skipping; r < 0 → past the drop zone, start taking
(defn
  ^{:doc-group "Sequences"}
  drop
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
   (if (pos? n)
     (lazy-seq (drop (dec n) (rest coll)))
     (lazy-seq (seq coll)))))

(defn
  ^{:doc-group "Sequences"}
  drop-last
  "Return a sequence of all but the last n (default 1) items in coll"
  ([coll] (drop-last 1 coll))
  ([n coll] (map (fn [x _] x) coll (drop n coll))))

(defn
  ^{:doc-group "Sequences"}
  take-last
  "Returns a sequence of the last n items in coll.  Depending on the type
  of coll may be no better than linear time.  For vectors, see also subvec."
  [n coll]
  (loop [s (seq coll), lead (seq (drop n coll))]
    (if lead
      (recur (next s) (next lead))
      s)))

;; drop-while: stateful transducer; passes through once pred fails
(defn
  ^{:doc-group "Sequences"}
  drop-while
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
   (lazy-seq
    (let [s (seq coll)]
      (if (and s (pred (first s)))
        (drop-while pred (rest s))
        s)))))

;; letfn: expands to letfn* (the primitive), which takes a flat vector of
;; [name fn-form name fn-form ...] pairs and evaluates each fn-form in a
;; shared env frame so all fns can see each other (mutual recursion).
(defmacro
  ^{:doc-group "Control Flow"}
  letfn
  "fnspecs => (fname [params*] exprs)+
  Takes a vector of function specs and a body. Binds each fname to its fn in a shared environment so all functions can mutually reference each other."
  [fnspecs & body]
  (cons 'letfn*
        (cons (reduce (fn* [acc spec]
                           (conj (conj acc (first spec))
                                 (cons 'fn* (rest spec))))
                      []
                      fnspecs)
              body)))

;; map-indexed: stateful transducer; passes index and item to f
(defn
  ^{:doc-group "Sequences"}
  map-indexed
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
   (letfn [(step [i s]
             (lazy-seq
              (when-let [xs (seq s)]
                (cons (f i (first xs)) (step (inc i) (rest xs))))))]
     (step 0 coll))))

;; dedupe: stateful transducer; removes consecutive duplicates
(defn
  ^{:doc-group "Sequences"}
  dedupe
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
(defn
  ^{:doc-group "Sequences"}
  partition-all
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
   (partition-all n n coll))
  ([n step coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (let [seg (vec (take n s))]
         (cons seg (partition-all n step (nthrest s step))))))))

;; ── Documentation ────────────────────────────────────────────────────────────

(defmacro
  ^{:doc-group "Dev"}
  doc
  [sym]
  \`(let [v#        (var ~sym)
         m#        (meta v#)
         d#        (:doc m#)
         args#     (:arglists m#)
         args-str# (when args#
                     (str "("
                          (reduce
                           (fn [acc# a#]
                             (if (= acc# "")
                               (str a#)
                               (str acc# " \\n " a#)))
                           ""
                           args#)
                          ")"))]
     (println (str "-------------------------\\n"
                   ~(str sym) "\\n"
                   (if args-str# (str args-str# "\\n") "")
                   "  " (or d# "No documentation available.")))))

(defn
  ^{:doc-group "Errors"}
  make-err
  "Creates an error map with type, message, data and optionally cause"
  ([type message] (make-err type message nil nil))
  ([type message data] (make-err type message data nil))
  ([type message data cause] {:type type :message message :data data :cause cause}))

;; ── Sequence utilities ──────────────────────────────────────────────────────

(defn
  ^{:doc-group "Sequences"}
  butlast
  "Return a seq of all but the last item in coll, in linear time"
  [coll]
  (loop [ret [] s (seq coll)]
    (if (next s)
      (recur (conj ret (first s)) (next s))
      (seq ret))))

(defn
  ^{:doc-group "Sequences"}
  fnext
  "Same as (first (next x))"
  [x] (first (next x)))

(defn
  ^{:doc-group "Sequences"}
  nfirst
  "Same as (next (first x))"
  [x] (next (first x)))

(defn
  ^{:doc-group "Sequences"}
  nnext
  "Same as (next (next x))"
  [x] (next (next x)))

(defn
  ^{:doc-group "Sequences"}
  nthrest
  "Returns the nth rest of coll, coll when n is 0."
  [coll n]
  (loop [n n xs coll]
    (if (and (pos? n) (seq xs))
      (recur (dec n) (rest xs))
      xs)))

(defn
  ^{:doc-group "Sequences"}
  nthnext
  "Returns the nth next of coll, (seq coll) when n is 0."
  [coll n]
  (loop [n n xs (seq coll)]
    (if (and (pos? n) xs)
      (recur (dec n) (next xs))
      xs)))

(defn
  ^{:doc-group "Sequences"}
  list*
  "Creates a new seq containing the items prepended to the rest, the
  last of which will be treated as a sequence."
  ([args] (seq args))
  ([a args] (cons a args))
  ([a b args] (cons a (cons b args)))
  ([a b c args] (cons a (cons b (cons c args))))
  ([a b c d & more]
   (cons a (cons b (cons c (apply list* d more))))))

(defn
  ^{:doc-group "Sequences"}
  mapv
  "Returns a vector consisting of the result of applying f to the
  set of first items of each coll, followed by applying f to the set
  of second items in each coll, until any one of the colls is exhausted."
  ([f coll] (into [] (map f) coll))
  ([f c1 c2] (into [] (map f c1 c2)))
  ([f c1 c2 c3] (into [] (map f c1 c2 c3)))
  ([f c1 c2 c3 & colls] (into [] (apply map f c1 c2 c3 colls))))

(defn
  ^{:doc-group "Sequences"}
  filterv
  "Returns a vector of the items in coll for which
  (pred item) returns logical true."
  [pred coll]
  (into [] (filter pred) coll))

(defn
  ^{:doc-group "Sequences"}
  run!
  "Runs the supplied procedure (via reduce), for purposes of side
  effects, on successive items in the collection. Returns nil."
  [proc coll]
  (reduce (fn [_ x] (proc x) nil) nil coll))

(defn
  ^{:doc-group "Sequences"}
  keep
  "Returns a sequence of the non-nil results of (f item). Note,
  this means false return values will be included.  f must be free of
  side-effects.  Returns a transducer when no collection is provided."
  ([f]
   (fn [rf]
     (fn
       ([] (rf))
       ([result] (rf result))
       ([result input]
        (let [v (f input)]
          (if (nil? v)
            result
            (rf result v)))))))
  ([f coll]
   (lazy-seq
    (when-let [s (seq coll)]
      (let [v (f (first s))]
        (if (nil? v)
          (keep f (rest s))
          (cons v (keep f (rest s)))))))))

(defn
  ^{:doc-group "Sequences"}
  keep-indexed
  "Returns a sequence of the non-nil results of (f index item). Note,
  this means false return values will be included.  f must be free of
  side-effects.  Returns a stateful transducer when no collection is provided."
  ([f]
   (fn [rf]
     (let [i (volatile! -1)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [v (f (vswap! i inc) input)]
            (if (nil? v)
              result
              (rf result v))))))))
  ([f coll]
   (letfn [(step [i s]
             (lazy-seq
              (when-let [xs (seq s)]
                (let [v (f i (first xs))]
                  (if (nil? v)
                    (step (inc i) (rest xs))
                    (cons v (step (inc i) (rest xs))))))))]
     (step 0 coll))))

(defn
  ^{:doc-group "Sequences"}
  mapcat
  "Returns the result of applying concat to the result of applying map
  to f and colls.  Thus function f should return a collection. Returns
  a transducer when no collections are provided."
  ([f]
   (fn [rf]
     (let [inner ((map f) (fn
                            ([] (rf))
                            ([result] (rf result))
                            ([result input]
                             (reduce rf result input))))]
       inner)))
  ([f coll]
   (lazy-seq
    (when-let [s (seq coll)]
      (concat (f (first s)) (mapcat f (rest s))))))
  ([f coll & more]
   (apply concat (apply map f coll more))))

(defn
  ^{:doc-group "Sequences"}
  interleave
  "Returns a lazy sequence of the first item in each coll, then the second etc.
  Stops as soon as any coll is exhausted."
  ([c1 c2]
   (lazy-seq
    (let [s1 (seq c1) s2 (seq c2)]
      (when (and s1 s2)
        (cons (first s1) (cons (first s2) (interleave (rest s1) (rest s2))))))))
  ([c1 c2 & colls]
   (lazy-seq
    (let [seqs (map seq (cons c1 (cons c2 colls)))]
      (when (every? some? seqs)
        (concat (map first seqs) (apply interleave (map rest seqs))))))))

(defn
  ^{:doc-group "Sequences"}
  interpose
  "Returns a sequence of the elements of coll separated by sep.
  Returns a transducer when no collection is provided."
  ([sep]
   (fn [rf]
     (let [started (volatile! false)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (if @started
            (let [sepr (rf result sep)]
              (if (reduced? sepr)
                sepr
                (rf sepr input)))
            (do
              (vreset! started true)
              (rf result input))))))))
  ([sep coll]
   (drop 1 (interleave (repeat sep) coll))))

;; ── Lazy concat (shadows native eager concat) ──────────────────────────────
(defn
  ^{:doc-group "Sequences"}
  concat
  "Returns a lazy seq representing the concatenation of the elements in the
  supplied colls."
  ([] nil)
  ([x] (lazy-seq (seq x)))
  ([x y]
   (lazy-seq
    (let [s (seq x)]
      (if s
        (cons (first s) (concat (rest s) y))
        (seq y)))))
  ([x y & zs]
   (let [cat (fn cat [xy zs]
               (lazy-seq
                (let [xys (seq xy)]
                  (if xys
                    (cons (first xys) (cat (rest xys) zs))
                    (when (seq zs)
                      (cat (first zs) (next zs)))))))]
     (cat (concat x y) zs))))

(defn
  ^{:doc-group "Sequences"}
  iterate
  "Returns a lazy sequence of x, (f x), (f (f x)) etc.
  With 3 args, returns a finite sequence of n items (backwards compat)."
  ([f x]
   (lazy-seq (cons x (iterate f (f x)))))
  ([f x n]
   (loop [i 0 v x acc []]
     (if (< i n)
       (recur (inc i) (f v) (conj acc v))
       acc))))

(defn
  ^{:doc-group "Sequences"}
  repeatedly
  "Takes a function of no args, presumably with side effects, and
  returns a lazy infinite sequence of calls to it.
  With 2 args (n f), returns a finite sequence of n calls."
  ([f] (lazy-seq (cons (f) (repeatedly f))))
  ([n f]
   (loop [i 0 acc []]
     (if (< i n)
       (recur (inc i) (conj acc (f)))
       acc))))

(defn
  ^{:doc-group "Sequences"}
  cycle
  "Returns a lazy infinite sequence of repetitions of the items in coll.
  With 2 args (n coll), returns a finite sequence (backwards compat)."
  ([coll]
   (lazy-seq
    (when (seq coll)
      (concat coll (cycle coll)))))
  ([n coll]
   (let [s (into [] coll)]
     (loop [i 0 acc []]
       (if (< i n)
         (recur (inc i) (into acc s))
         acc)))))

(defn
  ^{:doc-group "Sequences"}
  repeat
  "Returns a lazy infinite sequence of xs.
  With 2 args (n x), returns a finite sequence of n copies."
  ([x] (lazy-seq (cons x (repeat x))))
  ([n x] (repeat* n x)))

(defn
  ^{:doc-group "Sequences"}
  range
  "Returns a lazy seq of nums from start (inclusive) to end (exclusive),
  by step, where start defaults to 0, step to 1, and end to infinity.
  With no args, returns an infinite lazy seq of integers from 0. When step
  is zero and start does not equal end, returns an infinite seq of start
  (Clojure parity)."
  ([] (iterate inc 0))
  ([end] (range 0 end 1))
  ([start end] (range start end 1))
  ([start end step]
   (lazy-seq
    (when (cond
            (pos? step) (< start end)
            (neg? step) (> start end)
            :else       (not= start end))
      (cons start (range (+ start step) end step))))))

(defn
  ^{:doc-group "IO"}
  newline
  "Writes a newline to *out*."
  [] (println ""))

(defn
  ^{:doc-group "Sequences"}
  dorun
  "Forces realization of a (possibly lazy) sequence. Walks the sequence
  without retaining the head. Returns nil."
  [coll]
  (when (seq coll)
    (recur (rest coll))))

(defn
  ^{:doc-group "Sequences"}
  doall
  "Forces realization of a (possibly lazy) sequence. Unlike dorun,
  retains the head and returns the seq."
  [coll]
  (dorun coll)
  coll)

(defn
  ^{:doc-group "Sequences"}
  take-nth
  "Returns a sequence of every nth item in coll.  Returns a stateful
  transducer when no collection is provided."
  ([n]
   (fn [rf]
     (let [i (volatile! -1)]
       (fn
         ([] (rf))
         ([result] (rf result))
         ([result input]
          (let [idx (vswap! i inc)]
            (if (zero? (mod idx n))
              (rf result input)
              result)))))))
  ([n coll]
   (lazy-seq
     (when-let [s (seq coll)]
       (cons (first s) (take-nth n (drop n s)))))))

(defn
  ^{:doc-group "Sequences"}
  partition
  "Returns a sequence of lists of n items each, at offsets step
  apart. If step is not supplied, defaults to n, i.e. the partitions
  do not overlap. If a pad collection is supplied, use its elements as
  necessary to complete last partition up to n items. In case there are
  not enough padding elements, return a partition with less than n items."
  ([n coll] (partition n n coll))
  ([n step coll]
   (loop [s (seq coll) acc []]
     (if (nil? s)
       acc
       (let [p (into [] (take n) s)]
         (if (< (count p) n)
           acc
           (recur (seq (drop step s)) (conj acc p)))))))
  ([n step pad coll]
   (loop [s (seq coll) acc []]
     (if (nil? s)
       acc
       (let [p (into [] (take n) s)]
         (if (< (count p) n)
           (conj acc (into [] (take n) (concat p pad)))
           (recur (seq (drop step s)) (conj acc p))))))))

(defn
  ^{:doc-group "Sequences"}
  partition-by
  "Applies f to each value in coll, splitting it each time f returns a
  new value.  Returns a sequence of partitions.  Returns a stateful
  transducer when no collection is provided."
  ([f]
   (fn [rf]
     (let [pv (volatile! ::none)
           buf (volatile! [])]
       (fn
         ([] (rf))
         ([result]
          (let [b @buf]
            (vreset! buf [])
            (if (empty? b)
              (rf result)
              (rf (unreduced (rf result b))))))
         ([result input]
          (let [v (f input)
                p @pv]
            (vreset! pv v)
            (if (or (= p ::none) (= v p))
              (do (vswap! buf conj input) result)
              (let [b @buf]
                (vreset! buf [input])
                (rf result b)))))))))
  ([f coll]
   (lazy-seq
    (when-let [s (seq coll)]
      (let [fv        (f (first s))
            run       (into [] (cons (first s) (take-while #(= (f %) fv) (next s))))
            remaining (drop-while #(= (f %) fv) (next s))]
        (cons run (partition-by f remaining)))))))

(defn
  ^{:doc-group "Sequences"}
  reductions
  "Returns a sequence of the intermediate values of the reduction (as
  by reduce) of coll by f, starting with init."
  ([f coll]
   (if (empty? coll)
     (list (f))
     (reductions f (first coll) (rest coll))))
  ([f init coll]
   (loop [acc [init] val init s (seq coll)]
     (if (nil? s)
       acc
       (let [nval (f val (first s))]
         (if (reduced? nval)
           (conj acc (unreduced nval))
           (recur (conj acc nval) nval (next s))))))))

(defn
  ^{:doc-group "Sequences"}
  split-at
  "Returns a vector of [(take n coll) (drop n coll)]"
  [n coll]
  [(into [] (take n) coll) (into [] (drop n) coll)])

(defn
  ^{:doc-group "Sequences"}
  split-with
  "Returns a vector of [(take-while pred coll) (drop-while pred coll)]"
  [pred coll]
  [(into [] (take-while pred) coll) (into [] (drop-while pred) coll)])

(defn
  ^{:doc-group "Maps"}
  merge-with
  "Returns a map that consists of the rest of the maps conj-ed onto
  the first.  If a key occurs in more than one map, the mapping(s)
  from the latter (left-to-right) will be combined with the mapping in
  the result by calling (f val-in-result val-in-latter)."
  [f & maps]
  (reduce
   (fn [acc m]
     (if (nil? m)
       acc
       (reduce
        (fn [macc entry]
          (let [k (first entry)
                v (second entry)]
            (if (contains? macc k)
              (assoc macc k (f (get macc k) v))
              (assoc macc k v))))
        (or acc {})
        m)))
   nil
   maps))

(defn
  ^{:doc-group "Maps"}
  update-keys
  "m f => apply f to each key in m"
  [m f]
  (reduce
   (fn [acc entry]
     (assoc acc (f (first entry)) (second entry)))
   {}
   m))

(defn
  ^{:doc-group "Maps"}
  update-vals
  "m f => apply f to each val in m"
  [m f]
  (reduce
   (fn [acc entry]
     (assoc acc (first entry) (f (second entry))))
   {}
   m))

(defn
  ^{:doc-group "Sequences"}
  not-empty
  "If coll is empty, returns nil, else coll"
  [coll]
  (when (seq coll) coll))

(defn
  ^{:doc-group "Higher-order"}
  memoize
  "Returns a memoized version of a referentially transparent function. The
  memoized version of the function keeps a cache of the mapping from arguments
  to results and, when calls with the same arguments are repeated often, has
  higher performance at the expense of higher memory use."
  [f]
  (let [mem (atom {})]
    (fn [& args]
      (let [cached (get @mem args ::not-found)]
        (if (= cached ::not-found)
          (let [ret (apply f args)]
            (swap! mem assoc args ret)
            ret)
          cached)))))

(defn
  ^{:doc-group "Higher-order"}
  trampoline
  "trampoline can be used to convert algorithms requiring mutual
  recursion without stack consumption. Calls f with supplied args, if
  any. If f returns a fn, calls that fn with no arguments, and
  continues to repeat, until the return value is not a fn, then
  returns that non-fn value."
  ([f]
   (loop [ret (f)]
     (if (fn? ret)
       (recur (ret))
       ret)))
  ([f & args]
   (loop [ret (apply f args)]
     (if (fn? ret)
       (recur (ret))
       ret))))

(defmacro
  ^{:doc-group "Control Flow"}
  with-redefs
  "binding => var-symbol temp-value-expr
  Temporarily redefines Vars while executing the body. The
  temp-value-exprs will be evaluated and each resulting value will
  replace in parallel the root value of its Var. Always restores
  the original values, even if body throws."
  [bindings & body]
  (let [pairs     (partition 2 bindings)
        names     (mapv first pairs)
        new-vals  (mapv second pairs)
        orig-syms (mapv (fn [_] (gensym "orig")) names)]
    \`(let [~@(interleave orig-syms (map (fn [n] \`(var-get (var ~n))) names))]
       (try
         (do ~@(map (fn [n v] \`(alter-var-root (var ~n) (constantly ~v))) names new-vals)
             ~@body)
         (finally
           ~@(map (fn [n o] \`(alter-var-root (var ~n) (constantly ~o))) names orig-syms))))))

;; ── Macros: conditionals and control flow ───────────────────────────────────

(defmacro
  ^{:doc-group "Control Flow"}
  if-some
  "bindings => binding-form test
  If test is not nil, evaluates then with binding-form bound to the
  value of test, if not, yields else"
  ([bindings then] \`(if-some ~bindings ~then nil))
  ([bindings then else]
   (let [form (first bindings)
         tst  (second bindings)]
     \`(let [temp# ~tst]
        (if (nil? temp#)
          ~else
          (let [~form temp#]
            ~then))))))

(defmacro
  ^{:doc-group "Control Flow"}
  when-some
  "bindings => binding-form test
  When test is not nil, evaluates body with binding-form bound to the
  value of test"
  [bindings & body]
  (let [form (first bindings)
        tst  (second bindings)]
    \`(let [temp# ~tst]
       (when (some? temp#)
         (let [~form temp#]
           ~@body)))))

(defmacro
  ^{:doc-group "Control Flow"}
  when-first
  "bindings => x xs
  Roughly the same as (when (seq xs) (let [x (first xs)] body)) but xs is evaluated only once"
  [bindings & body]
  (let [x  (first bindings)
        xs (second bindings)]
    \`(let [temp# (seq ~xs)]
       (when temp#
         (let [~x (first temp#)]
           ~@body)))))

(defn
  ^{:no-doc true}
  condp-emit [gpred gexpr clauses]
  (if (nil? clauses)
    \`(throw (ex-info (str "No matching clause: " ~gexpr) {}))
    (if (nil? (next clauses))
      (first clauses)
      \`(if (~gpred ~(first clauses) ~gexpr)
         ~(second clauses)
         ~(condp-emit gpred gexpr (next (next clauses)))))))

(defmacro
  ^{:doc-group "Control Flow"}
  condp
  "Takes a binary predicate, an expression, and a set of clauses.
  Each clause can take the form of either:
    test-expr result-expr
  The predicate is applied to each test-expr and the expression in turn."
  [pred expr & clauses]
  (let [gpred (gensym "pred__")
        gexpr (gensym "expr__")]
    \`(let [~gpred ~pred
           ~gexpr ~expr]
       ~(condp-emit gpred gexpr clauses))))

(defn
  ^{:no-doc true}
  case-emit
  [ge clauses]
  (if (nil? clauses)
    \`(throw (ex-info (str "No matching clause: " ~ge) {}))
    (if (nil? (next clauses))
      (first clauses)
      \`(if (= ~ge ~(first clauses))
         ~(second clauses)
         ~(case-emit ge (next (next clauses)))))))

(defmacro
  ^{:doc-group "Control Flow"}
  case
  "Takes an expression, and a set of clauses. Each clause can take the form of
  either:
    test-constant result-expr
  If no clause matches, and there is an odd number of forms (a default), the
  last expression is returned."
  [e & clauses]
  (let [ge (gensym "case__")]
    \`(let [~ge ~e]
       ~(case-emit ge clauses))))

(defmacro
  ^{:doc-group "Control Flow"}
  dotimes
  "bindings => name n
  Repeatedly executes body (presumably for side-effects) with name
  bound to integers from 0 through n-1."
  [bindings & body]
  (let [i (first bindings)
        n (second bindings)]
    \`(let [n# ~n]
       (loop [~i 0]
         (when (< ~i n#)
           ~@body
           (recur (inc ~i)))))))

(defmacro
  ^{:doc-group "Control Flow"}
  while
  "Repeatedly executes body while test expression is true. Presumes
  some side-effect will cause test to become false/nil."
  [test & body]
  \`(loop []
     (when ~test
       ~@body
       (recur))))

(defmacro
  ^{:doc-group "Control Flow"}
  doseq
  "Repeatedly executes body (presumably for side-effects) with
  bindings. Supports :let, :when, and :while modifiers."
  [seq-exprs & body]
  (let [bindings (partition 2 seq-exprs)
        first-binding (first bindings)
        rest-bindings (next bindings)]
    (if (nil? first-binding)
      \`(do ~@body nil)
      (let [k (first first-binding)
            v (second first-binding)]
        (cond
          (= k :let)
          \`(let ~v (doseq ~(apply concat rest-bindings) ~@body))

          (= k :when)
          \`(when ~v (doseq ~(apply concat rest-bindings) ~@body))

          (= k :while)
          \`(if ~v (doseq ~(apply concat rest-bindings) ~@body) nil)

          :else
          (if rest-bindings
            \`(run! (fn [~k] (doseq ~(apply concat rest-bindings) ~@body)) ~v)
            \`(run! (fn [~k] ~@body) ~v)))))))

(defmacro
  ^{:doc-group "Control Flow"}
  for
  "List comprehension. Takes a vector of one or more
  binding-form/collection-expr pairs, each followed by zero or more
  modifiers, and yields a sequence of evaluations of expr.
  Supported modifiers: :let, :when, :while."
  [seq-exprs & body]
  (let [bindings (partition 2 seq-exprs)
        first-binding (first bindings)
        rest-bindings (next bindings)]
    (if (nil? first-binding)
      \`(list ~@body)
      (let [k (first first-binding)
            v (second first-binding)]
        (cond
          (= k :let)
          \`(let ~v (for ~(apply concat rest-bindings) ~@body))

          (= k :when)
          \`(if ~v (for ~(apply concat rest-bindings) ~@body) (list))

          (= k :while)
          \`(if ~v (for ~(apply concat rest-bindings) ~@body) (list))

          :else
          (if rest-bindings
            \`(mapcat (fn [~k] (for ~(apply concat rest-bindings) ~@body)) ~v)
            \`(map (fn [~k] ~@body) ~v)))))))

;; ── Destructure ──────────────────────────────────────────────────────────────
;; Mirrors Clojure's own destructure function. Takes a flat bindings vector
;; (as written in let/loop forms) and expands any destructuring patterns into
;; simple symbol bindings that let*/loop* can handle directly.
;;
;; Key adaptations from Clojure's source:
;;   - reduce1         → reduce
;;   - (new Exception) → ex-info
;;   - Java type hints → removed
;;   - PersistentArrayMap/createAsIfByAssoc → simplified (use map directly)
;;   - (instance? Named x) / (ident? x) → (or (keyword? x) (symbol? x))
;;   - (keyword nil name) → guarded to 1-arity (keyword name) when ns is nil
;;   - (key entry) / (val entry) → (first entry) / (second entry)
(defn
  ^{:no-doc true}
  destructure [bindings]
  (let*
   [bents (partition 2 bindings)
    pb    (fn pb [bvec b v]
            (let* [;; ── vector pattern ───────────────────────────────────
                   pvec
                   (fn [bvec b val]
                     (let* [gvec     (gensym "vec__")
                            graw     (gensym "raw__")
                            gseq     (gensym "seq__")
                            gfirst   (gensym "first__")
                            has-rest (some #{'&} b)]
                       (loop [ret (let [ret (-> bvec
                                               (conj graw val)
                                               (conj gvec
                                                     (list 'if (list 'or (list 'nil? graw) (list 'sequential? graw))
                                                           graw
                                                           (list 'throw (list 'ex-info
                                                                              (list 'str "Cannot destructure " (list 'pr-str graw) " as a sequential collection")
                                                                              (hash-map))))))]
                                    (if has-rest
                                      (conj ret gseq (list 'seq gvec))
                                      ret))
                              n          0
                              bs         b
                              seen-rest? false]
                         (if (seq bs)
                           (let [firstb (first bs)]
                             (cond
                               (= firstb '&)
                               (recur (pb ret (second bs) gseq)
                                      n
                                      (next (next bs))
                                      true)

                               (= firstb :as)
                               (pb ret (second bs) gvec)

                               :else
                               (if seen-rest?
                                 (throw (ex-info "Unsupported binding form, only :as can follow & parameter" {}))
                                 (recur (pb (if has-rest
                                              (-> ret
                                                  (conj gfirst) (conj (list 'first gseq))
                                                  (conj gseq)   (conj (list 'next gseq)))
                                              ret)
                                            firstb
                                            (if has-rest
                                              gfirst
                                              (list 'nth gvec n nil)))
                                        (inc n)
                                        (next bs)
                                        seen-rest?))))
                           ret))))

                   ;; ── map pattern ──────────────────────────────────────
                   pmap
                   (fn [bvec b v]
                     (let* [gmap     (gensym "map__")
                            graw     (gensym "raw__")
                            source   (if (symbol? v) v graw)
                            defaults (:or b)
                            ;; Expand :keys/:strs/:syms shorthands into direct
                            ;; {sym lookup-key} entries before the main loop.
                            bes      (reduce
                                      (fn [acc mk]
                                        (let* [mkn  (name mk)
                                               mkns (namespace mk)]
                                          (cond
                                            (= mkn "keys")
                                            (reduce
                                             (fn [a sym]
                                               (assoc (dissoc a mk)
                                                      sym
                                                      (let* [ns-part (or mkns (namespace sym))]
                                                        (if ns-part
                                                          (keyword ns-part (name sym))
                                                          (keyword (name sym))))))
                                             acc (mk acc))

                                            (= mkn "strs")
                                            (reduce
                                             (fn [a sym]
                                               (assoc (dissoc a mk) sym (name sym)))
                                             acc (mk acc))

                                            (= mkn "syms")
                                            (reduce
                                             (fn [a sym]
                                               (assoc (dissoc a mk) sym
                                                      (list 'quote (symbol (name sym)))))
                                             acc (mk acc))

                                            :else acc)))
                                      (dissoc b :as :or)
                                      (filter keyword? (keys (dissoc b :as :or))))]
                       ;; Coerce seq values (kwargs-style) to a map.
                       ;; When & is followed by a map pattern, the rest args
                       ;; arrive as a flat seq (:k1 v1 :k2 v2 ...) and must
                       ;; be turned into a map before we can do key lookups.
                       ;; Non-map, non-nil, non-sequential values throw a clear
                       ;; error rather than leaking (apply hash-map ...) internals.
                       (loop [ret     (-> (if (symbol? v)
                                             bvec
                                             (conj bvec graw v))
                                          (conj gmap)
                                          (conj (list 'if (list 'map? source) source
                                                      (list 'if (list 'nil? source) (hash-map)
                                                            (list 'if (list 'sequential? source)
                                                                  (list 'apply 'hash-map source)
                                                                  (list 'throw (list 'ex-info
                                                                                     (list 'str "Cannot destructure " (list 'pr-str source) " as a map")
                                                                                     (hash-map)))))))
                                          ((fn [r]
                                             (if (:as b)
                                               (conj r (:as b) gmap)
                                               r))))
                              entries (seq bes)]
                         (if entries
                           (let* [entry (first entries)
                                  bb    (first entry)
                                  bk    (second entry)
                                  local (if (or (keyword? bb) (symbol? bb))
                                          (symbol (name bb))
                                          bb)
                                  ;; Use (if (contains? ...) (get ...) default) so that
                                  ;; :or defaults are only evaluated when the key is absent.
                                  ;; Intentional divergence from JVM Clojure, which generates
                                  ;; (get m k default-expr) and evaluates the default eagerly.
                                  ;; See docs/core-language.md § "Intentional Divergences".
                                  bv    (if (and defaults (contains? defaults local))
                                          (list 'if (list 'contains? gmap bk)
                                                (list 'get gmap bk)
                                                (get defaults local))
                                          (list 'get gmap bk))]
                             (recur (if (or (keyword? bb) (symbol? bb))
                                      (-> ret (conj local bv))
                                      (pb ret bb bv))
                                    (next entries)))
                           ret))))]
              (cond
                (symbol? b) (-> bvec (conj b) (conj v))
                (vector? b) (pvec bvec b v)
                (map? b)    (pmap bvec b v)
                :else (throw (ex-info (str "Unsupported binding form: " b) {})))))
    process-entry (fn [bvec b] (pb bvec (first b) (second b)))]
    (if (every? symbol? (map first bents))
      bindings
      (reduce process-entry [] bents))))

(defn
  ^{:no-doc true}
  maybe-destructured
  [params body]
  (if (every? symbol? params)
    (cons params body)
    (loop [params params
           new-params []
           lets []]
      (if params
        (if (symbol? (first params))
          (recur (next params) (conj new-params (first params)) lets)
          (let* [gparam (gensym "p__")]
            (recur (next params)
                   (conj new-params gparam)
                   (-> lets (conj (first params)) (conj gparam)))))
        (list (vec new-params)
              (cons 'let (cons (vec lets) body)))))))

#_{:clj-kondo/ignore [:redefined-var]}
(defmacro
  ^{:doc-group "Functions"}
  fn
  "params => positional-params*, or positional-params* & rest-param
  Defines an anonymous function. Supports destructuring, multiple arities, and an optional name for self-recursion."
  [& sigs]
  (let* [name    (if (symbol? (first sigs)) (first sigs) nil)
         sigs    (if name (next sigs) sigs)
         sigs    (if (vector? (first sigs)) (list sigs) sigs)
         psig    (fn* [sig]
                      (let* [params (first sig)
                             body   (rest sig)]
                        (maybe-destructured params body)))
         new-sigs (map psig sigs)]
    (if name
      (list* 'fn* name new-sigs)
      (cons 'fn* new-sigs))))

#_{:clj-kondo/ignore [:redefined-var]}
(defmacro
  ^{:doc-group "Control Flow"}
  let
  "binding => binding-form init-expr
  Evaluates the exprs in a lexical context in which the symbols in the binding-forms are bound to their respective init-exprs values. Supports destructuring."
  [bindings & body]
  (if (not (vector? bindings))
    (throw (ex-info "let requires a vector for its bindings" {}))
    (if (not (even? (count bindings)))
      (throw (ex-info "let requires an even number of forms in binding vector" {}))
      \`(let* ~(destructure bindings) ~@body))))

#_{:clj-kondo/ignore [:redefined-var]}
(defmacro
  ^{:doc-group "Control Flow"}
  loop
  "Evaluates the exprs in a lexical context in which the symbols in the binding-forms are bound to their respective init-exprs values, then evaluates body. recur rebinds the bindings to the supplied values and re-evaluates body."
  [bindings & body]
  (if (not (vector? bindings))
    (throw (ex-info "loop requires a vector for its binding" {}))
    (if (not (even? (count bindings)))
      (throw (ex-info "loop requires an even number of forms in binding vector" {}))
      (let* [db (destructure bindings)]
        (if (= db bindings)
          \`(loop* ~bindings ~@body)
          (let* [vs  (take-nth 2 (drop 1 bindings))
                 bs  (take-nth 2 bindings)
                 gs  (map (fn* [b] (if (symbol? b) b (gensym))) bs)
                 bfs (reduce (fn* [ret bvg]
                                  (let* [b (first bvg)
                                         v (second bvg)
                                         g (nth bvg 2)]
                                    (if (symbol? b)
                                      (conj ret g v)
                                      (conj ret g v b g))))
                             [] (map vector bs vs gs))]
            \`(let ~bfs
               (loop* ~(vec (interleave gs gs))
                      (let ~(vec (interleave bs gs))
                        ~@body)))))))))



(defmacro
  ^{:doc-group "IO"}
  with-out-str
  "Evaluates body in a context in which *out* is bound to a fresh string
  accumulator. Returns the string of all output produced by println, print,
  pr, prn, pprint and newline during the evaluation."
  [& body]
  \`(let [buf# (atom "")]
     (binding [*out* (fn [s#] (swap! buf# str s#))]
       ~@body)
     @buf#))

(defmacro
  ^{:doc-group "IO"}
  with-err-str
  "Like with-out-str but captures *err* output (warn, etc.)."
  [& body]
  \`(let [buf# (atom "")]
     (binding [*err* (fn [s#] (swap! buf# str s#))]
       ~@body)
     @buf#))

(defn
  ^{:doc-group "IO"}
  pprint-str
  "Returns the pretty-printed string representation of x, optionally
  limiting line width to max-width (default 80)."
  ([x] (with-out-str (pprint x)))
  ([x max-width] (with-out-str (pprint x max-width))))

;; ---------------------------------------------------------------------------
;; Protocols and Records
;; ---------------------------------------------------------------------------

(defn- resolve-type-tag
  "Returns the type-tag string for a keyword type specifier.
  Simple keywords map directly to kind strings: :string → \\"string\\".
  Namespaced keywords map to record type tags: :user/Circle → \\"user/Circle\\".
  nil literal is accepted for backward compatibility → \\"nil\\"."
  [type-kw]
  (cond
    (nil? type-kw)     "nil"
    (keyword? type-kw) (if (namespace type-kw)
                         (str (namespace type-kw) "/" (name type-kw))
                         (name type-kw))
    :else (throw (ex-info (str "extend-protocol/extend-type: expected a keyword type tag or nil, got: " type-kw) {}))))

(defn- parse-method-def
  "Parses a single protocol method form (name [& params] doc?) into a
  [name-str arglists doc-str?] triple for make-protocol!."
  [form]
  (let [method-name (first form)
        args        (second form)
        doc         (when (string? (nth form 2 nil)) (nth form 2 nil))]
    [(str method-name) [(mapv str args)] doc]))

(defmacro
  ^{:doc-group "Abstractions"}
  defprotocol
  "Defines a named protocol. Creates a protocol var and one dispatch
  function var per method in the current namespace.

  (defprotocol IShape
    \\"doc\\"
    (area [this] \\"Compute area.\\")
    (perimeter [this] \\"Compute perimeter.\\"))"
  [name & specs]
  (let [doc        (when (string? (first specs)) (first specs))
        methods    (if doc (rest specs) specs)
        method-defs (mapv parse-method-def methods)]
    \`(make-protocol! ~(str name) ~doc ~method-defs)))

(defn- parse-impl-block
  "Given a flat sequence of (method-name [args] body...) forms, returns a
  code form (hash-map ...) that evaluates to method-name-string → fn."
  [method-forms]
  (let [pairs (mapcat (fn [form]
                        (let [method-name (first form)
                              params      (second form)
                              body        (rest (rest form))]
                          [(str method-name) \`(fn ~params ~@body)]))
                      method-forms)]
    \`(hash-map ~@pairs)))

(defn- group-by-type
  "Partitions a flat impl body into [[delimiter [method ...]] ...].
  Used by extend-protocol (keyword type tags: :string, :user/Circle),
  extend-type (protocol symbols: IShape, IValidator), and
  defrecord (protocol symbols inline).
  Keywords, symbols, and the nil literal are all recognised as block delimiters."
  [specs]
  (let [no-type :__no-type__]
    (loop [remaining specs
           current-type no-type
           current-methods []
           result []]
      (if (empty? remaining)
        (if (not= current-type no-type)
          (conj result [current-type current-methods])
          result)
        (let [form (first remaining)]
          (if (or (keyword? form) (symbol? form) (nil? form))
            ;; New block (keyword type tag, protocol symbol, or nil)
            (recur (rest remaining)
                   form
                   []
                   (if (not= current-type no-type)
                     (conj result [current-type current-methods])
                     result))
            ;; Method form — add to current block
            (recur (rest remaining)
                   current-type
                   (conj current-methods form)
                   result)))))))

(defmacro
  ^{:doc-group "Abstractions"}
  extend-protocol
  "Extends a protocol to one or more types.

  (extend-protocol IShape
    nil
    (area [_] 0)
    String
    (area [s] (count s)))"
  [proto-sym & specs]
  (let [groups (group-by-type specs)]
    \`(do
       ~@(map (fn [[type-sym method-forms]]
                (let [type-tag  (resolve-type-tag type-sym)
                      impl-map  (parse-impl-block method-forms)]
                  \`(extend-protocol! ~proto-sym ~type-tag ~impl-map)))
              groups))))

(defmacro
  ^{:doc-group "Abstractions"}
  extend-type
  "Extends a type to implement one or more protocols.

  (extend-type Circle
    IShape
    (area [this] ...)
    ISerializable
    (to-json [this] ...))"
  [type-sym & specs]
  (let [type-tag (resolve-type-tag type-sym)
        groups   (group-by-type specs)]
    \`(do
       ~@(map (fn [[proto-sym method-forms]]
                (let [impl-map (parse-impl-block method-forms)]
                  \`(extend-protocol! ~proto-sym ~type-tag ~impl-map)))
              groups))))

(defn- bind-fields
  "Wraps a method body in a let that binds each field name to (:field this).
  (bind-fields '[radius] 'this '[(* radius radius)])
   => (let [radius (:radius this)] (* radius radius))"
  [fields this-sym body]
  (let [bindings (vec (mapcat (fn [f] [f \`(~(keyword (name f)) ~this-sym)]) fields))]
    \`(let ~bindings ~@body)))

(defmacro
  ^{:doc-group "Abstractions"}
  defrecord
  "Defines a record type: a named, typed persistent map.
  Creates ->Name (positional) and map->Name (map-based) constructors.
  Optionally implements protocols inline.

  (defrecord Circle [radius]
    IShape
    (area [this] (* js/Math.PI radius radius)))"
  [type-name fields & specs]
  (let [ns-str           (str (ns-name *ns*))
        type-str         (str type-name)
        constructor      (symbol (str "->" type-name))
        map-constructor  (symbol (str "map->" type-name))
        field-keys       (mapv (fn [f] (keyword (name f))) fields)
        field-map-pairs  (vec (mapcat (fn [f] [(keyword (name f)) f]) fields))
        groups           (when (seq specs) (group-by-type specs))
        type-tag         (str ns-str "/" type-str)
        extend-calls     (map (fn [[proto-sym method-forms]]
                                (let [impl-map
                                      (let [pairs (mapcat (fn [form]
                                                            (let [mname  (first form)
                                                                  params (second form)
                                                                  this   (first params)
                                                                  rest-p (vec (rest params))
                                                                  body   (rest (rest form))
                                                                  bound  (bind-fields fields this body)]
                                                              [(str mname)
                                                               \`(fn ~(vec (cons this rest-p)) ~bound)]))
                                                          method-forms)]
                                        \`(hash-map ~@pairs))]
                                  \`(extend-protocol! ~proto-sym ~type-tag ~impl-map)))
                              groups)]
    \`(do
       (defn ~constructor ~fields
         (make-record! ~type-str ~ns-str ~field-keys (hash-map ~@field-map-pairs)))
       (defn ~map-constructor [m#]
         (make-record! ~type-str ~ns-str ~field-keys m#))
       ~@extend-calls)))

; reify — deferred to Phase B

;; ---------------------------------------------------------------------------
;; describe — introspection for any value
;; ---------------------------------------------------------------------------

;; ─── Keyword Hierarchy ───────────────────────────────────────────────────────

(defn
  ^{:doc-group "Abstractions"}
  make-hierarchy
  "Returns a new, empty hierarchy."
  []
  {:parents {} :ancestors {} :descendants {}})

(def ^{:doc-group "Abstractions" :dynamic true}
  *hierarchy*
  (make-hierarchy))

(defn
  ^{:doc-group "Abstractions"}
  parents
  "Returns the immediate parents of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no parents."
  ([tag]   (hierarchy-parents-global tag))
  ([h tag] (get (:parents h) tag)))

(defn
  ^{:doc-group "Abstractions"}
  ancestors
  "Returns the set of all ancestors of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no ancestors."
  ([tag]   (hierarchy-ancestors-global tag))
  ([h tag] (get (:ancestors h) tag)))

(defn
  ^{:doc-group "Abstractions"}
  descendants
  "Returns the set of all descendants of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no descendants."
  ([tag]   (hierarchy-descendants-global tag))
  ([h tag] (get (:descendants h) tag)))

(defn
  ^{:doc-group "Abstractions"}
  isa?
  "Returns true if child is either identical to parent, or child derives from
  parent in the given hierarchy (default: *hierarchy*)."
  ([child parent]   (hierarchy-isa?-global child parent))
  ([h child parent] (hierarchy-isa?* h child parent)))

(defn
  ^{:doc-group "Abstractions"}
  derive
  "Establishes a parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects."
  ([child parent]
   (hierarchy-derive-global! child parent))
  ([h child parent]
   (hierarchy-derive* h child parent)))

(defn
  ^{:doc-group "Abstractions"}
  underive
  "Removes the parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects."
  ([child parent]
   (hierarchy-underive-global! child parent))
  ([h child parent]
   (hierarchy-underive* h child parent)))

;; Maximum number of vars shown in (describe namespace).
;; Bind to nil for unlimited output: (binding [*describe-limit* nil] (describe ...))
(def ^:dynamic *describe-limit* 50)

(defn
  ^{:doc-group "Dev"}
  describe
  "Returns a plain map describing any cljam value.

  Works on protocols, records, functions, namespaces, multimethods,
  vars, and all primitive types. Output is always a plain Clojure map —
  composable with get, get-in, filter, and any other map operation.

  For namespaces, the number of vars shown is capped by *describe-limit*
  (default 50). Bind *describe-limit* to nil for unlimited output.

  Examples:
    (describe (->Circle 5))        ;; record
    (describe IShape)              ;; protocol
    (describe area)                ;; protocol dispatch fn
    (describe println)             ;; native fn
    (describe (find-ns 'user))     ;; namespace
    (describe #'my-fn)             ;; var"
  ([x] (describe* x *describe-limit*))
  ([x limit] (describe* x limit)))

;; ── Doc-group annotations ────────────────────────────────────────────────────
;; Add ^{:doc-group "Name"} to vars to create named sub-sections within each
;; ## kind group in the API reference. Ungrouped vars fall to ### General.
;; Expand these annotations in your own time — a few starters are provided here.
`,bm=`(ns clojure.edn)

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(def edn-read-string*)
(def edn-pr-str*)

(defn read-string
  "Reads one EDN value from string s and returns it.

  Accepts an optional opts map as the first argument:
    :readers - map from tag symbol to handler function; merged with *data-readers*
    :default - fn of [tag-name value] called for tags with no registered handler

  Uses *data-readers* (from clojure.core) for globally registered tag handlers.
  Built-in tags: #inst (returns JS Date), #uuid (returns string passthrough).

  Rejects Clojure-specific syntax that is not part of the EDN spec:
  quote ('), syntax-quote (\`), unquote (~), #(...), @deref, ^metadata, #'var,
  #\\"regex\\", and #:ns{...} namespaced maps."
  ([s]
   (edn-read-string* s))
  ([opts s]
   (edn-read-string* opts s)))

(defn pr-str
  "Returns a string representation of val in EDN format.
  Equivalent to clojure.core/pr-str for all standard EDN-compatible types."
  [val]
  (edn-pr-str* val))
`,wm=`(ns clojure.math)

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(declare floor*)
(declare ceil*)
(declare round*)
(declare rint*)
(declare pow*)
(declare exp*)
(declare log*)
(declare log10*)
(declare cbrt*)
(declare hypot*)
(declare sin*)
(declare cos*)
(declare tan*)
(declare asin*)
(declare acos*)
(declare atan*)
(declare atan2*)
(declare sinh*)
(declare cosh*)
(declare tanh*)
(declare signum*)
(declare floor-div*)
(declare floor-mod*)
(declare to-radians*)
(declare to-degrees*)

;; ---------------------------------------------------------------------------
;; Constants
;; ---------------------------------------------------------------------------

(def PI
  "The ratio of the circumference of a circle to its diameter."
  3.141592653589793)

(def E
  "The base of the natural logarithms."
  2.718281828459045)

(def TAU
  "The ratio of the circumference of a circle to its radius (2 * PI)."
  6.283185307179586)

;; ---------------------------------------------------------------------------
;; Rounding
;; ---------------------------------------------------------------------------

(defn floor
  "Returns the largest integer value ≤ x."
  [x]
  (floor* x))

(defn ceil
  "Returns the smallest integer value ≥ x."
  [x]
  (ceil* x))

(defn round
  "Returns the closest integer to x, with ties rounding up (half-up)."
  [x]
  (round* x))

(defn rint
  "Returns the integer closest to x, with ties rounding to the nearest even
  integer (IEEE 754 round-half-to-even / banker's rounding)."
  [x]
  (rint* x))

;; ---------------------------------------------------------------------------
;; Exponents and logarithms
;; ---------------------------------------------------------------------------

(defn pow
  "Returns x raised to the power of y."
  [x y]
  (pow* x y))

(defn exp
  "Returns Euler's number e raised to the power of x."
  [x]
  (exp* x))

(defn log
  "Returns the natural logarithm (base e) of x."
  [x]
  (log* x))

(defn log10
  "Returns the base-10 logarithm of x."
  [x]
  (log10* x))

(defn sqrt
  "Returns the positive square root of x."
  [x]
  (clojure.core/sqrt x))

(defn cbrt
  "Returns the cube root of x."
  [x]
  (cbrt* x))

(defn hypot
  "Returns sqrt(x² + y²), avoiding intermediate overflow or underflow."
  [x y]
  (hypot* x y))

;; ---------------------------------------------------------------------------
;; Trigonometry
;; ---------------------------------------------------------------------------

(defn sin
  "Returns the trigonometric sine of angle x in radians."
  [x]
  (sin* x))

(defn cos
  "Returns the trigonometric cosine of angle x in radians."
  [x]
  (cos* x))

(defn tan
  "Returns the trigonometric tangent of angle x in radians."
  [x]
  (tan* x))

(defn asin
  "Returns the arc sine of x, in the range [-π/2, π/2]."
  [x]
  (asin* x))

(defn acos
  "Returns the arc cosine of x, in the range [0, π]."
  [x]
  (acos* x))

(defn atan
  "Returns the arc tangent of x, in the range (-π/2, π/2)."
  [x]
  (atan* x))

(defn atan2
  "Returns the angle θ from the conversion of rectangular coordinates (x, y)
  to polar (r, θ). Arguments are y first, then x."
  [y x]
  (atan2* y x))

;; ---------------------------------------------------------------------------
;; Hyperbolic
;; ---------------------------------------------------------------------------

(defn sinh
  "Returns the hyperbolic sine of x."
  [x]
  (sinh* x))

(defn cosh
  "Returns the hyperbolic cosine of x."
  [x]
  (cosh* x))

(defn tanh
  "Returns the hyperbolic tangent of x."
  [x]
  (tanh* x))

;; ---------------------------------------------------------------------------
;; Miscellaneous
;; ---------------------------------------------------------------------------

(defn abs
  "Returns the absolute value of x."
  [x]
  (clojure.core/abs x))

(defn signum
  "Returns -1.0, 0.0, or 1.0 indicating the sign of x."
  [x]
  (signum* x))

(defn floor-div
  "Returns the largest integer ≤ (/ x y). Unlike quot, floor-div rounds toward
  negative infinity rather than zero."
  [x y]
  (floor-div* x y))

(defn floor-mod
  "Returns x - (floor-div x y) * y. Unlike rem, the result has the same sign
  as y."
  [x y]
  (floor-mod* x y))

(defn to-radians
  "Converts an angle measured in degrees to an approximately equivalent angle
  measured in radians."
  [deg]
  (to-radians* deg))

(defn to-degrees
  "Converts an angle measured in radians to an approximately equivalent angle
  measured in degrees."
  [rad]
  (to-degrees* rad))
`,km=`(ns clojure.set
  "Set operations. Provides functions for creating, manipulating, and querying sets.")

(defn union
  "Return a set that is the union of the input sets."
  ([] #{})
  ([s] s)
  ([s1 s2]
   (reduce conj s1 s2))
  ([s1 s2 & sets]
   (reduce union (union s1 s2) sets)))

(defn intersection
  "Return a set that is the intersection of the input sets."
  ([s] s)
  ([s1 s2]
   (reduce (fn [acc x]
             (if (contains? s2 x)
               (conj acc x)
               acc))
           #{}
           s1))
  ([s1 s2 & sets]
   (reduce intersection (intersection s1 s2) sets)))

(defn difference
  "Return a set that is the first set without elements of the remaining sets."
  ([s] s)
  ([s1 s2]
   (reduce (fn [acc x]
             (if (contains? s2 x)
               acc
               (conj acc x)))
           #{}
           s1))
  ([s1 s2 & sets]
   (reduce difference (difference s1 s2) sets)))

(defn select
  "Returns a set of the elements for which pred is true."
  [pred s]
  (reduce (fn [acc x]
            (if (pred x)
              (conj acc x)
              acc))
          #{}
          s))

(defn project
  "Returns a rel of the elements of xrel with only the keys in ks."
  [xrel ks]
  (reduce (fn [acc m]
            (conj acc (select-keys m ks)))
          #{}
          xrel))

(defn rename-keys
  "Returns the map with the keys in kmap renamed to the vals in kmap."
  [m kmap]
  (reduce (fn [acc [old-k new-k]]
            (if (contains? acc old-k)
              (-> acc
                  (assoc new-k (get acc old-k))
                  (dissoc old-k))
              acc))
          m
          kmap))

(defn rename
  "Returns a rel of the maps in xrel with the keys in kmap renamed to the vals in kmap."
  [xrel kmap]
  (reduce (fn [acc m]
            (conj acc (rename-keys m kmap)))
          #{}
          xrel))

(defn index
  "Returns a map of the distinct values of ks in the xrel mapped to a
  set of the maps in xrel with the corresponding values of ks."
  [xrel ks]
  (reduce (fn [acc m]
            (let [k (select-keys m ks)]
              (assoc acc k (conj (get acc k #{}) m))))
          {}
          xrel))

(defn map-invert
  "Returns the map with the vals mapped to the keys."
  [m]
  (reduce (fn [acc [k v]]
            (assoc acc v k))
          {}
          m))

(defn join
  "When passed 2 rels, returns the relation corresponding to the natural
  join. When passed an additional keymap, joins on the corresponding keys."
  ([xrel yrel]
   (if (and (seq xrel) (seq yrel))
     (let [ks (intersection (set (keys (first xrel)))
                            (set (keys (first yrel))))]
       (if (empty? ks)
         (reduce (fn [acc mx]
                   (reduce (fn [acc2 my]
                             (conj acc2 (merge mx my)))
                           acc
                           yrel))
                 #{}
                 xrel)
         (join xrel yrel (zipmap ks ks))))
     #{}))
  ([xrel yrel km]
   (let [idx (index yrel (vals km))]
     (reduce (fn [acc mx]
               (let [found (get idx (rename-keys (select-keys mx (keys km)) km))]
                 (if found
                   (reduce (fn [acc2 my]
                             (conj acc2 (merge my mx)))
                           acc
                           found)
                   acc)))
             #{}
             xrel))))

(defn
  ^{:doc-group "Predicates"}
  subset?
  "Is set1 a subset of set2?"
  [s1 s2]
  (every? #(contains? s2 %) s1))

(defn
  ^{:doc-group "Predicates"}
  superset?
  "Is set1 a superset of set2?"
  [s1 s2]
  (every? #(contains? s1 %) s2))
`,xm=`(ns clojure.string
  "String operations. Provides functions for joining, splitting, trimming, and manipulating strings.")

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(declare str-split*)
(declare str-upper-case*)
(declare str-lower-case*)
(declare str-trim*)
(declare str-triml*)
(declare str-trimr*)
(declare str-reverse*)
(declare str-starts-with*)
(declare str-ends-with*)
(declare str-includes*)
(declare str-index-of*)
(declare str-last-index-of*)
(declare str-replace*)
(declare str-replace-first*)

;; ---------------------------------------------------------------------------
;; Joining / splitting
;; ---------------------------------------------------------------------------

(defn
  join
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
`,$m=`(ns clojure.test
  "Testing facilities. Provides macros for defining and running tests, as well as assertions and reporting. 
   can be overridden for custom integration.")

;; ---------------------------------------------------------------------------
;; Dynamic vars
;; ---------------------------------------------------------------------------

;; A vector of strings describing the current testing context stack.
;; Pushed by the \`testing\` macro. Used in failure messages.
(def ^:dynamic *testing-contexts* [])

;; The output stream for test reporting. nil means use *out*.
(def ^:dynamic *test-out* nil)

;; An atom holding {:test 0 :pass 0 :fail 0 :error 0}, or nil when
;; not inside a run-tests call.
(def ^:dynamic *report-counters* nil)

;; A vector of test names currently being executed.
(def ^:dynamic *testing-vars* [])

;; ---------------------------------------------------------------------------
;; Test registry — maps ns-name-string → [{:name "..." :fn fn}]
;; Populated by deftest at load time.
;; ---------------------------------------------------------------------------

(def test-registry (atom {}))

;; ---------------------------------------------------------------------------
;; Fixture registry — maps [ns-name-string :each/:once] → [fixture-fn ...]
;; Populated by use-fixtures at namespace load time.
;; ---------------------------------------------------------------------------

(def fixture-registry (atom {}))

;; Identity fixture — baseline for reduce in join-fixtures.
(defn default-fixture [f] (f))

(defn compose-fixtures
  "Returns a single fixture that wraps f2 inside f1.
  Setup order: f1 setup first, then f2 setup.
  Teardown order: f2 teardown first, then f1 teardown.
  This is the standard middleware-onion composition."
  [f1 f2]
  (fn [g] (f1 (fn [] (f2 g)))))

(defn join-fixtures
  "Compose a sequence of fixture functions into a single fixture.
  Empty sequence returns default-fixture (calls f directly).
  Fixtures run left-to-right for setup, right-to-left for teardown."
  [fixtures]
  (reduce compose-fixtures default-fixture fixtures))

(defn use-fixtures
  "Register fixture functions for the current namespace.
  type must be :each (runs around each individual test) or
  :once (runs around the entire namespace test suite).
  Multiple fixture fns are composed in order."
  [type & fixture-fns]
  (swap! fixture-registry assoc [(str (ns-name *ns*)) type] (vec fixture-fns))
  nil)

;; ---------------------------------------------------------------------------
;; report multimethod — dispatch on :type key of the result map.
;; Override any method to customise test output (e.g. for vitest integration).
;; ---------------------------------------------------------------------------

;; Dispatches on the :type of a test result map.
;; Built-in types: :pass, :fail, :error, :begin-test-var, :end-test-var,
;; :begin-test-ns, :end-test-ns, :summary.
(defmulti report :type)

(defmethod report :default [_] nil)

(defmethod report :pass [_]
  (when *report-counters*
    (swap! *report-counters* update :pass (fnil inc 0))))

(defmethod report :fail [m]
  (when *report-counters*
    (swap! *report-counters* update :fail (fnil inc 0)))
  (println "\\nFAIL in" (first *testing-vars*))
  (when (seq *testing-contexts*)
    (println (apply str (interpose " " *testing-contexts*))))
  (when (:message m) (println (:message m)))
  (println "expected:" (pr-str (:expected m)))
  (println "  actual:" (pr-str (:actual m))))

(defmethod report :error [m]
  (when *report-counters*
    (swap! *report-counters* update :error (fnil inc 0)))
  (println "\\nERROR in" (first *testing-vars*))
  (when (seq *testing-contexts*)
    (println (apply str (interpose " " *testing-contexts*))))
  (when (:message m) (println (:message m)))
  (println "expected:" (pr-str (:expected m)))
  (println "  actual:" (pr-str (:actual m))))

(defmethod report :begin-test-var [_] nil)
(defmethod report :end-test-var   [_] nil)

(defmethod report :begin-test-ns [m]
  (println "\\nTesting" (str (ns-name (:ns m)))))

(defmethod report :end-test-ns [_] nil)

(defmethod report :summary [m]
  (println "\\nRan" (:test m) "tests containing"
           (+ (:pass m) (:fail m) (:error m)) "assertions.")
  (println (:fail m) "failures," (:error m) "errors."))

;; ---------------------------------------------------------------------------
;; thrown? / thrown-with-msg? — exception-testing macros
;;
;; These are standalone macros that evaluate to a truthy value (the caught
;; exception) on success, or a falsy value on failure. Designed to compose
;; directly with \`is\` — no special handling in \`is\` required.
;;
;; exc-type is a keyword matched against the caught value exactly as cljam's
;; own try/catch does: :default catches anything, :error/runtime catches
;; runtime errors, etc.
;;
;; (is (thrown? :error/runtime (/ 1 0)))           → pass
;; (is (thrown? :default (throw "boom")))           → pass
;; (is (thrown-with-msg? :default #"boom" ...))    → pass if message matches
;; ---------------------------------------------------------------------------

(defmacro thrown?
  "Returns the caught exception if body throws an exception matching exc-type,
  false if no exception is thrown. Wrong-type exceptions propagate unchanged.
  Use :default to match any thrown value."
  [exc-type & body]
  \`(try
     ~@body
     false
     (catch ~exc-type e#
       e#)))

(defmacro thrown-with-msg?
  "Returns the caught exception if body throws exc-type AND the exception
  message matches the regex re. Returns false if no throw, nil if message
  does not match. Wrong-type exceptions propagate unchanged.
  Message is extracted via (:message e) for runtime error maps, (str e) otherwise."
  [exc-type re & body]
  \`(try
     ~@body
     false
     (catch ~exc-type e#
       (let [err-msg# (or (:message e#) (str e#))]
         (when (re-find ~re (str err-msg#))
           e#)))))

;; ---------------------------------------------------------------------------
;; is — core assertion macro
;;
;; (is form)        — assert form is truthy
;; (is form msg)    — same, with a failure message
;;
;; Reports :pass when form is truthy, :fail when falsy, :error on exception.
;; thrown? and thrown-with-msg? compose naturally — they return truthy/falsy.
;; ---------------------------------------------------------------------------

(defmacro is
  ([form] \`(is ~form nil))
  ([form msg]
   \`(try
      (let [result# ~form]
        (if result#
          (report {:type :pass :message ~msg :expected '~form :actual result#})
          (report {:type :fail :message ~msg :expected '~form :actual result#})))
      (catch :default e#
        (report {:type :error :message ~msg :expected '~form :actual e#})))))

;; ---------------------------------------------------------------------------
;; are — parameterised assertion helper
;;
;; (are [x y] (= x y)
;;   1 1
;;   2 2)
;;
;; Expands to one \`is\` call per arg tuple, with x and y bound via let.
;; ---------------------------------------------------------------------------

(defmacro are [argv expr & args]
  (when (seq args)
    (let [tuples (partition (count argv) args)]
      \`(do
         ~@(map (fn [vals]
                  \`(is (let [~@(interleave argv vals)] ~expr)))
                tuples)))))

;; ---------------------------------------------------------------------------
;; deftest — define a test function and register it in the namespace registry
;;
;; (deftest my-test
;;   (is (= 1 1)))
;;
;; Creates a 0-arity function var and registers it so run-tests can find it.
;; ---------------------------------------------------------------------------

(defmacro deftest [name & body]
  \`(do
     (def ~(with-meta name {:test true})
       (fn ~name [] ~@body))
     (swap! test-registry
            update (str (ns-name *ns*)) (fnil conj [])
            {:name ~(str name) :fn ~name})
     ~name))

;; ---------------------------------------------------------------------------
;; testing — label a group of assertions with a context string
;;
;; (testing "addition"
;;   (is (= 2 (+ 1 1))))
;;
;; Expands INLINE to binding (the JVM clojure.test shape) — no thunk. The
;; body stays lexical content of its surroundings, so inside (async ...) a
;; @deref in a testing body awaits (async is a lexical boundary that stops
;; at closure bodies; a thunk would put the body on the wrong side of it).
;; Syntax-quote qualifies *testing-contexts*, so it works from any namespace.
;; ---------------------------------------------------------------------------

(defmacro testing [string & body]
  \`(binding [*testing-contexts* (conj *testing-contexts* ~string)]
     ~@body))

;; ---------------------------------------------------------------------------
;; run-tests — discover and execute tests in one or more namespaces
;;
;; (run-tests)               — run tests in *ns*
;; (run-tests 'my.ns)        — run tests in my.ns
;; (run-tests 'a.ns 'b.ns)   — run tests in both
;;
;; Returns a map: {:test N :pass N :fail N :error N}
;; ---------------------------------------------------------------------------

(defn run-tests
  ([] (run-tests *ns*))
  ([& namespaces]
   (let [counters (atom {:test 0 :pass 0 :fail 0 :error 0})]
     (binding [*report-counters* counters]
       (doseq [ns-ref namespaces]
         (let [ns-str       (str (ns-name ns-ref))
               tests        (get @test-registry ns-str [])
               once-fixture (join-fixtures (get @fixture-registry [ns-str :once] []))
               each-fixture (join-fixtures (get @fixture-registry [ns-str :each] []))]
           (report {:type :begin-test-ns :ns ns-ref})
           (once-fixture
             (fn []
               (doseq [{test-name :name test-fn :fn} tests]
                 (binding [*testing-vars* [test-name]]
                   (report {:type :begin-test-var :var test-name})
                   (swap! *report-counters* update :test (fnil inc 0))
                   (try
                     (each-fixture test-fn)
                     (catch :default e
                       (report {:type :error
                                :message "Uncaught error in test"
                                :expected nil
                                :actual e})))
                   (report {:type :end-test-var :var test-name})))))
           (report {:type :end-test-ns :ns ns-ref})))
       (let [summary @counters]
         (report (assoc summary :type :summary))
         summary)))))

;; ---------------------------------------------------------------------------
;; successful? — summary predicate
;;
;; (successful? (run-tests 'my.ns)) → true / false
;; ---------------------------------------------------------------------------

(defn successful?
  "Returns true if the test summary has zero failures and zero errors."
  [summary]
  (and (zero? (get summary :fail 0))
       (zero? (get summary :error 0))))

;; ---------------------------------------------------------------------------
;; run-test — run a single deftest by name (REPL-friendly)
;;
;; (run-test my-test) — calls my-test with *report-counters* and *testing-vars*
;;                       properly bound; prints summary; returns summary map.
;; ---------------------------------------------------------------------------

(defmacro run-test
  "Runs a single deftest. Returns a summary map.
  Useful for targeted test runs at the REPL without running the whole suite."
  [test-symbol]
  \`(let [test-name# ~(str test-symbol)
         counters#  (atom {:test 0 :pass 0 :fail 0 :error 0})]
     (binding [*report-counters* counters#
               *testing-vars*    [test-name#]]
       (report {:type :begin-test-var :var test-name#})
       (swap! *report-counters* update :test (fnil inc 0))
       (try
         (~test-symbol)
         (catch :default e#
           (report {:type :error
                    :message "Uncaught error in test"
                    :expected nil
                    :actual   e#})))
       (report {:type :end-test-var :var test-name#}))
     (let [summary# @counters#]
       (report (assoc summary# :type :summary))
       summary#)))
`,Mm=`(ns clojure.walk
  "Tree-walking utilities. Provides functions for traversing and transforming data structures.")

(defn walk
  "Traverses form, an arbitrary data structure. inner and outer are
  functions. Applies inner to each element of form, building up a
  data structure of the same type, then applies outer to the result."
  [inner outer form]
  (cond
    (list? form) (outer (apply list (map inner form)))
    (vector? form) (outer (into [] (map inner) form))
    (map? form) (outer (into {} (map (fn [e] [(inner (first e)) (inner (second e))]) form)))
    (set? form) (outer (into #{} (map inner) form))
    :else (outer form)))

(defn postwalk
  "Performs a depth-first, post-order traversal of form. Calls f on
  each sub-form, uses f's return value in place of the original."
  [f form]
  (walk (fn [x] (postwalk f x)) f form))

(defn prewalk
  "Like postwalk, but does pre-order traversal."
  [f form]
  (walk (fn [x] (prewalk f x)) identity (f form)))

(defn postwalk-replace
  "Recursively transforms form by replacing keys in smap with their
  values. Like clojure/replace but works on any data structure."
  [smap form]
  (postwalk (fn [x] (if (contains? smap x) (get smap x) x)) form))

(defn prewalk-replace
  "Recursively transforms form by replacing keys in smap with their
  values. Like clojure/replace but works on any data structure."
  [smap form]
  (prewalk (fn [x] (if (contains? smap x) (get smap x) x)) form))

(defn keywordize-keys
  "Recursively transforms all map keys from strings to keywords."
  [m]
  (postwalk
   (fn [x]
     (if (map? x)
       (into {} (map (fn [e]
                       (let [k (first e)]
                         (if (string? k)
                           [(keyword k) (second e)]
                           e)))
                     x))
       x))
   m))

(defn stringify-keys
  "Recursively transforms all map keys from keywords to strings."
  [m]
  (postwalk
   (fn [x]
     (if (map? x)
       (into {}
             (map
              (fn [e]
                (let [k (first e)]
                  (if (keyword? k)
                    [(name k) (second e)]
                    e)))
              x))
       x))
   m))
`,ka={"cljam.handbook":()=>gm,"cljam.vm":()=>vm,"clojure.core":()=>ym,"clojure.edn":()=>bm,"clojure.math":()=>wm,"clojure.set":()=>km,"clojure.string":()=>xm,"clojure.test":()=>$m,"clojure.walk":()=>Mm},Wn={def:"def",do:"do","fn*":"fn*",if:"if","let*":"let*","loop*":"loop*",recur:"recur",quote:"quote",try:"try",var:"var",ns:"ns",defmacro:"defmacro",binding:"binding","set!":"set!","letfn*":"letfn*",async:"async",".":".","js/new":"js/new"},A={boolean:"boolean",character:"character",function:"function",nativeFunction:"native-function",keyword:"keyword",list:"list",macro:"macro",map:"map",nil:"nil",number:"number",regex:"regex",set:"set",string:"string",symbol:"symbol",vector:"vector",atom:"atom",delay:"delay",multiMethod:"multi-method",volatile:"volatile",var:"var",cons:"cons",lazySeq:"lazy-seq",indexedSeq:"indexed-seq",reduced:"reduced",pending:"pending",namespace:"namespace",jsValue:"js-value",protocol:"protocol",record:"record"},Sm=Object.fromEntries(Object.entries(A).map(([e,t])=>[t,e])),L={LParen:"LParen",RParen:"RParen",LBracket:"LBracket",RBracket:"RBracket",LBrace:"LBrace",RBrace:"RBrace",String:"String",Number:"Number",Keyword:"Keyword",Quote:"Quote",Quasiquote:"Quasiquote",Unquote:"Unquote",UnquoteSplicing:"UnquoteSplicing",Comment:"Comment",Whitespace:"Whitespace",Symbol:"Symbol",AnonFnStart:"AnonFnStart",Deref:"Deref",Regex:"Regex",VarQuote:"VarQuote",Meta:"Meta",SetStart:"SetStart",NsMapPrefix:"NsMapPrefix",Discard:"Discard",ReaderTag:"ReaderTag",Character:"Character"},Ze={Quote:"quote",Quasiquote:"quasiquote",Unquote:"unquote",UnquoteSplicing:"unquote-splicing",LParen:"(",RParen:")",LBracket:"[",RBracket:"]",LBrace:"{",RBrace:"}"},So=new WeakMap;let tr=1;function Be(e){let t=So.get(e);return t===void 0&&(t=tr,tr=tr>=1073741824?1:tr+1,So.set(e,t)),t}const sn=5,Vt=31,qm=16,Fm=8,ss={kind:"empty"},ze=Symbol("hamt/not-found");function Im(e){return e-=e>>1&1431655765,e=(e&858993459)+(e>>2&858993459),e=e+(e>>4)&252645135,e+=e>>8,e+=e>>16,e&127}function Es(e,t){return Im(e&t-1)}function bn(e,t,n){const r=e.slice();return r[t]=n,r}function Cm(e,t,n){const r=e.length,s=new Array(r+1);let o=0,i=0;for(;o<t;)s[i++]=e[o++];for(s[i++]=n;o<r;)s[i++]=e[o++];return s}function qo(e,t){const n=e.length,r=new Array(n-1);let s=0,o=0;for(;s<t;)r[o++]=e[s++];for(s++;s<n;)r[o++]=e[s++];return r}function os(e,t,n,r,s){const o=t>>>e&Vt,i=r>>>e&Vt;if(o===i){const d=os(e+sn,t,n,r,s);return{kind:"bitmap",bitmap:1<<o,children:[d]}}const u=1<<o,l=1<<i;return{kind:"bitmap",bitmap:u|l,children:o<i?[n,s]:[s,n]}}function Rm(e,t,n,r){const s=new Array(32).fill(null);let o=n,i=0;for(let u=0;o!==0;u++)o&1&&(s[u]=r[i++]),o>>>=1;return s[e]=t,{kind:"array",count:i+1,children:s}}function jm(e,t,n){const r=new Array(e-1);let s=0,o=0;for(let i=0;i<32;i++)if(i!==t){const u=n[i];u!==null&&(r[s++]=u,o|=1<<i)}return{kind:"bitmap",bitmap:o,children:r}}function as(e,t,n,r,s,o){switch(t.kind){case"empty":return{kind:"leaf",hash:r,key:s,value:o};case"leaf":return e.equal(s,t.key)?o===t.value?t:{kind:"leaf",hash:r,key:s,value:o}:r===t.hash?{kind:"collision",hash:r,entries:[[t.key,t.value],[s,o]]}:os(n,t.hash,t,r,{kind:"leaf",hash:r,key:s,value:o});case"collision":{if(r===t.hash){for(let i=0;i<t.entries.length;i++)if(e.equal(s,t.entries[i][0]))return t.entries[i][1]===o?t:{kind:"collision",hash:r,entries:bn(t.entries,i,[s,o])};return{kind:"collision",hash:r,entries:[...t.entries,[s,o]]}}return os(n,t.hash,t,r,{kind:"leaf",hash:r,key:s,value:o})}case"bitmap":{const i=r>>>n&Vt,u=1<<i,l=Es(t.bitmap,u);if(!(t.bitmap&u)){const h={kind:"leaf",hash:r,key:s,value:o};return t.children.length>=qm?Rm(i,h,t.bitmap,t.children):{kind:"bitmap",bitmap:t.bitmap|u,children:Cm(t.children,l,h)}}const d=t.children[l],m=as(e,d,n+sn,r,s,o);return m===d?t:{kind:"bitmap",bitmap:t.bitmap,children:bn(t.children,l,m)}}case"array":{const i=r>>>n&Vt,u=t.children[i],l=u?as(e,u,n+sn,r,s,o):{kind:"leaf",hash:r,key:s,value:o};return l===u?t:{kind:"array",count:u?t.count:t.count+1,children:bn(t.children,i,l)}}}}function is(e,t,n,r,s){switch(t.kind){case"empty":return t;case"leaf":return e.equal(s,t.key)?ss:t;case"collision":{if(r!==t.hash)return t;const o=t.entries.findIndex(([i])=>e.equal(s,i));if(o===-1)return t;if(t.entries.length===2){const[i,u]=t.entries[o===0?1:0];return{kind:"leaf",hash:t.hash,key:i,value:u}}return{kind:"collision",hash:t.hash,entries:qo(t.entries,o)}}case"bitmap":{const i=1<<(r>>>n&Vt);if(!(t.bitmap&i))return t;const u=Es(t.bitmap,i),l=t.children[u],d=is(e,l,n+sn,r,s);if(d===l)return t;if(d.kind==="empty"){const m=t.bitmap&~i;if(m===0)return ss;if(t.children.length===2){const h=t.children[u^1];if(h.kind==="leaf"||h.kind==="collision")return h}return{kind:"bitmap",bitmap:m,children:qo(t.children,u)}}return{kind:"bitmap",bitmap:t.bitmap,children:bn(t.children,u,d)}}case"array":{const o=r>>>n&Vt,i=t.children[o];if(i===null)return t;const u=is(e,i,n+sn,r,s);return u===i?t:u.kind==="empty"?t.count-1<Fm?jm(t.count,o,t.children):{kind:"array",count:t.count-1,children:bn(t.children,o,null)}:{kind:"array",count:t.count,children:bn(t.children,o,u)}}}}function Am(e,t,n,r){let s=t,o=0;for(;;)switch(s.kind){case"empty":return ze;case"leaf":return e.equal(r,s.key)?s.value:ze;case"collision":{if(n!==s.hash)return ze;for(const[i,u]of s.entries)if(e.equal(r,i))return u;return ze}case"bitmap":{const u=1<<(n>>>o&Vt);if(!(s.bitmap&u))return ze;s=s.children[Es(s.bitmap,u)],o+=sn;break}case"array":{const i=s.children[n>>>o&Vt];if(i===null)return ze;s=i,o+=sn;break}}}function xa(e,t,n,r,s){return as(e,t,0,n,r,s)}function _m(e,t,n,r){return is(e,t,0,n,r)}function On(e){switch(e.kind){case"empty":return 0;case"leaf":return 1;case"collision":return e.entries.length;case"bitmap":return e.children.reduce((t,n)=>t+On(n),0);case"array":return e.children.reduce((t,n)=>t+(n?On(n):0),0)}}function cs(e,t){switch(e.kind){case"empty":return;case"leaf":t(e.key,e.value);return;case"collision":for(const[n,r]of e.entries)t(n,r);return;case"bitmap":for(const n of e.children)cs(n,t);return;case"array":for(const n of e.children)n!==null&&cs(n,t);return}}function Dn(e){const t=[];return cs(e,(n,r)=>{t.push([n,r])}),t}const Re=5,lt=1<<Re,on=lt-1,$a={kind:"trie",count:0,shift:Re,root:[],tail:[]};function Jn(e){return e<lt?0:e-1>>>Re<<Re}function Ts(e,t){if(t>=Jn(e.count))return e.tail;let n=e.root;for(let r=e.shift;r>0;r-=Re)n=n[t>>>r&on];return n}function Pm(e,t){if(t<0||t>=e.count)throw new Error(`vector-kernel: index ${t} out of bounds (count=${e.count})`);return Ts(e,t)[t&on]}function Vs(e,t){return e===0?t:[Vs(e-Re,t)]}function Ma(e,t,n,r){const s=r-1>>>e&on,o=t.slice();if(e===Re)o[s]=n;else{const i=t[s];o[s]=i!==void 0?Ma(e-Re,i,n,r):Vs(e-Re,n)}return o}function ls(e,t){const{count:n,shift:r,root:s,tail:o}=e;if(n-Jn(n)<lt)return{kind:"trie",count:n+1,shift:r,root:s,tail:[...o,t]};let i,u=r;return n>>>Re>1<<r?(i=[s,Vs(r,o)],u=r+Re):i=Ma(r,s,o,n),{kind:"trie",count:n+1,shift:u,root:i,tail:[t]}}function Sa(e,t,n,r){const s=t.slice();if(e===0)s[n&on]=r;else{const o=n>>>e&on;s[o]=Sa(e-Re,t[o],n,r)}return s}function Nm(e,t,n){const{count:r,shift:s,root:o,tail:i}=e;if(t===r)return ls(e,n);if(t>=Jn(r)){const u=i.slice();return u[t&on]=n,{kind:"trie",count:r,shift:s,root:o,tail:u}}return{kind:"trie",count:r,shift:s,root:Sa(s,o,t,n),tail:i}}function qa(e,t,n){const r=n-2>>>e&on;if(e>Re){const s=qa(e-Re,t[r],n);if(s===null)return r===0?null:t.slice(0,r);const o=t.slice();return o[r]=s,o}return r===0?null:t.slice(0,r)}function Lm(e){const{count:t,shift:n,root:r,tail:s}=e;if(t===0)throw new Error("vector-kernel: pop on empty vector");if(t===1)return $a;if(t-Jn(t)>1)return{kind:"trie",count:t-1,shift:n,root:r,tail:s.slice(0,-1)};const o=Ts(e,t-2);let i=qa(n,r,t)??[],u=n;return n>Re&&i.length===1&&(i=i[0],u-=Re),{kind:"trie",count:t-1,shift:u,root:i,tail:o}}function Fa(e){const t=e.length;if(t===0)return $a;if(t<=lt)return{kind:"trie",count:t,shift:Re,root:[],tail:e.slice()};const n=(t-1)%lt+1,r=t-n,s=e.slice(r);let o=[];for(let u=0;u<r;u+=lt)o.push(e.slice(u,u+lt));let i=0;do{const u=[];for(let l=0;l<o.length;l+=lt)u.push(o.slice(l,l+lt));o=u,i+=Re}while(o.length>1);return{kind:"trie",count:t,shift:i,root:o[0],tail:s}}function Fr(e){const t=[],n=Jn(e.count);for(let r=0;r<n;r+=lt){const s=Ts(e,r);for(let o=0;o<s.length;o++)t.push(s[o])}for(let r=0;r<e.tail.length;r++)t.push(e.tail[r]);return t}const Em=2654435769,Tm=1367130551,Vm=14099,Om=-559038737,Dm=0,Gm=1108378657,zm=1108378656;function Ia(e){return e^=e>>>16,e=Math.imul(e,2246822507),e^=e>>>16,e}function gn(e){return e^=e>>>16,e=Math.imul(e,2246822507),e^=e>>>13,e=Math.imul(e,3266489909),e^=e>>>16,e}function cr(e){let t=0;for(let n=0;n<e.length;n++)t=Math.imul(31,t)+e.charCodeAt(n)|0;return gn(t)}function Bm(e){if(Number.isInteger(e)&&e>=-2147483648&&e<=2147483647)return e|0;const t=new ArrayBuffer(8);new Float64Array(t)[0]=e;const n=new Int32Array(t);return n[0]^n[1]}function Gn(e){let t=1;for(const n of e)t=Math.imul(31,t)+Ve(n)|0;return t}function Hm(e,t){return Math.imul(31,e)+Ve(t)|0}function Um(e){return e.kind==="array"?Gn(e.items):(e._hash===void 0&&(e._hash=Gn(Fr(e))),e._hash)}function Km(e){let t=0;for(const[n,r]of e){const s=Math.imul(Ve(n),2654435769)^Ve(r)|0;t^=s}return Ia(t)}function Wm(e){let t=0;for(const n of e)t^=Ve(n);return Ia(t)}function Ca(e){let t=e;for(;t.kind==="lazy-seq";){const n=t;if(n.realized)t=n.value;else if(n.thunk)n.value=n.thunk(),n.thunk=null,n.realized=!0,t=n.value;else return{kind:"nil",value:null}}return t}function Jm(e){const t=[];let n=e;for(;n.kind!=="nil";){if(n.kind==="cons"){t.push(n.head),n=n.tail;continue}if(n.kind==="list"||n.kind==="vector"){t.push(...n.value);break}if(n.kind==="lazy-seq"){n=Ca(n);continue}break}return Gn(t)}function Qm(e){const t=cr(e.ns+"/"+e.recordType);let n=0;for(const[r,s]of e.fields)n=n+(Ve(r)^Ve(s))|0;return gn(t+n|0)}function Ve(e){switch(e.kind){case"nil":return Dm;case"boolean":return e.value?Gm:zm;case"number":return Bm(e.value);case"string":return cr(e.value);case"character":return gn(e.value.charCodeAt(0)^Vm);case"keyword":{const t=e;if(t._hashCode!==void 0)return t._hashCode;const n=gn(cr(e.name)^Em);return t._hashCode=n,n}case"symbol":return gn(cr(e.name)^Tm);case"list":return Gn(e.value);case"vector":return Um(e._data);case"cons":return Jm(e);case"lazy-seq":return Ve(Ca(e));case"indexed-seq":return Gn(e.array.slice(e.offset));case"map":{const t=e._data,n=t.kind==="small"?t.entries:Dn(t.root);return Km(n)}case"set":{const t=e._map._data,n=t.kind==="small"?t.entries.map(([r])=>r):Dn(t.root).map(([r])=>r);return Wm(n)}case"record":return Qm(e);case"reduced":return gn(Ve(e.value)^Om);case"atom":return Be(e);case"var":return Be(e);case"function":return Be(e);case"native-function":return Be(e);case"macro":return Be(e);case"namespace":return Be(e);case"delay":return Be(e);case"pending":return Be(e);case"js-value":return Be(e);case"multi-method":return Be(e);case"protocol":return Be(e);case"volatile":return Be(e);case"regex":return Be(e)}}const Os=8;let An=(e,t)=>e===t;function Ym(e){An=e}const Ir={hash:Ve,equal:(e,t)=>An(e,t)},Ra=Object.create(Object.prototype);Object.defineProperty(Ra,"entries",{get(){const e=this._data;return e.kind==="small"?e.entries:Dn(e.root)},enumerable:!1,configurable:!1});function st(e,t){const n=Object.create(Ra);return n.kind="map",n._data=e,t!==void 0&&(n.meta=t),n}function ja(e){let t=ss;for(const[n,r]of e)t=xa(Ir,t,Ve(n),n,r);return{kind:"hamt",root:t,size:On(t)}}function Xm(e){const t=[],n=[];for(let r=e.length-1;r>=0;r--){const[s,o]=e[r];t.some(i=>An(i,s))||(t.push(s),n.unshift([s,o]))}return n}function Aa(e){return e.length===0?st({kind:"small",entries:[]}):e.length<=Os?st({kind:"small",entries:Xm(e)}):st(ja(e))}function Xt(e){const t=e._data;return t.kind==="small"?t.entries.length:t.size}function an(e,t){const n=e._data;if(n.kind==="small"){for(const[r,s]of n.entries)if(An(r,t))return s;return ze}return Am(Ir,n.root,Ve(t),t)}function Ds(e,t){return an(e,t)!==ze}function wn(e){const t=e._data;return t.kind==="small"?t.entries:Dn(t.root)}function Cr(e,t,n){const r=e._data;if(r.kind==="small"){const i=r.entries;for(let l=0;l<i.length;l++)if(An(i[l][0],t)){if(i[l][1]===n)return e;const d=i.slice();return d[l]=[t,n],st({kind:"small",entries:d},e.meta)}const u=[...i,[t,n]];return u.length>Os?st(ja(u),e.meta):st({kind:"small",entries:u},e.meta)}const s=r.root,o=xa(Ir,s,Ve(t),t,n);return o===s?e:st({kind:"hamt",root:o,size:On(o)},e.meta)}function Gs(e,t){const n=e._data;if(n.kind==="small"){const i=n.entries;for(let u=0;u<i.length;u++)if(An(i[u][0],t)){const l=i.slice(0,u).concat(i.slice(u+1));return st({kind:"small",entries:l},e.meta)}return e}const r=n.root,s=_m(Ir,r,Ve(t),t);if(s===r)return e;const o=On(s);if(o<=Os){const i=Dn(s);return st({kind:"small",entries:i},e.meta)}return st({kind:"hamt",root:s,size:o},e.meta)}const _a={kind:"boolean",value:!0};function zs(e,t){const n={kind:"set",_map:e};return t!==void 0&&(n.meta=t),n}function Zm(e){const t=e.map(n=>[n,_a]);return zs(Aa(t))}function kn(e){return Xt(e._map)}function je(e){return wn(e._map).map(([t])=>t)}function Qn(e,t){return Ds(e._map,t)}function Pa(e,t){const n=Cr(e._map,t,_a);return n===e._map?e:zs(n,e.meta)}function ep(e,t){const n=Gs(e._map,t);return n===e._map?e:zs(n,e.meta)}const Bs=32,Na=Object.create(Object.prototype);Object.defineProperty(Na,"value",{get(){const e=this._data;return e.kind==="array"?e.items:Fr(e)},enumerable:!1,configurable:!1});function ht(e,t,n){const r=Object.create(Na);return r.kind="vector",r._data=e,t!==void 0&&(r.meta=t),n&&(r.__cljamMapEntry=!0),r}function tp(e){return e.length<=Bs?ht({kind:"array",items:e}):ht(Fa(e))}function Ce(e){const t=e._data;return t.kind==="array"?t.items.length:t.count}function rt(e,t){const n=e._data;return n.kind==="array"?n.items[t]:t>=0&&t<n.count?Pm(n,t):void 0}function La(e){const t=e._data;return t.kind==="array"?t.items.length===0?void 0:t.items[t.items.length-1]:t.tail[t.tail.length-1]}function ot(e){const t=e._data;return t.kind==="array"?t.items:Fr(t)}function Ea(e,t,n){return ot(e).slice(t,n)}function np(e,t){if(e.kind==="array")return e.items.length<Bs?{kind:"array",items:[...e.items,t]}:ls(Fa(e.items),t);const n=ls(e,t);return e._hash!==void 0&&(n._hash=Hm(e._hash,t)),n}function Ta(e,...t){if(t.length===0)return e;let n=e._data;for(const r of t)n=np(n,r);return ht(n,e.meta)}function rp(e,t,n){const r=e._data;if(r.kind==="array"){if(t===r.items.length)return Ta(e,n);const s=r.items.slice();return s[t]=n,ht({kind:"array",items:s},e.meta)}return ht(Nm(r,t,n),e.meta)}function sp(e){const t=e._data;if(t.kind==="array")return ht({kind:"array",items:t.items.slice(0,-1)},e.meta);const n=Lm(t);return n.count<=Bs?ht({kind:"array",items:Fr(n)},e.meta):ht(n,e.meta)}function Fn(e){let t=e;for(;t.kind==="lazy-seq";){const n=t;if(n.realized)t=n.value;else if(n.thunk)n.value=n.thunk(),n.thunk=null,n.realized=!0,t=n.value;else return{kind:"nil",value:null}}return t}function us(e){if(e.kind==="nil")return[];if(e.kind==="list"||e.kind==="vector")return e.value;if(e.kind==="lazy-seq"){const t=Fn(e);return us(t)}if(e.kind==="indexed-seq"){const t=e;return t.array.slice(t.offset)}if(e.kind==="cons"){const t=[];let n=e;for(;n.kind!=="nil";){if(n.kind==="cons"){t.push(n.head),n=n.tail;continue}if(n.kind==="lazy-seq"){n=Fn(n);continue}if(n.kind==="list"||n.kind==="vector"){t.push(...n.value);break}if(n.kind==="indexed-seq"){const r=n;t.push(...r.array.slice(r.offset));break}return null}return t}return null}const Va=(e,t)=>{const n=e._data,r=t._data;if(Ce(e)!==Ce(t))return!1;if(n.kind==="trie"&&r.kind==="trie"&&n.root===r.root&&n.tail===r.tail)return!0;if(n.kind==="trie"&&r.kind==="trie"&&n._hash!==void 0&&r._hash!==void 0&&n._hash!==r._hash)return!1;const s=ot(e),o=ot(t);for(let i=0;i<s.length;i++)if(!De(s[i],o[i]))return!1;return!0},op={[A.number]:(e,t)=>e.value===t.value,[A.string]:(e,t)=>e.value===t.value,[A.character]:(e,t)=>e.value===t.value,[A.boolean]:(e,t)=>e.value===t.value,[A.nil]:()=>!0,[A.symbol]:(e,t)=>e.name===t.name,[A.keyword]:(e,t)=>e.name===t.name,[A.vector]:(e,t)=>Va(e,t),[A.map]:(e,t)=>{if(Xt(e)!==Xt(t))return!1;for(const[r,s]of wn(e)){const o=an(t,r);if(o===ze||!De(s,o))return!1}return!0},[A.list]:(e,t)=>e.value.length!==t.value.length?!1:e.value.every((n,r)=>De(n,t.value[r])),[A.atom]:(e,t)=>e===t,[A.reduced]:(e,t)=>De(e.value,t.value),[A.volatile]:(e,t)=>e===t,[A.regex]:(e,t)=>e===t,[A.var]:(e,t)=>e===t,[A.set]:(e,t)=>Xt(e._map)!==Xt(t._map)?!1:je(e).every(n=>Ds(t._map,n)),[A.delay]:(e,t)=>e===t,[A.lazySeq]:(e,t)=>{const n=Fn(e),r=Fn(t);return De(n,r)},[A.cons]:(e,t)=>De(e.head,t.head)&&De(e.tail,t.tail),[A.namespace]:(e,t)=>e===t,[A.record]:(e,t)=>e.ns!==t.ns||e.recordType!==t.recordType||e.fields.length!==t.fields.length?!1:e.fields.every(([n,r])=>{const s=t.fields.find(([o])=>De(n,o));return s!==void 0&&De(r,s[1])})},De=(e,t)=>{if(e.kind==="lazy-seq")return De(Fn(e),t);if(t.kind==="lazy-seq")return De(e,Fn(t));if(e.kind==="vector"&&t.kind==="vector")return Va(e,t);const n=e.kind==="list"||e.kind==="vector"||e.kind==="cons"||e.kind==="indexed-seq",r=t.kind==="list"||t.kind==="vector"||t.kind==="cons"||t.kind==="indexed-seq";if(n&&r){const o=us(e),i=us(t);return o===null||i===null||o.length!==i.length?!1:o.every((u,l)=>De(u,i[l]))}if(e.kind!==t.kind)return!1;const s=op[e.kind];return s?s(e,t):!1};Ym(De);const ap=e=>e.kind==="nil",ip=e=>e.kind==="boolean",cp=e=>e.kind==="character",Oa=e=>e.kind==="nil"?!0:e.kind==="boolean"?e.value===!1:!1,lp=e=>!Oa(e),up=e=>e.kind==="symbol"&&e.name in Wn,zt=e=>e.kind==="symbol",Rr=e=>e.kind==="vector",dp=e=>Rr(e)&&e.__cljamMapEntry===!0,Da=e=>e.kind==="list",Ga=e=>e.kind==="function",za=e=>e.kind==="native-function",fp=e=>e.kind==="macro",Hs=e=>e.kind==="map",Ba=e=>e.kind==="keyword",Ha=e=>Ga(e)||za(e),Ua=e=>e.kind==="js-value",mp=e=>Ha(e)||Ba(e)||Rr(e)||Hs(e)||Ks(e)||Us(e)||Ka(e)||Ua(e)&&typeof e.value=="function",pp=e=>e.kind==="multi-method",hp=e=>e.kind==="atom",gp=e=>e.kind==="reduced",vp=e=>e.kind==="volatile",yp=e=>e.kind==="regex",Ka=e=>e.kind==="var",Us=e=>e.kind===A.set,bp=e=>e.kind==="delay",Wa=e=>e.kind==="lazy-seq",Ja=e=>e.kind==="cons",Qa=e=>e.kind==="indexed-seq",ds=e=>e.kind==="namespace",wp=e=>e.kind==="protocol",Ks=e=>e.kind==="record",Ya=e=>Rr(e)||Hs(e)||Ks(e)||Da(e)||Us(e)||Ja(e)||Qa(e),kp=e=>Ya(e)||e.kind==="string"||Wa(e),Xa=e=>typeof e=="object"&&e!==null&&"kind"in e&&e.kind in Sm,xp=e=>e.kind==="string",$p=e=>e.kind==="number",Mp=e=>e.kind==="pending",c={nil:ap,number:$p,string:xp,boolean:ip,char:cp,falsy:Oa,truthy:lp,specialForm:up,symbol:zt,vector:Rr,mapEntry:dp,list:Da,function:Ga,nativeFunction:za,macro:fp,map:Hs,keyword:Ba,aFunction:Ha,callable:mp,multiMethod:pp,atom:hp,reduced:gp,volatile:vp,regex:yp,var:Ka,set:Us,delay:bp,lazySeq:Wa,cons:Ja,indexedSeq:Qa,namespace:ds,protocol:wp,record:Ks,collection:Ya,seqable:kp,cljValue:Xa,equal:De,jsValue:Ua,pending:Mp};class it extends Error{constructor(n,r){super(n);Oe(this,"context");this.name="TokenizerError",this.context=r}}class G extends Error{constructor(n,r,s){super(n);Oe(this,"context");Oe(this,"pos");this.name="ReaderError",this.context=r,this.pos=s}}const Za=Symbol.for("@regibyte/cljam/EvaluationError");function ei(e){if(e instanceof G||e instanceof it){const t=new f(e.message,e.context,e instanceof G?e.pos:void 0);return t.code="reader/malformed",t}return e}var aa,ia;class f extends(ia=Error,aa=Za,ia){constructor(n,r,s){super(n);Oe(this,aa,!0);Oe(this,"context");Oe(this,"pos");Oe(this,"data");Oe(this,"frames");Oe(this,"code");this.name="EvaluationError",this.context=r,this.pos=s}static atArg(n,r,s){const o=new f(n,r);return o.data={argIndex:s},o}}function Yn(e){return e instanceof Error?e[Za]===!0||e.name==="EvaluationError":!1}class tt{constructor(t){Oe(this,"value");this.value=t}}const Sp=e=>({kind:"number",value:e}),Ws=e=>({kind:"string",value:e}),qp=e=>({kind:"character",value:e}),Fp=e=>({kind:"boolean",value:e}),In=e=>({kind:"keyword",name:e}),ti=e=>({kind:"keyword",name:e.startsWith(":")?e:`:${e}`}),xt=()=>({kind:"nil",value:null}),Js=e=>({kind:"symbol",name:e}),Ip=e=>({kind:"list",value:e}),Cp=e=>Zm(e),zn=e=>tp(e),Rp=(e,t)=>ht({kind:"array",items:[e,t]},void 0,!0);function Qs(e,t){if(e.kind==="map")return st(e._data,t);if(e.kind==="vector"){const n=e;return ht(n._data,t,n.__cljamMapEntry)}return{...e,meta:t}}const xn=Aa,jp=(e,t,n,r)=>({kind:"function",arities:[{params:e,restParam:t,body:n}],env:r}),Ap=(e,t)=>({kind:"function",arities:e,env:t}),_p=(e,t,n,r)=>({kind:"macro",arities:[{params:e,restParam:t,body:n}],env:r}),Pp=(e,t)=>({kind:"macro",arities:e,env:t}),Np=(e,t="")=>({kind:"regex",pattern:e,flags:t}),Lp=(e,t,n,r)=>({kind:"var",ns:e,name:t,value:n,meta:r}),Ep=e=>({kind:"atom",value:e}),Tp=e=>({kind:"reduced",value:e}),Vp=e=>({kind:"volatile",value:e}),Op=(e,t,n)=>({kind:"delay",thunk:e,thunkFn:t,callEnv:n,realized:!1,value:void 0}),Dp=(e,t,n)=>({kind:"lazy-seq",thunk:e,thunkFn:t,callEnv:n,realized:!1,value:void 0}),Gp=(e,t)=>({kind:"cons",head:e,tail:t}),zp=(e,t=0)=>t>=e.length?xt():{kind:"indexed-seq",array:e,offset:t},Bp=e=>({kind:"namespace",name:e,version:0,vars:new Map,aliases:new Map,readerAliases:new Map}),Hp=e=>({kind:"js-value",value:e}),Up=(e,t,n,r)=>({kind:"protocol",name:e,ns:t,fns:n,doc:r,impls:new Map}),Kp=(e,t,n,r)=>({kind:"record",recordType:e,ns:t,fields:n,basis:r}),Wp=e=>{const t=e.then(r=>r.kind==="pending"?r.promise:r),n={kind:"pending",promise:t};return t.then(r=>{n.resolved=!0,n.resolvedValue=r},()=>{}),n};function Jp(e,t){return xn([[In(":doc"),Ws(e)],...t?[[In(":arglists"),zn(t.map(n=>zn(n.map(Js))))]]:[]])}function Qp(e,t){let n=t??xn([]);for(const[r,s]of e.entries){if(r.kind!=="keyword")continue;n.entries.find(([i])=>i.kind==="keyword"&&i.name===r.name)&&(n=xn([...n.entries].filter(([i])=>i.kind!=="keyword"||i.name!==r.name))),n=xn([...n.entries,[r,s]])}return n}function pr(e){const t={kind:"native-function",name:e.name,fn:e.fn,...e.fnWithContext!==void 0?{fnWithContext:e.fnWithContext}:{},...e.meta!==void 0?{meta:e.meta}:{}};return{...t,doc(n,r){return pr({...t,meta:Jp(n,r)})},withMeta(n){return pr({...t,meta:Qp(xn(n),t.meta)})}}}const Yp=(e,t,n,r,s)=>({kind:"multi-method",name:e,dispatchFn:t,methods:n,defaultMethod:r,defaultDispatchVal:s}),a={number:Sp,string:Ws,char:qp,boolean:Fp,nil:xt,symbol:Js,keyword:In,kw:In,autoKeyword:ti,list:Ip,vector:zn,mapEntry:Rp,map:xn,set:Cp,cons:Gp,indexedSeq:zp,function:jp,multiArityFunction:Ap,macro:_p,multiArityMacro:Pp,multiMethod:Yp,nativeFn(e,t){return pr({name:e,fn:t})},nativeFnCtx(e,t){return pr({name:e,fn:()=>{throw new f("Native function called without context",{name:e})},fnWithContext:t})},var:Lp,atom:Ep,regex:Np,reduced:Tp,volatile:Vp,delay:Op,lazySeq:Dp,namespace:Bp,pending:Wp,jsValue:Hp,protocol:Up,record:Kp},g=({doc:e,arglists:t,docGroup:n,extra:r={}})=>{const s=[[a.keyword(":doc"),a.string(e)],...t?[[In(":arglists"),zn(t.map(o=>zn(o.map(Js))))]]:[],...n?[[In(":doc-group"),Ws(n)]]:[]];for(const[o,i]of Object.entries(r))s.push([ti(o),$n(i)]);return s},w={runtime:"Dev",interop:"Interop",regex:"Strings",introspection:"Dev",utilities:"Utilities",vars:"Dev",io:"IO",async:"Async",arithmetic:"Arithmetic",comparison:"Comparison",edn:"EDN",collections:"Sequences",sequences:"Sequences",transducers:"Transducers",maps:"Maps",predicates:"Predicates",strings:"Strings",higher_order:"Higher-order",lazy:"Sequences",atoms:"State",errors:"Errors",sets:"Sequences",metadata:"Metadata",hierarchy:"Abstractions",protocols:"Abstractions",multimethods:"Abstractions"};class hr extends Error{constructor(n,r){super(n);Oe(this,"context");this.name="ConversionError",this.context=r}}const Xp=new Set(["list","vector","map"]),Zp={applyFunction:()=>{throw new hr("Cannot convert a CLJ function to JS in this context — use session.cljToJs() instead.")}};function Zt(e,t){switch(e.kind){case"number":return e.value;case"string":return e.value;case"boolean":return e.value;case"nil":return null;case"keyword":return e.name.startsWith(":")?e.name.slice(1):e.name;case"symbol":return e.name;case"list":case"vector":return e.value.map(n=>Zt(n,t));case"map":{const n={};for(const[r,s]of e.entries){if(Xp.has(r.kind))throw new hr(`Rich key types (${r.kind}) are not supported in JS object conversion. Restructure your map to use string, keyword, or number keys.`,{key:r,value:s});const o=String(Zt(r,t));n[o]=Zt(s,t)}return n}case"function":case"native-function":{const n=e;return(...r)=>{const s=r.map(i=>$n(i)),o=t.applyFunction(n,s);return Zt(o,t)}}case"macro":throw new hr("Macros cannot be exported to JavaScript. Macros are compile-time constructs.",{macro:e})}}function $n(e,t={}){const{keywordizeKeys:n=!0}=t;if(e===null)return a.nil();if(e===void 0)return a.jsValue(void 0);if(Xa(e))return e;switch(typeof e){case"number":return a.number(e);case"string":return a.string(e);case"boolean":return a.boolean(e);case"function":{const r=e;return a.nativeFn("js-fn",(...s)=>{const o=s.map(u=>Zt(u,Zp)),i=r(...o);return $n(i,t)})}case"object":{if(Array.isArray(e))return a.vector(e.map(s=>$n(s,t)));const r=Object.entries(e).map(([s,o])=>[n?a.keyword(`:${s}`):a.string(s),$n(o,t)]);return a.map(r)}default:throw new hr(`Cannot convert JS value of type ${typeof e} to CljValue`,{value:e})}}function Ie(e){return c.var(e)?e.dynamic&&e.bindingStack&&e.bindingStack.length>0?e.bindingStack[e.bindingStack.length-1]:e.value:e}function gr(e){return a.namespace(e)}function Ot(e){return{bindings:new Map,outer:e??null}}function ni(e,t){var r;let n=t;for(;n;){const s=n.bindings.get(e);if(s!==void 0)return s;const o=(r=n.ns)==null?void 0:r.vars.get(e);if(o!==void 0)return Ie(o);n=n.outer}throw new f(`Symbol ${e} not found`,{name:e})}function Cn(e,t){var r;let n=t;for(;n;){const s=n.bindings.get(e);if(s!==void 0)return s;const o=(r=n.ns)==null?void 0:r.vars.get(e);if(o!==void 0)return Ie(o);n=n.outer}}function me(e,t,n,r){const s=n.ns,o=r??t.meta,i=s.vars.get(e);i?(i.value=t,o&&(i.meta=o)):s.vars.set(e,a.var(s.name,e,t,o))}function qt(e,t){var r;let n=t;for(;n;){const s=n.bindings.get(e);if(s!==void 0&&c.var(s))return s;const o=(r=n.ns)==null?void 0:r.vars.get(e);if(o!==void 0)return o;n=n.outer}}function eh(e){let t=e;for(;t!=null&&t.outer;)t=t.outer;return t}function Ae(e){let t=e;for(;t;){if(t.ns)return t;t=t.outer}return eh(e)}const th=100;function nh(e){let t=e;for(;c.lazySeq(t);){const n=t;if(n.realized){t=n.value;continue}if(n.thunk)n.value=n.thunk(),n.thunk=null,n.realized=!0,t=n.value;else return a.nil()}return t}function rh(e,t,n){const r=[];let s=e;for(;r.length<t&&!c.nil(s);){if(c.lazySeq(s)){s=nh(s);continue}if(c.cons(s)){const o=s;r.push(x(o.head,n+1)),s=o.tail;continue}if(c.list(s)){for(const o of s.value){if(r.length>=t)break;r.push(x(o,n+1))}break}if(c.vector(s)){for(const o of s.value){if(r.length>=t)break;r.push(x(o,n+1))}break}if(c.indexedSeq(s)){for(let o=s.offset;o<s.array.length&&!(r.length>=t);o++)r.push(x(s.array[o],n+1));break}r.push(x(s,n+1));break}return{items:r,truncated:r.length>=t}}let ft={printLength:null,printLevel:null};function Nn(){return ft}function ut(e,t){const n=ft;ft=e;try{return t()}finally{ft=n}}function dt(e){var o,i;const t=(o=e.resolveNs("clojure.core"))==null?void 0:o.vars.get("*print-length*"),n=(i=e.resolveNs("clojure.core"))==null?void 0:i.vars.get("*print-level*"),r=t?Ie(t):void 0,s=n?Ie(n):void 0;return{printLength:r&&c.number(r)?r.value:null,printLevel:s&&c.number(s)?s.value:null}}function x(e,t=0){const{printLevel:n}=ft;return n!==null&&t>=n&&(c.list(e)||c.vector(e)||c.map(e)||c.set(e)||c.cons(e)||c.lazySeq(e)||c.indexedSeq(e))?"#":oh(e,t)}function ri(e){if(e.length===0)return null;let t=null;for(const[n]of e){if(n.kind!=="keyword")return null;const r=n.name.slice(1),s=r.indexOf("/");if(s===-1)return null;const o=r.slice(0,s);if(t===null)t=o;else if(t!==o)return null}return t}function si(e,t){const n=e.name.slice(1),r=n.indexOf("/"),s=r===-1?n:n.slice(r+1);return x(a.keyword(`:${s}`),t)}const sh={" ":"space","\n":"newline","	":"tab","\r":"return","\b":"backspace","\f":"formfeed"};function oh(e,t){var n;switch(e.kind){case A.character:{const s=sh[e.value];return s?`\\${s}`:`\\${e.value}`}case A.number:return e.value.toString();case A.string:let r="";for(const s of e.value)switch(s){case'"':r+='\\"';break;case"\\":r+="\\\\";break;case`
`:r+="\\n";break;case"\r":r+="\\r";break;case"	":r+="\\t";break;default:r+=s}return`"${r}"`;case A.boolean:return e.value?"true":"false";case A.nil:return"nil";case A.keyword:return`${e.name}`;case A.symbol:return`${e.name}`;case A.list:{const{printLength:s}=ft,o=s!==null?e.value.slice(0,s):e.value,i=s!==null&&e.value.length>s?" ...":"";return`(${o.map(u=>x(u,t+1)).join(" ")}${i})`}case A.vector:{const{printLength:s}=ft,o=s!==null?e.value.slice(0,s):e.value,i=s!==null&&e.value.length>s?" ...":"";return`[${o.map(u=>x(u,t+1)).join(" ")}${i}]`}case A.map:{const{printLength:s}=ft,o=s!==null?e.entries.slice(0,s):e.entries,i=s!==null&&e.entries.length>s?" ...":"",u=ri(o);if(u!==null){const l=o.map(([d,m])=>`${si(d,t+1)} ${x(m,t+1)}`).join(" ");return`#:${u}{${l}${i}}`}return`{${o.map(([l,d])=>`${x(l,t+1)} ${x(d,t+1)}`).join(" ")}${i}}`}case A.function:return`#function[${e.displayName??e.name??"anonymous"}]`;case A.nativeFunction:return`(native-fn ${e.name})`;case A.multiMethod:return`(multi-method ${e.name})`;case A.atom:return`#<Atom ${x(e.value,t+1)}>`;case A.reduced:return`#<Reduced ${x(e.value,t+1)}>`;case A.volatile:return`#<Volatile ${x(e.value,t+1)}>`;case A.regex:{const s=e.pattern.replace(/"/g,'\\"');return`#"${e.flags?`(?${e.flags})`:""}${s}"`}case A.var:return`#'${e.ns}/${e.name}`;case A.set:{const{printLength:s}=ft,o=je(e),i=s!==null?o.slice(0,s):o,u=s!==null&&o.length>s?" ...":"";return`#{${i.map(l=>x(l,t+1)).join(" ")}${u}}`}case A.delay:return e.realized?`#<Delay @${x(e.value,t+1)}>`:"#<Delay pending>";case A.lazySeq:case A.indexedSeq:case A.cons:{const{printLength:s}=ft,o=s!==null?s:th,{items:i,truncated:u}=rh(e,o,t),l=u?" ...":"";return`(${i.join(" ")}${l})`}case A.namespace:return`#namespace[${e.name}]`;case A.protocol:return`#protocol[${e.ns}/${e.name}]`;case A.record:{const s=e.fields.map(([o,i])=>`${x(o,t+1)} ${x(i,t+1)}`).join(" ");return`#${e.ns}/${e.recordType}{${s}}`}case"pending":return e.resolved&&e.resolvedValue!==void 0?`#<Pending @${x(e.resolvedValue,t+1)}>`:"#<Pending>";case A.jsValue:{const s=e.value;return s===null?"#<js null>":s===void 0?"#<js undefined>":s instanceof Date?s.toISOString():typeof s=="function"?"#<js Function>":Array.isArray(s)?"#<js Array>":s instanceof Promise?"#<js Promise>":`#<js ${((n=s.constructor)==null?void 0:n.name)??"Object"}>`}default:throw new f(`unhandled value type: ${e.kind}`,{value:e})}}function pn(e){return e.join(`
`)}const Fo={do:0,try:0,and:0,or:0,cond:0,"->":0,"->>":0,"some->":0,"some->>":0,when:1,"when-not":1,"when-let":1,"when-some":1,"when-first":1,if:1,"if-not":1,"if-let":1,"if-some":1,while:1,let:1,loop:1,binding:1,"with-open":1,"with-local-vars":1,locking:1,fn:1,"fn*":1,def:1,defonce:1,ns:1,doseq:1,dotimes:1,for:1,case:1,"cond->":1,"cond->>":1,defn:2,"defn-":2,defmacro:2,defmethod:2},ah=new Set(["let","loop",Wn.binding,"with-open","for","doseq","dotimes"]),ih=new Set(["cond","condp","case","cond->","cond->>"]);function We(e){return e>0?" ".repeat(e):""}function ch(e){const t=e.lastIndexOf(`
`);return t===-1?e.length:e.length-t-1}function Je(e,t,n){const r=x(e);if(t+r.length<=n)return r;switch(e.kind){case A.list:return uh(e.value,t,n);case A.vector:return oi(e.value,t,n,!1);case A.map:return dh(e.entries,t,n);case A.set:return fh(je(e),t,n);case A.record:return lh(e.fields,e.ns,e.recordType,t,n);case A.lazySeq:case A.indexedSeq:case A.cons:return r;default:return r}}function lh(e,t,n,r,s){if(e.length===0)return`#${t}/${n}{}`;const o=`#${t}/${n}{`,i=r+o.length,u=e.map(([l,d],m)=>{const h=x(l),b=Je(d,i+h.length+1,s);return(m===0?"":We(i))+h+" "+b});return o+u.join(`
`)+"}"}function uh(e,t,n){if(e.length===0)return"()";const[r,...s]=e,o=x(r),i=r.kind===A.symbol?r.name:null;if(i!==null&&i in Fo){const m=Fo[i],h=s.slice(0,m),b=s.slice(m),M=t+2;let v="("+o,y=t+1+o.length;for(let R=0;R<h.length;R++){const E=h[R],U=y+1,P=ah.has(i)&&R===0&&E.kind===A.vector?oi(E.value,U,n,!0):Je(E,U,n);v+=" "+P,y=P.includes(`
`)?ch(P):U+P.length-1}if(b.length===0)return v+")";const $=ih.has(i)?mh(b,M,n):b.map(R=>We(M)+Je(R,M,n)).join(`
`);return v+`
`+$+")"}if(s.length===0)return"("+o+")";const u=t+1+o.length+1;if(s.length===1)return"("+o+" "+Je(s[0],u,n)+")";const l=o.length<=10?u:t+2,d=s.map(m=>Je(m,l,n));return l===u?"("+o+" "+d[0]+`
`+d.slice(1).map(m=>We(l)+m).join(`
`)+")":"("+o+`
`+d.map(m=>We(l)+m).join(`
`)+")"}function oi(e,t,n,r){if(e.length===0)return"[]";const s=t+1;if(r){const i=[];for(let u=0;u<e.length;u+=2){const l=u===0?"":We(s),d=x(e[u]);if(u+1>=e.length){i.push(l+d);continue}const m=e[u+1],h=d+" "+x(m);if(s+h.length<=n)i.push(l+h);else{const b=Je(m,s+d.length+1,n);i.push(l+d+" "+b)}}return"["+i.join(`
`)+"]"}return"["+e.map((i,u)=>{const l=Je(i,s,n);return(u===0?"":We(s))+l}).join(`
`)+"]"}function dh(e,t,n){if(e.length===0)return"{}";const r=ri(e);if(r!==null){const i=`#:${r}{`,u=t+i.length,l=e.map(([d,m],h)=>{const b=si(d,0),M=Je(m,u+b.length+1,n);return(h===0?"":We(u))+b+" "+M});return i+l.join(`
`)+"}"}const s=t+1;return"{"+e.map(([i,u],l)=>{const d=x(i),m=Je(u,s+d.length+1,n);return(l===0?"":We(s))+d+" "+m}).join(`
`)+"}"}function fh(e,t,n){if(e.length===0)return"#{}";const r=t+2;return"#{"+e.map((o,i)=>{const u=Je(o,r,n);return(i===0?"":We(r))+u}).join(`
`)+"}"}function mh(e,t,n){const r=[];for(let s=0;s<e.length;s+=2){const o=Je(e[s],t,n);if(s+1>=e.length){r.push(We(t)+o);continue}const i=x(e[s+1]),u=o+" "+i;t+u.length<=n?r.push(We(t)+u):r.push(We(t)+o+`
`+We(t+2)+Je(e[s+1],t+2,n))}return r.join(`
`)}function ai(e,t=80){return Je(e,0,t)}function Qe(e,t){Object.defineProperty(e,"_pos",{value:t,enumerable:!1,writable:!0,configurable:!0})}function T(e){return e._pos}function jr(e,t){const n=e.split(`
`);let r=0;for(let o=0;o<n.length;o++){const i=r+n[o].length;if(t<=i)return{line:o+1,col:t-r,lineText:n[o]};r=i+1}const s=n[n.length-1];return{line:n.length,col:s.length,lineText:s}}function Io(e,t,n){const r=t.source??e,s=t.lineOffset??(n==null?void 0:n.lineOffset)??0,o=t.colOffset??(n==null?void 0:n.colOffset)??0,{line:i,col:u,lineText:l}=jr(r,t.start),d=i+s,m=i===1?u+o:u,h=Math.max(1,t.end-t.start),b=" ".repeat(u)+"^".repeat(h);return`
  at line ${d}, col ${m+1}:
  ${l}
  ${b}`}function ph(e,t){return a.vector(e.map(n=>{let r=n.line,s=n.col;if((r===null||s===null)&&n.pos){const o=n.pos.source??t;if(o){const i=jr(o,n.pos.start),u=n.pos.lineOffset??0,l=n.pos.colOffset??0;r=i.line+u,s=i.line===1?i.col+1+l:i.col+1}}return a.map([[a.keyword(":fn"),n.fnName!==null?a.string(n.fnName):a.nil()],[a.keyword(":line"),r!==null?a.number(r):a.nil()],[a.keyword(":col"),s!==null?a.number(s):a.nil()],[a.keyword(":source"),n.source!==null?a.string(n.source):a.nil()]])}))}function Co(e,t,n){var u;if(e.length===0)return"";const s=e.slice(0,20),o=e.length-s.length,i=[];for(const l of s){const d=l.fnName??"<anonymous>",m=((u=l.pos)==null?void 0:u.source)??t;if(l.pos&&m){const{line:h,col:b}=jr(m,l.pos.start),M=l.pos.lineOffset??(n==null?void 0:n.lineOffset)??0,v=l.pos.colOffset??(n==null?void 0:n.colOffset)??0,y=h+M,$=h===1?b+v:b;i.push(`  at ${d} (line ${y}, col ${$+1})`)}else i.push(`  at ${d}`)}return o>0&&i.push(`  ... ${o} more frames`),`
`+i.join(`
`)}function ii(e,t){var n;if(e instanceof f&&((n=e.data)==null?void 0:n.argIndex)!==void 0&&!e.pos){const r=t.value[e.data.argIndex+1];if(r){const s=T(r);s&&(e.pos=s)}}}function Ro(e){if(!e)return!1;for(const[t,n]of e.entries)if(c.keyword(t)&&t.name===":dynamic"&&c.boolean(n)&&n.value===!0)return!0;return!1}function hh(e,t,n){const r=n?T(n):void 0,s=r&&t.currentSource;if(!e&&!s)return;const o=[];if(s){const{line:d,col:m}=jr(t.currentSource,r.start),h=t.currentLineOffset??0,b=t.currentColOffset??0;o.push([a.keyword(":line"),a.number(d+h)]),o.push([a.keyword(":column"),a.number(d===1?m+b:m)]),t.currentFile&&o.push([a.keyword(":file"),a.string(t.currentFile)])}const i=new Set([":line",":column",":file"]),l=[...((e==null?void 0:e.entries)??[]).filter(([d])=>!(c.keyword(d)&&i.has(d.name))),...o];return l.length>0?a.map(l):void 0}function Ys(e,t){const n=[a.keyword(":doc"),a.string(t)],r=((e==null?void 0:e.entries)??[]).filter(([s])=>!(c.keyword(s)&&s.name===":doc"));return a.map([...r,n])}function ci(e,t,n){let r=t?Ys(e,t):e;const s=c.vector(n[0])?[n[0]]:n.filter(c.list).map(o=>o.value[0]).filter(c.vector);if(s.length>0){const i=[...((r==null?void 0:r.entries)??[]).filter(([u])=>!(c.keyword(u)&&u.name===":arglists")),[a.keyword(":arglists"),a.vector(s)]];r=a.map(i)}return r}function gh(e,t){var o;if(!t||!c.function(e))return;const n=t.entries.find(([i])=>c.keyword(i)&&i.name===":doc");if(!n)return;const s=(((o=e.meta)==null?void 0:o.entries)??[]).filter(([i])=>!(c.keyword(i)&&i.name===":doc"));e.meta=a.map([...s,n])}function vh(e,t){var o;if(!t)return;const n=t.entries.filter(([i])=>c.keyword(i)&&(i.name===":doc"||i.name===":arglists"));if(n.length===0)return;const r=new Set(n.map(([i])=>c.keyword(i)?i.name:"")),s=(((o=e.meta)==null?void 0:o.entries)??[]).filter(([i])=>!(c.keyword(i)&&r.has(i.name)));e.meta=a.map([...s,...n])}function Ar({name:e,value:t,env:n,ctx:r,docstring:s,mutationReason:o="def"}){var b,M;const u=Ae(n).ns,l=hh(e.meta,r,e),d=s?Ys(l,s):l;gh(t,d),(c.function(t)||c.macro(t))&&(t.displayName=`${u.name}/${e.name}`);const m=u.vars.get(e.name);if(m)return m.value=t,d&&(m.meta=d,Ro(d)&&(m.dynamic=!0)),(b=r.touchNamespace)==null||b.call(r,u,o),m;const h=a.var(u.name,e.name,t,d);return Ro(d)&&(h.dynamic=!0),u.vars.set(e.name,h),(M=r.touchNamespace)==null||M.call(r,u,o),h}function li({name:e,macro:t,env:n,ctx:r}){t.name=e.name;const s=Ar({name:e,value:t,env:n,ctx:r,mutationReason:"defmacro"});return vh(t,s.meta),s}function yh(e,t={}){const n=e.value.slice(1),r=[],s=[];let o=null;for(let i=0;i<n.length;i++){const u=n[i];if(c.list(u)&&u.value.length>0&&c.symbol(u.value[0])){const l=u.value[0].name;if(l==="catch"){if(u.value.length<3)throw new f("catch requires a discriminator and a binding symbol",{form:u,env:t},T(u));const d=u.value[1],m=u.value[2];if(!c.symbol(m))throw new f("catch binding must be a symbol",{form:u,env:t},T(m)??T(u));s.push({discriminator:d,binding:m.name,body:u.value.slice(3)});continue}if(l==="finally"){if(i!==n.length-1)throw new f("finally clause must be the last in try expression",{form:u,env:t},T(u));o=u.value.slice(1);continue}}r.push(u)}return{bodyForms:r,catchClauses:s,finallyForms:o}}function bh(e,t,n,r){let s;try{s=r.evaluate(e,n)}catch{return!0}return ui(s,t,n,r)}function ui(e,t,n,r){if(c.symbol(e))return!0;if(c.keyword(e)){if(e.name===":default")return!0;if(!c.map(t))return!1;const s=t.entries.find(([o])=>c.keyword(o)&&o.name===":type");return s?c.equal(s[1],e):!1}if(c.aFunction(e)){const s=r.applyFunction(e,[t],n);return c.truthy(s)}throw new f("catch discriminator must be a keyword or a predicate function",{discriminator:e,env:n})}function di(e,t){const n=e.code?a.keyword(`:${e.code}`):a.keyword(":error/runtime"),r=[[a.keyword(":type"),n],[a.keyword(":message"),a.string(e.message)]];return e.frames&&e.frames.length>0&&r.push([a.keyword(":frames"),ph(e.frames,t.currentSource)]),a.map(r)}function Xs(e,t){return e instanceof tt?e.value:Yn(e)?di(e,t):null}function Ee(e){return e===null?a.nil():e===void 0?a.jsValue(void 0):typeof e=="number"?a.number(e):typeof e=="string"?a.string(e):typeof e=="boolean"?a.boolean(e):e!==null&&typeof(e==null?void 0:e.then)=="function"?a.pending(Promise.resolve(e).then(Ee)):a.jsValue(e)}function wh(e){if(c.string(e))return e.value;if(c.keyword(e))return e.name.slice(1);if(c.number(e)||c.boolean(e))return String(e.value);throw new f(`cljToJs: map key must be a string, keyword, number, or boolean — got ${e.kind} (rich keys are not allowed as JS object keys; reduce to a primitive first)`,{key:e})}function Ke(e,t,n){switch(e.kind){case"js-value":return e.value;case"number":return e.value;case"string":return e.value;case"boolean":return e.value;case"nil":return null;case"keyword":return e.name.slice(1);case"function":case"native-function":{const r=e;return(...s)=>{const o=s.map(Ee),i=t.applyCallable(r,o,n);return Ke(i,t,n)}}case"list":case"vector":return e.value.map(r=>Ke(r,t,n));case"pending":return e.promise.then(r=>Ke(r,t,n),r=>{throw r instanceof tt?new Error(x(r.value),{cause:r.value}):r});case"map":{const r={};for(const[s,o]of e.entries)r[wh(s)]=Ke(o,t,n);return r}default:throw new f(`cannot convert ${e.kind} to JS value — no coercion defined`,{val:e})}}function fi(e,t){switch(e.kind){case"js-value":return e.value;case"string":case"number":case"boolean":return e.value;default:throw new f(`cannot use . on ${e.kind}`,{target:e},T(t))}}function _r(e,t,n){const r=fi(e,t);if(r==null){const i=r===null?"null":"undefined";throw new f(`cannot use . on ${i} js value — check for nil/undefined before accessing properties`,{target:e},T(t))}const s=r,o=s[n];return typeof o=="function"?a.jsValue(o.bind(s)):Ee(o)}function kh(e,t,n){let r=e;for(const s of n)r=_r(r,t,s);return r}function Zs(e,t,n,r,s,o,i){const u=fi(e,t);if(u==null){const h=u===null?"null":"undefined";throw new f(`cannot use . on ${h} js value — check for nil/undefined before accessing properties`,{target:e},T(t))}const l=u,d=l[n];if(typeof d!="function")throw new f(`method '${n}' is not callable on ${String(l)}`,{propName:n,rawObj:l},T(r));const m=s.map(h=>Ke(h,o,i));return Ee(d.apply(l,m))}function eo(e,t,n,r,s){if(!c.jsValue(e)||typeof e.value!="function")throw new f(`js/new: expected js-value constructor, got ${e.kind}`,{cls:e},T(t));const o=n.map(u=>Ke(u,r,s)),i=e.value;return Ee(new i(...o))}class at{constructor(t,n){Oe(this,"args");Oe(this,"pos");this.args=t,this.pos=n}}function Bn(e,t){if(e.restParam===null)return t;const n=t.slice(0,e.params.length),r=t.slice(e.params.length),s=r.length>0?a.list(r):a.nil();return[...n,s]}function to(e,t){const n=e.find(o=>o.restParam===null&&o.params.length===t);if(n)return n;const r=e.find(o=>o.restParam!==null&&t>=o.params.length);if(r)return r;const s=e.map(o=>o.restParam?`${o.params.length}+`:`${o.params.length}`);throw new f(`No matching arity for ${t} arguments. Available arities: ${s.join(", ")}`,{arities:e,argCount:t})}function xh(e){const t=e.allNamespaces().find(s=>s.name==="clojure.core");if(!t)return null;const n=t.vars.get("*hierarchy*");if(!n)return null;const r=n.dynamic&&n.bindingStack&&n.bindingStack.length>0?n.bindingStack[n.bindingStack.length-1]:n.value;return c.map(r)?r:null}function $h(e,t,n){if(c.equal(t,n))return!0;for(const[r,s]of e.entries)if(!(!c.keyword(r)||r.name!==":ancestors")){if(!c.map(s))return!1;for(const[o,i]of s.entries)if(c.equal(o,t))return c.set(i)?Qn(i,n):!1;return!1}return!1}function Pr(e,t,n,r,s){const o=n.applyFunction(e.dispatchFn,t,r),i=e.methods.find(({dispatchVal:l})=>c.equal(l,o));if(i)return n.applyFunction(i.fn,t,r);const u=xh(n);if(u){const l=e.methods.filter(({dispatchVal:d})=>$h(u,o,d));if(l.length===1)return n.applyFunction(l[0].fn,t,r);if(l.length>1)throw new f(`Multiple methods in multimethod '${e.name}' match dispatch value ${x(o)}: `+l.map(d=>x(d.dispatchVal)).join(", "),{mm:e,dispatchVal:o},s?T(s):void 0)}if(e.defaultMethod)return n.applyFunction(e.defaultMethod,t,r);throw new f(`No method in multimethod '${e.name}' for dispatch value ${x(o)}`,{mm:e,dispatchVal:o},s?T(s):void 0)}const p={Constant:0,Nil:1,True:2,False:3,Pop:4,LoadLocal:10,StoreLocal:11,LoadGlobal:12,LoadQualified:13,LoadUpvalue:14,MakeVector:20,MakeMap:21,MakeSet:22,WithMeta:23,Call:30,Closure:31,Return:32,Jump:40,JumpIfFalsy:41,Loop:42,Recur:43,FnRecur:44,FnRecurRest:45,Throw:46,PushTry:47,PopTry:48,EnterFinally:49,EndFinally:50,PushBindingFrame:51,PushDynamicBinding:52,PopBindingFrame:53,SetDynamic:54,LoadVar:55,LoadLexicalVar:56,Def:57,DefMacro:58,JsGetProp:59,JsInvoke:60,JsNew:61,Add:70,Sub:71,Mul:72,Div:73,Lt:74,Lte:75,Gt:76,Gte:77,Eq:78},Mh=new Map(Object.entries(p).map(([e,t])=>[t,e]));function Hn(e){return Mh.get(e)??`Unknown(${e})`}const Gr=1e5;function vn(e){const t=Sh(e);try{return qh(t)}catch(n){throw Pt(n,t),n}}function Sh(e){const t=[...e.locals??[]];for(;t.length<e.chunk.localCount;)t.push(a.nil());return{ctx:e.ctx,stack:[],frames:[{chunk:e.chunk,env:e.env,locals:t,ip:0,stackBase:0,fnName:e.rootFnName??e.chunk.name??null,callPos:null,closure:e.closure??null,unwindStack:[]}],done:!1,result:null,openUpvalues:[],pendingAbrupt:null}}function qh(e){for(;!e.done;){try{Fh(e)}catch(t){pi(e,t)}Oh(e)}return e.result??a.nil()}function Fh(e){var m,h,b,M;const t=no(e),{chunk:n,env:r,locals:s}=t,{ctx:o,stack:i}=e;if(t.ip>=n.code.length){Lo(e,a.nil());return}const u=t.ip,l=n.code[t.ip++],d=Zh(n,u);switch(l){case p.Constant:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid constant index: ${v}`,{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},d);i.push(y);break}case p.LoadLocal:{const v=n.code[t.ip++],y=s[v];if(y===void 0)throw new f(`Invalid local index: ${v}`,{instruction:l,slot:v,ip:t.ip,stack:i,chunk:n},d);i.push(y);break}case p.LoadUpvalue:{const v=n.code[t.ip++],y=(m=t.closure)==null?void 0:m.upvalues[v];if(y===void 0)throw new f(`Invalid upvalue index: ${v}`,{instruction:l,slot:v,ip:t.ip,stack:i,chunk:n},d);i.push(hi(y));break}case p.StoreLocal:{const v=n.code[t.ip++];if(v===void 0||v<0||v>=s.length)throw new f(`Invalid local index: ${v}`,{instruction:l,slot:v,ip:t.ip,stack:i,chunk:n},d);const y=i.pop();if(y===void 0)throw new f("VM stack underflow on StoreLocal",{instruction:l,slot:v,ip:t.ip,stack:i,chunk:n},d);s[v]=y;break}case p.LoadGlobal:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid constant index: ${v}`,{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},d);if(!c.symbol(y))throw new f("LoadGlobal expected symbol constant",{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},d);try{i.push(jh(n,y,v,r))}catch($){throw Bt($,T(y)??d),$}break}case p.LoadQualified:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid constant index: ${v}`,{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},d);if(!c.symbol(y))throw new f("LoadQualified expected symbol constant",{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},d);const $=y.name.indexOf("/");if($<=0||$>=y.name.length-1)throw new f(`Invalid qualified symbol: ${y.name}`,{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},T(y)??d);const R=y.name.slice(0,$),E=y.name.slice($+1),le=((h=Ae(r).ns)==null?void 0:h.aliases.get(R))??o.resolveNs(R)??null;if(!le)throw new f(`No such namespace or alias: ${R}`,{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},T(y)??d);const P=le.vars.get(E);if(P===void 0)throw new f(`Symbol ${y.name} not found`,{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},T(y)??d);i.push(Ie(P));break}case p.LoadVar:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid constant index: ${v}`,{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},d);if(!c.symbol(y))throw new f("var expects a symbol",{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},d);i.push(Po(y,r,o,d));break}case p.Def:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid constant index: ${v}`,{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},d);if(!c.symbol(y))throw new f("def expects a symbol constant",{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},d);const $=i.pop();if($===void 0)throw new f("VM stack underflow on Def",{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},T(y)??d);i.push(Ar({name:y,value:$,env:r,ctx:o}));break}case p.DefMacro:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid constant index: ${v}`,{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},d);if(!c.symbol(y))throw new f("defmacro expects a symbol constant",{instruction:l,constantIndex:v,value:y,ip:t.ip,stack:i,chunk:n},d);const $=i.pop();if($===void 0)throw new f("VM stack underflow on DefMacro",{instruction:l,constantIndex:v,ip:t.ip,stack:i,chunk:n},T(y)??d);if(!c.function($))throw new f("defmacro expects a function value",{instruction:l,constantIndex:v,value:$,ip:t.ip,stack:i,chunk:n},T(y)??d);const R=a.multiArityMacro($.arities,$.env);R.name=y.name,$.meta&&(R.meta=$.meta),i.push(li({name:y,macro:R,env:r,ctx:o}));break}case p.LoadLexicalVar:{const v=n.code[t.ip++],y=n.lexicalVarLookups[v];if(y===void 0)throw new f(`Invalid lexical var lookup index: ${v}`,{instruction:l,lookupIndex:v,ip:t.ip,stack:i,chunk:n},d);const $=Ah(y.candidates,t,i,l,d);i.push($??Po(y.symbol,r,o,d));break}case p.JsGetProp:{const v=jo(t,i,l,"JsGetProp",d),y=i.pop();if(y===void 0)throw new f("VM stack underflow on JsGetProp",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const $=a.string(v);try{i.push(_r(y,$,v))}catch(R){throw Bt(R,d),Pt(R,e),R}break}case p.JsInvoke:{const v=jo(t,i,l,"JsInvoke",d),y=n.code[t.ip++];if(Ht(y,"JsInvoke",l,t.ip,i,n,d),i.length<y+1)throw new f("VM stack underflow on JsInvoke, not enough target/arguments",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const $=i.splice(i.length-y,y),R=i.pop();if(R===void 0)throw new f("VM stack underflow on JsInvoke, target missing",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const E=a.string(v);try{i.push(Zs(R,E,v,E,$,o,r))}catch(U){throw Bt(U,d),Pt(U,e),U}break}case p.JsNew:{const v=n.code[t.ip++];if(Ht(v,"JsNew",l,t.ip,i,n,d),i.length<v+1)throw new f("VM stack underflow on JsNew, not enough constructor/arguments",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const y=i.splice(i.length-v,v),$=i.pop();if($===void 0)throw new f("VM stack underflow on JsNew, constructor missing",{instruction:l,ip:t.ip,stack:i,chunk:n},d);try{i.push(eo($,a.symbol("js/new"),y,o,r))}catch(R){throw Bt(R,d),Pt(R,e),R}break}case p.Nil:{i.push(a.nil());break}case p.True:{i.push(a.boolean(!0));break}case p.False:{i.push(a.boolean(!1));break}case p.Pop:{if(i.pop()===void 0)throw new f("VM stack underflow on Pop",{instruction:l,ip:t.ip,stack:i,chunk:n},d);break}case p.MakeVector:{const v=n.code[t.ip++];if(Ht(v,"MakeVector",l,t.ip,i,n,d),v===0){i.push(a.vector([]));break}if(i.length<v)throw new f("VM stack underflow on MakeVector, not enough elements",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const y=i.splice(i.length-v,v);i.push(a.vector(y));break}case p.MakeMap:{const v=n.code[t.ip++];if(Ht(v,"MakeMap",l,t.ip,i,n,d),v===0){i.push(a.map([]));break}if(i.length<v*2)throw new f("VM stack underflow on MakeMap, not enough entries",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const y=i.splice(i.length-v*2,v*2),$=[];for(let R=0;R<y.length;R+=2)$.push([y[R],y[R+1]]);i.push(a.map($));break}case p.MakeSet:{const v=n.code[t.ip++];if(Ht(v,"MakeSet",l,t.ip,i,n,d),v===0){i.push(a.set([]));break}if(i.length<v)throw new f("VM stack underflow on MakeSet, not enough elements",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const y=i.splice(i.length-v,v);i.push(a.set(y));break}case p.WithMeta:{const v=n.code[t.ip++],y=n.constants[v];if(y===void 0)throw new f(`Invalid metadata constant index: ${v}`,{instruction:l,metaIndex:v,ip:t.ip,stack:i,chunk:n},d);if(!c.map(y))throw new f(`VM WithMeta expected metadata map, got ${x(y)}`,{instruction:l,metaIndex:v,meta:y,ip:t.ip,stack:i,chunk:n},d);if(i.length<1)throw new f("VM stack underflow on WithMeta, no value to attach metadata to",{instruction:l,metaIndex:v,ip:t.ip,stack:i,chunk:n},d);const $=i[i.length-1];if(!c.vector($)&&!c.map($))throw new f(`VM WithMeta does not support ${$.kind}`,{instruction:l,metaIndex:v,value:$,ip:t.ip,stack:i,chunk:n},d);i[i.length-1]=Qs($,y);break}case p.Closure:{const v=n.code[t.ip++];if(v===void 0||!Number.isInteger(v)||v<0||v>=n.innerFunctions.length)throw new f(`Invalid closure template index: ${v}`,{instruction:l,templateIndex:v,ip:t.ip,stack:i,chunk:n},d);const y=n.innerFunctions[v],$=y.upvalueDescriptors.map(P=>{var _;if(P.isLocal)return Wh(e,t,P.index);const S=(_=t.closure)==null?void 0:_.upvalues[P.index];if(S===void 0)throw new f(`Invalid enclosing upvalue index: ${P.index}`,{instruction:l,descriptor:P,templateIndex:v,ip:t.ip,stack:i,chunk:n},d);return S}),R={env:r,upvalues:$,name:y.name},E=a.multiArityFunction(y.arities.map(P=>({params:P.params,restParam:P.restParam,body:P.body,bytecodeBody:P.chunk,vmClosure:R})),r),U=((b=Ae(r).ns)==null?void 0:b.name)??"user",le=(M=o.allocateFunctionIdentity)==null?void 0:M.call(o,{nsName:U,name:y.name});le&&(E.id=le.id,E.evalId=le.evalId,E.displayName=le.displayName),y.name&&(E.name=y.name),y.meta&&(E.meta=y.meta),i.push(E);break}case p.Call:{const v=t.ip-1,y=n.code[t.ip++];if(Ht(y,"Call",l,t.ip,i,n,d),i.length<y+1)throw new f("VM stack underflow on Call, not enough arguments",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const $=i.splice(i.length-y,y),R=i.pop();if(R===void 0)throw new f("VM stack underflow on Call, callable missing",{instruction:l,ip:t.ip,stack:i,chunk:n},d);if(c.multiMethod(R)){try{const E=Jh(e,R,$,r,d);i.push(E)}catch(E){throw Bt(E,d),Pt(E,e),E}break}if(!c.callable(R)){const E="name"in R?R.name:x(R);throw new f(`${E} is not callable`,{instruction:l,ip:t.ip,stack:i,chunk:n},d)}try{if(Uh(e,R,$,d))break;const E=gi(e,R,$,r,d);i.push(E)}catch(E){throw Bt(E,d,n,v),Pt(E,e),E}break}case p.Add:bt(e,"+",l,d);break;case p.Sub:bt(e,"-",l,d);break;case p.Mul:bt(e,"*",l,d);break;case p.Div:bt(e,"/",l,d);break;case p.Lt:bt(e,"<",l,d);break;case p.Lte:bt(e,"<=",l,d);break;case p.Gt:bt(e,">",l,d);break;case p.Gte:bt(e,">=",l,d);break;case p.Eq:bt(e,"=",l,d);break;case p.Return:{const v=i.pop();Lo(e,v??a.nil());break}case p.Throw:{const v=i.pop();if(v===void 0)throw new f("VM stack underflow on Throw",{instruction:l,ip:t.ip,stack:i,chunk:n},d);e.pendingAbrupt={kind:"throw",thrown:v,original:new tt(v),catchable:!0};break}case p.PushTry:{const v=Ch(t,i,l,d),y=Rh(t,i,l,d),$=Ao(t,i,l,d);_h(t,i.length,v,y,$);break}case p.PopTry:{Lh(t,i,l,d);break}case p.EnterFinally:{const v=Ao(t,i,l,d);Nh(t,i.length,v);break}case p.EndFinally:{const v=Eh(t,i,l,d);e.pendingAbrupt=v.pendingAbrupt,e.pendingAbrupt===null&&(t.ip=v.afterIp);break}case p.PushBindingFrame:{Ph(t,i.length);break}case p.PushDynamicBinding:{const v=_o(t,i,l,d,"dynamic binding symbol"),y=i.pop();if(y===void 0)throw new f("VM stack underflow on PushDynamicBinding",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const $=Th(t,i,l,d),R=No(v,r,o);R.bindingStack??(R.bindingStack=[]),R.bindingStack.push(y),$.boundVars.push(R);break}case p.PopBindingFrame:{const v=Vh(t,i,l,d);mi(v);break}case p.SetDynamic:{const v=_o(t,i,l,d,"set! target symbol"),y=i.pop();if(y===void 0)throw new f("VM stack underflow on SetDynamic",{instruction:l,ip:t.ip,stack:i,chunk:n},d);const $=No(v,r,o);if(!$.bindingStack||$.bindingStack.length===0)throw new f(`Cannot set! ${$.ns}/${$.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,{sym:v},d);$.bindingStack[$.bindingStack.length-1]=y,i.push(y);break}case p.Jump:{const v=n.code[t.ip++];Eo(v,l,t.ip,i,n,d),t.ip+=v;break}case p.JumpIfFalsy:{const v=n.code[t.ip++];Eo(v,l,t.ip,i,n,d);const y=i.pop();if(y===void 0)throw new f("VM stack underflow on JumpIfFalsy",{instruction:l,ip:t.ip,stack:i,chunk:n},d);c.falsy(y)&&(t.ip+=v);break}case p.Recur:{const v=n.code[t.ip++],y=n.code[t.ip++],$=n.code[t.ip++];if(v===void 0||v<0||v>s.length||v===s.length&&y!==0)throw new f(`Invalid local start index: ${v}`,{instruction:l,localStart:v,localCount:y,loopHeader:$},d);if(y===void 0||y<0||v+y>s.length)throw new f(`Invalid local count: ${y}`,{instruction:l,localStart:v,localCount:y,loopHeader:$},d);if($===void 0||$<0||$>=n.code.length)throw new f(`Invalid loop header index: ${$}`,{instruction:l,localStart:v,localCount:y,loopHeader:$},d);if(i.length<y)throw new f("VM stack underflow on Recur, not enough arguments",{instruction:l,localStart:v,localCount:y,loopHeader:$},d);const R=i.splice(i.length-y,y);ro(e,t,v);for(let E=0;E<y;E++)s[v+E]=R[E];t.ip=$;break}case p.FnRecur:{const v=n.code[t.ip++];if(v===void 0||v<0||v>s.length)throw new f(`Invalid function recur argument count: ${v}`,{instruction:l,argCount:v},d);if(i.length<v)throw new f("VM stack underflow on FnRecur, not enough arguments",{instruction:l,argCount:v},d);const y=i.splice(i.length-v,v);for(let $=0;$<v;$++)s[$]=y[$];t.ip=0;break}case p.FnRecurRest:{const v=n.code[t.ip++],y=n.code[t.ip++];if(v===void 0||v<0||y===void 0||y<0||y>=s.length||v<y)throw new f(`Invalid variadic function recur operands: ${v}, ${y}`,{instruction:l,argCount:v,fixedParamCount:y},d);if(i.length<v)throw new f("VM stack underflow on FnRecurRest, not enough arguments",{instruction:l,argCount:v,fixedParamCount:y},d);const $=i.splice(i.length-v,v);for(let E=0;E<y;E++)s[E]=$[E];const R=$.slice(y);s[y]=R.length>0?a.list(R):a.nil(),t.ip=0;break}default:throw new f(`Unknown VM opcode: ${Hn(l)}`,{instruction:l,ip:t.ip,stack:i,chunk:n},d)}}function no(e){const t=e.frames[e.frames.length-1];if(t===void 0)throw new f("VM has no active call frame",{stack:e.stack});return t}function Ih(e){return e.frames[e.frames.length-1]??null}function jo(e,t,n,r,s){const{chunk:o}=e,i=o.code[e.ip++],u=i===void 0?void 0:o.constants[i];if(u===void 0||!c.string(u))throw new f(`${r} expected string constant`,{instruction:n,constantIndex:i,value:u,ip:e.ip,stack:t,chunk:o},s);return u.value}function Ch(e,t,n,r){const{chunk:s}=e,o=s.code[e.ip++];if(o===void 0||!Number.isInteger(o)||o<0||o>=s.catchTables.length)throw new f(`Invalid catch table index: ${o}`,{instruction:n,catchTableIndex:o,ip:e.ip,stack:t,chunk:s},r);return o}function Rh(e,t,n,r){const{chunk:s}=e,o=s.code[e.ip++];if(o===void 0||!Number.isInteger(o)||o!==-1&&(o<0||o>=s.code.length))throw new f(`Invalid finally instruction pointer: ${o}`,{instruction:n,finallyIp:o,ip:e.ip,stack:t,chunk:s},r);return o}function Ao(e,t,n,r){const{chunk:s}=e,o=s.code[e.ip++];if(o===void 0||!Number.isInteger(o)||o<0||o>s.code.length)throw new f(`Invalid after instruction pointer: ${o}`,{instruction:n,afterIp:o,ip:e.ip,stack:t,chunk:s},r);return o}function _o(e,t,n,r,s){const{chunk:o}=e,i=o.code[e.ip++],u=o.constants[i];if(!c.symbol(u))throw new f(`Invalid ${s} constant index: ${i}`,{instruction:n,constantIndex:i,ip:e.ip,stack:t,chunk:o},r);return u}function jh(e,t,n,r){let s=r;for(;s;){const o=s.bindings.get(t.name);if(o!==void 0)return o;const i=s.ns;if(i!==void 0){const u=e.globalVarCache[n];if(u!==void 0&&u.ns===i)return Ie(u.var);const l=i.vars.get(t.name);if(l!==void 0)return e.globalVarCache[n]={ns:i,var:l},Ie(l)}s=s.outer}throw new f(`Symbol ${t.name} not found`,{name:t.name})}function Po(e,t,n,r){var u;const s=T(e)??r,o=e.name.indexOf("/");if(o>0&&o<e.name.length-1){const l=e.name.slice(0,o),d=e.name.slice(o+1),h=((u=Ae(t).ns)==null?void 0:u.aliases.get(l))??n.resolveNs(l)??null;if(!h)throw new f(`No such namespace: ${l}`,{sym:e},s);const b=h.vars.get(d);if(!b)throw new f(`Var ${e.name} not found`,{sym:e},s);return b}const i=qt(e.name,t);if(!i)throw new f(`Unable to resolve var: ${e.name} in this context`,{sym:e},s);return i}function Ah(e,t,n,r,s){var o;for(const i of e){let u;if(i.kind==="local"){const l=t.locals[i.slot];if(l===void 0)throw new f(`Invalid lexical var local slot: ${i.slot}`,{instruction:r,slot:i.slot,ip:t.ip,stack:n,chunk:t.chunk},s);u=l}else{const l=(o=t.closure)==null?void 0:o.upvalues[i.slot];if(l===void 0)throw new f(`Invalid lexical var upvalue slot: ${i.slot}`,{instruction:r,slot:i.slot,ip:t.ip,stack:n,chunk:t.chunk},s);u=hi(l)}if(c.var(u))return u}return null}function _h(e,t,n,r,s){e.unwindStack.push({kind:"try",stackDepth:t,catchTableIndex:n,finallyIp:r,afterIp:s})}function Ph(e,t){e.unwindStack.push({kind:"binding-frame",stackDepth:t,boundVars:[]})}function Nh(e,t,n){e.unwindStack.push({kind:"finally-continuation",stackDepth:t,afterIp:n,pendingAbrupt:null})}function Lh(e,t,n,r){const s=e.unwindStack.pop();if(s===void 0||s.kind!=="try")throw new f("VM unwind stack underflow on PopTry",{instruction:n,ip:e.ip,stack:t,chunk:e.chunk},r);return s}function Eh(e,t,n,r){const s=e.unwindStack.pop();if(s===void 0||s.kind!=="finally-continuation")throw new f("VM unwind stack underflow on EndFinally",{instruction:n,ip:e.ip,stack:t,chunk:e.chunk},r);return s}function Th(e,t,n,r){const s=e.unwindStack[e.unwindStack.length-1];if(s===void 0||s.kind!=="binding-frame")throw new f("VM has no active binding frame",{instruction:n,ip:e.ip,stack:t,chunk:e.chunk},r);return s}function Vh(e,t,n,r){const s=e.unwindStack.pop();if(s===void 0||s.kind!=="binding-frame")throw new f("VM unwind stack underflow on PopBindingFrame",{instruction:n,ip:e.ip,stack:t,chunk:e.chunk},r);return s}function mi(e){for(let t=e.boundVars.length-1;t>=0;t--)e.boundVars[t].bindingStack.pop()}function No(e,t,n){var o;const r=e.name.indexOf("/");let s;if(r>0&&r<e.name.length-1){const i=e.name.slice(0,r),u=e.name.slice(r+1),d=((o=Ae(t).ns)==null?void 0:o.aliases.get(i))??n.resolveNs(i)??null;if(!d)throw new f(`No such namespace: ${i}`,{sym:e},T(e));s=d.vars.get(u)}else s=qt(e.name,t);if(!s)throw new f(`No var found for symbol '${e.name}' in binding form`,{sym:e},T(e));if(!s.dynamic)throw new f(`Cannot use binding with non-dynamic var ${s.ns}/${s.name}. Mark it dynamic with (def ^:dynamic ${e.name} ...)`,{sym:e},T(e));return s}function pi(e,t){if(t instanceof at)throw t;if(t instanceof tt){e.pendingAbrupt={kind:"throw",thrown:t.value,original:t,catchable:!0};return}if(Yn(t)){Pt(t,e),e.pendingAbrupt={kind:"throw",thrown:Hh(t,e.ctx),original:t,catchable:!0};return}throw t}function Oh(e){for(;e.pendingAbrupt!==null&&!e.done;){const t=Ih(e);t===null&&Bh(e);const n=t.unwindStack.pop();if(n===void 0){zh(e,t);continue}if(e.stack.length=n.stackDepth,n.kind==="try"){if(Gh(e,t,n))return;if(n.finallyIp!==-1){Dh(e,t,n.finallyIp,n.afterIp);return}continue}if(n.kind==="finally-continuation"){if(e.pendingAbrupt!==null)continue;if(e.pendingAbrupt=n.pendingAbrupt,e.pendingAbrupt===null){t.ip=n.afterIp;return}}if(n.kind==="binding-frame"){mi(n);continue}}}function Dh(e,t,n,r){t.unwindStack.push({kind:"finally-continuation",stackDepth:e.stack.length,afterIp:r,pendingAbrupt:e.pendingAbrupt}),e.pendingAbrupt=null,t.ip=n}function Gh(e,t,n){const r=e.pendingAbrupt;if(r===null||!r.catchable)return!1;const s=t.chunk.catchTables[n.catchTableIndex];if(s===void 0)throw new f("VM catch table missing during unwind",{catchTableIndex:n.catchTableIndex,chunk:t.chunk});for(const o of s.clauses){const i=o.discriminatorSlot>=0?t.locals[o.discriminatorSlot]??o.discriminator:o.discriminator;let u;try{u=bh(i,r.thrown,t.env,e.ctx)}catch(l){return pi(e,l),!1}if(u){if(o.bindingSlot<0||o.bindingSlot>=t.locals.length)throw new f("Invalid catch binding local slot",{bindingSlot:o.bindingSlot,chunk:t.chunk});if(o.bodyIp<0||o.bodyIp>=t.chunk.code.length)throw new f("Invalid catch body instruction pointer",{bodyIp:o.bodyIp,chunk:t.chunk});return t.locals[o.bindingSlot]=r.thrown,e.pendingAbrupt=null,t.ip=o.bodyIp,!0}}return!1}function zh(e,t){ro(e,t,0),e.stack.length=t.stackBase,e.frames.pop()}function Bh(e){const t=e.pendingAbrupt;throw e.pendingAbrupt=null,t===null?new f("VM abrupt completion missing reason",{stack:e.stack}):t.original}function Hh(e,t){return di(e,t)}function Lo(e,t){const n=no(e);if(ro(e,n,0),e.stack.length=n.stackBase,e.frames.pop(),e.frames.length===0){e.done=!0,e.result=t;return}e.stack.push(t)}function Uh(e,t,n,r){if(!c.function(t))return!1;let s;try{s=to(t.arities,n.length)}catch{return!1}return s.bytecodeBody===void 0?!1:(Kh(e,t,s,n,r),!0)}function Kh(e,t,n,r,s){const o=n.bytecodeBody;if(o===void 0)throw new f("Internal VM error: cannot push frame without bytecode body",{fn:t,arity:n},s);if(e.frames.length>=Gr)throw new f(`Stack overflow: exceeded ${Gr} VM call frames. Use loop/recur for unbounded iteration.`,{fn:t,arity:n,frameLimit:Gr},s);const i=[...Bn(n,r)];for(;i.length<o.localCount;)i.push(a.nil());o.selfSlot>=0&&(i[o.selfSlot]=t),e.frames.push({chunk:o,env:t.env,locals:i,ip:0,stackBase:e.stack.length,fnName:t.name??o.name??null,callPos:s??null,closure:n.vmClosure??null,unwindStack:[]})}function hi(e){return e.frame!==null?e.frame.locals[e.slot]??a.nil():e.closedValue??a.nil()}function Wh(e,t,n){const r=e.openUpvalues.find(o=>o.frame===t&&o.slot===n);if(r!==void 0)return r;const s={frame:t,slot:n,closedValue:null};return e.openUpvalues.push(s),s}function ro(e,t,n){if(e.openUpvalues.length===0)return;const r=[];for(const s of e.openUpvalues)s.frame===t&&s.slot>=n?(s.closedValue=t.locals[s.slot]??a.nil(),s.frame=null):r.push(s);e.openUpvalues=r}function gi(e,t,n,r,s){const o={fnName:Qh(t),line:null,col:null,source:e.ctx.currentFile??null,pos:s??null};e.ctx.frameStack.push(o);try{return e.ctx.applyCallable(t,n,r)}catch(i){throw vi(i,e),i}finally{e.ctx.frameStack.pop()}}function Jh(e,t,n,r,s){const o={fnName:t.name??null,line:null,col:null,source:e.ctx.currentFile??null,pos:s??null};e.ctx.frameStack.push(o);try{return Pr(t,n,e.ctx,r)}catch(i){throw vi(i,e),i}finally{e.ctx.frameStack.pop()}}function Qh(e){return c.function(e)||c.nativeFunction(e)||c.multiMethod(e)?e.name??null:c.keyword(e)?e.name:null}function Pt(e,t,n=[]){if(!Yn(e)||e.frames)return;const r=[...t.ctx.frameStack].reverse(),s=yi(r,t.frames);e.frames=[...n,...bi(t.frames,s),...r]}function vi(e,t){if(!Yn(e)||e.frames)return;const n=[...t.ctx.frameStack].reverse(),r=yi(n,t.frames);e.frames=[...n,...bi(t.frames,r)]}function yi(e,t){const n=t[0];return n===void 0||n.fnName==="vm-expression"?!1:e.length===0?!0:e[0].fnName!==n.fnName}function bi(e,t){const n=t?0:1;return e.slice(n).reverse().map(r=>({fnName:r.fnName==="vm-fn-body"?null:r.fnName,line:null,col:null,source:null,pos:r.callPos}))}function bt(e,t,n,r){const s=no(e),o=s.ip-1,i=s.chunk.code[s.ip++];if(Ht(i,Hn(n),n,s.ip,e.stack,s.chunk,r),e.stack.length<i)throw new f(`VM stack underflow on ${Hn(n)}, not enough arguments`,{instruction:n,ip:s.ip,stack:e.stack,chunk:s.chunk},r);const u=e.stack.splice(e.stack.length-i,i);try{const l=ni(t,s.env);if(Yh(t,l,e.ctx)){e.stack.push(Xh(t,u));return}if(!c.callable(l))throw new f(`${t} is not callable`,{instruction:n,ip:s.ip,stack:e.stack,chunk:s.chunk},r);e.stack.push(gi(e,l,u,s.env,r))}catch(l){throw Bt(l,r,s.chunk,o),Pt(l,e,[{fnName:t,line:null,col:null,source:null,pos:r??null}]),l}}function Yh(e,t,n){var s;const r=(s=n.resolveNs("clojure.core"))==null?void 0:s.vars.get(e);return r!==void 0&&Ie(r)===t&&c.nativeFunction(t)&&t.name===e}function It(e,t,n){const r=t[n];if(!c.number(r))throw f.atArg(`${e} expects all arguments to be numbers`,{args:t},n);return r.value}function Xh(e,t){switch(e){case"+":{let n=0;for(let r=0;r<t.length;r++)n+=It(e,t,r);return a.number(n)}case"-":{if(t.length===0)throw new f("- expects at least one argument",{args:t});let n=It(e,t,0);if(t.length===1)return a.number(-n);for(let r=1;r<t.length;r++)n-=It(e,t,r);return a.number(n)}case"*":{let n=1;for(let r=0;r<t.length;r++)n*=It(e,t,r);return a.number(n)}case"/":{if(t.length===0)throw new f("/ expects at least one argument",{args:t});if(t.length===1){const r=It(e,t,0);if(r===0)throw f.atArg("division by zero",{args:t},0);return a.number(1/r)}let n=It(e,t,0);for(let r=1;r<t.length;r++){const s=It(e,t,r);if(s===0)throw f.atArg("division by zero",{args:t},r);n/=s}return a.number(n)}case"<":case">":case"<=":case">=":{if(t.length<2)throw new f(`${e} expects at least two arguments`,{args:t});const n=t.map((s,o)=>It(e,t,o));let r=n[0];for(let s=1;s<n.length;s++){const o=n[s];let i;switch(e){case"<":i=r<o;break;case">":i=r>o;break;case"<=":i=r<=o;break;case">=":i=r>=o;break}if(!i)return a.boolean(!1);r=o}return a.boolean(!0)}case"=":{if(t.length<2)throw new f("= expects at least two arguments",{args:t});for(let n=1;n<t.length;n++)if(!c.equal(t[n],t[n-1]))return a.boolean(!1);return a.boolean(!0)}}}function Zh(e,t){return e.positions[t]??void 0}function Bt(e,t,n,r){var o,i;if(!Yn(e)||e.pos)return;const s=(o=e.data)==null?void 0:o.argIndex;if(n&&r!==void 0&&typeof s=="number"){const u=(i=n.callArgPositions[r])==null?void 0:i[s];if(u){e.pos=u;return}}t&&(e.pos=t)}function Eo(e,t,n,r,s,o){if(e===void 0||!Number.isInteger(e)||e<0||n+e>s.code.length)throw new f(`Invalid jump offset: ${e}`,{instruction:t,offset:e,ip:n,stack:r,chunk:s},o)}function Ht(e,t,n,r,s,o,i){if(e===void 0||!Number.isInteger(e)||e<0)throw new f(`Invalid ${t} count: ${e}`,{instruction:n,count:e,ip:r,stack:s,chunk:o},i)}function Nr(e){const t=new Array(e);for(let n=0;n<e;n++)t[n]=xt();return{slots:t,upvalues:[]}}const eg=new Set(["const","quote","vector","map","set","local","var","js-var","the-var","if","do","invoke","let","binding","fn","fn-method","letfn","loop","recur","throw","try","catch","def","dynamic","set!","host-call","host-field","new","async","ns"]);function fs(e){if(!eg.has(e.op))return e.op;for(const t of e.children){const n=e[t];if(n!=null)if(Array.isArray(n))for(const r of n){if(r==null)continue;const s=fs(r);if(s!==null)return s}else{const r=fs(n);if(r!==null)return r}}return null}function wi(e,t){const n=e.value[1];if(!c.vector(n))throw new f("binding requires a vector of bindings",{list:e,env:t},T(e));if(n.value.length%2!==0)throw new f("binding vector must have an even number of forms",{list:e,env:t},T(n)??T(e));return n.value}function ki(e,t){if(!c.symbol(e))throw new f("binding left-hand side must be a symbol",{sym:e},T(e)??T(t));return e}function xi(e,t,n){var o;const r=e.name.indexOf("/");let s;if(r>0&&r<e.name.length-1){const i=e.name.slice(0,r),u=e.name.slice(r+1),d=((o=Ae(t).ns)==null?void 0:o.aliases.get(i))??n.resolveNs(i)??null;if(!d)throw new f(`No such namespace: ${i}`,{sym:e},T(e));s=d.vars.get(u)}else s=qt(e.name,t);if(!s)throw new f(`No var found for symbol '${e.name}' in binding form`,{sym:e},T(e));if(!s.dynamic)throw new f(`Cannot use binding with non-dynamic var ${s.ns}/${s.name}. Mark it dynamic with (def ^:dynamic ${e.name} ...)`,{sym:e},T(e));return s}function $i(e,t){const n=qt(e.name,t);if(!n)throw new f(`Unable to resolve var: ${e.name} in this context`,{symForm:e,env:t},T(e));if(!n.dynamic)throw new f(`Cannot set! non-dynamic var ${n.ns}/${n.name}. Mark it with ^:dynamic.`,{symForm:e,env:t},T(e));if(!n.bindingStack||n.bindingStack.length===0)throw new f(`Cannot set! ${n.ns}/${n.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,{symForm:e,env:t},T(e));return n}function tg(e,t,n){var o;const r=e.name.indexOf("/");if(r>0&&r<e.name.length-1){const i=e.name.slice(0,r),u=e.name.slice(r+1),d=((o=Ae(t).ns)==null?void 0:o.aliases.get(i))??n.resolveNs(i)??null;if(!d)throw new f(`No such namespace: ${i}`,{sym:e},T(e));const m=d.vars.get(u);if(!m)throw new f(`Var ${e.name} not found`,{sym:e},T(e));return m}const s=qt(e.name,t);if(!s)throw new f(`Unable to resolve var: ${e.name} in this context`,{sym:e},T(e));return s}function ke(e){return a.keyword(`:${e}`)}function ng(e){return e===null?a.nil():a.map([[ke("start"),a.number(e.start)],[ke("end"),a.number(e.end)]])}function rg(e){return a.map([[ke("name"),a.symbol(e.name)],[ke("local?"),a.boolean(e.isLocal)],[ke("index"),a.number(e.index)]])}function sg(e){return Array.isArray(e)?a.vector(e.map(t=>ms(t))):e==null?a.nil():ms(e)}function ms(e){const t=[[ke("op"),ke(e.op)],[ke("form"),e.form],[ke("context"),ke(e.env.context)],[ke("pos"),ng(e.pos)],[ke("children"),a.vector(e.children.map(n=>ke(n)))]];for(const[n,r]of og(e))t.push([ke(n),r]);for(const n of e.children){const r=e[n];t.push([ke(n),sg(r)])}return e.rawForms!==void 0&&t.push([ke("raw-forms"),a.vector(e.rawForms)]),a.map(t)}function og(e){switch(e.op){case"const":return[["type",ke(e.type)],["val",e.val],["literal?",a.boolean(!0)]];case"local":{const t=[["name",a.symbol(e.name)],["local",ke(e.localKind)],["slot",a.number(e.slot)],["resolved",ke(e.resolved)]];return e.upvalueIndex!==void 0&&t.push(["upvalue-index",a.number(e.upvalueIndex)]),e.argId!==void 0&&t.push(["arg-id",a.number(e.argId)]),e.variadic!==void 0&&t.push(["variadic?",a.boolean(e.variadic)]),t}case"var":return[["name",a.symbol(e.name)],["ns",e.ns!==null?a.symbol(e.ns):a.nil()],["resolved?",a.boolean(e.resolved)]];case"the-var":return[["name",a.symbol(e.name)],["ns",e.ns!==null?a.symbol(e.ns):a.nil()],["resolved?",a.boolean(e.resolved)],["lexical-candidates",a.vector(e.lexicalCandidates.map(t=>a.map([[ke("kind"),ke(t.kind)],[ke("slot"),a.number(t.slot)]])))]];case"js-var":return[["name",a.symbol(e.name)],["segments",a.vector(e.segments.map(t=>a.string(t)))]];case"host-call":return[["method",a.symbol(e.method)]];case"host-field":return[["field",a.symbol(e.field)],["assignable?",a.boolean(!0)]];case"do":return[["body?",a.boolean(e.body)]];case"loop":return[["loop-arity",a.number(e.loopArity)]];case"fn":return[["name",e.name!==null?a.symbol(e.name):a.nil()],["variadic?",a.boolean(e.variadic)],["max-fixed-arity",a.number(e.maxFixedArity)],["captures",a.vector(e.captures.map(rg))]];case"fn-method":return[["fixed-arity",a.number(e.fixedArity)],["variadic?",a.boolean(e.variadic)]];case"recur":return[["target-kind",e.targetKind!==null?ke(e.targetKind):a.nil()],["target-arity",e.targetArity!==null?a.number(e.targetArity):a.nil()]];case"def":{const t=[["name",a.symbol(e.name)],["ns",e.ns!==null?a.symbol(e.ns):a.nil()]];return e.doc!==null&&t.push(["doc",a.string(e.doc)]),e.isMacro&&t.push(["macro?",a.boolean(!0)]),t}case"binding":{const t=[["name",a.symbol(e.name)],["local",ke(e.localKind)],["slot",a.number(e.slot)],["captured?",a.boolean(e.binding.cell.captured)]];return e.argId!==void 0&&t.push(["arg-id",a.number(e.argId)]),e.variadic!==void 0&&t.push(["variadic?",a.boolean(e.variadic)]),t}case"quote":return[["literal?",a.boolean(!0)]];case"ns":return[["docstring",e.docstring!==null?a.string(e.docstring):a.nil()]];case"invalid":return[["message",a.string(e.message)],["kind",ke(e.kind)]];default:return[]}}function Mi(e){return{depth:e===null?0:e.depth+1,upvalues:[],upvalueKey:new Map,parent:e}}function ag(e,t){return{context:"expr",nsName:e,ns:t,locals:new Map,lexicalStack:new Map,closure:Mi(null),slots:{next:0},recur:null}}function en(e,t){if(t.length===0)return e;const n=new Map(e.locals),r=new Map(e.lexicalStack);for(const[s,o]of t){n.set(s,o);const i=r.get(s);r.set(s,i!==void 0?[...i,o]:[o])}return{...e,locals:n,lexicalStack:r}}function Si(e,t){return{...e,recur:t}}function qi(e){return{...e,closure:Mi(e.closure),recur:null}}function Fi(e){return{...e,slots:{next:0}}}function ig(e){return e.next++}function tn(e,t,n,r={}){return{name:t,kind:n,slot:ig(e.slots),fnDepth:e.closure.depth,argId:r.argId,variadic:r.variadic,cell:{captured:!1}}}function To(e,t,n,r){const s=`${n?1:0}:${r}`,o=e.upvalueKey.get(s);if(o!==void 0)return o;const i=e.upvalues.length;return e.upvalues.push({name:t,isLocal:n,index:r}),e.upvalueKey.set(s,i),i}function so(e,t,n,r){const s=e.parent;if(s.depth===t)return To(e,r,!0,n);const o=so(s,t,n,r);return To(e,r,!1,o)}function Ii(e,t){const n=e.locals.get(t);if(n===void 0)return;if(n.fnDepth===e.closure.depth)return{resolved:"local",binding:n};n.cell.captured=!0;const r=so(e.closure,n.fnDepth,n.slot,t);return{resolved:"upvalue",binding:n,upvalueIndex:r}}function cg(e,t){const n=e.lexicalStack.get(t);if(n===void 0||n.length===0)return[];const r=[];for(let s=n.length-1;s>=0;s--){const o=n[s];if(o.fnDepth===e.closure.depth)r.push({kind:"local",slot:o.slot});else{o.cell.captured=!0;const i=so(e.closure,o.fnDepth,o.slot,t);r.push({kind:"upvalue",slot:i})}}return r}function lg(e,t,n="expr"){se(e,n,t)}function zr(e,t,n){return{message:t,form:e.form,pos:e.pos??T(e.form)??null,kind:"malformed",code:n}}function ug(e,t){e.env={...e.env,context:t}}function se(e,t,n){switch(ug(e,t),e.op){case"const":case"local":case"var":case"the-var":case"js-var":case"ns":case"invalid":return;case"quote":se(e.expr,"expr",n);return;case"vector":case"set":for(const r of e.items)se(r,"expr",n);return;case"map":for(const r of e.keys)se(r,"expr",n);for(const r of e.vals)se(r,"expr",n);return;case"invoke":se(e.fn,"expr",n);for(const r of e.args)se(r,"expr",n);return;case"if":se(e.test,"expr",n),se(e.then,t,n),se(e.else,t,n);return;case"do":for(const r of e.statements)se(r,"statement",n);se(e.ret,t,n);return;case"let":case"letfn":for(const r of e.bindings)se(r,"expr",n);se(e.body,t,n);return;case"loop":for(const r of e.bindings)se(r,"expr",n);se(e.body,"return",n);return;case"fn":for(const r of e.methods)se(r,t,n);return;case"async":se(e.method,t,n);return;case"fn-method":for(const r of e.params)se(r,"expr",n);e.self!==null&&se(e.self,"expr",n),se(e.body,"return",n);return;case"binding":e.init!==null&&se(e.init,"expr",n);return;case"recur":if(e.targetKind===null)n.push(zr(e,"recur called outside of loop or fn","malformed/recur-outside"));else if(t!=="return")n.push(zr(e,"Can only recur from tail position","malformed/recur-tail"));else if(e.targetArity!==null){const r=e.env.recur,s=r&&r.variadic?e.targetArity+1:e.targetArity;e.exprs.length!==s&&n.push(zr(e,`recur expects ${s} arguments but got ${e.exprs.length}`,"malformed/recur-arity"))}for(const r of e.exprs)se(r,"expr",n);return;case"throw":se(e.exception,"expr",n);return;case"try":se(e.body,t,n);for(const r of e.catches)se(r,t,n);e.finallyBody!==null&&se(e.finallyBody,"statement",n);return;case"catch":e.discriminator!==null&&se(e.discriminator,"expr",n),se(e.local,"expr",n),se(e.body,t,n);return;case"def":e.metaNode!==null&&se(e.metaNode,"expr",n),e.init!==null&&se(e.init,"expr",n);return;case"dynamic":for(const r of e.bindingVars)r!==null&&se(r,"expr",n);for(const r of e.inits)se(r,"expr",n);se(e.body,t,n);return;case"host-call":se(e.target,"expr",n);for(const r of e.args)se(r,"expr",n);return;case"host-field":se(e.target,"expr",n);return;case"new":se(e.className,"expr",n);for(const r of e.args)se(r,"expr",n);return;case"set!":se(e.target,"expr",n),se(e.val,"expr",n);return}}function dg(e){const t=[];return ps(e,0,t),t}function nr(e){return"  ".repeat(e)}function fg(e){return e.env.context==="return"?" <tail>":""}function mg(e){switch(e.op){case"const":return`:const ${e.type} ${x(e.val)}`;case"quote":return":quote";case"vector":return":vector";case"map":return":map";case"set":return":set";case"local":{const t=e.resolved==="upvalue"?`:upvalue#${e.upvalueIndex}`:":local";return`:local ${e.name} slot=${e.slot} ${t}`}case"var":return`:var ${e.ns?`${e.ns}/`:""}${e.name} ${e.resolved?"resolved":"unresolved"}`;case"the-var":{const t=e.lexicalCandidates.length>0?` lexical=[${e.lexicalCandidates.map(n=>`${n.kind}#${n.slot}`).join(" ")}]`:"";return`:the-var ${e.ns?`${e.ns}/`:""}${e.name}${t}`}case"js-var":return`:js-var ${e.name}`;case"host-call":return`:host-call .${e.method}`;case"host-field":return`:host-field .-${e.field}`;case"new":return":new";case"do":return e.body?":do <body>":":do";case"if":return":if";case"let":return":let";case"loop":return`:loop arity=${e.loopArity}`;case"letfn":return":letfn";case"fn":{const t=e.name?` "${e.name}"`:" <anonymous>",n=e.captures.length>0?` captures=[${e.captures.map(s=>s.name).join(" ")}]`:"",r=e.variadic?" variadic":"";return`:fn${t}${n}${r} max-fixed=${e.maxFixedArity}`}case"fn-method":return`:fn-method fixed=${e.fixedArity}${e.variadic?" variadic":""}`;case"invoke":return":invoke";case"recur":return`:recur target=${e.targetKind??"none"}/${e.targetArity??"?"}`;case"throw":return":throw";case"try":return":try";case"catch":return":catch";case"def":return`:def ${e.name}${e.isMacro?" <macro>":""}`;case"binding":{const t=e.binding.cell.captured?" captured":"";return`:binding ${e.name} :${e.localKind} slot=${e.slot}${t}`}case"async":return`:async${e.captures.length>0?` captures=[${e.captures.map(n=>n.name).join(" ")}]`:""}`;case"ns":return`:ns${e.docstring!==null?" <doc>":""}`;case"dynamic":return":dynamic";case"set!":return":set!";case"invalid":return`:invalid (${e.kind}) ${e.message}`}}function ps(e,t,n){n.push(`${nr(t)}${mg(e)}${fg(e)}`);const r=e.rawForms;r!==void 0&&r.length>1&&n.push(`${nr(t+1)}; expanded-from ${x(r[0])}`);for(const s of e.children){const o=e[s];if(Array.isArray(o)){if(o.length===0)continue;n.push(`${nr(t+1)}:${s}`);for(const i of o)ps(i,t+2,n)}else o!=null&&(n.push(`${nr(t+1)}:${s}`),ps(o,t+2,n))}}function ye(e){var t;switch(e.kind){case A.string:return e.value;case A.character:return e.value;case A.number:return e.value.toString();case A.boolean:return e.value?"true":"false";case A.keyword:return e.name;case A.symbol:return e.name;case A.list:{const{printLength:n}=Nn(),r=n!==null?e.value.slice(0,n):e.value,s=n!==null&&e.value.length>n?" ...":"";return`(${r.map(ye).join(" ")}${s})`}case A.vector:{const{printLength:n}=Nn(),r=n!==null?e.value.slice(0,n):e.value,s=n!==null&&e.value.length>n?" ...":"";return`[${r.map(ye).join(" ")}${s}]`}case A.map:{const{printLength:n}=Nn(),r=n!==null?e.entries.slice(0,n):e.entries,s=n!==null&&e.entries.length>n?" ...":"";return`{${r.map(([o,i])=>`${ye(o)} ${ye(i)}`).join(" ")}${s}}`}case A.set:{const{printLength:n}=Nn(),r=je(e),s=n!==null?r.slice(0,n):r,o=n!==null&&r.length>n?" ...":"";return`#{${s.map(ye).join(" ")}${o}}`}case A.function:{if(e.arities.length===1){const r=e.arities[0];return`(fn [${(r.restParam?[...r.params,a.symbol("&"),r.restParam]:r.params).map(ye).join(" ")}] ${r.body.map(ye).join(" ")})`}return`(fn ${e.arities.map(r=>`([${(r.restParam?[...r.params,a.symbol("&"),r.restParam]:r.params).map(ye).join(" ")}] ${r.body.map(ye).join(" ")})`).join(" ")})`}case A.nativeFunction:return`(native-fn ${e.name})`;case A.nil:return"nil";case A.regex:return`${e.flags?`(?${e.flags})`:""}${e.pattern}`;case A.delay:return e.realized?`#<Delay @${ye(e.value)}>`:"#<Delay pending>";case A.lazySeq:{const n=$t(e);return c.nil(n)?"()":ye(n)}case A.cons:{const n=Ri(e),{printLength:r}=Nn(),s=r!==null?n.slice(0,r):n,o=r!==null&&n.length>r?" ...":"";return`(${s.map(ye).join(" ")}${o})`}case A.namespace:return`#namespace[${e.name}]`;case A.protocol:return`#protocol[${e.ns}/${e.name}]`;case A.record:{const n=e.fields.map(([r,s])=>`${ye(r)} ${ye(s)}`).join(" ");return`#${e.ns}/${e.recordType}{${n}}`}case A.multiMethod:return`(multi-method ${e.name})`;case A.atom:return`#<Atom ${ye(e.value)}>`;case A.reduced:return`#<Reduced ${ye(e.value)}>`;case A.volatile:return`#<Volatile ${ye(e.value)}>`;case A.var:return`#'${e.ns}/${e.name}`;case A.jsValue:{const n=e.value;return n===null?"null":n===void 0?"undefined":n instanceof Date?n.toISOString():typeof n=="function"?"#<js Function>":Array.isArray(n)?"#<js Array>":n instanceof Promise?"#<js Promise>":`#<js ${((t=n.constructor)==null?void 0:t.name)??"Object"}>`}case"pending":return e.resolved&&e.resolvedValue!==void 0?`#<Pending @${ye(e.resolvedValue)}>`:"#<Pending>";default:throw new f(`unhandled value type: ${e.kind}`,{value:e})}}function Ci(e,t,n){return e.realized||(t&&e.thunkFn?e.value=t.applyCallable(e.thunkFn,[],e.callEnv??n):e.value=e.thunk(),e.realized=!0),e.value}function $t(e,t,n){let r=e;for(;r.kind==="lazy-seq";){const s=r;if(s.realized){r=s.value;continue}if(s.thunk)t&&s.thunkFn?s.value=t.applyCallable(s.thunkFn,[],s.callEnv??n):s.value=s.thunk(),s.thunk=null,s.realized=!0,r=s.value;else return a.nil()}return r}const be=e=>{if(c.list(e))return e.value;if(c.vector(e))return ot(e);if(c.map(e))return e.entries.map(([t,n])=>a.mapEntry(t,n));if(c.record(e))return e.fields.map(([t,n])=>a.mapEntry(t,n));if(c.set(e))return je(e);if(c.string(e))return[...e.value].map(a.string);if(c.lazySeq(e)){const t=$t(e);return c.nil(t)?[]:be(t)}if(c.cons(e))return Ri(e);if(c.indexedSeq(e))return e.array.slice(e.offset);throw new f(`toSeq expects a collection or string, got ${x(e)}`,{collection:e})};function Ri(e){const t=[e.head];let n=e.tail;for(;!c.nil(n);){if(c.cons(n)){t.push(n.head),n=n.tail;continue}if(c.lazySeq(n)){n=$t(n);continue}if(c.list(n)){t.push(...n.value);break}if(c.vector(n)){t.push(...ot(n));break}if(c.indexedSeq(n)){t.push(...n.array.slice(n.offset));break}t.push(...be(n));break}return t}function*ji(e){let t=e;for(;;){if(c.lazySeq(t)){t=$t(t);continue}if(c.nil(t))return;if(c.cons(t)){yield t.head,t=t.tail;continue}if(c.list(t)){yield*t.value;return}if(c.vector(t)){yield*ot(t);return}if(c.indexedSeq(t)){const{array:n,offset:r}=t;for(let s=r;s<n.length;s++)yield n[s];return}yield*be(t);return}}function oo(e,t){var r;const n=e.indexOf("/");if(n>0&&n<e.length-1){const s=e.slice(0,n),o=e.slice(n+1),u=((r=Ae(t.cljEnv).ns)==null?void 0:r.aliases.get(s))??t.ctx.resolveNs(s)??null;return u==null?void 0:u.vars.get(o)}return qt(e,t.cljEnv)}function pg(e,t){const n=e.indexOf("/");if(n>0&&n<e.length-1){const r=oo(e,t);return r!==void 0?Ie(r):void 0}return Cn(e,t.cljEnv)}function Br(e){return c.cons(e)||c.lazySeq(e)||c.indexedSeq(e)?a.list(be(e)):e}function hs(e){if(c.cons(e)||c.lazySeq(e)||c.indexedSeq(e))return hs(a.list(be(e)));if(!c.list(e)||e.value.length===0)return e;const t=e.value[0];if(c.symbol(t)&&t.name==="quote")return e;const n=e.value.map(hs);return n.every((r,s)=>r===e.value[s])?e:a.list(n)}function hg(e,t){let n=Br(e);const r=[];for(let s=0;s<1e3&&(n=Br(n),!(!c.list(n)||n.value.length===0));s++){const o=n.value[0];if(!c.symbol(o))break;const i=o.name;if(i==="quote")break;try{if(i==="quasiquote"){const l=t.ctx.expandAll(n,t.cljEnv);if(l===n)break;r.push(n),n=l;continue}const u=pg(i,t);if(u===void 0||!c.macro(u))break;r.push(n),n=hs(t.ctx.applyMacro(u,n.value.slice(1)))}catch(u){throw u}}return n=Br(n),r.length>0?{expanded:n,chain:[...r,n]}:{expanded:n,chain:null}}function Z(e,t){return T(e)??T(t)??null}function gg(e){switch(e.kind){case"nil":return"nil";case"boolean":return"bool";case"number":return"number";case"string":return"string";case"character":return"char";case"keyword":return"keyword";case"symbol":return"symbol";case"regex":return"regex";case"list":case"cons":case"lazy-seq":return"seq";case"vector":return"vector";case"map":return"map";case"set":return"set";default:return"unknown"}}function Lr(e,t,n){return{op:"const",form:e,env:t,children:[],pos:n,tag:null,type:gg(e),val:e,literal:!0}}function Rn(e){return Lr({kind:"nil",value:null},e,null)}function Fe(e,t,n,r,s,o,i){return o.errors.push({message:r,form:e,pos:n,kind:s,code:i}),{op:"invalid",form:e,env:t,children:[],pos:n,tag:null,message:r,kind:s}}function Er(e,t,n,r,s){r.errors.push({message:n,form:e,pos:t,kind:"malformed",code:s})}function nn(e,t,n,r){return{op:"binding",form:e,env:r,children:n!==null?["init"]:[],pos:T(e)??null,tag:null,name:t.name,localKind:t.kind,slot:t.slot,init:n,binding:t,argId:t.argId,variadic:t.variadic}}function Ai(e,t,n,r,s){const o=e.value[1];return c.vector(o)?o.value.length%2!==0?Fe(o,t,T(o)??null,`${s} bindings must have an even number of forms`,"malformed",n,"malformed/binding-even"):o:Fe(o??e,t,o!==void 0?T(o)??null:Z(r,e),`${s} bindings must be a vector`,"malformed",n,"malformed/binding-vector")}function vg(e,t,n,r){const s=e.value[1];return c.vector(s)?s.value.length%2!==0?Fe(s,t,T(s)??Z(r,e),"letfn* bindings must have an even number of forms","malformed",n,"malformed/letfn-bindings-even"):s:Fe(s??e,t,Z(r,e),"letfn* bindings must be a vector","malformed",n,"malformed/letfn-bindings-vector")}function Vo(e){const t=e.value.findIndex(i=>c.symbol(i)&&i.name==="&");let n=[],r=null;if(t===-1)n=e.value;else{if(e.value.filter(u=>c.symbol(u)&&u.name==="&").length>1)return{ok:!1,form:e,pos:T(e)??null,message:"& can only appear once",code:"malformed/amp-once"};if(t!==e.value.length-2)return{ok:!1,form:e,pos:T(e)??null,message:"& must be second-to-last argument",code:"malformed/amp-position"};n=e.value.slice(0,t),r=e.value[t+1]}const s=[];for(const i of n){if(!c.symbol(i))return{ok:!1,form:i,pos:T(i)??T(e)??null,message:"fn* only supports simple symbol params; use fn for destructuring",code:"malformed/param-symbol"};s.push(i)}let o=null;if(r!==null){if(!c.symbol(r))return{ok:!1,form:r,pos:T(r)??T(e)??null,message:"fn* only supports simple symbol rest param; use fn for destructuring",code:"malformed/rest-symbol"};o=r}return{ok:!0,arity:{params:s,restParam:o}}}function yg(e,t,n,r,s){if(e.length===0)return Fe(t,n,Z(s,t),"fn/defmacro requires at least a parameter vector","malformed",r,"malformed/fn-needs-params");if(c.vector(e[0])){const o=e[0],i=Vo(o);return i.ok?[{...i.arity,body:e.slice(1)}]:Fe(i.form,n,i.pos??Z(s,t),i.message,"malformed",r,i.code)}if(c.list(e[0])){const o=[];for(const u of e){if(!c.list(u)||u.value.length===0)return Fe(u,n,T(u)??Z(s,t),"Multi-arity clause must be a list starting with a parameter vector","malformed",r,"malformed/arity-clause-list");const l=u.value[0];if(!c.vector(l))return Fe(l,n,T(l)??T(u)??Z(s,t),"First element of arity clause must be a parameter vector","malformed",r,"malformed/arity-clause-vector");const d=Vo(l);if(!d.ok)return Fe(d.form,n,d.pos??T(u)??Z(s,t),d.message,"malformed",r,d.code);o.push({...d.arity,body:u.value.slice(1)})}return o.filter(u=>u.restParam!==null).length>1?Fe(t,n,Z(s,t),"At most one variadic arity is allowed per function","malformed",r,"malformed/single-variadic"):o}return Fe(e[0],n,T(e[0])??Z(s,t),"fn/defmacro expects a parameter vector or arity clauses","malformed",r,"malformed/fn-shape")}function gt(e,t,n,r){const s=e.map(u=>he(u,t,n)),o=s.slice(0,-1),i=s.length>0?s[s.length-1]:Rn(t);return{op:"do",form:r,env:t,children:["statements","ret"],pos:T(r)??null,tag:null,statements:o,ret:i,body:!0}}function he(e,t,n){const{expanded:r,chain:s}=hg(e,n),o=bg(r,t,n,e);return s!==null&&(o.rawForms=s),o}function bg(e,t,n,r){return c.symbol(e)?_i(e,t,n,r):c.vector(e)?wg(e,t,n,r):c.map(e)?kg(e,t,n,r):c.set(e)?xg(e,t,n,r):c.list(e)?$g(e,t,n,r):Lr(e,t,Z(r,e))}function _i(e,t,n,r){const s=e.name,o=Z(r,e);if(s.startsWith("js/")){const b=s.slice(3).split(".");return{op:"js-var",form:e,env:t,children:[],pos:o,tag:null,name:s,segments:b}}const i=Ii(t,s);if(i!==void 0)return{op:"local",form:e,env:t,children:[],pos:o,tag:null,name:s,localKind:i.binding.kind,slot:i.binding.slot,resolved:i.resolved,upvalueIndex:i.resolved==="upvalue"?i.upvalueIndex:void 0,argId:i.binding.argId,variadic:i.binding.variadic,binding:i.binding};const u=s.indexOf("/");let l=null,d=s;u>0&&u<s.length-1&&(l=s.slice(0,u),d=s.slice(u+1));const m=oo(s,n);return{op:"var",form:e,env:t,children:[],pos:o,tag:null,name:d,ns:l??(m==null?void 0:m.ns)??null,resolved:m!==void 0}}function wg(e,t,n,r){return{op:"vector",form:e,env:t,children:["items"],pos:Z(r,e),tag:null,items:e.value.map(s=>he(s,t,n))}}function kg(e,t,n,r){const s=[],o=[];for(const[i,u]of e.entries)s.push(he(i,t,n)),o.push(he(u,t,n));return{op:"map",form:e,env:t,children:["keys","vals"],pos:Z(r,e),tag:null,keys:s,vals:o}}function xg(e,t,n,r){return{op:"set",form:e,env:t,children:["items"],pos:Z(r,e),tag:null,items:je(e).map(s=>he(s,t,n))}}function $g(e,t,n,r){if(e.value.length===0)return Lr(e,t,Z(r,e));const s=e.value[0];if(c.symbol(s))switch(s.name){case"if":return Mg(e,t,n,r);case"do":return Sg(e,t,n,r);case"quote":return qg(e,t,r);case"let*":return Fg(e,t,n,r,"let");case"loop*":return Ig(e,t,n,r);case"letfn*":return Cg(e,t,n,r);case"fn*":return Rg(e,t,n,r);case"async":return jg(e,t,n,r);case"def":return _g(e,t,n,r);case"defmacro":return Pg(e,t,n,r);case"recur":return Ng(e,t,n,r);case"throw":if(e.value.length===2&&Ii(t,"throw")===void 0)return Lg(e,t,n,r);break;case"try":return Eg(e,t,n,r);case"var":return Tg(e,t,n,r);case"ns":return Vg(e,t,r);case"set!":return Og(e,t,n,r);case"binding":return Dg(e,t,n,r);case".":return Gg(e,t,n,r);case"js/new":return zg(e,t,n,r);case"quasiquote":return Fe(e,t,Z(r,e),"unexpanded quasiquote","malformed",n)}return Bg(e,t,n,r)}function Mg(e,t,n,r){if(e.value.length<3||e.value.length>4){const u=e.value.length-1;return Fe(e,t,Z(r,e),`if requires 2 or 3 arguments, got ${u}`,"malformed",n,"malformed/if-arity")}const[,s,o,i]=e.value;return{op:"if",form:e,env:t,children:["test","then","else"],pos:Z(r,e),tag:null,test:he(s,t,n),then:he(o,t,n),else:i!==void 0?he(i,t,n):Rn(t)}}function Sg(e,t,n,r){return{...gt(e.value.slice(1),t,n,e),form:e,body:!1,pos:Z(r,e)}}function qg(e,t,n){const r=e.value[1]??a.nil(),s=Z(n,e);return{op:"quote",form:e,env:t,children:["expr"],pos:s,tag:null,expr:Lr(r,t,T(r)??null),literal:!0}}function Fg(e,t,n,r,s){const o=Ai(e,t,n,r,"let*");if("op"in o)return o;const i=o.value,u=[];let l=t;for(let m=0;m+1<i.length;m+=2){const h=i[m],b=i[m+1];if(!c.symbol(h)){Er(h,T(h)??Z(r,e),"let* only supports simple symbol bindings; use let for destructuring",n,"malformed/let-binding-symbol");continue}const M=he(b,l,n),v=tn(l,h.name,s);u.push(nn(h,v,M,l)),l=en(l,[[h.name,v]])}const d=gt(e.value.slice(2),l,n,e);return{op:"let",form:e,env:t,children:["bindings","body"],pos:Z(r,e),tag:null,bindings:u,body:d}}function Ig(e,t,n,r){const s=Ai(e,t,n,r,"loop*");if("op"in s)return s;const o=s.value,i=[];let u=t;for(let m=0;m+1<o.length;m+=2){const h=o[m],b=o[m+1];if(!c.symbol(h)){Er(h,T(h)??Z(r,e),"loop* only supports simple symbol bindings; use loop for destructuring",n,"malformed/loop-binding-symbol");continue}const M=he(b,u,n),v=tn(u,h.name,"loop");i.push(nn(h,v,M,u)),u=en(u,[[h.name,v]])}const l=Si(u,{kind:"loop",arity:i.length,variadic:!1}),d=gt(e.value.slice(2),l,n,e);return{op:"loop",form:e,env:t,children:["bindings","body"],pos:Z(r,e),tag:null,bindings:i,body:d,loopArity:i.length}}function Cg(e,t,n,r){const s=vg(e,t,n,r);if("op"in s)return s;const o=s.value,i=[];let u=t;for(let m=0;m+1<o.length;m+=2){const h=o[m];if(!c.symbol(h)){Er(h,T(h)??Z(r,e),"letfn* binding names must be symbols",n,"malformed/letfn-name-symbol");continue}const b=tn(u,h.name,"letfn");i.push({sym:h,binding:b,init:o[m+1]})}u=en(u,i.map(({sym:m,binding:h})=>[m.name,h]));const l=i.map(({sym:m,binding:h,init:b})=>nn(m,h,he(b,u,n),u)),d=gt(e.value.slice(2),u,n,e);return{op:"letfn",form:e,env:t,children:["bindings","body"],pos:Z(r,e),tag:null,bindings:l,body:d}}function Rg(e,t,n,r){let s=e.value.slice(1),o=null;s.length>0&&c.symbol(s[0])&&(o=s[0],s=s.slice(1));const i=yg(s,e,t,n,r);if("op"in i)return i;const u=qi(t),l=(o==null?void 0:o.name)??null,d=i.map(b=>Ag(b,u,n,e,l)),m=i.some(b=>b.restParam!==null),h=i.reduce((b,M)=>Math.max(b,M.params.length),0);return{op:"fn",form:e,env:t,children:["methods"],pos:Z(r,e),tag:null,name:l,methods:d,variadic:m,maxFixedArity:h,captures:u.closure.upvalues}}function jg(e,t,n,r){const s=qi(t),o=Fi(s),i=e.value.slice(1),u=gt(i,o,n,e),l={op:"fn-method",form:e,env:s,children:["params","body"],pos:Z(r,e),tag:null,params:[],self:null,variadic:!1,fixedArity:0,body:u,namedSlotCount:o.slots.next,bodyForms:i};return{op:"async",form:e,env:t,children:["method"],pos:Z(r,e),tag:null,method:l,captures:s.closure.upvalues}}function Ag(e,t,n,r,s){const o=[];let i=Fi(t),u=0;for(const b of e.params){const M=tn(i,b.name,"arg",{argId:u});o.push(nn(b,M,null,i)),i=en(i,[[b.name,M]]),u++}if(e.restParam!==null){const b=tn(i,e.restParam.name,"arg",{argId:u,variadic:!0});o.push(nn(e.restParam,b,null,i)),i=en(i,[[e.restParam.name,b]])}let l=null;const d=new Set(o.map(b=>b.name));if(s!==null&&!d.has(s)){const b=tn(i,s,"fn");l=nn({kind:"symbol",name:s},b,null,i),i=en(i,[[s,b]])}const m=Si(i,{kind:"fn",arity:e.params.length,variadic:e.restParam!==null}),h=gt(e.body,m,n,r);return{op:"fn-method",form:r,env:t,children:l!==null?["params","self","body"]:["params","body"],pos:T(r)??null,tag:null,params:o,self:l,variadic:e.restParam!==null,fixedArity:e.params.length,body:h,namedSlotCount:m.slots.next,bodyForms:e.body}}function _g(e,t,n,r){const s=e.value[1];if(s===void 0||!c.symbol(s))return Fe(e,t,Z(r,e),"First element of list must be a symbol","malformed",n,"malformed/def-name-symbol");const o=s.name,i=e.value.slice(2);let u=null,l;return i.length===2&&c.string(i[0])?(u=i[0].value,l=i[1]):i.length>=1&&(l=i[i.length-1]),{op:"def",form:e,env:t,children:l!==void 0?["init"]:[],pos:Z(r,e),tag:null,name:o,ns:t.nsName,init:l!==void 0?he(l,t,n):null,doc:u,metaNode:null}}function Pg(e,t,n,r){const s=e.value[1];if(s===void 0||!c.symbol(s))return Fe(e,t,Z(r,e),"First element of defmacro must be a symbol","malformed",n,"malformed/defmacro-name-symbol");let o=e.value.slice(2),i=null;o.length>0&&c.string(o[0])&&(i=o[0].value,o=o.slice(1));const u={kind:"list",value:[a.symbol("fn*"),...o]},l=he(u,t,n);return{op:"def",form:e,env:t,children:["init"],pos:Z(r,e),tag:null,name:s.name,ns:t.nsName,init:l,doc:i,metaNode:null,isMacro:!0}}function Ng(e,t,n,r){var o,i;const s=e.value.slice(1).map(u=>he(u,t,n));return{op:"recur",form:e,env:t,children:["exprs"],pos:Z(r,e),tag:null,exprs:s,targetKind:((o=t.recur)==null?void 0:o.kind)??null,targetArity:((i=t.recur)==null?void 0:i.arity)??null}}function Lg(e,t,n,r){const s=e.value[1];return{op:"throw",form:e,env:t,children:["exception"],pos:Z(r,e),tag:null,exception:s!==void 0?he(s,t,n):Rn(t)}}function Eg(e,t,n,r){let s;try{s=yh(e,n.cljEnv)}catch(h){return Fe(e,t,Z(r,e),`invalid try: ${h.message}`,"malformed",n)}const{bodyForms:o,catchClauses:i,finallyForms:u}=s,l=gt(o,t,n,e),d=i.map(h=>{const b=he(h.discriminator,t,n),M=tn(t,h.binding,"catch"),v={kind:"symbol",name:h.binding},y=en(t,[[h.binding,M]]),$=gt(h.body,y,n,e),R=nn(v,M,null,y);return{op:"catch",form:e,env:t,children:["discriminator","local","body"],pos:T(e)??null,tag:null,discriminator:b,local:R,body:$}}),m=u!==null?gt(u,t,n,e):null;return{op:"try",form:e,env:t,children:u!==null?["body","catches","finallyBody"]:["body","catches"],pos:Z(r,e),tag:null,body:l,catches:d,finallyBody:m}}function Tg(e,t,n,r){const s=e.value[1];if(s===void 0||!c.symbol(s))return Fe(e,t,Z(r,e),"var expects a symbol","malformed",n,"malformed/var-arg-symbol");const o=s.name,i=o.indexOf("/");let u=null,l=o;i>0&&i<o.length-1&&(u=o.slice(0,i),l=o.slice(i+1));const d=oo(o,n),h=u!==null?[]:cg(t,o);return{op:"the-var",form:e,env:t,children:[],pos:Z(r,e),tag:null,name:l,ns:u??(d==null?void 0:d.ns)??null,resolved:d!==void 0,lexicalCandidates:h}}function Vg(e,t,n){const r=e.value[2],s=r!==void 0&&c.string(r)?r.value:null;return{op:"ns",form:e,env:t,children:[],pos:Z(n,e),tag:null,docstring:s}}function Og(e,t,n,r){if(e.value.length!==3)return Fe(e,t,Z(r,e),`set! requires exactly 2 arguments, got ${e.value.length-1}`,"malformed",n,"malformed/set-arity");const s=e.value[1],o=e.value[2];return c.symbol(s)||Er(s,T(s)??Z(r,e),`set! first argument must be a symbol, got ${s.kind}`,n,"malformed/set-target-symbol"),{op:"set!",form:e,env:t,children:["target","val"],pos:Z(r,e),tag:null,target:s!==void 0?he(s,t,n):Rn(t),val:o!==void 0?he(o,t,n):Rn(t)}}function Dg(e,t,n,r){const s=e.value[1],o=c.vector(s),i=o?s.value:[],u=o&&i.length%2===0,l=[],d=[];for(let h=0;h+1<i.length;h+=2){const b=i[h];let M=null;if(c.symbol(b)){const v=_i(b,t,n,b);v.op==="var"&&(M=v)}l.push(M),d.push(he(i[h+1],t,n))}const m=gt(e.value.slice(2),t,n,e);return{op:"dynamic",form:e,env:t,children:["bindingVars","inits","body"],pos:Z(r,e),tag:null,bindingVars:l,inits:d,wellFormed:u,body:m}}function Gg(e,t,n,r){const s=Z(r,e);if(e.value.length<3)return Fe(e,t,s,". requires (. target member)","malformed",n);const o=he(e.value[1],t,n),i=e.value[2];if(c.list(i)&&i.value.length>0&&c.symbol(i.value[0]))return{op:"host-call",form:e,env:t,children:["target","args"],pos:s,tag:null,method:i.value[0].name,target:o,args:i.value.slice(1).map(u=>he(u,t,n))};if(c.symbol(i)){const u=e.value.slice(3);return u.length===0?{op:"host-field",form:e,env:t,children:["target"],pos:s,tag:null,field:i.name,target:o,assignable:!0}:{op:"host-call",form:e,env:t,children:["target","args"],pos:s,tag:null,method:i.name,target:o,args:u.map(l=>he(l,t,n))}}return Fe(e,t,s,". member must be a symbol or method call","malformed",n)}function zg(e,t,n,r){const s=e.value[1];return{op:"new",form:e,env:t,children:["className","args"],pos:Z(r,e),tag:null,className:s!==void 0?he(s,t,n):Rn(t),args:e.value.slice(2).map(o=>he(o,t,n))}}function Bg(e,t,n,r){return{op:"invoke",form:e,env:t,children:["fn","args"],pos:Z(r,e),tag:null,fn:he(e.value[0],t,n),args:e.value.slice(1).map(s=>he(s,t,n))}}function jn(e,t,n,r="expr"){const o=Ae(t).ns??null,i=(o==null?void 0:o.name)??"user",u=ag(i,o),l={cljEnv:t,ctx:n,errors:[]},d=he(e,u,l);return lg(d,l.errors,r),{node:d,errors:l.errors,namedSlotCount:u.slots.next}}function Hg(e,t,n){const{node:r,errors:s}=jn(e,t,n),o=dg(r);for(const i of s)o.push(`; error: ${i.message}`);return o}function Ug(e,t,n){const{node:r}=jn(e,t,n);return ms(r)}const ao=new WeakMap,vr=new WeakMap;function Pi(e){const t={code:[],constants:[],globalVarCache:[],positions:[],callArgPositions:[],name:e,maxStack:0,localCount:0,innerFunctions:[],catchTables:[],lexicalVarLookups:[],selfSlot:-1};return ao.set(t,0),t}function io(e,t){var n;(n=t.allocateChunkIdentity)==null||n.call(t,e);for(const r of e.innerFunctions)for(const s of r.arities)io(s.chunk,t)}function Ge(e,t){return e.constants.push(t),e.constants.length-1}function H(e,t,n=null){e.code.push(t),e.positions.push(n),Kg(e,t)}function X(e,t,n=null){e.code.push(t),e.positions.push(n),Wg(e,t)}function Oo(e,t,n){e.callArgPositions[t]=n}function Kg(e,t){if(vr.delete(e),Ni(t)===0){Ei(e,Li(t,[]));return}vr.set(e,{opcode:t,operands:[]})}function Wg(e,t){const n=vr.get(e);n!==void 0&&(n.operands.push(t),!(n.operands.length<Ni(n.opcode))&&(vr.delete(e),Ei(e,Li(n.opcode,n.operands))))}function Ni(e){switch(e){case p.Constant:case p.LoadLocal:case p.StoreLocal:case p.LoadGlobal:case p.LoadQualified:case p.LoadVar:case p.LoadLexicalVar:case p.Def:case p.DefMacro:case p.JsGetProp:case p.LoadUpvalue:case p.PushDynamicBinding:case p.SetDynamic:case p.MakeVector:case p.MakeMap:case p.MakeSet:case p.WithMeta:case p.Call:case p.Closure:case p.JsNew:case p.Jump:case p.JumpIfFalsy:case p.EnterFinally:case p.Add:case p.Sub:case p.Mul:case p.Div:case p.Lt:case p.Lte:case p.Gt:case p.Gte:case p.Eq:return 1;case p.Recur:return 3;case p.FnRecur:return 1;case p.FnRecurRest:case p.JsInvoke:return 2;case p.PushTry:return 3;default:return 0}}function Li(e,t){switch(e){case p.Constant:case p.Nil:case p.True:case p.False:case p.LoadLocal:case p.LoadGlobal:case p.LoadQualified:case p.LoadVar:case p.LoadLexicalVar:case p.LoadUpvalue:case p.Closure:return 1;case p.Pop:case p.StoreLocal:case p.Return:case p.JumpIfFalsy:case p.Throw:return-1;case p.PushTry:case p.PopTry:case p.EnterFinally:case p.EndFinally:case p.PushBindingFrame:case p.PopBindingFrame:return 0;case p.PushDynamicBinding:return-1;case p.MakeVector:case p.MakeSet:return 1-Ct(t[0]);case p.MakeMap:return 1-Ct(t[0])*2;case p.WithMeta:case p.Def:case p.DefMacro:case p.JsGetProp:return 0;case p.Call:case p.JsNew:return-Ct(t[0]);case p.JsInvoke:return-Ct(t[1]);case p.Add:case p.Sub:case p.Mul:case p.Div:case p.Lt:case p.Lte:case p.Gt:case p.Gte:case p.Eq:return 1-Ct(t[0]);case p.Recur:return-Ct(t[1]);case p.FnRecur:return-Ct(t[0]);case p.FnRecurRest:return-Ct(t[0]);default:return 0}}function Ct(e){return typeof e=="number"&&Number.isInteger(e)&&e>0?e:0}function Ei(e,t){const n=Math.max(0,Jg(e)+t);ao.set(e,n),e.maxStack=Math.max(e.maxStack,n)}function Jg(e){return ao.get(e)??0}const Qg=new Set(["malformed/if-arity","malformed/binding-vector","malformed/binding-even","malformed/let-binding-symbol","malformed/loop-binding-symbol","malformed/letfn-bindings-vector","malformed/letfn-bindings-even","malformed/letfn-name-symbol","malformed/set-arity","malformed/set-target-symbol","malformed/def-name-symbol","malformed/defmacro-name-symbol","malformed/var-arg-symbol","malformed/amp-once","malformed/amp-position","malformed/param-symbol","malformed/rest-symbol","malformed/fn-needs-params","malformed/arity-clause-list","malformed/arity-clause-vector","malformed/single-variadic","malformed/fn-shape","malformed/recur-outside","malformed/recur-tail","malformed/recur-arity"]);function Ue(e,t){return e.reason===null&&(e.reason=t),!1}function co(e){const t=e[0],n={category:"compile-error",detail:t.message},r={message:t.message,pos:t.pos,kind:t.kind,code:t.code};return t.kind==="malformed"&&t.code!==void 0&&Qg.has(t.code)?{ok:!1,fatal:!0,reason:n,analysisError:r}:{ok:!1,reason:n,analysisError:r}}function Yg(e,t){return Ue(e,{category:"unsupported-special-form",detail:`ir-compiler: no lowering for op '${t.op}'`})}function Kt(e,t){e.localCount=Math.max(e.localCount,t+1)}function un(e,t,n){H(e,t,n);const r=e.code.length;return X(e,0,n),r}function rr(e,t){Ti(e,t,e.code.length)}function Ti(e,t,n){e.code[t]=n-(t+1)}function Do(e,t,n){const r=Ge(e,t);H(e,p.Constant,n),X(e,r,n)}function Xg(e,t,n){const r=t.name,s=r.indexOf("/");if(s>0&&s<r.length-1){if(r.slice(s+1).includes("."))return Zg(e,t,n),!0;const u=Ge(e,t);return H(e,p.LoadQualified,n),X(e,u,n),!0}const o=Ge(e,t);return H(e,p.LoadGlobal,n),X(e,o,n),!0}function Zg(e,t,n){const r=t.name.indexOf("/"),s=t.name.slice(0,r),i=t.name.slice(r+1).split("."),u=a.symbol(`${s}/${i[0]}`),l=Ge(e,u);H(e,p.LoadQualified,n),X(e,l,n);for(const d of i.slice(1)){const m=Ge(e,a.string(d));H(e,p.JsGetProp,n),X(e,m,n)}}function ev(e){const t=e.indexOf("/");return t>0&&t<e.length-1}function tv(e){switch(e){case"+":return p.Add;case"-":return p.Sub;case"*":return p.Mul;case"/":return p.Div;case"<":return p.Lt;case">":return p.Gt;case"<=":return p.Lte;case">=":return p.Gte;case"=":return p.Eq;default:return null}}function nv(e){const t=e.fn;return t.op!=="var"||!c.symbol(t.form)||ev(t.form.name)?null:tv(t.form.name)}function rv(e,t){if(e.env.context!=="return"||t.fnRecur===null||t.selfSlot<0)return!1;const n=e.fn;if(n.op!=="local"||n.resolved!=="local"||n.slot!==t.selfSlot)return!1;const r=e.args.length;return t.fnRecur.hasRest?r>=t.fnRecur.paramCount:r===t.fnRecur.paramCount}function Go(e,t){if(t===e.meta)return e;const n={...e,meta:t},r=T(e);return r&&Qe(n,r),n}function sv(e,t,n){const r=Ge(e,a.string(t));H(e,p.JsGetProp,n),X(e,r,n)}function Hr(e,t,n){const r=[];for(const u of e.methods){const l={reason:null},d=Vi(u,l);if(d===null)return l.reason!==null&&(t.reason=l.reason),null;r.push({params:u.params.slice(0,u.fixedArity).map(m=>m.form),restParam:u.variadic?u.params[u.fixedArity].form:null,body:u.bodyForms,chunk:d})}const s={arities:r,upvalueDescriptors:e.captures.map(u=>({isLocal:u.isLocal,index:u.index}))},o=n??e.name;o!==null&&(s.name=o);const i=t.chunk.innerFunctions.length;return t.chunk.innerFunctions.push(s),i}function ue(e,t){switch(e.op){case"const":{const{chunk:n}=t;return e.type==="nil"?H(n,p.Nil,e.pos):e.type==="bool"?H(n,e.val.value?p.True:p.False,e.pos):Do(n,e.val,e.pos),!0}case"quote":return Do(t.chunk,e.expr.val,e.pos),!0;case"local":{const{chunk:n}=t;return e.resolved==="local"?(H(n,p.LoadLocal,e.pos),X(n,e.slot,e.pos)):(H(n,p.LoadUpvalue,e.pos),X(n,e.upvalueIndex,e.pos)),!0}case"var":case"js-var":return Xg(t.chunk,e.form,e.pos);case"vector":{const{chunk:n}=t;for(const s of e.items)if(!ue(s,t))return!1;H(n,p.MakeVector,e.pos),X(n,e.items.length,e.pos);const r=e.form.meta;return r&&(H(n,p.WithMeta,e.pos),X(n,Ge(n,r),e.pos)),!0}case"map":{const{chunk:n}=t;for(let s=0;s<e.keys.length;s++)if(!ue(e.keys[s],t)||!ue(e.vals[s],t))return!1;H(n,p.MakeMap,e.pos),X(n,e.keys.length,e.pos);const r=e.form.meta;return r&&(H(n,p.WithMeta,e.pos),X(n,Ge(n,r),e.pos)),!0}case"set":{const{chunk:n}=t;for(const r of e.items)if(!ue(r,t))return!1;return H(n,p.MakeSet,e.pos),X(n,e.items.length,e.pos),!0}case"if":{const{chunk:n}=t;if(!ue(e.test,t))return!1;const r=un(n,p.JumpIfFalsy,e.pos);if(!ue(e.then,t))return!1;const s=un(n,p.Jump,e.pos);return rr(n,r),ue(e.else,t)?(rr(n,s),!0):!1}case"do":{const{chunk:n}=t;for(const r of e.statements){if(!ue(r,t))return!1;H(n,p.Pop,e.pos)}return ue(e.ret,t)}case"invoke":{const{chunk:n}=t;if(rv(e,t)){for(const o of e.args)if(!ue(o,t))return!1;return t.fnRecur.hasRest?(H(n,p.FnRecurRest,e.pos),X(n,e.args.length,e.pos),X(n,t.fnRecur.paramCount,e.pos)):(H(n,p.FnRecur,e.pos),X(n,t.fnRecur.paramCount,e.pos)),!0}const r=nv(e);if(r!==null){for(const i of e.args)if(!ue(i,t))return!1;const o=n.code.length;return H(n,r,e.pos),X(n,e.args.length,e.pos),Oo(n,o,e.args.map(i=>i.pos??null)),!0}if(!ue(e.fn,t))return!1;for(const o of e.args)if(!ue(o,t))return!1;const s=n.code.length;return H(n,p.Call,e.pos),X(n,e.args.length,e.pos),Oo(n,s,e.args.map(o=>o.pos??null)),!0}case"let":{const{chunk:n}=t;for(const r of e.bindings){if(r.init===null)return Ue(t,{category:"compile-error",detail:"let* binding missing init"});if(!ue(r.init,t))return!1;H(n,p.StoreLocal,r.pos),X(n,r.slot,r.pos),Kt(n,r.slot)}return ue(e.body,t)}case"loop":{const{chunk:n}=t;for(const l of e.bindings){if(l.init===null)return Ue(t,{category:"compile-error",detail:"loop* binding missing init"});if(!ue(l.init,t))return!1;H(n,p.StoreLocal,l.pos),X(n,l.slot,l.pos),Kt(n,l.slot)}const r=e.bindings.length>0?e.bindings[0].slot:0,s=e.bindings.length,o=n.code.length,i=t.loopRecur;t.loopRecur={localStart:r,localCount:s,loopHeader:o};const u=ue(e.body,t);return t.loopRecur=i,u}case"recur":{const{chunk:n}=t;for(const r of e.exprs)if(!ue(r,t))return!1;return e.targetKind==="loop"?t.loopRecur===null?Ue(t,{category:"compile-error",detail:"recur loop target missing"}):(H(n,p.Recur,e.pos),X(n,t.loopRecur.localStart,e.pos),X(n,t.loopRecur.localCount,e.pos),X(n,t.loopRecur.loopHeader,e.pos),!0):e.targetKind==="fn"?t.fnRecur===null?Ue(t,{category:"compile-error",detail:"recur fn target missing"}):(H(n,p.FnRecur,e.pos),X(n,e.exprs.length,e.pos),!0):Ue(t,{category:"compile-error",detail:"recur has no resolved target"})}case"letfn":{const{chunk:n}=t;for(const r of e.bindings)Kt(n,r.slot);for(const r of e.bindings){if(r.init===null||r.init.op!=="fn")return Ue(t,{category:"compile-error",detail:"letfn* binding values must be functions"});const s=Hr(r.init,t,r.name);if(s===null)return!1;H(n,p.Closure,r.pos),X(n,s,r.pos),H(n,p.StoreLocal,r.pos),X(n,r.slot,r.pos)}return ue(e.body,t)}case"fn":{const n=Hr(e,t,null);return n===null?!1:(H(t.chunk,p.Closure,e.pos),X(t.chunk,n,e.pos),!0)}case"def":{const{chunk:n}=t,r=e.form,s=r.value[1];if(e.isMacro){if(e.init===null||e.init.op!=="fn")return Ue(t,{category:"compile-error",detail:"ir-compiler: defmacro missing fn init"});const u=Hr(e.init,t,e.name);if(u===null)return!1;H(n,p.Closure,e.pos),X(n,u,e.pos);const l=r.value.slice(2),m=l.length>0&&c.string(l[0])?l.slice(1):l,h=Go(s,ci(s.meta,e.doc??void 0,m)),b=Ge(n,h);return H(n,p.DefMacro,e.pos),X(n,b,e.pos),!0}if(e.init===null)return H(n,p.Nil,e.pos),!0;if(!ue(e.init,t))return!1;const o=e.doc!==null?Go(s,Ys(s.meta,e.doc)):s,i=Ge(n,o);return H(n,p.Def,e.pos),X(n,i,e.pos),!0}case"the-var":{const{chunk:n}=t,r=e.form.value[1];if(e.lexicalCandidates.length>0){const o={symbol:r,candidates:e.lexicalCandidates},i=n.lexicalVarLookups.length;return n.lexicalVarLookups.push(o),H(n,p.LoadLexicalVar,e.pos),X(n,i,e.pos),!0}const s=Ge(n,r);return H(n,p.LoadVar,e.pos),X(n,s,e.pos),!0}case"throw":return ue(e.exception,t)?(H(t.chunk,p.Throw,e.pos),!0):!1;case"try":{const{chunk:n}=t,r=e.pos,s=e.finallyBody!==null;for(const v of e.catches)Kt(n,v.local.slot);const o=s?n.localCount++:-1,i=n.catchTables.length,u=e.catches.map(v=>({discriminator:v.discriminator!==null?v.discriminator.form:v.form,discriminatorSlot:-1,bindingSlot:-1,bodyIp:-1}));n.catchTables.push({clauses:u});const l=s?n.catchTables.length:-1;s&&n.catchTables.push({clauses:[]});const d=[],m=[],h=[],b=[];for(let v=0;v<e.catches.length;v++){const y=e.catches[v];if(y.discriminator===null||y.discriminator.op!=="fn")continue;if(!ue(y.discriminator,t))return!1;const $=n.localCount++;H(n,p.StoreLocal,r),X(n,$,r),u[v].discriminatorSlot=$}if(H(n,p.PushTry,r),X(n,i,r),d.push(n.code.length),X(n,-1,r),m.push(n.code.length),X(n,0,r),!ue(e.body,t))return!1;H(n,p.PopTry,r);let M=-1;s?(H(n,p.StoreLocal,r),X(n,o,r),H(n,p.EnterFinally,r),m.push(n.code.length),X(n,0,r),h.push(un(n,p.Jump,r))):M=un(n,p.Jump,r);for(let v=0;v<e.catches.length;v++){const y=e.catches[v],$=u[v],R=y.local.slot;if($.bindingSlot=R,$.bodyIp=n.code.length,s&&(H(n,p.PushTry,r),X(n,l,r),d.push(n.code.length),X(n,-1,r),m.push(n.code.length),X(n,0,r)),Kt(n,R),!ue(y.body,t))return!1;s?(H(n,p.PopTry,r),H(n,p.StoreLocal,r),X(n,o,r),H(n,p.EnterFinally,r),m.push(n.code.length),X(n,0,r),h.push(un(n,p.Jump,r))):v<e.catches.length-1&&b.push(un(n,p.Jump,r))}if(s){const v=n.code.length;for(const $ of d)n.code[$]=v;for(const $ of h)Ti(n,$,v);if(!ue(e.finallyBody,t))return!1;H(n,p.Pop,r),H(n,p.EndFinally,r);const y=n.code.length;for(const $ of m)n.code[$]=y;H(n,p.LoadLocal,r),X(n,o,r)}else{rr(n,M);for(const v of b)rr(n,v);n.code[m[0]]=n.code.length}return!0}case"dynamic":{if(!e.wellFormed||e.bindingVars.some(r=>r===null))return Ue(t,{category:"unsupported-special-form",detail:"ir-compiler: dynamic binding requires statically resolved vars"});const{chunk:n}=t;H(n,p.PushBindingFrame,e.pos);for(let r=0;r<e.bindingVars.length;r++){if(!ue(e.inits[r],t))return!1;const s=e.bindingVars[r].form,o=e.bindingVars[r].pos;H(n,p.PushDynamicBinding,o),X(n,Ge(n,s),o)}return ue(e.body,t)?(H(n,p.PopBindingFrame,e.pos),!0):!1}case"set!":{if(e.target.op!=="var")return Yg(t,e);if(!ue(e.val,t))return!1;const n=e.target.form,r=e.target.pos;return H(t.chunk,p.SetDynamic,r),X(t.chunk,Ge(t.chunk,n),r),!0}case"host-call":{if(!ue(e.target,t))return!1;for(const r of e.args)if(!ue(r,t))return!1;const n=Ge(t.chunk,a.string(e.method));return H(t.chunk,p.JsInvoke,e.pos),X(t.chunk,n,e.pos),X(t.chunk,e.args.length,e.pos),!0}case"host-field":return ue(e.target,t)?(sv(t.chunk,e.field,e.pos),!0):!1;case"new":{if(!ue(e.className,t))return!1;for(const n of e.args)if(!ue(n,t))return!1;return H(t.chunk,p.JsNew,e.pos),X(t.chunk,e.args.length,e.pos),!0}case"async":return Ue(t,{category:"unsupported-special-form",detail:"VM does not support special form async"});case"ns":return Ue(t,{category:"unsupported-top-level-mutation",detail:"VM does not support top-level mutation form ns"});case"invalid":return Ue(t,{category:"compile-error",detail:e.message});default:return Ue(t,{category:"compile-error",detail:"ir-compiler: unexpected node op in expression position"})}}function Vi(e,t){const n=Pi("vm-fn-body");for(const o of e.params)Kt(n,o.slot);let r=-1;e.self!==null&&(r=e.self.slot,n.selfSlot=r,Kt(n,r));const s={chunk:n,loopRecur:null,fnRecur:{paramCount:e.fixedArity,hasRest:e.variadic},selfSlot:r,reason:null};return ue(e.body,s)?(H(n,p.Return),n):(t.reason=s.reason,null)}function gs(e,t,n){try{const{node:r,errors:s}=jn(e,t,n);if(s.length>0)return co(s);const o=Pi("vm-expression"),i={chunk:o,loopRecur:null,fnRecur:null,selfSlot:-1,reason:null};return ue(r,i)?(H(o,p.Return),{ok:!0,chunk:o}):{ok:!1,reason:i.reason??{category:"compile-error",detail:"ir-compiler: could not compile top-level form"}}}catch(r){return{ok:!1,reason:{category:"compile-error",detail:r instanceof Error?r.message:String(r)}}}}function ov(e,t,n,r){const s=[...e];t!==null&&(s.push(a.symbol("&")),s.push(t));const o=[a.symbol("fn*")];r!==null&&o.push(a.symbol(r)),o.push(a.vector(s));for(const i of n)o.push(i);return a.list(o)}function av(e,t,n,r,s,o){try{const i=ov(e,t,n,r),{node:u,errors:l}=jn(i,s,o);if(l.length>0)return co(l);if(u.op!=="fn"||u.methods.length!==1)return{ok:!1,reason:{category:"compile-error",detail:"ir-compiler: fn-body synthesis did not yield a single-arity fn"}};const d={reason:null},m=Vi(u.methods[0],d);return m===null?{ok:!1,reason:d.reason??{category:"compile-error",detail:"ir-compiler: could not compile fn body"}}:{ok:!0,chunk:m}}catch(i){return{ok:!1,reason:{category:"compile-error",detail:i instanceof Error?i.message:String(i)}}}}const iv=new Set(["atom","volatile","reduced","delay"]);function cv(e,t,n){let r=null;const s=new Promise(i=>{r=setTimeout(()=>i(n),t)}),o=()=>{r!==null&&clearTimeout(r)};return e.promise.then(o,o),Promise.race([e.promise,s])}function lv(e,t,n,r){const s=Nr(e.method.namedSlotCount);return s.upvalues=e.captures.map(o=>o.isLocal?t.slots[o.index]:t.upvalues[o.index]),a.pending(de(e.method.body,s,n,r))}async function de(e,t,n,r){switch(e.op){case"if":return uv(e,t,n,r);case"do":return dv(e,t,n,r);case"let":return fv(e,t,n,r);case"letfn":return mv(e,t,n,r);case"loop":return pv(e,t,n,r);case"recur":return hv(e,t,n,r);case"invoke":return Fv(e,t,n,r);case"vector":return gv(e,t,n,r);case"map":return vv(e,t,n,r);case"set":return yv(e,t,n,r);case"dynamic":return bv(e,t,n,r);case"set!":return wv(e,t,n,r);case"throw":return kv(e,t,n,r);case"try":return xv(e,t,n,r);case"def":return $v(e,t,n,r);case"host-call":return Mv(e,t,n,r);case"host-field":return Sv(e,t,n,r);case"new":return qv(e,t,n,r);default:return ce(e,t,n,r)}}async function uv(e,t,n,r){const s=await de(e.test,t,n,r);return c.falsy(s)?de(e.else,t,n,r):de(e.then,t,n,r)}async function dv(e,t,n,r){for(const s of e.statements)await de(s,t,n,r);return de(e.ret,t,n,r)}async function fv(e,t,n,r){for(const s of e.bindings)t.slots[s.slot]=await de(s.init,t,n,r);return de(e.body,t,n,r)}async function mv(e,t,n,r){return Gi(e,t,n,r),de(e.body,t,n,r)}async function pv(e,t,n,r){for(const s of e.bindings)t.slots[s.slot]=await de(s.init,t,n,r);for(;;)try{return await de(e.body,t,n,r)}catch(s){if(s instanceof at){for(let o=0;o<e.bindings.length;o++)t.slots[e.bindings[o].slot]=s.args[o];continue}throw s}}async function hv(e,t,n,r){const s=[];for(const o of e.exprs)s.push(await de(o,t,n,r));throw new at(s,e.pos??void 0)}async function gv(e,t,n,r){const s=[];for(const u of e.items)s.push(await de(u,t,n,r));const o=a.vector(s),i=e.form.meta;return i&&(o.meta=i),o}async function vv(e,t,n,r){const s=[];for(let u=0;u<e.keys.length;u++){const l=await de(e.keys[u],t,n,r),d=await de(e.vals[u],t,n,r);s.push([l,d])}const o=a.map(s),i=e.form.meta;return i&&(o.meta=i),o}async function yv(e,t,n,r){const s=[];for(const o of e.items){const i=await de(o,t,n,r);s.some(u=>c.equal(u,i))||s.push(i)}return a.set(s)}async function bv(e,t,n,r){const s=e.form,o=wi(s,n),i=[];try{for(let u=0;u*2<o.length;u++){const l=ki(o[u*2],s),d=await de(e.inits[u],t,n,r),m=xi(l,n,r);m.bindingStack??(m.bindingStack=[]),m.bindingStack.push(d),i.push(m)}}catch(u){for(let l=i.length-1;l>=0;l--)i[l].bindingStack.pop();throw u}try{return await de(e.body,t,n,r)}finally{for(let u=i.length-1;u>=0;u--)i[u].bindingStack.pop()}}async function wv(e,t,n,r){const s=e.form.value[1],o=$i(s,n),i=await de(e.val,t,n,r);return o.bindingStack[o.bindingStack.length-1]=i,i}async function kv(e,t,n,r){const s=await de(e.exception,t,n,r);throw new tt(s)}async function xv(e,t,n,r){let s=a.nil(),o=null;try{s=await de(e.body,t,n,r)}catch(i){if(i instanceof at)throw i;const u=Xs(i,r);if(u===null)throw i;let l=!1;for(const d of e.catches)if(zi(d,u,t,n,r)){t.slots[d.local.slot]=u,s=await de(d.body,t,n,r),l=!0;break}l||(o=i)}finally{e.finallyBody!==null&&await de(e.finallyBody,t,n,r)}if(o!==null)throw o;return s}async function $v(e,t,n,r){if(e.isMacro===!0)return ce(e,t,n,r);if(e.init===null)return a.nil();const s=e.form.value[1],o=await de(e.init,t,n,r);return Ar({name:s,value:o,env:n,ctx:r,docstring:e.doc??void 0})}async function Mv(e,t,n,r){const s=e.form,o=await de(e.target,t,n,r),i=[];for(const u of e.args)i.push(await de(u,t,n,r));return Zs(o,s.value[1],e.method,s.value[2],i,r,n)}async function Sv(e,t,n,r){const s=e.form,o=await de(e.target,t,n,r);return _r(o,s.value[1],e.field)}async function qv(e,t,n,r){const s=e.form;if(s.value.length<2)throw new f("js/new requires a constructor argument",{list:s},T(s));const o=await de(e.className,t,n,r),i=[];for(const u of e.args)i.push(await de(u,t,n,r));return eo(o,s.value[1],i,r,n)}async function Fv(e,t,n,r){const s=e.form,o=s.value[0];let i=await de(e.fn,t,n,r);if(c.var(i)&&(i=i.value),c.aFunction(i)&&i.name==="deref"&&e.args.length>=1&&e.args.length<=3)return Iv(e,i,t,n,r);if(c.multiMethod(i)){const m=[];for(const h of e.args)m.push(await de(h,t,n,r));return Pr(i,m,r,n,s)}if(!c.callable(i)){const m=c.symbol(o)?o.name:x(o);throw new f(`${m} is not callable`,{list:s,env:n},T(s))}const u=[];for(const m of e.args)u.push(await de(m,t,n,r));const l=T(s),d={fnName:c.symbol(o)?o.name:null,line:null,col:null,source:r.currentFile??null,pos:l??null};r.frameStack.push(d);try{return r.applyCallable(i,u,n)}catch(m){throw ii(m,s),m instanceof f&&!m.frames&&(m.frames=[...r.frameStack].reverse()),m}finally{r.frameStack.pop()}}async function Iv(e,t,n,r,s){const o=await de(e.args[0],n,r,s);if(c.pending(o)){if(e.args.length===1)return o.promise;if(e.args.length!==3)throw new f("deref of a pending expects (deref p) or (deref p timeout-ms timeout-val)",{list:e.form,env:r},T(e.form));const i=await de(e.args[1],n,r,s);if(!c.number(i))throw new f("deref timeout must be a number (milliseconds)",{t:i});const u=await de(e.args[2],n,r,s);return cv(o,i.value,u)}return iv.has(o.kind)?s.applyCallable(t,[o],r):o}function ce(e,t,n,r){switch(e.op){case"const":return e.val;case"quote":return e.expr.val;case"local":return e.resolved==="local"?t.slots[e.slot]:t.upvalues[e.upvalueIndex];case"var":case"js-var":return r.evaluateSymbol(e.form,n);case"if":{const s=ce(e.test,t,n,r);return c.falsy(s)?ce(e.else,t,n,r):ce(e.then,t,n,r)}case"do":return Cv(e,t,n,r);case"let":return Rv(e,t,n,r);case"loop":return jv(e,t,n,r);case"recur":return Av(e,t,n,r);case"invoke":return Hv(e,t,n,r);case"vector":return _v(e,t,n,r);case"map":return Pv(e,t,n,r);case"set":return Nv(e,t,n,r);case"dynamic":return Jv(e,t,n,r);case"set!":return Lv(e,t,n,r);case"fn":return Ev(e,t,n,r);case"letfn":return Wv(e,t,n,r);case"throw":return Tv(e,t,n,r);case"try":return Qv(e,t,n,r);case"def":return Vv(e,t,n,r);case"host-field":return Ov(e,t,n,r);case"host-call":return Dv(e,t,n,r);case"new":return Gv(e,t,n,r);case"the-var":return zv(e,t,n,r);case"ns":return Bv(e,n);case"async":return lv(e,t,n,r);default:throw new f(`ast-walker: no walker for op '${e.op}' (pre-scan should have fallen back)`,{node:e.op},e.pos??void 0)}}function Cv(e,t,n,r){for(const s of e.statements)ce(s,t,n,r);return ce(e.ret,t,n,r)}function Rv(e,t,n,r){for(const s of e.bindings)t.slots[s.slot]=ce(s.init,t,n,r);return ce(e.body,t,n,r)}function jv(e,t,n,r){for(const s of e.bindings)t.slots[s.slot]=ce(s.init,t,n,r);for(;;)try{return ce(e.body,t,n,r)}catch(s){if(s instanceof at){for(let o=0;o<e.bindings.length;o++)t.slots[e.bindings[o].slot]=s.args[o];continue}throw s}}function Av(e,t,n,r){const s=e.exprs.map(o=>ce(o,t,n,r));throw new at(s,e.pos??void 0)}function _v(e,t,n,r){const s=e.items.map(u=>ce(u,t,n,r)),o=a.vector(s),i=e.form.meta;return i&&(o.meta=i),o}function Pv(e,t,n,r){const s=[];for(let u=0;u<e.keys.length;u++){const l=ce(e.keys[u],t,n,r),d=ce(e.vals[u],t,n,r);s.push([l,d])}const o=a.map(s),i=e.form.meta;return i&&(o.meta=i),o}function Nv(e,t,n,r){const s=[];for(const o of e.items){const i=ce(o,t,n,r);s.some(u=>c.equal(u,i))||s.push(i)}return a.set(s)}function Lv(e,t,n,r){const s=e.form.value[1],o=$i(s,n),i=ce(e.val,t,n,r);return o.bindingStack[o.bindingStack.length-1]=i,i}function Ev(e,t,n,r){const{fn:s,fillUpvalues:o}=Di(e,t,n,r);return o(),s}function Tv(e,t,n,r){const s=ce(e.exception,t,n,r);throw new tt(s)}function Vv(e,t,n,r){if(e.isMacro===!0)return Kv(e,t,n,r);if(e.init===null)return a.nil();const s=e.form.value[1],o=ce(e.init,t,n,r);return Ar({name:s,value:o,env:n,ctx:r,docstring:e.doc??void 0})}function Ov(e,t,n,r){const s=e.form,o=ce(e.target,t,n,r);return _r(o,s.value[1],e.field)}function Dv(e,t,n,r){const s=e.form,o=ce(e.target,t,n,r),i=e.args.map(u=>ce(u,t,n,r));return Zs(o,s.value[1],e.method,s.value[2],i,r,n)}function Gv(e,t,n,r){const s=e.form;if(s.value.length<2)throw new f("js/new requires a constructor argument",{list:s},T(s));const o=ce(e.className,t,n,r),i=e.args.map(u=>ce(u,t,n,r));return eo(o,s.value[1],i,r,n)}function zv(e,t,n,r){for(const o of e.lexicalCandidates){const i=o.kind==="local"?t.slots[o.slot]:t.upvalues[o.slot];if(c.var(i))return i}const s=e.form.value[1];return tg(s,n,r)}function Bv(e,t){if(e.docstring!==null){const n=Ae(t);n.ns&&(n.ns.doc=e.docstring)}return a.nil()}function Hv(e,t,n,r){const s=e.form,o=s.value[0];let i=ce(e.fn,t,n,r);if(c.var(i)&&(i=i.value),c.multiMethod(i)){const m=e.args.map(h=>ce(h,t,n,r));return Pr(i,m,r,n,s)}if(!c.callable(i)){const m=c.symbol(o)?o.name:x(o);throw new f(`${m} is not callable`,{list:s,env:n},T(s))}const u=e.args.map(m=>ce(m,t,n,r)),l=T(s),d={fnName:c.symbol(o)?o.name:null,line:null,col:null,source:r.currentFile??null,pos:l??null};r.frameStack.push(d);try{return r.applyCallable(i,u,n)}catch(m){throw ii(m,s),m instanceof f&&!m.frames&&(m.frames=[...r.frameStack].reverse()),m}finally{r.frameStack.pop()}}function Oi(e,t){const n=[];return{arities:e.methods.map(o=>({params:o.params.slice(0,o.fixedArity).map(i=>i.form),restParam:o.variadic?o.params[o.fixedArity].form:null,body:o.bodyForms,astMethod:o,astSlotCount:o.namedSlotCount,astUpvalues:n})),fillUpvalues:()=>{for(const o of e.captures)n.push(o.isLocal?t.slots[o.index]:t.upvalues[o.index])}}}function Uv(e,t,n,r){var o,i,u,l,d;const s=r.vmExecutionMode;if(!(s===void 0||s==="off")&&!(e.captures.length>0))for(const m of t){const h=av(m.params,m.restParam,m.body,e.name,n,r);if(h.ok){io(h.chunk,r),m.bytecodeBody=h.chunk,(i=r.instrumentation)==null||i.onEvent({path:"vm:function-body-compiled",mode:s,formKind:"fn*",ast:e.form,details:{evalId:(o=r.currentEvalIdentity)==null?void 0:o.id,chunkId:h.chunk.id,functionName:e.name,fixedParamCount:m.params.length,hasRestParam:m.restParam!==null}});continue}if(h.fatal===!0){const b=new f(h.reason.detail,{reason:h.reason,list:e.form,env:n,analysisError:h.analysisError},((u=h.analysisError)==null?void 0:u.pos)??T(e.form));throw((l=h.analysisError)==null?void 0:l.code)!==void 0&&(b.code=h.analysisError.code),b}(d=r.instrumentation)==null||d.onEvent({path:"fallback",mode:s,reason:h.reason,formKind:"fn*",ast:e.form,details:{functionName:e.name,fixedParamCount:m.params.length,hasRestParam:m.restParam!==null,phase:"vm:function-body-compile"}})}}function Di(e,t,n,r){var d,m;const{arities:s,fillUpvalues:o}=Oi(e,t);Uv(e,s,n,r);const i=a.multiArityFunction(s,n),u=((d=Ae(n).ns)==null?void 0:d.name)??"user",l=(m=r.allocateFunctionIdentity)==null?void 0:m.call(r,{nsName:u,name:e.name??void 0});if(l&&(i.id=l.id,i.evalId=l.evalId,i.displayName=l.displayName),e.name!==null){i.name=e.name;const h=Ot(n);h.bindings.set(e.name,i),i.env=h}return{fn:i,fillUpvalues:o}}function Kv(e,t,n,r){if(e.init===null||e.init.op!=="fn")throw new f("ast-walker: defmacro without a fn init (analyzer contract violation)",{node:e.op},e.pos??void 0);const{arities:s,fillUpvalues:o}=Oi(e.init,t);o();const i=a.multiArityMacro(s,n),u=e.form,l=u.value[1],d=u.value.slice(2),m=d[0]&&c.string(d[0])?d[0].value:void 0,h=m?d.slice(1):d,b=ci(l.meta,m,h),M=b===l.meta?l:{...l,meta:b};return li({name:M,macro:i,env:n,ctx:r})}function Gi(e,t,n,r){const s=[];for(const o of e.bindings){if(o.init===null||o.init.op!=="fn")throw new f("letfn* binding values must be functions",{name:o.name,env:n},o.pos??void 0);const{fn:i,fillUpvalues:u}=Di(o.init,t,n,r);i.name=o.name,t.slots[o.slot]=i,s.push(u)}for(const o of s)o()}function Wv(e,t,n,r){return Gi(e,t,n,r),ce(e.body,t,n,r)}function Jv(e,t,n,r){const s=e.form,o=wi(s,n),i=[];try{for(let u=0;u*2<o.length;u++){const l=ki(o[u*2],s),d=ce(e.inits[u],t,n,r),m=xi(l,n,r);m.bindingStack??(m.bindingStack=[]),m.bindingStack.push(d),i.push(m)}}catch(u){for(let l=i.length-1;l>=0;l--)i[l].bindingStack.pop();throw u}try{return ce(e.body,t,n,r)}finally{for(let u=i.length-1;u>=0;u--)i[u].bindingStack.pop()}}function Qv(e,t,n,r){let s=a.nil(),o=null;try{s=ce(e.body,t,n,r)}catch(i){if(i instanceof at)throw i;const u=Xs(i,r);if(u===null)throw i;let l=!1;for(const d of e.catches)if(zi(d,u,t,n,r)){t.slots[d.local.slot]=u,s=ce(d.body,t,n,r),l=!0;break}l||(o=i)}finally{e.finallyBody!==null&&ce(e.finallyBody,t,n,r)}if(o!==null)throw o;return s}function zi(e,t,n,r,s){if(e.discriminator===null)return!0;let o;try{o=ce(e.discriminator,n,r,s)}catch{return!0}return ui(o,t,r,s)}function Bi(e,t,n,r){var s,o;if(e.kind===A.nativeFunction)return e.fnWithContext?e.fnWithContext(n,r,...t):e.fn(...t);if(e.kind===A.function){const i=to(e.arities,t.length);if(i.bytecodeBody&&n.vmExecutionMode!=="off"){const u=i.bytecodeBody;let l=Bn(i,t);for(;l.length<u.localCount;)l.push(xt());return u.selfSlot>=0&&(l[u.selfSlot]=e),(s=n.instrumentation)==null||s.onEvent({path:"vm:function-body",mode:n.vmExecutionMode??"function-body",formKind:"fn*"}),vn({chunk:u,env:e.env,ctx:n,locals:l,rootFnName:e.name??null,closure:i.vmClosure??null})}if(i.astMethod){const u=i.astMethod;(o=n.instrumentation)==null||o.onEvent({path:"ast:function-body",mode:n.vmExecutionMode??"off",formKind:"fn*",details:{functionName:e.name??null}});const l=Nr(i.astSlotCount??0);l.upvalues=i.astUpvalues??[];let d=Bn(i,t);for(;;){for(let m=0;m<d.length;m++)l.slots[m]=d[m];u.self!==null&&(l.slots[u.self.slot]=e);try{return ce(u.body,l,e.env,n)}catch(m){if(m instanceof at){d=m.args;continue}throw m}}}throw new f(`fn ${e.name??"(anonymous)"} has no executable body for this arity (internal invariant violation)`,{fn:e,args:t})}throw new f(`${e.kind} is not a callable function`,{fn:e,args:t})}function Yv(e,t,n){var s,o;const r=to(e.arities,t.length);if(r.bytecodeBody&&n.vmExecutionMode!=="off"){const i=r.bytecodeBody;let u=Bn(r,t);for(;u.length<i.localCount;)u.push(xt());return i.selfSlot>=0&&(u[i.selfSlot]=e),(s=n.instrumentation)==null||s.onEvent({path:"vm:macro-body",mode:n.vmExecutionMode??"function-body",formKind:"defmacro"}),vn({chunk:i,env:e.env,ctx:n,locals:u,rootFnName:e.name??null,closure:r.vmClosure??null})}if(r.astMethod){const i=r.astMethod;(o=n.instrumentation)==null||o.onEvent({path:"ast:macro-body",mode:n.vmExecutionMode??"off",formKind:"defmacro",details:{macroName:e.name??null}});const u=Nr(r.astSlotCount??0);u.upvalues=r.astUpvalues??[];const l=Bn(r,t);for(let d=0;d<l.length;d++)u.slots[d]=l[d];return i.self!==null&&(u.slots[i.self.slot]=e),ce(i.body,u,e.env,n)}throw new f(`macro ${e.name??"(anonymous)"} has no executable body for this arity (internal invariant violation)`,{macro:e,rawArgs:t})}function Hi(e,t,n,r){if(c.aFunction(e))return Bi(e,t,n,r);if(c.jsValue(e)){if(typeof e.value!==A.function)throw new f(`js-value is not callable: ${typeof e.value}`,{fn:e,args:t});const s=t.map(i=>Ke(i,n,r)),o=e.value(...s);return Ee(o)}if(c.keyword(e)){const s=t[0],o=t.length>1?t[1]:xt();if(c.map(s)){const i=an(s,e);return i===ze?o:i}if(c.record(s)){const i=s.fields.find(([u])=>c.equal(u,e));return i?i[1]:o}return o}if(c.vector(e)){if(t.length!==1)throw new f(`Vector used as function requires exactly one argument, got ${t.length}`,{fn:e,args:t});const s=t[0];if(!c.number(s)||!Number.isInteger(s.value)){const i=new f(`Vector used as function expects a number index, got ${x(s)}`,{fn:e,args:t});throw i.data={argIndex:0},i}const o=Ce(e);if(s.value<0||s.value>=o){const i=new f(`nth index ${s.value} is out of bounds for collection of length ${o}`,{fn:e,args:t});throw i.data={argIndex:0},i}return rt(e,s.value)}if(c.record(e)){if(t.length===0)throw new f("Record used as function requires at least one argument",{fn:e,args:t});const s=t[0],o=t.length>1?t[1]:xt(),i=e.fields.find(([u])=>c.equal(u,s));return i?i[1]:o}if(c.map(e)){if(t.length===0)throw new f("Map used as function requires at least one argument",{fn:e,args:t});const s=t[0],o=t.length>1?t[1]:xt(),i=an(e,s);return i===ze?o:i}if(c.set(e)){if(t.length===0)throw new f("Set used as function requires at least one argument",{fn:e,args:t});const s=t[0];return Qn(e,s)?s:xt()}if(c.var(e))return Hi(e.value,t,n,r);if(c.multiMethod(e))return Pr(e,t,n,r);throw new f(`${x(e)} is not a callable value`,{fn:e,args:t})}let Xv=0;function Ui(e="G"){return`${e}__${Xv++}`}const Zv=new Set([...Object.keys(Wn),"catch","finally","&"]);function lr(e){return c.list(e)&&e.value.length===2&&c.symbol(e.value[0])&&e.value[0].name==="unquote-splicing"}function Ur(e,t,n){const r=[];let s=[];for(const o of e)lr(o)?(s.length>0&&(r.push(a.list([a.symbol("list"),...s])),s=[]),r.push(o.value[1])):s.push(Wt(o,t,n));return s.length>0&&r.push(a.list([a.symbol("list"),...s])),r}function Wt(e,t=new Map,n){var r;switch(e.kind){case A.number:case A.string:case A.boolean:case A.keyword:case A.nil:return e;case A.symbol:{if(e.name.endsWith("#"))return t.has(e.name)||t.set(e.name,Ui(e.name.slice(0,-1))),a.list([a.symbol("quote"),a.symbol(t.get(e.name))]);if(n&&!e.name.includes("/")&&!Zv.has(e.name)){const s=qt(e.name,n);if(s)return a.list([a.symbol("quote"),a.symbol(`${s.ns}/${e.name}`)]);const o=(r=Ae(n).ns)==null?void 0:r.name;if(o)return a.list([a.symbol("quote"),a.symbol(`${o}/${e.name}`)])}return a.list([a.symbol("quote"),e])}case A.list:{if(e.value.length===2&&c.symbol(e.value[0])&&e.value[0].name==="unquote")return e.value[1];if(!e.value.some(lr))return a.list([a.symbol("list"),...e.value.map(i=>Wt(i,t,n))]);const o=Ur(e.value,t,n);return a.list([a.symbol("apply"),a.symbol("list"),a.list([a.symbol("concat*"),...o])])}case A.vector:{if(!e.value.some(lr))return a.list([a.symbol("vector"),...e.value.map(i=>Wt(i,t,n))]);const o=Ur(e.value,t,n);return a.list([a.symbol("apply"),a.symbol("vector"),a.list([a.symbol("concat*"),...o])])}case A.map:{const s=[];for(const[o,i]of e.entries)s.push(Wt(o,t,n)),s.push(Wt(i,t,n));return a.list([a.symbol("hash-map"),...s])}case A.set:{const s=je(e);if(!s.some(lr))return a.list([a.symbol("hash-set"),...s.map(u=>Wt(u,t,n))]);const i=Ur(s,t,n);return a.list([a.symbol("apply"),a.symbol("hash-set"),a.list([a.symbol("concat*"),...i])])}default:throw new f(`Unexpected form in quasiquote: ${e.kind}`,{form:e})}}function kt(e,t,n){var l;if(c.vector(e)){const d=e.value.map(m=>kt(m,t,n));return d.every((m,h)=>m===e.value[h])?e:a.vector(d)}if(c.map(e)){const d=e.entries.map(([m,h])=>[kt(m,t,n),kt(h,t,n)]);return d.every(([m,h],b)=>m===e.entries[b][0]&&h===e.entries[b][1])?e:a.map(d)}if(c.cons(e)||c.lazySeq(e)||c.indexedSeq(e))return kt(a.list(be(e)),t,n);if(!c.list(e)||e.value.length===0)return e;const r=e.value[0];if(!c.symbol(r)){const d=e.value.map(m=>kt(m,t,n));return d.every((m,h)=>m===e.value[h])?e:a.list(d)}const s=r.name;if(s==="quote")return e;if(s==="quasiquote"){const d=Wt(e.value[1],new Map,t);return kt(d,t,n)}let o;const i=s.indexOf("/");if(i>0&&i<s.length-1){const d=s.slice(0,i),m=s.slice(i+1),b=((l=Ae(t).ns)==null?void 0:l.aliases.get(d))??n.resolveNs(d)??null;if(b){const M=b.vars.get(m);o=M!==void 0?Ie(M):void 0}}else o=Cn(s,t);if(o!==void 0&&c.macro(o)){const d=n.applyMacro(o,e.value.slice(1));return kt(d,t,n)}const u=e.value.map(d=>kt(d,t,n));return u.every((d,m)=>d===e.value[m])?e:a.list(u)}function yr(){return typeof performance<"u"?performance.now():Date.now()}function Mn(e){const t=yr();return{value:e(),elapsedMs:yr()-t}}const ey="top-level-vm-cache-v1";function ty(e){const t=Et(e.form);return t===null?null:[ey,`ns:${e.namespaceId}`,`ver:${e.namespaceVersion}`,`mode:${e.mode}`,`form:${t}`,`pos:${ry(e.form)}`].join("|")}function Et(e){switch(e.kind){case"nil":return"nil";case"boolean":return`boolean:${e.value?"true":"false"}`;case"number":return`number:${ny(e.value)}`;case"string":return`string:${Rt(e.value)}`;case"character":return`character:${Rt(e.value)}`;case"keyword":return`keyword:${Rt(e.name)}`;case"symbol":return sr(`symbol:${Rt(e.name)}`,e.meta);case"regex":return`regex:${Rt(e.pattern)}/${Rt(e.flags)}`;case"list":return sr(zo("list",e.value),e.meta);case"vector":return sr(zo("vector",e.value),e.meta);case"map":return sr(`map:[${Bo(wn(e))}]`,e.meta);case"set":return`set:[${Ki(je(e))}]`;case"record":return`record:${Rt(e.ns)}/${Rt(e.recordType)}:[${Bo(e.fields)}]`;case"cons":{const t=Et(e.head),n=Et(e.tail);return t===null||n===null?null:`cons:${t}:${n}`}case"reduced":{const t=Et(e.value);return t===null?null:`reduced:${t}`}default:return null}}function zo(e,t){const n=Ki(t);return n===null?null:`${e}:[${n}]`}function Ki(e){const t=[];for(const n of e){const r=Et(n);if(r===null)return null;t.push(r)}return t.join(",")}function Bo(e){const t=[];for(const[n,r]of e){const s=Et(n),o=Et(r);if(s===null||o===null)return null;t.push(`${s}=>${o}`)}return t.join(",")}function sr(e,t){if(e===null)return null;if(t===void 0)return e;const n=Et(t);return n===null?null:`${e}^meta:${n}`}function ny(e){return Object.is(e,-0)?"-0":Number.isNaN(e)?"NaN":e===1/0?"Infinity":e===-1/0?"-Infinity":String(e)}function ry(e){const t=[];return nt(e,t),t.join(",")}function nt(e,t){switch(t.push(oy(T(e))),e.kind){case"symbol":case"list":case"vector":case"map":sy(e.meta,t);break}switch(e.kind){case"list":case"vector":for(const n of e.value)nt(n,t);break;case"map":for(const[n,r]of e.entries)nt(n,t),nt(r,t);break;case"set":for(const n of je(e))nt(n,t);break;case"record":for(const[n,r]of e.fields)nt(n,t),nt(r,t);break;case"cons":nt(e.head,t),nt(e.tail,t);break;case"reduced":nt(e.value,t);break}}function sy(e,t){e!==void 0&&nt(e,t)}function oy(e){return e===void 0?"-":[e.start,e.end,e.lineOffset??0,e.colOffset??0,ay(e.source??"")].join(":")}function ay(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return(t>>>0).toString(36)}function Rt(e){return JSON.stringify(e)}const lo="function-body";function Wi(e){return e.vmExecutionMode??lo}function Jt(e){if(e.kind===A.list&&e.value.length>0){const t=e.value[0];return t.kind===A.symbol?`list:${t.name}`:"list"}return e.kind}function Qt(e,t){var n;(n=e.instrumentation)==null||n.onEvent({mode:Wi(e),...t})}function Yt(e,t,n,r){var s;(s=e.measurement)==null||s.recordStage({stage:t,elapsedMs:n,...r})}function Ji(e,t,n){var s,o;const r=new f(e.reason.detail,{reason:e.reason,expr:t,env:n,analysisError:e.analysisError},((s=e.analysisError)==null?void 0:s.pos)??T(t));throw((o=e.analysisError)==null?void 0:o.code)!==void 0&&(r.code=e.analysisError.code),r}function iy(e,t,n,r){var l,d,m,h,b;if(r!=="opportunistic"&&r!=="vm-required")return null;const s=((l=t.ns)==null?void 0:l.id)===void 0?null:ty({namespaceId:t.ns.id,namespaceVersion:t.ns.version,mode:r,form:e}),o=s===null||(d=n.getCachedTopLevelVmChunk)==null?void 0:d.call(n,s);if(o!==void 0){if(Yt(n,":vm/cache-hit",0,{path:"vm:top-level"}),Qt(n,{path:"vm:top-level",formKind:Jt(e),ast:e,details:{cache:"hit",evalId:(m=n.currentEvalIdentity)==null?void 0:m.id,chunkId:o.id}}),n.measurement===void 0)return vn({chunk:o,env:t,ctx:n});n.measurement.setPath("vm:top-level");const{value:M,elapsedMs:v}=Mn(()=>vn({chunk:o,env:t,ctx:n}));return Yt(n,":vm/execute",v,{path:"vm:top-level"}),M}const i=n.measurement===void 0?null:Mn(()=>gs(e,t,n)),u=(i==null?void 0:i.value)??gs(e,t,n);if(i!==null&&Yt(n,":vm/compile",i.elapsedMs),u.ok){if(io(u.chunk,n),s!==null&&((h=n.setCachedTopLevelVmChunk)==null||h.call(n,s,u.chunk)),Qt(n,{path:"vm:top-level",formKind:Jt(e),ast:e,details:{cache:s===null?"uncacheable":"miss",evalId:(b=n.currentEvalIdentity)==null?void 0:b.id,chunkId:u.chunk.id}}),n.measurement===void 0)return vn({chunk:u.chunk,env:t,ctx:n});n.measurement.setPath("vm:top-level");const{value:M,elapsedMs:v}=Mn(()=>vn({chunk:u.chunk,env:t,ctx:n}));return Yt(n,":vm/execute",v,{path:"vm:top-level"}),M}if(u.fatal===!0&&(Qt(n,{path:"analyzer-error",reason:u.reason,formKind:Jt(e),ast:e}),Ji(u,e,t)),r==="vm-required")throw Qt(n,{path:"fallback",reason:u.reason,formKind:Jt(e),ast:e}),new f(`VM required but cannot compile: ${u.reason.detail}`,{reason:u.reason,expr:e,env:t},T(e));return Qt(n,{path:"fallback",reason:u.reason,formKind:Jt(e),ast:e}),Yt(n,":fallback",0,{path:"fallback",reason:u.reason}),null}function cy(e,t,n,r){let s;if(r&&n.measurement!==void 0){const d=Mn(()=>jn(e,t,n));s=d.value,Yt(n,":ast/analyze",d.elapsedMs)}else s=jn(e,t,n);if(s.errors.length>0){const d=co(s.errors);d.ok===!1&&(r&&Qt(n,{path:"analyzer-error",reason:d.reason,formKind:Jt(e),ast:e}),Ji(d,e,t))}const o=fs(s.node);if(o!==null)throw new f(`ast-walker: no walker for op '${o}' (internal invariant violation)`,{expr:e,env:t},T(e));r&&Qt(n,{path:"ast:top-level",formKind:Jt(e),ast:e});const i=Nr(s.namedSlotCount);if(!r||n.measurement===void 0)return ce(s.node,i,t,n);n.measurement.setPath("ast:top-level");const{value:u,elapsedMs:l}=Mn(()=>ce(s.node,i,t,n));return Yt(n,":ast/walk",l,{path:"ast:top-level"}),u}function ly(e,t,n){const r=n.evaluationDepth??0;n.evaluationDepth=r+1;try{if(r===0){const s=iy(e,t,n,Wi(n));if(s!==null)return s}return cy(e,t,n,r===0)}finally{n.evaluationDepth=r}}function uy(e,t,n){var s;const r=e.name.indexOf("/");if(r>0&&r<e.name.length-1){const o=e.name.slice(0,r),i=e.name.slice(r+1),l=((s=Ae(t).ns)==null?void 0:s.aliases.get(o))??n.resolveNs(o)??null;if(!l)throw new f(`No such namespace or alias: ${o}`,{symbol:e.name,env:t},T(e));if(i.includes(".")){const m=i.split("."),h=l.vars.get(m[0]);if(h===void 0)throw new f(`Symbol ${o}/${m[0]} not found`,{symbol:e.name,env:t},T(e));return kh(Ie(h),e,m.slice(1))}const d=l.vars.get(i);if(d===void 0)throw new f(`Symbol ${e.name} not found`,{symbol:e.name,env:t},T(e));return Ie(d)}try{return ni(e.name,t)}catch(o){if(o instanceof f&&!o.pos){const i=T(e);i&&(o.pos=i)}throw o}}function dy(){const e={evaluate:(t,n)=>ly(t,n,e),evaluateSymbol:(t,n)=>uy(t,n,e),applyFunction:(t,n,r)=>Bi(t,n,e,r),applyCallable:(t,n,r)=>Hi(t,n,e,r),applyMacro:(t,n)=>Yv(t,n,e),expandAll:(t,n)=>kt(t,n,e),resolveNs:t=>null,allNamespaces:()=>[],vmExecutionMode:lo,io:{stdout:t=>console.log(t),stderr:t=>console.error(t)},frameStack:[]};return e}function vs(e){const t=e.filter(n=>n.kind!==L.Comment);return t.length<3||t[0].kind!=="LParen"||t[1].kind!=="Symbol"||t[1].value!=="ns"||t[2].kind!=="Symbol"?null:t[2].value}function ys(e){const t=new Map,n=e.filter(o=>o.kind!==L.Comment&&o.kind!==L.Whitespace);if(n.length<3||n[0].kind!==L.LParen||n[1].kind!==L.Symbol||n[1].value!=="ns")return t;let r=3,s=1;for(;r<n.length&&s>0;){const o=n[r];if(o.kind===L.LParen){s++,r++;continue}if(o.kind===L.RParen){s--,r++;continue}if(o.kind===L.LBracket){let i=r+1,u=null;for(;i<n.length&&n[i].kind!==L.RBracket;){const l=n[i];l.kind===L.Symbol&&u===null&&(u=l.value),l.kind===L.Keyword&&(l.value===":as"||l.value===":as-alias")&&(i++,i<n.length&&n[i].kind===L.Symbol&&u&&t.set(n[i].value,u)),i++}}r++}return t}function Tn(e){return c.list(e)&&e.value.length>0&&c.symbol(e.value[0])&&e.value[0].name==="ns"}function fy(e){const t=e.find(Tn);return t||null}function Ho(e){const t=fy(e);if(!t)return[];const n=[];for(let r=2;r<t.value.length;r++){const s=t.value[r];c.list(s)&&c.keyword(s.value[0])&&s.value[0].name===":require"&&n.push(s.value.slice(1))}return n}const Qi=(e,t,n)=>({line:e,col:t,offset:n}),Yi=(e,t)=>({peek:(n=0)=>{const r=t.offset+n;return r>=e.length?null:e[r]},isAtEnd:()=>t.offset>=e.length,position:()=>({offset:t.offset,line:t.line,col:t.col})});function my(e){const t=Qi(0,0,0),n={...Yi(e,t),advance:()=>{if(t.offset>=e.length)return null;const r=e[t.offset];return t.offset++,r===`
`?(t.line++,t.col=0):t.col++,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s.join("")}};return n}function Xi(e){const t=Qi(0,0,0),n={...Yi(e,t),advance:()=>{if(t.offset>=e.length)return null;const r=e[t.offset];return t.offset++,t.col=r.end.col,t.line=r.end.line,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s},consumeN(r){for(let s=0;s<r;s++)n.advance()}};return n}const py=e=>e===`
`,ln=e=>[" ",",",`
`,"\r","	"].includes(e),Xn=e=>e===";",uo=e=>e==="(",fo=e=>e===")",mo=e=>e==="[",po=e=>e==="]",ho=e=>e==="{",go=e=>e==="}",hy=e=>e==='"',Zi=e=>e==="'",vo=e=>e==="`",gy=e=>e==="~",Tr=e=>e==="@",yn=e=>{const t=parseInt(e);return isNaN(t)?!1:t>=0&&t<=9},vy=e=>e===".",ec=e=>e===":",yy=e=>e==="#",yo=e=>e==="^",by=e=>e==="\\",Vr=e=>uo(e)||fo(e)||mo(e)||po(e)||ho(e)||go(e)||vo(e)||Zi(e)||Tr(e)||yo(e),wy=e=>uo(e)||fo(e)||mo(e)||po(e)||ho(e)||go(e)||vo(e)||Tr(e)||yo(e),ky=e=>{const t=e.scanner,n=t.position();return t.consumeWhile(ln),{kind:L.Whitespace,start:n,end:t.position()}},xy=e=>{const t=e.scanner,n=t.position();t.advance();const r=t.consumeWhile(s=>!py(s));return!t.isAtEnd()&&t.peek()===`
`&&t.advance(),{kind:L.Comment,value:r,start:n,end:t.position()}},$y=e=>{const t=e.scanner,n=t.position();t.advance();const r=[];let s=!1;for(;!t.isAtEnd();){const o=t.peek();if(o==="\\"){t.advance();const i=t.peek();switch(i){case'"':r.push('"');break;case"\\":r.push("\\");break;case"n":r.push(`
`);break;case"r":r.push("\r");break;case"t":r.push("	");break;default:r.push(i)}t.isAtEnd()||t.advance();continue}if(o==='"'){t.advance(),s=!0;break}r.push(t.advance())}if(!s)throw new it(`Unterminated string detected at ${n.offset}`,t.position());return{kind:L.String,value:r.join(""),start:n,end:t.position()}},My=e=>{const t=e.scanner,n=t.position(),r=t.consumeWhile(s=>ec(s)||!ln(s)&&!Vr(s)&&!Xn(s));return{kind:L.Keyword,value:r,start:n,end:t.position()}};function Sy(e,t){const r=t.scanner.peek(1);return yn(e)||e==="-"&&r!==null&&yn(r)}const qy=e=>{const t=e.scanner,n=t.position();let r="";if(t.peek()==="-"&&(r+=t.advance()),r+=t.consumeWhile(yn),!t.isAtEnd()&&t.peek()==="."&&t.peek(1)!==null&&yn(t.peek(1))&&(r+=t.advance(),r+=t.consumeWhile(yn)),!t.isAtEnd()&&(t.peek()==="e"||t.peek()==="E")){r+=t.advance(),!t.isAtEnd()&&(t.peek()==="+"||t.peek()==="-")&&(r+=t.advance());const s=t.consumeWhile(yn);if(s.length===0)throw new it(`Invalid number format at line ${n.line} column ${n.col}: "${r}"`,{start:n,end:t.position()});r+=s}if(!t.isAtEnd()&&vy(t.peek()))throw new it(`Invalid number format at line ${n.line} column ${n.col}: "${r}${t.consumeWhile(s=>!ln(s)&&!Vr(s))}"`,{start:n,end:t.position()});return{kind:L.Number,value:Number(r),start:n,end:t.position()}},Fy=e=>{const t=e.scanner,n=t.position(),r=t.consumeWhile(s=>!ln(s)&&!wy(s)&&!Xn(s));return{kind:L.Symbol,value:r,start:n,end:t.position()}},Iy=e=>{const t=e.scanner,n=t.position();return t.advance(),{kind:"Deref",start:n,end:t.position()}},Cy=e=>{const t=e.scanner,n=t.position();return t.advance(),{kind:"Meta",start:n,end:t.position()}},Ry=(e,t)=>{const n=e.scanner;n.advance();const r=[];let s=!1;for(;!n.isAtEnd();){const o=n.peek();if(o==="\\"){n.advance();const i=n.peek();if(i===null)throw new it(`Unterminated regex literal at ${t.offset}`,n.position());i==='"'?r.push('"'):(r.push("\\"),r.push(i)),n.advance();continue}if(o==='"'){n.advance(),s=!0;break}r.push(n.advance())}if(!s)throw new it(`Unterminated regex literal at ${t.offset}`,n.position());return{kind:L.Regex,value:r.join(""),start:t,end:n.position()}},jy={space:" ",newline:`
`,tab:"	",return:"\r",backspace:"\b",formfeed:"\f"},Ay=e=>{const t=e.scanner,n=t.position();if(t.advance(),t.isAtEnd())throw new it("Unexpected end of input after \\",t.position());const r=t.advance();let s=r;if(/[a-zA-Z]/.test(r)&&(s+=t.consumeWhile(i=>!ln(i)&&!Vr(i)&&!Xn(i)&&i!=='"')),s.length===1)return{kind:L.Character,value:s,start:n,end:t.position()};const o=jy[s];if(o!==void 0)return{kind:L.Character,value:o,start:n,end:t.position()};if(/^u[0-9a-fA-F]{4}$/.test(s)){const i=parseInt(s.slice(1),16);return{kind:L.Character,value:String.fromCodePoint(i),start:n,end:t.position()}}throw new it(`Unknown character literal: \\${s} at line ${n.line} column ${n.col}`,n)};function _y(e){const t=e.scanner,n=t.position();t.advance();const r=t.peek();if(r==="(")return t.advance(),{kind:L.AnonFnStart,start:n,end:t.position()};if(r==='"')return Ry(e,n);if(r==="'")return t.advance(),{kind:L.VarQuote,start:n,end:t.position()};if(r==="{")return t.advance(),{kind:L.SetStart,start:n,end:t.position()};if(r===":"){const s=t.consumeWhile(o=>o!=="{"&&o!==" "&&o!==`
`&&o!=="	"&&o!==",");return{kind:L.NsMapPrefix,value:s,start:n,end:t.position()}}if(r==="_")return t.advance(),{kind:L.Discard,start:n,end:t.position()};if(r!==null&&/[a-zA-Z]/.test(r)){const s=t.consumeWhile(o=>!ln(o)&&!Vr(o)&&!Xn(o)&&o!=='"');return{kind:L.ReaderTag,value:s,start:n,end:t.position()}}throw new it(`Unknown dispatch character: #${r??"EOF"}`,n)}function jt(e,t){return n=>{const r=n.scanner,s=r.position();return r.advance(),{kind:e,value:t,start:s,end:r.position()}}}function Py(e){const t=e.scanner,n=t.position();t.advance();const r=t.peek();if(!r)throw new it(`Unexpected end of input while parsing unquote at ${n.offset}`,n);return Tr(r)?(t.advance(),{kind:L.UnquoteSplicing,value:Ze.UnquoteSplicing,start:n,end:t.position()}):{kind:L.Unquote,value:Ze.Unquote,start:n,end:t.position()}}const Ny=[[ln,ky],[Xn,xy],[uo,jt(L.LParen,Ze.LParen)],[fo,jt(L.RParen,Ze.RParen)],[mo,jt(L.LBracket,Ze.LBracket)],[po,jt(L.RBracket,Ze.RBracket)],[ho,jt(L.LBrace,Ze.LBrace)],[go,jt(L.RBrace,Ze.RBrace)],[hy,$y],[ec,My],[Sy,qy],[Zi,jt(L.Quote,Ze.Quote)],[vo,jt(L.Quasiquote,Ze.Quasiquote)],[gy,Py],[Tr,Iy],[yo,Cy],[yy,_y],[by,Ay]];function Ly(e){const n=e.scanner.peek(),r=Ny.find(([s])=>s(n,e));if(r){const[,s]=r;return s(e)}return Fy(e)}function Ey(e){const t=[];let n;try{for(;!e.scanner.isAtEnd();){const s=Ly(e);if(!s)break;s.kind!==L.Whitespace&&t.push(s)}}catch(s){n=s}return{tokens:t,scanner:e.scanner,error:n}}function ct(e){return"value"in e?e.value:""}function Un(e){const t=e.length,r={scanner:my(e)},s=Ey(r);if(s.error)throw s.error;if(s.scanner.position().offset!==t)throw new it(`Unexpected end of input, expected ${t} characters, got ${s.scanner.position().offset}`,s.scanner.position());return s.tokens}function Pe(e){var n;const t=e.scanner;for(;((n=t.peek())==null?void 0:n.kind)===L.Discard;){t.advance(),Pe(e);const r=t.peek();if(!r)throw new G("Expected a form after #_, got end of input",t.position());if(Zn(r))throw new G(`Expected a form after #_, got '${ct(r)||r.kind}'`,r,{start:r.start.offset,end:r.end.offset});_e(e)}}function Ty(e){const t=e.scanner,n=t.peek();t.advance();const r=n.kind===L.ReaderTag?n.value:"";if(Pe(e),t.isAtEnd())throw new G(`Expected a form after reader tag #${r}, got end of input`,t.position());const s=_e(e);if(e.dataReaders){const o=e.dataReaders.get(r);if(o)try{return o(s)}catch(i){throw i instanceof G?i:new G(`Error in reader tag #${r}: ${i.message}`,n,{start:n.start.offset,end:n.end.offset})}if(e.defaultDataReader)return e.defaultDataReader(r,s);throw new G(`No reader function for tag #${r}`,n,{start:n.start.offset,end:n.end.offset})}throw new G(`Reader tags (#${r}) are only supported in EDN mode. Use clojure.edn/read-string for tagged literals.`,n,{start:n.start.offset,end:n.end.offset})}function Vy(e){const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input",t.position());switch(n.kind){case L.Symbol:return Qy(e);case L.String:{t.advance();const r=a.string(n.value);return Qe(r,{start:n.start.offset,end:n.end.offset,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),r}case L.Number:{t.advance();const r=a.number(n.value);return Qe(r,{start:n.start.offset,end:n.end.offset,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),r}case L.Character:{t.advance();const r=a.char(n.value);return Qe(r,{start:n.start.offset,end:n.end.offset,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),r}case L.Keyword:{t.advance();const r=n.value;let s;if(r.startsWith("::")){if(e.ednMode)throw new G("Auto-qualified keywords (::) are not valid in EDN",n,{start:n.start.offset,end:n.end.offset});const o=r.slice(2);if(o.includes("/")){const i=o.indexOf("/"),u=o.slice(0,i),l=o.slice(i+1),d=e.aliases.get(u);if(!d)throw new G(`No namespace alias '${u}' found for ::${u}/${l}`,n,{start:n.start.offset,end:n.end.offset});s=a.keyword(`:${d}/${l}`)}else s=a.keyword(`:${e.namespace}/${o}`)}else s=a.keyword(r);return Qe(s,{start:n.start.offset,end:n.end.offset,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),s}}throw new G(`Unexpected token: ${n.kind}`,n,{start:n.start.offset,end:n.end.offset})}const Oy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing quote",t.position());t.advance(),Pe(e);const r=_e(e);if(!r)throw new G(`Unexpected token: ${ct(n)}`,n);return a.list([a.symbol("quote"),r])},Dy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing quasiquote",t.position());t.advance(),Pe(e);const r=_e(e);if(!r)throw new G(`Unexpected token: ${ct(n)}`,n);return a.list([a.symbol("quasiquote"),r])},Gy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing unquote",t.position());t.advance(),Pe(e);const r=_e(e);if(!r)throw new G(`Unexpected token: ${ct(n)}`,n);return a.list([a.symbol("unquote"),r])},zy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing metadata",t.position());t.advance(),Pe(e);const r=_e(e);Pe(e);const s=_e(e);let o;if(c.keyword(r))o=[[r,a.boolean(!0)]];else if(c.map(r))o=r.entries;else if(c.symbol(r))o=[[a.keyword(":tag"),r]];else throw new G("Metadata must be a keyword, map, or symbol",n);if(c.symbol(s)||c.list(s)||c.vector(s)||c.map(s)){const i=s.meta?s.meta.entries:[],u=a.map([...i,...o]),l=Qs(s,u),d=T(s);return d&&Qe(l,d),l}return s},By=e=>{const t=e.scanner;if(!t.peek())throw new G("Unexpected end of input while parsing var quote",t.position());t.advance(),Pe(e);const r=_e(e);return a.list([a.symbol("var"),r])},Hy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing deref",t.position());t.advance(),Pe(e);const r=_e(e);if(!r)throw new G(`Unexpected token: ${ct(n)}`,n);return{kind:A.list,value:[a.symbol("deref"),r]}},Uy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing unquote splicing",t.position());t.advance(),Pe(e);const r=_e(e);if(!r)throw new G(`Unexpected token: ${ct(n)}`,n);return a.list([a.symbol(Ze.UnquoteSplicing),r])},Zn=e=>[L.RParen,L.RBracket,L.RBrace].includes(e.kind),Te=(e,t)=>`line ${e+1} column ${t+1}`,tc=(e,t)=>{const n=Ze[t]??t;return function(r){const s=r.scanner,o=s.peek();if(!o)throw new G("Unexpected end of input while parsing collection",s.position());s.advance();const i=[];let u=!1,l;for(;!s.isAtEnd();){Pe(r);const m=s.peek();if(!m)break;if(Zn(m)&&m.kind!==t)throw new G(`Expected \`${n}\` to close ${e} started at ${Te(o.start.line,o.start.col)}, but got \`${ct(m)}\` at ${Te(m.start.line,m.start.col)}`,m,{start:m.start.offset,end:m.end.offset});if(m.kind===t){l=m.end.offset,s.advance(),u=!0;break}const h=_e(r);i.push(h)}if(!u){const m=e==="list"?"(":"[";throw new G(`Unclosed \`${m}\` started at ${Te(o.start.line,o.start.col)} — expected matching \`${n}\` before end of input`,s.peek())}const d=e==="vector"?a.vector(i):{kind:"list",value:i};return l!==void 0&&Qe(d,{start:o.start.offset,end:l,source:r.source,lineOffset:r.lineOffset,colOffset:r.colOffset}),d}},Ky=tc("list",L.RParen),Wy=tc("vector",L.RBracket),Jy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing set",t.position());t.advance();const r=[];let s=!1,o;for(;!t.isAtEnd();){Pe(e);const l=t.peek();if(!l)break;if(Zn(l)&&l.kind!==L.RBrace)throw new G(`Expected '}' to close set started at ${Te(n.start.line,n.start.col)}, but got '${ct(l)}' at ${Te(l.start.line,l.start.col)}`,l,{start:l.start.offset,end:l.end.offset});if(l.kind===L.RBrace){o=l.end.offset,t.advance(),s=!0;break}r.push(_e(e))}if(!s)throw new G(`Unclosed \`#{\` started at ${Te(n.start.line,n.start.col)} — expected '}' before end of input`,t.peek());const i=[];for(const l of r)i.some(d=>c.equal(d,l))||i.push(l);const u=a.set(i);return o!==void 0&&Qe(u,{start:n.start.offset,end:o,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),u},Qy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input",t.position());if(n.kind!==L.Symbol)throw new G(`Unexpected token: ${ct(n)}`,n,{start:n.start.offset,end:n.end.offset});t.advance();let r;switch(n.value){case"true":case"false":r=a.boolean(n.value==="true");break;case"nil":r=a.nil();break;default:r=a.symbol(n.value)}return Qe(r,{start:n.start.offset,end:n.end.offset,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),r},Yy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing map",t.position());let r=!1,s;t.advance();const o=[];for(;!t.isAtEnd();){Pe(e);const u=t.peek();if(!u)break;if(Zn(u)&&u.kind!==L.RBrace)throw new G(`Expected '}' to close map started at ${Te(n.start.line,n.start.col)}, but got '${u.kind}' at ${Te(u.start.line,u.start.col)}`,u,{start:u.start.offset,end:u.end.offset});if(u.kind===L.RBrace){s=u.end.offset,t.advance(),r=!0;break}const l=_e(e);Pe(e);const d=t.peek();if(!d)throw new G(`Expected value in map started at ${Te(n.start.line,n.start.col)}, but got end of input`,t.position());if(d.kind===L.RBrace)throw new G(`Map started at ${Te(n.start.line,n.start.col)} has key ${l.kind} but no value`,t.position());const m=_e(e);if(!m)break;o.push([l,m])}if(!r)throw new G(`Unclosed \`{\` started at ${Te(n.start.line,n.start.col)} — expected '}' before end of input`,t.peek());const i=a.map(o);return s!==void 0&&Qe(i,{start:n.start.offset,end:s,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),i};function Xy(e){let t=0,n=!1;function r(s){switch(s.kind){case"symbol":{const o=s.name;o==="%"||o==="%1"?t=Math.max(t,1):/^%[2-9]$/.test(o)?t=Math.max(t,parseInt(o[1])):o==="%&"&&(n=!0);break}case"list":case"vector":for(const o of s.value)r(o);break;case"map":for(const[o,i]of s.entries)r(o),r(i);break}}for(const s of e)r(s);return{maxIndex:t,hasRest:n}}function Vn(e){switch(e.kind){case"symbol":{const t=e.name,n=T(e),r=s=>{const o=a.symbol(s);return n&&Qe(o,n),o};return t==="%"||t==="%1"?r("p1"):/^%[2-9]$/.test(t)?r(`p${t[1]}`):t==="%&"?r("rest"):e}case"list":return{...e,value:e.value.map(Vn)};case"vector":return{...e,value:e.value.map(Vn)};case"map":return{...e,entries:e.entries.map(([t,n])=>[Vn(t),Vn(n)])};default:return e}}const Zy=e=>{const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input while parsing anonymous function",t.position());t.advance();const r=[];let s=!1,o;for(;!t.isAtEnd();){Pe(e);const b=t.peek();if(!b)break;if(Zn(b)&&b.kind!==L.RParen)throw new G(`Expected ')' to close anonymous function started at ${Te(n.start.line,n.start.col)}, but got '${ct(b)}' at ${Te(b.start.line,b.start.col)}`,b,{start:b.start.offset,end:b.end.offset});if(b.kind===L.RParen){o=b.end.offset,t.advance(),s=!0;break}if(b.kind===L.AnonFnStart)throw new G("Nested anonymous functions (#(...)) are not allowed",b,{start:b.start.offset,end:b.end.offset});r.push(_e(e))}if(!s)throw new G(`Unclosed \`#(\` started at ${Te(n.start.line,n.start.col)} — expected ')' before end of input`,t.peek());const i=a.list(r),{maxIndex:u,hasRest:l}=Xy([i]),d=[];for(let b=1;b<=u;b++)d.push(a.symbol(`p${b}`));l&&(d.push(a.symbol("&")),d.push(a.symbol("rest")));const m=Vn(i),h=a.list([a.symbol("fn"),a.vector(d),m]);return o!==void 0&&Qe(h,{start:n.start.offset,end:o,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),h};function eb(e){let t=e,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(t))!==null;){for(const o of s[1]){if(o==="x")throw new G("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",null);n.includes(o)||(n+=o)}t=t.slice(s[0].length)}return{pattern:t,flags:n}}const tb=e=>{const t=e.scanner,n=t.peek();if(!n||n.kind!==L.Regex)throw new G("Expected regex token",t.position());t.advance();const{pattern:r,flags:s}=eb(n.value),o=a.regex(r,s);return Qe(o,{start:n.start.offset,end:n.end.offset,source:e.source,lineOffset:e.lineOffset,colOffset:e.colOffset}),o};function _e(e){const t=e.scanner,n=t.peek();if(!n)throw new G("Unexpected end of input",t.position());if(e.ednMode)switch(n.kind){case L.Quote:throw new G("Quote (') is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.Quasiquote:throw new G("Syntax-quote (`) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.Unquote:throw new G("Unquote (~) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.UnquoteSplicing:throw new G("Unquote-splicing (~@) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.AnonFnStart:throw new G("Anonymous function (#(...)) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.Regex:throw new G('Regex literal (#"...") is not valid in EDN',n,{start:n.start.offset,end:n.end.offset});case L.Deref:throw new G("Deref (@) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.VarQuote:throw new G("Var-quote (#') is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.Meta:throw new G("Metadata (^) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case L.NsMapPrefix:throw new G("Namespaced map (#:ns{...}) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset})}switch(n.kind){case L.String:case L.Number:case L.Keyword:case L.Symbol:case L.Character:return Vy(e);case L.LParen:return Ky(e);case L.LBrace:return Yy(e);case L.LBracket:return Wy(e);case L.Quote:return Oy(e);case L.Quasiquote:return Dy(e);case L.Unquote:return Gy(e);case L.UnquoteSplicing:return Uy(e);case L.AnonFnStart:return Zy(e);case L.SetStart:return Jy(e);case L.Deref:return Hy(e);case L.VarQuote:return By(e);case L.Meta:return zy(e);case L.Regex:return tb(e);case L.NsMapPrefix:return rb(e);case L.ReaderTag:return Ty(e);case L.Discard:throw new G("Unexpected #_ discard in this context",n,{start:n.start.offset,end:n.end.offset});default:throw new G(`Unexpected token: ${ct(n)} at ${Te(n.start.line,n.start.col)}`,n,{start:n.start.offset,end:n.end.offset})}}function nb(e,t,n){if(e.startsWith("::")){const r=e.slice(2);if(!r)return t.namespace;const s=t.aliases.get(r);if(!s)throw new G(`No namespace alias '${r}' found for #${e}{...}`,n,{start:n.start.offset,end:n.end.offset});return s}return e.slice(1)}const rb=e=>{const t=e.scanner,n=t.peek();if(!n||n.kind!==L.NsMapPrefix)throw new G("Expected namespace map prefix",t.position());t.advance();const r=nb(n.value,e,n),s=_e(e);if(!c.map(s))throw new G(`#:${r}{...} requires a map literal, got ${s.kind}`,n,{start:n.start.offset,end:n.end.offset});const o=s.entries.map(([i,u])=>{if(c.keyword(i)){const l=i.name.slice(1);if(!l.includes("/"))return[a.keyword(`:${r}/${l}`),u]}return[i,u]});return a.map(o)};function br(e,t="user",n=new Map,r,s,o){const i=e.filter(m=>m.kind!==L.Comment),u=Xi(i),l={scanner:u,namespace:t,aliases:n,source:r,lineOffset:s,colOffset:o},d=[];for(;!u.isAtEnd()&&(Pe(l),!u.isAtEnd());)d.push(_e(l));return d}function sb(e,t,n,r,s){const o=e.filter(d=>d.kind!==L.Comment),i=Xi(o),u={scanner:i,namespace:"user",aliases:new Map,source:n,lineOffset:r,colOffset:s,ednMode:!0,dataReaders:t==null?void 0:t.dataReaders,defaultDataReader:t==null?void 0:t.defaultDataReader},l=[];for(;!i.isAtEnd()&&(Pe(u),!i.isAtEnd());)l.push(_e(u));return l}const ob=["clojure","user"];function ab(e,t){if(t==="all")return!0;const n=e.split(".")[0];return ob.includes(n)?!0:t.some(r=>e===r||e.startsWith(r+"."))}function ib(){return{envs:new Map,namespaces:new Map,vars:new Map,values:new Map,chunks:new Map,upvalues:new Map}}function Nt(e,t){if(t.envs.has(e))return t.envs.get(e);const n={bindings:new Map,outer:null};t.envs.set(e,n),e.outer&&(n.outer=Nt(e.outer,t)),e.ns&&(n.ns=Or(e.ns,t));for(const[r,s]of e.bindings)n.bindings.set(r,J(s,t));return n}function Or(e,t){const n=t.namespaces.get(e);if(n)return n;const r=a.namespace(e.name);r.id=e.id,r.version=e.version,r.doc=e.doc,r.readerAliases=new Map(e.readerAliases),r.aliases=new Map,r.vars=new Map,t.namespaces.set(e,r);for(const[s,o]of e.vars)r.vars.set(s,bo(o,t));for(const[s,o]of e.aliases)r.aliases.set(s,Or(o,t));return r}function bo(e,t){const n=t.vars.get(e);if(n)return n;const r={kind:"var",ns:e.ns,name:e.name,value:a.nil(),dynamic:e.dynamic};return t.vars.set(e,r),r.value=J(e.value,t),e.bindingStack&&(r.bindingStack=e.bindingStack.map(s=>J(s,t))),e.meta&&(r.meta=J(e.meta,t)),r}function Uo(e,t){return{params:e.params.map(n=>J(n,t)),restParam:e.restParam?J(e.restParam,t):null,body:e.body.map(n=>J(n,t)),...e.bytecodeBody?{bytecodeBody:nc(e.bytecodeBody,t)}:{},...e.vmClosure?{vmClosure:cb(e.vmClosure,t)}:{},...e.astMethod?{astMethod:e.astMethod}:{},...e.astSlotCount!==void 0?{astSlotCount:e.astSlotCount}:{},...e.astUpvalues?{astUpvalues:e.astUpvalues.map(n=>J(n,t))}:{}}}function cb(e,t){return{env:Nt(e.env,t),upvalues:e.upvalues.map(n=>lb(n,t)),name:e.name}}function lb(e,t){const n=t.upvalues.get(e);if(n)return n;const r={frame:null,slot:e.slot,closedValue:null};t.upvalues.set(e,r);const s=e.frame!==null?e.frame.locals[e.slot]??a.nil():e.closedValue??a.nil();return r.closedValue=J(s,t),r}function ub(e,t){return{arities:e.arities.map(n=>({params:n.params.map(r=>J(r,t)),restParam:n.restParam?J(n.restParam,t):null,body:n.body.map(r=>J(r,t)),chunk:nc(n.chunk,t)})),upvalueDescriptors:e.upvalueDescriptors.map(n=>({...n})),name:e.name,...e.meta?{meta:J(e.meta,t)}:{}}}function nc(e,t){const n=t.chunks.get(e);if(n)return n;const r={id:e.id,code:[...e.code],constants:[],globalVarCache:[],positions:[...e.positions],callArgPositions:e.callArgPositions.map(s=>s?[...s]:void 0),name:e.name,maxStack:e.maxStack,localCount:e.localCount,innerFunctions:[],catchTables:[],lexicalVarLookups:[],selfSlot:e.selfSlot};return t.chunks.set(e,r),r.constants=e.constants.map(s=>J(s,t)),r.globalVarCache=e.globalVarCache.map(s=>s?{ns:Or(s.ns,t),var:bo(s.var,t)}:void 0),r.innerFunctions=e.innerFunctions.map(s=>ub(s,t)),r.catchTables=e.catchTables.map(s=>({clauses:s.clauses.map(o=>({...o,discriminator:J(o.discriminator,t)}))})),r.lexicalVarLookups=e.lexicalVarLookups.map(s=>({symbol:J(s.symbol,t),candidates:s.candidates.map(o=>({...o}))})),r}function Gt(e,t,n){const r=t.values.get(e);if(r)return r;const s=n();return t.values.set(e,s),s}function J(e,t){if(!e||typeof e!="object")return e;const n=t.values.get(e);if(n)return n;switch(e.kind){case"number":case"string":case"character":case"boolean":case"keyword":case"nil":case"regex":case"native-function":case"js-value":case"pending":return e;case"symbol":return Gt(e,t,()=>({...e,...e.meta?{meta:J(e.meta,t)}:{}}));case"list":return Gt(e,t,()=>({...e,value:e.value.map(r=>J(r,t)),...e.meta?{meta:J(e.meta,t)}:{}}));case"vector":{const r=a.vector(ot(e).map(s=>J(s,t)));return e.meta&&(r.meta=J(e.meta,t)),e.__cljamMapEntry&&(r.__cljamMapEntry=!0),t.values.set(e,r),r}case"map":{const r=a.map(e.entries.map(([s,o])=>[J(s,t),J(o,t)]));return e.meta&&(r.meta=J(e.meta,t)),t.values.set(e,r),r}case"set":{const r=a.set(e._map.entries.map(([s])=>J(s,t)));return e.meta&&(r.meta=J(e.meta,t)),t.values.set(e,r),r}case"namespace":return Or(e,t);case"var":return bo(e,t);case"function":{const r={...e,arities:[],env:Ot()};return t.values.set(e,r),r.env=Nt(e.env,t),r.arities=e.arities.map(s=>Uo(s,t)),e.meta&&(r.meta=J(e.meta,t)),r}case"macro":{const r={...e,arities:[],env:Ot()};return t.values.set(e,r),r.env=Nt(e.env,t),r.arities=e.arities.map(s=>Uo(s,t)),e.meta&&(r.meta=J(e.meta,t)),r}case"atom":{const r={kind:"atom",value:a.nil()};return t.values.set(e,r),r.value=J(e.value,t),e.meta&&(r.meta=J(e.meta,t)),e.validator&&(r.validator=J(e.validator,t)),e.watches&&(r.watches=new Map([...e.watches].map(([s,o])=>[s,{key:J(o.key,t),fn:J(o.fn,t),callEnv:Nt(o.callEnv,t)}]))),r}case"volatile":return Gt(e,t,()=>({kind:"volatile",value:J(e.value,t)}));case"reduced":return Gt(e,t,()=>({kind:"reduced",value:J(e.value,t)}));case"delay":{const r={kind:"delay",thunk:e.thunk,realized:e.realized,value:e.value?J(e.value,t):void 0,thunkFn:e.thunkFn?J(e.thunkFn,t):void 0,callEnv:e.callEnv?Nt(e.callEnv,t):void 0};return t.values.set(e,r),r}case"lazy-seq":{const r={kind:"lazy-seq",thunk:e.thunk,realized:e.realized,value:e.value?J(e.value,t):void 0,thunkFn:e.thunkFn?J(e.thunkFn,t):void 0,callEnv:e.callEnv?Nt(e.callEnv,t):void 0};return t.values.set(e,r),r}case"cons":return Gt(e,t,()=>({...e,head:J(e.head,t),tail:J(e.tail,t),...e.meta?{meta:J(e.meta,t)}:{}}));case"indexed-seq":return Gt(e,t,()=>a.indexedSeq(e.array.map(r=>J(r,t)),e.offset));case"multi-method":{const r={kind:"multi-method",name:e.name,dispatchFn:e.dispatchFn,methods:[]};return t.values.set(e,r),r.dispatchFn=J(e.dispatchFn,t),r.methods=e.methods.map(s=>({dispatchVal:J(s.dispatchVal,t),fn:J(s.fn,t)})),e.defaultMethod&&(r.defaultMethod=J(e.defaultMethod,t)),e.defaultDispatchVal&&(r.defaultDispatchVal=J(e.defaultDispatchVal,t)),r}case"protocol":{const r={kind:"protocol",name:e.name,ns:e.ns,fns:e.fns.map(s=>({...s,arglists:s.arglists.map(o=>[...o])})),doc:e.doc,impls:new Map,...e.meta?{meta:J(e.meta,t)}:{}};t.values.set(e,r);for(const[s,o]of e.impls){const i={};for(const[u,l]of Object.entries(o))i[u]=J(l,t);r.impls.set(s,i)}return r}case"record":return Gt(e,t,()=>({...e,fields:e.fields.map(([r,s])=>[J(r,t),J(s,t)]),...e.meta?{meta:J(e.meta,t)}:{}}))}}function db(e){const t=ib(),n=new Map;for(const[r,s]of e)n.set(r,Nt(s,t));return n}function bs(e,t,n){if(!e.has(n)){const r=Ot(t);r.ns=gr(n),e.set(n,r)}return e.get(n)}function rc(e,t,n){if((n?n(e):!0)&&t!==void 0&&!ab(e,t)){const s=t==="all"?[]:t,o=new f(`Access denied: namespace '${e}' is not in the allowed packages for this session.
Allowed packages: ${JSON.stringify(s)}
To allow all packages, use: allowedPackages: 'all'`,{nsName:e,allowedPackages:t});throw o.code="namespace/access-denied",o}}function ur(e,t,n,r,s){if(!c.vector(e))throw new f("require spec must be a vector, e.g. [my.ns :as alias]",{spec:e});const o=e.value;if(o.length===0||!c.symbol(o[0]))throw new f("First element of require spec must be a namespace symbol",{spec:e});const i=o[0].name;rc(i,r,s);let u=!1;if(o.some(h=>c.keyword(h)&&h.name===":as-alias")){let h=1;for(;h<o.length;){const b=o[h];if(!c.keyword(b))throw new f(`Expected keyword in require spec, got ${b.kind}`,{spec:e,position:h});if(b.name===":as-alias"){h++;const M=o[h];if(!M||!c.symbol(M))throw new f(":as-alias expects a symbol alias",{spec:e,position:h});t.ns.readerAliases.get(M.name)!==i&&(t.ns.readerAliases.set(M.name,i),u=!0),h++}else throw new f(`:as-alias specs only support :as-alias, got ${b.name}`,{spec:e})}return u}const d=n.get(i);if(!d){const h=new f(`Namespace '${i}' not found. Only already-loaded namespaces can be required.`,{nsName:i});throw h.code="namespace/not-found",h}let m=1;for(;m<o.length;){const h=o[m];if(!c.keyword(h))throw new f(`Expected keyword in require spec, got ${h.kind}`,{spec:e,position:m});if(h.name===":as"){m++;const b=o[m];if(!b||!c.symbol(b))throw new f(":as expects a symbol alias",{spec:e,position:m});t.ns.aliases.get(b.name)!==d.ns&&(t.ns.aliases.set(b.name,d.ns),u=!0),m++}else if(h.name===":refer"){m++;const b=o[m];if(!b||!c.vector(b))throw new f(":refer expects a vector of symbols",{spec:e,position:m});for(const M of b.value){if(!c.symbol(M))throw new f(":refer vector must contain only symbols",{spec:e,sym:M});const v=d.ns.vars.get(M.name);if(v===void 0)throw new f(`Symbol ${M.name} not found in namespace ${i}`,{nsName:i,symbol:M.name});t.ns.vars.get(M.name)!==v&&(t.ns.vars.set(M.name,v),u=!0)}m++}else throw new f(`Unknown require option ${h.name}. Supported: :as, :refer`,{spec:e,keyword:h.name})}return u}function ws(e,t,n,r,s,o){if(r&&c.vector(e)&&e.value.length>0&&c.symbol(e.value[0])&&!e.value.some(u=>c.keyword(u)&&u.name===":as-alias")){const u=e.value[0].name;rc(u,s,o),r(u)}return ur(e,t,n,s,o)}function fb(e,t,n,r){var u,l;const s=((u=e.get("user"))==null?void 0:u.ns)??gr("user");me("*ns*",s,t);const o=(l=t.ns)==null?void 0:l.vars.get("*ns*");o&&(o.dynamic=!0);function i(d){var m;return d===void 0?null:ds(d)?d:zt(d)?((m=e.get(d.name))==null?void 0:m.ns)??null:null}me("ns-name",a.nativeFn("ns-name",d=>d===void 0?a.nil():c.namespace(d)?a.symbol(d.name):c.symbol(d)?d:c.string(d)?a.symbol(d.value):a.nil()).withMeta([...g({doc:"Returns the namespace name as a symbol for the given value.",arglists:[["x"]],docGroup:w.introspection})]),t),me("all-ns",a.nativeFn("all-ns",()=>a.list([...e.values()].map(d=>d.ns).filter(Boolean))).withMeta([...g({doc:"Returns a list of all namespaces loaded in the session.",arglists:[[]],docGroup:w.introspection})]),t),me("find-ns",a.nativeFn("find-ns",d=>{var m;return d===void 0||!zt(d)?a.nil():((m=e.get(d.name))==null?void 0:m.ns)??a.nil()}).withMeta([...g({doc:"Returns the namespace as a value for the given symbol, or nil if the symbol is not a namespace or not loaded.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("in-ns",a.nativeFnCtx("in-ns",(d,m,h)=>{var b;if(!h||!zt(h))throw new f("in-ns expects a symbol",{sym:h});return d.setCurrentNs&&d.setCurrentNs(h.name),((b=e.get(h.name))==null?void 0:b.ns)??a.nil()}).withMeta([...g({doc:"Sets the current namespace to the given symbol and returns the namespace as a value.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("ns-aliases",a.nativeFn("ns-aliases",d=>{const m=i(d);if(!m)return a.map([]);const h=[];return m.aliases.forEach((b,M)=>{h.push([a.symbol(M),b])}),a.map(h)}).withMeta([...g({doc:"Returns a map of the aliases for the given namespace.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("ns-interns",a.nativeFn("ns-interns",d=>{const m=i(d);if(!m)return a.map([]);const h=[];return m.vars.forEach((b,M)=>{b.ns===m.name&&h.push([a.symbol(M),b])}),a.map(h)}).withMeta([...g({doc:"Returns a map of the interned vars for the given namespace.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("ns-publics",a.nativeFn("ns-publics",d=>{const m=i(d);if(!m)return a.map([]);const h=[];return m.vars.forEach((b,M)=>{var y;if(b.ns!==m.name)return;(((y=b.meta)==null?void 0:y.entries)??[]).some(([$,R])=>c.keyword($)&&$.name===":private"&&c.boolean(R)&&R.value===!0)||h.push([a.symbol(M),b])}),a.map(h)}).withMeta([...g({doc:"Returns a map of the public vars for the given namespace.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("ns-refers",a.nativeFn("ns-refers",d=>{const m=i(d);if(!m)return a.map([]);const h=[];return m.vars.forEach((b,M)=>{b.ns!==m.name&&h.push([a.symbol(M),b])}),a.map(h)}).withMeta([...g({doc:"Returns a map of the refers for the given namespace.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("ns-map",a.nativeFn("ns-map",d=>{const m=i(d);if(!m)return a.map([]);const h=[];return m.vars.forEach((b,M)=>{h.push([a.symbol(M),b])}),a.map(h)}).withMeta([...g({doc:"Returns a map of the vars for the given namespace.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("ns-imports",a.nativeFn("ns-imports",d=>a.map([])).withMeta([...g({doc:"",arglists:[["sym"]],docGroup:w.introspection,extra:{"no-doc":!0}})]),t),me("the-ns",a.nativeFn("the-ns",d=>{var m;return d===void 0?a.nil():ds(d)?d:zt(d)?((m=e.get(d.name))==null?void 0:m.ns)??a.nil():a.nil()}).withMeta([...g({doc:"Returns the namespace as a value for the given symbol, or nil if the symbol is not a namespace or not loaded.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("instance?",a.nativeFn("instance?",(d,m)=>a.boolean(!1)).withMeta([...g({doc:"",arglists:[["cls","obj"]],docGroup:w.introspection,extra:{"no-doc":!0}})]),t),me("class",a.nativeFn("class",d=>d===void 0?a.nil():a.string(`conjure.${d.kind}`)).withMeta([...g({doc:"",arglists:[["x"]],docGroup:w.introspection,extra:{"no-doc":!0}})]),t),me("class?",a.nativeFn("class?",d=>a.boolean(!1)).withMeta([...g({doc:"",arglists:[["x"]],docGroup:w.introspection,extra:{"no-doc":!0}})]),t),me("special-symbol?",a.nativeFn("special-symbol?",d=>{if(d===void 0||!zt(d))return a.boolean(!1);const m=new Set([...Object.values(Wn),"import"]);return a.boolean(m.has(d.name))}).withMeta([...g({doc:"Returns true if the given symbol is a special symbol reserved by the language.",arglists:[["sym"]],docGroup:w.introspection})]),t),me("loaded-libs",a.nativeFn("loaded-libs",()=>a.set([...e.keys()].map(a.symbol))).withMeta([...g({doc:"Returns a set of the loaded libraries.",arglists:[[]],docGroup:w.introspection})]),t),me("require",a.nativeFnCtx("require",(d,m,...h)=>{var M;const b=e.get(n());for(const v of h)ws(v,b,e,$=>r($,d))&&b.ns&&((M=d.touchNamespace)==null||M.call(d,b.ns,"require"));return a.nil()}).withMeta([...g({doc:"Parses the require spec and load the namespace(s) specified into the current namespace.",arglists:[["args"]],docGroup:w.runtime})]),t),me("resolve",a.nativeFn("resolve",d=>{if(!zt(d))return a.nil();const m=d.name.indexOf("/");if(m>0){const b=d.name.slice(0,m),M=d.name.slice(m+1),v=e.get(b)??null;return v?Cn(M,v)??a.nil():a.nil()}const h=e.get(n());return Cn(d.name,h)??a.nil()}).withMeta([...g({doc:"Resolves the given symbol to a value in the current namespace.",arglists:[["sym"]],docGroup:w.introspection})]),t)}function mb(e,t){const n=bs(e,t,"clojure.reflect");me("parse-flags",a.nativeFn("parse-flags",(s,o)=>a.set([])),n),me("reflect",a.nativeFn("reflect",s=>a.map([])),n),me("type-reflect",a.nativeFn("type-reflect",(s,...o)=>a.map([])),n);const r=bs(e,t,"cursive.repl.runtime");me("completions",a.nativeFn("completions",(...s)=>a.nil()),r);for(const s of["Class","Object","String","Number","Boolean","Integer","Long","Double","Float","Byte","Short","Character","Void","Math","System","Runtime","Thread","Throwable","Exception","Error","Iterable","Comparable","Runnable","Cloneable"])me(s,a.keyword(`:java.lang/${s}`),t,a.map([[a.keyword(":no-doc"),a.boolean(!0)]]))}function pb(e){return c.list(e)&&e.value.length>0&&c.symbol(e.value[0])&&e.value[0].name==="ns"}function hb(e){if(!c.list(e))return[];const t=[];for(let n=2;n<e.value.length;n++){const r=e.value[n];if(c.list(r)&&r.value.length>0&&c.keyword(r.value[0])&&r.value[0].name===":require")for(let s=1;s<r.value.length;s++)t.push(r.value[s])}return t}function Kr(e,t){if(!c.vector(e))return null;const n=e.value;for(let r=1;r<n.length;r++){const s=n[r];if(c.keyword(s)&&s.name===t){const o=n[r+1];return o&&c.symbol(o)?o.name:null}}return null}function gb(e,t){return c.vector(e)?e.value.some(n=>c.keyword(n)&&n.name===t):!1}function Wr(e,t,n){const r=Un(e),s=ys(r),o=vs(r)??t??"user",i=br(r,o,s,e),u=i.filter(pb);if(u.length>1){const E=new f(`A file may declare at most one namespace, but found ${u.length} ns forms. Split the file, or use (in-ns 'name) for REPL namespace switching.`,{count:u.length,filePath:n});throw E.code="namespace/multiple-ns-forms",E}const l=u[0]??null,d=l&&c.list(l)?l.value[1]:void 0,m=d&&c.symbol(d)?d.name:t??"user",h=l&&c.list(l)?l.value[2]:void 0,b=h&&c.string(h)?h.value:void 0,M=i.filter(E=>E!==l),v=[],y=[],$=[],R=new Map;if(l)for(const E of hb(l)){if(!c.vector(E)||E.value.length===0)continue;const U=E.value[0];if(c.string(U)){const S=Kr(E,":as");y.push({specifier:U.value,alias:S,spec:E});continue}if(!c.symbol(U))continue;const le=U.name;if(gb(E,":as-alias")){const S=Kr(E,":as-alias");S&&($.push({alias:S,nsName:le}),R.set(S,le));continue}v.push({nsName:le,spec:E});const P=Kr(E,":as");P&&R.set(P,le)}return{nsName:m,doc:b,filePath:n,forms:i,nsForm:l,bodyForms:M,cljRequires:v,hostRequires:y,readerAliases:$,aliasMap:R}}function vb(e,t){const n=new Map;for(const l of e){if(n.has(l.id))throw new Error(`Duplicate module ID: '${l.id}'`);n.set(l.id,l)}const r=new Map;for(const l of e)for(const d of l.declareNs){const m=r.get(d.name)??[];m.push(l.id),r.set(d.name,m)}const s=new Map,o=new Map;for(const l of e)s.set(l.id,[]),o.set(l.id,0);for(const l of e)for(const d of l.dependsOn??[]){if(t!=null&&t.has(d))continue;const m=r.get(d);if(!m||m.length===0)throw new Error(`No module provides namespace '${d}' (required by '${l.id}')`);for(const h of m)h!==l.id&&(s.get(h).push(l.id),o.set(l.id,o.get(l.id)+1))}const i=[];for(const[l,d]of o)d===0&&i.push(l);const u=[];for(;i.length>0;){const l=i.shift();u.push(n.get(l));for(const d of s.get(l)){const m=o.get(d)-1;o.set(d,m),m===0&&i.push(d)}}if(u.length!==e.length){const l=e.map(d=>d.id).filter(d=>!u.some(m=>m.id===d));throw new Error(`Circular dependency detected in module system. Modules in cycle: ${l.join(", ")}`)}return u}const yb={"+":a.nativeFn("+",function(...t){if(t.length===0)return a.number(0);if(t.length===2){if(!c.number(t[0]))throw f.atArg("+ expects all arguments to be numbers",{args:t},0);if(!c.number(t[1]))throw f.atArg("+ expects all arguments to be numbers",{args:t},1);return a.number(t[0].value+t[1].value)}let n=0;for(let r=0;r<t.length;r++){if(!c.number(t[r]))throw f.atArg("+ expects all arguments to be numbers",{args:t},r);n+=t[r].value}return a.number(n)}).withMeta([...g({doc:"Returns the sum of the arguments. Throws on non-number arguments.",arglists:[["&","nums"]],docGroup:w.arithmetic,extra:{someNum:42,someBool:!0,someString:"hello",someSymbol:a.symbol("hello"),someKeyword:a.keyword(":hello"),someVector:a.vector([a.number(1),a.number(2),a.number(3)]),someMap:a.map([[a.keyword(":a"),a.number(1)],[a.keyword(":b"),a.number(2)],[a.keyword(":c"),a.number(3)]]),someSet:a.set([a.number(1),a.number(2),a.number(3)]),someList:a.list([a.number(1),a.number(2),a.number(3)]),someAtom:a.atom(a.number(1))}})]),"-":a.nativeFn("-",function(...t){if(t.length===0)throw new f("- expects at least one argument",{args:t});if(!c.number(t[0]))throw f.atArg("- expects all arguments to be numbers",{args:t},0);if(t.length===1)return a.number(-t[0].value);if(t.length===2){if(!c.number(t[1]))throw f.atArg("- expects all arguments to be numbers",{args:t},1);return a.number(t[0].value-t[1].value)}let n=t[0].value;for(let r=1;r<t.length;r++){if(!c.number(t[r]))throw f.atArg("- expects all arguments to be numbers",{args:t},r);n-=t[r].value}return a.number(n)}).withMeta([...g({doc:"Returns the difference of the arguments. Throws on non-number arguments.",arglists:[["&","nums"]],docGroup:w.arithmetic})]),"*":a.nativeFn("*",function(...t){if(t.length===0)return a.number(1);if(t.length===2){if(!c.number(t[0]))throw f.atArg("* expects all arguments to be numbers",{args:t},0);if(!c.number(t[1]))throw f.atArg("* expects all arguments to be numbers",{args:t},1);return a.number(t[0].value*t[1].value)}let n=1;for(let r=0;r<t.length;r++){if(!c.number(t[r]))throw f.atArg("* expects all arguments to be numbers",{args:t},r);n*=t[r].value}return a.number(n)}).withMeta([...g({doc:"Returns the product of the arguments. Throws on non-number arguments.",arglists:[["&","nums"]],docGroup:w.arithmetic})]),"/":a.nativeFn("/",function(...t){if(t.length===0)throw new f("/ expects at least one argument",{args:t});if(!c.number(t[0]))throw f.atArg("/ expects all arguments to be numbers",{args:t},0);if(t.length===1){if(t[0].value===0)throw f.atArg("division by zero",{args:t},0);return a.number(1/t[0].value)}if(t.length===2){if(!c.number(t[1]))throw f.atArg("/ expects all arguments to be numbers",{args:t},1);if(t[1].value===0)throw f.atArg("division by zero",{args:t},1);return a.number(t[0].value/t[1].value)}let n=t[0].value;for(let r=1;r<t.length;r++){if(!c.number(t[r]))throw f.atArg("/ expects all arguments to be numbers",{args:t},r);if(t[r].value===0){const s=new f("division by zero",{args:t});throw s.data={argIndex:r},s}n/=t[r].value}return a.number(n)}).withMeta([...g({doc:"Returns the quotient of the arguments. Throws on non-number arguments or division by zero.",arglists:[["&","nums"]],docGroup:w.arithmetic})]),">":a.nativeFn(">",function(...t){if(t.length<2)throw new f("> expects at least two arguments",{args:t});if(t.length===2){if(!c.number(t[0]))throw f.atArg("> expects all arguments to be numbers",{args:t},0);if(!c.number(t[1]))throw f.atArg("> expects all arguments to be numbers",{args:t},1);return a.boolean(t[0].value>t[1].value)}if(!c.number(t[0]))throw f.atArg("> expects all arguments to be numbers",{args:t},0);for(let n=1;n<t.length;n++){if(!c.number(t[n]))throw f.atArg("> expects all arguments to be numbers",{args:t},n);if(t[n].value>=t[n-1].value)return a.boolean(!1)}return a.boolean(!0)}).withMeta([...g({doc:"Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.",arglists:[["&","nums"]],docGroup:w.comparison})]),"<":a.nativeFn("<",function(...t){if(t.length<2)throw new f("< expects at least two arguments",{args:t});if(t.length===2){if(!c.number(t[0]))throw f.atArg("< expects all arguments to be numbers",{args:t},0);if(!c.number(t[1]))throw f.atArg("< expects all arguments to be numbers",{args:t},1);return a.boolean(t[0].value<t[1].value)}for(let n=0;n<t.length;n++)if(!c.number(t[n]))throw f.atArg("< expects all arguments to be numbers",{args:t},n);for(let n=1;n<t.length;n++)if(t[n].value<=t[n-1].value)return a.boolean(!1);return a.boolean(!0)}).withMeta([...g({doc:"Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.",arglists:[["&","nums"]],docGroup:w.comparison})]),">=":a.nativeFn(">=",function(...t){if(t.length<2)throw new f(">= expects at least two arguments",{args:t});if(t.length===2){if(!c.number(t[0]))throw f.atArg(">= expects all arguments to be numbers",{args:t},0);if(!c.number(t[1]))throw f.atArg(">= expects all arguments to be numbers",{args:t},1);return a.boolean(t[0].value>=t[1].value)}for(let n=0;n<t.length;n++)if(!c.number(t[n]))throw f.atArg(">= expects all arguments to be numbers",{args:t},n);for(let n=1;n<t.length;n++)if(t[n].value>t[n-1].value)return a.boolean(!1);return a.boolean(!0)}).withMeta([...g({doc:"Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.",arglists:[["&","nums"]],docGroup:w.comparison})]),"<=":a.nativeFn("<=",function(...t){if(t.length<2)throw new f("<= expects at least two arguments",{args:t});if(t.length===2){if(!c.number(t[0]))throw f.atArg("<= expects all arguments to be numbers",{args:t},0);if(!c.number(t[1]))throw f.atArg("<= expects all arguments to be numbers",{args:t},1);return a.boolean(t[0].value<=t[1].value)}for(let n=0;n<t.length;n++)if(!c.number(t[n]))throw f.atArg("<= expects all arguments to be numbers",{args:t},n);for(let n=1;n<t.length;n++)if(t[n].value<t[n-1].value)return a.boolean(!1);return a.boolean(!0)}).withMeta([...g({doc:"Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.",arglists:[["&","nums"]],docGroup:w.comparison})]),"=":a.nativeFn("=",function(...t){if(t.length<2)throw new f("= expects at least two arguments",{args:t});for(let n=1;n<t.length;n++)if(!c.equal(t[n],t[n-1]))return a.boolean(!1);return a.boolean(!0)}).withMeta([...g({doc:"Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.",arglists:[["&","vals"]],docGroup:w.comparison})]),inc:a.nativeFn("inc",function(t){if(t===void 0||!c.number(t))throw f.atArg(`inc expects a number${t!==void 0?`, got ${x(t)}`:""}`,{x:t},0);return a.number(t.value+1)}).withMeta([...g({doc:"Returns the argument incremented by 1. Throws on non-number arguments.",arglists:[["x"]],docGroup:w.arithmetic})]),dec:a.nativeFn("dec",function(t){if(t===void 0||!c.number(t))throw f.atArg(`dec expects a number${t!==void 0?`, got ${x(t)}`:""}`,{x:t},0);return a.number(t.value-1)}).withMeta([...g({doc:"Returns the argument decremented by 1. Throws on non-number arguments.",arglists:[["x"]],docGroup:w.arithmetic})]),max:a.nativeFn("max",function(...t){if(t.length===0)throw new f("max expects at least one argument",{args:t});if(!c.number(t[0]))throw f.atArg("max expects all arguments to be numbers",{args:t},0);let n=t[0].value;for(let r=1;r<t.length;r++){if(!c.number(t[r]))throw f.atArg("max expects all arguments to be numbers",{args:t},r);const s=t[r].value;s>n&&(n=s)}return a.number(n)}).withMeta([...g({doc:"Returns the largest of the arguments. Throws on non-number arguments.",arglists:[["&","nums"]],docGroup:w.arithmetic})]),min:a.nativeFn("min",function(...t){if(t.length===0)throw new f("min expects at least one argument",{args:t});if(!c.number(t[0]))throw f.atArg("min expects all arguments to be numbers",{args:t},0);let n=t[0].value;for(let r=1;r<t.length;r++){if(!c.number(t[r]))throw f.atArg("min expects all arguments to be numbers",{args:t},r);const s=t[r].value;s<n&&(n=s)}return a.number(n)}).withMeta([...g({doc:"Returns the smallest of the arguments. Throws on non-number arguments.",arglists:[["&","nums"]],docGroup:w.arithmetic})]),mod:a.nativeFn("mod",function(t,n){if(t===void 0||!c.number(t))throw f.atArg(`mod expects a number as first argument${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);if(n===void 0||!c.number(n))throw f.atArg(`mod expects a number as second argument${n!==void 0?`, got ${x(n)}`:""}`,{d:n},1);if(n.value===0){const o=new f("mod: division by zero",{n:t,d:n});throw o.data={argIndex:1},o}const r=t.value,s=n.value;return a.number(r-s*Math.floor(r/s))}).withMeta([...g({doc:"Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.",arglists:[["n","d"]],docGroup:w.arithmetic})]),"even?":a.nativeFn("even?",function(t){if(t===void 0||!c.number(t))throw f.atArg(`even? expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.boolean(t.value%2===0)}).withMeta([...g({doc:"Returns true if the argument is an even number, false otherwise.",arglists:[["n"]],docGroup:w.arithmetic})]),"odd?":a.nativeFn("odd?",function(t){if(t===void 0||!c.number(t))throw f.atArg(`odd? expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.boolean(Math.abs(t.value)%2!==0)}).withMeta([...g({doc:"Returns true if the argument is an odd number, false otherwise.",arglists:[["n"]],docGroup:w.arithmetic})]),"pos?":a.nativeFn("pos?",function(t){if(t===void 0||!c.number(t))throw f.atArg(`pos? expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.boolean(t.value>0)}).withMeta([...g({doc:"Returns true if the argument is a positive number, false otherwise.",arglists:[["n"]],docGroup:w.arithmetic})]),"neg?":a.nativeFn("neg?",function(t){if(t===void 0||!c.number(t))throw f.atArg(`neg? expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.boolean(t.value<0)}).withMeta([...g({doc:"Returns true if the argument is a negative number, false otherwise.",arglists:[["n"]],docGroup:w.arithmetic})]),"zero?":a.nativeFn("zero?",function(t){if(t===void 0||!c.number(t))throw f.atArg(`zero? expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.boolean(t.value===0)}).withMeta([...g({doc:"Returns true if the argument is zero, false otherwise.",arglists:[["n"]],docGroup:w.arithmetic})]),abs:a.nativeFn("abs",function(t){if(t===void 0||!c.number(t))throw f.atArg(`abs expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.number(Math.abs(t.value))}).withMeta([...g({doc:"Returns the absolute value of a.",arglists:[["a"]],docGroup:w.arithmetic})]),sqrt:a.nativeFn("sqrt",function(t){if(t===void 0||!c.number(t))throw f.atArg(`sqrt expects a number${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.number(Math.sqrt(t.value))}).withMeta([...g({doc:"Returns the square root of n.",arglists:[["n"]],docGroup:w.arithmetic})]),quot:a.nativeFn("quot",function(t,n){if(t===void 0||!c.number(t))throw f.atArg("quot expects a number as first argument",{num:t},0);if(n===void 0||!c.number(n))throw f.atArg("quot expects a number as second argument",{div:n},1);if(n.value===0)throw f.atArg("quot: division by zero",{num:t,div:n},1);return a.number(Math.trunc(t.value/n.value))}).withMeta([...g({doc:"quot[ient] of dividing numerator by denominator.",arglists:[["num","div"]],docGroup:w.arithmetic})]),rem:a.nativeFn("rem",function(t,n){if(t===void 0||!c.number(t))throw f.atArg("rem expects a number as first argument",{num:t},0);if(n===void 0||!c.number(n))throw f.atArg("rem expects a number as second argument",{div:n},1);if(n.value===0)throw f.atArg("rem: division by zero",{num:t,div:n},1);return a.number(t.value%n.value)}).withMeta([...g({doc:"remainder of dividing numerator by denominator.",arglists:[["num","div"]],docGroup:w.arithmetic})]),rand:a.nativeFn("rand",function(...t){if(t.length===0)return a.number(Math.random());if(!c.number(t[0]))throw f.atArg("rand expects a number",{n:t[0]},0);return a.number(Math.random()*t[0].value)}).withMeta([...g({doc:"Returns a random floating point number between 0 (inclusive) and n (default 1) (exclusive).",arglists:[[],["n"]],docGroup:w.arithmetic})]),"rand-int":a.nativeFn("rand-int",function(t){if(t===void 0||!c.number(t))throw f.atArg("rand-int expects a number",{n:t},0);return a.number(Math.floor(Math.random()*t.value))}).withMeta([...g({doc:"Returns a random integer between 0 (inclusive) and n (exclusive).",arglists:[["n"]],docGroup:w.arithmetic})]),"rand-nth":a.nativeFn("rand-nth",function(t){if(t===void 0||!c.list(t)&&!c.vector(t)&&!c.indexedSeq(t))throw f.atArg("rand-nth expects a list or vector",{coll:t},0);const n=c.indexedSeq(t)?t.array.slice(t.offset):t.value;if(n.length===0)throw f.atArg("rand-nth called on empty collection",{coll:t},0);return n[Math.floor(Math.random()*n.length)]}).withMeta([...g({doc:"Return a random element of the (sequential) collection.",arglists:[["coll"]],docGroup:w.arithmetic})]),shuffle:a.nativeFn("shuffle",function(t){if(t===void 0||c.nil(t))return a.vector([]);if(!c.seqable(t))throw f.atArg(`shuffle expects a collection, got ${x(t)}`,{coll:t},0);const n=[...be(t)];for(let r=n.length-1;r>0;r--){const s=Math.floor(Math.random()*(r+1));[n[r],n[s]]=[n[s],n[r]]}return a.vector(n)}).withMeta([...g({doc:"Return a random permutation of coll.",arglists:[["coll"]],docGroup:w.collections})]),"bit-and":a.nativeFn("bit-and",function(t,n){if(!t||!c.number(t))throw f.atArg("bit-and expects numbers",{x:t},0);if(!n||!c.number(n))throw f.atArg("bit-and expects numbers",{y:n},1);return a.number(t.value&n.value)}).withMeta([...g({doc:"Bitwise and",arglists:[["x","y"]],docGroup:w.arithmetic})]),"bit-or":a.nativeFn("bit-or",function(t,n){if(!t||!c.number(t))throw f.atArg("bit-or expects numbers",{x:t},0);if(!n||!c.number(n))throw f.atArg("bit-or expects numbers",{y:n},1);return a.number(t.value|n.value)}).withMeta([...g({doc:"Bitwise or",arglists:[["x","y"]],docGroup:w.arithmetic})]),"bit-xor":a.nativeFn("bit-xor",function(t,n){if(!t||!c.number(t))throw f.atArg("bit-xor expects numbers",{x:t},0);if(!n||!c.number(n))throw f.atArg("bit-xor expects numbers",{y:n},1);return a.number(t.value^n.value)}).withMeta([...g({doc:"Bitwise exclusive or",arglists:[["x","y"]],docGroup:w.arithmetic})]),"bit-not":a.nativeFn("bit-not",function(t){if(!t||!c.number(t))throw f.atArg("bit-not expects a number",{x:t},0);return a.number(~t.value)}).withMeta([...g({doc:"Bitwise complement",arglists:[["x"]],docGroup:w.arithmetic})]),"bit-shift-left":a.nativeFn("bit-shift-left",function(t,n){if(!t||!c.number(t))throw f.atArg("bit-shift-left expects numbers",{x:t},0);if(!n||!c.number(n))throw f.atArg("bit-shift-left expects numbers",{n},1);return a.number(t.value<<n.value)}).withMeta([...g({doc:"Bitwise shift left",arglists:[["x","n"]],docGroup:w.arithmetic})]),"bit-shift-right":a.nativeFn("bit-shift-right",function(t,n){if(!t||!c.number(t))throw f.atArg("bit-shift-right expects numbers",{x:t},0);if(!n||!c.number(n))throw f.atArg("bit-shift-right expects numbers",{n},1);return a.number(t.value>>n.value)}).withMeta([...g({doc:"Bitwise shift right",arglists:[["x","n"]],docGroup:w.arithmetic})]),"unsigned-bit-shift-right":a.nativeFn("unsigned-bit-shift-right",function(t,n){if(!t||!c.number(t))throw f.atArg("unsigned-bit-shift-right expects numbers",{x:t},0);if(!n||!c.number(n))throw f.atArg("unsigned-bit-shift-right expects numbers",{n},1);return a.number(t.value>>>n.value)}).withMeta([...g({doc:"Bitwise shift right, without sign-extension",arglists:[["x","n"]],docGroup:w.arithmetic})]),char:a.nativeFn("char",function(t){if(t===void 0||!c.number(t))throw new f(`char expects a number, got ${t!==void 0?x(t):"nothing"}`,{n:t});const n=Math.trunc(t.value);if(n<0||n>1114111)throw new f(`char: code point ${n} is out of Unicode range`,{n:t});return a.char(String.fromCodePoint(n))}).withMeta([...g({doc:"Returns the character at the given Unicode code point.",arglists:[["n"]],docGroup:w.arithmetic})]),int:a.nativeFn("int",function(t){if(t===void 0)throw new f("int expects one argument",{});if(c.char(t))return a.number(t.value.codePointAt(0));if(c.number(t))return a.number(Math.trunc(t.value));throw new f(`int expects a number or character, got ${x(t)}`,{x:t})}).withMeta([...g({doc:"Coerces x to int. For characters, returns the Unicode code point.",arglists:[["x"]],docGroup:w.arithmetic})]),compare:a.nativeFn("compare",function(t,n){if(c.nil(t)&&c.nil(n))return a.number(0);if(c.nil(t))return a.number(-1);if(c.nil(n))return a.number(1);if(c.number(t)&&c.number(n)||c.string(t)&&c.string(n)||c.char(t)&&c.char(n))return a.number(t.value<n.value?-1:t.value>n.value?1:0);if(c.keyword(t)&&c.keyword(n))return a.number(t.name<n.name?-1:t.name>n.name?1:0);throw new f(`compare: cannot compare ${x(t)} to ${x(n)}`,{x:t,y:n})}).withMeta([...g({doc:"Comparator. Returns a negative number, zero, or a positive number.",arglists:[["x","y"]],docGroup:w.comparison})]),hash:a.nativeFn("hash",function(t){return a.number(Ve(t))}).withMeta([...g({doc:"Returns the hash code of its argument.",arglists:[["x"]],docGroup:w.utilities})])};function Ko(e,t,n,r){if(e.validator&&c.aFunction(e.validator)){const s=n.applyFunction(e.validator,[t],r);if(c.falsy(s))throw new f("Invalid reference state",{newVal:t})}}function Wo(e,t,n,r){if(t.watches)for(const[,{key:s,fn:o,callEnv:i}]of t.watches)e.applyFunction(o,[s,a.atom(r),n,r],i)}const bb={atom:a.nativeFn("atom",function(t){return a.atom(t)}).withMeta([...g({doc:"Returns a new atom holding the given value.",arglists:[["value"]],docGroup:w.atoms})]),deref:a.nativeFnCtx("deref",function(t,n,r){if(c.atom(r)||c.volatile(r)||c.reduced(r))return r.value;if(c.delay(r))return Ci(r,t,n);throw c.pending(r)?f.atArg("@ on a pending value requires an (async ...) context. Use (async @x) or compose with then/catch.",{value:r},0):f.atArg(`deref expects an atom, volatile, reduced, or delay value, got ${r.kind}`,{value:r},0)}).withMeta([...g({doc:"Returns the wrapped value from an atom, volatile, reduced, or delay value.",arglists:[["value"]],docGroup:w.atoms})]),"swap!":a.nativeFnCtx("swap!",function(t,n,r,s,...o){if(!c.atom(r))throw f.atArg(`swap! expects an atom as its first argument, got ${r.kind}`,{atomVal:r},0);if(!c.aFunction(s))throw f.atArg(`swap! expects a function as its second argument, got ${s.kind}`,{fn:s},1);const i=r,u=i.value,l=t.applyFunction(s,[u,...o],n);return Ko(i,l,t,n),i.value=l,Wo(t,i,u,l),l}).withMeta([...g({doc:"Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.",arglists:[["atomVal","fn","&","extraArgs"]],docGroup:w.atoms})]),"reset!":a.nativeFnCtx("reset!",function(t,n,r,s){if(!c.atom(r))throw f.atArg(`reset! expects an atom as its first argument, got ${r.kind}`,{atomVal:r},0);const o=r,i=o.value;return Ko(o,s,t,n),o.value=s,Wo(t,o,i,s),s}).withMeta([...g({doc:"Sets the value of the atom to newVal and returns the new value.",arglists:[["atomVal","newVal"]],docGroup:w.atoms})]),"atom?":a.nativeFn("atom?",function(t){return a.boolean(c.atom(t))}).withMeta([...g({doc:"Returns true if the value is an atom, false otherwise.",arglists:[["value"]],docGroup:w.atoms})]),"swap-vals!":a.nativeFnCtx("swap-vals!",function(t,n,r,s,...o){if(!c.atom(r))throw f.atArg(`swap-vals! expects an atom, got ${x(r)}`,{atomVal:r},0);if(!c.aFunction(s))throw f.atArg(`swap-vals! expects a function, got ${x(s)}`,{fn:s},1);const i=r.value,u=t.applyFunction(s,[i,...o],n);return r.value=u,a.vector([i,u])}).withMeta([...g({doc:"Atomically swaps the value of atom to be (apply f current-value-of-atom args). Returns [old new].",arglists:[["atom","f","&","args"]],docGroup:w.atoms})]),"reset-vals!":a.nativeFn("reset-vals!",function(t,n){if(!c.atom(t))throw f.atArg(`reset-vals! expects an atom, got ${x(t)}`,{atomVal:t},0);const r=t.value;return t.value=n,a.vector([r,n])}).withMeta([...g({doc:"Sets the value of atom to newVal. Returns [old new].",arglists:[["atom","newval"]],docGroup:w.atoms})]),"compare-and-set!":a.nativeFn("compare-and-set!",function(t,n,r){if(!c.atom(t))throw f.atArg(`compare-and-set! expects an atom, got ${x(t)}`,{atomVal:t},0);return c.equal(t.value,n)?(t.value=r,a.boolean(!0)):a.boolean(!1)}).withMeta([...g({doc:"Atomically sets the value of atom to newval if and only if the current value of the atom is identical to oldval. Returns true if set happened, else false.",arglists:[["atom","oldval","newval"]],docGroup:w.atoms})]),"add-watch":a.nativeFnCtx("add-watch",function(t,n,r,s,o){if(!c.atom(r))throw f.atArg(`add-watch expects an atom, got ${x(r)}`,{atomVal:r},0);if(!c.aFunction(o))throw f.atArg(`add-watch expects a function, got ${x(o)}`,{fn:o},2);const i=r;return i.watches||(i.watches=new Map),i.watches.set(x(s),{key:s,fn:o,callEnv:n}),r}).withMeta([...g({doc:"Adds a watch function to an atom. The watch fn must be a fn of 4 args: a key, the atom, its old-state, its new-state.",arglists:[["atom","key","fn"]],docGroup:w.atoms})]),"remove-watch":a.nativeFn("remove-watch",function(t,n){if(!c.atom(t))throw f.atArg(`remove-watch expects an atom, got ${x(t)}`,{atomVal:t},0);const r=t;return r.watches&&r.watches.delete(x(n)),t}).withMeta([...g({doc:"Removes a watch (set by add-watch) from an atom.",arglists:[["atom","key"]],docGroup:w.atoms})]),"set-validator!":a.nativeFnCtx("set-validator!",function(t,n,r,s){if(!c.atom(r))throw f.atArg(`set-validator! expects an atom, got ${x(r)}`,{atomVal:r},0);if(c.nil(s))return r.validator=void 0,a.nil();if(!c.aFunction(s))throw f.atArg(`set-validator! expects a function or nil, got ${x(s)}`,{fn:s},1);return r.validator=s,a.nil()}).withMeta([...g({doc:"Sets the validator-fn for an atom. fn must be nil or a side-effect-free fn of one argument.",arglists:[["atom","fn"]],docGroup:w.atoms})]),"volatile!":a.nativeFn("volatile!",function(t){if(t===void 0)throw new f("volatile! expects one argument",{});return a.volatile(t)}).withMeta([...g({doc:"Returns a volatile value with the given value as its value.",arglists:[["value"]],docGroup:w.atoms})]),"volatile?":a.nativeFn("volatile?",function(t){if(t===void 0)throw new f("volatile? expects one argument",{});return a.boolean(c.volatile(t))}).withMeta([...g({doc:"Returns true if the given value is a volatile value, false otherwise.",arglists:[["value"]],docGroup:w.predicates})]),"vreset!":a.nativeFn("vreset!",function(t,n){if(!c.volatile(t))throw new f(`vreset! expects a volatile as its first argument, got ${x(t)}`,{vol:t});if(n===void 0)throw new f("vreset! expects two arguments",{vol:t});return t.value=n,n}).withMeta([...g({doc:"Resets the value of the given volatile to the given new value and returns the new value.",arglists:[["vol","newVal"]],docGroup:w.atoms})]),"vswap!":a.nativeFnCtx("vswap!",function(t,n,r,s,...o){if(!c.volatile(r))throw new f(`vswap! expects a volatile as its first argument, got ${x(r)}`,{vol:r});if(!c.aFunction(s))throw new f(`vswap! expects a function as its second argument, got ${x(s)}`,{fn:s});const i=t.applyFunction(s,[r.value,...o],n);return r.value=i,i}).withMeta([...g({doc:"Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.",arglists:[["vol","fn"],["vol","fn","&","extraArgs"]],docGroup:w.atoms})])},wb={"hash-map":a.nativeFn("hash-map",function(...t){if(t.length===0)return a.map([]);if(t.length%2!==0)throw new f(`hash-map expects an even number of arguments, got ${t.length}`,{args:t});const n=[];for(let r=0;r<t.length;r+=2){const s=t[r],o=t[r+1];n.push([s,o])}return a.map(n)}).withMeta([...g({doc:"Returns a new hash-map containing the given key-value pairs.",arglists:[["&","kvals"]],docGroup:w.maps})]),assoc:a.nativeFn("assoc",function(t,...n){if(!t)throw new f("assoc expects a collection as first argument",{collection:t});if(c.nil(t)&&(t=a.map([])),c.list(t))throw new f("assoc on lists is not supported, use vectors instead",{collection:t});if(c.indexedSeq(t))throw new f("assoc on sequences is not supported, use vectors instead",{collection:t});if(!c.collection(t))throw f.atArg(`assoc expects a collection, got ${x(t)}`,{collection:t},0);if(n.length<2)throw new f("assoc expects at least two arguments",{args:n});if(n.length%2!==0)throw new f("assoc expects an even number of binding arguments",{args:n});if(c.vector(t)){let r=t;for(let s=0;s<n.length;s+=2){const o=n[s];if(!c.number(o))throw f.atArg(`assoc on vectors expects each key argument to be a index (number), got ${x(o)}`,{index:o},s+1);if(o.value>Ce(r))throw f.atArg(`assoc index ${o.value} is out of bounds for vector of length ${Ce(r)}`,{index:o,collection:t},s+1);r=rp(r,o.value,n[s+1])}return r}if(c.record(t)){const r=[...t.fields];for(let s=0;s<n.length;s+=2){const o=n[s],i=n[s+1],u=r.findIndex(([l])=>c.equal(l,o));u===-1?r.push([o,i]):r[u]=[o,i]}return a.record(t.recordType,t.ns,r,t.basis)}if(c.map(t)){let r=t;for(let s=0;s<n.length;s+=2)r=Cr(r,n[s],n[s+1]);return r}throw new f(`unhandled collection type, got ${x(t)}`,{collection:t})}).withMeta([...g({doc:"Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.",arglists:[["collection","&","kvals"]],docGroup:w.collections})]),dissoc:a.nativeFn("dissoc",function(t,...n){if(!t)throw new f("dissoc expects a collection as first argument",{collection:t});if(c.list(t))throw f.atArg("dissoc on lists is not supported, use vectors instead",{collection:t},0);if(c.indexedSeq(t))throw f.atArg("dissoc on sequences is not supported, use vectors instead",{collection:t},0);if(!c.collection(t))throw f.atArg(`dissoc expects a collection, got ${x(t)}`,{collection:t},0);if(c.vector(t)){if(Ce(t)===0)return t;const r=[...ot(t)];for(let s=0;s<n.length;s+=1){const o=n[s];if(!c.number(o))throw f.atArg(`dissoc on vectors expects each key argument to be a index (number), got ${x(o)}`,{index:o},s+1);if(o.value>=r.length)throw f.atArg(`dissoc index ${o.value} is out of bounds for vector of length ${r.length}`,{index:o,collection:t},s+1);r.splice(o.value,1)}return a.vector(r)}if(c.record(t)){const r=[...t.fields];let s=!1;for(let o=0;o<n.length;o+=1){const i=n[o];c.keyword(i)&&t.basis.includes(i.name)&&(s=!0);const u=r.findIndex(([l])=>c.equal(l,i));u!==-1&&r.splice(u,1)}return s?a.map(r):a.record(t.recordType,t.ns,r,t.basis)}if(c.map(t)){let r=t;for(let s=0;s<n.length;s+=1)r=Gs(r,n[s]);return r}throw new f(`unhandled collection type, got ${x(t)}`,{collection:t})}).withMeta([...g({doc:"Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.",arglists:[["collection","&","keys"]],docGroup:w.collections})]),zipmap:a.nativeFn("zipmap",function(t,n){if(t===void 0||!c.seqable(t))throw new f(`zipmap expects a collection or string as first argument${t!==void 0?`, got ${x(t)}`:""}`,{ks:t});if(n===void 0||!c.seqable(n))throw new f(`zipmap expects a collection or string as second argument${n!==void 0?`, got ${x(n)}`:""}`,{vs:n});const r=be(t),s=be(n),o=Math.min(r.length,s.length),i=[];for(let u=0;u<o;u++)i.push([r[u],s[u]]);return a.map(i)}).withMeta([...g({doc:"Returns a new map with the keys and values of the given collections.",arglists:[["ks","vs"]],docGroup:w.maps})]),find:a.nativeFn("find",function(t,n){if(t===void 0||c.nil(t))return a.nil();if(!c.map(t)&&!c.record(t))throw f.atArg(`find expects a map, record, or nil${t!==void 0?`, got ${x(t)}`:""}`,{m:t},0);const s=(c.record(t)?t.fields:wn(t)).find(([o])=>c.equal(o,n));return s===void 0?a.nil():a.mapEntry(s[0],s[1])}).withMeta([...g({doc:"Returns the map entry for key in m, or nil if key is not present.",arglists:[["m","key"]],docGroup:w.maps})]),key:a.nativeFn("key",function(t){if(t===void 0||!c.mapEntry(t))throw f.atArg(`key expects a map entry${t!==void 0?`, got ${x(t)}`:""}`,{entry:t},0);return rt(t,0)}).withMeta([...g({doc:"Returns the key from a map entry.",arglists:[["entry"]],docGroup:w.maps})]),val:a.nativeFn("val",function(t){if(t===void 0||!c.mapEntry(t))throw f.atArg(`val expects a map entry${t!==void 0?`, got ${x(t)}`:""}`,{entry:t},0);return rt(t,1)}).withMeta([...g({doc:"Returns the value from a map entry.",arglists:[["entry"]],docGroup:w.maps})]),keys:a.nativeFn("keys",function(t){if(t===void 0||!c.map(t)&&!c.record(t))throw f.atArg(`keys expects a map or record${t!==void 0?`, got ${x(t)}`:""}`,{m:t},0);const n=c.record(t)?t.fields:wn(t);return a.vector(n.map(function([s]){return s}))}).withMeta([...g({doc:"Returns a vector of the keys of the given map or record.",arglists:[["m"]],docGroup:w.maps})]),vals:a.nativeFn("vals",function(t){if(t===void 0||!c.map(t)&&!c.record(t))throw f.atArg(`vals expects a map or record${t!==void 0?`, got ${x(t)}`:""}`,{m:t},0);const n=c.record(t)?t.fields:wn(t);return a.vector(n.map(function([,s]){return s}))}).withMeta([...g({doc:"Returns a vector of the values of the given map or record.",arglists:[["m"]],docGroup:w.maps})]),"hash-set":a.nativeFn("hash-set",function(...t){const n=[];for(const r of t)n.some(s=>c.equal(s,r))||n.push(r);return a.set(n)}).withMeta([...g({doc:"Returns a set containing the given values.",arglists:[["&","xs"]],docGroup:w.sets})]),set:a.nativeFn("set",function(t){if(t===void 0||c.nil(t))return a.set([]);const n=be(t),r=[];for(const s of n)r.some(o=>c.equal(o,s))||r.push(s);return a.set(r)}).withMeta([...g({doc:"Returns a set of the distinct elements of the given collection.",arglists:[["coll"]],docGroup:w.collections})]),"set?":a.nativeFn("set?",function(t){return a.boolean(t!==void 0&&c.set(t))}).withMeta([...g({doc:"Returns true if x is a set.",arglists:[["x"]],docGroup:w.predicates})]),disj:a.nativeFn("disj",function(t,...n){if(t===void 0||c.nil(t))return a.set([]);if(!c.set(t))throw f.atArg(`disj expects a set, got ${x(t)}`,{s:t},0);let r=t;for(const s of n)r=ep(r,s);return r}).withMeta([...g({doc:"Returns a set with the given items removed.",arglists:[["s","&","items"]],docGroup:w.sets})])},kb={list:a.nativeFn("list",function(...t){return t.length===0?a.list([]):a.list(t)}).withMeta([...g({doc:"Returns a new list containing the given values.",arglists:[["&","args"]],docGroup:w.sequences})]),seq:a.nativeFnCtx("seq",function e(t,n,r){if(c.nil(r))return a.nil();if(c.lazySeq(r)){const o=$t(r,t,n);return c.nil(o)?a.nil():e(t,n,o)}if(c.cons(r)||c.indexedSeq(r))return r;if(c.list(r))return r.value.length===0?a.nil():r;if(!c.seqable(r))throw f.atArg(`seq expects a collection, string, or nil, got ${x(r)}`,{collection:r},0);const s=be(r);return s.length===0?a.nil():a.indexedSeq(s,0)}).withMeta([...g({doc:"Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.",arglists:[["coll"]],docGroup:w.sequences})]),first:a.nativeFnCtx("first",function e(t,n,r){if(c.nil(r))return a.nil();if(c.lazySeq(r)){const o=$t(r,t,n);return c.nil(o)?a.nil():e(t,n,o)}if(c.cons(r))return r.head;if(c.indexedSeq(r))return r.array[r.offset];if(c.vector(r))return Ce(r)===0?a.nil():rt(r,0);if(!c.seqable(r))throw f.atArg("first expects a collection or string",{collection:r},0);const s=be(r);return s.length===0?a.nil():s[0]}).withMeta([...g({doc:"Returns the first element of the given collection or string.",arglists:[["coll"]],docGroup:w.sequences})]),rest:a.nativeFnCtx("rest",function e(t,n,r){if(c.nil(r))return a.list([]);if(c.lazySeq(r)){const s=$t(r,t,n);return c.nil(s)?a.list([]):e(t,n,s)}if(c.cons(r))return r.tail;if(c.indexedSeq(r)){const s=r.offset+1;return s>=r.array.length?a.list([]):a.indexedSeq(r.array,s)}if(!c.seqable(r))throw f.atArg("rest expects a collection or string",{collection:r},0);if(c.list(r))return r.value.length<=1?a.list([]):a.indexedSeq(r.value,1);if(c.vector(r))return a.vector(Ea(r,1));if(c.map(r)||c.record(r)){const s=be(r);return a.list(s.slice(1))}if(c.string(r)){const s=be(r);return a.list(s.slice(1))}throw f.atArg(`rest expects a collection or string, got ${x(r)}`,{collection:r},0)}).withMeta([...g({doc:"Returns a sequence of the given collection or string excluding the first element.",arglists:[["coll"]],docGroup:w.sequences})]),conj:a.nativeFn("conj",function(t,...n){if(!t)throw new f("conj expects a collection as first argument",{collection:t});if(n.length===0)return t;if(!c.collection(t))throw f.atArg(`conj expects a collection, got ${x(t)}`,{collection:t},0);if(c.list(t)){const r=[];for(let s=n.length-1;s>=0;s--)r.push(n[s]);return a.list([...r,...t.value])}if(c.vector(t))return Ta(t,...n);if(c.map(t)){let r=t;for(let s=0;s<n.length;s+=1){const o=n[s],i=s+1;if(!c.vector(o))throw f.atArg(`conj on maps expects each argument to be a vector key-pair for maps, got ${x(o)}`,{pair:o},i);if(Ce(o)!==2)throw f.atArg(`conj on maps expects each argument to be a vector key-pair for maps, got ${x(o)}`,{pair:o},i);r=Cr(r,rt(o,0),rt(o,1))}return r}if(c.record(t)){const r=[...t.fields];for(let s=0;s<n.length;s+=1){const o=n[s];if(!c.vector(o)||Ce(o)!==2)throw f.atArg(`conj on records expects each argument to be a vector key-pair, got ${x(o)}`,{pair:o},s+1);const i=rt(o,0),u=rt(o,1),l=r.findIndex(([d])=>c.equal(d,i));l===-1?r.push([i,u]):r[l]=[i,u]}return a.record(t.recordType,t.ns,r,t.basis)}if(c.set(t)){let r=t;for(const s of n)r=Pa(r,s);return r}throw new f(`unhandled collection type, got ${x(t)}`,{collection:t})}).withMeta([...g({doc:"Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.",arglists:[["collection","&","args"]],docGroup:w.sequences})]),cons:a.nativeFn("cons",function(t,n){if(c.lazySeq(n)||c.cons(n)||c.indexedSeq(n))return a.cons(t,n);if(c.nil(n))return a.list([t]);if(!c.collection(n))throw f.atArg(`cons expects a collection as second argument, got ${x(n)}`,{xs:n},1);if(c.map(n)||c.set(n)||c.record(n))throw f.atArg("cons on maps, sets, and records is not supported, use vectors instead",{xs:n},1);const r=c.list(n)?a.list:a.vector,s=c.vector(n)?ot(n):n.value,o=[t,...s];return r(o)}).withMeta([...g({doc:"Returns a new collection with x prepended to the head of xs.",arglists:[["x","xs"]],docGroup:w.sequences})]),get:a.nativeFn("get",function(t,n,r){const s=r??a.nil();switch(t.kind){case A.map:{const o=an(t,n);return o===ze?s:o}case A.record:{for(const[o,i]of t.fields)if(c.equal(o,n))return i;return s}case A.vector:{if(!c.number(n))throw new f("get on vectors expects a 0-based index as parameter",{key:n});const o=t;return n.value<0||n.value>=Ce(o)?s:rt(o,n.value)}default:return s}}).withMeta([...g({doc:"Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.",arglists:[["target","key"],["target","key","not-found"]],docGroup:w.sequences})]),nth:a.nativeFnCtx("nth",function(t,n,r,s,o){if(s===void 0||!c.number(s))throw new f(`nth expects a number index${s!==void 0?`, got ${x(s)}`:""}`,{n:s});const i=s.value;if(r===void 0||c.nil(r)){if(o!==void 0)return o;throw new f(`nth index ${i} is out of bounds for collection of length 0`,{coll:r,n:s})}if(c.lazySeq(r)||c.cons(r)){let l=r,d=0;for(;;){for(;c.lazySeq(l);)l=$t(l,t,n);if(c.nil(l)){if(o!==void 0)return o;const h=new f(`nth index ${i} is out of bounds`,{coll:r,n:s});throw h.data={argIndex:1},h}if(c.cons(l)){if(d===i)return l.head;l=l.tail,d++;continue}if(c.list(l)||c.vector(l)||c.indexedSeq(l)){const h=i-d,b=c.vector(l)?Ce(l):c.indexedSeq(l)?l.array.length-l.offset:l.value.length;if(h<0||h>=b){if(o!==void 0)return o;const M=new f(`nth index ${i} is out of bounds for collection of length ${d+b}`,{coll:r,n:s});throw M.data={argIndex:1},M}return c.vector(l)?rt(l,h):c.indexedSeq(l)?l.array[l.offset+h]:l.value[h]}if(o!==void 0)return o;const m=new f(`nth index ${i} is out of bounds`,{coll:r,n:s});throw m.data={argIndex:1},m}}if(c.indexedSeq(r)){const l=r.offset+i;if(i<0||l>=r.array.length){if(o!==void 0)return o;const d=new f(`nth index ${i} is out of bounds for collection of length ${r.array.length-r.offset}`,{coll:r,n:s});throw d.data={argIndex:1},d}return r.array[l]}if(!c.list(r)&&!c.vector(r))throw new f(`nth expects a list or vector, got ${x(r)}`,{coll:r});const u=c.vector(r)?Ce(r):r.value.length;if(i<0||i>=u){if(o!==void 0)return o;const l=new f(`nth index ${i} is out of bounds for collection of length ${u}`,{coll:r,n:s});throw l.data={argIndex:1},l}return c.vector(r)?rt(r,i):r.value[i]}).withMeta([...g({doc:"Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.",arglists:[["coll","n","not-found"]],docGroup:w.sequences})]),last:a.nativeFn("last",function(t){if(t===void 0||!c.list(t)&&!c.vector(t))throw new f(`last expects a list or vector${t!==void 0?`, got ${x(t)}`:""}`,{coll:t});if(c.vector(t))return Ce(t)===0?a.nil():La(t);const n=t.value;return n.length===0?a.nil():n[n.length-1]}).withMeta([...g({doc:"Returns the last element of the given collection.",arglists:[["coll"]],docGroup:w.sequences})]),reverse:a.nativeFn("reverse",function(t){if(t===void 0||!c.list(t)&&!c.vector(t))throw f.atArg(`reverse expects a list or vector${t!==void 0?`, got ${x(t)}`:""}`,{coll:t},0);const n=c.vector(t)?ot(t):t.value;return a.list([...n].reverse())}).withMeta([...g({doc:"Returns a new sequence with the elements of the given collection in reverse order.",arglists:[["coll"]],docGroup:w.sequences})]),"empty?":a.nativeFn("empty?",function(t){if(t===void 0)throw f.atArg("empty? expects one argument",{},0);if(c.nil(t))return a.boolean(!0);if(!c.seqable(t))throw f.atArg(`empty? expects a collection, string, or nil, got ${x(t)}`,{coll:t},0);return a.boolean(be(t).length===0)}).withMeta([...g({doc:"Returns true if coll has no items. Accepts collections, strings, and nil.",arglists:[["coll"]],docGroup:w.predicates})]),"contains?":a.nativeFn("contains?",function(t,n){if(t===void 0)throw f.atArg("contains? expects a collection as first argument",{},0);if(n===void 0)throw f.atArg("contains? expects a key as second argument",{},1);if(c.nil(t))return a.boolean(!1);if(c.map(t))return a.boolean(Ds(t,n));if(c.record(t))return a.boolean(t.fields.some(([r])=>c.equal(r,n)));if(c.vector(t))return c.number(n)?a.boolean(n.value>=0&&n.value<Ce(t)):a.boolean(!1);if(c.set(t))return a.boolean(Qn(t,n));throw f.atArg(`contains? expects a map, record, set, vector, or nil, got ${x(t)}`,{coll:t},0)}).withMeta([...g({doc:"Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.",arglists:[["coll","key"]],docGroup:w.predicates})]),"repeat*":a.nativeFn("repeat*",function(t,n){if(t===void 0||!c.number(t))throw f.atArg(`repeat expects a number as first argument${t!==void 0?`, got ${x(t)}`:""}`,{n:t},0);return a.list(Array(t.value).fill(n))}).withMeta([...g({doc:"Returns a finite sequence of n copies of x (native helper).",arglists:[["n","x"]],docGroup:w.sequences,extra:{"no-doc":!0}})]),"concat*":a.nativeFn("concat*",function(...t){const n=[];for(const r of t)if(!c.nil(r))if(c.list(r)||c.vector(r))n.push(...c.vector(r)?ot(r):r.value);else if(c.cons(r)||c.lazySeq(r)||c.indexedSeq(r))n.push(...be(r));else if(c.set(r))n.push(...je(r));else throw new f(`concat* expects seqable arguments, got ${x(r)}`,{arg:r});return a.list(n)}).withMeta([...g({doc:"Eagerly concatenates seqable collections into a list (quasiquote bootstrap helper).",arglists:[["&","colls"]],docGroup:w.sequences,extra:{"no-doc":!0}})]),count:a.nativeFn("count",function(t){if(c.nil(t))return a.number(0);if(c.lazySeq(t)||c.cons(t))return a.number(be(t).length);if(c.indexedSeq(t))return a.number(t.array.length-t.offset);if(![A.list,A.vector,A.map,A.record,A.set,A.string].includes(t.kind))throw f.atArg(`count expects a countable value, got ${x(t)}`,{countable:t},0);switch(t.kind){case A.list:return a.number(t.value.length);case A.vector:return a.number(Ce(t));case A.map:return a.number(Xt(t));case A.record:return a.number(t.fields.length);case A.set:return a.number(Xt(t._map));case A.string:return a.number(t.value.length);default:throw new f(`count expects a countable value, got ${x(t)}`,{countable:t})}}).withMeta([...g({doc:"Returns the number of elements in the given countable value.",arglists:[["countable"]],docGroup:w.sequences})]),empty:a.nativeFn("empty",function(t){if(t===void 0||c.nil(t))return a.nil();switch(t.kind){case"list":return a.list([]);case"vector":return a.vector([]);case"map":return a.map([]);case"set":return a.set([]);default:return a.nil()}}).withMeta([...g({doc:"Returns an empty collection of the same category as coll, or nil.",arglists:[["coll"]],docGroup:w.sequences})])},xb={vector:a.nativeFn("vector",function(...t){return t.length===0?a.vector([]):a.vector(t)}).withMeta([...g({doc:"Returns a new vector containing the given values.",arglists:[["&","args"]],docGroup:w.collections})]),vec:a.nativeFn("vec",function(t){if(t===void 0||c.nil(t))return a.vector([]);if(c.vector(t))return t;if(!c.seqable(t))throw f.atArg(`vec expects a collection or string, got ${x(t)}`,{coll:t},0);return a.vector(be(t))}).withMeta([...g({doc:"Creates a new vector containing the contents of coll.",arglists:[["coll"]],docGroup:w.collections})]),subvec:a.nativeFn("subvec",function(t,n,r){if(t===void 0||!c.vector(t))throw f.atArg(`subvec expects a vector, got ${x(t)}`,{v:t},0);if(n===void 0||!c.number(n))throw f.atArg("subvec expects a number start index",{start:n},1);const s=n.value,o=Ce(t),i=r!==void 0&&c.number(r)?r.value:o;if(s<0||i>o||s>i)throw new f(`subvec index out of bounds: start=${s}, end=${i}, length=${o}`,{v:t,start:n,end:r});return a.vector(Ea(t,s,i))}).withMeta([...g({doc:"Returns a vector of the items in vector from start (inclusive) to end (exclusive).",arglists:[["v","start"],["v","start","end"]],docGroup:w.collections})]),peek:a.nativeFn("peek",function(t){if(t===void 0||c.nil(t))return a.nil();if(c.vector(t))return Ce(t)===0?a.nil():La(t);if(c.list(t))return t.value.length===0?a.nil():t.value[0];throw f.atArg(`peek expects a list or vector, got ${x(t)}`,{coll:t},0)}).withMeta([...g({doc:"For a list, same as first. For a vector, same as last.",arglists:[["coll"]],docGroup:w.collections})]),pop:a.nativeFn("pop",function(t){if(t===void 0||c.nil(t))throw f.atArg("Can't pop empty list",{coll:t},0);if(c.vector(t)){if(Ce(t)===0)throw f.atArg("Can't pop empty vector",{coll:t},0);return sp(t)}if(c.list(t)){if(t.value.length===0)throw f.atArg("Can't pop empty list",{coll:t},0);return a.list(t.value.slice(1))}throw f.atArg(`pop expects a list or vector, got ${x(t)}`,{coll:t},0)}).withMeta([...g({doc:"For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.",arglists:[["coll"]],docGroup:w.collections})])},$b={throw:a.nativeFn("throw",function(...t){throw t.length!==1?new f(`throw requires exactly 1 argument, got ${t.length}`,{args:t}):new tt(t[0])}).withMeta([...g({doc:"Throws a value as an exception. The value may be any CljValue; maps are idiomatic.",arglists:[["value"]],docGroup:w.errors})]),"ex-info":a.nativeFn("ex-info",function(...t){if(t.length<2)throw new f(`ex-info requires at least 2 arguments, got ${t.length}`,{args:t});const[n,r,s]=t;if(!c.string(n))throw new f("ex-info: first argument must be a string",{msg:n});const o=[[a.keyword(":message"),n],[a.keyword(":data"),r]];return s!==void 0&&o.push([a.keyword(":cause"),s]),a.map(o)}).withMeta([...g({doc:"Creates an error map with :message and :data keys. Optionally accepts a :cause.",arglists:[["msg","data"],["msg","data","cause"]],docGroup:w.errors})]),"ex-message":a.nativeFn("ex-message",function(...t){const[n]=t;if(!c.map(n))return a.nil();const r=n.entries.find(function([o]){return c.keyword(o)&&o.name===":message"});return r?r[1]:a.nil()}).withMeta([...g({doc:"Returns the :message of an error map, or nil.",arglists:[["e"]],docGroup:w.errors})]),"ex-data":a.nativeFn("ex-data",function(...t){const[n]=t;if(!c.map(n))return a.nil();const r=n.entries.find(function([o]){return c.keyword(o)&&o.name===":data"});return r?r[1]:a.nil()}).withMeta([...g({doc:"Returns the :data map of an error map, or nil.",arglists:[["e"]],docGroup:w.errors})]),"ex-cause":a.nativeFn("ex-cause",function(...t){const[n]=t;if(!c.map(n))return a.nil();const r=n.entries.find(function([o]){return c.keyword(o)&&o.name===":cause"});return r?r[1]:a.nil()}).withMeta([...g({doc:"Returns the :cause of an error map, or nil.",arglists:[["e"]],docGroup:w.errors})])};function Jo(e,t){if(c.number(e)&&c.number(t)){const n=e.value,r=t.value;return n<r?-1:n>r?1:0}throw new f(`key values are not comparable: ${x(e)} and ${x(t)}`,{x:e,y:t})}function Qo(e,t,n){const r=[],s=Math.min(t,3);for(let o=0;o<e;o++)for(let i=0;i<s;i++)r.push([o,i]);if(n)for(let o=3;o<t;o++)for(let i=0;i<e;i++)r.push([i,o]);else for(let o=0;o<e;o++)for(let i=3;i<t;i++)r.push([o,i]);return r}const Mb={reduce:a.nativeFnCtx("reduce",function(t,n,r,...s){if(r===void 0||!c.aFunction(r))throw f.atArg(`reduce expects a function as first argument${r!==void 0?`, got ${x(r)}`:""}`,{fn:r},0);if(s.length===0||s.length>2)throw new f("reduce expects 2 or 3 arguments: (reduce f coll) or (reduce f init coll)",{fn:r});const o=s.length===2,i=o?s[0]:void 0,u=o?s[1]:s[0];if(c.nil(u)){if(!o)throw new f("reduce called on empty collection with no initial value",{fn:r});return i}if(!c.seqable(u))throw f.atArg(`reduce expects a collection or string, got ${x(u)}`,{collection:u},s.length);if(c.lazySeq(u)||c.cons(u)){const m=ji(u);let h;if(o)h=i;else{const b=m.next();if(b.done)throw new f("reduce called on empty collection with no initial value",{fn:r});h=b.value}for(let b=m.next();!b.done;b=m.next()){const M=t.applyFunction(r,[h,b.value],n);if(c.reduced(M))return M.value;h=M}return h}const l=be(u);if(!o){if(l.length===0)throw new f("reduce called on empty collection with no initial value",{fn:r});if(l.length===1)return l[0];let m=l[0];for(let h=1;h<l.length;h++){const b=t.applyFunction(r,[m,l[h]],n);if(c.reduced(b))return b.value;m=b}return m}let d=i;for(const m of l){const h=t.applyFunction(r,[d,m],n);if(c.reduced(h))return h.value;d=h}return d}).withMeta([...g({doc:"Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).",arglists:[["f","coll"],["f","val","coll"]],docGroup:w.collections})]),apply:a.nativeFnCtx("apply",(e,t,n,...r)=>{if(n===void 0||!c.callable(n))throw f.atArg(`apply expects a callable as first argument${n!==void 0?`, got ${x(n)}`:""}`,{fn:n},0);if(r.length===0)throw new f("apply expects at least 2 arguments",{fn:n});const s=r[r.length-1];if(!c.nil(s)&&!c.seqable(s))throw f.atArg(`apply expects a collection or string as last argument, got ${x(s)}`,{lastArg:s},r.length);const o=[...r.slice(0,-1),...c.nil(s)?[]:be(s)];return e.applyCallable(n,o,t)}).withMeta([...g({doc:"Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.",arglists:[["f","args"],["f","&","args"]],docGroup:w.higher_order})]),partial:a.nativeFn("partial",(e,...t)=>{if(e===void 0||!c.callable(e))throw f.atArg(`partial expects a callable as first argument${e!==void 0?`, got ${x(e)}`:""}`,{fn:e},0);const n=e;return a.nativeFnCtx("partial",(r,s,...o)=>r.applyCallable(n,[...t,...o],s))}).withMeta([...g({doc:"Returns a function that calls f with pre-applied args prepended to any additional arguments.",arglists:[["f","&","args"]],docGroup:w.higher_order})]),comp:a.nativeFn("comp",(...e)=>{if(e.length===0)return a.nativeFn("identity",r=>r);const t=e.findIndex(r=>!c.callable(r));if(t!==-1)throw f.atArg("comp expects functions or other callable values (keywords, collections)",{fns:e},t);const n=e;return a.nativeFnCtx("composed",(r,s,...o)=>{let i=r.applyCallable(n[n.length-1],o,s);for(let u=n.length-2;u>=0;u--)i=r.applyCallable(n[u],[i],s);return i})}).withMeta([...g({doc:"Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and collections.",arglists:[[],["f"],["f","g"],["f","g","&","fns"]],docGroup:w.higher_order})]),"some-fn":a.nativeFn("some-fn",(...e)=>{if(e.length===0)throw new f("some-fn expects at least one predicate",{preds:e});const t=e;return a.nativeFnCtx("some-fn",(n,r,...s)=>{if(s.length===0)return a.nil();const o=t.length>1&&t.length<=3;for(const[i,u]of Qo(t.length,s.length,o)){const l=n.applyCallable(t[i],[s[u]],r);if(c.truthy(l))return l}return a.boolean(!1)})}).withMeta([...g({doc:"Returns a function that returns the first truthy result from applying any predicate to any argument, or false.",arglists:[["p"],["p1","p2"],["p1","p2","p3"],["p1","p2","p3","&","ps"]],docGroup:w.higher_order})]),"every-pred":a.nativeFn("every-pred",(...e)=>{if(e.length===0)throw new f("every-pred expects at least one predicate",{preds:e});const t=e;return a.nativeFnCtx("every-pred",(n,r,...s)=>{if(s.length===0)return a.boolean(!0);const o=t.length>1&&t.length<=3;for(const[i,u]of Qo(t.length,s.length,o)){const l=n.applyCallable(t[i],[s[u]],r);if(c.falsy(l))return a.boolean(!1)}return a.boolean(!0)})}).withMeta([...g({doc:"Returns a function that returns true when every predicate is truthy for every argument, otherwise false.",arglists:[["p"],["p1","p2"],["p1","p2","p3"],["p1","p2","p3","&","ps"]],docGroup:w.higher_order})]),"max-key":a.nativeFnCtx("max-key",(e,t,n,r,...s)=>{if(n===void 0||r===void 0)throw new f("max-key expects at least 2 arguments",{k:n,x:r});if(s.length===0)return r;if(!c.callable(n))throw f.atArg(`max-key expects a callable as first argument, got ${x(n)}`,{k:n},0);let o=r,i=e.applyCallable(n,[r],t);for(const u of s){const l=e.applyCallable(n,[u],t);Jo(l,i)>=0&&(o=u,i=l)}return o}).withMeta([...g({doc:"Returns the item whose key value is greatest. On ties, returns the later item.",arglists:[["k","x"],["k","x","y"],["k","x","y","&","more"]],docGroup:w.higher_order})]),"min-key":a.nativeFnCtx("min-key",(e,t,n,r,...s)=>{if(n===void 0||r===void 0)throw new f("min-key expects at least 2 arguments",{k:n,x:r});if(s.length===0)return r;if(!c.callable(n))throw f.atArg(`min-key expects a callable as first argument, got ${x(n)}`,{k:n},0);let o=r,i=e.applyCallable(n,[r],t);for(const u of s){const l=e.applyCallable(n,[u],t);Jo(l,i)<=0&&(o=u,i=l)}return o}).withMeta([...g({doc:"Returns the item whose key value is least. On ties, returns the later item.",arglists:[["k","x"],["k","x","y"],["k","x","y","&","more"]],docGroup:w.higher_order})]),identity:a.nativeFn("identity",e=>{if(e===void 0)throw f.atArg("identity expects one argument",{},0);return e}).withMeta([...g({doc:"Returns its single argument unchanged.",arglists:[["x"]],docGroup:w.higher_order})])},Sb={meta:a.nativeFn("meta",function(t){if(t===void 0)throw f.atArg("meta expects one argument",{},0);return c.function(t)||c.nativeFunction(t)||c.var(t)||c.list(t)||c.vector(t)||c.map(t)||c.symbol(t)||c.atom(t)?t.meta??a.nil():a.nil()}).withMeta([...g({doc:"Returns the metadata map of a value, or nil if the value has no metadata.",arglists:[["val"]],docGroup:w.metadata})]),"with-meta":a.nativeFn("with-meta",function(t,n){if(t===void 0)throw f.atArg("with-meta expects two arguments",{},0);if(n===void 0)throw f.atArg("with-meta expects two arguments",{},1);if(!c.map(n)&&!c.nil(n))throw f.atArg(`with-meta expects a map as second argument, got ${x(n)}`,{m:n},1);if(!(c.function(t)||c.nativeFunction(t)||c.list(t)||c.vector(t)||c.map(t)||c.symbol(t)))throw f.atArg(`with-meta does not support ${t.kind}, got ${x(t)}`,{val:t},0);const s=c.nil(n)?void 0:n;return Qs(t,s)}).withMeta([...g({doc:"Returns a new value with the metadata map m applied to val.",arglists:[["val","m"]],docGroup:w.metadata})]),"alter-meta!":a.nativeFnCtx("alter-meta!",function(t,n,r,s,...o){if(r===void 0)throw f.atArg("alter-meta! expects at least two arguments",{},0);if(s===void 0)throw f.atArg("alter-meta! expects at least two arguments",{},1);if(!c.var(r)&&!c.atom(r))throw f.atArg(`alter-meta! expects a Var or Atom as first argument, got ${r.kind}`,{},0);if(!c.aFunction(s))throw f.atArg(`alter-meta! expects a function as second argument, got ${s.kind}`,{},1);const i=r.meta??a.nil(),u=t.applyCallable(s,[i,...o],n);if(!c.map(u)&&!c.nil(u))throw new f(`alter-meta! function must return a map or nil, got ${u.kind}`,{});return r.meta=c.nil(u)?void 0:u,u}).withMeta([...g({doc:"Applies f to ref's current metadata (with optional args), sets the result as the new metadata, and returns it.",arglists:[["ref","f","&","args"]],docGroup:w.metadata})])},ie="Predicates",qb={"nil?":a.nativeFn("nil?",function(t){return a.boolean(c.nil(t))}).withMeta([...g({doc:"Returns true if the value is nil, false otherwise.",arglists:[["arg"]],docGroup:ie})]),"true?":a.nativeFn("true?",function(t){return c.boolean(t)?a.boolean(t.value===!0):a.boolean(!1)}).withMeta([...g({doc:"Returns true if the value is a boolean and true, false otherwise.",arglists:[["arg"]],docGroup:ie})]),"false?":a.nativeFn("false?",function(t){return c.boolean(t)?a.boolean(t.value===!1):a.boolean(!1)}).withMeta([...g({doc:"Returns true if the value is a boolean and false, false otherwise.",arglists:[["arg"]],docGroup:ie})]),"truthy?":a.nativeFn("truthy?",function(t){return a.boolean(c.truthy(t))}).withMeta([...g({doc:"Returns true if the value is not nil or false, false otherwise.",arglists:[["arg"]],docGroup:ie})]),"falsy?":a.nativeFn("falsy?",function(t){return a.boolean(c.falsy(t))}).withMeta([...g({doc:"Returns true if the value is nil or false, false otherwise.",arglists:[["arg"]],docGroup:ie})]),"not=":a.nativeFn("not=",function(...t){if(t.length<2)throw new f("not= expects at least two arguments",{args:t});for(let n=1;n<t.length;n++)if(!c.equal(t[n],t[n-1]))return a.boolean(!0);return a.boolean(!1)}).withMeta([...g({doc:"Returns true if any two adjacent arguments are not equal, false otherwise.",arglists:[["&","vals"]],docGroup:w.comparison})]),"char?":a.nativeFn("char?",function(t){return a.boolean(t!==void 0&&c.char(t))}).withMeta([...g({doc:"Returns true if the value is a character, false otherwise.",arglists:[["x"]],docGroup:ie})]),"number?":a.nativeFn("number?",function(t){return a.boolean(t!==void 0&&c.number(t))}).withMeta([...g({doc:"Returns true if the value is a number, false otherwise.",arglists:[["x"]],docGroup:ie})]),"string?":a.nativeFn("string?",function(t){return a.boolean(t!==void 0&&c.string(t))}).withMeta([...g({doc:"Returns true if the value is a string, false otherwise.",arglists:[["x"]],docGroup:ie})]),"boolean?":a.nativeFn("boolean?",function(t){return a.boolean(t!==void 0&&c.boolean(t))}).withMeta([...g({doc:"Returns true if the value is a boolean, false otherwise.",arglists:[["x"]],docGroup:ie})]),"vector?":a.nativeFn("vector?",function(t){return a.boolean(t!==void 0&&c.vector(t))}).withMeta([...g({doc:"Returns true if the value is a vector, false otherwise.",arglists:[["x"]],docGroup:ie})]),"list?":a.nativeFn("list?",function(t){return a.boolean(t!==void 0&&c.list(t))}).withMeta([...g({doc:"Returns true if the value is a list, false otherwise.",arglists:[["x"]],docGroup:ie})]),"map?":a.nativeFn("map?",function(t){return a.boolean(t!==void 0&&c.map(t))}).withMeta([...g({doc:"Returns true if the value is a map, false otherwise.",arglists:[["x"]],docGroup:ie})]),"keyword?":a.nativeFn("keyword?",function(t){return a.boolean(t!==void 0&&c.keyword(t))}).withMeta([...g({doc:"Returns true if the value is a keyword, false otherwise.",arglists:[["x"]],docGroup:ie})]),"qualified-keyword?":a.nativeFn("qualified-keyword?",function(t){return a.boolean(t!==void 0&&c.keyword(t)&&t.name.includes("/"))}).withMeta([...g({doc:"Returns true if the value is a qualified keyword, false otherwise.",arglists:[["x"]],docGroup:ie})]),"symbol?":a.nativeFn("symbol?",function(t){return a.boolean(t!==void 0&&c.symbol(t))}).withMeta([...g({doc:"Returns true if the value is a symbol, false otherwise.",arglists:[["x"]],docGroup:ie})]),"namespace?":a.nativeFn("namespace?",function(t){return a.boolean(t!==void 0&&c.namespace(t))}).withMeta([...g({doc:"Returns true if x is a namespace.",arglists:[["x"]],docGroup:ie})]),"qualified-symbol?":a.nativeFn("qualified-symbol?",function(t){return a.boolean(t!==void 0&&c.symbol(t)&&t.name.includes("/"))}).withMeta([...g({doc:"Returns true if the value is a qualified symbol, false otherwise.",arglists:[["x"]],docGroup:ie})]),"ident?":a.nativeFn("ident?",function(t){return a.boolean(t!==void 0&&(c.keyword(t)||c.symbol(t)))}).withMeta([...g({doc:"Returns true if x is a symbol or keyword.",arglists:[["x"]],docGroup:ie})]),"simple-ident?":a.nativeFn("simple-ident?",function(t){return a.boolean(t!==void 0&&(c.keyword(t)&&!t.name.includes("/")||c.symbol(t)&&!t.name.includes("/")))}).withMeta([...g({doc:"Returns true if x is a symbol or keyword with no namespace component.",arglists:[["x"]],docGroup:ie})]),"qualified-ident?":a.nativeFn("qualified-ident?",function(t){return a.boolean(t!==void 0&&(c.keyword(t)&&t.name.includes("/")||c.symbol(t)&&t.name.includes("/")))}).withMeta([...g({doc:"Returns true if x is a symbol or keyword with a namespace component.",arglists:[["x"]],docGroup:ie})]),"simple-keyword?":a.nativeFn("simple-keyword?",function(t){return a.boolean(t!==void 0&&c.keyword(t)&&!t.name.includes("/"))}).withMeta([...g({doc:"Returns true if x is a keyword with no namespace component.",arglists:[["x"]],docGroup:ie})]),"simple-symbol?":a.nativeFn("simple-symbol?",function(t){return a.boolean(t!==void 0&&c.symbol(t)&&!t.name.includes("/"))}).withMeta([...g({doc:"Returns true if x is a symbol with no namespace component.",arglists:[["x"]],docGroup:ie})]),"fn?":a.nativeFn("fn?",function(t){return a.boolean(t!==void 0&&c.aFunction(t))}).withMeta([...g({doc:"Returns true if the value is a function, false otherwise.",arglists:[["x"]],docGroup:ie})]),"ifn?":a.nativeFn("ifn?",function(t){return a.boolean(t!==void 0&&c.callable(t))}).withMeta([...g({doc:"Returns true if x implements the callable function interface, false otherwise.",arglists:[["x"]],docGroup:ie})]),"coll?":a.nativeFn("coll?",function(t){return a.boolean(t!==void 0&&c.collection(t))}).withMeta([...g({doc:"Returns true if the value is a collection, false otherwise.",arglists:[["x"]],docGroup:ie})]),some:a.nativeFnCtx("some",function(t,n,r,s){if(r===void 0||!c.callable(r))throw f.atArg(`some expects a callable as first argument${r!==void 0?`, got ${x(r)}`:""}`,{pred:r},0);if(s===void 0)return a.nil();if(!c.seqable(s))throw f.atArg(`some expects a collection or string as second argument, got ${x(s)}`,{coll:s},1);for(const o of be(s)){const i=t.applyCallable(r,[o],n);if(c.truthy(i))return i}return a.nil()}).withMeta([...g({doc:"Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.",arglists:[["pred","coll"]],docGroup:w.sequences})]),"every?":a.nativeFnCtx("every?",function(t,n,r,s){if(r===void 0||!c.callable(r))throw f.atArg(`every? expects a callable as first argument${r!==void 0?`, got ${x(r)}`:""}`,{pred:r},0);if(s===void 0||!c.seqable(s))throw f.atArg(`every? expects a collection or string as second argument${s!==void 0?`, got ${x(s)}`:""}`,{coll:s},1);for(const o of be(s))if(c.falsy(t.applyCallable(r,[o],n)))return a.boolean(!1);return a.boolean(!0)}).withMeta([...g({doc:"Returns true if all items in coll satisfy pred, false otherwise.",arglists:[["pred","coll"]],docGroup:ie})]),"identical?":a.nativeFn("identical?",function(t,n){return a.boolean(t===n)}).withMeta([...g({doc:"Tests if 2 arguments are the same object (reference equality).",arglists:[["x","y"]],docGroup:w.comparison})]),"seqable?":a.nativeFn("seqable?",function(t){return a.boolean(t!==void 0&&c.seqable(t))}).withMeta([...g({doc:"Return true if the seq function is supported for x.",arglists:[["x"]],docGroup:ie})]),"seq?":a.nativeFn("seq?",function(t){return a.boolean(t!==void 0&&(c.list(t)||c.cons(t)||c.lazySeq(t)||c.indexedSeq(t)))}).withMeta([...g({doc:"Returns true if x is a sequence, false otherwise.",arglists:[["x"]],docGroup:ie})]),"sequential?":a.nativeFn("sequential?",function(t){return a.boolean(t!==void 0&&(c.list(t)||c.vector(t)||c.lazySeq(t)||c.cons(t)||c.indexedSeq(t)))}).withMeta([...g({doc:"Returns true if coll is a sequential collection (list, vector, lazy-seq, or cons).",arglists:[["coll"]],docGroup:ie})]),"associative?":a.nativeFn("associative?",function(t){return a.boolean(t!==void 0&&(c.map(t)||c.vector(t)))}).withMeta([...g({doc:"Returns true if coll implements Associative (map or vector).",arglists:[["coll"]],docGroup:ie})]),"counted?":a.nativeFn("counted?",function(t){return a.boolean(t!==void 0&&(c.list(t)||c.vector(t)||c.map(t)||c.set(t)||c.string(t)))}).withMeta([...g({doc:"Returns true if coll implements count in constant time.",arglists:[["coll"]],docGroup:ie})]),"int?":a.nativeFn("int?",function(t){return a.boolean(t!==void 0&&c.number(t)&&Number.isInteger(t.value))}).withMeta([...g({doc:"Return true if x is a fixed precision integer.",arglists:[["x"]],docGroup:ie})]),"integer?":a.nativeFn("integer?",function(t){return a.boolean(t!==void 0&&c.number(t)&&Number.isInteger(t.value))}).withMeta([...g({doc:"Return true if x is an integer.",arglists:[["x"]],docGroup:ie})]),"float?":a.nativeFn("float?",function(t){return a.boolean(t!==void 0&&c.number(t)&&!Number.isInteger(t.value))}).withMeta([...g({doc:"Return true if x is a floating point number.",arglists:[["x"]],docGroup:ie})]),"pos-int?":a.nativeFn("pos-int?",function(t){return a.boolean(t!==void 0&&c.number(t)&&Number.isInteger(t.value)&&t.value>0)}).withMeta([...g({doc:"Return true if x is a positive fixed precision integer.",arglists:[["x"]],docGroup:ie})]),"neg-int?":a.nativeFn("neg-int?",function(t){return a.boolean(t!==void 0&&c.number(t)&&Number.isInteger(t.value)&&t.value<0)}).withMeta([...g({doc:"Return true if x is a negative fixed precision integer.",arglists:[["x"]],docGroup:ie})]),"nat-int?":a.nativeFn("nat-int?",function(t){return a.boolean(t!==void 0&&c.number(t)&&Number.isInteger(t.value)&&t.value>=0)}).withMeta([...g({doc:"Return true if x is a non-negative fixed precision integer.",arglists:[["x"]],docGroup:ie})]),"double?":a.nativeFn("double?",function(t){return a.boolean(t!==void 0&&c.number(t))}).withMeta([...g({doc:"Return true if x is a Double (all numbers in JS are doubles).",arglists:[["x"]],docGroup:ie})]),"NaN?":a.nativeFn("NaN?",function(t){return a.boolean(t!==void 0&&c.number(t)&&isNaN(t.value))}).withMeta([...g({doc:"Returns true if num is NaN, else false.",arglists:[["num"]],docGroup:w.arithmetic})]),"infinite?":a.nativeFn("infinite?",function(t){return a.boolean(t!==void 0&&c.number(t)&&!isFinite(t.value)&&!isNaN(t.value))}).withMeta([...g({doc:"Returns true if num is positive or negative infinity, else false.",arglists:[["num"]],docGroup:w.arithmetic})])};function Fb(e){let t=e,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(t))!==null;){for(const o of s[1]){if(o==="x")throw new f("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",{});n.includes(o)||(n+=o)}t=t.slice(s[0].length)}return{pattern:t,flags:n}}function Jr(e,t){if(!c.regex(e))throw new f(`${t} expects a regex as first argument, got ${x(e)}`,{val:e});return e}function Qr(e,t){if(!c.string(e))throw new f(`${t} expects a string as second argument, got ${x(e)}`,{val:e});return e.value}function Yr(e){return e.length===1?a.string(e[0]):a.vector(e.map(function(n){return n==null?a.nil():a.string(n)}))}const Ib={"regexp?":a.nativeFn("regexp?",function(t){return a.boolean(t!==void 0&&c.regex(t))}).withMeta([...g({doc:"Returns true if x is a regular expression pattern.",arglists:[["x"]],docGroup:w.predicates})]),"re-pattern":a.nativeFn("re-pattern",function(t){if(t===void 0||!c.string(t))throw new f(`re-pattern expects a string argument${t!==void 0?`, got ${x(t)}`:""}`,{s:t});const{pattern:n,flags:r}=Fb(t.value);return a.regex(n,r)}).withMeta([...g({doc:`Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.
  (re-pattern "\\\\d+") produces the same pattern as #"\\d+".`,arglists:[["s"]],docGroup:w.regex})]),"re-find":a.nativeFn("re-find",function(t,n){const r=Jr(t,"re-find"),s=Qr(n,"re-find"),i=new RegExp(r.pattern,r.flags).exec(s);return i?Yr(i):a.nil()}).withMeta([...g({doc:`Returns the next regex match, if any, of string to pattern, using
  java.util.regex.Matcher.find(). Returns the match or nil. When there
  are groups, returns a vector of the whole match and groups (nil for
  unmatched optional groups).`,arglists:[["re","s"]],docGroup:w.regex})]),"re-matches":a.nativeFn("re-matches",function(t,n){const r=Jr(t,"re-matches"),s=Qr(n,"re-matches"),i=new RegExp(r.pattern,r.flags).exec(s);return!i||i.index!==0||i[0].length!==s.length?a.nil():Yr(i)}).withMeta([...g({doc:`Returns the match, if any, of string to pattern, using
  java.util.regex.Matcher.matches(). The entire string must match.
  Returns the match or nil. When there are groups, returns a vector
  of the whole match and groups (nil for unmatched optional groups).`,arglists:[["re","s"]],docGroup:w.regex})]),"re-seq":a.nativeFn("re-seq",function(t,n){const r=Jr(t,"re-seq"),s=Qr(n,"re-seq"),o=new RegExp(r.pattern,r.flags+"g"),i=[];let u;for(;(u=o.exec(s))!==null;){if(u[0].length===0){o.lastIndex++;continue}i.push(Yr(u))}return i.length===0?a.nil():a.list(i)}).withMeta([...g({doc:`Returns a lazy sequence of successive matches of pattern in string,
  using java.util.regex.Matcher.find(), each such match processed with
  re-groups.`,arglists:[["re","s"]],docGroup:w.regex})]),"str-split*":a.nativeFn("str-split*",function(t,n,r){if(t===void 0||!c.string(t))throw new f(`str-split* expects a string as first argument${t!==void 0?`, got ${x(t)}`:""}`,{sVal:t});const s=t.value,i=r!==void 0&&!c.nil(r)&&c.number(r)?r.value:void 0;let u,l;if(!c.regex(n))throw new f(`str-split* expects a regex pattern as second argument, got ${x(n)}`,{sepVal:n});if(n.pattern===""){const h=[...s];if(i===void 0||i>=h.length)return a.vector(h.map(a.string));const b=[...h.slice(0,i-1),h.slice(i-1).join("")];return a.vector(b.map(function(v){return a.string(v)}))}u=n.pattern,l=n.flags;const d=new RegExp(u,l+"g"),m=Cb(s,d,i);return a.vector(m.map(function(b){return a.string(b)}))}).withMeta([...g({doc:`Internal helper for clojure.string/split. Splits string s by a regex or
  string separator. Optional limit keeps all parts when provided.`,arglists:[["s","sep"],["s","sep","limit"]],docGroup:w.regex,extra:{"no-doc":!0}})])};function Cb(e,t,n){const r=[];let s=0,o,i=0;for(;(o=t.exec(e))!==null;){if(o[0].length===0){t.lastIndex++;continue}if(n!==void 0&&i>=n-1)break;r.push(e.slice(s,o.index)),s=o.index+o[0].length,i++}if(r.push(e.slice(s)),n===void 0)for(;r.length>0&&r[r.length-1]==="";)r.pop();return r}const He="Strings";function Xe(e,t){if(e===void 0||!c.string(e))throw new f(`${t} expects a string as first argument${e!==void 0?`, got ${x(e)}`:""}`,{val:e});return e.value}function Ln(e,t,n){if(e===void 0||!c.string(e))throw new f(`${n} expects a string as ${t} argument${e!==void 0?`, got ${x(e)}`:""}`,{val:e});return e.value}function Rb(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function jb(e){return e.replace(/\$/g,"$$$$")}function Ab(e,t){let n=-1;for(let s=t.length-1;s>=0;s--)if(typeof t[s]=="number"){n=s;break}const r=n>0?t.slice(0,n):[];return r.length===0?a.string(e):a.vector([a.string(e),...r.map(function(o){return o==null?a.nil():a.string(String(o))})])}function Yo(e,t,n,r,s,o,i){const u=Xe(r,n);if(s===void 0||o===void 0)throw new f(`${n} expects 3 arguments`,{});if(c.string(s)){if(!c.string(o))throw new f(`${n}: when match is a string, replacement must also be a string, got ${x(o)}`,{replVal:o});const l=new RegExp(Rb(s.value),i?"g":"");return a.string(u.replace(l,jb(o.value)))}if(c.regex(s)){const l=s,d=i?l.flags+"g":l.flags,m=new RegExp(l.pattern,d);if(c.string(o))return a.string(u.replace(m,o.value));if(c.aFunction(o)){const h=o,b=u.replace(m,function(v,...y){const $=Ab(v,y),R=e.applyFunction(h,[$],t);return ye(R)});return a.string(b)}throw new f(`${n}: replacement must be a string or function, got ${x(o)}`,{replVal:o})}throw new f(`${n}: match must be a string or regex, got ${x(s)}`,{matchVal:s})}const Ye={"no-doc":!0},_b={"str-upper-case*":a.nativeFn("str-upper-case*",function(t){return a.string(Xe(t,"str-upper-case*").toUpperCase())}).withMeta([...g({doc:"Internal helper. Converts s to upper-case.",arglists:[["s"]],docGroup:He,extra:Ye})]),"str-lower-case*":a.nativeFn("str-lower-case*",function(t){return a.string(Xe(t,"str-lower-case*").toLowerCase())}).withMeta([...g({doc:"Internal helper. Converts s to lower-case.",arglists:[["s"]],docGroup:He,extra:Ye})]),"str-trim*":a.nativeFn("str-trim*",function(t){return a.string(Xe(t,"str-trim*").trim())}).withMeta([...g({doc:"Internal helper. Removes whitespace from both ends of s.",arglists:[["s"]],docGroup:He,extra:Ye})]),"str-triml*":a.nativeFn("str-triml*",function(t){return a.string(Xe(t,"str-triml*").trimStart())}).withMeta([...g({doc:"Internal helper. Removes whitespace from the left of s.",arglists:[["s"]],docGroup:He,extra:Ye})]),"str-trimr*":a.nativeFn("str-trimr*",function(t){return a.string(Xe(t,"str-trimr*").trimEnd())}).withMeta([...g({doc:"Internal helper. Removes whitespace from the right of s.",arglists:[["s"]],docGroup:He})]),"str-reverse*":a.nativeFn("str-reverse*",function(t){return a.string([...Xe(t,"str-reverse*")].reverse().join(""))}).withMeta([...g({doc:"Internal helper. Returns s with its characters reversed (Unicode-safe).",arglists:[["s"]],docGroup:He,extra:Ye})]),"str-starts-with*":a.nativeFn("str-starts-with*",function(t,n){const r=Xe(t,"str-starts-with*"),s=Ln(n,"second","str-starts-with*");return a.boolean(r.startsWith(s))}).withMeta([...g({doc:"Internal helper. Returns true if s starts with substr.",arglists:[["s","substr"]],docGroup:He,extra:Ye})]),"str-ends-with*":a.nativeFn("str-ends-with*",function(t,n){const r=Xe(t,"str-ends-with*"),s=Ln(n,"second","str-ends-with*");return a.boolean(r.endsWith(s))}).withMeta([...g({doc:"Internal helper. Returns true if s ends with substr.",arglists:[["s","substr"]],docGroup:He,extra:Ye})]),"str-includes*":a.nativeFn("str-includes*",function(t,n){const r=Xe(t,"str-includes*"),s=Ln(n,"second","str-includes*");return a.boolean(r.includes(s))}).withMeta([...g({doc:"Internal helper. Returns true if s contains substr.",arglists:[["s","substr"]],docGroup:He,extra:Ye})]),"str-index-of*":a.nativeFn("str-index-of*",function(t,n,r){const s=Xe(t,"str-index-of*"),o=Ln(n,"second","str-index-of*");let i;if(r!==void 0&&!c.nil(r)){if(!c.number(r))throw new f(`str-index-of* expects a number as third argument, got ${x(r)}`,{fromVal:r});i=s.indexOf(o,r.value)}else i=s.indexOf(o);return i===-1?a.nil():a.number(i)}).withMeta([...g({doc:"Internal helper. Returns index of value in s, or nil if not found.",arglists:[["s","value"],["s","value","from-index"]],docGroup:He,extra:Ye})]),"str-last-index-of*":a.nativeFn("str-last-index-of*",function(t,n,r){const s=Xe(t,"str-last-index-of*"),o=Ln(n,"second","str-last-index-of*");let i;if(r!==void 0&&!c.nil(r)){if(!c.number(r))throw new f(`str-last-index-of* expects a number as third argument, got ${x(r)}`,{fromVal:r});i=s.lastIndexOf(o,r.value)}else i=s.lastIndexOf(o);return i===-1?a.nil():a.number(i)}).withMeta([...g({doc:"Internal helper. Returns last index of value in s, or nil if not found.",arglists:[["s","value"],["s","value","from-index"]],docGroup:He,extra:Ye})]),"str-replace*":a.nativeFnCtx("str-replace*",function(t,n,r,s,o){return Yo(t,n,"str-replace*",r,s,o,!0)}).withMeta([...g({doc:"Internal helper. Replaces all occurrences of match with replacement in s.",arglists:[["s","match","replacement"]],docGroup:He,extra:Ye})]),"str-replace-first*":a.nativeFnCtx("str-replace-first*",function(t,n,r,s,o){return Yo(t,n,"str-replace-first*",r,s,o,!1)}).withMeta([...g({doc:"Internal helper. Replaces the first occurrence of match with replacement in s.",arglists:[["s","match","replacement"]],docGroup:He,extra:Ye})])},Pb={reduced:a.nativeFn("reduced",function(t){if(t===void 0)throw new f("reduced expects one argument",{});return a.reduced(t)}).withMeta([...g({doc:"Returns a reduced value, indicating termination of the reduction process.",arglists:[["value"]],docGroup:w.transducers})]),"reduced?":a.nativeFn("reduced?",function(t){if(t===void 0)throw new f("reduced? expects one argument",{});return a.boolean(c.reduced(t))}).withMeta([...g({doc:"Returns true if the given value is a reduced value, false otherwise.",arglists:[["value"]],docGroup:w.predicates})]),unreduced:a.nativeFn("unreduced",function(t){if(t===void 0)throw new f("unreduced expects one argument",{});return c.reduced(t)?t.value:t}).withMeta([...g({doc:"Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.",arglists:[["value"]],docGroup:w.transducers})]),"ensure-reduced":a.nativeFn("ensure-reduced",function(t){if(t===void 0)throw new f("ensure-reduced expects one argument",{});return c.reduced(t)?t:a.reduced(t)}).withMeta([...g({doc:"Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.",arglists:[["value"]],docGroup:w.transducers})]),transduce:a.nativeFnCtx("transduce",function(t,n,r,s,o,i){if(!c.aFunction(r))throw new f(`transduce expects a transducer (function) as first argument, got ${x(r)}`,{xf:r});if(!c.aFunction(s))throw new f(`transduce expects a reducing function as second argument, got ${x(s)}`,{f:s});if(o===void 0)throw new f("transduce expects 3 or 4 arguments: (transduce xf f coll) or (transduce xf f init coll)",{});let u,l;i===void 0?(l=o,u=t.applyFunction(s,[],n)):(u=o,l=i);const d=t.applyFunction(r,[s],n);if(c.nil(l))return t.applyFunction(d,[u],n);if(!c.seqable(l))throw new f(`transduce expects a collection or string as ${i===void 0?"third":"fourth"} argument, got ${x(l)}`,{coll:l});const m=c.lazySeq(l)||c.cons(l)?ji(l):be(l);let h=u;for(const b of m){const M=t.applyFunction(d,[h,b],n);if(c.reduced(M)){h=M.value;break}h=M}return t.applyFunction(d,[h],n)}).withMeta([...g({doc:pn(["reduce with a transformation of f (xf). If init is not","supplied, (f) will be called to produce it. f should be a reducing","step function that accepts both 1 and 2 arguments, if it accepts","only 2 you can add the arity-1 with 'completing'. Returns the result","of applying (the transformed) xf to init and the first item in coll,","then applying xf to that result and the 2nd item, etc. If coll","contains no items, returns init and f is not called. Note that","certain transforms may inject or skip items."]),arglists:[["xform","f","coll"],["xform","f","init","coll"]],docGroup:w.transducers})])};function Nb(e){return e.flatMap((t,n)=>[...n===0?[]:[""],...Eb(t.chunk,t.label).split(`
`)])}function wo(e,t){const n=[{label:t,chunk:e}];return e.innerFunctions.forEach((r,s)=>{r.arities.forEach((o,i)=>{n.push(...wo(o.chunk,`${t}/fn[${s}]/arity[${i}] ${Vb(o)}`))})}),n}function Lb(e,t){return e.bytecodeBody===void 0?[]:wo(e.bytecodeBody,`${t} ${Ob(e)}`)}function Eb(e,t){const n=[];n.push(`== ${t} ==`);let r=0;for(;r<e.code.length;)r=Tb(e,r,n);return n.join(`
`)}function Tb(e,t,n){const r=e.code[t],s=Hn(r);switch(r){case p.Constant:{const o=e.code[t+1],i=e.constants[o],u=i===void 0?"<missing>":x(i);return n.push(`${xe(t)} ${s} ${o} ; ${u}`),t+2}case p.StoreLocal:case p.LoadLocal:case p.LoadUpvalue:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ${o}`),t+2}case p.LoadGlobal:case p.LoadQualified:case p.LoadVar:case p.Def:case p.DefMacro:case p.JsGetProp:case p.PushDynamicBinding:case p.SetDynamic:{const o=e.code[t+1],i=e.constants[o],u=i===void 0?"<missing>":x(i);return n.push(`${xe(t)} ${s} ${o} ; ${u}`),t+2}case p.LoadLexicalVar:{const o=e.code[t+1],i=e.lexicalVarLookups[o],u=i===void 0?"<missing>":x(i.symbol),l=i===void 0?"<missing>":i.candidates.map(d=>`${d.kind} ${d.slot}`).join(", ");return n.push(`${xe(t)} ${s} ${o} ; ${u} [${l}]`),t+2}case p.Jump:case p.JumpIfFalsy:{const o=e.code[t+1],u=2+t+o;return n.push(`${xe(t)} ${s} ${o} -> ${xe(u)}`),t+2}case p.Call:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ${o}`),t+2}case p.JsNew:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ${o}`),t+2}case p.JsInvoke:{const o=e.code[t+1],i=e.code[t+2],u=e.constants[o],l=u===void 0?"<missing>":x(u);return n.push(`${xe(t)} ${s} ${o} ; ${l} ${i}`),t+3}case p.WithMeta:{const o=e.code[t+1],i=e.constants[o],u=i===void 0?"<missing>":x(i);return n.push(`${xe(t)} ${s} ${o} ; ${u}`),t+2}case p.Closure:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ${o}`),t+2}case p.PushTry:{const o=e.code[t+1],i=e.code[t+2],u=e.code[t+3],l=i===-1?"none":xe(i);return n.push(`${xe(t)} ${s} ${o} finally ${l} after ${xe(u)}`),t+4}case p.EnterFinally:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} after ${xe(o)}`),t+2}case p.Add:case p.Sub:case p.Mul:case p.Div:case p.Lt:case p.Lte:case p.Gt:case p.Gte:case p.Eq:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ${o}`),t+2}case p.Nil:case p.True:case p.False:case p.Pop:case p.Return:case p.Throw:case p.PopTry:case p.PushBindingFrame:case p.PopBindingFrame:case p.EndFinally:return n.push(`${xe(t)} ${s}`),t+1;case p.MakeVector:case p.MakeMap:case p.MakeSet:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ; ${o}`),t+2}case p.Recur:{const o=e.code[t+1],i=e.code[t+2],u=e.code[t+3];return n.push(`${xe(t)} ${s} ${o} ${i} -> ${xe(u)}`),t+4}case p.FnRecur:{const o=e.code[t+1];return n.push(`${xe(t)} ${s} ${o} -> 0000`),t+2}case p.FnRecurRest:{const o=e.code[t+1],i=e.code[t+2];return n.push(`${xe(t)} ${s} ${o} ${i} -> 0000`),t+3}default:return n.push(`${xe(t)} ${s} ; [disassembleInstruction] unknown opcode`),t+1}}function xe(e){return e.toString().padStart(4,"0")}function Vb(e){const t=e.params.map(n=>n.name);return e.restParam!==null&&t.push("&",e.restParam.name),`[${t.join(" ")}]`}function Ob(e){const t=e.params.map(n=>n.name);return e.restParam!==null&&t.push("&",e.restParam.name),`[${t.join(" ")}]`}function sc(e,t,n){if(n===void 0||c.nil(n))return null;if(Kb(n)&&c.symbol(n.value[1])){const o=Xo(e,t,n.value[1]);if(o===void 0)return null;const i=Sn(o.value,`${o.ns}/${o.name}`);return i.length===0?null:{target:"var",entries:i}}if(c.symbol(n)){const o=Xo(e,t,n);if(o!==void 0){const u=Sn(o.value,`${o.ns}/${o.name}`);if(u.length>0)return{target:"var",entries:u}}const i=Cn(n.name,t);if(i!==void 0){const u=Sn(i,n.name);if(u.length>0)return{target:c.macro(i)?"macro":"function",entries:u}}return null}const r=e.expandAll(n,t),s=gs(r,t,e);return s.ok?{target:"expression",entries:wo(s.chunk,"expression")}:null}function oc(e){return a.map([[a.keyword(":target"),a.keyword(`:${e.target}`)],[a.keyword(":chunks"),a.vector(e.entries.map(t=>zb(t.label,t.chunk)))]])}function Db(e){const t=c.var(e)?Ie(e):e,n=c.var(e)?`${e.ns}/${e.name}`:cc(t);return c.function(t)||c.macro(t)?{kind:c.macro(t)?"macro":"function",arityCount:t.arities.length,bytecodeArityCount:t.arities.filter(r=>r.bytecodeBody!==void 0).length,entries:Sn(t,n)}:{kind:c.nativeFunction(t)?"native":"other",arityCount:0,bytecodeArityCount:0,entries:[]}}function Gb(e){const t=e.entries.length===0?a.nil():oc({target:e.kind==="macro"?"macro":"function",entries:e.entries});return a.map([[a.keyword(":kind"),a.keyword(`:${e.kind}`)],[a.keyword(":arity-count"),a.number(e.arityCount)],[a.keyword(":bytecode-arity-count"),a.number(e.bytecodeArityCount)],[a.keyword(":bytecode-info"),t]])}function zb(e,t){return a.map([[a.keyword(":label"),a.string(e)],[a.keyword(":name"),t.name===void 0?a.nil():a.string(t.name)],[a.keyword(":local-count"),a.number(t.localCount)],[a.keyword(":max-stack"),a.number(t.maxStack)],[a.keyword(":instructions"),a.vector(Bb(t))]])}function Bb(e){const t=[],n=[];let r=0;for(;r<e.code.length;){const s=ac(e,r),o=ic(n,s);t.push(Hb(s,o)),r=s.nextOffset}return t}function Hb(e,t){const n=[[a.keyword(":offset"),a.number(e.offset)],[a.keyword(":opcode"),a.number(e.opcode)],[a.keyword(":op"),a.keyword(`:${e.op}`)],[a.keyword(":operands"),a.vector(e.operands.map(r=>a.number(r)))]];return e.constantIndex!==void 0&&n.push([a.keyword(":constant-index"),a.number(e.constantIndex)]),e.constant!==void 0&&(n.push([a.keyword(":constant"),a.string(x(e.constant))]),n.push([a.keyword(":constant-type"),a.keyword(`:${e.constant.kind}`)])),e.symbol!==void 0&&n.push([a.keyword(":symbol"),a.string(e.symbol.name)]),e.lexicalLookup!==void 0&&n.push([a.keyword(":lexical-candidates"),a.vector(e.lexicalLookup.candidates.map(r=>a.map([[a.keyword(":kind"),a.keyword(`:${r.kind}`)],[a.keyword(":slot"),a.number(r.slot)]])))]),e.targetOffset!==void 0&&n.push([a.keyword(":target-offset"),a.number(e.targetOffset)]),e.argc!==void 0&&n.push([a.keyword(":argc"),a.number(e.argc)]),t!==void 0&&n.push([a.keyword(":callee"),a.string(t)]),a.map(n)}function ac(e,t){const n=e.code[t],r=Ub(n);switch(n){case p.Constant:{const s=e.code[t+1],o=e.constants[s];return{offset:t,opcode:n,op:r,operands:[s],nextOffset:t+2,constantIndex:s,constant:o,symbol:o!==void 0&&c.symbol(o)?o:void 0}}case p.LoadGlobal:case p.LoadQualified:case p.LoadVar:case p.Def:case p.DefMacro:case p.JsGetProp:case p.PushDynamicBinding:case p.SetDynamic:case p.WithMeta:{const s=e.code[t+1],o=e.constants[s];return{offset:t,opcode:n,op:r,operands:[s],nextOffset:t+2,constantIndex:s,constant:o,symbol:o!==void 0&&c.symbol(o)?o:void 0}}case p.LoadLocal:case p.StoreLocal:case p.LoadUpvalue:case p.Closure:case p.MakeVector:case p.MakeMap:case p.MakeSet:case p.EnterFinally:case p.JsNew:{const s=e.code[t+1];return{offset:t,opcode:n,op:r,operands:[s],nextOffset:t+2,targetOffset:n===p.EnterFinally?s:void 0,argc:n===p.JsNew?s:void 0}}case p.LoadLexicalVar:{const s=e.code[t+1],o=e.lexicalVarLookups[s];return{offset:t,opcode:n,op:r,operands:[s],nextOffset:t+2,symbol:o==null?void 0:o.symbol,lexicalLookup:o}}case p.Jump:case p.JumpIfFalsy:{const s=e.code[t+1];return{offset:t,opcode:n,op:r,operands:[s],nextOffset:t+2,targetOffset:t+2+s}}case p.Call:case p.FnRecur:case p.Add:case p.Sub:case p.Mul:case p.Div:case p.Lt:case p.Lte:case p.Gt:case p.Gte:case p.Eq:{const s=e.code[t+1];return{offset:t,opcode:n,op:r,operands:[s],nextOffset:t+2,targetOffset:n===p.FnRecur?0:void 0,argc:s}}case p.JsInvoke:case p.FnRecurRest:{const s=e.code[t+1],o=e.code[t+2],i=n===p.JsInvoke?e.constants[s]:void 0;return{offset:t,opcode:n,op:r,operands:[s,o],nextOffset:t+3,constantIndex:n===p.JsInvoke?s:void 0,constant:i,symbol:i!==void 0&&c.symbol(i)?i:void 0,argc:n===p.JsInvoke?o:s,targetOffset:n===p.FnRecurRest?0:void 0}}case p.Recur:{const s=e.code[t+1],o=e.code[t+2],i=e.code[t+3];return{offset:t,opcode:n,op:r,operands:[s,o,i],nextOffset:t+4,targetOffset:i,argc:o}}case p.PushTry:{const s=e.code[t+1],o=e.code[t+2],i=e.code[t+3];return{offset:t,opcode:n,op:r,operands:[s,o,i],nextOffset:t+4,targetOffset:i}}default:return{offset:t,opcode:n,op:r,operands:[],nextOffset:t+1}}}function ic(e,t){var n;switch(t.opcode){case p.Constant:case p.Nil:case p.True:case p.False:case p.LoadLocal:case p.LoadUpvalue:case p.Closure:e.push(null);return;case p.LoadGlobal:case p.LoadQualified:case p.LoadVar:case p.LoadLexicalVar:e.push(t.symbol?{callee:t.symbol.name}:null);return;case p.Pop:case p.StoreLocal:case p.Return:case p.JumpIfFalsy:case p.Throw:e.pop();return;case p.Call:{const r=t.argc??0,s=(n=e[e.length-r-1])==null?void 0:n.callee;return At(e,r+1),e.push(null),s}case p.JsNew:{const r=t.argc??0;At(e,r+1),e.push(null);return}case p.JsInvoke:{const r=t.argc??0;At(e,r+1),e.push(null);return}case p.MakeVector:case p.MakeSet:{At(e,t.operands[0]??0),e.push(null);return}case p.MakeMap:{At(e,(t.operands[0]??0)*2),e.push(null);return}case p.WithMeta:case p.Def:case p.DefMacro:case p.JsGetProp:return;case p.PushDynamicBinding:e.pop();return;case p.Add:case p.Sub:case p.Mul:case p.Div:case p.Lt:case p.Lte:case p.Gt:case p.Gte:case p.Eq:At(e,t.argc??0),e.push(null);return;case p.Recur:At(e,t.argc??0);return;case p.FnRecur:case p.FnRecurRest:At(e,t.argc??0);return;default:return}}function At(e,t){for(let n=0;n<t;n++)e.pop()}function Ub(e){return Hn(e).replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase()}function Xo(e,t,n){var s;const r=n.name.indexOf("/");if(r>0&&r<n.name.length-1){const o=n.name.slice(0,r),i=n.name.slice(r+1),l=((s=Ae(t).ns)==null?void 0:s.aliases.get(o))??e.resolveNs(o)??null;return l==null?void 0:l.vars.get(i)}return qt(n.name,t)}function Sn(e,t){if(c.var(e))return Sn(Ie(e),`${e.ns}/${e.name}`);if(c.function(e)||c.macro(e)){const n=[];return e.arities.forEach((r,s)=>{n.push(...Lb(r,`${t}/arity[${s}]`))}),n}return[]}function cc(e){return(c.function(e)||c.macro(e))&&e.name?e.name:e.kind}function Kb(e){return c.list(e)&&e.value.length===2&&c.symbol(e.value[0])&&e.value[0].name===Wn.var}function ks(e){const t=new Map;for(const n of e)t.set(n,new Map);return{opFreqs:new Map,invFreqs:new Map,ngramFreqMaps:t,chunkCount:0,instructionCount:0}}function lc(e,t,n){for(const r of e){n.chunkCount++;const s=[],o=[];let i=0;for(;i<r.chunk.code.length;){const u=ac(r.chunk,i),l=u.op;s.push(l),n.opFreqs.set(l,(n.opFreqs.get(l)??0)+1),n.instructionCount++;const d=ic(o,u);d!==void 0&&n.invFreqs.set(d,(n.invFreqs.get(d)??0)+1),i=u.nextOffset}for(const u of t){const l=n.ngramFreqMaps.get(u);for(let d=0;d<=s.length-u;d++){const m=s.slice(d,d+u).join("\0");l.set(m,(l.get(m)??0)+1)}}}}function Wb(e,t){for(const[n,r]of e.opFreqs)t.opFreqs.set(n,(t.opFreqs.get(n)??0)+r);for(const[n,r]of e.invFreqs)t.invFreqs.set(n,(t.invFreqs.get(n)??0)+r);for(const[n,r]of e.ngramFreqMaps){const s=t.ngramFreqMaps.get(n);for(const[o,i]of r)s.set(o,(s.get(o)??0)+i)}t.chunkCount+=e.chunkCount,t.instructionCount+=e.instructionCount}function xs(e){return a.map([...e.entries()].map(([t,n])=>[a.keyword(`:${t}`),a.number(n)]))}function $s(e){return a.map([...e.entries()].map(([t,n])=>[a.string(t),a.number(n)]))}function Ms(e,t){const n=[];for(const r of t){const s=e.get(r);n.push([a.number(r),a.map([...s.entries()].map(([o,i])=>[a.vector(o.split("\0").map(u=>a.keyword(`:${u}`))),a.number(i)]))])}return a.map(n)}function uc(e,t){const n=c.var(e)?Ie(e):e;if(c.function(n)||c.macro(n)){const r=c.macro(n)?"macro":"function",s=n.arities.length,o=n.arities.filter(u=>u.bytecodeBody!==void 0).length,i=Sn(n,t);return{kind:i.length===0?"unsupported":r,arityCount:s,bytecodeArityCount:o,entries:i}}return{kind:c.nativeFunction(n)?"native":"other",arityCount:0,bytecodeArityCount:0,entries:[]}}function Jb(e,t){const n=c.var(e)?Ie(e):e,r=c.var(e)?`${e.ns}/${e.name}`:cc(n),{kind:s,arityCount:o,bytecodeArityCount:i,entries:u}=uc(e,r),l=ks(t);return lc(u,t,l),a.map([[a.keyword(":kind"),a.keyword(`:${s}`)],[a.keyword(":arity-count"),a.number(o)],[a.keyword(":bytecode-arity-count"),a.number(i)],[a.keyword(":bytecode?"),a.boolean(u.length>0)],[a.keyword(":chunk-count"),a.number(l.chunkCount)],[a.keyword(":instruction-count"),a.number(l.instructionCount)],[a.keyword(":opcode-frequencies"),xs(l.opFreqs)],[a.keyword(":invocation-frequencies"),$s(l.invFreqs)],[a.keyword(":opcode-ngrams"),Ms(l.ngramFreqMaps,t)]])}function Qb(e){var t;return(((t=e.meta)==null?void 0:t.entries)??[]).some(([n,r])=>c.keyword(n)&&n.name===":private"&&c.boolean(r)&&r.value===!0)}function Yb(e,t,n,r){const s=e.resolveNs(t.name);if(s===null)throw new Error(`Namespace not found: ${t.name}`);const o=ks(r);let i=0,u=0,l=0,d=0,m=0,h=0,b=0;const M=[];for(const[$,R]of s.vars){if(R.ns!==s.name||!n&&Qb(R))continue;const E=`${s.name}/${$}`,{kind:U,arityCount:le,bytecodeArityCount:P,entries:S}=uc(R,E),_=ks(r);lc(S,r,_),Wb(_,o),i++,h+=le,b+=P,S.length>0?u++:U==="native"?l++:U==="unsupported"?m++:d++,M.push({name:a.symbol($),kind:U,arityCount:le,bytecodeArityCount:P,hasBytecode:S.length>0,chunkCount:_.chunkCount,instructionCount:_.instructionCount,counts:_})}const v=a.map([[a.keyword(":vars"),a.number(i)],[a.keyword(":bytecode-vars"),a.number(u)],[a.keyword(":native-vars"),a.number(l)],[a.keyword(":other-vars"),a.number(d)],[a.keyword(":unsupported-vars"),a.number(m)],[a.keyword(":arities"),a.number(h)],[a.keyword(":bytecode-arities"),a.number(b)],[a.keyword(":chunks"),a.number(o.chunkCount)],[a.keyword(":instructions"),a.number(o.instructionCount)]]),y=M.map($=>a.map([[a.keyword(":name"),$.name],[a.keyword(":kind"),a.keyword(`:${$.kind}`)],[a.keyword(":bytecode?"),a.boolean($.hasBytecode)],[a.keyword(":arity-count"),a.number($.arityCount)],[a.keyword(":bytecode-arity-count"),a.number($.bytecodeArityCount)],[a.keyword(":chunk-count"),a.number($.chunkCount)],[a.keyword(":instruction-count"),a.number($.instructionCount)],[a.keyword(":opcode-frequencies"),xs($.counts.opFreqs)],[a.keyword(":invocation-frequencies"),$s($.counts.invFreqs)],[a.keyword(":opcode-ngrams"),Ms($.counts.ngramFreqMaps,r)]]));return a.map([[a.keyword(":namespace"),a.symbol(t.name)],[a.keyword(":scope"),n?a.keyword(":interns"):a.keyword(":publics")],[a.keyword(":totals"),v],[a.keyword(":opcode-frequencies"),xs(o.opFreqs)],[a.keyword(":invocation-frequencies"),$s(o.invFreqs)],[a.keyword(":opcode-ngrams"),Ms(o.ngramFreqMaps,r)],[a.keyword(":items"),a.vector(y)]])}function Ut(e,t,n){var o;const r=(o=e.resolveNs("clojure.core"))==null?void 0:o.vars.get("*out*"),s=r?Ie(r):void 0;s&&c.aFunction(s)?e.applyCallable(s,[a.string(n)],t):e.io.stdout(n)}function Xb(e,t,n){var o;const r=(o=e.resolveNs("clojure.core"))==null?void 0:o.vars.get("*err*"),s=r?Ie(r):void 0;s&&c.aFunction(s)?e.applyCallable(s,[a.string(n)],t):e.io.stderr(n)}const Zb={println:a.nativeFnCtx("println",(e,t,...n)=>(ut(dt(e),()=>{Ut(e,t,n.map(ye).join(" ")+`
`)}),a.nil())).withMeta([...g({doc:"Prints the arguments to the current output channel, followed by a newline.",arglists:[["&","args"]],docGroup:w.io})]),print:a.nativeFnCtx("print",(e,t,...n)=>(ut(dt(e),()=>{Ut(e,t,n.map(ye).join(" "))}),a.nil())).withMeta([...g({doc:"Prints the arguments to the current output channel.",arglists:[["&","args"]],docGroup:w.io})]),newline:a.nativeFnCtx("newline",(e,t)=>(Ut(e,t,`
`),a.nil())).withMeta([...g({doc:"Prints a newline to the current output channel. Returns nil.",arglists:[[]],docGroup:w.io})]),pr:a.nativeFnCtx("pr",(e,t,...n)=>(ut(dt(e),()=>{Ut(e,t,n.map(r=>x(r)).join(" "))}),a.nil())).withMeta([...g({doc:"Prints the arguments to the output stream that *out* is bound to. Returns nil.",arglists:[["&","args"]],docGroup:w.io})]),prn:a.nativeFnCtx("prn",(e,t,...n)=>(ut(dt(e),()=>{Ut(e,t,n.map(r=>x(r)).join(" ")+`
`)}),a.nil())).withMeta([...g({doc:"Same as pr, but prints a newline after the arguments.",arglists:[["&","args"]],docGroup:w.io})]),pprint:a.nativeFnCtx("pprint",(e,t,n,r)=>{if(n===void 0)return a.nil();const s=r&&c.number(r)?r.value:80;return ut(dt(e),()=>{Ut(e,t,ai(n,s)+`
`)}),a.nil()}).withMeta([...g({doc:"Pretty-prints the arguments to the current output channel.",arglists:[["form","max-width"],["form"]],docGroup:w.io})]),warn:a.nativeFnCtx("warn",(e,t,...n)=>(ut(dt(e),()=>{Xb(e,t,n.map(ye).join(" ")+`
`)}),a.nil())).withMeta([...g({doc:"Prints the arguments to the current error channel, followed by a newline.",arglists:[["&","args"]],docGroup:w.io})])},ew={"*out*":a.nil(),"*err*":a.nil(),"*print-length*":a.nil(),"*print-level*":a.nil(),"*compiler-options*":a.map([])};function Zo(e,t,n){var s;const r=e.indexOf("/");if(r>0&&r<e.length-1){const o=e.slice(0,r),i=e.slice(r+1),l=((s=Ae(t).ns)==null?void 0:s.aliases.get(o))??n.resolveNs(o)??null;if(!l)return;const d=l.vars.get(i);return d!==void 0?Ie(d):void 0}return Cn(e,t)}function dc(e){return e===void 0?a.nil():a.keyword(`:${e.replace(":","/")}`)}function tw(e){return a.map([[a.keyword(":category"),a.keyword(`:${e.category}`)],[a.keyword(":detail"),a.string(e.detail)]])}function nw(e){const t=[[a.keyword(":stage"),a.keyword(e.stage)],[a.keyword(":elapsed-ms"),a.number(e.elapsedMs)]];return e.path!==void 0&&t.push([a.keyword(":path"),dc(e.path)]),e.reason!==void 0&&t.push([a.keyword(":reason"),tw(e.reason)]),a.map(t)}function rw(e){if(e===void 0||c.nil(e))return[];if(c.list(e)||c.vector(e))return e.value;if(c.cons(e)||c.lazySeq(e)||c.indexedSeq(e))return be(e);throw f.atArg(`measure* internal body must be a sequence, got ${x(e)}`,{body:e},0)}function ea(e,t,n){const r=rw(n),s=[];let o,i=a.nil();const u=e.measurement,l=e.evaluationDepth,d=yr();e.measurement={recordStage(m){s.push(m)},setPath(m){o=m}},e.evaluationDepth=0;try{for(const m of r){const{value:h,elapsedMs:b}=Mn(()=>{e.measurement=void 0;try{return e.expandAll(m,t)}finally{e.measurement={recordStage(M){s.push(M)},setPath(M){o=M}}}});s.push({stage:":macroexpand",elapsedMs:b}),i=e.evaluate(h,t)}}finally{e.measurement=u,e.evaluationDepth=l}return a.map([[a.keyword(":value"),i],[a.keyword(":elapsed-ms"),a.number(yr()-d)],[a.keyword(":path"),dc(o)],[a.keyword(":stages"),a.vector(s.map(nw))]])}function sw(e,t,n){const r=sc(e,t,n);return r===null?a.nil():a.vector(Nb(r.entries).map(a.string))}function ta(e,t){var n;return c.map(e)?((n=e.entries.find(([r])=>c.keyword(r)&&r.name===t))==null?void 0:n[1])??a.nil():a.nil()}const ow={str:a.nativeFn("str",function(...t){return a.string(t.map(n=>c.nil(n)?"":ye(n)).join(""))}).withMeta([...g({doc:pn(["Returns a concatenated string representation of the given values."]),arglists:[["&","args"]],docGroup:w.strings})]),subs:a.nativeFn("subs",function(t,n,r){if(t===void 0||!c.string(t))throw f.atArg(`subs expects a string as first argument${t!==void 0?`, got ${x(t)}`:""}`,{s:t},0);if(n===void 0||!c.number(n))throw f.atArg(`subs expects a number as second argument${n!==void 0?`, got ${x(n)}`:""}`,{start:n},1);if(r!==void 0&&!c.number(r))throw f.atArg(`subs expects a number as optional third argument${r!==void 0?`, got ${x(r)}`:""}`,{end:r},2);const s=n.value,o=r==null?void 0:r.value;return a.string(o===void 0?t.value.slice(s):t.value.slice(s,o))}).withMeta([...g({doc:pn(["Returns the substring of s beginning at start, and optionally ending before end."]),arglists:[["s","start"],["s","start","end"]],docGroup:w.strings})]),type:a.nativeFn("type",function(t){if(t===void 0)throw new f("type expects an argument",{x:t});if(c.record(t))return a.keyword(`:${t.ns}/${t.recordType}`);if(c.mapEntry(t))return a.keyword(":map-entry");const r={number:":number",string:":string",boolean:":boolean",nil:":nil",keyword:":keyword",symbol:":symbol",char:":char",list:":list",vector:":vector",map:":map",set:":set",function:":function","native-function":":function",macro:":macro","multi-method":":multimethod",regex:":regex",var:":var",delay:":delay","lazy-seq":":lazy-seq",cons:":cons",atom:":atom",namespace:":namespace",protocol:":protocol",pending:":pending","js-value":":js-value"}[t.kind];if(!r)throw new f(`type: unhandled kind ${t.kind}`,{x:t});return a.keyword(r)}).withMeta([...g({doc:"Returns a keyword representing the type of a value. Records return :ns/RecordType; built-ins return :string, :number, :nil, etc.",arglists:[["x"]],docGroup:w.introspection})]),gensym:a.nativeFn("gensym",function(...t){if(t.length>1)throw new f("gensym takes 0 or 1 arguments",{args:t});const n=t[0];if(n!==void 0&&!c.string(n))throw f.atArg(`gensym prefix must be a string${n!==void 0?`, got ${x(n)}`:""}`,{prefix:n},0);const r=n&&c.string(n)?n.value:"G";return a.symbol(Ui(r))}).doc('Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',[[],["prefix"]]).withMeta([...g({doc:'Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',arglists:[[],["prefix"]],docGroup:w.runtime})]),"measure*-impl":a.nativeFnCtx("measure*-impl",function(t,n,r){return ea(t,n,r)}).withMeta([...g({doc:"Implementation detail for measure*. Evaluates quoted body forms and returns structured timing data.",arglists:[["body"]],docGroup:w.runtime})]),"time*-impl":a.nativeFnCtx("time*-impl",function(t,n,r){const s=ea(t,n,r),o=ta(s,":elapsed-ms");return Ut(t,n,`Elapsed time: ${ye(o)} msecs
`),ta(s,":value")}).withMeta([...g({doc:"Implementation detail for time. Evaluates quoted body forms, prints elapsed time, and returns the value.",arglists:[["body"]],docGroup:w.runtime})]),"disassemble*-impl":a.nativeFnCtx("disassemble*-impl",function(t,n,r){return sw(t,n,r)}).withMeta([...g({doc:"Implementation detail for disassemble*. Returns formatted VM bytecode lines for quoted forms and bytecode-backed values.",arglists:[["form"]],docGroup:w.runtime})]),"analyze*-impl":a.nativeFnCtx("analyze*-impl",function(t,n,r){return r===void 0?a.nil():a.vector(Hg(r,n,t).map(a.string))}).withMeta([...g({doc:"Implementation detail for analyze*. Returns the human-readable analyzer AST printout for a quoted form. Does not evaluate the form.",arglists:[["form"]],docGroup:w.runtime})]),"ast*-impl":a.nativeFnCtx("ast*-impl",function(t,n,r){return r===void 0?a.nil():Ug(r,n,t)}).withMeta([...g({doc:"Implementation detail for ast*. Returns the faithful analyzer AST as cljam data for a quoted form. Does not evaluate the form.",arglists:[["form"]],docGroup:w.runtime})]),eval:a.nativeFnCtx("eval",function(t,n,r){if(r===void 0)throw new f("eval expects a form as argument",{form:r});const s=t.expandAll(r,n);return t.evaluate(s,n)}).withMeta([...g({doc:"Evaluates the given form in the global environment and returns the result.",arglists:[["form"]],docGroup:w.runtime})]),"macroexpand-1":a.nativeFnCtx("macroexpand-1",function(t,n,r){if(!c.list(r)||r.value.length===0)return r;const s=r.value[0];if(!c.symbol(s))return r;const o=Zo(s.name,n,t);return o===void 0||!c.macro(o)?r:t.applyMacro(o,r.value.slice(1))}).withMeta([...g({doc:"If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.",arglists:[["form"]],docGroup:w.runtime})]),macroexpand:a.nativeFnCtx("macroexpand",function(t,n,r){let s=r;for(;;){if(!c.list(s)||s.value.length===0)return s;const o=s.value[0];if(!c.symbol(o))return s;const i=Zo(o.name,n,t);if(i===void 0||!c.macro(i))return s;s=t.applyMacro(i,s.value.slice(1))}}).withMeta([...g({doc:pn(["Expands all macros until the expansion is stable (head is no longer a macro)","","Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms"]),arglists:[["form"]],docGroup:w.runtime})]),"macroexpand-all":a.nativeFnCtx("macroexpand-all",function(t,n,r){return t.expandAll(r,n)}).withMeta([...g({doc:pn(["Fully expands all macros in a form recursively — including in sub-forms.","","Unlike macroexpand, this descends into every sub-expression.","Expansion stops at quote/quasiquote boundaries and fn/loop bodies."]),arglists:[["form"]],docGroup:w.runtime})]),namespace:a.nativeFn("namespace",function(t){if(t===void 0)throw f.atArg("namespace expects an argument",{x:t},0);let n;if(c.keyword(t))n=t.name.slice(1);else if(c.symbol(t))n=t.name;else throw f.atArg(`namespace expects a keyword or symbol, got ${x(t)}`,{x:t},0);const r=n.indexOf("/");return r<=0?a.nil():a.string(n.slice(0,r))}).withMeta([...g({doc:"Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.",arglists:[["x"]],docGroup:w.introspection})]),name:a.nativeFn("name",function(t){if(t===void 0)throw f.atArg("name expects an argument",{x:t},0);let n;if(c.keyword(t))n=t.name.slice(1);else if(c.symbol(t))n=t.name;else{if(c.string(t))return t;throw f.atArg(`name expects a keyword, symbol, or string, got ${x(t)}`,{x:t},0)}const r=n.indexOf("/");return a.string(r>=0?n.slice(r+1):n)}).withMeta([...g({doc:"Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.",arglists:[["x"]],docGroup:w.introspection})]),keyword:a.nativeFn("keyword",function(...t){if(t.length===0||t.length>2)throw new f("keyword expects 1 or 2 string arguments",{args:t});if(!c.string(t[0]))throw f.atArg(`keyword expects a string, got ${x(t[0])}`,{args:t},0);if(t.length===1)return a.keyword(`:${t[0].value}`);if(!c.string(t[1]))throw f.atArg(`keyword second argument must be a string, got ${x(t[1])}`,{args:t},1);return a.keyword(`:${t[0].value}/${t[1].value}`)}).withMeta([...g({doc:pn(["Constructs a keyword with the given name and namespace strings. Returns a keyword value.","","Note: do not use : in the keyword strings, it will be added automatically.",'e.g. (keyword "foo") => :foo']),arglists:[["name"],["ns","name"]],docGroup:w.strings})]),boolean:a.nativeFn("boolean",function(t){return t===void 0?a.boolean(!1):a.boolean(c.truthy(t))}).withMeta([...g({doc:"Coerces to boolean. Everything is true except false and nil.",arglists:[["x"]],docGroup:w.utilities})]),"clojure-version":a.nativeFn("clojure-version",function(){return a.string("1.12.0")}).withMeta([...g({doc:"Returns a string describing the current Clojure version.",arglists:[[]],docGroup:w.utilities})]),"pr-str":a.nativeFnCtx("pr-str",function(t,n,...r){return ut(dt(t),()=>a.string(r.map(x).join(" ")))}).withMeta([...g({doc:"Returns a readable string representation of the given values (strings are quoted).",arglists:[["&","args"]],docGroup:w.strings})]),"pretty-print-str":a.nativeFnCtx("pretty-print-str",function(t,n,...r){if(r.length===0)return a.string("");const s=r[0],o=r[1],i=o!==void 0&&c.number(o)?o.value:80;return ut(dt(t),()=>a.string(ai(s,i)))}).withMeta([...g({doc:"Returns a pretty-printed string representation of form.",arglists:[["form"],["form","max-width"]],docGroup:w.strings})]),"read-string":a.nativeFn("read-string",function(t){if(t===void 0||!c.string(t))throw f.atArg(`read-string expects a string${t!==void 0?`, got ${x(t)}`:""}`,{s:t},0);let n;try{const r=Un(t.value);n=br(r,void 0,void 0,t.value)}catch(r){throw ei(r)}return n.length===0?a.nil():n[0]}).withMeta([...g({doc:"Reads one object from the string s. Returns nil if string is empty.",arglists:[["s"]],docGroup:w.strings})]),"prn-str":a.nativeFnCtx("prn-str",function(t,n,...r){return ut(dt(t),()=>a.string(r.map(x).join(" ")+`
`))}).withMeta([...g({doc:"pr-str to a string, followed by a newline.",arglists:[["&","args"]],docGroup:w.strings})]),"print-str":a.nativeFnCtx("print-str",function(t,n,...r){return ut(dt(t),()=>a.string(r.map(ye).join(" ")))}).withMeta([...g({doc:"print to a string (human-readable, no quotes on strings).",arglists:[["&","args"]],docGroup:w.strings})]),"println-str":a.nativeFn("println-str",function(...t){return a.string(t.map(ye).join(" ")+`
`)}).withMeta([...g({doc:"println to a string.",arglists:[["&","args"]],docGroup:w.strings})]),symbol:a.nativeFn("symbol",function(...t){if(t.length===0||t.length>2)throw new f("symbol expects 1 or 2 string arguments",{args:t});if(t.length===1){if(c.symbol(t[0]))return t[0];if(!c.string(t[0]))throw f.atArg(`symbol expects a string, got ${x(t[0])}`,{args:t},0);return a.symbol(t[0].value)}if(!c.string(t[0])||!c.string(t[1]))throw new f("symbol expects string arguments",{args:t});return a.symbol(`${t[0].value}/${t[1].value}`)}).withMeta([...g({doc:"Returns a Symbol with the given namespace and name.",arglists:[["name"],["ns","name"]],docGroup:w.runtime})]),"parse-long":a.nativeFn("parse-long",function(t){if(t===void 0||!c.string(t))throw f.atArg(`parse-long expects a string${t!==void 0?`, got ${x(t)}`:""}`,{s:t},0);if(!/^[+-]?\d+$/.test(t.value))return a.nil();const n=Number.parseInt(t.value,10);return Number.isFinite(n)?a.number(n):a.nil()}).withMeta([...g({doc:"Parses string s as a long integer. Returns nil if s is not a valid integer string.",arglists:[["s"]],docGroup:w.utilities})]),"parse-double":a.nativeFn("parse-double",function(t){if(t===void 0||!c.string(t))throw f.atArg(`parse-double expects a string${t!==void 0?`, got ${x(t)}`:""}`,{s:t},0);const n=t.value.trim();if(n==="")return a.nil();const r=Number(n);return Number.isNaN(r)&&n!=="NaN"?a.nil():a.number(r)}).withMeta([...g({doc:"Parses string s as a double. Returns nil if s is not a valid number string.",arglists:[["s"]],docGroup:w.utilities})]),"parse-boolean":a.nativeFn("parse-boolean",function(t){if(t===void 0||!c.string(t))throw f.atArg(`parse-boolean expects a string${t!==void 0?`, got ${x(t)}`:""}`,{s:t},0);return t.value==="true"?a.boolean(!0):t.value==="false"?a.boolean(!1):a.nil()}).withMeta([...g({doc:'Parses string s as a boolean. Returns true for "true", false for "false", nil for anything else.',arglists:[["s"]],docGroup:w.utilities})])},aw={force:a.nativeFnCtx("force",function(t,n,r){return c.delay(r)?Ci(r,t,n):c.lazySeq(r)?$t(r,t,n):r}).withMeta([...g({doc:"If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.",arglists:[["x"]],docGroup:w.lazy})]),"delay?":a.nativeFn("delay?",function(t){return a.boolean(c.delay(t))}).withMeta([...g({doc:"Returns true if x is a Delay.",arglists:[["x"]],docGroup:w.lazy})]),"lazy-seq?":a.nativeFn("lazy-seq?",function(t){return a.boolean(c.lazySeq(t))}).withMeta([...g({doc:"Returns true if x is a LazySeq.",arglists:[["x"]],docGroup:w.lazy})]),"realized?":a.nativeFn("realized?",function(t){return c.delay(t)||c.lazySeq(t)?a.boolean(t.realized):a.boolean(!1)}).withMeta([...g({doc:"Returns true if a Delay or LazySeq has been realized.",arglists:[["x"]],docGroup:w.lazy})]),"make-delay":a.nativeFnCtx("make-delay",function(t,n,r){if(!c.aFunction(r))throw new f(`make-delay: argument must be a function, got ${r.kind}`,{fn:r});return a.delay(()=>t.applyCallable(r,[],n),r,n)}).withMeta([...g({doc:"Creates a Delay that invokes thunk-fn (a zero-arg function) on first force.",arglists:[["thunk-fn"]],docGroup:w.lazy})]),"make-lazy-seq":a.nativeFnCtx("make-lazy-seq",function(t,n,r){if(!c.aFunction(r))throw new f(`make-lazy-seq: argument must be a function, got ${r.kind}`,{fn:r});return a.lazySeq(()=>t.applyCallable(r,[],n),r,n)}).withMeta([...g({doc:"Creates a LazySeq that invokes thunk-fn (a zero-arg function) on first realization.",arglists:[["thunk-fn"]],docGroup:w.lazy})])},iw={"var?":a.nativeFn("var?",function(t){return a.boolean(c.var(t))}).withMeta([...g({doc:"Returns true if x is a Var.",arglists:[["x"]],docGroup:w.predicates})]),"var-get":a.nativeFn("var-get",function(t){if(!c.var(t))throw new f(`var-get expects a Var, got ${t.kind}`,{x:t});return t.value}).withMeta([...g({doc:"Returns the value in the Var object.",arglists:[["x"]],docGroup:w.vars})]),"alter-var-root":a.nativeFnCtx("alter-var-root",function(t,n,r,s,...o){var l;if(!c.var(r))throw new f(`alter-var-root expects a Var as its first argument, got ${r.kind}`,{varVal:r});if(!c.aFunction(s))throw new f(`alter-var-root expects a function as its second argument, got ${s.kind}`,{f:s});const i=t.applyFunction(s,[r.value,...o],n);r.value=i;const u=t.resolveNs(r.ns);return u&&((l=t.touchNamespace)==null||l.call(t,u,"alter-var-root")),i}).withMeta([...g({doc:"Atomically alters the root binding of var v by applying f to its current value plus any additional args.",arglists:[["v","f","&","args"]],docGroup:w.vars})])};function cw(e){return a.nativeFn(`kw:${e.name}`,(...t)=>{const n=t[0];if(!c.map(n))return a.nil();const r=n.entries.find(([s])=>c.equal(s,e));return r?r[1]:a.nil()})}const lw={"multimethod?":a.nativeFn("multimethod?",function(t){return a.boolean(c.multiMethod(t))}).withMeta([...g({doc:"Returns true if x is a multimethod.",arglists:[["x"]],docGroup:w.predicates})]),"make-multimethod!":a.nativeFnCtx("make-multimethod!",function(t,n,r,s,...o){var b;if(!c.string(r))throw new f(`make-multimethod!: first argument must be a string, got ${r.kind}`,{nameVal:r});const i=r.value,u=Ae(n),l=u.ns.vars.get(i);if(l&&c.multiMethod(l.value))return a.nil();let d;if(c.keyword(s))d=cw(s);else if(c.aFunction(s))d=s;else throw new f(`make-multimethod!: dispatch-fn must be a function or keyword, got ${s.kind}`,{dispatchFnVal:s});let m;for(let M=0;M+1<o.length;M+=2)c.keyword(o[M])&&o[M].name===":default"&&(m=o[M+1]);const h=a.multiMethod(i,d,[],void 0,m);return me(i,h,u),u.ns&&((b=t.touchNamespace)==null||b.call(t,u.ns,"defmulti")),a.nil()}).withMeta([...g({doc:"Creates a multimethod with the given name and dispatch-fn in the current namespace. Accepts optional :default <sentinel-val> to customize the fallback sentinel. No-op if already a multimethod (re-eval safe).",arglists:[["name","dispatch-fn","& opts"]],docGroup:w.multimethods,extra:{"no-doc":!0}})]),"add-method!":a.nativeFnCtx("add-method!",function(t,n,r,s,o){var h;if(!c.var(r))throw new f(`add-method!: first argument must be a Var, got ${r.kind}`,{varVal:r});if(!c.multiMethod(r.value))throw new f(`add-method!: ${r.name} is not a multimethod`,{varVal:r});if(!c.aFunction(o))throw new f(`add-method!: method must be a function, got ${o.kind}`,{methodFn:o});const i=r.value,u=i.defaultDispatchVal??a.keyword(":default"),l=c.equal(s,u);let d;if(l)d=a.multiMethod(i.name,i.dispatchFn,i.methods,o,i.defaultDispatchVal);else{const b=i.methods.filter(M=>!c.equal(M.dispatchVal,s));d=a.multiMethod(i.name,i.dispatchFn,[...b,{dispatchVal:s,fn:o}],i.defaultMethod,i.defaultDispatchVal)}r.value=d;const m=t.resolveNs(r.ns);return m&&((h=t.touchNamespace)==null||h.call(t,m,"defmethod")),a.nil()}).withMeta([...g({doc:"Adds or replaces a method on a multimethod var. Uses :default as the fallback dispatch value.",arglists:[["mm-var","dispatch-val","fn"]],docGroup:w.multimethods,extra:{"no-doc":!0}})])};function dr(e){return c.record(e)?`${e.ns}/${e.recordType}`:c.mapEntry(e)?"map-entry":e.kind}function*Ss(e){for(const t of e.allNamespaces())for(const n of t.vars.values())c.protocol(n.value)&&(yield n.value)}const uw={"make-protocol!":a.nativeFnCtx("make-protocol!",function(t,n,r,s,o){if(!c.string(r))throw new f(`make-protocol!: name must be a string, got ${r.kind}`,{nameVal:r});if(!c.vector(o))throw new f(`make-protocol!: method-defs must be a vector, got ${o.kind}`,{methodDefsVal:o});const i=r.value,u=c.string(s)?s.value:void 0,l=[];for(const M of o.value){if(!c.vector(M))continue;const[v,y,$]=M.value;if(!c.string(v))continue;const R=[];if(c.vector(y))for(const E of y.value)c.vector(E)&&R.push(E.value.map(U=>c.string(U)?U.value:x(U)));l.push({name:v.value,arglists:R,doc:c.string($)?$.value:void 0})}const d=Ae(n),m=d.ns.name,h=d.ns.vars.get(i);if(h&&c.protocol(h.value))return a.nil();const b=a.protocol(i,m,l,u);me(i,b,d);for(const M of l){const v=M.name,y=a.nativeFnCtx(v,(R,E,...U)=>{var V;if(U.length===0)throw new f(`Protocol method '${v}' called with no arguments`,{});const le=U[0],P=dr(le),S=(V=R.resolveNs(m))==null?void 0:V.vars.get(i),O=(S&&c.protocol(S.value)?S.value:b).impls.get(P);if(!O||!O[v])throw new f(`No implementation of protocol method '${m}/${i}/${v}' for type '${P}'`,{target:le,tag:P,protocolName:i,methodName:v});return R.applyFunction(O[v],U,E)}).withMeta([[a.kw(":protocol"),a.string(`${m}/${i}`)],[a.kw(":name"),a.string(v)]]),$=d.ns.vars.get(v);$&&!c.protocol($.value)&&t.io.stderr(`WARNING: defprotocol '${i}' method '${v}' shadows existing var in ${m}`),me(v,y,d)}return a.nil()}).withMeta([...g({doc:"Creates a protocol with the given name, docstring, and method definitions. Interns the protocol and its dispatch functions in the current namespace.",arglists:[["name","doc","method-defs"]],docGroup:w.protocols,extra:{"no-doc":!0}})]),"extend-protocol!":a.nativeFnCtx("extend-protocol!",function(t,n,r,s,o){let i;if(c.var(r)&&c.protocol(r.value))i=r.value;else if(c.protocol(r))i=r;else throw new f(`extend-protocol!: first argument must be a protocol var or protocol, got ${r.kind}`,{protoVal:r});if(!c.string(s))throw new f(`extend-protocol!: type-tag must be a string, got ${s.kind}`,{typeTagVal:s});if(!c.map(o))throw new f(`extend-protocol!: impl-map must be a map, got ${o.kind}`,{implMapVal:o});const u=s.value,l={};for(const[d,m]of o.entries)if(c.string(d)){if(!c.aFunction(m))throw new f(`extend-protocol!: implementation for '${d.value}' must be a function, got ${m.kind}`,{fnVal:m});l[d.value]=m}return i.impls.set(u,l),a.nil()}).withMeta([...g({doc:"Registers method implementations for type-tag on a protocol. Mutates the protocol in place.",arglists:[["proto-var","type-tag","impl-map"]],docGroup:w.protocols,extra:{"no-doc":!0}})]),"satisfies?":a.nativeFn("satisfies?",function(t,n){let r;if(c.var(t)&&c.protocol(t.value))r=t.value;else if(c.protocol(t))r=t;else throw new f(`satisfies?: first argument must be a protocol, got ${t.kind}`,{protoVal:t});if(n===void 0)throw new f("satisfies?: second argument is required",{});const s=dr(n);return a.boolean(r.impls.has(s))}).withMeta([...g({doc:"Returns true if value implements the protocol.",arglists:[["protocol","value"]],docGroup:w.protocols})]),protocols:a.nativeFnCtx("protocols",function(t,n,r){if(r===void 0)throw new f("protocols: argument is required",{});const s=c.keyword(r)?r.name.slice(1):dr(r),o=[];for(const i of Ss(t))i.impls.has(s)&&o.push(i);return a.vector(o)}).withMeta([...g({doc:"Returns a vector of all protocols that a type implements. Accepts a keyword type tag (:string, :user/Circle) or any value.",arglists:[["type-kw-or-value"]],docGroup:w.protocols})]),extenders:a.nativeFn("extenders",function(t){let n;if(c.var(t)&&c.protocol(t.value))n=t.value;else if(c.protocol(t))n=t;else throw new f(`extenders: argument must be a protocol, got ${t.kind}`,{protoVal:t});return a.vector([...n.impls.keys()].map(r=>a.keyword(`:${r}`)))}).withMeta([...g({doc:"Returns a vector of type-tag strings that have extended the protocol.",arglists:[["protocol"]],docGroup:w.protocols})]),"make-record!":a.nativeFn("make-record!",function(t,n,r,s){if(!c.string(t))throw new f(`make-record!: record-type must be a string, got ${t.kind}`,{recordTypeVal:t});if(!c.string(n))throw new f(`make-record!: ns-name must be a string, got ${n.kind}`,{nsNameVal:n});if(!c.vector(r))throw new f(`make-record!: basis-keys must be a vector, got ${r.kind}`,{basisKeysVal:r});if(!c.map(s))throw new f(`make-record!: field-map must be a map, got ${s.kind}`,{fieldMapVal:s});const o=be(r),i=[],u=[];for(const l of o){if(!c.keyword(l))throw new f(`make-record!: basis keys must be keywords, got ${l.kind}`,{key:l});i.push(l.name);const d=s.entries.find(([m])=>c.equal(m,l));u.push([l,d?d[1]:a.nil()])}for(const[l,d]of s.entries)c.keyword(l)&&i.includes(l.name)||u.push([l,d]);return a.record(t.value,n.value,u,i)}).withMeta([...g({doc:"Creates a record value. Called by generated constructors (->Name, map->Name).",arglists:[["record-type","ns-name","basis-keys","field-map"]],docGroup:w.protocols,extra:{"no-doc":!0}})]),"protocol?":a.nativeFn("protocol?",function(t){return a.boolean(c.protocol(t))}).withMeta([...g({doc:"Returns true if x is a protocol.",arglists:[["x"]],docGroup:w.predicates})]),"record?":a.nativeFn("record?",function(t){return a.boolean(c.record(t))}).withMeta([...g({doc:"Returns true if x is a record.",arglists:[["x"]],docGroup:w.predicates})]),"record-type":a.nativeFn("record-type",function(t){if(!c.record(t))throw new f(`record-type: expected a record, got ${t.kind}`,{x:t});return a.string(`${t.ns}/${t.recordType}`)}).withMeta([...g({doc:"Returns the qualified type name (ns/Name) of a record.",arglists:[["record"]],docGroup:w.protocols,extra:{"no-doc":!0}})])},F={kind:a.autoKeyword("kind"),name:a.autoKeyword("name"),fn:a.autoKeyword("fn"),nativeFn:a.autoKeyword("native-fn"),arglists:a.autoKeyword("arglists"),doc:a.autoKeyword("doc"),protocol:a.autoKeyword("protocol"),protocols:a.autoKeyword("protocols"),fields:a.autoKeyword("fields"),protocolFn:a.autoKeyword("protocol-fn"),methods:a.autoKeyword("methods"),dispatchVals:a.autoKeyword("dispatch-vals"),default:a.autoKeyword("default?"),multiMethod:a.autoKeyword("multi-method"),macro:a.autoKeyword("macro"),ns:a.autoKeyword("ns"),extenders:a.autoKeyword("extenders"),record:a.autoKeyword("record"),type:a.autoKeyword("type"),namespace:a.autoKeyword("namespace"),varCount:a.autoKeyword("var-count"),var:a.autoKeyword("var"),vars:a.autoKeyword("vars"),showing:a.autoKeyword("showing"),dynamic:a.autoKeyword("dynamic"),value:a.autoKeyword("value"),string:a.autoKeyword("string"),count:a.autoKeyword("count"),number:a.autoKeyword("number"),boolean:a.autoKeyword("boolean"),nil:a.autoKeyword("nil"),keyword:a.autoKeyword("keyword"),symbol:a.autoKeyword("symbol"),list:a.autoKeyword("list"),vector:a.autoKeyword("vector"),map:a.autoKeyword("map"),set:a.autoKeyword("set"),atom:a.autoKeyword("atom"),lazySeq:a.autoKeyword("lazy-seq"),cons:a.autoKeyword("cons"),regex:a.autoKeyword("regex"),delay:a.autoKeyword("delay"),reduced:a.autoKeyword("reduced"),derefKind:a.autoKeyword("deref-kind"),realized:a.autoKeyword("realized"),pattern:a.autoKeyword("pattern"),flags:a.autoKeyword("flags")};function ko(e){return e.map(t=>{const n=t.params.map(r=>x(r));return t.restParam?[...n,"&",x(t.restParam)]:n})}function fc(e){return ko(e.arities)}function mc(e){const t=e.meta;if(!t)return[];const n=t.entries.find(([s])=>c.keyword(s)&&s.name===":arglists");if(!n)return[];const r=n[1];return c.vector(r)?r.value.filter(c.vector).map(s=>s.value.map(o=>c.symbol(o)?o.name:x(o))):[]}function qn(e){if(!e)return a.nil();const t=e.entries.find(([n])=>c.keyword(n)&&n.name===":doc");return t?t[1]:a.nil()}function pc(e,t){if(!e)return a.nil();const n=e.entries.find(([r])=>c.keyword(r)&&r.name===t);return n?n[1]:a.nil()}function hc(e){return e.meta!==void 0&&e.meta.entries.some(([t])=>c.keyword(t)&&t.name===":protocol")}function dw(e){switch(e.kind){case"function":{const t=fc(e);return a.map([[F.kind,F.fn],...e.name?[[F.name,a.string(e.name)]]:[],[F.arglists,a.vector(t.map(n=>a.vector(n.map(a.string))))],[F.doc,qn(e.meta)]])}case"native-function":{if(hc(e))return a.map([[F.kind,F.protocolFn],[F.name,a.string(e.name)],[F.protocol,pc(e.meta,":protocol")]]);const t=mc(e);return a.map([[F.kind,F.nativeFn],[F.name,a.string(e.name)],[F.arglists,a.vector(t.map(n=>a.vector(n.map(a.string))))],[F.doc,qn(e.meta)]])}case"protocol":return a.map([[F.kind,F.protocol],[F.name,a.string(e.name)],[F.methods,a.vector(e.fns.map(t=>a.string(t.name)))]]);case"multi-method":return a.map([[F.kind,F.multiMethod],[F.name,a.string(e.name)],[F.dispatchVals,a.vector(e.methods.map(t=>t.dispatchVal))],[F.default,a.boolean(e.defaultMethod!==void 0)]]);case"macro":{const t=ko(e.arities);return a.map([[F.kind,F.macro],...e.name?[[F.name,a.string(e.name)]]:[],[F.arglists,a.vector(t.map(n=>a.vector(n.map(a.string))))],[F.doc,qn(e.meta)]])}default:return a.map([[F.kind,a.kw(`:${e.kind}`)]])}}function qs(e,t,n){switch(t.kind){case"protocol":{const r=[...t.impls.keys()].map(o=>a.keyword(`:${o}`)),s=t.fns.map(o=>a.map([[F.name,a.string(o.name)],[F.arglists,a.vector(o.arglists.map(i=>a.vector(i.map(a.string))))],[F.doc,o.doc!==void 0?a.string(o.doc):a.nil()]]));return a.map([[F.kind,F.protocol],[F.name,a.string(t.name)],[F.ns,a.string(t.ns)],[F.doc,t.doc!==void 0?a.string(t.doc):a.nil()],[F.methods,a.vector(s)],[F.extenders,a.vector(r)]])}case"function":{const r=fc(t);return a.map([[F.kind,F.fn],[F.name,t.name!==void 0?a.string(t.name):a.nil()],[F.arglists,a.vector(r.map(s=>a.vector(s.map(a.string))))],[F.doc,qn(t.meta)]])}case"native-function":{if(hc(t)){const s=pc(t.meta,":protocol"),o=[];if(c.string(s)){for(const i of Ss(e))if(`${i.ns}/${i.name}`===s.value){const u=i.fns.find(l=>l.name===t.name);u&&o.push(...u.arglists);break}}return a.map([[F.kind,F.protocolFn],[F.name,a.string(t.name)],[F.protocol,s],[F.arglists,a.vector(o.map(i=>a.vector(i.map(a.string))))]])}const r=mc(t);return a.map([[F.kind,F.nativeFn],[F.name,a.string(t.name)],[F.arglists,a.vector(r.map(s=>a.vector(s.map(a.string))))],[F.doc,qn(t.meta)]])}case"multi-method":return a.map([[F.kind,F.multiMethod],[F.name,a.string(t.name)],[F.dispatchVals,a.vector(t.methods.map(r=>r.dispatchVal))],[F.default,a.boolean(t.defaultMethod!==void 0)]]);case"record":{const r=dr(t),s=[];for(const o of Ss(e))o.impls.has(r)&&s.push(a.keyword(`:${o.ns}/${o.name}`));return a.map([[F.kind,F.record],[F.type,a.keyword(`:${t.ns}/${t.recordType}`)],[F.ns,a.string(t.ns)],[F.name,a.string(t.recordType)],[F.fields,a.map(t.fields)],[F.protocols,a.vector(s)]])}case"namespace":{const r=[...t.vars.entries()],s=r.length,o=n!==null&&s>n,u=(o?r.slice(0,n):r).map(([l,d])=>[a.string(l),dw(d.value)]);return a.map([[F.kind,F.namespace],[F.name,a.string(t.name)],[F.doc,t.doc!==void 0?a.string(t.doc):a.nil()],[F.varCount,a.number(s)],...o?[[F.showing,a.number(n)]]:[],[F.vars,a.map(u)]])}case"var":return a.map([[F.kind,F.var],[F.ns,a.string(t.ns)],[F.name,a.string(t.name)],[F.dynamic,a.boolean(t.dynamic??!1)],[F.value,qs(e,t.value,null)]]);case"string":return a.map([[F.kind,F.string],[F.value,t],[F.count,a.number(t.value.length)]]);case"number":return a.map([[F.kind,F.number],[F.value,t]]);case"boolean":return a.map([[F.kind,F.boolean],[F.value,t]]);case"nil":return a.map([[F.kind,F.nil]]);case"keyword":{const r=t.name.slice(1),s=r.indexOf("/");return a.map([[F.kind,F.keyword],[F.name,a.string(s>=0?r.slice(s+1):r)],[F.ns,s>=0?a.string(r.slice(0,s)):a.nil()]])}case"symbol":{const r=t.name,s=r.indexOf("/");return a.map([[F.kind,F.symbol],[F.name,a.string(s>=0?r.slice(s+1):r)],[F.ns,s>=0?a.string(r.slice(0,s)):a.nil()]])}case"list":return a.map([[F.kind,F.list],[F.count,a.number(t.value.length)]]);case"vector":return a.map([[F.kind,F.vector],[F.count,a.number(t.value.length)]]);case"map":return a.map([[F.kind,F.map],[F.count,a.number(t.entries.length)]]);case"set":return a.map([[F.kind,F.set],[F.count,a.number(kn(t))]]);case"atom":return a.map([[F.kind,F.atom],[F.derefKind,a.kw(`:${t.value.kind}`)],[F.value,qs(e,t.value,null)]]);case"lazy-seq":return a.map([[F.kind,F.lazySeq],[F.realized,a.boolean(t.realized)]]);case"cons":return a.map([[F.kind,F.cons]]);case"regex":return a.map([[F.kind,F.regex],[F.pattern,a.string(t.pattern)],[F.flags,a.string(t.flags)]]);case"delay":return a.map([[F.kind,F.delay],[F.realized,a.boolean(t.realized)]]);case"macro":{const r=ko(t.arities);return a.map([[F.kind,F.macro],...t.name?[[F.name,a.string(t.name)]]:[],[F.arglists,a.vector(r.map(s=>a.vector(s.map(a.string))))],[F.doc,qn(t.meta)]])}default:return a.map([[F.kind,a.kw(`:${t.kind}`)]])}}const fw={"describe*":a.nativeFnCtx("describe*",function(t,n,r,s){if(r===void 0)throw new f("describe*: argument is required",{});const o=s!==void 0&&c.number(s)?s.value:null;return qs(t,r,o)}).withMeta([...g({doc:"Returns a plain map describing any cljam value. Called by describe — prefer using describe directly.",arglists:[["value"],["value","limit"]],docGroup:w.introspection,extra:{"no-doc":!0}})])};function Tt(e,t){const n=a.kw(t),r=an(e,n);return r!==ze&&c.map(r)?r:a.map([])}function et(e,t){const n=an(e,t);return n!==ze&&c.set(n)?n:a.set([])}function fr(e,t,n){return kn(n)>0?Cr(e,t,n):Gs(e,t)}function or(e,t){let n=e;for(const r of je(t))n=Pa(n,r);return n}function mw(e,t){const n=[],r=[...je(et(e,t))];for(;r.length>0;){const s=r.shift();if(!n.some(o=>c.equal(o,s))){n.push(s);for(const o of je(et(e,s)))n.some(i=>c.equal(i,o))||r.push(o)}}return a.set(n)}function pw(e){const t=[];for(const[i,u]of e.entries)if(t.some(l=>c.equal(l,i))||t.push(i),c.set(u))for(const l of je(u))t.some(d=>c.equal(d,l))||t.push(l);const n=[];for(const i of t){const u=mw(e,i);kn(u)>0&&n.push([i,u])}const r=a.map(n),s=new Map;for(const[i,u]of n)if(c.set(u))for(const l of je(u)){const d=x(l);s.has(d)||s.set(d,{key:l,values:[]}),s.get(d).values.push(i)}const o=a.map([...s.values()].map(({key:i,values:u})=>[i,a.set(u)]));return a.map([[a.kw(":parents"),e],[a.kw(":ancestors"),r],[a.kw(":descendants"),o]])}function na(e,t,n){if(c.equal(t,n))throw new f(`derive: cannot derive ${x(t)} from itself`,{child:t});const r=Tt(e,":ancestors"),s=et(r,n);if(Qn(s,t))throw new f(`derive: cycle — ${x(t)} is already an ancestor of ${x(n)}`,{child:t,parent:n});const o=or(a.set([n]),s),i=Tt(e,":descendants"),u=et(i,t),l=[t,...je(u)];let d=r;for(const $ of l){const R=et(d,$);d=fr(d,$,or(R,o))}const m=a.set(l),h=[n,...je(s)];let b=i;for(const $ of h){const R=et(b,$);b=fr(b,$,or(R,m))}const M=Tt(e,":parents"),v=et(M,t),y=fr(M,t,or(v,a.set([n])));return a.map([[a.kw(":parents"),y],[a.kw(":ancestors"),d],[a.kw(":descendants"),b]])}function ra(e,t,n){if(c.equal(t,n))return!0;const r=Tt(e,":ancestors");return Qn(et(r,t),n)}function sa(e,t,n){const r=Tt(e,":parents"),s=et(r,t),o=a.set(je(s).filter(u=>!c.equal(u,n))),i=fr(r,t,o);return pw(i)}function dn(e){const t=e.allNamespaces().find(n=>n.name==="clojure.core");return t?t.vars.get("*hierarchy*")??null:null}function fn(e){const t=e.dynamic&&e.bindingStack&&e.bindingStack.length>0?e.bindingStack[e.bindingStack.length-1]:e.value;return c.map(t)?t:null}const wt={"no-doc":!0},hw={"hierarchy-derive*":a.nativeFn("hierarchy-derive*",function(t,n,r){if(!c.map(t))throw new f(`hierarchy-derive*: expected a hierarchy map, got ${t.kind}`,{h:t});return na(t,n,r)}).withMeta([...g({doc:"Pure derive: returns a new hierarchy with child deriving from parent.",arglists:[["h","child","parent"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-underive*":a.nativeFn("hierarchy-underive*",function(t,n,r){if(!c.map(t))throw new f(`hierarchy-underive*: expected a hierarchy map, got ${t.kind}`,{h:t});return sa(t,n,r)}).withMeta([...g({doc:"Pure underive: returns a new hierarchy with the child→parent edge removed.",arglists:[["h","child","parent"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-isa?*":a.nativeFn("hierarchy-isa?*",function(t,n,r){if(!c.map(t))throw new f(`hierarchy-isa?*: expected a hierarchy map, got ${t.kind}`,{h:t});return a.boolean(ra(t,n,r))}).withMeta([...g({doc:"Pure isa? check: returns true if child isa? parent according to the given hierarchy.",arglists:[["h","child","parent"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-derive-global!":a.nativeFnCtx("hierarchy-derive-global!",function(t,n,r,s){const o=dn(t);if(!o)throw new f("hierarchy-derive-global!: *hierarchy* not found in clojure.core",{child:r,parent:s});const i=fn(o);if(!i)throw new f("hierarchy-derive-global!: *hierarchy* root value is not a map",{child:r,parent:s});const u=na(i,r,s);return o.value=u,u}).withMeta([...g({doc:"Derives child from parent in the global *hierarchy* (session-safe).",arglists:[["child","parent"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-underive-global!":a.nativeFnCtx("hierarchy-underive-global!",function(t,n,r,s){const o=dn(t);if(!o)throw new f("hierarchy-underive-global!: *hierarchy* not found in clojure.core",{child:r,parent:s});const i=fn(o);if(!i)throw new f("hierarchy-underive-global!: *hierarchy* root value is not a map",{child:r,parent:s});const u=sa(i,r,s);return o.value=u,u}).withMeta([...g({doc:"Underives child from parent in the global *hierarchy* (session-safe).",arglists:[["child","parent"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-isa?-global":a.nativeFnCtx("hierarchy-isa?-global",function(t,n,r,s){const o=dn(t);if(!o)return a.boolean(c.equal(r,s));const i=fn(o);return i?a.boolean(ra(i,r,s)):a.boolean(c.equal(r,s))}).withMeta([...g({doc:"Returns true if child isa? parent in the global *hierarchy* (session-safe).",arglists:[["child","parent"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-parents-global":a.nativeFnCtx("hierarchy-parents-global",function(t,n,r){const s=dn(t);if(!s)return a.nil();const o=fn(s);if(!o)return a.nil();const i=et(Tt(o,":parents"),r);return kn(i)>0?i:a.nil()}).withMeta([...g({doc:"Returns the immediate parents of tag in the global *hierarchy* (session-safe), or nil.",arglists:[["tag"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-ancestors-global":a.nativeFnCtx("hierarchy-ancestors-global",function(t,n,r){const s=dn(t);if(!s)return a.nil();const o=fn(s);if(!o)return a.nil();const i=et(Tt(o,":ancestors"),r);return kn(i)>0?i:a.nil()}).withMeta([...g({doc:"Returns all ancestors of tag in the global *hierarchy* (session-safe), or nil.",arglists:[["tag"]],docGroup:w.hierarchy,extra:wt})]),"hierarchy-descendants-global":a.nativeFnCtx("hierarchy-descendants-global",function(t,n,r){const s=dn(t);if(!s)return a.nil();const o=fn(s);if(!o)return a.nil();const i=et(Tt(o,":descendants"),r);return kn(i)>0?i:a.nil()}).withMeta([...g({doc:"Returns all descendants of tag in the global *hierarchy* (session-safe), or nil.",arglists:[["tag"]],docGroup:w.hierarchy,extra:wt})])};function gw(e){if(!c.string(e))throw new f(`#inst requires a string, got ${e.kind}`,{form:e});const t=new Date(e.value);if(isNaN(t.getTime()))throw new f(`#inst: invalid date string "${e.value}"`,{form:e});return a.jsValue(t)}function vw(e){if(!c.string(e))throw new f(`#uuid requires a string, got ${e.kind}`,{form:e});return e}const yw=new Map([["inst",gw],["uuid",vw]]);function bw(e,t,n){const r=new Map(yw),s=qt("*data-readers*",t);if(s){const i=Ie(s);c.map(i)&&oa(i,r,n,t)}let o;if(e&&c.map(e)){const i=e.entries.find(([l])=>c.keyword(l)&&l.name===":readers");if(i){const l=i[1];c.map(l)&&oa(l,r,n,t)}const u=e.entries.find(([l])=>c.keyword(l)&&l.name===":default");if(u){const l=u[1];if(c.function(l)||c.nativeFunction(l)){const d=l;o=(m,h)=>n.applyCallable(d,[a.string(m),h],t)}}}return{readers:r,defaultFn:o}}function oa(e,t,n,r){for(const[s,o]of e.entries)if((c.symbol(s)||c.keyword(s))&&(c.function(o)||c.nativeFunction(o)||c.multiMethod(o))){const i=c.symbol(s)?s.name:s.name.slice(1),u=o;t.set(i,l=>n.applyCallable(u,[l],r))}}const ww={"edn-read-string*":a.nativeFnCtx("edn-read-string*",(e,t,...n)=>{if(n.length===0||n.length>2)throw new f(`edn-read-string* expects 1 or 2 arguments, got ${n.length}`,{});let r=null,s;if(n.length===1?s=n[0]:(r=n[0],s=n[1]),!c.string(s))throw new f(`edn-read-string*: expected string, got ${x(s)}`,{sourceArg:s});const{readers:o,defaultFn:i}=bw(r,t,e);let u;try{const l=Un(s.value);u=sb(l,{dataReaders:o,defaultDataReader:i},s.value)}catch(l){throw ei(l)}if(u.length===0)throw new f("edn-read-string*: empty input",{});return u[0]}).withMeta([...g({doc:"Reads one EDN value from string s and returns it.",arglists:[["s"]],docGroup:w.edn,extra:{"no-doc":!0}})]),"edn-pr-str*":a.nativeFn("edn-pr-str*",(...e)=>{if(e.length!==1)throw new f(`edn-pr-str* expects 1 argument, got ${e.length}`,{});return a.string(x(e[0]))}).withMeta([...g({doc:"Returns a string representation of val in EDN format.",arglists:[["val"]],docGroup:w.edn,extra:{"no-doc":!0}})])},kw={"*data-readers*":a.map([])};function Me(e,t){if(e===void 0||!c.number(e))throw new f(`${t} expects a number${e!==void 0?`, got ${x(e)}`:""}`,{val:e});return e.value}function En(e,t,n){return[Me(e,n),Me(t,n)]}function xw(e){const t=Math.floor(e);return e-t===.5?t%2===0?t:t+1:Math.round(e)}const we={"no-doc":!0},$w={"floor*":a.nativeFn("math-floor*",function(t){return a.number(Math.floor(Me(t,"floor")))}).withMeta([...g({doc:"Returns the largest integer ≤ x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"ceil*":a.nativeFn("math-ceil*",function(t){return a.number(Math.ceil(Me(t,"ceil")))}).withMeta([...g({doc:"Returns the smallest integer ≥ x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"round*":a.nativeFn("math-round*",function(t){return a.number(Math.round(Me(t,"round")))}).withMeta([...g({doc:"Returns the closest integer to x, with ties rounding up.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"rint*":a.nativeFn("math-rint*",function(t){return a.number(xw(Me(t,"rint")))}).withMeta([...g({doc:"Returns the integer closest to x, with ties rounding to the nearest even (IEEE 754 round-half-to-even).",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"pow*":a.nativeFn("math-pow*",function(t,n){const[r,s]=En(t,n,"pow");return a.number(Math.pow(r,s))}).withMeta([...g({doc:"Returns x raised to the power of y.",arglists:[["x","y"]],docGroup:w.arithmetic,extra:we})]),"exp*":a.nativeFn("math-exp*",function(t){return a.number(Math.exp(Me(t,"exp")))}).withMeta([...g({doc:"Returns Euler's number e raised to the power of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"log*":a.nativeFn("math-log*",function(t){return a.number(Math.log(Me(t,"log")))}).withMeta([...g({doc:"Returns the natural logarithm (base e) of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"log10*":a.nativeFn("math-log10*",function(t){return a.number(Math.log10(Me(t,"log10")))}).withMeta([...g({doc:"Returns the base-10 logarithm of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"cbrt*":a.nativeFn("math-cbrt*",function(t){return a.number(Math.cbrt(Me(t,"cbrt")))}).withMeta([...g({doc:"Returns the cube root of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"hypot*":a.nativeFn("math-hypot*",function(t,n){const[r,s]=En(t,n,"hypot");return a.number(Math.hypot(r,s))}).withMeta([...g({doc:"Returns sqrt(x² + y²), the length of the hypotenuse.",arglists:[["x","y"]],docGroup:w.arithmetic,extra:we})]),"sin*":a.nativeFn("math-sin*",function(t){return a.number(Math.sin(Me(t,"sin")))}).withMeta([...g({doc:"Returns the sine of x (in radians).",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"cos*":a.nativeFn("math-cos*",function(t){return a.number(Math.cos(Me(t,"cos")))}).withMeta([...g({doc:"Returns the cosine of x (in radians).",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"tan*":a.nativeFn("math-tan*",function(t){return a.number(Math.tan(Me(t,"tan")))}).withMeta([...g({doc:"Returns the tangent of x (in radians).",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"asin*":a.nativeFn("math-asin*",function(t){return a.number(Math.asin(Me(t,"asin")))}).withMeta([...g({doc:"Returns the arc sine of x, in radians.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"acos*":a.nativeFn("math-acos*",function(t){return a.number(Math.acos(Me(t,"acos")))}).withMeta([...g({doc:"Returns the arc cosine of x, in radians.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"atan*":a.nativeFn("math-atan*",function(t){return a.number(Math.atan(Me(t,"atan")))}).withMeta([...g({doc:"Returns the arc tangent of x, in radians.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"atan2*":a.nativeFn("math-atan2*",function(t,n){const[r,s]=En(t,n,"atan2");return a.number(Math.atan2(r,s))}).withMeta([...g({doc:"Returns the angle θ from the conversion of rectangular (x, y) to polar (r, θ). Args: y, x.",arglists:[["y","x"]],docGroup:w.arithmetic,extra:we})]),"sinh*":a.nativeFn("math-sinh*",function(t){return a.number(Math.sinh(Me(t,"sinh")))}).withMeta([...g({doc:"Returns the hyperbolic sine of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"cosh*":a.nativeFn("math-cosh*",function(t){return a.number(Math.cosh(Me(t,"cosh")))}).withMeta([...g({doc:"Returns the hyperbolic cosine of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"tanh*":a.nativeFn("math-tanh*",function(t){return a.number(Math.tanh(Me(t,"tanh")))}).withMeta([...g({doc:"Returns the hyperbolic tangent of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"signum*":a.nativeFn("math-signum*",function(t){const n=Me(t,"signum");return n===0||Number.isNaN(n)?a.number(n):a.number(n>0?1:-1)}).withMeta([...g({doc:"Returns -1.0, 0.0, or 1.0 indicating the sign of x.",arglists:[["x"]],docGroup:w.arithmetic,extra:we})]),"floor-div*":a.nativeFn("math-floor-div*",function(t,n){const[r,s]=En(t,n,"floor-div");if(s===0)throw new f("floor-div: division by zero",{x:t,y:n});return a.number(Math.floor(r/s))}).withMeta([...g({doc:"Returns the largest integer ≤ x/y (floor division).",arglists:[["x","y"]],docGroup:w.arithmetic,extra:we})]),"floor-mod*":a.nativeFn("math-floor-mod*",function(t,n){const[r,s]=En(t,n,"floor-mod");if(s===0)throw new f("floor-mod: division by zero",{x:t,y:n});return a.number((r%s+s)%s)}).withMeta([...g({doc:"Returns x - (floor-div x y) * y (floor modulo).",arglists:[["x","y"]],docGroup:w.arithmetic,extra:we})]),"to-radians*":a.nativeFn("math-to-radians*",function(t){return a.number(Me(t,"to-radians")*Math.PI/180)}).withMeta([...g({doc:"Converts an angle in degrees to radians.",arglists:[["deg"]],docGroup:w.arithmetic,extra:we})]),"to-degrees*":a.nativeFn("math-to-degrees*",function(t){return a.number(Me(t,"to-degrees")*180/Math.PI)}).withMeta([...g({doc:"Converts an angle in radians to degrees.",arglists:[["rad"]],docGroup:w.arithmetic,extra:we})])},Mw={then:a.nativeFnCtx("then",(e,t,n,r)=>{if(typeof r>"u")throw new f("invalid signature: expected (then value f)",{fn:r,args:[]});if(!c.callable(r))throw new f(`${x(r)} is not a callable value`,{fn:r,args:[]});if(!c.pending(n))return e.applyCallable(r,[n],t);const s=n.promise.then(o=>e.applyCallable(r,[o],t));return a.pending(s)}).withMeta([...g({doc:"Applies f to the resolved value of a pending, or to val directly if not pending.",arglists:[["val","f"]],docGroup:w.async})]),"catch*":a.nativeFnCtx("catch*",(e,t,n,r)=>{if(!c.callable(r))throw new f(`${x(r)} is not a callable value`,{fn:r,args:[]});if(!c.pending(n))return n;const s=n.promise.catch(o=>{const i=Xs(o,e);if(i===null)throw o;return e.applyCallable(r,[i],t)});return a.pending(s)}).withMeta([...g({doc:"Handles rejection of a pending value by calling f with the thrown value or an error map.",arglists:[["val","f"]],docGroup:w.async})]),"pending?":a.nativeFn("pending?",e=>a.boolean(c.pending(e))).withMeta([...g({doc:"Returns true if val is a pending (async) value.",arglists:[["val"]],docGroup:w.async})]),"promise-of":a.nativeFn("promise-of",e=>a.pending(Promise.resolve(e))).withMeta([...g({doc:"Wraps val in an immediately-resolving pending value. Useful for testing async composition.",arglists:[["val"]],docGroup:w.async})]),all:a.nativeFn("all",e=>{const n=(c.nil(e)?[]:be(e)).map(r=>c.pending(r)?r.promise:Promise.resolve(r));return a.pending(Promise.all(n).then(r=>a.vector(r)))}).withMeta([...g({doc:"Returns a pending that resolves with a vector of all results when every input resolves.",arglists:[["pendings"]],docGroup:w.async})]),"make-promise":a.nativeFnCtx("make-promise",(e,t,n)=>{if(!c.callable(n))throw new f(`make-promise expects a callable executor, got ${n.kind}`,{fn:n,args:[]});const r=new Promise((s,o)=>{const i=a.nativeFn("resolve",l=>(s(l??a.nil()),a.nil())),u=a.nativeFn("reject",l=>(o(new tt(l)),a.nil()));try{e.applyCallable(n,[i,u],t)}catch(l){o(l)}});return a.pending(r)}).withMeta([...g({doc:"Creates a pending value from an executor fn (fn [resolve reject] ...). Like JS new Promise(executor).",arglists:[["executor"]],docGroup:w.async})])},Sw={...yb,...bb,...kb,...xb,...wb,...$b,...qb,...Mb,...Sb,...Pb,...Ib,..._b,...ow,...iw,...lw,...uw,...fw,...hw,...aw,...Zb,...Mw},qw={...$w},Fw={...ww},Iw={...ew,...kw};function Cw(){return{id:"clojure/core",declareNs:[{name:"clojure.core",vars(e){const t=new Map;for(const[n,r]of Object.entries(Sw)){const s=r.meta;t.set(n,{value:r,...s?{meta:s}:{}})}for(const[n,r]of Object.entries(Iw))t.set(n,{value:r,dynamic:!0});return t}},{name:"clojure.math",vars(e){const t=new Map;for(const[n,r]of Object.entries(qw)){const s=r.meta;t.set(n,{value:r,...s?{meta:s}:{}})}return t}},{name:"clojure.edn",vars(e){const t=new Map;for(const[n,r]of Object.entries(Fw)){const s=r.meta;t.set(n,{value:r,...s?{meta:s}:{}})}return t}}]}}function mn(e,t){if(c.string(e))return e.value;if(c.keyword(e))return e.name.slice(1);if(c.number(e))return String(e.value);throw new f(`${t}: key must be a string, keyword, or number, got ${e.kind}`,{key:e})}function _t(e,t){if(c.jsValue(e)||c.string(e)||c.number(e)||c.boolean(e))return e.value;throw c.nil(e)?new f(`${t}: cannot access properties on nil`,{val:e}):new f(`${t}: expected a js-value or primitive, got ${e.kind}`,{val:e})}const Rw={"clj->js":a.nativeFnCtx("clj->js",(e,t,n)=>{if(c.jsValue(n))return n;const r={applyFunction:(s,o)=>e.applyCallable(s,o,t)};return a.jsValue(Zt(n,r))}).withMeta([...g({doc:"Converts a Clojure value to a JavaScript value. Should be used sparingly at the boundaries of the program.",arglists:[["val"]],docGroup:w.interop})]),"js->clj":a.nativeFn("js->clj",(e,t)=>{if(c.nil(e))return e;if(!c.jsValue(e))throw new f(`js->clj expects a js-value, got ${e.kind}`,{val:e});const n=(()=>{if(!t||!c.map(t))return!1;for(const[r,s]of t.entries)if(c.keyword(r)&&r.name===":keywordize-keys")return!c.boolean(s)||s.value!==!1;return!1})();return $n(e.value,{keywordizeKeys:n})}).withMeta([...g({doc:"Converts a JavaScript value to a Clojure value. Should be used sparingly at the boundaries of the program. Unsupported types are boxed as js-value.",arglists:[["val"]],docGroup:w.interop})])},jw={get:a.nativeFn("js/get",(e,t,...n)=>{const r=_t(e,"js/get"),s=mn(t,"js/get"),o=r[s];return o===void 0&&n.length>0?n[0]:Ee(o)}),"set!":a.nativeFnCtx("js/set!",(e,t,n,r,s)=>{const o=_t(n,"js/set!"),i=mn(r,"js/set!");return o[i]=Ke(s,e,t),s}),call:a.nativeFnCtx("js/call",(e,t,n,...r)=>{const s=c.jsValue(n)?n.value:void 0;if(typeof s!="function")throw new f(`js/call: expected a js-value wrapping a function, got ${n.kind}`,{fn:n});const o=r.map(i=>Ke(i,e,t));return Ee(s(...o))}),typeof:a.nativeFn("js/typeof",e=>{if(c.nil(e))return a.string("object");if(c.number(e))return a.string("number");if(c.string(e))return a.string("string");if(c.boolean(e))return a.string("boolean");if(c.jsValue(e))return a.string(typeof e.value);throw new f(`js/typeof: cannot determine JS type of Clojure ${e.kind}`,{x:e})}),"instanceof?":a.nativeFn("js/instanceof?",(e,t)=>{if(!c.jsValue(e))throw new f(`js/instanceof?: expected js-value, got ${e.kind}`,{obj:e});if(!c.jsValue(t))throw new f(`js/instanceof?: expected js-value constructor, got ${t.kind}`,{cls:t});return a.boolean(e.value instanceof t.value)}),"array?":a.nativeFn("js/array?",e=>c.jsValue(e)?a.boolean(Array.isArray(e.value)):a.boolean(!1)),"null?":a.nativeFn("js/null?",e=>a.boolean(c.nil(e))),"undefined?":a.nativeFn("js/undefined?",e=>a.boolean(c.jsValue(e)&&e.value===void 0)),"some?":a.nativeFn("js/some?",e=>c.nil(e)||c.jsValue(e)&&e.value===void 0?a.boolean(!1):a.boolean(!0)),"get-in":a.nativeFn("js/get-in",(e,t,...n)=>{if(!c.vector(t))throw new f(`js/get-in: path must be a vector, got ${t.kind}`,{path:t});if(c.nil(e))throw new f("js/get-in: cannot access properties on nil",{obj:e});const r=n.length>0?n[0]:a.jsValue(void 0);let s=e;for(const o of t.value){if(c.nil(s)||c.jsValue(s)&&s.value===void 0)return r;const i=_t(s,"js/get-in"),u=mn(o,"js/get-in");s=Ee(i[u])}return c.jsValue(s)&&s.value===void 0&&n.length>0?r:s}),prop:a.nativeFn("js/prop",(e,...t)=>{const n=t.length>0?t[0]:a.nil();return a.nativeFn("js/prop-accessor",r=>{const s=_t(r,"js/prop"),o=mn(e,"js/prop"),i=s[o];return i===void 0?n:Ee(i)})}),method:a.nativeFn("js/method",(e,...t)=>a.nativeFnCtx("js/method-caller",(n,r,s,...o)=>{const i=_t(s,"js/method"),u=mn(e,"js/method"),l=i[u];if(typeof l!="function")throw new f(`js/method: property '${u}' is not callable`,{jsKey:u});const d=[...t,...o].map(m=>Ke(m,n,r));return Ee(l.apply(i,d))})),merge:a.nativeFnCtx("js/merge",(e,t,...n)=>{const r=Object.assign({},...n.map(s=>Ke(s,e,t)));return a.jsValue(r)}),seq:a.nativeFn("js/seq",e=>{if(!c.jsValue(e)||!Array.isArray(e.value))throw new f(`js/seq: expected a js-value wrapping an array, got ${e.kind}`,{arr:e});return a.vector(e.value.map(Ee))}),array:a.nativeFnCtx("js/array",(e,t,...n)=>a.jsValue(n.map(r=>Ke(r,e,t)))),obj:a.nativeFnCtx("js/obj",(e,t,...n)=>{if(n.length%2!==0)throw new f("js/obj: requires even number of arguments",{count:n.length});const r={};for(let s=0;s<n.length;s+=2){const o=mn(n[s],"js/obj");r[o]=Ke(n[s+1],e,t)}return a.jsValue(r)}),keys:a.nativeFn("js/keys",e=>{const t=_t(e,"js/keys");return a.vector(Object.keys(t).map(a.string))}),values:a.nativeFn("js/values",e=>{const t=_t(e,"js/values");return a.vector(Object.values(t).map(Ee))}),entries:a.nativeFn("js/entries",e=>{const t=_t(e,"js/entries");return a.vector(Object.entries(t).map(([n,r])=>a.vector([a.string(n),Ee(r)])))})};function Aw(){return{id:"cljam/js-namespace",declareNs:[{name:"clojure.core",vars(e){const t=new Map;for(const[n,r]of Object.entries(Rw))t.set(n,{value:r});return t}},{name:"js",vars(e){const t=new Map;for(const[n,r]of Object.entries(jw))t.set(n,{value:r});return t}}]}}const _w={"bytecode-info*-impl":a.nativeFnCtx("cljam.vm/bytecode-info*-impl",function(t,n,r){const s=sc(t,n,r);return s===null?a.nil():oc(s)}).withMeta([...g({doc:"Implementation detail for cljam.vm/bytecode-info*. Returns structured VM bytecode information for a quoted target form.",arglists:[["form"]],docGroup:w.runtime})]),"namespace-census-impl*":a.nativeFnCtx("cljam.vm/namespace-census-impl*",function(t,n,r,s,o){if(!c.symbol(r))return a.nil();const i=c.boolean(s)&&s.value,u=[];if(c.vector(o))for(const l of o.value)c.number(l)&&u.push(l.value);return Yb(t,r,i,u)}).withMeta([...g({doc:"Implementation detail for cljam.vm/namespace-census. Computes full namespace census in one JS pass.",arglists:[["ns-sym","include-private?","ngram-sizes"]],docGroup:w.runtime})]),"bytecode-census-item*-impl":a.nativeFn("cljam.vm/bytecode-census-item*-impl",function(t,n){const r=[];if(c.vector(n))for(const s of n.value)c.number(s)&&r.push(s.value);else if(c.list(n))for(const s of n.value)c.number(s)&&r.push(s.value);return Jb(t,r)}).withMeta([...g({doc:"Implementation detail for cljam.vm census helpers. Returns all census data for a single var/value in one JS pass.",arglists:[["value","ngram-sizes"]],docGroup:w.runtime})]),"value-summary*-impl":a.nativeFn("cljam.vm/value-summary*-impl",function(t){return Gb(Db(t))}).withMeta([...g({doc:"Implementation detail for cljam.vm census helpers. Returns bytecode summary information for an already-resolved value.",arglists:[["value"]],docGroup:w.runtime})])};function Pw(){return{id:"cljam/vm",declareNs:[{name:"cljam.vm",vars(e){const t=new Map;for(const[n,r]of Object.entries(_w))t.set(n,{value:r});return t}}]}}function Nw(e,t,n,r,s){const o=new Set((r==null?void 0:r.sourceRoots)??[]),i=new Map,u=new Map;let l="user";const d=new Map;for(const S of[])d.set(S,"executed");const m=[];function h(S){var V;const _=ka[S];if(_)return{source:_(),nsHint:S};const O=(V=r==null?void 0:r.registeredSources)==null?void 0:V.get(S);if(O!==void 0)return{source:O,nsHint:S};if(!(!(r!=null&&r.readFile)||o.size===0))for(const W of o){const B=`${W.replace(/\/$/,"")}/${S.replace(/\./g,"/")}.clj`;let ne;try{ne=r.readFile(B)}catch{continue}if(ne)return{source:ne,nsHint:void 0}}}function b(S,_){if(_.has(S.nsName))return!1;if(_.add(S.nsName),S.hostRequires.length>0)return!0;for(const O of S.cljRequires){if(d.get(O.nsName)==="executed")continue;const V=h(O.nsName);if(!V)continue;let W;try{W=Wr(V.source,V.nsHint,void 0)}catch{continue}if(b(W,_))return!0}return!1}function M(S,_){if(d.get(S)==="executed")return!0;d.get(S)==="failed"&&d.delete(S);const O=h(S);return O?(P.loadFile(O.source,O.nsHint,void 0,_),!0):!1}async function v(S,_){if(d.get(S)==="executed")return!0;d.get(S)==="failed"&&d.delete(S);const O=h(S);return O?(await $(O.source,O.nsHint,void 0,_),!0):!1}async function y(S,_,O){var Se;if(!c.vector(S)||!c.string(S.value[0]))return;const V=S.value[0].value;if(!O.importModule)throw new f(`importModule is not configured; cannot require "${V}". Pass importModule to createSession().`,{specifier:V});if(O.allowedHostModules!==void 0&&!E(V,O.allowedHostModules)){const oe=O.allowedHostModules==="all"?[]:O.allowedHostModules,ve=new f(`Access denied: host module '${V}' is not in the allowed host modules for this session.
Allowed host modules: ${JSON.stringify(oe)}
To allow all host modules, use: allowedHostModules: 'all'`,{specifier:V,allowedHostModules:O.allowedHostModules});throw ve.code="namespace/access-denied",ve}const W=S.value;let B=null;for(let oe=1;oe<W.length;oe++)if(c.keyword(W[oe])&&W[oe].name===":as"){oe++;const ve=W[oe];if(!ve||!c.symbol(ve))throw new f(":as expects a symbol alias",{spec:S});B=ve.name;break}if(B===null)throw new f(`String require spec must have an :as alias: ["${V}" :as Alias]`,{spec:S});const ne=await O.importModule(V),$e=(Se=_.ns)==null?void 0:Se.vars.get(B);me(B,a.jsValue(ne),_),(_.ns&&$e!==_.ns.vars.get(B)||_.ns&&$e!==void 0)&&P.touchNamespace(_.ns)}async function $(S,_,O,V){var Le;const W=Wr(S,_,O),B=W.nsName;if(m.includes(B)){const re=[...m,B],qe=new f(`Circular namespace dependency: ${re.join(" -> ")}`,{cyclePath:re});throw qe.code="namespace/circular-dependency",qe.data={cyclePath:re},qe}const ne=P.ensureNamespace(B),$e=V.currentSource,Se=V.currentFile,oe=V.currentLineOffset,ve=V.currentColOffset;m.push(B),V.currentSource=S,V.currentFile=O,V.currentLineOffset=0,V.currentColOffset=0;try{for(const re of W.cljRequires)await v(re.nsName,V);for(const re of W.hostRequires)await y(re.spec,ne,V);for(const re of W.cljRequires)ur(re.spec,ne,e,V.allowedPackages,R)&&ne.ns&&P.touchNamespace(ne.ns);for(const re of W.readerAliases)ne.ns&&ne.ns.readerAliases.get(re.alias)!==re.nsName&&(ne.ns.readerAliases.set(re.alias,re.nsName),P.touchNamespace(ne.ns));W.doc&&ne.ns&&(ne.ns.doc=W.doc);for(const re of W.bodyForms){const qe=(Le=V.allocateEvalIdentity)==null?void 0:Le.call(V,B);V.currentEvalIdentity=qe;try{V.evaluate(re,ne)}finally{V.currentEvalIdentity=void 0}}d.set(B,"executed")}catch(re){throw d.set(B,"failed"),re}finally{m.pop(),V.currentSource=$e,V.currentFile=Se,V.currentLineOffset=oe,V.currentColOffset=ve}return B}function R(S){var _;return((_=r==null?void 0:r.registeredSources)==null?void 0:_.has(S))??!1}function E(S,_){return _==="all"?!0:_.some(O=>S===O||S.startsWith(O))}fb(e,t,()=>l,M),mb(e,t);function U(S){S.id===void 0&&(S.id=n.nextNamespaceId++),S.version===void 0&&(S.version=0)}for(const S of e.values())S.ns&&U(S.ns);function le(S){const _=bs(e,t,S);return _.ns&&U(_.ns),_}const P={get registry(){return e},get identity(){return n},allocateEvalIdentity(S){return{id:n.nextEvalId++,nsName:S}},allocateFunctionIdentity(S){const _=n.nextFunctionId++,O=S.name!==void 0?`${S.nsName}/${S.name}--${_}`:S.evalIdentity!==void 0?`${S.nsName}/eval${S.evalIdentity.id}/fn--${_}`:`${S.nsName}/fn--${_}`;return{id:_,...S.evalIdentity!==void 0?{evalId:S.evalIdentity.id}:{},displayName:O}},allocateChunkIdentity(S){return S.id===void 0&&(S.id=n.nextChunkId++),S.id},getCachedTopLevelVmChunk(S){return i.get(S)},setCachedTopLevelVmChunk(S,_){i.set(S,_)},touchNamespace(S){S.version+=1},ensureNamespace(S){return le(S)},getNamespaceEnv(S){return e.get(S)??null},getNs(S){var _;return((_=e.get(S))==null?void 0:_.ns)??null},syncNsVar(S){var O,V;l=S;const _=(O=t.ns)==null?void 0:O.vars.get("*ns*");if(_){const W=(V=e.get(S))==null?void 0:V.ns;W&&(_.value=W)}},addSourceRoot(S){o.add(S)},processRequireSpec(S,_,O){ws(S,_,e,W=>M(W,O),O.allowedPackages,R)&&_.ns&&P.touchNamespace(_.ns)},processNsRequires(S,_,O){const V=Ho(S);for(const W of V)for(const B of W){if(c.vector(B)&&B.value.length>0&&c.string(B.value[0])){const $e=B.value[0].value;throw new f(`String module require ["${$e}" :as ...] is async — use evaluateAsync() instead of evaluate()`,{specifier:$e})}ws(B,_,e,$e=>M($e,O),O.allowedPackages,R)&&_.ns&&P.touchNamespace(_.ns)}},async processNsRequiresAsync(S,_,O){const V=Ho(S);for(const W of V)for(const B of W)c.vector(B)&&B.value.length>0&&c.string(B.value[0])?await y(B,_,O):(c.vector(B)&&B.value.length>0&&c.symbol(B.value[0])&&(B.value.some(Se=>c.keyword(Se)&&Se.name===":as-alias")||await v(B.value[0].name,O)),ur(B,_,e,O.allowedPackages,R)&&_.ns&&P.touchNamespace(_.ns))},loadFile(S,_,O,V){var Le;const W=Wr(S,_,O),B=W.nsName;if(b(W,new Set)){const re=new f("Namespace graph requires async loading; use loadFileAsync()",{});throw re.code="namespace/requires-async",re}if(m.includes(B)){const re=[...m,B],qe=new f(`Circular namespace dependency: ${re.join(" -> ")}`,{cyclePath:re});throw qe.code="namespace/circular-dependency",qe.data={cyclePath:re},qe}const ne=this.ensureNamespace(B),$e=V.currentSource,Se=V.currentFile,oe=V.currentLineOffset,ve=V.currentColOffset;m.push(B),V.currentSource=S,V.currentFile=O,V.currentLineOffset=0,V.currentColOffset=0;try{for(const re of W.cljRequires)M(re.nsName,V);for(const re of W.cljRequires)ur(re.spec,ne,e,V.allowedPackages,R)&&ne.ns&&P.touchNamespace(ne.ns);for(const re of W.readerAliases)ne.ns&&ne.ns.readerAliases.get(re.alias)!==re.nsName&&(ne.ns.readerAliases.set(re.alias,re.nsName),P.touchNamespace(ne.ns));W.doc&&ne.ns&&(ne.ns.doc=W.doc);for(const re of W.bodyForms){const qe=(Le=V.allocateEvalIdentity)==null?void 0:Le.call(V,B);V.currentEvalIdentity=qe;try{V.evaluate(re,ne)}finally{V.currentEvalIdentity=void 0}}d.set(B,"executed")}catch(re){throw d.set(B,"failed"),re}finally{m.pop(),V.currentSource=$e,V.currentFile=Se,V.currentLineOffset=oe,V.currentColOffset=ve}return B},loadFileAsync(S,_,O,V){return $(S,_,O,V)},loadNamespaceAsync(S,_){return v(S,_)},installModules(S){const _=vb(S,new Set(e.keys()));for(const O of _)for(const V of O.declareNs){const W=le(V.name),B={getVar($e,Se){var Le;const oe=e.get($e);return((Le=oe==null?void 0:oe.ns)==null?void 0:Le.vars.get(Se))??null},getNamespace($e){var Se;return((Se=e.get($e))==null?void 0:Se.ns)??null}},ne=V.vars(B);for(const[$e,Se]of ne){const oe=`${W.ns.name}/${$e}`,ve=u.get(oe);if(ve!==void 0)throw new Error(`var '${$e}' in '${W.ns.name}' already declared by module '${ve}'`);if(me($e,Se.value,W,Se.meta),Se.dynamic){const Le=W.ns.vars.get($e);Le.dynamic=!0}u.set(oe,O.id)}}},snapshot(){return{registry:db(e),identity:{...n},sourceLoadedNs:[...d].filter(([,S])=>S==="executed").map(([S])=>S)}}};return P}function Lw(e){const t=new Map,n={nextEvalId:1,nextFunctionId:1,nextChunkId:1,nextNamespaceId:1},r=Ot();r.ns=gr("clojure.core"),t.set("clojure.core",r);const s=Ot(r);s.ns=gr("user"),t.set("user",s);const o=Nw(t,r,n,e);return o.installModules([Cw(),Aw(),Pw()]),o}function Xr(e){if(!c.map(e)||!e.entries.some(([r])=>c.keyword(r)&&r.name===":data"))return null;const n=e.entries.find(([r])=>c.keyword(r)&&r.name===":message");return n&&c.string(n[1])?n[1].value:null}function Ew(e,t,n){let r=t,s=(n==null?void 0:n.workDir)??(typeof process<"u"?process.cwd():"/");const o=dy();o.resolveNs=l=>e.getNs(l),o.allNamespaces=()=>{const l=[];for(const d of e.registry.values())d.ns&&l.push(d.ns);return l},o.io={stdout:(n==null?void 0:n.output)??(l=>console.log(l)),stderr:(n==null?void 0:n.stderr)??(l=>console.error(l))},o.importModule=n==null?void 0:n.importModule,o.allowedPackages=(n==null?void 0:n.allowedPackages)??"all",o.allowedHostModules=(n==null?void 0:n.allowedHostModules)??"all",o.vmExecutionMode=(n==null?void 0:n.vmExecutionMode)??lo,o.instrumentation=n==null?void 0:n.instrumentation,o.allocateEvalIdentity=l=>e.allocateEvalIdentity(l),o.allocateFunctionIdentity=l=>e.allocateFunctionIdentity({...l,evalIdentity:o.currentEvalIdentity}),o.allocateChunkIdentity=l=>e.allocateChunkIdentity(l),o.getCachedTopLevelVmChunk=l=>e.getCachedTopLevelVmChunk(l),o.setCachedTopLevelVmChunk=(l,d)=>e.setCachedTopLevelVmChunk(l,d),o.touchNamespace=l=>e.touchNamespace(l),o.setCurrentNs=l=>{e.ensureNamespace(l),r=l,e.syncNsVar(l)},o.currentDir=s,o.setCurrentDir=l=>{s=l,o.currentDir=l};const i={allowedPackages:(n==null?void 0:n.allowedPackages)??"all",allowedHostModules:(n==null?void 0:n.allowedHostModules)??"all",hostBindings:Object.keys((n==null?void 0:n.hostBindings)??{}),allowDynamicImport:(n==null?void 0:n.importModule)!==void 0,libraries:((n==null?void 0:n.libraries)??[]).map(l=>l.id)};return{get runtime(){return e},get capabilities(){return i},get registry(){return e.registry},get currentNs(){return r},get currentDir(){return s},get libraries(){return(n==null?void 0:n.libraries)??[]},setNs(l){e.ensureNamespace(l),r=l,e.syncNsVar(l)},setCurrentDir(l){s=l,o.currentDir=l},getNs(l){return e.getNs(l)},loadFile(l,d,m){return e.loadFile(l,d,m,o)},async loadFileAsync(l,d,m){const h=await e.loadFileAsync(l,d,m,o);return r=h,e.syncNsVar(h),h},addSourceRoot(l){e.addSourceRoot(l)},evaluate(l,d){var m,h,b,M,v;o.currentSource=l,o.currentFile=d==null?void 0:d.file,o.currentLineOffset=(d==null?void 0:d.lineOffset)??0,o.currentColOffset=(d==null?void 0:d.colOffset)??0;try{const y=Un(l),$=vs(y);$&&(e.ensureNamespace($),r=$,e.syncNsVar($));const R=e.getNamespaceEnv(r),E=ys(y);(m=R.ns)==null||m.aliases.forEach((_,O)=>{E.set(O,_.name)}),(h=R.ns)==null||h.readerAliases.forEach((_,O)=>{E.set(O,_)});const U=br(y,r,E,l,o.currentLineOffset,o.currentColOffset),le=U.filter(Tn),P=U.length>0&&Tn(U[0]);if(le.length>1||le.length===1&&!P){const _=new f(`ns form must be the first form in an evaluation. To switch namespaces use (in-ns 'name); to load a .clj file use (load "path").`,{});throw _.code="namespace/ns-in-repl",_}e.processNsRequires(U,R,o);let S=a.nil();for(const _ of U){const O=(b=o.allocateEvalIdentity)==null?void 0:b.call(o,r);o.currentEvalIdentity=O;try{S=o.evaluate(_,R)}finally{o.currentEvalIdentity=void 0}}return S}catch(y){if(y instanceof tt){const $=Xr(y.value);throw new f($??`Unhandled throw: ${x(y.value)}`,{thrownValue:y.value})}if(y instanceof at)throw new f("recur called outside of loop or fn",{args:y.args});if(y instanceof f||y instanceof G){const $=y.pos!=null&&(y.pos.source!=null||y.pos.start<l.length)?y.pos:y instanceof f?(v=(M=y.frames)==null?void 0:M[0])==null?void 0:v.pos:void 0;$&&(y.message+=Io(l,$,{lineOffset:o.currentLineOffset,colOffset:o.currentColOffset})),y instanceof f&&y.frames&&y.frames.length>0&&(y.message+=Co(y.frames,l,{lineOffset:o.currentLineOffset,colOffset:o.currentColOffset}))}throw y}finally{o.currentSource=void 0,o.currentFile=void 0,o.frameStack=[]}},async evaluateAsync(l,d){var m,h,b,M,v;o.currentSource=l,o.currentFile=d==null?void 0:d.file,o.currentLineOffset=(d==null?void 0:d.lineOffset)??0,o.currentColOffset=(d==null?void 0:d.colOffset)??0;try{const y=Un(l),$=vs(y);$&&(e.ensureNamespace($),r=$,e.syncNsVar($));const R=e.getNamespaceEnv(r),E=ys(y);(m=R.ns)==null||m.aliases.forEach((_,O)=>{E.set(O,_.name)}),(h=R.ns)==null||h.readerAliases.forEach((_,O)=>{E.set(O,_)});const U=br(y,r,E,l,o.currentLineOffset,o.currentColOffset),le=U.filter(Tn),P=U.length>0&&Tn(U[0]);if(le.length>1||le.length===1&&!P){const _=new f(`ns form must be the first form in an evaluation. To switch namespaces use (in-ns 'name); to load a .clj file use (load "path").`,{});throw _.code="namespace/ns-in-repl",_}await e.processNsRequiresAsync(U,R,o);let S=a.nil();for(const _ of U){const O=(b=o.allocateEvalIdentity)==null?void 0:b.call(o,r);o.currentEvalIdentity=O;try{S=o.evaluate(_,R)}finally{o.currentEvalIdentity=void 0}}if(!c.pending(S))return S;try{return await S.promise}catch(_){throw _ instanceof tt?new f(`Unhandled throw: ${x(_.value)}`,{thrownValue:_.value}):_}}catch(y){if(y instanceof tt){const $=Xr(y.value);throw new f($??`Unhandled throw: ${x(y.value)}`,{thrownValue:y.value})}if(y instanceof at)throw new f("recur called outside of loop or fn",{args:y.args});if(y instanceof f||y instanceof G){const $=y.pos!=null&&(y.pos.source!=null||y.pos.start<l.length)?y.pos:y instanceof f?(v=(M=y.frames)==null?void 0:M[0])==null?void 0:v.pos:void 0;$&&(y.message+=Io(l,$,{lineOffset:o.currentLineOffset,colOffset:o.currentColOffset})),y instanceof f&&y.frames&&y.frames.length>0&&(y.message+=Co(y.frames,l,{lineOffset:o.currentLineOffset,colOffset:o.currentColOffset}))}throw y}finally{o.currentSource=void 0,o.currentFile=void 0,o.frameStack=[]}},applyFunction(l,d){return o.applyCallable(l,d,Ot())},cljToJs(l){return Zt(l,{applyFunction:(d,m)=>o.applyCallable(d,m,Ot())})},evaluateForms(l){var d;try{const m=e.getNamespaceEnv(r);let h=a.nil();for(const b of l){const M=(d=o.allocateEvalIdentity)==null?void 0:d.call(o,r);o.currentEvalIdentity=M;try{h=o.evaluate(b,m)}finally{o.currentEvalIdentity=void 0}}return h}catch(m){if(m instanceof tt){const h=Xr(m.value);throw new f(h??`Unhandled throw: ${x(m.value)}`,{thrownValue:m.value})}throw m instanceof at?new f("recur called outside of loop or fn",{args:m.args}):m}},getCompletions(l,d){let m=e.registry.get(d??r)??null;const h=new Set;for(;m;){for(const M of m.bindings.keys())h.add(M);if(m.ns)for(const M of m.ns.vars.keys())h.add(M);m=m.outer}const b=[...h];return l?b.filter(M=>M.startsWith(l)).sort():b.sort()}}}function Tw(e){var d;const t=(e==null?void 0:e.modules)??[],n=(e==null?void 0:e.libraries)??[],r=new Map,s=new Map;for(const m of n)for(const[h,b]of Object.entries(m.sources??{})){const M=s.get(h);if(M!==void 0)throw new Error(`Library '${m.id}' tried to register namespace '${h}', already registered by '${M}'.`);r.set(h,b),s.set(h,m.id)}const o=Lw({sourceRoots:e==null?void 0:e.sourceRoots,readFile:e==null?void 0:e.readFile,registeredSources:r.size>0?r:void 0}),i=Ew(o,"user",e),u=ka["clojure.core"];if(!u)throw new Error("Missing built-in clojure.core source in registry");i.loadFile(u(),"clojure.core"),t.length>0&&i.runtime.installModules(t);const l=n.flatMap(m=>m.module?[m.module]:[]);if(l.length>0&&i.runtime.installModules(l),e!=null&&e.hostBindings){const m=o.getNamespaceEnv("js");if(m)for(const[h,b]of Object.entries(e.hostBindings)){if((d=m.ns)!=null&&d.vars.has(h))throw new Error(`createSession: hostBindings key '${h}' conflicts with built-in js/${h} — choose a different key`);me(h,Ee(b),m)}}for(const m of(e==null?void 0:e.entries)??[])i.loadFile(m);return i}({...typeof Buffer<"u"?{Buffer}:{}});function Vw(e){return Tw({output:e})}function gc(){const e={session:void 0,history:[],entries:[],outputs:[]};return e.session=Vw(t=>e.outputs.push(t)),e}async function Fs(e,t){const n=t.trim();if(!n)return[];e.history.push(n),e.outputs=[];const r=performance.now();try{const s=await e.session.evaluateAsync(n),o=performance.now(),i=[];i.push({kind:"source",text:n});for(const u of e.outputs)i.push({kind:"output",text:u});return i.push({kind:"result",output:x(s),durationMs:o-r}),e.entries.push(...i),i}catch(s){const o=performance.now(),i=Ow(n,s,o-r);return e.entries.push(i),[i]}}function Ow(e,t,n){const r=t instanceof f||t instanceof Error?t.message:String(t);return{kind:"error",source:e,message:r,durationMs:n}}const Dw=`(ns user
  (:require [clojure.string :as str]))

;; Welcome to the Cljam Web REPL!
;;
;;   ⌘+Enter  (Ctrl+Enter)  — evaluate the form under/before the cursor
;;   Shift+⌘+Enter          — evaluate the entire file
;;   "Run all" button       — same as Shift+⌘+Enter
;;
;; Forms inside (comment ...) blocks are safe to eval one by one.
;; Place your cursor inside any form and press ⌘+Enter.
;;
;; Select a topic from the dropdown above to load a deep-dive sample.


;; Primitives & Literals

(comment
  ;; Numbers
  42          ;; => 42
  3.14        ;; => 3.14
  -7          ;; => -7

  ;; Arithmetic — \`+\` \`-\` \`*\` \`/\` are plain functions
  (+ 1 2)     ;; => 3
  (* 6 7)     ;; => 42
  (/ 10 4)    ;; => 2.5
  (mod 17 5)  ;; => 2

  ;; Strings — always double-quoted
  "hello"               ;; => "hello"
  (str "hello" " " "world")  ;; => "hello world"
  (count "hello")       ;; => 5

  ;; Booleans
  true        ;; => true
  false       ;; => false
  (not true)  ;; => false

  ;; nil — the absence of a value
  nil         ;; => nil

  ;; Keywords — lightweight identifiers, evaluate to themselves
  :name       ;; => :name
  :user/role  ;; => :user/role  (namespaced keyword)
  (name :user/role)      ;; => "role"
  (namespace :user/role) ;; => "user"
)


;; Collections
;;
;; All are immutable — operations return new values, never mutate.

(comment
  ;; Vectors — ordered, indexed, literal syntax []
  [1 2 3]
  [:a :b :c]
  (conj [1 2 3] 4)      ;; => [1 2 3 4]
  (count [1 2 3])       ;; => 3
  (nth [10 20 30] 1)    ;; => 20

  ;; Lists — ordered, linked, literal syntax '()
  '(1 2 3)
  (first '(10 20 30))   ;; => 10
  (rest  '(10 20 30))   ;; => (20 30)
  (cons 0 '(1 2 3))     ;; => (0 1 2 3)

  ;; Maps — key/value pairs, literal syntax {}
  {:name "Alice" :age 30}
  (get {:name "Alice" :age 30} :name)  ;; => "Alice"
  (:age {:name "Alice" :age 30})       ;; => 30  (keywords are lookup fns)
  (assoc {:name "Alice"} :role :admin) ;; => {:name "Alice" :role :admin}
  (dissoc {:a 1 :b 2 :c 3} :b)        ;; => {:a 1 :c 3}

  ;; Nesting is natural
  (def user {:name "Bob"
             :scores [98 87 95]
             :address {:city "Austin" :zip "78701"}})

  (get-in user [:address :city])       ;; => "Austin"
  (update-in user [:scores] conj 100)  ;; adds 100 to :scores
)


;; Binding Values

(comment
  ;; \`def\` — bind a name at namespace scope
  (def pi 3.14159)
  (* 2 pi)           ;; => 6.28318...

  ;; \`let\` — local bindings, visible only inside the form
  (let [x 10
        y 20]
    (+ x y))         ;; => 30

  ;; Bindings can reference earlier ones in the same let
  (let [base  100
        bonus (* base 0.15)
        total (+ base bonus)]
    total)           ;; => 115.0

  ;; \`do\` — sequence multiple expressions, return last
  (do
    (println "side effect")
    42)              ;; prints "side effect", evaluates to 42
)


;; Functions
;;
;; Functions are first-class values. \`defn\` is the common shorthand.

(defn greet
  "Returns a greeting string."
  [name]
  (str "Hello, " name "!"))

(defn add
  "Adds two numbers."
  [a b]
  (+ a b))

(comment
  (greet "World")    ;; => "Hello, World!"
  (add 3 4)          ;; => 7

  ;; Anonymous functions with \`fn\`
  ((fn [x] (* x x)) 5)   ;; => 25

  ;; Shorthand #() — % is the first arg
  (#(* % %) 5)            ;; => 25
  (#(+ %1 %2) 3 4)        ;; => 7

  ;; Multi-arity — one \`defn\` handles different arg counts
  (defn hello
    ([]        (hello "World"))
    ([name]    (str "Hello, " name "!")))

  (hello)           ;; => "Hello, World!"
  (hello "Clojure") ;; => "Hello, Clojure!"

  ;; Variadic — \`&\` collects remaining args as a sequence
  (defn sum [& nums]
    (reduce + nums))
  
  (sum 1 2 3 4 5)   ;; => 15

  ;; Closures — functions capture their lexical environment
  (defn make-adder [n]
    (fn [x] (+ x n)))

  (def add10 (make-adder 10))
  (add10 5)         ;; => 15
  (add10 100)       ;; => 110
)


;; Control Flow
;;
;; Only \`false\` and \`nil\` are falsy. Everything else (including 0 and "") is truthy.

(comment
  ;; if
  (if true  "yes" "no")    ;; => "yes"
  (if false "yes" "no")    ;; => "no"
  (if nil   "yes" "no")    ;; => "no"
  (if 0     "yes" "no")    ;; => "yes"  (0 is truthy here!)

  ;; when — one-branch if, body wrapped in do
  (when true
    (println "runs")
    42)                      ;; => 42

  ;; cond — multiple branches
  (defn classify [n]
    (cond
      (neg? n)  :negative
      (zero? n) :zero
      (< n 10)  :small
      :else     :large))

  (classify -3)  ;; => :negative
  (classify 0)   ;; => :zero
  (classify 5)   ;; => :small
  (classify 99)  ;; => :large

  ;; and / or — short-circuit, return the deciding value
  (and 1 2 3)       ;; => 3  (last truthy)
  (and 1 false 3)   ;; => false
  (or false nil 42) ;; => 42  (first truthy)
)


;; Higher-Order Functions

(comment
  ;; map — apply a function to every element, return a new sequence
  (map inc [1 2 3 4 5])            ;; => (2 3 4 5 6)
  (map #(* % %) [1 2 3 4])         ;; => (1 4 9 16)
  (map str [:a :b :c])             ;; => ("a" "b" "c")

  ;; filter — keep elements where predicate returns true
  (filter even? [1 2 3 4 5 6])     ;; => (2 4 6)
  (filter pos?  [-3 -1 0 2 4])     ;; => (2 4)

  ;; reduce — fold a collection into a single value
  (reduce + [1 2 3 4 5])           ;; => 15
  (reduce + 100 [1 2 3])           ;; => 106  (100 is the initial value)
  (reduce conj [] '(1 2 3))        ;; => [1 2 3]  (list → vector)

  ;; apply — call a function with a collection as its argument list
  (apply + [1 2 3 4])              ;; => 10
  (apply str ["a" "b" "c"])        ;; => "abc"

  ;; comp — compose functions right-to-left
  (def shout (comp str/upper-case str/trim))
  (shout "  hello ")               ;; => "HELLO"

  ;; partial — partially apply a function
  (def double (partial * 2))
  (map double [1 2 3 4])           ;; => (2 4 6 8)
)


;; Threading Macros
;;
;; \`->\` inserts the value as the FIRST argument at each step.
;; \`->>\` inserts it as the LAST argument.

(comment
  (-> "  hello world  "
      str/trim
      str/upper-case
      (str/split #" "))
  ;; => ["HELLO" "WORLD"]

  (->> [1 2 3 4 5 6 7 8 9 10]
       (filter odd?)
       (map #(* % %))
       (reduce +))
  ;; => 165  (sum of squares of odd numbers 1–10)

  ;; Without threading (hard to read):
  (reduce + (map #(* % %) (filter odd? [1 2 3 4 5 6 7 8 9 10])))
)


;; Data Transformation

(def game
  {:name       "Colt Express"
   :categories ["Family" "Strategy"]
   :play-time  40
   :ratings    {:alice 5 :bob 4 :carol 5}})

(comment
  ;; assoc — add or replace a key
  (assoc game :play-time 45)
  (assoc game :age-from 10)

  ;; dissoc — remove keys
  (dissoc game :ratings)

  ;; update — transform a value with a function
  (update game :play-time + 5)             ;; play-time => 45
  (update game :categories conj "Co-op")   ;; add category

  ;; merge — combine maps (rightmost wins on conflict)
  (merge {:a 1 :b 2} {:b 99 :c 3})        ;; => {:a 1 :b 99 :c 3}

  ;; select-keys
  (select-keys game [:name :play-time])

  ;; assoc-in / update-in / get-in for nested paths
  (assoc-in  game [:ratings :dave] 3)
  (update-in game [:ratings :bob] inc)
  (get-in    game [:ratings :alice])       ;; => 5

  (-> game
      (assoc  :play-time 50)
      (update :categories conj "Card")
      (dissoc :ratings))
)


;; Strings

(comment
  (str "Hello" ", " "World" "!")        ;; => "Hello, World!"
  (str/join ", " ["one" "two" "three"]) ;; => "one, two, three"
  (str/join ["H" "e" "l" "l" "o"])      ;; => "Hello"

  (count "hello")                        ;; => 5
  (str/upper-case "hello")               ;; => "HELLO"
  (str/lower-case "WORLD")               ;; => "world"
  (str/trim "  hello  ")                 ;; => "hello"

  (str/includes?    "hello world" "world") ;; => true
  (str/starts-with? "hello" "hel")         ;; => true
  (str/ends-with?   "hello" "llo")         ;; => true

  (subs "hello world" 6)                 ;; => "world"
  (subs "hello world" 0 5)               ;; => "hello"
  (str/split "a,b,c" #",")              ;; => ["a" "b" "c"]

  (str/replace "hello world" "world" "Clojure") ;; => "hello Clojure"
  (str/replace "hello" #"[aeiou]" "*")          ;; => "h*ll*"
)


;; Atoms (Mutable State)
;;
;; \`swap!\` applies a function to the current value atomically.

(def counter (atom 0))
(def cart    (atom []))

(comment
  @counter                     ;; => 0

  (swap! counter inc)          ;; => 1
  (swap! counter inc)          ;; => 2
  (swap! counter + 10)         ;; => 12
  @counter                     ;; => 12

  (reset! counter 0)
  @counter                     ;; => 0

  (swap! cart conj {:item "apple" :qty 2})
  (swap! cart conj {:item "bread" :qty 1})
  @cart
)


;; Error Handling

(comment
  (try
    (/ 1 0)
    (catch :default e
      (str "caught: " (ex-message e))))

  ;; throw any value — catch with a predicate or :default
  (try
    (throw 42)
    (catch number? e
      (str "got a number: " e)))

  ;; ex-info — structured errors with a data map
  (try
    (throw (ex-info "Something went wrong"
                    {:code :not-found :id 99}))
    (catch :default e
      {:message (ex-message e)
       :data    (ex-data e)}))

  ;; finally always runs
  (try
    (+ 1 2)
    (finally
      (println "cleanup")))     ;; prints "cleanup", returns 3
)


;; Macros & Metaprogramming

(comment
  ;; defmacro — define a macro that transforms code before evaluation
  (defmacro unless [test & body]
    \`(when (not ~test)
       ~@body))

  (unless false
    (println "false is falsy")
    42)       ;; => 42

  ;; macroexpand — see what a macro produces
  (macroexpand '(when true (println "hi")))
  ;; => (if true (do (println "hi")) nil)

  (macroexpand-all '(-> x str/trim str/upper-case))
  ;; shows the fully expanded threading chain
)
`,Gw=`(ns user.collections)

;; Deep Dive: Collections
;;
;; Press ⌘+Enter on any form to evaluate it.


;; The Sequence Abstraction
;;
;; \`seq\` converts any collection (or string) into a sequence.
;; \`first\`, \`rest\`, \`next\`, \`last\`, \`cons\` all work on sequences.

(comment
  (seq [1 2 3])         ;; => (1 2 3)
  (seq {:a 1 :b 2})     ;; => ([:a 1] [:b 2])
  (seq "hello")         ;; => ("h" "e" "l" "l" "o")
  (seq [])              ;; => nil  (empty seq is nil!)
  (seq nil)             ;; => nil

  ;; first / rest / next
  (first [10 20 30])    ;; => 10
  (rest  [10 20 30])    ;; => (20 30)
  (next  [10 20 30])    ;; => (20 30)
  (next  [10])          ;; => nil   (next returns nil, rest returns ())
  (rest  [10])          ;; => ()
  (last  [10 20 30])    ;; => 30

  (second [10 20 30])   ;; => 20

  ;; cons — prepend an element to any sequence
  (cons 0 [1 2 3])      ;; => (0 1 2 3)
  (cons :x '(:y :z))    ;; => (:x :y :z)
)


;; Building Collections

(comment
  ;; conj — adds in the natural position for each type
  (conj [1 2 3] 4)          ;; => [1 2 3 4]     (vectors add to the END)
  (conj [1 2 3] 4 5 6)      ;; => [1 2 3 4 5 6]
  (conj '(1 2 3) 0)         ;; => (0 1 2 3)      (lists add to the FRONT)
  (conj {:a 1} [:b 2])      ;; => {:a 1 :b 2}

  ;; into — pour one collection into another
  (into [] '(1 2 3))        ;; => [1 2 3]
  (into '() [1 2 3])        ;; => (3 2 1)  (list adds to front)
  (into {} [[:a 1] [:b 2]]) ;; => {:a 1 :b 2}

  ;; constructors
  (vector 1 2 3)             ;; => [1 2 3]
  (list   1 2 3)             ;; => (1 2 3)
  (hash-map :a 1 :b 2)       ;; => {:a 1 :b 2}

  ;; range — lazy sequence of numbers
  (range 5)                  ;; => (0 1 2 3 4)
  (range 2 10)               ;; => (2 3 4 5 6 7 8 9)
  (range 0 20 3)             ;; => (0 3 6 9 12 15 18)

  (repeat 4 :x)              ;; => (:x :x :x :x)
  (concat [1 2] [3 4] [5])   ;; => (1 2 3 4 5)
  (zipmap [:a :b :c] [1 2 3]) ;; => {:a 1 :b 2 :c 3}
)


;; Inspecting Collections

(comment
  (count [1 2 3])       ;; => 3
  (count {:a 1 :b 2})   ;; => 2
  (count "hello")       ;; => 5

  ;; empty? — true when (seq coll) is nil
  (empty? [])           ;; => true
  (empty? [1])          ;; => false
  (empty? nil)          ;; => true

  ;; contains? — checks key existence (index for vectors)
  (contains? {:a 1 :b 2} :a)  ;; => true
  (contains? {:a 1 :b 2} :z)  ;; => false
  (contains? [10 20 30] 2)     ;; => true  (index 2 exists)

  (get {:a 1 :b 2} :a)          ;; => 1
  (get {:a 1 :b 2} :z)          ;; => nil
  (get {:a 1 :b 2} :z :missing) ;; => :missing  (default)
  (nth [10 20 30] 1)            ;; => 20
  (nth [10 20 30] 9 :oor)       ;; => :oor  (out-of-range default)

  (keys {:a 1 :b 2 :c 3})      ;; => (:a :b :c)
  (vals {:a 1 :b 2 :c 3})      ;; => (1 2 3)
)


;; Slicing & Windowing

(comment
  (take 3 [1 2 3 4 5 6])        ;; => (1 2 3)
  (drop 3 [1 2 3 4 5 6])        ;; => (4 5 6)

  (take-while even? [2 4 6 7 8 10]) ;; => (2 4 6)
  (drop-while even? [2 4 6 7 8 10]) ;; => (7 8 10)

  (take-last 2 [1 2 3 4 5])     ;; => (4 5)
  (drop-last 2 [1 2 3 4 5])     ;; => (1 2 3)

  (reverse [1 2 3 4 5])         ;; => (5 4 3 2 1)
)


;; Maps & Keywords as Functions (IFn)
;;
;; Maps and keywords are callable — they act as lookup functions.

(comment
  ;; Keyword as function — looks itself up in the map
  (:name {:name "Alice" :age 30})        ;; => "Alice"
  (:missing {:a 1} :default-value)       ;; => :default-value

  ;; Map as function — looks up the argument as a key
  ({:a 1 :b 2} :a)                       ;; => 1
  ({:a 1 :b 2} :z)                       ;; => nil
  ({:a 1 :b 2} :z 99)                    ;; => 99  (default)

  (def users
    [{:name "Alice" :role :admin}
     {:name "Bob"   :role :user}
     {:name "Carol" :role :admin}])

  (map :name users)                       ;; => ("Alice" "Bob" "Carol")
  (map :role users)                       ;; => (:admin :user :admin)

  (def admin? {:admin true :moderator true})
  (filter (comp admin? :role) users)      ;; => Alice and Carol

  (def catalog
    {:books  [{:title "SICP" :price 45}
              {:title "CTMCP" :price 38}]
     :videos [{:title "Structure" :price 0}]})

  (get-in catalog [:books 0 :title])      ;; => "SICP"
  (map :title (:books catalog))           ;; => ("SICP" "CTMCP")
)


;; Transforming Maps

(comment
  (assoc {:a 1} :b 2 :c 3)       ;; => {:a 1 :b 2 :c 3}
  (dissoc {:a 1 :b 2 :c 3} :b)   ;; => {:a 1 :c 3}

  (update {:count 0} :count inc)          ;; => {:count 1}
  (update {:scores [1 2]} :scores conj 3) ;; => {:scores [1 2 3]}

  ;; merge — rightmost wins on conflict
  (merge {:a 1 :b 2} {:b 99 :c 3})    ;; => {:a 1 :b 99 :c 3}
  (merge {:a 1} {:b 2} {:c 3})        ;; => {:a 1 :b 2 :c 3}

  (select-keys {:a 1 :b 2 :c 3 :d 4} [:a :c])  ;; => {:a 1 :c 3}

  ;; transform all values
  (into {}
        (map (fn [[k v]] [k (* v 2)])
             {:a 1 :b 2 :c 3}))   ;; => {:a 2 :b 4 :c 6}
)


;; Practical Patterns

(comment
  ;; Build a lookup map from a collection
  (def people
    [{:id 1 :name "Alice"}
     {:id 2 :name "Bob"}
     {:id 3 :name "Carol"}])

  (def by-id
    (into {} (map (fn [p] [(:id p) p]) people)))

  (get by-id 2)   ;; => {:id 2 :name "Bob"}

  ;; Or with zipmap
  (zipmap (map :id people) people)

  ;; Grouping
  (def items [:a :b :a :c :b :a])
  (frequencies items)             ;; => {:a 3 :b 2 :c 1}
  (group-by identity items)       ;; => {:a [:a :a :a] :b [:b :b] :c [:c]}

  (flatten [1 [2 [3 4]] [5]])     ;; => (1 2 3 4 5)
  (distinct [1 2 3 1 2 4 5 3])   ;; => (1 2 3 4 5)
)
`,zw=`(ns user.hof
  (:require [clojure.string :as str]))

;; Deep Dive: Higher-Order Functions & Transducers
;;
;; Press ⌘+Enter on any form to evaluate it.


;; map

(comment
  ;; Basic: apply f to every element
  (map inc [1 2 3 4 5])                  ;; => (2 3 4 5 6)
  (map str [:a :b :c])                   ;; => ("a" "b" "c")
  (map count ["hi" "hello" "hey"])        ;; => (2 5 3)

  (map (fn [x] (* x x)) (range 1 6))    ;; => (1 4 9 16 25)
  (map #(* % %) (range 1 6))            ;; same, shorter syntax

  ;; Multi-collection: zips and stops at the shortest
  (map + [1 2 3] [10 20 30])            ;; => (11 22 33)
  (map vector [:a :b :c] [1 2 3])       ;; => ([:a 1] [:b 2] [:c 3])
  (map + [1 2 3] [10 20 30] [100 200 300]) ;; => (111 222 333)

  ;; map-indexed: f receives [index value]
  (map-indexed vector [:a :b :c])        ;; => ([0 :a] [1 :b] [2 :c])
  (map-indexed (fn [i v] (str i ": " v))
               ["alice" "bob" "carol"])  ;; => ("0: alice" "1: bob" "2: carol")
)


;; filter / remove

(comment
  (filter even?  [1 2 3 4 5 6])         ;; => (2 4 6)
  (filter string? [1 "a" :b "c" 2])     ;; => ("a" "c")
  (filter :active [{:name "a" :active true}
                   {:name "b" :active false}
                   {:name "c" :active true}])
  ;; => ({:name "a" :active true} {:name "c" :active true})

  (remove even? [1 2 3 4 5 6])          ;; => (1 3 5)
  (remove nil?  [1 nil 2 nil 3])        ;; => (1 2 3)

  (filter #(> (count %) 3) ["hi" "hello" "hey" "howdy"])
  ;; => ("hello" "howdy")
)


;; reduce
;;
;; The Swiss army knife — it can implement almost everything else.

(comment
  ;; Two-arity: uses first two elements to start
  (reduce + [1 2 3 4 5])                 ;; => 15
  (reduce * [1 2 3 4 5])                 ;; => 120
  (reduce str ["a" "b" "c"])             ;; => "abc"

  ;; Three-arity: explicit initial accumulator
  (reduce + 100 [1 2 3])                 ;; => 106
  (reduce conj [] '(1 2 3))              ;; => [1 2 3]
  (reduce (fn [m [k v]] (assoc m k v))
          {}
          [[:a 1] [:b 2] [:c 3]])        ;; => {:a 1 :b 2 :c 3}

  ;; Building a frequency map from scratch
  (reduce (fn [acc x]
            (update acc x (fnil inc 0)))
          {}
          [:a :b :a :c :b :a])           ;; => {:a 3 :b 2 :c 1}

  ;; Early termination with \`reduced\` — wraps a value to signal "stop now"
  (reduce (fn [acc x]
            (if (nil? x)
              (reduced acc)
              (conj acc x)))
          []
          [1 2 3 nil 4 5])               ;; => [1 2 3]  (stopped at nil)

  (reduce (fn [_ x]
            (when (> x 100) (reduced x)))
          nil
          (range 1000))                  ;; => 101
)


;; apply, partial, comp

(comment
  ;; apply — call f with a collection as its argument list
  (apply + [1 2 3 4])             ;; => 10
  (apply str ["a" "b" "c"])       ;; => "abc"
  (apply max [3 1 4 1 5 9 2 6])   ;; => 9

  ;; Leading fixed args before the collection
  (apply str "prefix-" ["a" "b"]) ;; => "prefix-ab"

  ;; partial — fix some leading arguments
  (def add10 (partial + 10))
  (add10 5)                        ;; => 15
  (map add10 [1 2 3])              ;; => (11 12 13)

  (def greet (partial str "Hello, "))
  (greet "World!")                  ;; => "Hello, World!"

  ;; comp — compose right-to-left
  (def clean (comp str/trim str/lower-case))
  (clean "  HELLO  ")              ;; => "hello"

  ((comp inc inc inc) 0)           ;; => 3
  ((comp str/upper-case str/trim) "  hello  ") ;; => "HELLO"

  ;; identity — returns its argument unchanged
  (filter identity [1 nil 2 false 3]) ;; => (1 2 3)

  ;; constantly — returns a function that always returns the same value
  ((constantly 42) 1 2 3)          ;; => 42
  (map (constantly :x) [1 2 3])    ;; => (:x :x :x)
)


;; complement, juxt, some, every?

(comment
  ;; complement — logical NOT of a predicate
  (def not-even? (complement even?))
  (filter not-even? [1 2 3 4 5])   ;; => (1 3 5)

  ;; juxt — call multiple functions on the same value, collect results
  ((juxt :name :role) {:name "Alice" :role :admin}) ;; => ["Alice" :admin]
  (map (juxt identity #(* % %)) [1 2 3 4 5])
  ;; => ([1 1] [2 4] [3 9] [4 16] [5 25])

  ;; some — return first truthy result of (f x), or nil
  (some even? [1 3 5 6 7])         ;; => true
  (some even? [1 3 5 7])           ;; => nil
  (some #(when (> % 3) %) [1 2 3 4 5]) ;; => 4

  ;; every? — true if (f x) is truthy for all elements
  (every? even? [2 4 6])           ;; => true
  (every? even? [2 4 5])           ;; => false

  (not-any?   odd? [2 4 6])        ;; => true
  (not-every? odd? [1 2 3])        ;; => true
)


;; sort, sort-by, group-by, frequencies

(def people
  [{:name "Carol" :age 32 :dept :eng}
   {:name "Alice" :age 28 :dept :design}
   {:name "Bob"   :age 35 :dept :eng}
   {:name "Dave"  :age 28 :dept :design}])

(comment
  (sort [3 1 4 1 5 9 2 6])           ;; => (1 1 2 3 4 5 6 9)
  (sort > [3 1 4 1 5 9 2 6])         ;; => (9 6 5 4 3 2 1 1)
  (sort ["banana" "apple" "cherry"])  ;; => ("apple" "banana" "cherry")

  (sort-by :age  people)             ;; youngest first
  (sort-by :name people)             ;; alphabetical

  (group-by :dept  people)           ;; => {:eng [...] :design [...]}
  (group-by :age   people)           ;; groups by age

  (frequencies [:a :b :a :c :b :a]) ;; => {:a 3 :b 2 :c 1}
  (distinct [1 2 3 1 2 4])           ;; => (1 2 3 4)
)


;; Transducers
;;
;; Composable transformation pipelines decoupled from the source and sink.
;; A 1-arg call to map/filter/etc returns a transducer instead of a result.
;; Transducer \`comp\` applies LEFT-to-RIGHT (unlike function comp).

(comment
  ;; \`into\` with a transducer
  (into [] (map inc) [1 2 3 4 5])             ;; => [2 3 4 5 6]
  (into [] (filter even?) [1 2 3 4 5 6])      ;; => [2 4 6]

  ;; Chain with comp — one pass, no intermediate sequences
  (into []
        (comp (filter odd?)
              (map #(* % %)))
        [1 2 3 4 5 6 7])
  ;; => [1 9 25 49]  (squares of odd numbers)

  ;; \`transduce\` — apply a transducer with reduce semantics
  (transduce (comp (filter odd?)
                   (map #(* % %)))
             +
             [1 2 3 4 5 6 7])
  ;; => 84  (sum of squares of odds)

  ;; \`sequence\` — lazy sequence from a transducer
  (sequence (comp (filter even?)
                  (map #(/ % 2)))
            (range 1 11))
  ;; => (1 2 3 4 5)

  ;; partition-all — group into chunks
  (into [] (partition-all 3) (range 10))
  ;; => [[0 1 2] [3 4 5] [6 7 8] [9]]

  ;; dedupe — remove consecutive duplicates
  (into [] (dedupe) [1 1 2 3 3 3 4 1])
  ;; => [1 2 3 4 1]

  ;; take as a transducer — stops early, never touches the rest
  (into [] (take 3) (range 1000))
  ;; => [0 1 2]
)
`,Bw=`(ns user.destructuring)

;; Deep Dive: Destructuring
;;
;; Bind names to parts of a data structure in one step.
;; Works in \`let\`, \`fn\` params, \`defn\` params, \`loop\`, and \`defmacro\`.
;;
;; Press ⌘+Enter on any form to evaluate it.


;; Vector (Sequential) Destructuring
;;
;; Bind names to positions, left to right.

(comment
  (let [[a b c] [10 20 30]]
    (+ a b c))           ;; => 60

  ;; Skip positions with _
  (let [[_ second _ fourth] [1 2 3 4]]
    [second fourth])     ;; => [2 4]

  ;; Fewer bindings than elements — extras are ignored
  (let [[a b] [1 2 3 4 5]]
    [a b])               ;; => [1 2]

  ;; & rest — bind remaining elements as a sequence
  (let [[first-item & the-rest] [1 2 3 4 5]]
    {:first first-item
     :rest  the-rest})   ;; => {:first 1 :rest (2 3 4 5)}

  ;; :as — bind the whole collection in addition to parts
  (let [[x y :as all] [1 2 3]]
    {:x x :y y :all all}) ;; => {:x 1 :y 2 :all [1 2 3]}

  ;; Nested vectors
  (let [[a [b c] d] [1 [2 3] 4]]
    [a b c d])           ;; => [1 2 3 4]
)


;; Map Destructuring
;;
;; Bind names to values by key.

(comment
  ;; Basic: bind local name to the value at a key
  (let [{n :name a :age} {:name "Alice" :age 30 :role :admin}]
    (str n " is " a))    ;; => "Alice is 30"

  ;; :keys — shorthand when local name == keyword name
  (let [{:keys [name age role]} {:name "Alice" :age 30 :role :admin}]
    [name age role])     ;; => ["Alice" 30 :admin]

  ;; :strs — like :keys but for string keys
  (let [{:strs [name age]} {"name" "Bob" "age" 25}]
    [name age])          ;; => ["Bob" 25]

  ;; :as — bind the whole map too
  (let [{:keys [name] :as person} {:name "Carol" :age 32}]
    {:greeting (str "Hello " name)
     :full     person})

  ;; :or — default values when key is absent (NOT when value is nil)
  (let [{:keys [name role] :or {role :guest}} {:name "Dave"}]
    [name role])         ;; => ["Dave" :guest]  (:role was absent)

  ;; :or does NOT apply when the key IS present but value is nil
  (let [{:keys [role] :or {role :guest}} {:role nil}]
    role)                ;; => nil  (key exists, :or doesn't fire)
)


;; Destructuring in Function Params

;; Vector destructuring in fn params
(defn sum-pair [[a b]]
  (+ a b))

;; Map destructuring in fn params
(defn greet-user [{:keys [name role] :or {role :guest}}]
  (str "Hello " name " (" (clojure.core/name role) ")"))

;; Multi-arg with map destructuring
(defn move [{:keys [x y]} {:keys [dx dy]}]
  {:x (+ x dx) :y (+ y dy)})

(comment
  (sum-pair [3 7])                         ;; => 10
  (greet-user {:name "Alice" :role :admin}) ;; => "Hello Alice (admin)"
  (greet-user {:name "Bob"})               ;; => "Hello Bob (guest)"
  (move {:x 0 :y 0} {:dx 3 :dy 5})        ;; => {:x 3 :y 5}
)


;; Nested Destructuring

(comment
  ;; Map inside vector
  (let [[{:keys [name]} {:keys [score]}]
        [{:name "Alice"} {:score 95}]]
    (str name ": " score))    ;; => "Alice: 95"

  ;; Vector inside map
  (let [{:keys [name]
         [first-score] :scores}
        {:name "Bob" :scores [87 90 95]}]
    (str name " first: " first-score)) ;; => "Bob first: 87"

  ;; Deeply nested — a realistic API response shape
  (def response
    {:status 200
     :body {:user {:id 42
                   :name "Alice"
                   :tags ["admin" "beta"]}}})

  (let [{:keys [status]
         {:keys [user]} :body} response
        {:keys [id name]
         [first-tag] :tags} user]
    {:status status :id id :name name :first-tag first-tag})
  ;; => {:status 200 :id 42 :name "Alice" :first-tag "admin"}
)


;; Destructuring in loop/recur

(comment
  (loop [[x & xs] [1 2 3 4 5]
         acc      0]
    (if x
      (recur xs (+ acc x))
      acc))                    ;; => 15

  (loop [{:keys [n acc]} {:n 5 :acc 1}]
    (if (zero? n)
      acc
      (recur {:n (dec n) :acc (* acc n)})))
  ;; => 120  (5!)
)


;; Kwargs Destructuring (& {:keys})
;;
;; \`& rest\` where rest is treated as a flat key/value sequence.

(defn configure [& {:keys [host port timeout]
                    :or   {host "localhost"
                           port 8080
                           timeout 5000}}]
  {:host host :port port :timeout timeout})

(comment
  (configure)                               ;; all defaults
  (configure :port 3000)
  (configure :host "prod.example.com" :port 443 :timeout 30000)
)


;; Qualified :keys
;;
;; When map keys are namespaced keywords, the local name is the unqualified part.

(comment
  (let [{:keys [user/name user/role]}
        {:user/name "Alice" :user/role :admin}]
    [name role])                            ;; => ["Alice" :admin]
)


;; Practical Patterns

(defn summarize [{:keys [name scores]}]
  {:name    name
   :average (/ (reduce + scores) (count scores))
   :best    (apply max scores)})

(def students
  [{:name "Alice" :scores [88 92 95]}
   {:name "Bob"   :scores [75 80 78]}
   {:name "Carol" :scores [95 98 100]}])

(comment
  (map summarize students)

  (->> students
       (map summarize)
       (sort-by :average >)
       (map :name))               ;; => ("Carol" "Alice" "Bob")

  (let [{:keys [scores]} (first students)
        [best & _] (sort > scores)]
    best)                         ;; => 95
)
`,Hw=`(ns user.strings-regex
  (:require [clojure.string :as str]))

;; Deep Dive: Strings & Regex
;;
;; Press ⌘+Enter on any form to evaluate it.


;; Building & Inspecting Strings

(comment
  ;; str — concatenate anything into a string
  (str "hello" " " "world")         ;; => "hello world"
  (str :keyword)                     ;; => ":keyword"
  (str 42)                           ;; => "42"
  (str nil)                          ;; => ""  (nil becomes empty string)
  (str true false)                   ;; => "truefalse"

  (subs "hello world" 6)             ;; => "world"
  (subs "hello world" 0 5)           ;; => "hello"

  (count "hello")                    ;; => 5
  (count "")                         ;; => 0

  (string? "hello")                  ;; => true
  (string? :not-a-string)            ;; => false
)


;; clojure.string  (required as str)

(comment
  ;; Case
  (str/upper-case "hello")          ;; => "HELLO"
  (str/lower-case "WORLD")          ;; => "world"
  (str/capitalize "hello world")    ;; => "Hello world"

  ;; Trimming whitespace
  (str/trim  "  hello  ")           ;; => "hello"
  (str/triml "  hello  ")           ;; => "hello  "  (left only)
  (str/trimr "  hello  ")           ;; => "  hello"  (right only)
  (str/trim-newline "hello\\n")      ;; => "hello"

  ;; Joining
  (str/join ", " ["one" "two" "three"])  ;; => "one, two, three"
  (str/join ["a" "b" "c"])               ;; => "abc"

  ;; Splitting
  (str/split "a,b,c,d" #",")        ;; => ["a" "b" "c" "d"]
  (str/split "hello world" #"\\s+")  ;; => ["hello" "world"]
  (str/split-lines "one\\ntwo\\nthree") ;; => ["one" "two" "three"]

  ;; Search predicates
  (str/includes?    "hello world" "world")  ;; => true
  (str/starts-with? "hello world" "hello")  ;; => true
  (str/ends-with?   "hello world" "world")  ;; => true
  (str/blank?       "   ")                  ;; => true
  (str/blank?       "  x  ")               ;; => false

  (str/index-of      "hello world" "world")  ;; => 6
  (str/last-index-of "abcabc" "b")           ;; => 4

  (str/reverse "hello")             ;; => "olleh"
)


;; Replace

(comment
  ;; Literal match
  (str/replace "hello world" "world" "Clojure") ;; => "hello Clojure"

  ;; Regex — all matches
  (str/replace "hello world" #"[aeiou]" "*")    ;; => "h*ll* w*rld"

  ;; Regex + function — receives match string (or vector when groups present)
  (str/replace "hello world"
               #"\\b\\w"
               (fn [match] (str/upper-case match)))
  ;; => "Hello World"

  ;; replace-first — only the first occurrence
  (str/replace-first "aabbaabb" "b" "X")        ;; => "aaXbaabb"
  (str/replace-first "hello" #"[aeiou]" "*")    ;; => "h*llo"

  ;; escape — apply a substitution map to every character
  (str/escape "hello & <world>" {\\& "&amp;" \\< "&lt;" \\> "&gt;"})
  ;; => "hello &amp; &lt;world&gt;"
)


;; Strings as Sequences
;;
;; Strings are seqable — all sequence functions work on them.

(comment
  (seq "hello")                      ;; => ("h" "e" "l" "l" "o")

  (first "hello")                    ;; => "h"
  (rest  "hello")                    ;; => ("e" "l" "l" "o")
  (last (seq "hello"))               ;; => "o"  (last needs a seq, not a raw string)

  (count "hello")                    ;; => 5

  (map str/upper-case (seq "hello")) ;; => ("H" "E" "L" "L" "O")

  ;; Set literals not supported yet — use an explicit membership check:
  (filter (fn [c] (some #(= c %) ["a" "e" "i" "o" "u"])) (seq "hello world"))
  ;; => ("e" "o" "o")  (vowels only)

  ;; Rebuild a string after seq manipulation
  (apply str (filter (fn [c] (some #(= c %) ["a" "e" "i" "o" "u"])) (seq "hello world")))
  ;; => "eoo"

  (count "café")                     ;; => 4  (not byte count)
  (seq "café")                       ;; => ("c" "a" "f" "é")
)


;; Regex Literals
;;
;; Patterns follow JavaScript regex rules.

(comment
  #"[0-9]+"                          ;; => #"[0-9]+"

  ;; re-find — first match (string if no groups, vector if groups)
  (re-find #"\\d+" "abc123def456")    ;; => "123"
  (re-find #"(\\w+)@(\\w+)" "me@example.com")
  ;; => ["me@example.com" "me" "example"]  (full match + groups)

  ;; re-matches — match against the ENTIRE string
  (re-matches #"\\d+" "123")          ;; => "123"
  (re-matches #"\\d+" "123abc")       ;; => nil  (not entire string)
  (re-matches #"(\\d{4})-(\\d{2})-(\\d{2})" "2024-03-15")
  ;; => ["2024-03-15" "2024" "03" "15"]

  ;; re-seq — all matches as a lazy sequence
  (re-seq #"\\d+" "abc123def456ghi789")   ;; => ("123" "456" "789")
  (re-seq #"\\b\\w{4}\\b" "the quick brown fox")
  ;; => ("quick" "brown")  (4-letter words)

  ;; re-pattern — create a regex from a string (useful when dynamic)
  (re-find (re-pattern "hello") "say hello!")  ;; => "hello"
)


;; Inline Regex Flags
;;
;;   (?i)  case-insensitive
;;   (?m)  multiline  (^ and $ match line boundaries)
;;   (?s)  dotAll     (. matches newlines too)

(comment
  (re-find #"(?i)hello" "say HELLO!")     ;; => "HELLO"
  (re-matches #"(?i)[a-z]+" "HeLLo")     ;; => "HeLLo"

  (re-seq #"(?m)^\\w+" "one\\ntwo\\nthree") ;; => ("one" "two" "three")

  (re-seq #"(?im)^hello" "Hello\\nHELLO\\nhello")
  ;; => ("Hello" "HELLO" "hello")
)


;; Practical Patterns

(comment
  ;; Parse a CSV row
  (defn parse-csv [line]
    (str/split line #","))

  (parse-csv "alice,30,admin")           ;; => ["alice" "30" "admin"]

  ;; Extract structured data with groups
  (defn parse-date [s]
    (let [[_ y m d] (re-matches #"(\\d{4})-(\\d{2})-(\\d{2})" s)]
      {:year y :month m :day d}))

  (parse-date "2024-03-15")
  ;; => {:year "2024" :month "03" :day "15"}

  ;; Slugify — URL-safe string
  (defn slugify [s]
    (-> s
        str/trim
        str/lower-case
        (str/replace #"[^a-z0-9\\s-]" "")
        (str/replace #"\\s+" "-")))

  (slugify "  Hello, World! It's Clojure  ")
  ;; => "hello-world-its-clojure"

  ;; Template substitution — replace {{key}} placeholders
  (defn render [template data]
    (str/replace template
                 #"\\{\\{(\\w+)\\}\\}"
                 (fn [[_ key]] (get data key ""))))

  (render "Hello, {{name}}! You have {{count}} messages."
          {"name" "Alice" "count" "3"})
  ;; => "Hello, Alice! You have 3 messages."
)
`,Uw=`(ns user.errors)

;; Deep Dive: Error Handling
;;
;; Press ⌘+Enter on any form to evaluate it.


;; try / catch / finally

(comment
  ;; No error — returns the value of the body
  (try
    (+ 1 2))           ;; => 3

  ;; catch with :default — catches anything
  (try
    (/ 1 0)
    (catch :default e
      (str "Caught: " (ex-message e))))

  ;; finally — always runs, does NOT change the return value
  (try
    (+ 1 2)
    (finally
      (println "always runs")))   ;; prints, returns 3

  (try
    (/ 1 0)
    (catch :default e
      (println "handling error")
      :recovered)
    (finally
      (println "cleanup")))       ;; => :recovered
)


;; throw
;;
;; You can throw any value — not just error objects.
;; Catch with a predicate function that matches the thrown value.

(comment
  (try
    (throw "something went wrong")
    (catch string? e
      (str "got a string: " e)))

  (try
    (throw :not-found)
    (catch keyword? e
      (str "got a keyword: " e)))

  (try
    (throw 42)
    (catch number? e
      (str "got a number: " (+ e 1))))

  (try
    (throw {:type :validation :field :email :msg "invalid"})
    (catch map? e
      (str "validation error on " (:field e))))
)


;; Catch Discriminators
;;
;; The catch clause tests the thrown value with a discriminator:
;;
;;   :default        — catches everything
;;   :error/runtime  — catches evaluator errors (type errors, etc.)
;;   predicate fn    — checks (pred thrown-value)  e.g. keyword? number? map?
;;   keyword         — matches if thrown is a map with :type = that keyword

(comment
  ;; Throw a plain map with :type to use keyword discriminators.
  ;; This is the idiomatic pattern for named error types in cljam.
  (defn find-user [id]
    (if (pos? id)
      {:id id :name "Alice"}
      (throw {:type :user/not-found :id id})))

  (try
    (find-user -1)
    (catch :user/not-found e
      (str "User not found, id=" (:id e))))

  ;; Multiple catch clauses — matched in order
  (defn risky [x]
    (cond
      (string? x) (throw {:type :bad-type  :given x})
      (neg?    x) (throw {:type :negative  :given x})
      :else       (/ 100 x)))

  (try
    (risky -5)
    (catch :bad-type _  "wrong type")
    (catch :negative _  "negative number")
    (catch :default  e  (str "unexpected: " e)))

  (try (risky "oops") (catch :bad-type _ "wrong type") (catch :negative _ "neg"))
  (try (risky 0)      (catch :default e (ex-message e)))

  ;; :error/runtime — catches interpreter-level errors (type mismatches, etc.)
  (try
    (+ 1 "not a number")
    (catch :error/runtime e
      (str "type error caught: " (ex-message e))))
)


;; ex-info: Structured Errors
;;
;; \`ex-info\` creates an error with a :message, a :data map, and an optional cause.
;; Catch with :default, then inspect with ex-message / ex-data / ex-cause.

(comment
  (try
    (throw (ex-info "User validation failed"
                    {:field  :email
                     :value  "not-an-email"
                     :code   :invalid-format}))
    (catch :default e
      {:message (ex-message e)
       :data    (ex-data    e)}))

  ;; ex-info with a cause (chained errors)
  (try
    (try
      (/ 1 0)
      (catch :default cause
        (throw (ex-info "Database query failed"
                        {:query "SELECT *"}
                        cause))))
    (catch :default e
      {:message (ex-message e)
       :data    (ex-data    e)
       :cause   (ex-message (ex-cause e))}))
)


;; Typed Errors: map-based approach
;;
;; Throw a map with :type (and any extra keys you need).
;; Keyword discriminators match on the :type field — no class hierarchy required.

(defn parse-age [x]
  (cond
    (not (number? x))
    (throw {:type :error/parse :msg "Not a number" :value x})

    (neg? x)
    (throw {:type :error/validation :msg "Age cannot be negative" :value x})

    :else x))

(comment
  (try
    (parse-age "hello")
    (catch :error/parse e
      (str "Parse error: " (:msg e) " (got: " (:value e) ")"))
    (catch :error/validation e
      (str "Validation error: " (:msg e))))

  (try
    (parse-age -5)
    (catch :error/parse e      (str "parse: " (:msg e)))
    (catch :error/validation e (str "validation: " (:msg e))))

  (parse-age 30)               ;; => 30  (no error)
)


;; Practical Patterns

(comment
  ;; Result map {ok? result/error}
  (defn safe-divide [a b]
    (try
      {:ok? true  :result (/ a b)}
      (catch :default e
        {:ok? false :error (ex-message e)})))

  (safe-divide 10 2)   ;; => {:ok? true  :result 5}
  (safe-divide 10 0)   ;; => {:ok? false :error "..."}

  ;; Validate before computing — throw a typed map
  (defn sqrt [n]
    (when (neg? n)
      (throw {:type :error/domain :msg "Cannot take sqrt of negative number" :value n}))
    (loop [x (* 0.5 (+ 1.0 n))]
      (let [next-x (* 0.5 (+ x (/ n x)))
            diff   (max (- next-x x) (- x next-x))]
        (if (< diff 1e-9)
          next-x
          (recur next-x)))))

  (try (sqrt 9)  (catch :default e (:msg e)))          ;; => 3.0
  (try (sqrt -1) (catch :error/domain e (:msg e)))     ;; => "Cannot take sqrt..."

  ;; Wrapping errors with context — using ex-info for the cause chain
  (defn load-user [id]
    (try
      (if (= id 42)
        {:id 42 :name "Alice"}
        (throw (ex-info "User not found" {:id id})))
      (catch :default e
        (throw (ex-info (str "Failed to load profile for id=" id)
                        {:id id}
                        e)))))

  (try
    (load-user 99)
    (catch :default e
      {:msg    (ex-message e)
       :cause  (ex-message (ex-cause e))}))
)
`,Kw={class:"pg"},Ww={class:"pg-header"},Jw={class:"pg-header__actions"},Qw=["value"],Yw={class:"pg-body"},Xw={key:0,class:"pg-loading"},Zw={class:"pg-quickref"},ek=z({__name:"Playground",setup(e){const t=[{label:"Welcome",content:Dw},{label:"Collections",content:Gw},{label:"Higher-Order Fns",content:zw},{label:"Destructuring",content:Bw},{label:"Strings & Regex",content:Hw},{label:"Error Handling",content:Uw}],n=te(),r=te(),s=te(),o=te(),i=te(!0),u=te(!1);let l=null,d=null,m=null,h=0;function b(P,S){const _=document.createElement(P);return S&&(_.className=S),_}function M(P){return P<1?`${Math.round(P*1e3)} µs`:P<10?`${+P.toFixed(2)} ms`:P<100?`${+P.toFixed(1)} ms`:P<1e3?`${Math.round(P)} ms`:`${+(P/1e3).toFixed(2)} s`}function v(P,S,_){const O=b("div","pg-entry"),V=b("div","pg-entry__source");V.textContent=_,O.appendChild(V);for(const W of P)if(W.kind==="output"){const B=b("div","pg-entry__output");B.textContent=W.text,O.appendChild(B)}else if(W.kind==="result"){const B=b("div","pg-entry__result");B.textContent=`→ ${W.output} `;const ne=b("span","pg-entry__duration");ne.textContent=`(${M(W.durationMs)})`,B.appendChild(ne),O.appendChild(B)}else if(W.kind==="error"){const B=b("div","pg-entry__result pg-entry__result--error");B.textContent=`✗ ${W.message} `;const ne=b("span","pg-entry__duration");ne.textContent=`(${M(W.durationMs)})`,B.appendChild(ne),O.appendChild(B)}S.appendChild(O)}yt(async()=>{if(!n.value||!s.value||!r.value)return;document.documentElement.classList.add("pg-full-page"),window.MonacoEnvironment={getWorker(oe,ve){return new Worker(new URL("/cljam/assets/editor.worker-CKy7Pnvo.js",import.meta.url),{type:"module"})}};const[P,{registerClojureLanguage:S,defineMonacoTheme:_,THEME_ID:O},{findFormBeforeCursor:V}]=await Promise.all([ar(()=>import("./editor.main.CpwxIn4y.js"),__vite__mapDeps([2,1])),ar(()=>import("./clojure-tokens.Co1bCbEI.js"),__vite__mapDeps([3,4])),ar(()=>import("./find-form.BMLo6Wt5.js"),__vite__mapDeps([5,1]))]);S(P),_(P),n.value.addEventListener("keydown",oe=>oe.stopPropagation()),l=P.editor.create(n.value,{value:t[0].content,language:"clojure",theme:O,fontSize:14,fontFamily:"'JetBrains Mono', 'SF Mono', ui-monospace, monospace",fontLigatures:!0,lineNumbers:"on",minimap:{enabled:!1},scrollBeyondLastLine:!1,automaticLayout:!0,padding:{top:16,bottom:16},renderLineHighlight:"gutter",bracketPairColorization:{enabled:!0},matchBrackets:"always",overviewRulerLanes:0,hideCursorInOverviewRuler:!0,scrollbar:{verticalScrollbarSize:6,horizontalScrollbarSize:6}}),u.value=!0;const W=gc();function B(oe,ve,Le){ne();const re=l.getModel();if(!re)return;const _n=re.getPositionAt(Math.max(0,oe-1)).lineNumber,Pn=re.getLineMaxColumn(_n),Dt=document.createElement("span");Dt.className=Le?"pg-inline-error":"pg-inline-result",Dt.textContent=`  ⇒ ${ve}`;const er={getId:()=>"pg.inline",getDomNode:()=>Dt,getPosition:()=>({position:{lineNumber:_n,column:Pn},preference:[P.editor.ContentWidgetPositionPreference.EXACT]})};d=er,l.addContentWidget(er),m=l.onDidChangeModelContent(()=>ne())}function ne(){d&&(l.removeContentWidget(d),d=null),m==null||m.dispose(),m=null}async function $e(){const oe=l.getValue();if(!oe.trim())return;const ve=l.getModel(),Le=l.getPosition(),re=ve&&Le?ve.getOffsetAt(Le):oe.length,qe=V(oe,re),_n=qe?oe.slice(qe.start,qe.end):oe.trim(),Pn=qe?qe.end:oe.trimEnd().length,Dt=await Fs(W,_n);i.value=!1,v(Dt,s.value,_n),r.value.scrollTop=r.value.scrollHeight;const er=oe.slice(Pn).trim().length>0,xo=$o=>er?$o.split(`
`)[0]:$o,Ft=Dt[Dt.length-1];(Ft==null?void 0:Ft.kind)==="result"?B(Pn,xo(Ft.output),!1):(Ft==null?void 0:Ft.kind)==="error"&&B(Pn,xo(Ft.message),!0)}async function Se(){const oe=l.getValue();if(!oe.trim())return;ne();const ve=await Fs(W,oe.trim());i.value=!1,v(ve,s.value,oe.trim()),r.value.scrollTop=r.value.scrollHeight}l.addCommand(P.KeyMod.CtrlCmd|P.KeyCode.Enter,()=>{$e()}),l.addCommand(P.KeyMod.CtrlCmd|P.KeyMod.Shift|P.KeyCode.Enter,()=>{Se()}),y=Se,$=()=>{s.value.innerHTML="",i.value=!0,ne()},R=oe=>{const ve=t[oe];if(!ve)return;if(!window.confirm(`Load "${ve.label}"?

Your current edits will be lost.`)){o.value&&(o.value.value=String(h));return}h=oe,l.setValue(ve.content),ne()}}),kr(()=>{document.documentElement.classList.remove("pg-full-page"),m==null||m.dispose(),l&&(l.dispose(),l=null)});let y=null,$=null,R=null;function E(){y==null||y()}function U(){$==null||$()}function le(P){const S=Number(P.target.value);R==null||R(S)}return(P,S)=>(k(),I("div",Kw,[C("header",Ww,[S[0]||(S[0]=C("div",{class:"pg-header__left"},[C("span",{class:"pg-header__title"},"cljam REPL"),C("span",{class:"pg-header__hint"},[C("kbd",null,"⌘Enter"),Mt(" eval form   "),C("kbd",null,"⇧⌘Enter"),Mt(" eval all")])],-1)),C("div",Jw,[C("select",{class:"pg-btn pg-sample-select",ref_key:"sampleSelectRef",ref:o,onChange:le},[(k(),I(ge,null,Ne(t,(_,O)=>C("option",{key:O,value:String(O)},fe(_.label),9,Qw)),64))],544),C("button",{class:"pg-btn pg-btn--primary",onClick:E,title:"Evaluate the entire editor buffer (Shift+⌘Enter)"},"Run all"),C("button",{class:"pg-btn pg-btn--danger",onClick:U,title:"Clear the output panel"},"Clear output")])]),C("div",Yw,[C("div",{class:"pg-editor-wrap",ref_key:"editorWrapRef",ref:n},[u.value?D("",!0):(k(),I("div",Xw,"Loading editor…"))],512),C("div",{class:"pg-output",ref_key:"outputRef",ref:r},[C("div",{class:"pg-output-inner",ref_key:"outputInnerRef",ref:s},null,512),pa(C("div",Zw,[...S[1]||(S[1]=[_c('<div class="pg-quickref__section"><div class="pg-quickref__label">Shortcuts</div><div class="pg-quickref__shortcut"><kbd>⌘Enter</kbd><span>eval form at cursor</span></div><div class="pg-quickref__shortcut"><kbd>⇧⌘Enter</kbd><span>eval entire buffer</span></div></div><div class="pg-quickref__section"><div class="pg-quickref__label">Tips</div><ul class="pg-quickref__tips"><li>Place cursor inside any <code>(…)</code> <code>[…]</code> <code>{…}</code> and press <kbd>⌘Enter</kbd> to eval just that form</li><li>Place cursor right after a symbol, keyword, or number to eval an atom</li><li><code>def</code> bindings and <code>atom</code> state persist between evals — same session throughout</li><li>Use the sample dropdown to explore collections, HOFs, destructuring, strings, and error handling</li></ul></div><div class="pg-quickref__section"><div class="pg-quickref__label">Available via require</div><div class="pg-quickref__packages"><code>[clojure.string :as str]</code><code>[clojure.edn :as edn]</code><code>[clojure.math :as math]</code><code>[cljam.schema.core :as s]</code><code>[cljam.date :as date]</code><code>[cljam.integrant :as ig]</code></div></div>',3)])],512),[[Ac,i.value]])],512)])]))}}),tk={class:"mr"},nk={class:"mr-header"},rk={class:"mr-hint"},sk={class:"mr-actions"},ok=["disabled"],ak=["disabled","title"],ik={key:0},ck={key:1},lk={key:2},uk=["rows"],dk={key:0,class:"mr-results"},fk={class:"mr-arrow"},mk={class:"mr-value"},pk={key:0,class:"mr-duration"},hk=z({__name:"MiniRepl",props:{code:{}},setup(e){const t=e,n=te(t.code),r=ee(()=>Math.max(3,t.code.split(`
`).length)),s=te(!1),o=te(!1),i=te(!1),u=te(null),l=te(!1),d=te(null),m=te([]),h=te(null),b=ee(()=>n.value!==t.code),M=ee(()=>!s.value||o.value?"":"editable · ⌘/Ctrl + Enter to run");let v=0,y=null;yt(()=>{y=gc(),s.value=!0,hn($)}),vt(()=>t.code,P=>{n.value=P,hn($)});function $(){const P=h.value;P&&(P.style.height="auto",P.style.height=`${P.scrollHeight}px`)}function R(){n.value=t.code,hn($)}function E(P){if(P.key==="Enter"&&(P.metaKey||P.ctrlKey)){P.preventDefault(),U();return}if(P.key==="Tab"&&!P.shiftKey){P.preventDefault();const S=h.value;if(!S)return;const _=S.selectionStart,O=S.selectionEnd,V=n.value;n.value=V.slice(0,_)+"  "+V.slice(O),hn(()=>{S.selectionStart=S.selectionEnd=_+2,$()})}}async function U(){if(!(!y||o.value)){o.value=!0,i.value=!0,m.value=[],u.value=null,l.value=!1,d.value=null;try{const P=await Fs(y,n.value);for(const S of P)S.kind==="output"?m.value.push({id:v++,text:S.text}):S.kind==="result"?(u.value=S.output,d.value=S.durationMs):S.kind==="error"&&(u.value=S.message,l.value=!0,d.value=S.durationMs)}finally{o.value=!1}}}function le(P){return P<1?`${Math.round(P*1e3)} µs`:P<10?`${P.toFixed(2)} ms`:P<100?`${P.toFixed(1)} ms`:P<1e3?`${Math.round(P)} ms`:`${(P/1e3).toFixed(2)} s`}return(P,S)=>(k(),I("div",tk,[C("div",nk,[S[1]||(S[1]=C("span",{class:"mr-lang"},"cljam",-1)),C("span",rk,fe(M.value),1),C("div",sk,[b.value?(k(),I("button",{key:0,type:"button",class:"mr-btn mr-btn--ghost",onClick:R,disabled:o.value,title:"Reset to the original snippet"},"Reset",8,ok)):D("",!0),C("button",{type:"button",class:"mr-btn",onClick:U,disabled:o.value||!s.value,title:s.value?"Evaluate this snippet (Ctrl/Cmd + Enter)":"Loading runtime..."},[o.value?(k(),I("span",ik,"running…")):s.value?(k(),I("span",lk,"▶ Run")):(k(),I("span",ck,"loading…"))],8,ak)])]),pa(C("textarea",{ref_key:"taRef",ref:h,class:"mr-code","onUpdate:modelValue":S[0]||(S[0]=_=>n.value=_),spellcheck:"false",autocapitalize:"off",autocomplete:"off",autocorrect:"off",rows:r.value,onInput:$,onKeydown:E},null,40,uk),[[Pc,n.value]]),i.value?(k(),I("div",dk,[(k(!0),I(ge,null,Ne(m.value,_=>(k(),I("div",{key:`p-${_.id}`,class:"mr-line mr-line--print"},fe(_.text),1))),128)),u.value!==null?(k(),I("div",{key:0,class:pe(["mr-line",{"mr-line--error":l.value}])},[C("span",fk,fe(l.value?"✗":"⇒"),1),C("span",mk,fe(u.value),1),d.value!==null?(k(),I("span",pk,"("+fe(le(d.value))+")",1)):D("",!0)],2)):D("",!0)])):D("",!0)]))}}),gk=Y(hk,[["__scopeId","data-v-dd7091a5"]]),bk={extends:hm,enhanceApp({app:e}){e.component("Playground",ek),e.component("MiniRepl",gk)}};export{bk as R,Qd as c,Un as t,ae as u};
