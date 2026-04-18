const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/chunks/VPLocalSearchBox.on8hem7A.js","assets/chunks/framework.Q2e_3lsv.js","assets/chunks/editor.main.Ml3tWnmV.js","assets/chunks/clojure-tokens.Co1bCbEI.js","assets/chunks/clojure.Dnu-v4kV.js","assets/chunks/find-form.DPvUu3aR.js"])))=>i.map(i=>d[i]);
var As=Object.defineProperty;var Ps=(t,e,n)=>e in t?As(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var le=(t,e,n)=>Ps(t,typeof e!="symbol"?e+"":e,n);import{d as L,c as $,r as q,n as J,o as v,a as Te,t as U,b as T,w as F,T as qn,e as C,_ as z,u as Cs,i as Ms,f as Ns,g as Sn,h as V,j as _,k as x,l as nt,m as un,p as B,q as Pe,s as Jt,v as Me,x as Gt,y as Fn,z as Ls,A as Es,F as G,B as re,C as rt,D as Qt,E,G as dr,H as Ie,I as fr,J as Yt,K as He,L as Xt,M as Ts,N as mr,O as dn,P as ut,Q as pr,R as Zt,S as zs,U as Vs,V as Pt,W as hr,X as gr,Y as Ds,Z as Bs,$ as Os,a0 as Hs,a1 as Us,a2 as vr,a3 as Ws,a4 as Ks,a5 as Js}from"./framework.Q2e_3lsv.js";const Gs=L({__name:"VPBadge",props:{text:{},type:{default:"tip"}},setup(t){return(e,n)=>(v(),$("span",{class:J(["VPBadge",t.type])},[q(e.$slots,"default",{},()=>[Te(U(t.text),1)])],2))}}),Qs={key:0,class:"VPBackdrop"},Ys=L({__name:"VPBackdrop",props:{show:{type:Boolean}},setup(t){return(e,n)=>(v(),T(qn,{name:"fade"},{default:F(()=>[t.show?(v(),$("div",Qs)):C("",!0)]),_:1}))}}),Xs=z(Ys,[["__scopeId","data-v-1e7af659"]]),H=Cs;function Zs(t,e){let n,r=!1;return()=>{n&&clearTimeout(n),r?n=setTimeout(t,e):(t(),(r=!0)&&setTimeout(()=>r=!1,e))}}function fn(t){return t.startsWith("/")?t:`/${t}`}function jn(t){const{pathname:e,search:n,hash:r,protocol:s}=new URL(t,"http://a.com");if(Ms(t)||t.startsWith("#")||!s.startsWith("http")||!Ns(e))return t;const{site:o}=H(),i=e.endsWith("/")||e.endsWith(".html")?t:t.replace(/(?:(^\.+)\/)?.*$/,`$1${e.replace(/(\.md)?$/,o.value.cleanUrls?"":".html")}${n}${r}`);return Sn(i)}function _t({correspondingLink:t=!1}={}){const{site:e,localeIndex:n,page:r,theme:s,hash:o}=H(),i=V(()=>{var c,d;return{label:(c=e.value.locales[n.value])==null?void 0:c.label,link:((d=e.value.locales[n.value])==null?void 0:d.link)||(n.value==="root"?"/":`/${n.value}/`)}});return{localeLinks:V(()=>Object.entries(e.value.locales).flatMap(([c,d])=>i.value.label===d.label?[]:{text:d.label,link:ea(d.link||(c==="root"?"/":`/${c}/`),s.value.i18nRouting!==!1&&t,r.value.relativePath.slice(i.value.link.length-1),!e.value.cleanUrls)+o.value})),currentLang:i}}function ea(t,e,n,r){return e?t.replace(/\/$/,"")+fn(n.replace(/(^|\/)index\.md$/,"$1").replace(/\.md$/,r?".html":"")):t}const ta={class:"NotFound"},na={class:"code"},ra={class:"title"},sa={class:"quote"},aa={class:"action"},oa=["href","aria-label"],ia=L({__name:"NotFound",setup(t){const{theme:e}=H(),{currentLang:n}=_t();return(r,s)=>{var o,i,l,c,d;return v(),$("div",ta,[_("p",na,U(((o=x(e).notFound)==null?void 0:o.code)??"404"),1),_("h1",ra,U(((i=x(e).notFound)==null?void 0:i.title)??"PAGE NOT FOUND"),1),s[0]||(s[0]=_("div",{class:"divider"},null,-1)),_("blockquote",sa,U(((l=x(e).notFound)==null?void 0:l.quote)??"But if you don't change your direction, and if you keep looking, you may end up where you are heading."),1),_("div",aa,[_("a",{class:"link",href:x(Sn)(x(n).link),"aria-label":((c=x(e).notFound)==null?void 0:c.linkLabel)??"go to home"},U(((d=x(e).notFound)==null?void 0:d.linkText)??"Take me home"),9,oa)])])}}}),la=z(ia,[["__scopeId","data-v-b2e77396"]]);function yr(t,e){if(Array.isArray(t))return Ct(t);if(t==null)return[];e=fn(e);const n=Object.keys(t).sort((s,o)=>o.split("/").length-s.split("/").length).find(s=>e.startsWith(fn(s))),r=n?t[n]:[];return Array.isArray(r)?Ct(r):Ct(r.items,r.base)}function ca(t){const e=[];let n=0;for(const r in t){const s=t[r];if(s.items){n=e.push(s);continue}e[n]||e.push({items:[]}),e[n].items.push(s)}return e}function ua(t){const e=[];function n(r){for(const s of r)s.text&&s.link&&e.push({text:s.text,link:s.link,docFooterText:s.docFooterText}),s.items&&n(s.items)}return n(t),e}function mn(t,e){return Array.isArray(e)?e.some(n=>mn(t,n)):nt(t,e.link)?!0:e.items?mn(t,e.items):!1}function Ct(t,e){return[...t].map(n=>{const r={...n},s=r.base||e;return s&&r.link&&(r.link=s+r.link),r.items&&(r.items=Ct(r.items,s)),r})}function Ve(){const{frontmatter:t,page:e,theme:n}=H(),r=un("(min-width: 960px)"),s=B(!1),o=V(()=>{const k=n.value.sidebar,S=e.value.relativePath;return k?yr(k,S):[]}),i=B(o.value);Pe(o,(k,S)=>{JSON.stringify(k)!==JSON.stringify(S)&&(i.value=o.value)});const l=V(()=>t.value.sidebar!==!1&&i.value.length>0&&t.value.layout!=="home"),c=V(()=>d?t.value.aside==null?n.value.aside==="left":t.value.aside==="left":!1),d=V(()=>t.value.layout==="home"?!1:t.value.aside!=null?!!t.value.aside:n.value.aside!==!1),m=V(()=>l.value&&r.value),p=V(()=>l.value?ca(i.value):[]);function h(){s.value=!0}function g(){s.value=!1}function w(){s.value?g():h()}return{isOpen:s,sidebar:i,sidebarGroups:p,hasSidebar:l,hasAside:d,leftAside:c,isSidebarEnabled:m,open:h,close:g,toggle:w}}function da(t,e){let n;Jt(()=>{n=t.value?document.activeElement:void 0}),Me(()=>{window.addEventListener("keyup",r)}),Gt(()=>{window.removeEventListener("keyup",r)});function r(s){s.key==="Escape"&&t.value&&(e(),n==null||n.focus())}}function fa(t){const{page:e,hash:n}=H(),r=B(!1),s=V(()=>t.value.collapsed!=null),o=V(()=>!!t.value.link),i=B(!1),l=()=>{i.value=nt(e.value.relativePath,t.value.link)};Pe([e,t,n],l),Me(l);const c=V(()=>i.value?!0:t.value.items?mn(e.value.relativePath,t.value.items):!1),d=V(()=>!!(t.value.items&&t.value.items.length));Jt(()=>{r.value=!!(s.value&&t.value.collapsed)}),Fn(()=>{(i.value||c.value)&&(r.value=!1)});function m(){s.value&&(r.value=!r.value)}return{collapsed:r,collapsible:s,isLink:o,isActiveLink:i,hasActiveLink:c,hasChildren:d,toggle:m}}function ma(){const{hasSidebar:t}=Ve(),e=un("(min-width: 960px)"),n=un("(min-width: 1280px)");return{isAsideEnabled:V(()=>!n.value&&!e.value?!1:t.value?n.value:e.value)}}const pa=/\b(?:VPBadge|header-anchor|footnote-ref|ignore-header)\b/,pn=[];function br(t){return typeof t.outline=="object"&&!Array.isArray(t.outline)&&t.outline.label||t.outlineTitle||"On this page"}function Rn(t){const e=[...document.querySelectorAll(".VPDoc :where(h1,h2,h3,h4,h5,h6)")].filter(n=>n.id&&n.hasChildNodes()).map(n=>{const r=Number(n.tagName[1]);return{element:n,title:ha(n),link:"#"+n.id,level:r}});return ga(e,t)}function ha(t){let e="";for(const n of t.childNodes)if(n.nodeType===1){if(pa.test(n.className))continue;e+=n.textContent}else n.nodeType===3&&(e+=n.textContent);return e.trim()}function ga(t,e){if(e===!1)return[];const n=(typeof e=="object"&&!Array.isArray(e)?e.level:e)||2,[r,s]=typeof n=="number"?[n,n]:n==="deep"?[2,6]:n;return ba(t,r,s)}function va(t,e){const{isAsideEnabled:n}=ma(),r=Zs(o,100);let s=null;Me(()=>{requestAnimationFrame(o),window.addEventListener("scroll",r)}),Ls(()=>{i(location.hash)}),Gt(()=>{window.removeEventListener("scroll",r)});function o(){if(!n.value)return;const l=window.scrollY,c=window.innerHeight,d=document.body.offsetHeight,m=Math.abs(l+c-d)<1,p=pn.map(({element:g,link:w})=>({link:w,top:ya(g)})).filter(({top:g})=>!Number.isNaN(g)).sort((g,w)=>g.top-w.top);if(!p.length){i(null);return}if(l<1){i(null);return}if(m){i(p[p.length-1].link);return}let h=null;for(const{link:g,top:w}of p){if(w>l+Es()+4)break;h=g}i(h)}function i(l){s&&s.classList.remove("active"),l==null?s=null:s=t.value.querySelector(`a[href="${decodeURIComponent(l)}"]`);const c=s;c?(c.classList.add("active"),e.value.style.top=c.offsetTop+39+"px",e.value.style.opacity="1"):(e.value.style.top="33px",e.value.style.opacity="0")}}function ya(t){let e=0;for(;t!==document.body;){if(t===null)return NaN;e+=t.offsetTop,t=t.offsetParent}return e}function ba(t,e,n){pn.length=0;const r=[],s=[];return t.forEach(o=>{const i={...o,children:[]};let l=s[s.length-1];for(;l&&l.level>=i.level;)s.pop(),l=s[s.length-1];if(i.element.classList.contains("ignore-header")||l&&"shouldIgnore"in l){s.push({level:i.level,shouldIgnore:!0});return}i.level>n||i.level<e||(pn.push({element:i.element,link:i.link}),l?l.children.push(i):r.push(i),s.push(i))}),r}const wa=["href","title"],ka=L({__name:"VPDocOutlineItem",props:{headers:{},root:{type:Boolean}},setup(t){function e({target:n}){const r=n.href.split("#")[1],s=document.getElementById(decodeURIComponent(r));s==null||s.focus({preventScroll:!0})}return(n,r)=>{const s=rt("VPDocOutlineItem",!0);return v(),$("ul",{class:J(["VPDocOutlineItem",t.root?"root":"nested"])},[(v(!0),$(G,null,re(t.headers,({children:o,link:i,title:l})=>(v(),$("li",null,[_("a",{class:"outline-link",href:i,onClick:e,title:l},U(l),9,wa),o!=null&&o.length?(v(),T(s,{key:0,headers:o},null,8,["headers"])):C("",!0)]))),256))],2)}}}),wr=z(ka,[["__scopeId","data-v-ed1c7f2d"]]),xa={class:"content"},$a={"aria-level":"2",class:"outline-title",id:"doc-outline-aria-label",role:"heading"},_a=L({__name:"VPDocAsideOutline",setup(t){const{frontmatter:e,theme:n}=H(),r=dr([]);Qt(()=>{r.value=Rn(e.value.outline??n.value.outline)});const s=B(),o=B();return va(s,o),(i,l)=>(v(),$("nav",{"aria-labelledby":"doc-outline-aria-label",class:J(["VPDocAsideOutline",{"has-outline":r.value.length>0}]),ref_key:"container",ref:s},[_("div",xa,[_("div",{class:"outline-marker",ref_key:"marker",ref:o},null,512),_("div",$a,U(x(br)(x(n))),1),E(wr,{headers:r.value,root:!0},null,8,["headers"])])],2))}}),qa=z(_a,[["__scopeId","data-v-2cb521b5"]]),Sa={class:"VPDocAsideCarbonAds"},Fa=L({__name:"VPDocAsideCarbonAds",props:{carbonAds:{}},setup(t){const e=()=>null;return(n,r)=>(v(),$("div",Sa,[E(x(e),{"carbon-ads":t.carbonAds},null,8,["carbon-ads"])]))}}),ja={class:"VPDocAside"},Ra=L({__name:"VPDocAside",setup(t){const{theme:e}=H();return(n,r)=>(v(),$("div",ja,[q(n.$slots,"aside-top",{},void 0,!0),q(n.$slots,"aside-outline-before",{},void 0,!0),E(qa),q(n.$slots,"aside-outline-after",{},void 0,!0),r[0]||(r[0]=_("div",{class:"spacer"},null,-1)),q(n.$slots,"aside-ads-before",{},void 0,!0),x(e).carbonAds?(v(),T(Fa,{key:0,"carbon-ads":x(e).carbonAds},null,8,["carbon-ads"])):C("",!0),q(n.$slots,"aside-ads-after",{},void 0,!0),q(n.$slots,"aside-bottom",{},void 0,!0)]))}}),Ia=z(Ra,[["__scopeId","data-v-8841e271"]]);function Aa(){const{theme:t,page:e}=H();return V(()=>{const{text:n="Edit this page",pattern:r=""}=t.value.editLink||{};let s;return typeof r=="function"?s=r(e.value):s=r.replace(/:path/g,e.value.filePath),{url:s,text:n}})}function Pa(){const{page:t,theme:e,frontmatter:n}=H();return V(()=>{var d,m,p,h,g,w,k,S;const r=yr(e.value.sidebar,t.value.relativePath),s=ua(r),o=Ca(s,I=>I.link.replace(/[?#].*$/,"")),i=o.findIndex(I=>nt(t.value.relativePath,I.link)),l=((d=e.value.docFooter)==null?void 0:d.prev)===!1&&!n.value.prev||n.value.prev===!1,c=((m=e.value.docFooter)==null?void 0:m.next)===!1&&!n.value.next||n.value.next===!1;return{prev:l?void 0:{text:(typeof n.value.prev=="string"?n.value.prev:typeof n.value.prev=="object"?n.value.prev.text:void 0)??((p=o[i-1])==null?void 0:p.docFooterText)??((h=o[i-1])==null?void 0:h.text),link:(typeof n.value.prev=="object"?n.value.prev.link:void 0)??((g=o[i-1])==null?void 0:g.link)},next:c?void 0:{text:(typeof n.value.next=="string"?n.value.next:typeof n.value.next=="object"?n.value.next.text:void 0)??((w=o[i+1])==null?void 0:w.docFooterText)??((k=o[i+1])==null?void 0:k.text),link:(typeof n.value.next=="object"?n.value.next.link:void 0)??((S=o[i+1])==null?void 0:S.link)}}})}function Ca(t,e){const n=new Set;return t.filter(r=>{const s=e(r);return n.has(s)?!1:n.add(s)})}const Ae=L({__name:"VPLink",props:{tag:{},href:{},noIcon:{type:Boolean},target:{},rel:{}},setup(t){const e=t,n=V(()=>e.tag??(e.href?"a":"span")),r=V(()=>e.href&&fr.test(e.href)||e.target==="_blank");return(s,o)=>(v(),T(Ie(n.value),{class:J(["VPLink",{link:t.href,"vp-external-link-icon":r.value,"no-icon":t.noIcon}]),href:t.href?x(jn)(t.href):void 0,target:t.target??(r.value?"_blank":void 0),rel:t.rel??(r.value?"noreferrer":void 0)},{default:F(()=>[q(s.$slots,"default")]),_:3},8,["class","href","target","rel"]))}}),Ma={class:"VPLastUpdated"},Na=["datetime"],La=L({__name:"VPDocFooterLastUpdated",setup(t){const{theme:e,page:n,lang:r}=H(),s=V(()=>new Date(n.value.lastUpdated)),o=V(()=>s.value.toISOString()),i=B("");return Me(()=>{Jt(()=>{var l,c,d;i.value=new Intl.DateTimeFormat((c=(l=e.value.lastUpdated)==null?void 0:l.formatOptions)!=null&&c.forceLocale?r.value:void 0,((d=e.value.lastUpdated)==null?void 0:d.formatOptions)??{dateStyle:"short",timeStyle:"short"}).format(s.value)})}),(l,c)=>{var d;return v(),$("p",Ma,[Te(U(((d=x(e).lastUpdated)==null?void 0:d.text)||x(e).lastUpdatedText||"Last updated")+": ",1),_("time",{datetime:o.value},U(i.value),9,Na)])}}}),Ea=z(La,[["__scopeId","data-v-6cd1b085"]]),Ta={key:0,class:"VPDocFooter"},za={key:0,class:"edit-info"},Va={key:0,class:"edit-link"},Da={key:1,class:"last-updated"},Ba={key:1,class:"prev-next","aria-labelledby":"doc-footer-aria-label"},Oa={class:"pager"},Ha=["innerHTML"],Ua=["innerHTML"],Wa={class:"pager"},Ka=["innerHTML"],Ja=["innerHTML"],Ga=L({__name:"VPDocFooter",setup(t){const{theme:e,page:n,frontmatter:r}=H(),s=Aa(),o=Pa(),i=V(()=>e.value.editLink&&r.value.editLink!==!1),l=V(()=>n.value.lastUpdated),c=V(()=>i.value||l.value||o.value.prev||o.value.next);return(d,m)=>{var p,h,g,w;return c.value?(v(),$("footer",Ta,[q(d.$slots,"doc-footer-before",{},void 0,!0),i.value||l.value?(v(),$("div",za,[i.value?(v(),$("div",Va,[E(Ae,{class:"edit-link-button",href:x(s).url,"no-icon":!0},{default:F(()=>[m[0]||(m[0]=_("span",{class:"vpi-square-pen edit-link-icon"},null,-1)),Te(" "+U(x(s).text),1)]),_:1},8,["href"])])):C("",!0),l.value?(v(),$("div",Da,[E(Ea)])):C("",!0)])):C("",!0),(p=x(o).prev)!=null&&p.link||(h=x(o).next)!=null&&h.link?(v(),$("nav",Ba,[m[1]||(m[1]=_("span",{class:"visually-hidden",id:"doc-footer-aria-label"},"Pager",-1)),_("div",Oa,[(g=x(o).prev)!=null&&g.link?(v(),T(Ae,{key:0,class:"pager-link prev",href:x(o).prev.link},{default:F(()=>{var k;return[_("span",{class:"desc",innerHTML:((k=x(e).docFooter)==null?void 0:k.prev)||"Previous page"},null,8,Ha),_("span",{class:"title",innerHTML:x(o).prev.text},null,8,Ua)]}),_:1},8,["href"])):C("",!0)]),_("div",Wa,[(w=x(o).next)!=null&&w.link?(v(),T(Ae,{key:0,class:"pager-link next",href:x(o).next.link},{default:F(()=>{var k;return[_("span",{class:"desc",innerHTML:((k=x(e).docFooter)==null?void 0:k.next)||"Next page"},null,8,Ka),_("span",{class:"title",innerHTML:x(o).next.text},null,8,Ja)]}),_:1},8,["href"])):C("",!0)])])):C("",!0)])):C("",!0)}}}),Qa=z(Ga,[["__scopeId","data-v-d4991f0c"]]),Ya={class:"container"},Xa={class:"aside-container"},Za={class:"aside-content"},eo={class:"content"},to={class:"content-container"},no={class:"main"},ro=L({__name:"VPDoc",setup(t){const{theme:e}=H(),n=Yt(),{hasSidebar:r,hasAside:s,leftAside:o}=Ve(),i=V(()=>n.path.replace(/[./]+/g,"_").replace(/_html$/,""));return(l,c)=>{const d=rt("Content");return v(),$("div",{class:J(["VPDoc",{"has-sidebar":x(r),"has-aside":x(s)}])},[q(l.$slots,"doc-top",{},void 0,!0),_("div",Ya,[x(s)?(v(),$("div",{key:0,class:J(["aside",{"left-aside":x(o)}])},[c[0]||(c[0]=_("div",{class:"aside-curtain"},null,-1)),_("div",Xa,[_("div",Za,[E(Ia,null,{"aside-top":F(()=>[q(l.$slots,"aside-top",{},void 0,!0)]),"aside-bottom":F(()=>[q(l.$slots,"aside-bottom",{},void 0,!0)]),"aside-outline-before":F(()=>[q(l.$slots,"aside-outline-before",{},void 0,!0)]),"aside-outline-after":F(()=>[q(l.$slots,"aside-outline-after",{},void 0,!0)]),"aside-ads-before":F(()=>[q(l.$slots,"aside-ads-before",{},void 0,!0)]),"aside-ads-after":F(()=>[q(l.$slots,"aside-ads-after",{},void 0,!0)]),_:3})])])],2)):C("",!0),_("div",eo,[_("div",to,[q(l.$slots,"doc-before",{},void 0,!0),_("main",no,[E(d,{class:J(["vp-doc",[i.value,x(e).externalLinkIcon&&"external-link-icon-enabled"]])},null,8,["class"])]),E(Qa,null,{"doc-footer-before":F(()=>[q(l.$slots,"doc-footer-before",{},void 0,!0)]),_:3}),q(l.$slots,"doc-after",{},void 0,!0)])])]),q(l.$slots,"doc-bottom",{},void 0,!0)],2)}}}),so=z(ro,[["__scopeId","data-v-3a11e7bd"]]),ao=L({__name:"VPButton",props:{tag:{},size:{default:"medium"},theme:{default:"brand"},text:{},href:{},target:{},rel:{}},setup(t){const e=t,n=V(()=>e.href&&fr.test(e.href)),r=V(()=>e.tag||(e.href?"a":"button"));return(s,o)=>(v(),T(Ie(r.value),{class:J(["VPButton",[t.size,t.theme]]),href:t.href?x(jn)(t.href):void 0,target:e.target??(n.value?"_blank":void 0),rel:e.rel??(n.value?"noreferrer":void 0)},{default:F(()=>[Te(U(t.text),1)]),_:1},8,["class","href","target","rel"]))}}),oo=z(ao,[["__scopeId","data-v-e69c7c41"]]),io=["src","alt"],lo=L({inheritAttrs:!1,__name:"VPImage",props:{image:{},alt:{}},setup(t){return(e,n)=>{const r=rt("VPImage",!0);return t.image?(v(),$(G,{key:0},[typeof t.image=="string"||"src"in t.image?(v(),$("img",He({key:0,class:"VPImage"},typeof t.image=="string"?e.$attrs:{...t.image,...e.$attrs},{src:x(Sn)(typeof t.image=="string"?t.image:t.image.src),alt:t.alt??(typeof t.image=="string"?"":t.image.alt||"")}),null,16,io)):(v(),$(G,{key:1},[E(r,He({class:"dark",image:t.image.dark,alt:t.image.alt},e.$attrs),null,16,["image","alt"]),E(r,He({class:"light",image:t.image.light,alt:t.image.alt},e.$attrs),null,16,["image","alt"])],64))],64)):C("",!0)}}}),Vt=z(lo,[["__scopeId","data-v-b88f42d0"]]),co={class:"container"},uo={class:"main"},fo={class:"heading"},mo=["innerHTML"],po=["innerHTML"],ho=["innerHTML"],go={key:0,class:"actions"},vo={key:0,class:"image"},yo={class:"image-container"},bo=L({__name:"VPHero",props:{name:{},text:{},tagline:{},image:{},actions:{}},setup(t){const e=Xt("hero-image-slot-exists");return(n,r)=>(v(),$("div",{class:J(["VPHero",{"has-image":t.image||x(e)}])},[_("div",co,[_("div",uo,[q(n.$slots,"home-hero-info-before",{},void 0,!0),q(n.$slots,"home-hero-info",{},()=>[_("h1",fo,[t.name?(v(),$("span",{key:0,innerHTML:t.name,class:"name clip"},null,8,mo)):C("",!0),t.text?(v(),$("span",{key:1,innerHTML:t.text,class:"text"},null,8,po)):C("",!0)]),t.tagline?(v(),$("p",{key:0,innerHTML:t.tagline,class:"tagline"},null,8,ho)):C("",!0)],!0),q(n.$slots,"home-hero-info-after",{},void 0,!0),t.actions?(v(),$("div",go,[(v(!0),$(G,null,re(t.actions,s=>(v(),$("div",{key:s.link,class:"action"},[E(oo,{tag:"a",size:"medium",theme:s.theme,text:s.text,href:s.link,target:s.target,rel:s.rel},null,8,["theme","text","href","target","rel"])]))),128))])):C("",!0),q(n.$slots,"home-hero-actions-after",{},void 0,!0)]),t.image||x(e)?(v(),$("div",vo,[_("div",yo,[r[0]||(r[0]=_("div",{class:"image-bg"},null,-1)),q(n.$slots,"home-hero-image",{},()=>[t.image?(v(),T(Vt,{key:0,class:"image-src",image:t.image},null,8,["image"])):C("",!0)],!0)])])):C("",!0)])],2))}}),wo=z(bo,[["__scopeId","data-v-a1e7b2bc"]]),ko=L({__name:"VPHomeHero",setup(t){const{frontmatter:e}=H();return(n,r)=>x(e).hero?(v(),T(wo,{key:0,class:"VPHomeHero",name:x(e).hero.name,text:x(e).hero.text,tagline:x(e).hero.tagline,image:x(e).hero.image,actions:x(e).hero.actions},{"home-hero-info-before":F(()=>[q(n.$slots,"home-hero-info-before")]),"home-hero-info":F(()=>[q(n.$slots,"home-hero-info")]),"home-hero-info-after":F(()=>[q(n.$slots,"home-hero-info-after")]),"home-hero-actions-after":F(()=>[q(n.$slots,"home-hero-actions-after")]),"home-hero-image":F(()=>[q(n.$slots,"home-hero-image")]),_:3},8,["name","text","tagline","image","actions"])):C("",!0)}}),xo={class:"box"},$o={key:0,class:"icon"},_o=["innerHTML"],qo=["innerHTML"],So=["innerHTML"],Fo={key:4,class:"link-text"},jo={class:"link-text-value"},Ro=L({__name:"VPFeature",props:{icon:{},title:{},details:{},link:{},linkText:{},rel:{},target:{}},setup(t){return(e,n)=>(v(),T(Ae,{class:"VPFeature",href:t.link,rel:t.rel,target:t.target,"no-icon":!0,tag:t.link?"a":"div"},{default:F(()=>[_("article",xo,[typeof t.icon=="object"&&t.icon.wrap?(v(),$("div",$o,[E(Vt,{image:t.icon,alt:t.icon.alt,height:t.icon.height||48,width:t.icon.width||48},null,8,["image","alt","height","width"])])):typeof t.icon=="object"?(v(),T(Vt,{key:1,image:t.icon,alt:t.icon.alt,height:t.icon.height||48,width:t.icon.width||48},null,8,["image","alt","height","width"])):t.icon?(v(),$("div",{key:2,class:"icon",innerHTML:t.icon},null,8,_o)):C("",!0),_("h2",{class:"title",innerHTML:t.title},null,8,qo),t.details?(v(),$("p",{key:3,class:"details",innerHTML:t.details},null,8,So)):C("",!0),t.linkText?(v(),$("div",Fo,[_("p",jo,[Te(U(t.linkText)+" ",1),n[0]||(n[0]=_("span",{class:"vpi-arrow-right link-text-icon"},null,-1))])])):C("",!0)])]),_:1},8,["href","rel","target","tag"]))}}),Io=z(Ro,[["__scopeId","data-v-38cedf3e"]]),Ao={key:0,class:"VPFeatures"},Po={class:"container"},Co={class:"items"},Mo=L({__name:"VPFeatures",props:{features:{}},setup(t){const e=t,n=V(()=>{const r=e.features.length;if(r){if(r===2)return"grid-2";if(r===3)return"grid-3";if(r%3===0)return"grid-6";if(r>3)return"grid-4"}else return});return(r,s)=>t.features?(v(),$("div",Ao,[_("div",Po,[_("div",Co,[(v(!0),$(G,null,re(t.features,o=>(v(),$("div",{key:o.title,class:J(["item",[n.value]])},[E(Io,{icon:o.icon,title:o.title,details:o.details,link:o.link,"link-text":o.linkText,rel:o.rel,target:o.target},null,8,["icon","title","details","link","link-text","rel","target"])],2))),128))])])])):C("",!0)}}),No=z(Mo,[["__scopeId","data-v-9ca5470b"]]),Lo=L({__name:"VPHomeFeatures",setup(t){const{frontmatter:e}=H();return(n,r)=>x(e).features?(v(),T(No,{key:0,class:"VPHomeFeatures",features:x(e).features},null,8,["features"])):C("",!0)}}),Eo=L({__name:"VPHomeContent",setup(t){const{width:e}=Ts({initialWidth:0,includeScrollbar:!1});return(n,r)=>(v(),$("div",{class:"vp-doc container",style:mr(x(e)?{"--vp-offset":`calc(50% - ${x(e)/2}px)`}:{})},[q(n.$slots,"default",{},void 0,!0)],4))}}),To=z(Eo,[["__scopeId","data-v-698d995c"]]),zo=L({__name:"VPHome",setup(t){const{frontmatter:e,theme:n}=H();return(r,s)=>{const o=rt("Content");return v(),$("div",{class:J(["VPHome",{"external-link-icon-enabled":x(n).externalLinkIcon}])},[q(r.$slots,"home-hero-before",{},void 0,!0),E(ko,null,{"home-hero-info-before":F(()=>[q(r.$slots,"home-hero-info-before",{},void 0,!0)]),"home-hero-info":F(()=>[q(r.$slots,"home-hero-info",{},void 0,!0)]),"home-hero-info-after":F(()=>[q(r.$slots,"home-hero-info-after",{},void 0,!0)]),"home-hero-actions-after":F(()=>[q(r.$slots,"home-hero-actions-after",{},void 0,!0)]),"home-hero-image":F(()=>[q(r.$slots,"home-hero-image",{},void 0,!0)]),_:3}),q(r.$slots,"home-hero-after",{},void 0,!0),q(r.$slots,"home-features-before",{},void 0,!0),E(Lo),q(r.$slots,"home-features-after",{},void 0,!0),x(e).markdownStyles!==!1?(v(),T(To,{key:0},{default:F(()=>[E(o)]),_:1})):(v(),T(o,{key:1}))],2)}}}),Vo=z(zo,[["__scopeId","data-v-426e7d0d"]]),Do={},Bo={class:"VPPage"};function Oo(t,e){const n=rt("Content");return v(),$("div",Bo,[q(t.$slots,"page-top"),E(n),q(t.$slots,"page-bottom")])}const Ho=z(Do,[["render",Oo]]),Uo=L({__name:"VPContent",setup(t){const{page:e,frontmatter:n}=H(),{hasSidebar:r}=Ve();return(s,o)=>(v(),$("div",{class:J(["VPContent",{"has-sidebar":x(r),"is-home":x(n).layout==="home"}]),id:"VPContent"},[x(e).isNotFound?q(s.$slots,"not-found",{key:0},()=>[E(la)],!0):x(n).layout==="page"?(v(),T(Ho,{key:1},{"page-top":F(()=>[q(s.$slots,"page-top",{},void 0,!0)]),"page-bottom":F(()=>[q(s.$slots,"page-bottom",{},void 0,!0)]),_:3})):x(n).layout==="home"?(v(),T(Vo,{key:2},{"home-hero-before":F(()=>[q(s.$slots,"home-hero-before",{},void 0,!0)]),"home-hero-info-before":F(()=>[q(s.$slots,"home-hero-info-before",{},void 0,!0)]),"home-hero-info":F(()=>[q(s.$slots,"home-hero-info",{},void 0,!0)]),"home-hero-info-after":F(()=>[q(s.$slots,"home-hero-info-after",{},void 0,!0)]),"home-hero-actions-after":F(()=>[q(s.$slots,"home-hero-actions-after",{},void 0,!0)]),"home-hero-image":F(()=>[q(s.$slots,"home-hero-image",{},void 0,!0)]),"home-hero-after":F(()=>[q(s.$slots,"home-hero-after",{},void 0,!0)]),"home-features-before":F(()=>[q(s.$slots,"home-features-before",{},void 0,!0)]),"home-features-after":F(()=>[q(s.$slots,"home-features-after",{},void 0,!0)]),_:3})):x(n).layout&&x(n).layout!=="doc"?(v(),T(Ie(x(n).layout),{key:3})):(v(),T(so,{key:4},{"doc-top":F(()=>[q(s.$slots,"doc-top",{},void 0,!0)]),"doc-bottom":F(()=>[q(s.$slots,"doc-bottom",{},void 0,!0)]),"doc-footer-before":F(()=>[q(s.$slots,"doc-footer-before",{},void 0,!0)]),"doc-before":F(()=>[q(s.$slots,"doc-before",{},void 0,!0)]),"doc-after":F(()=>[q(s.$slots,"doc-after",{},void 0,!0)]),"aside-top":F(()=>[q(s.$slots,"aside-top",{},void 0,!0)]),"aside-outline-before":F(()=>[q(s.$slots,"aside-outline-before",{},void 0,!0)]),"aside-outline-after":F(()=>[q(s.$slots,"aside-outline-after",{},void 0,!0)]),"aside-ads-before":F(()=>[q(s.$slots,"aside-ads-before",{},void 0,!0)]),"aside-ads-after":F(()=>[q(s.$slots,"aside-ads-after",{},void 0,!0)]),"aside-bottom":F(()=>[q(s.$slots,"aside-bottom",{},void 0,!0)]),_:3}))],2))}}),Wo=z(Uo,[["__scopeId","data-v-16a57b2e"]]),Ko={class:"container"},Jo=["innerHTML"],Go=["innerHTML"],Qo=L({__name:"VPFooter",setup(t){const{theme:e,frontmatter:n}=H(),{hasSidebar:r}=Ve();return(s,o)=>x(e).footer&&x(n).footer!==!1?(v(),$("footer",{key:0,class:J(["VPFooter",{"has-sidebar":x(r)}])},[_("div",Ko,[x(e).footer.message?(v(),$("p",{key:0,class:"message",innerHTML:x(e).footer.message},null,8,Jo)):C("",!0),x(e).footer.copyright?(v(),$("p",{key:1,class:"copyright",innerHTML:x(e).footer.copyright},null,8,Go)):C("",!0)])],2)):C("",!0)}}),Yo=z(Qo,[["__scopeId","data-v-20c107c2"]]);function Xo(){const{theme:t,frontmatter:e}=H(),n=dr([]),r=V(()=>n.value.length>0);return Qt(()=>{n.value=Rn(e.value.outline??t.value.outline)}),{headers:n,hasLocalNav:r}}const Zo={class:"menu-text"},ei={class:"header"},ti={class:"outline"},ni=L({__name:"VPLocalNavOutlineDropdown",props:{headers:{},navHeight:{}},setup(t){const e=t,{theme:n}=H(),r=B(!1),s=B(0),o=B(),i=B();function l(p){var h;(h=o.value)!=null&&h.contains(p.target)||(r.value=!1)}Pe(r,p=>{if(p){document.addEventListener("click",l);return}document.removeEventListener("click",l)}),dn("Escape",()=>{r.value=!1}),Qt(()=>{r.value=!1});function c(){r.value=!r.value,s.value=window.innerHeight+Math.min(window.scrollY-e.navHeight,0)}function d(p){p.target.classList.contains("outline-link")&&(i.value&&(i.value.style.transition="none"),ut(()=>{r.value=!1}))}function m(){r.value=!1,window.scrollTo({top:0,left:0,behavior:"smooth"})}return(p,h)=>(v(),$("div",{class:"VPLocalNavOutlineDropdown",style:mr({"--vp-vh":s.value+"px"}),ref_key:"main",ref:o},[t.headers.length>0?(v(),$("button",{key:0,onClick:c,class:J({open:r.value})},[_("span",Zo,U(x(br)(x(n))),1),h[0]||(h[0]=_("span",{class:"vpi-chevron-right icon"},null,-1))],2)):(v(),$("button",{key:1,onClick:m},U(x(n).returnToTopLabel||"Return to top"),1)),E(qn,{name:"flyout"},{default:F(()=>[r.value?(v(),$("div",{key:0,ref_key:"items",ref:i,class:"items",onClick:d},[_("div",ei,[_("a",{class:"top-link",href:"#",onClick:m},U(x(n).returnToTopLabel||"Return to top"),1)]),_("div",ti,[E(wr,{headers:t.headers},null,8,["headers"])])],512)):C("",!0)]),_:1})],4))}}),ri=z(ni,[["__scopeId","data-v-1729125c"]]),si={class:"container"},ai=["aria-expanded"],oi={class:"menu-text"},ii=L({__name:"VPLocalNav",props:{open:{type:Boolean}},emits:["open-menu"],setup(t){const{theme:e,frontmatter:n}=H(),{hasSidebar:r}=Ve(),{headers:s}=Xo(),{y:o}=pr(),i=B(0);Me(()=>{i.value=parseInt(getComputedStyle(document.documentElement).getPropertyValue("--vp-nav-height"))}),Qt(()=>{s.value=Rn(n.value.outline??e.value.outline)});const l=V(()=>s.value.length===0),c=V(()=>l.value&&!r.value),d=V(()=>({VPLocalNav:!0,"has-sidebar":r.value,empty:l.value,fixed:c.value}));return(m,p)=>x(n).layout!=="home"&&(!c.value||x(o)>=i.value)?(v(),$("div",{key:0,class:J(d.value)},[_("div",si,[x(r)?(v(),$("button",{key:0,class:"menu","aria-expanded":t.open,"aria-controls":"VPSidebarNav",onClick:p[0]||(p[0]=h=>m.$emit("open-menu"))},[p[1]||(p[1]=_("span",{class:"vpi-align-left menu-icon"},null,-1)),_("span",oi,U(x(e).sidebarMenuLabel||"Menu"),1)],8,ai)):C("",!0),E(ri,{headers:x(s),navHeight:i.value},null,8,["headers","navHeight"])])],2)):C("",!0)}}),li=z(ii,[["__scopeId","data-v-c2d42e0a"]]);function ci(){const t=B(!1);function e(){t.value=!0,window.addEventListener("resize",s)}function n(){t.value=!1,window.removeEventListener("resize",s)}function r(){t.value?n():e()}function s(){window.outerWidth>=768&&n()}const o=Yt();return Pe(()=>o.path,n),{isScreenOpen:t,openScreen:e,closeScreen:n,toggleScreen:r}}const ui={},di={class:"VPSwitch",type:"button",role:"switch"},fi={class:"check"},mi={key:0,class:"icon"};function pi(t,e){return v(),$("button",di,[_("span",fi,[t.$slots.default?(v(),$("span",mi,[q(t.$slots,"default",{},void 0,!0)])):C("",!0)])])}const hi=z(ui,[["render",pi],["__scopeId","data-v-66b269f0"]]),gi=L({__name:"VPSwitchAppearance",setup(t){const{isDark:e,theme:n}=H(),r=Xt("toggle-appearance",()=>{e.value=!e.value}),s=B("");return Fn(()=>{s.value=e.value?n.value.lightModeSwitchTitle||"Switch to light theme":n.value.darkModeSwitchTitle||"Switch to dark theme"}),(o,i)=>(v(),T(hi,{title:s.value,class:"VPSwitchAppearance","aria-checked":x(e),onClick:x(r)},{default:F(()=>[...i[0]||(i[0]=[_("span",{class:"vpi-sun sun"},null,-1),_("span",{class:"vpi-moon moon"},null,-1)])]),_:1},8,["title","aria-checked","onClick"]))}}),In=z(gi,[["__scopeId","data-v-02d7ca0d"]]),vi={key:0,class:"VPNavBarAppearance"},yi=L({__name:"VPNavBarAppearance",setup(t){const{site:e}=H();return(n,r)=>x(e).appearance&&x(e).appearance!=="force-dark"&&x(e).appearance!=="force-auto"?(v(),$("div",vi,[E(In)])):C("",!0)}}),bi=z(yi,[["__scopeId","data-v-2437d53a"]]),An=B();let kr=!1,sn=0;function wi(t){const e=B(!1);if(Zt){!kr&&ki(),sn++;const n=Pe(An,r=>{var s,o,i;r===t.el.value||(s=t.el.value)!=null&&s.contains(r)?(e.value=!0,(o=t.onFocus)==null||o.call(t)):(e.value=!1,(i=t.onBlur)==null||i.call(t))});Gt(()=>{n(),sn--,sn||xi()})}return zs(e)}function ki(){document.addEventListener("focusin",xr),kr=!0,An.value=document.activeElement}function xi(){document.removeEventListener("focusin",xr)}function xr(){An.value=document.activeElement}const $i={class:"VPMenuLink"},_i=["innerHTML"],qi=L({__name:"VPMenuLink",props:{item:{}},setup(t){const{page:e}=H();return(n,r)=>(v(),$("div",$i,[E(Ae,{class:J({active:x(nt)(x(e).relativePath,t.item.activeMatch||t.item.link,!!t.item.activeMatch)}),href:t.item.link,target:t.item.target,rel:t.item.rel,"no-icon":t.item.noIcon},{default:F(()=>[_("span",{innerHTML:t.item.text},null,8,_i)]),_:1},8,["class","href","target","rel","no-icon"])]))}}),en=z(qi,[["__scopeId","data-v-f228a484"]]),Si={class:"VPMenuGroup"},Fi={key:0,class:"title"},ji=L({__name:"VPMenuGroup",props:{text:{},items:{}},setup(t){return(e,n)=>(v(),$("div",Si,[t.text?(v(),$("p",Fi,U(t.text),1)):C("",!0),(v(!0),$(G,null,re(t.items,r=>(v(),$(G,null,["link"in r?(v(),T(en,{key:0,item:r},null,8,["item"])):C("",!0)],64))),256))]))}}),Ri=z(ji,[["__scopeId","data-v-f00a4068"]]),Ii={class:"VPMenu"},Ai={key:0,class:"items"},Pi=L({__name:"VPMenu",props:{items:{}},setup(t){return(e,n)=>(v(),$("div",Ii,[t.items?(v(),$("div",Ai,[(v(!0),$(G,null,re(t.items,r=>(v(),$(G,{key:JSON.stringify(r)},["link"in r?(v(),T(en,{key:0,item:r},null,8,["item"])):"component"in r?(v(),T(Ie(r.component),He({key:1,ref_for:!0},r.props),null,16)):(v(),T(Ri,{key:2,text:r.text,items:r.items},null,8,["text","items"]))],64))),128))])):C("",!0),q(e.$slots,"default",{},void 0,!0)]))}}),Ci=z(Pi,[["__scopeId","data-v-9da83e6c"]]),Mi=["aria-expanded","aria-label"],Ni={key:0,class:"text"},Li=["innerHTML"],Ei={key:1,class:"vpi-more-horizontal icon"},Ti={class:"menu"},zi=L({__name:"VPFlyout",props:{icon:{},button:{},label:{},items:{}},setup(t){const e=B(!1),n=B();wi({el:n,onBlur:r});function r(){e.value=!1}return(s,o)=>(v(),$("div",{class:"VPFlyout",ref_key:"el",ref:n,onMouseenter:o[1]||(o[1]=i=>e.value=!0),onMouseleave:o[2]||(o[2]=i=>e.value=!1)},[_("button",{type:"button",class:"button","aria-haspopup":"true","aria-expanded":e.value,"aria-label":t.label,onClick:o[0]||(o[0]=i=>e.value=!e.value)},[t.button||t.icon?(v(),$("span",Ni,[t.icon?(v(),$("span",{key:0,class:J([t.icon,"option-icon"])},null,2)):C("",!0),t.button?(v(),$("span",{key:1,innerHTML:t.button},null,8,Li)):C("",!0),o[3]||(o[3]=_("span",{class:"vpi-chevron-down text-icon"},null,-1))])):(v(),$("span",Ei))],8,Mi),_("div",Ti,[E(Ci,{items:t.items},{default:F(()=>[q(s.$slots,"default",{},void 0,!0)]),_:3},8,["items"])])],544))}}),Pn=z(zi,[["__scopeId","data-v-92e4a1d9"]]),Vi=["href","aria-label","innerHTML"],Di=L({__name:"VPSocialLink",props:{icon:{},link:{},ariaLabel:{}},setup(t){const e=t,n=B();Me(async()=>{var o;await ut();const s=(o=n.value)==null?void 0:o.children[0];s instanceof HTMLElement&&s.className.startsWith("vpi-social-")&&(getComputedStyle(s).maskImage||getComputedStyle(s).webkitMaskImage)==="none"&&s.style.setProperty("--icon",`url('https://api.iconify.design/simple-icons/${e.icon}.svg')`)});const r=V(()=>typeof e.icon=="object"?e.icon.svg:`<span class="vpi-social-${e.icon}"></span>`);return(s,o)=>(v(),$("a",{ref_key:"el",ref:n,class:"VPSocialLink no-icon",href:t.link,"aria-label":t.ariaLabel??(typeof t.icon=="string"?t.icon:""),target:"_blank",rel:"noopener",innerHTML:r.value},null,8,Vi))}}),Bi=z(Di,[["__scopeId","data-v-7bb1bdf6"]]),Oi={class:"VPSocialLinks"},Hi=L({__name:"VPSocialLinks",props:{links:{}},setup(t){return(e,n)=>(v(),$("div",Oi,[(v(!0),$(G,null,re(t.links,({link:r,icon:s,ariaLabel:o})=>(v(),T(Bi,{key:r,icon:s,link:r,ariaLabel:o},null,8,["icon","link","ariaLabel"]))),128))]))}}),Cn=z(Hi,[["__scopeId","data-v-705a295a"]]),Ui={key:0,class:"group translations"},Wi={class:"trans-title"},Ki={key:1,class:"group"},Ji={class:"item appearance"},Gi={class:"label"},Qi={class:"appearance-action"},Yi={key:2,class:"group"},Xi={class:"item social-links"},Zi=L({__name:"VPNavBarExtra",setup(t){const{site:e,theme:n}=H(),{localeLinks:r,currentLang:s}=_t({correspondingLink:!0}),o=V(()=>r.value.length&&s.value.label||e.value.appearance||n.value.socialLinks);return(i,l)=>o.value?(v(),T(Pn,{key:0,class:"VPNavBarExtra",label:"extra navigation"},{default:F(()=>[x(r).length&&x(s).label?(v(),$("div",Ui,[_("p",Wi,U(x(s).label),1),(v(!0),$(G,null,re(x(r),c=>(v(),T(en,{key:c.link,item:c},null,8,["item"]))),128))])):C("",!0),x(e).appearance&&x(e).appearance!=="force-dark"&&x(e).appearance!=="force-auto"?(v(),$("div",Ki,[_("div",Ji,[_("p",Gi,U(x(n).darkModeSwitchLabel||"Appearance"),1),_("div",Qi,[E(In)])])])):C("",!0),x(n).socialLinks?(v(),$("div",Yi,[_("div",Xi,[E(Cn,{class:"social-links-list",links:x(n).socialLinks},null,8,["links"])])])):C("",!0)]),_:1})):C("",!0)}}),el=z(Zi,[["__scopeId","data-v-30fda728"]]),tl=["aria-expanded"],nl=L({__name:"VPNavBarHamburger",props:{active:{type:Boolean}},emits:["click"],setup(t){return(e,n)=>(v(),$("button",{type:"button",class:J(["VPNavBarHamburger",{active:t.active}]),"aria-label":"mobile navigation","aria-expanded":t.active,"aria-controls":"VPNavScreen",onClick:n[0]||(n[0]=r=>e.$emit("click"))},[...n[1]||(n[1]=[_("span",{class:"container"},[_("span",{class:"top"}),_("span",{class:"middle"}),_("span",{class:"bottom"})],-1)])],10,tl))}}),rl=z(nl,[["__scopeId","data-v-a1953a23"]]),sl=["innerHTML"],al=L({__name:"VPNavBarMenuLink",props:{item:{}},setup(t){const{page:e}=H();return(n,r)=>(v(),T(Ae,{class:J({VPNavBarMenuLink:!0,active:x(nt)(x(e).relativePath,t.item.activeMatch||t.item.link,!!t.item.activeMatch)}),href:t.item.link,target:t.item.target,rel:t.item.rel,"no-icon":t.item.noIcon,tabindex:"0"},{default:F(()=>[_("span",{innerHTML:t.item.text},null,8,sl)]),_:1},8,["class","href","target","rel","no-icon"]))}}),ol=z(al,[["__scopeId","data-v-202a4d27"]]),il=L({__name:"VPNavBarMenuGroup",props:{item:{}},setup(t){const e=t,{page:n}=H(),r=o=>"component"in o?!1:"link"in o?nt(n.value.relativePath,o.link,!!e.item.activeMatch):o.items.some(r),s=V(()=>r(e.item));return(o,i)=>(v(),T(Pn,{class:J({VPNavBarMenuGroup:!0,active:x(nt)(x(n).relativePath,t.item.activeMatch,!!t.item.activeMatch)||s.value}),button:t.item.text,items:t.item.items},null,8,["class","button","items"]))}}),ll={key:0,"aria-labelledby":"main-nav-aria-label",class:"VPNavBarMenu"},cl=L({__name:"VPNavBarMenu",setup(t){const{theme:e}=H();return(n,r)=>x(e).nav?(v(),$("nav",ll,[r[0]||(r[0]=_("span",{id:"main-nav-aria-label",class:"visually-hidden"}," Main Navigation ",-1)),(v(!0),$(G,null,re(x(e).nav,s=>(v(),$(G,{key:JSON.stringify(s)},["link"in s?(v(),T(ol,{key:0,item:s},null,8,["item"])):"component"in s?(v(),T(Ie(s.component),He({key:1,ref_for:!0},s.props),null,16)):(v(),T(il,{key:2,item:s},null,8,["item"]))],64))),128))])):C("",!0)}}),ul=z(cl,[["__scopeId","data-v-2926564b"]]);function dl(t){const{localeIndex:e,theme:n}=H();function r(s){var w,k,S;const o=s.split("."),i=(w=n.value.search)==null?void 0:w.options,l=i&&typeof i=="object",c=l&&((S=(k=i.locales)==null?void 0:k[e.value])==null?void 0:S.translations)||null,d=l&&i.translations||null;let m=c,p=d,h=t;const g=o.pop();for(const I of o){let N=null;const P=h==null?void 0:h[I];P&&(N=h=P);const D=p==null?void 0:p[I];D&&(N=p=D);const A=m==null?void 0:m[I];A&&(N=m=A),P||(h=N),D||(p=N),A||(m=N)}return(m==null?void 0:m[g])??(p==null?void 0:p[g])??(h==null?void 0:h[g])??""}return r}const fl=["aria-label"],ml={class:"DocSearch-Button-Container"},pl={class:"DocSearch-Button-Placeholder"},Jn=L({__name:"VPNavBarSearchButton",setup(t){const n=dl({button:{buttonText:"Search",buttonAriaLabel:"Search"}});return(r,s)=>(v(),$("button",{type:"button",class:"DocSearch DocSearch-Button","aria-label":x(n)("button.buttonAriaLabel")},[_("span",ml,[s[0]||(s[0]=_("span",{class:"vp-icon DocSearch-Search-Icon"},null,-1)),_("span",pl,U(x(n)("button.buttonText")),1)]),s[1]||(s[1]=_("span",{class:"DocSearch-Button-Keys"},[_("kbd",{class:"DocSearch-Button-Key"}),_("kbd",{class:"DocSearch-Button-Key"},"K")],-1))],8,fl))}}),hl={class:"VPNavBarSearch"},gl={id:"local-search"},vl={key:1,id:"docsearch"},yl=L({__name:"VPNavBarSearch",setup(t){const e=Vs(()=>Pt(()=>import("./VPLocalSearchBox.on8hem7A.js"),__vite__mapDeps([0,1]))),n=()=>null,{theme:r}=H(),s=B(!1),o=B(!1);Me(()=>{});function i(){s.value||(s.value=!0,setTimeout(l,16))}function l(){const p=new Event("keydown");p.key="k",p.metaKey=!0,window.dispatchEvent(p),setTimeout(()=>{document.querySelector(".DocSearch-Modal")||l()},16)}function c(p){const h=p.target,g=h.tagName;return h.isContentEditable||g==="INPUT"||g==="SELECT"||g==="TEXTAREA"}const d=B(!1);dn("k",p=>{(p.ctrlKey||p.metaKey)&&(p.preventDefault(),d.value=!0)}),dn("/",p=>{c(p)||(p.preventDefault(),d.value=!0)});const m="local";return(p,h)=>{var g;return v(),$("div",hl,[x(m)==="local"?(v(),$(G,{key:0},[d.value?(v(),T(x(e),{key:0,onClose:h[0]||(h[0]=w=>d.value=!1)})):C("",!0),_("div",gl,[E(Jn,{onClick:h[1]||(h[1]=w=>d.value=!0)})])],64)):x(m)==="algolia"?(v(),$(G,{key:1},[s.value?(v(),T(x(n),{key:0,algolia:((g=x(r).search)==null?void 0:g.options)??x(r).algolia,onVnodeBeforeMount:h[2]||(h[2]=w=>o.value=!0)},null,8,["algolia"])):C("",!0),o.value?C("",!0):(v(),$("div",vl,[E(Jn,{onClick:i})]))],64)):C("",!0)])}}}),bl=L({__name:"VPNavBarSocialLinks",setup(t){const{theme:e}=H();return(n,r)=>x(e).socialLinks?(v(),T(Cn,{key:0,class:"VPNavBarSocialLinks",links:x(e).socialLinks},null,8,["links"])):C("",!0)}}),wl=z(bl,[["__scopeId","data-v-8f476ff1"]]),kl=["href","rel","target"],xl=["innerHTML"],$l={key:2},_l=L({__name:"VPNavBarTitle",setup(t){const{site:e,theme:n}=H(),{hasSidebar:r}=Ve(),{currentLang:s}=_t(),o=V(()=>{var c;return typeof n.value.logoLink=="string"?n.value.logoLink:(c=n.value.logoLink)==null?void 0:c.link}),i=V(()=>{var c;return typeof n.value.logoLink=="string"||(c=n.value.logoLink)==null?void 0:c.rel}),l=V(()=>{var c;return typeof n.value.logoLink=="string"||(c=n.value.logoLink)==null?void 0:c.target});return(c,d)=>(v(),$("div",{class:J(["VPNavBarTitle",{"has-sidebar":x(r)}])},[_("a",{class:"title",href:o.value??x(jn)(x(s).link),rel:i.value,target:l.value},[q(c.$slots,"nav-bar-title-before",{},void 0,!0),x(n).logo?(v(),T(Vt,{key:0,class:"logo",image:x(n).logo},null,8,["image"])):C("",!0),x(n).siteTitle?(v(),$("span",{key:1,innerHTML:x(n).siteTitle},null,8,xl)):x(n).siteTitle===void 0?(v(),$("span",$l,U(x(e).title),1)):C("",!0),q(c.$slots,"nav-bar-title-after",{},void 0,!0)],8,kl)],2))}}),ql=z(_l,[["__scopeId","data-v-37f89d44"]]),Sl={class:"items"},Fl={class:"title"},jl=L({__name:"VPNavBarTranslations",setup(t){const{theme:e}=H(),{localeLinks:n,currentLang:r}=_t({correspondingLink:!0});return(s,o)=>x(n).length&&x(r).label?(v(),T(Pn,{key:0,class:"VPNavBarTranslations",icon:"vpi-languages",label:x(e).langMenuLabel||"Change language"},{default:F(()=>[_("div",Sl,[_("p",Fl,U(x(r).label),1),(v(!0),$(G,null,re(x(n),i=>(v(),T(en,{key:i.link,item:i},null,8,["item"]))),128))])]),_:1},8,["label"])):C("",!0)}}),Rl=z(jl,[["__scopeId","data-v-d00da111"]]),Il={class:"wrapper"},Al={class:"container"},Pl={class:"title"},Cl={class:"content"},Ml={class:"content-body"},Nl=L({__name:"VPNavBar",props:{isScreenOpen:{type:Boolean}},emits:["toggle-screen"],setup(t){const e=t,{y:n}=pr(),{hasSidebar:r}=Ve(),{frontmatter:s}=H(),o=B({});return Fn(()=>{o.value={"has-sidebar":r.value,home:s.value.layout==="home",top:n.value===0,"screen-open":e.isScreenOpen}}),(i,l)=>(v(),$("div",{class:J(["VPNavBar",o.value])},[_("div",Il,[_("div",Al,[_("div",Pl,[E(ql,null,{"nav-bar-title-before":F(()=>[q(i.$slots,"nav-bar-title-before",{},void 0,!0)]),"nav-bar-title-after":F(()=>[q(i.$slots,"nav-bar-title-after",{},void 0,!0)]),_:3})]),_("div",Cl,[_("div",Ml,[q(i.$slots,"nav-bar-content-before",{},void 0,!0),E(yl,{class:"search"}),E(ul,{class:"menu"}),E(Rl,{class:"translations"}),E(bi,{class:"appearance"}),E(wl,{class:"social-links"}),E(el,{class:"extra"}),q(i.$slots,"nav-bar-content-after",{},void 0,!0),E(rl,{class:"hamburger",active:t.isScreenOpen,onClick:l[0]||(l[0]=c=>i.$emit("toggle-screen"))},null,8,["active"])])])])]),l[1]||(l[1]=_("div",{class:"divider"},[_("div",{class:"divider-line"})],-1))],2))}}),Ll=z(Nl,[["__scopeId","data-v-72621238"]]),El={key:0,class:"VPNavScreenAppearance"},Tl={class:"text"},zl=L({__name:"VPNavScreenAppearance",setup(t){const{site:e,theme:n}=H();return(r,s)=>x(e).appearance&&x(e).appearance!=="force-dark"&&x(e).appearance!=="force-auto"?(v(),$("div",El,[_("p",Tl,U(x(n).darkModeSwitchLabel||"Appearance"),1),E(In)])):C("",!0)}}),Vl=z(zl,[["__scopeId","data-v-9b7eb45a"]]),Dl=["innerHTML"],Bl=L({__name:"VPNavScreenMenuLink",props:{item:{}},setup(t){const e=Xt("close-screen");return(n,r)=>(v(),T(Ae,{class:"VPNavScreenMenuLink",href:t.item.link,target:t.item.target,rel:t.item.rel,"no-icon":t.item.noIcon,onClick:x(e)},{default:F(()=>[_("span",{innerHTML:t.item.text},null,8,Dl)]),_:1},8,["href","target","rel","no-icon","onClick"]))}}),Ol=z(Bl,[["__scopeId","data-v-aa1ff13b"]]),Hl=["innerHTML"],Ul=L({__name:"VPNavScreenMenuGroupLink",props:{item:{}},setup(t){const e=Xt("close-screen");return(n,r)=>(v(),T(Ae,{class:"VPNavScreenMenuGroupLink",href:t.item.link,target:t.item.target,rel:t.item.rel,"no-icon":t.item.noIcon,onClick:x(e)},{default:F(()=>[_("span",{innerHTML:t.item.text},null,8,Hl)]),_:1},8,["href","target","rel","no-icon","onClick"]))}}),$r=z(Ul,[["__scopeId","data-v-f703e82d"]]),Wl={class:"VPNavScreenMenuGroupSection"},Kl={key:0,class:"title"},Jl=L({__name:"VPNavScreenMenuGroupSection",props:{text:{},items:{}},setup(t){return(e,n)=>(v(),$("div",Wl,[t.text?(v(),$("p",Kl,U(t.text),1)):C("",!0),(v(!0),$(G,null,re(t.items,r=>(v(),T($r,{key:r.text,item:r},null,8,["item"]))),128))]))}}),Gl=z(Jl,[["__scopeId","data-v-669f26ba"]]),Ql=["aria-controls","aria-expanded"],Yl=["innerHTML"],Xl=["id"],Zl={key:0,class:"item"},ec={key:1,class:"item"},tc={key:2,class:"group"},nc=L({__name:"VPNavScreenMenuGroup",props:{text:{},items:{}},setup(t){const e=t,n=B(!1),r=V(()=>`NavScreenGroup-${e.text.replace(" ","-").toLowerCase()}`);function s(){n.value=!n.value}return(o,i)=>(v(),$("div",{class:J(["VPNavScreenMenuGroup",{open:n.value}])},[_("button",{class:"button","aria-controls":r.value,"aria-expanded":n.value,onClick:s},[_("span",{class:"button-text",innerHTML:t.text},null,8,Yl),i[0]||(i[0]=_("span",{class:"vpi-plus button-icon"},null,-1))],8,Ql),_("div",{id:r.value,class:"items"},[(v(!0),$(G,null,re(t.items,l=>(v(),$(G,{key:JSON.stringify(l)},["link"in l?(v(),$("div",Zl,[E($r,{item:l},null,8,["item"])])):"component"in l?(v(),$("div",ec,[(v(),T(Ie(l.component),He({ref_for:!0},l.props,{"screen-menu":""}),null,16))])):(v(),$("div",tc,[E(Gl,{text:l.text,items:l.items},null,8,["text","items"])]))],64))),128))],8,Xl)],2))}}),rc=z(nc,[["__scopeId","data-v-2deb1394"]]),sc={key:0,class:"VPNavScreenMenu"},ac=L({__name:"VPNavScreenMenu",setup(t){const{theme:e}=H();return(n,r)=>x(e).nav?(v(),$("nav",sc,[(v(!0),$(G,null,re(x(e).nav,s=>(v(),$(G,{key:JSON.stringify(s)},["link"in s?(v(),T(Ol,{key:0,item:s},null,8,["item"])):"component"in s?(v(),T(Ie(s.component),He({key:1,ref_for:!0},s.props,{"screen-menu":""}),null,16)):(v(),T(rc,{key:2,text:s.text||"",items:s.items},null,8,["text","items"]))],64))),128))])):C("",!0)}}),oc=L({__name:"VPNavScreenSocialLinks",setup(t){const{theme:e}=H();return(n,r)=>x(e).socialLinks?(v(),T(Cn,{key:0,class:"VPNavScreenSocialLinks",links:x(e).socialLinks},null,8,["links"])):C("",!0)}}),ic={class:"list"},lc=L({__name:"VPNavScreenTranslations",setup(t){const{localeLinks:e,currentLang:n}=_t({correspondingLink:!0}),r=B(!1);function s(){r.value=!r.value}return(o,i)=>x(e).length&&x(n).label?(v(),$("div",{key:0,class:J(["VPNavScreenTranslations",{open:r.value}])},[_("button",{class:"title",onClick:s},[i[0]||(i[0]=_("span",{class:"vpi-languages icon lang"},null,-1)),Te(" "+U(x(n).label)+" ",1),i[1]||(i[1]=_("span",{class:"vpi-chevron-down icon chevron"},null,-1))]),_("ul",ic,[(v(!0),$(G,null,re(x(e),l=>(v(),$("li",{key:l.link,class:"item"},[E(Ae,{class:"link",href:l.link},{default:F(()=>[Te(U(l.text),1)]),_:2},1032,["href"])]))),128))])],2)):C("",!0)}}),cc=z(lc,[["__scopeId","data-v-89f6a58b"]]),uc={class:"container"},dc=L({__name:"VPNavScreen",props:{open:{type:Boolean}},setup(t){const e=B(null),n=hr(Zt?document.body:null);return(r,s)=>(v(),T(qn,{name:"fade",onEnter:s[0]||(s[0]=o=>n.value=!0),onAfterLeave:s[1]||(s[1]=o=>n.value=!1)},{default:F(()=>[t.open?(v(),$("div",{key:0,class:"VPNavScreen",ref_key:"screen",ref:e,id:"VPNavScreen"},[_("div",uc,[q(r.$slots,"nav-screen-content-before",{},void 0,!0),E(ac,{class:"menu"}),E(cc,{class:"translations"}),E(Vl,{class:"appearance"}),E(oc,{class:"social-links"}),q(r.$slots,"nav-screen-content-after",{},void 0,!0)])],512)):C("",!0)]),_:3}))}}),fc=z(dc,[["__scopeId","data-v-9d874f3a"]]),mc={key:0,class:"VPNav"},pc=L({__name:"VPNav",setup(t){const{isScreenOpen:e,closeScreen:n,toggleScreen:r}=ci(),{frontmatter:s}=H(),o=V(()=>s.value.navbar!==!1);return gr("close-screen",n),Jt(()=>{Zt&&document.documentElement.classList.toggle("hide-nav",!o.value)}),(i,l)=>o.value?(v(),$("header",mc,[E(Ll,{"is-screen-open":x(e),onToggleScreen:x(r)},{"nav-bar-title-before":F(()=>[q(i.$slots,"nav-bar-title-before",{},void 0,!0)]),"nav-bar-title-after":F(()=>[q(i.$slots,"nav-bar-title-after",{},void 0,!0)]),"nav-bar-content-before":F(()=>[q(i.$slots,"nav-bar-content-before",{},void 0,!0)]),"nav-bar-content-after":F(()=>[q(i.$slots,"nav-bar-content-after",{},void 0,!0)]),_:3},8,["is-screen-open","onToggleScreen"]),E(fc,{open:x(e)},{"nav-screen-content-before":F(()=>[q(i.$slots,"nav-screen-content-before",{},void 0,!0)]),"nav-screen-content-after":F(()=>[q(i.$slots,"nav-screen-content-after",{},void 0,!0)]),_:3},8,["open"])])):C("",!0)}}),hc=z(pc,[["__scopeId","data-v-0c4180fa"]]),gc=["role","tabindex"],vc={key:1,class:"items"},yc=L({__name:"VPSidebarItem",props:{item:{},depth:{}},setup(t){const e=t,{collapsed:n,collapsible:r,isLink:s,isActiveLink:o,hasActiveLink:i,hasChildren:l,toggle:c}=fa(V(()=>e.item)),d=V(()=>l.value?"section":"div"),m=V(()=>s.value?"a":"div"),p=V(()=>l.value?e.depth+2===7?"p":`h${e.depth+2}`:"p"),h=V(()=>s.value?void 0:"button"),g=V(()=>[[`level-${e.depth}`],{collapsible:r.value},{collapsed:n.value},{"is-link":s.value},{"is-active":o.value},{"has-active":i.value}]);function w(S){"key"in S&&S.key!=="Enter"||!e.item.link&&c()}function k(){e.item.link&&c()}return(S,I)=>{const N=rt("VPSidebarItem",!0);return v(),T(Ie(d.value),{class:J(["VPSidebarItem",g.value])},{default:F(()=>[t.item.text?(v(),$("div",He({key:0,class:"item",role:h.value},Ds(t.item.items?{click:w,keydown:w}:{},!0),{tabindex:t.item.items&&0}),[I[1]||(I[1]=_("div",{class:"indicator"},null,-1)),t.item.link?(v(),T(Ae,{key:0,tag:m.value,class:"link",href:t.item.link,rel:t.item.rel,target:t.item.target},{default:F(()=>[(v(),T(Ie(p.value),{class:"text",innerHTML:t.item.text},null,8,["innerHTML"]))]),_:1},8,["tag","href","rel","target"])):(v(),T(Ie(p.value),{key:1,class:"text",innerHTML:t.item.text},null,8,["innerHTML"])),t.item.collapsed!=null&&t.item.items&&t.item.items.length?(v(),$("div",{key:2,class:"caret",role:"button","aria-label":"toggle section",onClick:k,onKeydown:Bs(k,["enter"]),tabindex:"0"},[...I[0]||(I[0]=[_("span",{class:"vpi-chevron-right caret-icon"},null,-1)])],32)):C("",!0)],16,gc)):C("",!0),t.item.items&&t.item.items.length?(v(),$("div",vc,[t.depth<5?(v(!0),$(G,{key:0},re(t.item.items,P=>(v(),T(N,{key:P.text,item:P,depth:t.depth+1},null,8,["item","depth"]))),128)):C("",!0)])):C("",!0)]),_:1},8,["class"])}}}),bc=z(yc,[["__scopeId","data-v-2e39f3ca"]]),wc=L({__name:"VPSidebarGroup",props:{items:{}},setup(t){const e=B(!0);let n=null;return Me(()=>{n=setTimeout(()=>{n=null,e.value=!1},300)}),Os(()=>{n!=null&&(clearTimeout(n),n=null)}),(r,s)=>(v(!0),$(G,null,re(t.items,o=>(v(),$("div",{key:o.text,class:J(["group",{"no-transition":e.value}])},[E(bc,{item:o,depth:0},null,8,["item"])],2))),128))}}),kc=z(wc,[["__scopeId","data-v-efdb03cb"]]),xc={class:"nav",id:"VPSidebarNav","aria-labelledby":"sidebar-aria-label",tabindex:"-1"},$c=L({__name:"VPSidebar",props:{open:{type:Boolean}},setup(t){const{sidebarGroups:e,hasSidebar:n}=Ve(),r=t,s=B(null),o=hr(Zt?document.body:null);Pe([r,s],()=>{var l;r.open?(o.value=!0,(l=s.value)==null||l.focus()):o.value=!1},{immediate:!0,flush:"post"});const i=B(0);return Pe(e,()=>{i.value+=1},{deep:!0}),(l,c)=>x(n)?(v(),$("aside",{key:0,class:J(["VPSidebar",{open:t.open}]),ref_key:"navEl",ref:s,onClick:c[0]||(c[0]=Hs(()=>{},["stop"]))},[c[2]||(c[2]=_("div",{class:"curtain"},null,-1)),_("nav",xc,[c[1]||(c[1]=_("span",{class:"visually-hidden",id:"sidebar-aria-label"}," Sidebar Navigation ",-1)),q(l.$slots,"sidebar-nav-before",{},void 0,!0),(v(),T(kc,{items:x(e),key:i.value},null,8,["items"])),q(l.$slots,"sidebar-nav-after",{},void 0,!0)])],2)):C("",!0)}}),_c=z($c,[["__scopeId","data-v-fd204778"]]),qc=L({__name:"VPSkipLink",setup(t){const{theme:e}=H(),n=Yt(),r=B();Pe(()=>n.path,()=>r.value.focus());function s({target:o}){const i=document.getElementById(decodeURIComponent(o.hash).slice(1));if(i){const l=()=>{i.removeAttribute("tabindex"),i.removeEventListener("blur",l)};i.setAttribute("tabindex","-1"),i.addEventListener("blur",l),i.focus(),window.scrollTo(0,0)}}return(o,i)=>(v(),$(G,null,[_("span",{ref_key:"backToTop",ref:r,tabindex:"-1"},null,512),_("a",{href:"#VPContent",class:"VPSkipLink visually-hidden",onClick:s},U(x(e).skipToContentLabel||"Skip to content"),1)],64))}}),Sc=z(qc,[["__scopeId","data-v-3f982159"]]),Fc=L({__name:"Layout",setup(t){const{isOpen:e,open:n,close:r}=Ve(),s=Yt();Pe(()=>s.path,r),da(e,r);const{frontmatter:o}=H(),i=Us(),l=V(()=>!!i["home-hero-image"]);return gr("hero-image-slot-exists",l),(c,d)=>{const m=rt("Content");return x(o).layout!==!1?(v(),$("div",{key:0,class:J(["Layout",x(o).pageClass])},[q(c.$slots,"layout-top",{},void 0,!0),E(Sc),E(Xs,{class:"backdrop",show:x(e),onClick:x(r)},null,8,["show","onClick"]),E(hc,null,{"nav-bar-title-before":F(()=>[q(c.$slots,"nav-bar-title-before",{},void 0,!0)]),"nav-bar-title-after":F(()=>[q(c.$slots,"nav-bar-title-after",{},void 0,!0)]),"nav-bar-content-before":F(()=>[q(c.$slots,"nav-bar-content-before",{},void 0,!0)]),"nav-bar-content-after":F(()=>[q(c.$slots,"nav-bar-content-after",{},void 0,!0)]),"nav-screen-content-before":F(()=>[q(c.$slots,"nav-screen-content-before",{},void 0,!0)]),"nav-screen-content-after":F(()=>[q(c.$slots,"nav-screen-content-after",{},void 0,!0)]),_:3}),E(li,{open:x(e),onOpenMenu:x(n)},null,8,["open","onOpenMenu"]),E(_c,{open:x(e)},{"sidebar-nav-before":F(()=>[q(c.$slots,"sidebar-nav-before",{},void 0,!0)]),"sidebar-nav-after":F(()=>[q(c.$slots,"sidebar-nav-after",{},void 0,!0)]),_:3},8,["open"]),E(Wo,null,{"page-top":F(()=>[q(c.$slots,"page-top",{},void 0,!0)]),"page-bottom":F(()=>[q(c.$slots,"page-bottom",{},void 0,!0)]),"not-found":F(()=>[q(c.$slots,"not-found",{},void 0,!0)]),"home-hero-before":F(()=>[q(c.$slots,"home-hero-before",{},void 0,!0)]),"home-hero-info-before":F(()=>[q(c.$slots,"home-hero-info-before",{},void 0,!0)]),"home-hero-info":F(()=>[q(c.$slots,"home-hero-info",{},void 0,!0)]),"home-hero-info-after":F(()=>[q(c.$slots,"home-hero-info-after",{},void 0,!0)]),"home-hero-actions-after":F(()=>[q(c.$slots,"home-hero-actions-after",{},void 0,!0)]),"home-hero-image":F(()=>[q(c.$slots,"home-hero-image",{},void 0,!0)]),"home-hero-after":F(()=>[q(c.$slots,"home-hero-after",{},void 0,!0)]),"home-features-before":F(()=>[q(c.$slots,"home-features-before",{},void 0,!0)]),"home-features-after":F(()=>[q(c.$slots,"home-features-after",{},void 0,!0)]),"doc-footer-before":F(()=>[q(c.$slots,"doc-footer-before",{},void 0,!0)]),"doc-before":F(()=>[q(c.$slots,"doc-before",{},void 0,!0)]),"doc-after":F(()=>[q(c.$slots,"doc-after",{},void 0,!0)]),"doc-top":F(()=>[q(c.$slots,"doc-top",{},void 0,!0)]),"doc-bottom":F(()=>[q(c.$slots,"doc-bottom",{},void 0,!0)]),"aside-top":F(()=>[q(c.$slots,"aside-top",{},void 0,!0)]),"aside-bottom":F(()=>[q(c.$slots,"aside-bottom",{},void 0,!0)]),"aside-outline-before":F(()=>[q(c.$slots,"aside-outline-before",{},void 0,!0)]),"aside-outline-after":F(()=>[q(c.$slots,"aside-outline-after",{},void 0,!0)]),"aside-ads-before":F(()=>[q(c.$slots,"aside-ads-before",{},void 0,!0)]),"aside-ads-after":F(()=>[q(c.$slots,"aside-ads-after",{},void 0,!0)]),_:3}),E(Yo),q(c.$slots,"layout-bottom",{},void 0,!0)],2)):(v(),T(m,{key:1}))}}}),jc=z(Fc,[["__scopeId","data-v-28affab8"]]),Rc={Layout:jc,enhanceApp:({app:t})=>{t.component("Badge",Gs)}},Ic=`(ns cljam.handbook
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
    No clojure.core futures, no raw JS Promise interop — use (async ...) + (then ...)."

   :js-interop
   "cljam JS interop — NOT ClojureScript. Different dot syntax.
    Property access:  (. obj field)            ;; e.g. (. \\"hello\\" length) → 5
    Method with args: (. obj method arg...)    ;; e.g. (. \\"hello\\" indexOf \\"l\\") → 2
    Zero-arg method:  ((. obj method))         ;; e.g. ((. \\"hello\\" toUpperCase)) → \\"HELLO\\"
    Dot-chain symbol: js/Math.floor, js/Math.PI  ;; walk property chain from hostBinding
    Dot-chain call:   (js/Math.floor 3.7) → 3    ;; call result of dot-chain walk
    Dynamic access:   (js/get obj \\"key\\") or (js/get obj :key)
    Dynamic set:      (js/set! obj \\"key\\" value)
    Construct:        (js/new Constructor args...)  ;; Constructor must be a js-value
    Inject globals:   createSession({ hostBindings: { Math, console, fetch } })
    String requires:  (ns my.ns (:require [\\"react\\" :as React])) — needs importModule option
    Sandbox preset has Math pre-injected as js/Math.
    Caveat: JS globals are NOT available by default — inject via hostBindings explicitly."

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
`,Ac=`(ns clojure.core)

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

;; Host shims, for autocomplete only
(def all)
(def async)
(def catch*)
(def then)
(def repeat*)
(def range*)


(defmacro defn [name & fdecl]
  (let [doc       (if (string? (first fdecl)) (first fdecl) nil)
        rest-decl (if doc (rest fdecl) fdecl)
        arglists  (if (vector? (first rest-decl))
                    (vector (first rest-decl))
                    (reduce (fn [acc arity] (conj acc (first arity))) [] rest-decl))
        meta-map  (let [m (if doc {:doc doc :arglists arglists} {:arglists arglists})]
                    (if (:private (meta name)) (assoc m :private true) m))]
    \`(def ~(with-meta name meta-map) (fn ~name ~@rest-decl))))

(defmacro defn-
  "Same as defn, but marks the var as private."
  [name & fdecl]
  (list* 'defn (with-meta name (assoc (meta name) :private true)) fdecl))

;; defmulti / defmethod: multimethod sugar over native make-multimethod! / add-method!
;; defmulti uses a re-eval guard in make-multimethod! — re-loading a namespace
;; preserves all registered methods.
(defmacro defmulti [name dispatch-fn & opts]
  \`(make-multimethod! ~(str name) ~dispatch-fn ~@opts))

(defmacro defmethod [mm-name dispatch-val & fn-tail]
  \`(add-method! (var ~mm-name) ~dispatch-val (fn ~@fn-tail)))

;; delay: wraps body in a zero-arg fn and defers evaluation until forced.
;; make-delay is a native primitive that creates the CljDelay value.
(defmacro delay [& body]
  \`(make-delay (fn* [] ~@body)))


(defn vary-meta
  "Returns an object of the same type and value as obj, with
  (apply f (meta obj) args) as its metadata."
  [obj f & args]
  (with-meta obj (apply f (meta obj) args)))

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


(defmacro when
  "Executes body when condition is true, otherwise returns nil."
  [condition & body]
  \`(if ~condition (do ~@body) nil))

(defmacro when-not
  "Executes body when condition is false, otherwise returns nil."
  [condition & body]
  \`(if ~condition nil (do ~@body)))

(defmacro if-let
  ([bindings then] \`(if-let ~bindings ~then nil))
  ([bindings then else]
   (let [form (first bindings)
         tst  (second bindings)]
     \`(let [~form ~tst]
        (if ~form ~then ~else)))))

(defmacro when-let [bindings & body]
  (let [form (first bindings)
        tst  (second bindings)]
    \`(let [~form ~tst]
       (when ~form ~@body))))

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
  "Ignores body, yields nil"
  [& body])

(defmacro as->
  [expr name & forms]
  \`(let [~name ~expr
         ~@(reduce (fn [acc form] (conj acc name form)) [] forms)]
     ~name))

(defmacro cond->
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

(defmacro cond->>
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

(defmacro some->
  [expr & forms]
  (if (nil? forms)
    expr
    \`(let [v# ~expr]
       (if (nil? v#)
         nil
         (some-> (-> v# ~(first forms)) ~@(rest forms))))))

(defmacro some->>
  [expr & forms]
  (if (nil? forms)
    expr
    \`(let [v# ~expr]
       (if (nil? v#)
         nil
         (some->> (->> v# ~(first forms)) ~@(rest forms))))))

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
  [m ks v]
  (let [k    (first ks)
        more (next ks)]
    (if more
      (assoc m k (assoc-in (get m k) more v))
      (assoc m k v))))

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

(defn sort-by
  "Returns a sorted sequence of items in coll, where the sort order is
  determined by comparing (keyfn item). Default comparator is compare."
  ([keyfn coll] (sort-by keyfn compare coll))
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
   (lazy-seq
    (when-let [s (seq coll)]
      (if (pred (first s))
        (cons (first s) (filter pred (rest s)))
        (filter pred (rest s)))))))

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
   (lazy-seq
    (when (pos? n)
      (when-let [s (seq coll)]
        (cons (first s) (take (dec n) (rest s))))))))

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
   (lazy-seq
    (when-let [s (seq coll)]
      (when (pred (first s))
        (cons (first s) (take-while pred (rest s))))))))

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
   (if (pos? n)
     (lazy-seq (drop (dec n) (rest coll)))
     (lazy-seq (seq coll)))))

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
   (lazy-seq
    (let [s (seq coll)]
      (if (and s (pred (first s)))
        (drop-while pred (rest s))
        s)))))

;; letfn: expands to letfn* (the primitive), which takes a flat vector of
;; [name fn-form name fn-form ...] pairs and evaluates each fn-form in a
;; shared env frame so all fns can see each other (mutual recursion).
(defmacro letfn [fnspecs & body]
  (cons 'letfn*
        (cons (reduce (fn* [acc spec]
                           (conj (conj acc (first spec))
                                 (cons 'fn* (rest spec))))
                      []
                      fnspecs)
              body)))

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
   (letfn [(step [i s]
             (lazy-seq
              (when-let [xs (seq s)]
                (cons (f i (first xs)) (step (inc i) (rest xs))))))]
     (step 0 coll))))

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

(defn make-err
  "Creates an error map with type, message, data and optionally cause"
  ([type message] (make-err type message nil nil))
  ([type message data] (make-err type message data nil))
  ([type message data cause] {:type type :message message :data data :cause cause}))

;; ── Sequence utilities ──────────────────────────────────────────────────────

(defn butlast
  "Return a seq of all but the last item in coll, in linear time"
  [coll]
  (loop [ret [] s (seq coll)]
    (if (next s)
      (recur (conj ret (first s)) (next s))
      (seq ret))))

(defn fnext
  "Same as (first (next x))"
  [x] (first (next x)))

(defn nfirst
  "Same as (next (first x))"
  [x] (next (first x)))

(defn nnext
  "Same as (next (next x))"
  [x] (next (next x)))

(defn nthrest
  "Returns the nth rest of coll, coll when n is 0."
  [coll n]
  (loop [n n xs coll]
    (if (and (pos? n) (seq xs))
      (recur (dec n) (rest xs))
      xs)))

(defn nthnext
  "Returns the nth next of coll, (seq coll) when n is 0."
  [coll n]
  (loop [n n xs (seq coll)]
    (if (and (pos? n) xs)
      (recur (dec n) (next xs))
      xs)))

(defn list*
  "Creates a new seq containing the items prepended to the rest, the
  last of which will be treated as a sequence."
  ([args] (seq args))
  ([a args] (cons a args))
  ([a b args] (cons a (cons b args)))
  ([a b c args] (cons a (cons b (cons c args))))
  ([a b c d & more]
   (cons a (cons b (cons c (apply list* d more))))))

(defn mapv
  "Returns a vector consisting of the result of applying f to the
  set of first items of each coll, followed by applying f to the set
  of second items in each coll, until any one of the colls is exhausted."
  ([f coll] (into [] (map f) coll))
  ([f c1 c2] (into [] (map f c1 c2)))
  ([f c1 c2 c3] (into [] (map f c1 c2 c3)))
  ([f c1 c2 c3 & colls] (into [] (apply map f c1 c2 c3 colls))))

(defn filterv
  "Returns a vector of the items in coll for which
  (pred item) returns logical true."
  [pred coll]
  (into [] (filter pred) coll))

(defn run!
  "Runs the supplied procedure (via reduce), for purposes of side
  effects, on successive items in the collection. Returns nil."
  [proc coll]
  (reduce (fn [_ x] (proc x) nil) nil coll))

(defn keep
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

(defn keep-indexed
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

(defn mapcat
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

(defn interleave
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

(defn interpose
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
(defn concat
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

(defn iterate
  "Returns a lazy sequence of x, (f x), (f (f x)) etc.
  With 3 args, returns a finite sequence of n items (backwards compat)."
  ([f x]
   (lazy-seq (cons x (iterate f (f x)))))
  ([f x n]
   (loop [i 0 v x acc []]
     (if (< i n)
       (recur (inc i) (f v) (conj acc v))
       acc))))

(defn repeatedly
  "Takes a function of no args, presumably with side effects, and
  returns a lazy infinite sequence of calls to it.
  With 2 args (n f), returns a finite sequence of n calls."
  ([f] (lazy-seq (cons (f) (repeatedly f))))
  ([n f]
   (loop [i 0 acc []]
     (if (< i n)
       (recur (inc i) (conj acc (f)))
       acc))))

(defn cycle
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

(defn repeat
  "Returns a lazy infinite sequence of xs.
  With 2 args (n x), returns a finite sequence of n copies."
  ([x] (lazy-seq (cons x (repeat x))))
  ([n x] (repeat* n x)))

(defn range
  "Returns a lazy infinite sequence of integers from 0.
  With args, returns a finite sequence (delegates to native range*)."
  ([] (iterate inc 0))
  ([end] (range* end))
  ([start end] (range* start end))
  ([start end step] (range* start end step)))

(defn newline
  "Writes a newline to *out*."
  [] (println ""))

(defn dorun
  "Forces realization of a (possibly lazy) sequence. Walks the sequence
  without retaining the head. Returns nil."
  [coll]
  (when (seq coll)
    (recur (rest coll))))

(defn doall
  "Forces realization of a (possibly lazy) sequence. Unlike dorun,
  retains the head and returns the seq."
  [coll]
  (dorun coll)
  coll)

(defn take-nth
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
   (sequence (take-nth n) coll)))

(defn partition
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

(defn partition-by
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

(defn reductions
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

(defn split-at
  "Returns a vector of [(take n coll) (drop n coll)]"
  [n coll]
  [(into [] (take n) coll) (into [] (drop n) coll)])

(defn split-with
  "Returns a vector of [(take-while pred coll) (drop-while pred coll)]"
  [pred coll]
  [(into [] (take-while pred) coll) (into [] (drop-while pred) coll)])

(defn merge-with
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

(defn update-keys
  "m f => apply f to each key in m"
  [m f]
  (reduce
   (fn [acc entry]
     (assoc acc (f (first entry)) (second entry)))
   {}
   m))

(defn update-vals
  "m f => apply f to each val in m"
  [m f]
  (reduce
   (fn [acc entry]
     (assoc acc (first entry) (f (second entry))))
   {}
   m))

(defn not-empty
  "If coll is empty, returns nil, else coll"
  [coll]
  (when (seq coll) coll))

(defn memoize
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

(defn trampoline
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

(defmacro with-redefs
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

(defmacro if-some
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

(defmacro when-some
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

(defmacro when-first
  "bindings => x xs
  Roughly the same as (when (seq xs) (let [x (first xs)] body)) but xs is evaluated only once"
  [bindings & body]
  (let [x  (first bindings)
        xs (second bindings)]
    \`(let [temp# (seq ~xs)]
       (when temp#
         (let [~x (first temp#)]
           ~@body)))))

(defn condp-emit [gpred gexpr clauses]
  (if (nil? clauses)
    \`(throw (ex-info (str "No matching clause: " ~gexpr) {}))
    (if (nil? (next clauses))
      (first clauses)
      \`(if (~gpred ~(first clauses) ~gexpr)
         ~(second clauses)
         ~(condp-emit gpred gexpr (next (next clauses)))))))

(defmacro condp
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

(defn case-emit [ge clauses]
  (if (nil? clauses)
    \`(throw (ex-info (str "No matching clause: " ~ge) {}))
    (if (nil? (next clauses))
      (first clauses)
      \`(if (= ~ge ~(first clauses))
         ~(second clauses)
         ~(case-emit ge (next (next clauses)))))))

(defmacro case
  "Takes an expression, and a set of clauses. Each clause can take the form of
  either:
    test-constant result-expr
  If no clause matches, and there is an odd number of forms (a default), the
  last expression is returned."
  [e & clauses]
  (let [ge (gensym "case__")]
    \`(let [~ge ~e]
       ~(case-emit ge clauses))))

(defmacro dotimes
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

(defmacro while
  "Repeatedly executes body while test expression is true. Presumes
  some side-effect will cause test to become false/nil."
  [test & body]
  \`(loop []
     (when ~test
       ~@body
       (recur))))

(defmacro doseq
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

(defmacro for
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
(defn destructure [bindings]
  (let*
   [bents (partition 2 bindings)
    pb    (fn pb [bvec b v]
            (let* [;; ── vector pattern ───────────────────────────────────
                   pvec
                   (fn [bvec b val]
                     (let* [gvec     (gensym "vec__")
                            gseq     (gensym "seq__")
                            gfirst   (gensym "first__")
                            has-rest (some #{'&} b)]
                       (loop* [ret (let* [ret (conj bvec gvec val)]
                                     (if has-rest
                                       (conj ret gseq (list 'seq gvec))
                                       ret))
                               n          0
                               bs         b
                               seen-rest? false]
                              (if (seq bs)
                                (let* [firstb (first bs)]
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
                       (loop* [ret     (-> bvec
                                           (conj gmap)
                                           (conj (list 'if (list 'map? v) v
                                                       (list 'if (list 'nil? v) (hash-map)
                                                             (list 'apply 'hash-map v))))
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

(defn maybe-destructured
  [params body]
  (if (every? symbol? params)
    (cons params body)
    (loop* [params params
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

(defmacro fn [& sigs]
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

(defmacro let [bindings & body]
  (if (not (vector? bindings))
    (throw (ex-info "let requires a vector for its bindings" {}))
    (if (not (even? (count bindings)))
      (throw (ex-info "let requires an even number of forms in binding vector" {}))
      \`(let* ~(destructure bindings) ~@body))))

(defmacro loop [bindings & body]
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



(defmacro with-out-str
  "Evaluates body in a context in which *out* is bound to a fresh string
  accumulator. Returns the string of all output produced by println, print,
  pr, prn, pprint and newline during the evaluation."
  [& body]
  \`(let [buf# (atom "")]
     (binding [*out* (fn [s#] (swap! buf# str s#))]
       ~@body)
     @buf#))

(defmacro with-err-str
  "Like with-out-str but captures *err* output (warn, etc.)."
  [& body]
  \`(let [buf# (atom "")]
     (binding [*err* (fn [s#] (swap! buf# str s#))]
       ~@body)
     @buf#))

(defn pprint-str
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

(defmacro defprotocol
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

(defmacro extend-protocol
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

(defmacro extend-type
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

(defmacro defrecord
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
         (make-record! ~type-str ~ns-str (hash-map ~@field-map-pairs)))
       (defn ~map-constructor [m#]
         (make-record! ~type-str ~ns-str (select-keys m# ~field-keys)))
       ~@extend-calls)))

; reify — deferred to Phase B

;; ---------------------------------------------------------------------------
;; describe — introspection for any value
;; ---------------------------------------------------------------------------

;; ─── Keyword Hierarchy ───────────────────────────────────────────────────────

(defn make-hierarchy
  "Returns a new, empty hierarchy."
  []
  {:parents {} :ancestors {} :descendants {}})

(def ^:dynamic *hierarchy*
  (make-hierarchy))

(defn parents
  "Returns the immediate parents of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no parents."
  ([tag]   (hierarchy-parents-global tag))
  ([h tag] (get (:parents h) tag)))

(defn ancestors
  "Returns the set of all ancestors of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no ancestors."
  ([tag]   (hierarchy-ancestors-global tag))
  ([h tag] (get (:ancestors h) tag)))

(defn descendants
  "Returns the set of all descendants of tag in the hierarchy (default: *hierarchy*),
  or nil if tag has no descendants."
  ([tag]   (hierarchy-descendants-global tag))
  ([h tag] (get (:descendants h) tag)))

(defn isa?
  "Returns true if child is either identical to parent, or child derives from
  parent in the given hierarchy (default: *hierarchy*)."
  ([child parent]   (hierarchy-isa?-global child parent))
  ([h child parent] (hierarchy-isa?* h child parent)))

(defn derive
  "Establishes a parent/child relationship between child and parent.

  2-arity: mutates the global *hierarchy* via session-safe native.
  3-arity: pure — returns a new hierarchy map without side effects."
  ([child parent]
   (hierarchy-derive-global! child parent))
  ([h child parent]
   (hierarchy-derive* h child parent)))

(defn underive
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

(defn describe
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
`,Pc=`(ns clojure.edn)

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
`,Cc=`(ns clojure.math)

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(def math-floor*)
(def math-ceil*)
(def math-round*)
(def math-rint*)
(def math-pow*)
(def math-exp*)
(def math-log*)
(def math-log10*)
(def math-cbrt*)
(def math-hypot*)
(def math-sin*)
(def math-cos*)
(def math-tan*)
(def math-asin*)
(def math-acos*)
(def math-atan*)
(def math-atan2*)
(def math-sinh*)
(def math-cosh*)
(def math-tanh*)
(def math-signum*)
(def math-floor-div*)
(def math-floor-mod*)
(def math-to-radians*)
(def math-to-degrees*)

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
  (math-floor* x))

(defn ceil
  "Returns the smallest integer value ≥ x."
  [x]
  (math-ceil* x))

(defn round
  "Returns the closest integer to x, with ties rounding up (half-up)."
  [x]
  (math-round* x))

(defn rint
  "Returns the integer closest to x, with ties rounding to the nearest even
  integer (IEEE 754 round-half-to-even / banker's rounding)."
  [x]
  (math-rint* x))

;; ---------------------------------------------------------------------------
;; Exponents and logarithms
;; ---------------------------------------------------------------------------

(defn pow
  "Returns x raised to the power of y."
  [x y]
  (math-pow* x y))

(defn exp
  "Returns Euler's number e raised to the power of x."
  [x]
  (math-exp* x))

(defn log
  "Returns the natural logarithm (base e) of x."
  [x]
  (math-log* x))

(defn log10
  "Returns the base-10 logarithm of x."
  [x]
  (math-log10* x))

(defn sqrt
  "Returns the positive square root of x."
  [x]
  (clojure.core/sqrt x))

(defn cbrt
  "Returns the cube root of x."
  [x]
  (math-cbrt* x))

(defn hypot
  "Returns sqrt(x² + y²), avoiding intermediate overflow or underflow."
  [x y]
  (math-hypot* x y))

;; ---------------------------------------------------------------------------
;; Trigonometry
;; ---------------------------------------------------------------------------

(defn sin
  "Returns the trigonometric sine of angle x in radians."
  [x]
  (math-sin* x))

(defn cos
  "Returns the trigonometric cosine of angle x in radians."
  [x]
  (math-cos* x))

(defn tan
  "Returns the trigonometric tangent of angle x in radians."
  [x]
  (math-tan* x))

(defn asin
  "Returns the arc sine of x, in the range [-π/2, π/2]."
  [x]
  (math-asin* x))

(defn acos
  "Returns the arc cosine of x, in the range [0, π]."
  [x]
  (math-acos* x))

(defn atan
  "Returns the arc tangent of x, in the range (-π/2, π/2)."
  [x]
  (math-atan* x))

(defn atan2
  "Returns the angle θ from the conversion of rectangular coordinates (x, y)
  to polar (r, θ). Arguments are y first, then x."
  [y x]
  (math-atan2* y x))

;; ---------------------------------------------------------------------------
;; Hyperbolic
;; ---------------------------------------------------------------------------

(defn sinh
  "Returns the hyperbolic sine of x."
  [x]
  (math-sinh* x))

(defn cosh
  "Returns the hyperbolic cosine of x."
  [x]
  (math-cosh* x))

(defn tanh
  "Returns the hyperbolic tangent of x."
  [x]
  (math-tanh* x))

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
  (math-signum* x))

(defn floor-div
  "Returns the largest integer ≤ (/ x y). Unlike quot, floor-div rounds toward
  negative infinity rather than zero."
  [x y]
  (math-floor-div* x y))

(defn floor-mod
  "Returns x - (floor-div x y) * y. Unlike rem, the result has the same sign
  as y."
  [x y]
  (math-floor-mod* x y))

(defn to-radians
  "Converts an angle measured in degrees to an approximately equivalent angle
  measured in radians."
  [deg]
  (math-to-radians* deg))

(defn to-degrees
  "Converts an angle measured in radians to an approximately equivalent angle
  measured in degrees."
  [rad]
  (math-to-degrees* rad))
`,Mc=`(ns clojure.set)

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

(defn subset?
  "Is set1 a subset of set2?"
  [s1 s2]
  (every? #(contains? s2 %) s1))

(defn superset?
  "Is set1 a superset of set2?"
  [s1 s2]
  (every? #(contains? s1 %) s2))
`,Nc=`(ns clojure.string)

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
`,Lc=`(ns clojure.test)

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
;; with-testing-context* is a helper function defined in this namespace so
;; the (binding [*testing-contexts* ...]) form resolves the var correctly.
;; The macro expands to a qualified call so it works from any namespace.
;; ---------------------------------------------------------------------------

(defn with-testing-context* [string thunk]
  (binding [*testing-contexts* (conj *testing-contexts* string)]
    (thunk)))

(defmacro testing [string & body]
  \`(with-testing-context* ~string (fn [] ~@body)))

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
`,Ec=`(ns clojure.walk)

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
`,_r={"cljam.handbook":()=>Ic,"clojure.core":()=>Ac,"clojure.edn":()=>Pc,"clojure.math":()=>Cc,"clojure.set":()=>Mc,"clojure.string":()=>Nc,"clojure.test":()=>Lc,"clojure.walk":()=>Ec},W={def:"def",do:"do","fn*":"fn*",if:"if","let*":"let*","loop*":"loop*",recur:"recur",quote:"quote",try:"try",var:"var",ns:"ns",defmacro:"defmacro",binding:"binding","set!":"set!","letfn*":"letfn*","lazy-seq":"lazy-seq",async:"async",".":".","js/new":"js/new"},y={boolean:"boolean",character:"character",function:"function",nativeFunction:"native-function",keyword:"keyword",list:"list",macro:"macro",map:"map",nil:"nil",number:"number",regex:"regex",set:"set",string:"string",symbol:"symbol",vector:"vector",atom:"atom",delay:"delay",multiMethod:"multi-method",volatile:"volatile",var:"var",cons:"cons",lazySeq:"lazy-seq",reduced:"reduced",pending:"pending",namespace:"namespace",jsValue:"js-value",protocol:"protocol",record:"record"},j={LParen:"LParen",RParen:"RParen",LBracket:"LBracket",RBracket:"RBracket",LBrace:"LBrace",RBrace:"RBrace",String:"String",Number:"Number",Keyword:"Keyword",Quote:"Quote",Quasiquote:"Quasiquote",Unquote:"Unquote",UnquoteSplicing:"UnquoteSplicing",Comment:"Comment",Whitespace:"Whitespace",Symbol:"Symbol",AnonFnStart:"AnonFnStart",Deref:"Deref",Regex:"Regex",VarQuote:"VarQuote",Meta:"Meta",SetStart:"SetStart",NsMapPrefix:"NsMapPrefix",Discard:"Discard",ReaderTag:"ReaderTag",Character:"Character"},xe={Quote:"quote",Quasiquote:"quasiquote",Unquote:"unquote",UnquoteSplicing:"unquote-splicing",LParen:"(",RParen:")",LBracket:"[",RBracket:"]",LBrace:"{",RBrace:"}"},Tc=t=>t.kind==="nil",qr=t=>t.kind==="boolean",zc=t=>t.kind==="character",Sr=t=>t.kind==="nil"?!0:qr(t)?!t.value:!1,Vc=t=>!Sr(t),Dc=t=>t.kind==="symbol"&&t.name in W,Qe=t=>t.kind==="symbol",Fr=t=>t.kind==="vector",jr=t=>t.kind==="list",Rr=t=>t.kind==="function",Ir=t=>t.kind==="native-function",Bc=t=>t.kind==="macro",Mn=t=>t.kind==="map",Ar=t=>t.kind==="keyword",Pr=t=>Rr(t)||Ir(t),Cr=t=>t.kind==="js-value",Oc=t=>Pr(t)||Ar(t)||Mn(t)||Ln(t)||Nn(t)||Mr(t)||Cr(t)&&typeof t.value=="function",Hc=t=>t.kind==="multi-method",Uc=t=>t.kind==="atom",Wc=t=>t.kind==="reduced",Kc=t=>t.kind==="volatile",Jc=t=>t.kind==="regex",Mr=t=>t.kind==="var",Nn=t=>t.kind===y.set,Gc=t=>t.kind==="delay",Nr=t=>t.kind==="lazy-seq",Lr=t=>t.kind==="cons",hn=t=>t.kind==="namespace",Qc=t=>t.kind==="protocol",Ln=t=>t.kind==="record",Er=t=>Fr(t)||Mn(t)||Ln(t)||jr(t)||Nn(t)||Lr(t),Yc=t=>Er(t)||t.kind==="string"||Nr(t),Tr=t=>typeof t=="object"&&t!==null&&"kind"in t&&t.kind in y;function mt(t){let e=t;for(;e.kind==="lazy-seq";){const n=e;if(n.realized)e=n.value;else if(n.thunk)n.value=n.thunk(),n.thunk=null,n.realized=!0,e=n.value;else return{kind:"nil",value:null}}return e}function gn(t){if(t.kind==="nil")return[];if(t.kind==="list"||t.kind==="vector")return t.value;if(t.kind==="lazy-seq"){const e=mt(t);return gn(e)}if(t.kind==="cons"){const e=[];let n=t;for(;n.kind!=="nil";){if(n.kind==="cons"){e.push(n.head),n=n.tail;continue}if(n.kind==="lazy-seq"){n=mt(n);continue}if(n.kind==="list"||n.kind==="vector"){e.push(...n.value);break}return null}return e}return null}const Xc={[y.number]:(t,e)=>t.value===e.value,[y.string]:(t,e)=>t.value===e.value,[y.character]:(t,e)=>t.value===e.value,[y.boolean]:(t,e)=>t.value===e.value,[y.nil]:()=>!0,[y.symbol]:(t,e)=>t.name===e.name,[y.keyword]:(t,e)=>t.name===e.name,[y.vector]:(t,e)=>t.value.length!==e.value.length?!1:t.value.every((n,r)=>ae(n,e.value[r])),[y.map]:(t,e)=>{if(t.entries.length!==e.entries.length)return!1;const n=new Set([...t.entries.map(([r])=>r),...e.entries.map(([r])=>r)]);for(const r of n){const s=t.entries.find(([i])=>ae(i,r));if(!s)return!1;const o=e.entries.find(([i])=>ae(i,r));if(!o||!ae(s[1],o[1]))return!1}return!0},[y.list]:(t,e)=>t.value.length!==e.value.length?!1:t.value.every((n,r)=>ae(n,e.value[r])),[y.atom]:(t,e)=>t===e,[y.reduced]:(t,e)=>ae(t.value,e.value),[y.volatile]:(t,e)=>t===e,[y.regex]:(t,e)=>t===e,[y.var]:(t,e)=>t===e,[y.set]:(t,e)=>t.values.length!==e.values.length?!1:t.values.every(n=>e.values.some(r=>ae(n,r))),[y.delay]:(t,e)=>t===e,[y.lazySeq]:(t,e)=>{const n=mt(t),r=mt(e);return ae(n,r)},[y.cons]:(t,e)=>ae(t.head,e.head)&&ae(t.tail,e.tail),[y.namespace]:(t,e)=>t===e,[y.record]:(t,e)=>t.ns!==e.ns||t.recordType!==e.recordType||t.fields.length!==e.fields.length?!1:t.fields.every(([n,r],s)=>{const[o,i]=e.fields[s];return ae(n,o)&&ae(r,i)})},Zc=t=>t.kind==="string",ae=(t,e)=>{if(t.kind==="lazy-seq")return ae(mt(t),e);if(e.kind==="lazy-seq")return ae(t,mt(e));const n=t.kind==="list"||t.kind==="vector"||t.kind==="cons",r=e.kind==="list"||e.kind==="vector"||e.kind==="cons";if(n&&r){const o=gn(t),i=gn(e);return o===null||i===null||o.length!==i.length?!1:o.every((l,c)=>ae(l,i[c]))}if(t.kind!==e.kind)return!1;const s=Xc[t.kind];return s?s(t,e):!1},eu=t=>t.kind==="number",tu=t=>t.kind==="pending",u={nil:Tc,number:eu,string:Zc,boolean:qr,char:zc,falsy:Sr,truthy:Vc,specialForm:Dc,symbol:Qe,vector:Fr,list:jr,function:Rr,nativeFunction:Ir,macro:Bc,map:Mn,keyword:Ar,aFunction:Pr,callable:Oc,multiMethod:Hc,atom:Uc,reduced:Wc,volatile:Kc,regex:Jc,var:Mr,set:Nn,delay:Gc,lazySeq:Nr,cons:Lr,namespace:hn,protocol:Qc,record:Ln,collection:Er,seqable:Yc,cljValue:Tr,equal:ae,jsValue:Cr,pending:tu};class Ce extends Error{constructor(n,r){super(n);le(this,"context");this.name="TokenizerError",this.context=r}}class M extends Error{constructor(n,r,s){super(n);le(this,"context");le(this,"pos");this.name="ReaderError",this.context=r,this.pos=s}}class f extends Error{constructor(n,r,s){super(n);le(this,"context");le(this,"pos");le(this,"data");le(this,"frames");le(this,"code");this.name="EvaluationError",this.context=r,this.pos=s}static atArg(n,r,s){const o=new f(n,r);return o.data={argIndex:s},o}}class Le{constructor(e){le(this,"value");this.value=e}}const nu=t=>({kind:"number",value:t}),zr=t=>({kind:"string",value:t}),ru=t=>({kind:"character",value:t}),su=t=>({kind:"boolean",value:t}),Dt=t=>({kind:"keyword",name:t}),Ze=()=>({kind:"nil",value:null}),Vr=t=>({kind:"symbol",name:t}),Dr=t=>({kind:"list",value:t}),au=t=>({kind:"set",values:t}),vn=t=>({kind:"vector",value:t}),Br=t=>({kind:"map",entries:t}),ou=(t,e,n,r)=>({kind:"function",arities:[{params:t,restParam:e,body:n}],env:r}),iu=(t,e)=>({kind:"function",arities:t,env:e}),lu=(t,e,n,r)=>({kind:"macro",arities:[{params:t,restParam:e,body:n}],env:r}),cu=(t,e)=>({kind:"macro",arities:t,env:e}),uu=(t,e="")=>({kind:"regex",pattern:t,flags:e}),du=(t,e,n,r)=>({kind:"var",ns:t,name:e,value:n,meta:r}),fu=t=>({kind:"atom",value:t}),mu=t=>({kind:"reduced",value:t}),pu=t=>({kind:"volatile",value:t}),hu=t=>({kind:"delay",thunk:t,realized:!1}),gu=t=>({kind:"lazy-seq",thunk:t,realized:!1}),vu=(t,e)=>({kind:"cons",head:t,tail:e}),yu=t=>({kind:"namespace",name:t,vars:new Map,aliases:new Map,readerAliases:new Map}),bu=t=>({kind:"js-value",value:t}),wu=(t,e,n,r)=>({kind:"protocol",name:t,ns:e,fns:n,doc:r,impls:new Map}),ku=(t,e,n)=>({kind:"record",recordType:t,ns:e,fields:n}),xu=t=>{const e={kind:"pending",promise:t};return t.then(n=>{e.resolved=!0,e.resolvedValue=n},()=>{}),e};function $u(t,e){return Br([[Dt(":doc"),zr(t)],...e?[[Dt(":arglists"),vn(e.map(n=>vn(n.map(Vr))))]]:[]])}function yn(t){const e={kind:"native-function",name:t.name,fn:t.fn,...t.fnWithContext!==void 0?{fnWithContext:t.fnWithContext}:{},...t.meta!==void 0?{meta:t.meta}:{}};return{...e,doc(n,r){return yn({...e,meta:$u(n,r)})}}}const _u=(t,e,n,r,s)=>({kind:"multi-method",name:t,dispatchFn:e,methods:n,defaultMethod:r,defaultDispatchVal:s}),a={number:nu,string:zr,char:ru,boolean:su,keyword:Dt,nil:Ze,symbol:Vr,kw:Dt,list:Dr,vector:vn,map:Br,set:au,cons:vu,function:ou,multiArityFunction:iu,macro:lu,multiArityMacro:cu,multiMethod:_u,nativeFn(t,e){return yn({name:t,fn:e})},nativeFnCtx(t,e){return yn({name:t,fn:()=>{throw new f("Native function called without context",{name:t})},fnWithContext:e})},var:du,atom:fu,regex:uu,reduced:mu,volatile:pu,delay:hu,lazySeq:gu,namespace:yu,pending:xu,jsValue:bu,protocol:wu,record:ku};class Bt extends Error{constructor(n,r){super(n);le(this,"context");this.name="ConversionError",this.context=r}}const qu=new Set(["list","vector","map"]),Su={applyFunction:()=>{throw new Bt("Cannot convert a CLJ function to JS in this context — use session.cljToJs() instead.")}};function et(t,e){switch(t.kind){case"number":return t.value;case"string":return t.value;case"boolean":return t.value;case"nil":return null;case"keyword":return t.name.startsWith(":")?t.name.slice(1):t.name;case"symbol":return t.name;case"list":case"vector":return t.value.map(n=>et(n,e));case"map":{const n={};for(const[r,s]of t.entries){if(qu.has(r.kind))throw new Bt(`Rich key types (${r.kind}) are not supported in JS object conversion. Restructure your map to use string, keyword, or number keys.`,{key:r,value:s});const o=String(et(r,e));n[o]=et(s,e)}return n}case"function":case"native-function":{const n=t;return(...r)=>{const s=r.map(i=>$t(i)),o=e.applyFunction(n,s);return et(o,e)}}case"macro":throw new Bt("Macros cannot be exported to JavaScript. Macros are compile-time constructs.",{macro:t})}}function $t(t,e={}){const{keywordizeKeys:n=!0}=e;if(t===null)return a.nil();if(t===void 0)return a.jsValue(void 0);if(Tr(t))return t;switch(typeof t){case"number":return a.number(t);case"string":return a.string(t);case"boolean":return a.boolean(t);case"function":{const r=t;return a.nativeFn("js-fn",(...s)=>{const o=s.map(l=>et(l,Su)),i=r(...o);return $t(i,e)})}case"object":{if(Array.isArray(t))return a.vector(t.map(s=>$t(s,e)));const r=Object.entries(t).map(([s,o])=>[n?a.keyword(`:${s}`):a.string(s),$t(o,e)]);return a.map(r)}default:throw new Bt(`Cannot convert JS value of type ${typeof t} to CljValue`,{value:t})}}class Fu extends Error{constructor(n,r){super(n);le(this,"context");this.context=r,this.name="EnvError"}}function ye(t){return t.kind!=="var"?t:t.dynamic&&t.bindingStack&&t.bindingStack.length>0?t.bindingStack[t.bindingStack.length-1]:t.value}function Ot(t){return{kind:"namespace",name:t,vars:new Map,aliases:new Map,readerAliases:new Map}}function Ke(t){return{bindings:new Map,outer:t??null}}function Or(t,e){var r;let n=e;for(;n;){const s=n.bindings.get(t);if(s!==void 0)return s;const o=(r=n.ns)==null?void 0:r.vars.get(t);if(o!==void 0)return ye(o);n=n.outer}throw new f(`Symbol ${t} not found`,{name:t})}function Ht(t,e){var r;let n=e;for(;n;){const s=n.bindings.get(t);if(s!==void 0)return s;const o=(r=n.ns)==null?void 0:r.vars.get(t);if(o!==void 0)return ye(o);n=n.outer}}function K(t,e,n,r){const s=n.ns,o=s.vars.get(t);o?(o.value=e,r&&(o.meta=r)):s.vars.set(t,a.var(s.name,t,e,r))}function pt(t,e){var r;let n=e;for(;n;){const s=n.bindings.get(t);if(s!==void 0&&s.kind==="var")return s;const o=(r=n.ns)==null?void 0:r.vars.get(t);if(o!==void 0)return o;n=n.outer}}function ju(t,e,n){n.bindings.set(t,e)}function ze(t,e,n){if(t.length!==e.length)throw new Fu("Number of parameters and arguments must match",{params:t,args:e,outer:n});const r=Ke(n);for(let s=0;s<t.length;s++)ju(t[s],e[s],r);return r}function Ru(t){let e=t;for(;e!=null&&e.outer;)e=e.outer;return e}function de(t){let e=t;for(;e;){if(e.ns)return e;e=e.outer}return Ru(t)}const Iu=100;function Au(t){let e=t;for(;u.lazySeq(e);){const n=e;if(n.realized){e=n.value;continue}if(n.thunk)n.value=n.thunk(),n.thunk=null,n.realized=!0,e=n.value;else return a.nil()}return e}function Pu(t,e,n){const r=[];let s=t;for(;r.length<e&&!u.nil(s);){if(u.lazySeq(s)){s=Au(s);continue}if(u.cons(s)){const o=s;r.push(b(o.head,n+1)),s=o.tail;continue}if(u.list(s)){for(const o of s.value){if(r.length>=e)break;r.push(b(o,n+1))}break}if(u.vector(s)){for(const o of s.value){if(r.length>=e)break;r.push(b(o,n+1))}break}r.push(b(s,n+1));break}return{items:r,truncated:r.length>=e}}let Re={printLength:null,printLevel:null};function bt(){return Re}function Fe(t,e){const n=Re;Re=t;try{return e()}finally{Re=n}}function je(t){var o,i;const e=(o=t.resolveNs("clojure.core"))==null?void 0:o.vars.get("*print-length*"),n=(i=t.resolveNs("clojure.core"))==null?void 0:i.vars.get("*print-level*"),r=e?ye(e):void 0,s=n?ye(n):void 0;return{printLength:r&&u.number(r)?r.value:null,printLevel:s&&u.number(s)?s.value:null}}function b(t,e=0){const{printLevel:n}=Re;return n!==null&&e>=n&&(u.list(t)||u.vector(t)||u.map(t)||u.set(t)||u.cons(t)||u.lazySeq(t))?"#":Mu(t,e)}function Hr(t){if(t.length===0)return null;let e=null;for(const[n]of t){if(n.kind!=="keyword")return null;const r=n.name.slice(1),s=r.indexOf("/");if(s===-1)return null;const o=r.slice(0,s);if(e===null)e=o;else if(e!==o)return null}return e}function Ur(t,e){const n=t.name.slice(1),r=n.indexOf("/"),s=r===-1?n:n.slice(r+1);return b(a.keyword(`:${s}`),e)}const Cu={" ":"space","\n":"newline","	":"tab","\r":"return","\b":"backspace","\f":"formfeed"};function Mu(t,e){var n;switch(t.kind){case y.character:{const s=Cu[t.value];return s?`\\${s}`:`\\${t.value}`}case y.number:return t.value.toString();case y.string:let r="";for(const s of t.value)switch(s){case'"':r+='\\"';break;case"\\":r+="\\\\";break;case`
`:r+="\\n";break;case"\r":r+="\\r";break;case"	":r+="\\t";break;default:r+=s}return`"${r}"`;case y.boolean:return t.value?"true":"false";case y.nil:return"nil";case y.keyword:return`${t.name}`;case y.symbol:return`${t.name}`;case y.list:{const{printLength:s}=Re,o=s!==null?t.value.slice(0,s):t.value,i=s!==null&&t.value.length>s?" ...":"";return`(${o.map(l=>b(l,e+1)).join(" ")}${i})`}case y.vector:{const{printLength:s}=Re,o=s!==null?t.value.slice(0,s):t.value,i=s!==null&&t.value.length>s?" ...":"";return`[${o.map(l=>b(l,e+1)).join(" ")}${i}]`}case y.map:{const{printLength:s}=Re,o=s!==null?t.entries.slice(0,s):t.entries,i=s!==null&&t.entries.length>s?" ...":"",l=Hr(o);if(l!==null){const c=o.map(([d,m])=>`${Ur(d,e+1)} ${b(m,e+1)}`).join(" ");return`#:${l}{${c}${i}}`}return`{${o.map(([c,d])=>`${b(c,e+1)} ${b(d,e+1)}`).join(" ")}${i}}`}case y.function:{if(t.arities.length===1){const o=t.arities[0];return`(fn [${(o.restParam?[...o.params,a.symbol("&"),o.restParam]:o.params).map(b).join(" ")}] ${o.body.map(b).join(" ")})`}return`(fn ${t.arities.map(o=>`([${(o.restParam?[...o.params,a.symbol("&"),o.restParam]:o.params).map(b).join(" ")}] ${o.body.map(b).join(" ")})`).join(" ")})`}case y.nativeFunction:return`(native-fn ${t.name})`;case y.multiMethod:return`(multi-method ${t.name})`;case y.atom:return`#<Atom ${b(t.value,e+1)}>`;case y.reduced:return`#<Reduced ${b(t.value,e+1)}>`;case y.volatile:return`#<Volatile ${b(t.value,e+1)}>`;case y.regex:{const s=t.pattern.replace(/"/g,'\\"');return`#"${t.flags?`(?${t.flags})`:""}${s}"`}case y.var:return`#'${t.ns}/${t.name}`;case y.set:{const{printLength:s}=Re,o=s!==null?t.values.slice(0,s):t.values,i=s!==null&&t.values.length>s?" ...":"";return`#{${o.map(l=>b(l,e+1)).join(" ")}${i}}`}case y.delay:return t.realized?`#<Delay @${b(t.value,e+1)}>`:"#<Delay pending>";case y.lazySeq:case y.cons:{const{printLength:s}=Re,o=s!==null?s:Iu,{items:i,truncated:l}=Pu(t,o,e),c=l?" ...":"";return`(${i.join(" ")}${c})`}case y.namespace:return`#namespace[${t.name}]`;case y.protocol:return`#protocol[${t.ns}/${t.name}]`;case y.record:{const s=t.fields.map(([o,i])=>`${b(o,e+1)} ${b(i,e+1)}`).join(" ");return`#${t.ns}/${t.recordType}{${s}}`}case"pending":return t.resolved&&t.resolvedValue!==void 0?`#<Pending @${b(t.resolvedValue,e+1)}>`:"#<Pending>";case y.jsValue:{const s=t.value;return s===null?"#<js null>":s===void 0?"#<js undefined>":s instanceof Date?s.toISOString():typeof s=="function"?"#<js Function>":Array.isArray(s)?"#<js Array>":s instanceof Promise?"#<js Promise>":`#<js ${((n=s.constructor)==null?void 0:n.name)??"Object"}>`}default:throw new f(`unhandled value type: ${t.kind}`,{value:t})}}function Mt(t){return t.join(`
`)}const Gn={do:0,try:0,and:0,or:0,cond:0,"->":0,"->>":0,"some->":0,"some->>":0,when:1,"when-not":1,"when-let":1,"when-some":1,"when-first":1,if:1,"if-not":1,"if-let":1,"if-some":1,while:1,let:1,loop:1,binding:1,"with-open":1,"with-local-vars":1,locking:1,fn:1,"fn*":1,def:1,defonce:1,ns:1,doseq:1,dotimes:1,for:1,case:1,"cond->":1,"cond->>":1,defn:2,"defn-":2,defmacro:2,defmethod:2},Nu=new Set(["let","loop",W.binding,"with-open","for","doseq","dotimes"]),Lu=new Set(["cond","condp","case","cond->","cond->>"]);function ce(t){return t>0?" ".repeat(t):""}function Eu(t){const e=t.lastIndexOf(`
`);return e===-1?t.length:t.length-e-1}function ue(t,e,n){const r=b(t);if(e+r.length<=n)return r;switch(t.kind){case y.list:return zu(t.value,e,n);case y.vector:return Wr(t.value,e,n,!1);case y.map:return Vu(t.entries,e,n);case y.set:return Du(t.values,e,n);case y.record:return Tu(t.fields,t.ns,t.recordType,e,n);case y.lazySeq:case y.cons:return r;default:return r}}function Tu(t,e,n,r,s){if(t.length===0)return`#${e}/${n}{}`;const o=`#${e}/${n}{`,i=r+o.length,l=t.map(([c,d],m)=>{const p=b(c),h=ue(d,i+p.length+1,s);return(m===0?"":ce(i))+p+" "+h});return o+l.join(`
`)+"}"}function zu(t,e,n){if(t.length===0)return"()";const[r,...s]=t,o=b(r),i=r.kind===y.symbol?r.name:null;if(i!==null&&i in Gn){const m=Gn[i],p=s.slice(0,m),h=s.slice(m),g=e+2;let w="("+o,k=e+1+o.length;for(let I=0;I<p.length;I++){const N=p[I],P=k+1,A=Nu.has(i)&&I===0&&N.kind===y.vector?Wr(N.value,P,n,!0):ue(N,P,n);w+=" "+A,k=A.includes(`
`)?Eu(A):P+A.length-1}if(h.length===0)return w+")";const S=Lu.has(i)?Bu(h,g,n):h.map(I=>ce(g)+ue(I,g,n)).join(`
`);return w+`
`+S+")"}if(s.length===0)return"("+o+")";const l=e+1+o.length+1;if(s.length===1)return"("+o+" "+ue(s[0],l,n)+")";const c=o.length<=10?l:e+2,d=s.map(m=>ue(m,c,n));return c===l?"("+o+" "+d[0]+`
`+d.slice(1).map(m=>ce(c)+m).join(`
`)+")":"("+o+`
`+d.map(m=>ce(c)+m).join(`
`)+")"}function Wr(t,e,n,r){if(t.length===0)return"[]";const s=e+1;if(r){const i=[];for(let l=0;l<t.length;l+=2){const c=l===0?"":ce(s),d=b(t[l]);if(l+1>=t.length){i.push(c+d);continue}const m=t[l+1],p=d+" "+b(m);if(s+p.length<=n)i.push(c+p);else{const h=ue(m,s+d.length+1,n);i.push(c+d+" "+h)}}return"["+i.join(`
`)+"]"}return"["+t.map((i,l)=>{const c=ue(i,s,n);return(l===0?"":ce(s))+c}).join(`
`)+"]"}function Vu(t,e,n){if(t.length===0)return"{}";const r=Hr(t);if(r!==null){const i=`#:${r}{`,l=e+i.length,c=t.map(([d,m],p)=>{const h=Ur(d,0),g=ue(m,l+h.length+1,n);return(p===0?"":ce(l))+h+" "+g});return i+c.join(`
`)+"}"}const s=e+1;return"{"+t.map(([i,l],c)=>{const d=b(i),m=ue(l,s+d.length+1,n);return(c===0?"":ce(s))+d+" "+m}).join(`
`)+"}"}function Du(t,e,n){if(t.length===0)return"#{}";const r=e+2;return"#{"+t.map((o,i)=>{const l=ue(o,r,n);return(i===0?"":ce(r))+l}).join(`
`)+"}"}function Bu(t,e,n){const r=[];for(let s=0;s<t.length;s+=2){const o=ue(t[s],e,n);if(s+1>=t.length){r.push(ce(e)+o);continue}const i=b(t[s+1]),l=o+" "+i;e+l.length<=n?r.push(ce(e)+l):r.push(ce(e)+o+`
`+ce(e+2)+ue(t[s+1],e+2,n))}return r.join(`
`)}function Kr(t,e=80){return ue(t,0,e)}function _e(t,e){Object.defineProperty(t,"_pos",{value:e,enumerable:!1,writable:!0,configurable:!0})}function R(t){return t._pos}function tn(t,e){const n=t.split(`
`);let r=0;for(let o=0;o<n.length;o++){const i=r+n[o].length;if(e<=i)return{line:o+1,col:e-r,lineText:n[o]};r=i+1}const s=n[n.length-1];return{line:n.length,col:s.length,lineText:s}}function Qn(t,e,n){const{line:r,col:s,lineText:o}=tn(t,e.start),i=r+((n==null?void 0:n.lineOffset)??0),l=r===1?s+((n==null?void 0:n.colOffset)??0):s,c=Math.max(1,e.end-e.start),d=" ".repeat(s)+"^".repeat(c);return`
  at line ${i}, col ${l+1}:
  ${o}
  ${d}`}function Jr(t,e){return a.vector(t.map(n=>{let r=n.line,s=n.col;if((r===null||s===null)&&n.pos&&e){const o=tn(e,n.pos.start);r=o.line,s=o.col+1}return a.map([[a.keyword(":fn"),n.fnName!==null?a.string(n.fnName):a.nil()],[a.keyword(":line"),r!==null?a.number(r):a.nil()],[a.keyword(":col"),s!==null?a.number(s):a.nil()],[a.keyword(":source"),n.source!==null?a.string(n.source):a.nil()]])}))}function Yn(t,e,n){if(t.length===0)return"";const s=t.slice(0,20),o=t.length-s.length,i=[];for(const l of s){const c=l.fnName??"<anonymous>";if(l.pos&&e){const{line:d,col:m}=tn(e,l.pos.start),p=d+((n==null?void 0:n.lineOffset)??0),h=d===1?m+((n==null?void 0:n.colOffset)??0):m;i.push(`  at ${c} (line ${p}, col ${h+1})`)}else i.push(`  at ${c}`)}return o>0&&i.push(`  ... ${o} more frames`),`
`+i.join(`
`)}function Gr(t,e){var n;if(t instanceof f&&((n=t.data)==null?void 0:n.argIndex)!==void 0&&!t.pos){const r=e.value[t.data.argIndex+1];if(r){const s=R(r);s&&(t.pos=s)}}}function Y(t){switch(t.kind){case y.string:return t.value;case y.character:return t.value;case y.number:return t.value.toString();case y.boolean:return t.value?"true":"false";case y.keyword:return t.name;case y.symbol:return t.name;case y.list:{const{printLength:e}=bt(),n=e!==null?t.value.slice(0,e):t.value,r=e!==null&&t.value.length>e?" ...":"";return`(${n.map(Y).join(" ")}${r})`}case y.vector:{const{printLength:e}=bt(),n=e!==null?t.value.slice(0,e):t.value,r=e!==null&&t.value.length>e?" ...":"";return`[${n.map(Y).join(" ")}${r}]`}case y.map:{const{printLength:e}=bt(),n=e!==null?t.entries.slice(0,e):t.entries,r=e!==null&&t.entries.length>e?" ...":"";return`{${n.map(([s,o])=>`${Y(s)} ${Y(o)}`).join(" ")}${r}}`}case y.set:{const{printLength:e}=bt(),n=e!==null?t.values.slice(0,e):t.values,r=e!==null&&t.values.length>e?" ...":"";return`#{${n.map(Y).join(" ")}${r}}`}case y.function:{if(t.arities.length===1){const n=t.arities[0];return`(fn [${(n.restParam?[...n.params,{kind:"symbol",name:"&"},n.restParam]:n.params).map(Y).join(" ")}] ${n.body.map(Y).join(" ")})`}return`(fn ${t.arities.map(n=>`([${(n.restParam?[...n.params,{kind:"symbol",name:"&"},n.restParam]:n.params).map(Y).join(" ")}] ${n.body.map(Y).join(" ")})`).join(" ")})`}case y.nativeFunction:return`(native-fn ${t.name})`;case y.nil:return"nil";case y.regex:return`${t.flags?`(?${t.flags})`:""}${t.pattern}`;case y.delay:return t.realized?`#<Delay @${Y(t.value)}>`:"#<Delay pending>";case y.lazySeq:{const e=ge(t);return u.nil(e)?"()":Y(e)}case y.cons:{const e=En(t),{printLength:n}=bt(),r=n!==null?e.slice(0,n):e,s=n!==null&&e.length>n?" ...":"";return`(${r.map(Y).join(" ")}${s})`}case y.namespace:return`#namespace[${t.name}]`;case y.protocol:return`#protocol[${t.ns}/${t.name}]`;case y.record:{const e=t.fields.map(([n,r])=>`${Y(n)} ${Y(r)}`).join(" ");return`#${t.recordType}{${e}}`}case"pending":return t.resolved&&t.resolvedValue!==void 0?`#<Pending @${Y(t.resolvedValue)}>`:"#<Pending>";default:throw new f(`unhandled value type: ${t.kind}`,{value:t})}}function Qr(t){return t.realized||(t.value=t.thunk(),t.realized=!0),t.value}function ge(t){let e=t;for(;e.kind==="lazy-seq";){const n=e;if(n.realized){e=n.value;continue}if(n.thunk)n.value=n.thunk(),n.thunk=null,n.realized=!0,e=n.value;else return{kind:"nil",value:null}}return e}const X=t=>{if(u.list(t)||u.vector(t))return t.value;if(u.map(t))return t.entries.map(([e,n])=>a.vector([e,n]));if(u.record(t))return t.fields.map(([e,n])=>a.vector([e,n]));if(u.set(t))return t.values;if(t.kind==="string")return[...t.value].map(a.string);if(u.lazySeq(t)){const e=ge(t);return u.nil(e)?[]:X(e)}if(u.cons(t))return En(t);throw new f(`toSeq expects a collection or string, got ${b(t)}`,{collection:t})};function En(t){const e=[t.head];let n=t.tail;for(;!u.nil(n);){if(u.cons(n)){e.push(n.head),n=n.tail;continue}if(u.lazySeq(n)){n=ge(n);continue}if(u.list(n)){e.push(...n.value);break}if(u.vector(n)){e.push(...n.value);break}e.push(...X(n));break}return e}function bn(t){if(u.nil(t))return[];if(u.list(t)||u.vector(t))return t.value;if(u.lazySeq(t)){const e=ge(t);return bn(e)}if(u.cons(t))return En(t);throw new f(`Cannot destructure ${t.kind} as a sequential collection`,{value:t})}function Yr(t){if(u.nil(t))return a.nil();if(u.lazySeq(t)){const e=ge(t);return u.nil(e)?a.nil():Yr(e)}return u.cons(t)?t.head:(u.list(t)||u.vector(t))&&t.value.length>0?t.value[0]:a.nil()}function Xr(t){if(u.nil(t))return a.list([]);if(u.lazySeq(t)){const e=ge(t);return u.nil(e)?a.list([]):Xr(e)}return u.cons(t)?t.tail:u.list(t)||u.vector(t)?a.list(t.value.slice(1)):a.list([])}function wn(t){if(u.nil(t))return!0;if(u.lazySeq(t)){const e=ge(t);return wn(e)}return u.cons(t)?!1:u.list(t)||u.vector(t)?t.value.length===0:!0}function Ou(t){return u.lazySeq(t)||u.cons(t)}function Se(t,e){const n=t.entries.find(([r])=>u.equal(r,e));return n?n[1]:void 0}function Rt(t,e){return t.entries.some(([n])=>u.equal(n,e))}function Hu(t,e,n,r){const s=[],o=[...t],i=o.findIndex(m=>u.keyword(m)&&m.name===":as");if(i!==-1){const m=o[i+1];if(!m||!u.symbol(m))throw new f(":as must be followed by a symbol",{pattern:t});s.push([m.name,e]),o.splice(i,2)}const l=o.findIndex(m=>u.symbol(m)&&m.name==="&");let c=null,d;if(l!==-1){if(c=o[l+1],!c)throw new f("& must be followed by a binding pattern",{pattern:t});d=l,o.splice(l)}else d=o.length;if(Ou(e)){let m=e;for(let p=0;p<d;p++)s.push(...$e(o[p],Yr(m),n,r)),m=Xr(m);if(c!==null)if(u.map(c)&&!wn(m)){const p=bn(m),h=[];for(let g=0;g<p.length;g+=2)h.push([p[g],p[g+1]??a.nil()]);s.push(...$e(c,{kind:"map",entries:h},n,r))}else{const p=wn(m)?a.nil():m;s.push(...$e(c,p,n,r))}}else{const m=bn(e);for(let p=0;p<d;p++)s.push(...$e(o[p],m[p]??a.nil(),n,r));if(c!==null){const p=m.slice(d);let h;if(u.map(c)&&p.length>0){const g=[];for(let w=0;w<p.length;w+=2)g.push([p[w],p[w+1]??a.nil()]);h={kind:"map",entries:g}}else h=p.length>0?a.list(p):a.nil();s.push(...$e(c,h,n,r))}}return s}function Uu(t,e,n,r){const s=[],o=Se(t,a.keyword(":or")),i=o&&u.map(o)?o:null,l=Se(t,a.keyword(":as")),c=u.nil(e);if(!u.map(e)&&!c)throw new f(`Cannot destructure ${e.kind} as a map`,{value:e,pattern:t},R(t));const d=c?a.map([]):e;for(const[m,p]of t.entries){if(u.keyword(m)&&m.name===":or"||u.keyword(m)&&m.name===":as")continue;if(u.keyword(m)&&m.name===":keys"){if(!u.vector(p))throw new f(":keys must be followed by a vector of symbols",{pattern:t},R(p)??R(t));for(const k of p.value){if(!u.symbol(k))throw new f(":keys vector must contain symbols",{pattern:t,sym:k},R(k)??R(p));const S=k.name.indexOf("/"),I=S!==-1?k.name.slice(S+1):k.name,N=a.keyword(":"+k.name),P=Rt(d,N),D=P?Se(d,N):void 0;let A;if(P)A=D;else if(i){const O=Se(i,a.symbol(I));A=O!==void 0?n.evaluate(O,r):a.nil()}else A=a.nil();s.push([I,A])}continue}if(u.keyword(m)&&m.name===":strs"){if(!u.vector(p))throw new f(":strs must be followed by a vector of symbols",{pattern:t},R(p)??R(t));for(const k of p.value){if(!u.symbol(k))throw new f(":strs vector must contain symbols",{pattern:t,sym:k},R(k)??R(p));const S=a.string(k.name),I=Rt(d,S),N=I?Se(d,S):void 0;let P;if(I)P=N;else if(i){const D=Se(i,a.symbol(k.name));P=D!==void 0?n.evaluate(D,r):a.nil()}else P=a.nil();s.push([k.name,P])}continue}if(u.keyword(m)&&m.name===":syms"){if(!u.vector(p))throw new f(":syms must be followed by a vector of symbols",{pattern:t},R(p)??R(t));for(const k of p.value){if(!u.symbol(k))throw new f(":syms vector must contain symbols",{pattern:t,sym:k},R(k)??R(p));const S=a.symbol(k.name),I=Rt(d,S),N=I?Se(d,S):void 0;let P;if(I)P=N;else if(i){const D=Se(i,a.symbol(k.name));P=D!==void 0?n.evaluate(D,r):a.nil()}else P=a.nil();s.push([k.name,P])}continue}const h=Se(d,p),g=Rt(d,p);let w;if(g)w=h;else if(i&&u.symbol(m)){const k=Se(i,a.symbol(m.name));w=k!==void 0?n.evaluate(k,r):a.nil()}else w=a.nil();s.push(...$e(m,w,n,r))}return l&&u.symbol(l)&&s.push([l.name,e]),s}function $e(t,e,n,r){if(u.symbol(t))return[[t.name,e]];if(u.vector(t))return Hu(t.value,e,n,r);if(u.map(t))return Uu(t,e,n,r);throw new f(`Invalid destructuring pattern: expected symbol, vector, or map, got ${t.kind}`,{pattern:t},R(t))}const It="&";class ve{constructor(e){le(this,"args");this.args=e}}function Xn(t,e){const n=t.value.findIndex(o=>u.symbol(o)&&o.name===It);let r=[],s=null;if(n===-1)r=t.value;else{if(t.value.filter(i=>u.symbol(i)&&i.name===It).length>1)throw new f(`${It} can only appear once`,{args:t,env:e},R(t));if(n!==t.value.length-2)throw new f(`${It} must be second-to-last argument`,{args:t,env:e},R(t));r=t.value.slice(0,n),s=t.value[n+1]}return{params:r,restParam:s}}function Zr(t,e){if(t.length===0)throw new f("fn/defmacro requires at least a parameter vector",{forms:t,env:e});if(u.vector(t[0])){const n=t[0],{params:r,restParam:s}=Xn(n,e);return[{params:r,restParam:s,body:t.slice(1)}]}if(u.list(t[0])){const n=[];for(const s of t){if(!u.list(s)||s.value.length===0)throw new f("Multi-arity clause must be a list starting with a parameter vector",{form:s,env:e},R(s));const o=s.value[0];if(!u.vector(o))throw new f("First element of arity clause must be a parameter vector",{paramVec:o,env:e},R(o)??R(s));const{params:i,restParam:l}=Xn(o,e);n.push({params:i,restParam:l,body:s.value.slice(1)})}if(n.filter(s=>s.restParam!==null).length>1)throw new f("At most one variadic arity is allowed per function",{forms:t,env:e});return n}throw new f("fn/defmacro expects a parameter vector or arity clauses",{forms:t,env:e},R(t[0]))}function Tn(t,e,n,r,s,o){if(e===null){if(n.length!==t.length)throw new f(`Arguments length mismatch: fn accepts ${t.length} arguments, but ${n.length} were provided`,{params:t,args:n,outerEnv:r})}else if(n.length<t.length)throw new f(`Arguments length mismatch: fn expects at least ${t.length} arguments, but ${n.length} were provided`,{params:t,args:n,outerEnv:r});const i=[];for(let l=0;l<t.length;l++)i.push(...$e(t[l],n[l],s,o));if(e!==null){const l=n.slice(t.length);let c;if(u.map(e)&&l.length>0){const d=[];for(let m=0;m<l.length;m+=2)d.push([l[m],l[m+1]??Ze()]);c={kind:"map",entries:d}}else c=l.length>0?Dr(l):Ze();i.push(...$e(e,c,s,o))}return ze(i.map(([l])=>l),i.map(([,l])=>l),r)}function nn(t,e){const n=t.find(o=>o.restParam===null&&o.params.length===e);if(n)return n;const r=t.find(o=>o.restParam!==null&&e>=o.params.length);if(r)return r;const s=t.map(o=>o.restParam?`${o.params.length}+`:`${o.params.length}`);throw new f(`No matching arity for ${e} arguments. Available arities: ${s.join(", ")}`,{arities:t,argCount:e})}function oe(t){return t===null?a.nil():t===void 0?a.jsValue(void 0):typeof t=="number"?a.number(t):typeof t=="string"?a.string(t):typeof t=="boolean"?a.boolean(t):a.jsValue(t)}function Wu(t){if(u.string(t))return t.value;if(u.keyword(t))return t.name.slice(1);if(u.number(t)||u.boolean(t))return String(t.value);throw new f(`cljToJs: map key must be a string, keyword, number, or boolean — got ${t.kind} (rich keys are not allowed as JS object keys; reduce to a primitive first)`,{key:t})}function pe(t,e,n){switch(t.kind){case"js-value":return t.value;case"number":return t.value;case"string":return t.value;case"boolean":return t.value;case"nil":return null;case"keyword":return t.name.slice(1);case"function":case"native-function":{const r=t;return(...s)=>{const o=s.map(oe),i=e.applyCallable(r,o,n);return pe(i,e,n)}}case"list":case"vector":return t.value.map(r=>pe(r,e,n));case"map":{const r={};for(const[s,o]of t.entries)r[Wu(s)]=pe(o,e,n);return r}default:throw new f(`cannot convert ${t.kind} to JS value — no coercion defined`,{val:t})}}function Ku(t,e){switch(t.kind){case"js-value":return t.value;case"string":case"number":case"boolean":return t.value;default:throw new f(`cannot use . on ${t.kind}`,{target:t},R(e))}}function Ju(t,e,n){if(t.value.length<3)throw new f(". requires at least 2 arguments: (. obj prop)",{list:t},R(t));const r=t.value[1],s=n.evaluate(r,e),o=Ku(s,r);if(o==null){const g=o===null?"null":"undefined";throw new f(`cannot use . on ${g} js value — check for nil/undefined before accessing properties`,{target:s},R(r))}const i=t.value[2];if(!u.symbol(i))throw new f(`. expects a symbol for property name, got: ${i.kind}`,{propForm:i},R(i)??R(t));const l=i.name,c=o;if(t.value.length===3){const g=c[l];return typeof g=="function"?a.jsValue(g.bind(c)):oe(g)}const d=c[l];if(typeof d!="function")throw new f(`method '${l}' is not callable on ${String(c)}`,{propName:l,rawObj:c},R(i));const p=t.value.slice(3).map(g=>n.evaluate(g,e)).map(g=>pe(g,n,e)),h=d.apply(c,p);return oe(h)}function Gu(t,e,n){if(t.value.length<2)throw new f("js/new requires a constructor argument",{list:t},R(t));const r=n.evaluate(t.value[1],e);if(!u.jsValue(r)||typeof r.value!="function")throw new f(`js/new: expected js-value constructor, got ${r.kind}`,{cls:r},R(t.value[1])??R(t));const o=t.value.slice(2).map(l=>n.evaluate(l,e)).map(l=>pe(l,n,e)),i=r.value;return a.jsValue(new i(...o))}function es(t,e,n,r){if(t.kind===y.nativeFunction)return t.fnWithContext?t.fnWithContext(n,r,...e):t.fn(...e);if(t.kind===y.function){const s=nn(t.arities,e.length);if(s.compiledBody&&s.paramSlots){const i=s.paramSlots,l=new Array(i.length);for(let c=0;c<i.length;c++)l[c]=i[c].value,i[c].value=e[c];try{return s.compiledBody(t.env,n)}finally{for(let c=0;c<i.length;c++)i[c].value=l[c]}}let o=e;for(;;){const i=Tn(s.params,s.restParam,o,t.env,n,r);try{return s.compiledBody?s.compiledBody(i,n):n.evaluateForms(s.body,i)}catch(l){if(l instanceof ve){o=l.args;continue}throw l}}}throw new f(`${t.kind} is not a callable function`,{fn:t,args:e})}function Qu(t,e,n){const r=nn(t.arities,e.length),s=Tn(r.params,r.restParam,e,t.env,n,t.env);return n.evaluateForms(r.body,s)}function ts(t,e,n,r){if(u.aFunction(t))return es(t,e,n,r);if(u.jsValue(t)){if(typeof t.value!==y.function)throw new f(`js-value is not callable: ${typeof t.value}`,{fn:t,args:e});const s=e.map(i=>pe(i,n,r)),o=t.value(...s);return oe(o)}if(u.keyword(t)){const s=e[0],o=e.length>1?e[1]:Ze();if(u.map(s)){const i=s.entries.find(([l])=>u.equal(l,t));return i?i[1]:o}if(u.record(s)){const i=s.fields.find(([l])=>u.equal(l,t));return i?i[1]:o}return o}if(u.record(t)){if(e.length===0)throw new f("Record used as function requires at least one argument",{fn:t,args:e});const s=e[0],o=e.length>1?e[1]:Ze(),i=t.fields.find(([l])=>u.equal(l,s));return i?i[1]:o}if(u.map(t)){if(e.length===0)throw new f("Map used as function requires at least one argument",{fn:t,args:e});const s=e[0],o=e.length>1?e[1]:Ze(),i=t.entries.find(([l])=>u.equal(l,s));return i?i[1]:o}if(u.set(t)){if(e.length===0)throw new f("Set used as function requires at least one argument",{fn:t,args:e});const s=e[0];return t.values.some(i=>u.equal(i,s))?s:Ze()}if(u.var(t))return ts(t.value,e,n,r);throw new f(`${b(t)} is not a callable value`,{fn:t,args:e})}let Yu=0;function ns(t="G"){return`${t}__${Yu++}`}const Xu=new Set([...Object.keys(W),"catch","finally","&"]);function Nt(t){return u.list(t)&&t.value.length===2&&u.symbol(t.value[0])&&t.value[0].name==="unquote-splicing"}function an(t,e,n){const r=[];let s=[];for(const o of t)Nt(o)?(s.length>0&&(r.push(a.list([a.symbol("list"),...s])),s=[]),r.push(o.value[1])):s.push(Xe(o,e,n));return s.length>0&&r.push(a.list([a.symbol("list"),...s])),r}function Xe(t,e=new Map,n){var r;switch(t.kind){case y.number:case y.string:case y.boolean:case y.keyword:case y.nil:return t;case y.symbol:{if(t.name.endsWith("#"))return e.has(t.name)||e.set(t.name,ns(t.name.slice(0,-1))),a.list([a.symbol("quote"),a.symbol(e.get(t.name))]);if(n&&!t.name.includes("/")&&!Xu.has(t.name)){const s=pt(t.name,n);if(s)return a.list([a.symbol("quote"),a.symbol(`${s.ns}/${t.name}`)]);const o=(r=de(n).ns)==null?void 0:r.name;if(o)return a.list([a.symbol("quote"),a.symbol(`${o}/${t.name}`)])}return a.list([a.symbol("quote"),t])}case y.list:{if(t.value.length===2&&u.symbol(t.value[0])&&t.value[0].name==="unquote")return t.value[1];if(!t.value.some(Nt))return a.list([a.symbol("list"),...t.value.map(i=>Xe(i,e,n))]);const o=an(t.value,e,n);return a.list([a.symbol("apply"),a.symbol("list"),a.list([a.symbol("concat*"),...o])])}case y.vector:{if(!t.value.some(Nt))return a.list([a.symbol("vector"),...t.value.map(i=>Xe(i,e,n))]);const o=an(t.value,e,n);return a.list([a.symbol("apply"),a.symbol("vector"),a.list([a.symbol("concat*"),...o])])}case y.map:{const s=[];for(const[o,i]of t.entries)s.push(Xe(o,e,n)),s.push(Xe(i,e,n));return a.list([a.symbol("hash-map"),...s])}case y.set:{if(!t.values.some(Nt))return a.list([a.symbol("hash-set"),...t.values.map(i=>Xe(i,e,n))]);const o=an(t.values,e,n);return a.list([a.symbol("apply"),a.symbol("hash-set"),a.list([a.symbol("concat*"),...o])])}default:throw new f(`Unexpected form in quasiquote: ${t.kind}`,{form:t})}}function Ne(t,e,n){var c;if(u.vector(t)){const d=t.value.map(m=>Ne(m,e,n));return d.every((m,p)=>m===t.value[p])?t:a.vector(d)}if(u.map(t)){const d=t.entries.map(([m,p])=>[Ne(m,e,n),Ne(p,e,n)]);return d.every(([m,p],h)=>m===t.entries[h][0]&&p===t.entries[h][1])?t:a.map(d)}if(u.cons(t)||u.lazySeq(t))return Ne(a.list(X(t)),e,n);if(!u.list(t)||t.value.length===0)return t;const r=t.value[0];if(!u.symbol(r)){const d=t.value.map(m=>Ne(m,e,n));return d.every((m,p)=>m===t.value[p])?t:a.list(d)}const s=r.name;if(s==="quote")return t;if(s==="quasiquote"){const d=Xe(t.value[1],new Map,e);return Ne(d,e,n)}let o;const i=s.indexOf("/");if(i>0&&i<s.length-1){const d=s.slice(0,i),m=s.slice(i+1),h=((c=de(e).ns)==null?void 0:c.aliases.get(d))??n.resolveNs(d)??null;if(h){const g=h.vars.get(m);o=g!==void 0?ye(g):void 0}}else o=Ht(s,e);if(o!==void 0&&u.macro(o)){const d=n.applyMacro(o,t.value.slice(1));return Ne(d,e,n)}const l=t.value.map(d=>Ne(d,e,n));return l.every((d,m)=>d===t.value[m])?t:a.list(l)}function zn(t){kn(t,!0)}function Zu(t){return u.list(t)&&t.value.length>=1&&u.symbol(t.value[0])&&t.value[0].name===W.recur}function kn(t,e){for(let n=0;n<t.length;n++)Ye(t[n],e&&n===t.length-1)}function Ye(t,e){if(!u.list(t))return;if(Zu(t)){if(!e)throw new f("Can only recur from tail position",{form:t},R(t));return}if(t.value.length===0)return;const n=t.value[0];if(!u.symbol(n)){for(const s of t.value)Ye(s,!1);return}const r=n.name;if(!(r==="fn"||r===W["fn*"]||r==="loop"||r===W["loop*"]||r===W.quote)){if(r===W.if){t.value[1]&&Ye(t.value[1],!1),t.value[2]&&Ye(t.value[2],e),t.value[3]&&Ye(t.value[3],e);return}if(r===W.do){kn(t.value.slice(1),e);return}if(r==="let"||r===W["let*"]){const s=t.value[1];if(u.vector(s))for(let o=1;o<s.value.length;o+=2)Ye(s.value[o],!1);kn(t.value.slice(2),e);return}for(const s of t.value.slice(1))Ye(s,!1)}}function ed(t,e){let n=e;for(;n;){const r=n.bindings.get(t);if(r!==void 0)return r;n=n.outer}return null}function td(t){if(t===null)return null;let e=t;for(;e;){if(e.loop)return e.loop;e=e.outer}return null}function rn(t,e,n){if(!u.vector(t))throw new f(`${e} bindings must be a vector`,{bindings:t,env:n},R(t));if(t.value.length%2!==0)throw new f(`${e} bindings must have an even number of forms`,{bindings:t,env:n},R(t))}function Vn(t,e={}){const n=t.value.slice(1),r=[],s=[];let o=null;for(let i=0;i<n.length;i++){const l=n[i];if(u.list(l)&&l.value.length>0&&u.symbol(l.value[0])){const c=l.value[0].name;if(c==="catch"){if(l.value.length<3)throw new f("catch requires a discriminator and a binding symbol",{form:l,env:e},R(l));const d=l.value[1],m=l.value[2];if(!u.symbol(m))throw new f("catch binding must be a symbol",{form:l,env:e},R(m)??R(l));s.push({discriminator:d,binding:m.name,body:l.value.slice(3)});continue}if(c==="finally"){if(i!==n.length-1)throw new f("finally clause must be the last in try expression",{form:l,env:e},R(l));o=l.value.slice(1);continue}}r.push(l)}return{bodyForms:r,catchClauses:s,finallyForms:o}}function Dn(t,e,n,r){let s;try{s=r.evaluate(t,n)}catch{return!0}if(s.kind==="symbol")return!0;if(u.keyword(s)){if(s.name===":default")return!0;if(!u.map(e))return!1;const o=e.entries.find(([i])=>u.keyword(i)&&i.name===":type");return o?u.equal(o[1],s):!1}if(u.aFunction(s)){const o=r.applyFunction(s,[e],n);return u.truthy(o)}throw new f("catch discriminator must be a keyword or a predicate function",{discriminator:s,env:n})}const nd=1,rd=2,Zn=3;function sd(t,e,n){const r=n(t.value[nd],e),s=n(t.value[rd],e),o=t.value.length>Zn,i=o?n(t.value[Zn],e):null;return r===null||s===null||o&&i===null?null:(l,c)=>u.truthy(r(l,c))?s(l,c):i?i(l,c):a.nil()}function ad(t,e,n){const{bodyForms:r,catchClauses:s,finallyForms:o}=Vn(t),i=Ue(r,e,n);if(i===null)return null;const l=[];for(const d of s){const m={value:null},p={bindings:new Map([[d.binding,m]]),outer:e},h=Ue(d.body,p,n);if(h===null)return null;l.push({discriminator:d.discriminator,catchSlot:m,compiledCatchBody:h})}let c=null;return o!==null&&o.length>0&&(c=Ue(o,e,n),c===null)?null:(d,m)=>{let p=a.nil(),h=null;try{p=i(d,m)}catch(g){if(g instanceof ve)throw g;let w;if(g instanceof Le)w=g.value;else if(g instanceof f){const S=[[a.keyword(":type"),a.keyword(":error/runtime")],[a.keyword(":message"),a.string(g.message)]];g.frames&&g.frames.length>0&&S.push([a.keyword(":frames"),Jr(g.frames)]),w=a.map(S)}else throw g;let k=!1;for(const{discriminator:S,catchSlot:I,compiledCatchBody:N}of l)if(Dn(S,w,d,m)){I.value=w,p=N(d,m),k=!0;break}k||(h=g)}finally{c!==null&&c(d,m)}if(h!==null)throw h;return p}}function Ue(t,e,n){const r=[];for(const s of t){const o=n(s,e);if(o===null)return null;r.push(o)}return r.length===1?r[0]:(s,o)=>{let i=a.nil();for(const l of r)i=l(s,o);return i}}const Bn=1,rs=2;function od(t,e,n){const r=t.value[Bn];if(!u.vector(r)||r.value.length%2!==0)return null;let s=e;const o=[];for(let c=0;c<r.value.length;c+=2){const d=r.value[c];if(!u.symbol(d))return null;const m={value:null},p=n(r.value[c+1],s);if(p===null)return null;o.push([m,p]),s={bindings:new Map([[d.name,m]]),outer:s}}const i=t.value.slice(rs),l=Ue(i,s,n);return l===null?null:(c,d)=>{const m=o.map(([h])=>h.value);for(const[h,g]of o)h.value=g(c,d);const p=l(c,d);return o.forEach(([h],g)=>{h.value=m[g]}),p}}function id(t,e,n){const r=t.value[Bn];if(!u.vector(r)||r.value.length%2!==0)return null;const s=t.value.slice(rs);zn(s);let o=e;const i=[],l=[];for(let h=0;h<r.value.length;h+=2){const g=r.value[h];if(!u.symbol(g))return null;const w=n(r.value[h+1],o);if(w===null)return null;const k={value:null};i.push([k,w]),l.push([g.name,k]),o={bindings:new Map([[g.name,k]]),outer:o}}const c=i.map(h=>h[0]),d={args:null},m={bindings:new Map(l),outer:e,loop:{slots:c,recurTarget:d}},p=Ue(s,m,n);return p===null?null:(h,g)=>{for(const[w,k]of i)w.value=k(h,g);for(;;){d.args=null;const w=p(h,g);if(d.args!==null)for(let k=0;k<c.length;k++)c[k].value=d.args[k];else return w}}}function ld(t,e,n){const r=td(e);if(r===null)return null;const{recurTarget:s,slots:o}=r,i=t.value.slice(Bn);if(i.length!==o.length)return null;const l=[];for(const c of i){const d=n(c,e);if(d===null)return null;l.push(d)}return(c,d)=>{const m=l.map(p=>p(c,d));return s.args=m,a.nil()}}function cd(t,e,n){const r=t.value[1];if(!u.vector(r)||r.value.length%2!==0)return null;const s=[];for(let l=0;l<r.value.length;l+=2){const c=r.value[l];if(!u.symbol(c))return null;const d=n(r.value[l+1],e);if(d===null)return null;s.push([c.name,d])}const o=t.value.slice(2),i=Ue(o,e,n);return i===null?null:(l,c)=>{var m;const d=[];for(const[p,h]of s){const g=h(l,c),w=p.indexOf("/");let k;if(w>0&&w<p.length-1){const S=p.slice(0,w),I=p.slice(w+1),P=((m=de(l).ns)==null?void 0:m.aliases.get(S))??c.resolveNs(S)??null;k=P==null?void 0:P.vars.get(I)}else k=pt(p,l);if(!k)throw new f(`No var found for symbol '${p}' in binding form`,{name:p});if(!k.dynamic)throw new f(`Cannot use binding with non-dynamic var ${k.ns}/${k.name}. Mark it dynamic with (def ^:dynamic ${k.name} ...)`,{name:p});k.bindingStack??(k.bindingStack=[]),k.bindingStack.push(g),d.push(k)}try{return i(l,c)}finally{for(const p of d)p.bindingStack.pop()}}}function ud(t,e,n){const r=t.map(()=>({value:null})),s={args:null},o={bindings:new Map(t.map((c,d)=>[c.name,r[d]])),outer:null,loop:{slots:r,recurTarget:s}},i=Ue(e,o,n);return i===null?null:{compiledBody:(c,d)=>{for(;;){s.args=null;const m=i(c,d);if(s.args!==null)for(let p=0;p<r.length;p++)r[p].value=s.args[p];else return m}},paramSlots:r}}function dd(t){const e=t.allNamespaces().find(s=>s.name==="clojure.core");if(!e)return null;const n=e.vars.get("*hierarchy*");if(!n)return null;const r=n.dynamic&&n.bindingStack&&n.bindingStack.length>0?n.bindingStack[n.bindingStack.length-1]:n.value;return u.map(r)?r:null}function fd(t,e,n){if(u.equal(e,n))return!0;for(const[r,s]of t.entries)if(!(r.kind!=="keyword"||r.name!==":ancestors")){if(!u.map(s))return!1;for(const[o,i]of s.entries)if(u.equal(o,e))return u.set(i)?i.values.some(l=>u.equal(l,n)):!1;return!1}return!1}function On(t,e,n,r,s){const o=n.applyFunction(t.dispatchFn,e,r),i=t.methods.find(({dispatchVal:c})=>u.equal(c,o));if(i)return n.applyFunction(i.fn,e,r);const l=dd(n);if(l){const c=t.methods.filter(({dispatchVal:d})=>fd(l,o,d));if(c.length===1)return n.applyFunction(c[0].fn,e,r);if(c.length>1)throw new f(`Multiple methods in multimethod '${t.name}' match dispatch value ${b(o)}: `+c.map(d=>b(d.dispatchVal)).join(", "),{mm:t,dispatchVal:o},s?R(s):void 0)}if(t.defaultMethod)return n.applyFunction(t.defaultMethod,e,r);throw new f(`No method in multimethod '${t.name}' for dispatch value ${b(o)}`,{mm:t,dispatchVal:o},s?R(s):void 0)}function md(t,e,n){const r=t.value[0],s=n(r,e);if(s===null)return null;const o=[];for(const l of t.value.slice(1)){const c=n(l,e);if(c===null)return null;o.push(c)}const i=o.length;return(l,c)=>{const d=s(l,c);if(u.multiMethod(d)){const g=o.map(w=>w(l,c));return On(d,g,c,l,t)}if(!u.callable(d)){const g=u.symbol(r)?r.name:b(r);throw new f(`${g} is not callable`,{list:t,env:l},R(t))}const m=o.map(g=>g(l,c)),p=R(t),h={fnName:u.symbol(r)?r.name:null,line:null,col:null,source:c.currentFile??null,pos:p??null};c.frameStack.push(h);try{if(d.kind==="function"){const g=nn(d.arities,i);if(g.compiledBody&&g.paramSlots){const w=g.paramSlots,k=new Array(w.length);for(let S=0;S<w.length;S++)k[S]=w[S].value,w[S].value=m[S];try{return g.compiledBody(d.env,c)}finally{for(let S=0;S<w.length;S++)w[S].value=k[S]}}}return c.applyCallable(d,m,l)}catch(g){throw Gr(g,t),g instanceof f&&!g.frames&&(g.frames=[...c.frameStack].reverse()),g}finally{c.frameStack.pop()}}}function pd(t,e,n){const r=[];for(const o of t.value){const i=n(o,e);if(i===null)return null;r.push(i)}const s=t.meta;return(o,i)=>{const l=r.map(c=>c(o,i));return s?{kind:y.vector,value:l,meta:s}:a.vector(l)}}function hd(t,e,n){const r=[];for(const[o,i]of t.entries){const l=n(o,e),c=n(i,e);if(l===null||c===null)return null;r.push([l,c])}const s=t.meta;return(o,i)=>{const l=[];for(const[c,d]of r)l.push([c(o,i),d(o,i)]);return s?{kind:y.map,entries:l,meta:s}:a.map(l)}}function gd(t,e,n){const r=[];for(const s of t.values){const o=n(s,e);if(o===null)return null;r.push(o)}return(s,o)=>{const i=[];for(const l of r){const c=l(s,o);i.some(d=>u.equal(d,c))||i.push(c)}return a.set(i)}}function vd(t,e,n){if(t.value.length===0)return()=>t;const r=t.value[0];if(u.symbol(r))switch(r.name){case W.if:return sd(t,e,n);case W.do:return Ue(t.value.slice(1),e,n);case W["let*"]:return od(t,e,n);case W["loop*"]:return id(t,e,n);case W.recur:return ld(t,e,n);case W.try:return ad(t,e,n);case W.binding:return cd(t,e,n)}return u.specialForm(r)?null:md(t,e,n)}function yd(t,e){const n=t.name,r=n.indexOf("/");if(r>0&&r<n.length-1){const o=n.slice(0,r),i=n.slice(r+1);if(i.includes(".")){const l=i.split(".");return(c,d)=>{var w;const p=((w=de(c).ns)==null?void 0:w.aliases.get(o))??d.resolveNs(o)??null;if(!p)throw new f(`No such namespace or alias: ${o}`,{symbol:n,env:c},R(t));const h=p.vars.get(l[0]);if(h===void 0)throw new f(`Symbol ${o}/${l[0]} not found`,{symbol:n,env:c},R(t));let g=ye(h);for(let k=1;k<l.length;k++){let S;if(g.kind==="js-value")S=g.value;else if(g.kind==="string"||g.kind==="number"||g.kind==="boolean")S=g.value;else throw new f(`Cannot access property '${l[k]}' on ${g.kind} while resolving ${n}`,{symbol:n},R(t));if(S==null)throw new f(`Cannot access property '${l[k]}' on ${S===null?"null":"undefined"} while resolving ${n}`,{symbol:n},R(t));const I=S,N=I[l[k]];typeof N=="function"?g=oe(N.bind(I)):g=oe(N)}return g}}return(l,c)=>{var h;const m=((h=de(l).ns)==null?void 0:h.aliases.get(o))??c.resolveNs(o)??null;if(!m)throw new f(`No such namespace or alias: ${o}`,{symbol:n,env:l},R(t));const p=m.vars.get(i);if(p===void 0)throw new f(`Symbol ${n} not found`,{symbol:n,env:l},R(t));return ye(p)}}const s=ed(n,e);return s!==null?(o,i)=>s.value:(o,i)=>Or(n,o)}function tt(t,e=null){switch(t.kind){case y.number:case y.string:case y.keyword:case y.nil:case y.boolean:case y.regex:case y.character:return()=>t;case y.symbol:return yd(t,e);case y.vector:return pd(t,e,tt);case y.map:return hd(t,e,tt);case y.set:return gd(t,e,tt);case y.list:return vd(t,e,tt)}return null}function bd(t,e,n){const r=t.value.map(s=>n.evaluate(s,e));return t.meta?{kind:y.vector,value:r,meta:t.meta}:a.vector(r)}function wd(t,e,n){const r=[];for(const s of t.values){const o=n.evaluate(s,e);r.some(i=>u.equal(i,o))||r.push(o)}return a.set(r)}function kd(t,e,n){let r=[];for(const[s,o]of t.entries){const i=n.evaluate(s,e),l=n.evaluate(o,e);r.push([i,l])}return t.meta?{kind:y.map,entries:r,meta:t.meta}:a.map(r)}function ss(t,e,n){var i;const r=t.value[1];if(!u.vector(r))throw new f("binding requires a vector of bindings",{list:t,env:e},R(t));if(r.value.length%2!==0)throw new f("binding vector must have an even number of forms",{list:t,env:e},R(r)??R(t));const s=t.value.slice(2),o=[];for(let l=0;l<r.value.length;l+=2){const c=r.value[l];if(!u.symbol(c))throw new f("binding left-hand side must be a symbol",{sym:c},R(c)??R(t));const d=n.evaluate(r.value[l+1],e),m=c.name.indexOf("/");let p;if(m>0&&m<c.name.length-1){const h=c.name.slice(0,m),g=c.name.slice(m+1),k=((i=de(e).ns)==null?void 0:i.aliases.get(h))??n.resolveNs(h)??null;if(!k)throw new f(`No such namespace: ${h}`,{sym:c},R(c));p=k.vars.get(g)}else p=pt(c.name,e);if(!p)throw new f(`No var found for symbol '${c.name}' in binding form`,{sym:c},R(c));if(!p.dynamic)throw new f(`Cannot use binding with non-dynamic var ${p.ns}/${p.name}. Mark it dynamic with (def ^:dynamic ${c.name} ...)`,{sym:c},R(c));p.bindingStack??(p.bindingStack=[]),p.bindingStack.push(d),o.push(p)}return{body:s,boundVars:o}}function xd(t){const e={syncCtx:t,evaluate:(n,r)=>ee(n,r,e),evaluateForms:(n,r)=>Ee(n,r,e),applyCallable:(n,r,s)=>as(n,r,s,e)};return e}async function ee(t,e,n){switch(t.kind){case y.number:case y.string:case y.boolean:case y.keyword:case y.nil:case y.symbol:case y.function:case y.nativeFunction:case y.macro:case y.multiMethod:case y.atom:case y.reduced:case y.volatile:case y.regex:case y.var:case y.delay:case y.lazySeq:case y.cons:case y.namespace:case y.pending:return n.syncCtx.evaluate(t,e)}if(u.vector(t)){const r=[];for(const s of t.value)r.push(await ee(s,e,n));return a.vector(r)}if(u.map(t)){const r=[];for(const[s,o]of t.entries){const i=await ee(s,e,n),l=await ee(o,e,n);r.push([i,l])}return a.map(r)}if(u.set(t)){const r=[];for(const s of t.values)r.push(await ee(s,e,n));return a.set(r)}return u.list(t)?_d(t,e,n):n.syncCtx.evaluate(t,e)}async function Ee(t,e,n){let r=a.nil();for(const s of t){const o=n.syncCtx.expandAll(s,e);r=await ee(o,e,n)}return r}const $d=new Set(["quote","def","if","do","let","let*","fn","fn*","loop","loop*","recur","binding","set!","try","var","defmacro","letfn*","lazy-seq","ns","async",".","js/new"]);async function _d(t,e,n){if(t.value.length===0)return t;const r=t.value[0];if(u.symbol(r)&&$d.has(r.name))return qd(r.name,t,e,n);const s=await ee(r,e,n);if(u.aFunction(s)&&s.name==="deref"&&t.value.length===2){const i=await ee(t.value[1],e,n);return u.pending(i)?i.promise:n.syncCtx.applyCallable(s,[i],e)}const o=[];for(const i of t.value.slice(1))o.push(await ee(i,e,n));return as(s,o,e,n)}async function qd(t,e,n,r){switch(t){case W.quote:case W.var:case W.ns:case"fn":case"fn*":return r.syncCtx.evaluate(e,n);case W.recur:{const s=[];for(const o of e.value.slice(1))s.push(await ee(o,n,r));throw new ve(s)}case W.do:return Ee(e.value.slice(1),n,r);case W.def:throw new f("def inside (async ...) is not supported. Define vars outside the async block.",{list:e,env:n});case W.if:{const s=await ee(e.value[1],n,r);return!u.nil(s)&&!(u.boolean(s)&&!s.value)?ee(e.value[2],n,r):e.value[3]!==void 0?ee(e.value[3],n,r):a.nil()}case"let":{const s=r.syncCtx.expandAll(e,n);return ee(s,n,r)}case W["let*"]:return Sd(e,n,r);case"loop":{const s=r.syncCtx.expandAll(e,n);return ee(s,n,r)}case W["loop*"]:return Fd(e,n,r);case W.binding:return jd(e,n,r);case W.try:return Rd(e,n,r);case W["set!"]:{const s=await ee(e.value[2],n,r),o=a.list([a.symbol(W.quote),s]),i=a.list([e.value[0],e.value[1],o]);return r.syncCtx.evaluate(i,n)}default:return r.syncCtx.evaluate(e,n)}}async function Sd(t,e,n){const r=t.value[1];rn(r,"let*",e);let s=e;const o=r.value;for(let i=0;i<o.length;i+=2){const l=o[i],c=o[i+1],d=await ee(c,s,n),m=$e(l,d,n.syncCtx,s);s=ze(m.map(([p])=>p),m.map(([,p])=>p),s)}return Ee(t.value.slice(2),s,n)}async function Fd(t,e,n){const r=t.value[1];rn(r,"loop*",e);const s=t.value.slice(2),o=[];let i=[],l=e;for(let c=0;c<r.value.length;c+=2){const d=r.value[c],m=await ee(r.value[c+1],l,n);o.push(d),i.push(m);const p=$e(d,m,n.syncCtx,l);l=ze(p.map(([h])=>h),p.map(([,h])=>h),l)}for(;;){let c=e;for(let d=0;d<o.length;d++){const m=$e(o[d],i[d],n.syncCtx,c);c=ze(m.map(([p])=>p),m.map(([,p])=>p),c)}try{return await Ee(s,c,n)}catch(d){if(d instanceof ve){if(d.args.length!==o.length)throw new f(`recur expects ${o.length} arguments but got ${d.args.length}`,{list:t,env:e});i=d.args;continue}throw d}}}async function jd(t,e,n){const{body:r,boundVars:s}=ss(t,e,n.syncCtx);try{return await Ee(r,e,n)}finally{for(const o of s)o.bindingStack.pop()}}async function Rd(t,e,n){const{bodyForms:r,catchClauses:s,finallyForms:o}=Vn(t,e);let i=a.nil(),l=null;try{i=await Ee(r,e,n)}catch(c){if(c instanceof ve)throw c;let d;if(c instanceof Le)d=c.value;else if(c instanceof f)d={kind:y.map,entries:[[a.keyword(":type"),a.keyword(":error/runtime")],[a.keyword(":message"),a.string(c.message)]]};else throw c;let m=!1;for(const p of s)if(Dn(p.discriminator,d,e,n.syncCtx)){const h=ze([p.binding],[d],e);i=await Ee(p.body,h,n),m=!0;break}m||(l=c)}finally{o&&await Ee(o,e,n)}if(l!==null)throw l;return i}async function as(t,e,n,r){if(u.nativeFunction(t))return t.fnWithContext?t.fnWithContext(r.syncCtx,n,...e):t.fn(...e);if(u.function(t)){const s=nn(t.arities,e.length);let o=e;for(;;){const i=Tn(s.params,s.restParam,o,t.env,r.syncCtx,n);try{return await Ee(s.body,i,r)}catch(l){if(l instanceof ve){o=l.args;continue}throw l}}}return u.multiMethod(t)?On(t,e,r.syncCtx,n):r.syncCtx.applyCallable(t,e,n)}function er(t){if(!t)return!1;for(const[e,n]of t.entries)if(u.keyword(e)&&e.name===":dynamic"&&u.boolean(n)&&n.value===!0)return!0;return!1}function Id(t,e,n){const{bodyForms:r,catchClauses:s,finallyForms:o}=Vn(t,e);let i=a.nil(),l=null;try{i=n.evaluateForms(r,e)}catch(c){if(c instanceof ve)throw c;let d;if(c instanceof Le)d=c.value;else if(c instanceof f){const p=[[a.keyword(":type"),a.keyword(":error/runtime")],[a.keyword(":message"),a.string(c.message)]];c.frames&&c.frames.length>0&&p.push([a.keyword(":frames"),Jr(c.frames,n.currentSource)]),d=a.map(p)}else throw c;let m=!1;for(const p of s)if(Dn(p.discriminator,d,e,n)){const h=ze([p.binding],[d],e);i=n.evaluateForms(p.body,h),m=!0;break}m||(l=c)}finally{o&&n.evaluateForms(o,e)}if(l!==null)throw l;return i}function Ad(t,e,n){return t.value[1]}function os(t,e,n){const r=n?R(n):void 0,s=r&&e.currentSource;if(!t&&!s)return;const o=[];if(s){const{line:d,col:m}=tn(e.currentSource,r.start),p=e.currentLineOffset??0,h=e.currentColOffset??0;o.push([a.keyword(":line"),a.number(d+p)]),o.push([a.keyword(":column"),a.number(d===1?m+h:m)]),e.currentFile&&o.push([a.keyword(":file"),a.string(e.currentFile)])}const i=new Set([":line",":column",":file"]),c=[...((t==null?void 0:t.entries)??[]).filter(([d])=>!(d.kind==="keyword"&&i.has(d.name))),...o];return c.length>0?a.map(c):void 0}function Pd(t,e,n){var g;const r=t.value[1];if(r.kind!=="symbol")throw new f("First element of list must be a symbol",{name:r,list:t,env:e},R(t));if(t.value[2]===void 0)return a.nil();const s=t.value.length===4&&t.value[2].kind==="string",o=s?t.value[2].value:void 0,i=s?3:2,c=de(e).ns,d=n.evaluate(t.value[i],e),m=os(r.meta,n,r),p=o?is(m,o):m;if(p&&d.kind==="function"){const w=p.entries.find(([k])=>u.keyword(k)&&k.name===":doc");if(w){const S=(((g=d.meta)==null?void 0:g.entries)??[]).filter(([I])=>!(u.keyword(I)&&I.name===":doc"));d.meta=a.map([...S,w])}}const h=c.vars.get(r.name);if(h)h.value=d,p&&(h.meta=p,er(p)&&(h.dynamic=!0));else{const w=a.var(c.name,r.name,d,p);er(p)&&(w.dynamic=!0),c.vars.set(r.name,w)}return a.nil()}const Cd=(t,e,n)=>a.nil();function Md(t,e,n){const r=n.evaluate(t.value[1],e);return u.falsy(r)?t.value[3]?n.evaluate(t.value[3],e):a.nil():n.evaluate(t.value[2],e)}function Nd(t,e,n){return n.evaluateForms(t.value.slice(1),e)}function Ld(t,e,n){const r=t.value[1];rn(r,"let*",e);const s=t.value.slice(2);let o=e;for(let i=0;i<r.value.length;i+=2){const l=r.value[i];if(!u.symbol(l))throw new f("let* only supports simple symbol bindings; use let for destructuring",{pattern:l,env:e},R(l)??R(t));const c=n.evaluate(r.value[i+1],o);o=ze([l.name],[c],o)}return n.evaluateForms(s,o)}function Ed(t,e,n){const r=t.value.slice(1);let s,o=r;r[0]&&u.symbol(r[0])&&(s=r[0].name,o=r.slice(1));const i=Zr(o,e);for(const c of i){for(const d of c.params)if(!u.symbol(d))throw new f("fn* only supports simple symbol params; use fn for destructuring",{param:d,env:e},R(d)??R(t));if(c.restParam!==null&&!u.symbol(c.restParam))throw new f("fn* only supports simple symbol rest param; use fn for destructuring",{restParam:c.restParam,env:e},R(c.restParam)??R(t));if(zn(c.body),c.restParam===null){const d=ud(c.params,c.body,tt);d!==null&&(c.compiledBody=d.compiledBody,c.paramSlots=d.paramSlots)}else{const d=tt(a.list([a.symbol(W.do),...c.body]));d!==null&&(c.compiledBody=d)}}const l=a.multiArityFunction(i,e);if(s){l.name=s;const c=Ke(e);c.bindings.set(s,l),l.env=c}return l}function Td(t,e,n){const r=t.value[1];rn(r,"loop*",e);const s=t.value.slice(2);zn(s);const o=[],i=[];let l=e;for(let d=0;d<r.value.length;d+=2){const m=r.value[d];if(!u.symbol(m))throw new f("loop* only supports simple symbol bindings; use loop for destructuring",{pattern:m,env:e},R(m)??R(t));const p=n.evaluate(r.value[d+1],l);o.push(m.name),i.push(p),l=ze([m.name],[p],l)}let c=i;for(;;){const d=ze(o,c,e);try{return n.evaluateForms(s,d)}catch(m){if(m instanceof ve){if(m.args.length!==o.length)throw new f(`recur expects ${o.length} arguments but got ${m.args.length}`,{list:t,env:e},R(t));c=m.args;continue}throw m}}}function zd(t,e,n){const r=t.value[1];if(!u.vector(r))throw new f("letfn* bindings must be a vector",{bindings:r,env:e},R(t));if(r.value.length%2!==0)throw new f("letfn* bindings must have an even number of forms",{bindings:r,env:e},R(r)??R(t));const s=t.value.slice(2),o=Ke(e);for(let i=0;i<r.value.length;i+=2){const l=r.value[i],c=r.value[i+1];if(!u.symbol(l))throw new f("letfn* binding names must be symbols",{name:l,env:e},R(l)??R(t));const d=n.evaluate(c,o);if(!u.aFunction(d))throw new f("letfn* binding values must be functions",{fn:d,env:e},R(c)??R(t));u.function(d)&&(d.name=l.name),o.bindings.set(l.name,d)}return n.evaluateForms(s,o)}function is(t,e){const n=[a.keyword(":doc"),a.string(e)];return{kind:"map",entries:[...((t==null?void 0:t.entries)??[]).filter(([s])=>!(s.kind==="keyword"&&s.name===":doc")),n]}}function Vd(t,e,n){var p;const r=t.value[1];if(!u.symbol(r))throw new f("First element of defmacro must be a symbol",{name:r,list:t,env:e},R(t));const s=t.value.slice(2),o=((p=s[0])==null?void 0:p.kind)==="string"?s[0].value:void 0,i=o?s.slice(1):s,l=Zr(i,e),c=a.multiArityMacro(l,e);c.name=r.name;const d=os(r.meta,n,r),m=o?is(d,o):d;return K(r.name,c,de(e),m),a.nil()}function Dd(t,e,n){const r=t.value.slice(1).map(s=>n.evaluate(s,e));throw new ve(r)}function Bd(t,e,n){var i;const r=t.value[1];if(!u.symbol(r))throw new f("var expects a symbol",{list:t},R(t));const s=r.name.indexOf("/");if(s>0&&s<r.name.length-1){const l=r.name.slice(0,s),c=r.name.slice(s+1),m=((i=de(e).ns)==null?void 0:i.aliases.get(l))??n.resolveNs(l)??null;if(!m)throw new f(`No such namespace: ${l}`,{sym:r},R(r));const p=m.vars.get(c);if(!p)throw new f(`Var ${r.name} not found`,{sym:r},R(r));return p}const o=pt(r.name,e);if(!o)throw new f(`Unable to resolve var: ${r.name} in this context`,{sym:r},R(r));return o}function Od(t,e,n){const{body:r,boundVars:s}=ss(t,e,n);try{return n.evaluateForms(r,e)}finally{for(const o of s)o.bindingStack.pop()}}function Hd(t,e,n){if(t.value.length!==3)throw new f(`set! requires exactly 2 arguments, got ${t.value.length-1}`,{list:t,env:e},R(t));const r=t.value[1];if(!u.symbol(r))throw new f(`set! first argument must be a symbol, got ${r.kind}`,{symForm:r,env:e},R(r)??R(t));const s=pt(r.name,e);if(!s)throw new f(`Unable to resolve var: ${r.name} in this context`,{symForm:r,env:e},R(r));if(!s.dynamic)throw new f(`Cannot set! non-dynamic var ${s.ns}/${s.name}. Mark it with ^:dynamic.`,{symForm:r,env:e},R(r));if(!s.bindingStack||s.bindingStack.length===0)throw new f(`Cannot set! ${s.ns}/${s.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,{symForm:r,env:e},R(r));const o=n.evaluate(t.value[2],e);return s.bindingStack[s.bindingStack.length-1]=o,o}function Ud(t,e,n){const r=t.value.slice(1);return a.lazySeq(()=>n.evaluateForms(r,e))}function Wd(t,e,n){const r=t.value.slice(1);if(r.length===0)return a.pending(Promise.resolve(a.nil()));const o=xd(n).evaluateForms(r,e);return a.pending(o)}const Kd={try:Id,quote:Ad,def:Pd,ns:Cd,if:Md,do:Nd,"let*":Ld,"fn*":Ed,defmacro:Vd,"loop*":Td,recur:Dd,var:Bd,binding:Od,"set!":Hd,"letfn*":zd,"lazy-seq":Ud,async:Wd,".":Ju,"js/new":Gu};function Jd(t,e,n,r){const s=Kd[t];if(s)return s(e,n,r);throw new f(`Unknown special form: ${t}`,{symbol:t,list:e,env:n},R(e))}const Gd=0,tr=1;function Qd(t,e,n){if(t.value.length===0)return t;const r=t.value[Gd];if(u.specialForm(r))return Jd(r.name,t,e,n);let s=n.evaluate(r,e);if(u.var(s)&&(s=s.value),u.multiMethod(s)){const c=t.value.slice(tr).map(d=>n.evaluate(d,e));return On(s,c,n,e,t)}if(!u.callable(s)){const c=u.symbol(r)?r.name:b(r);throw new f(`${c} is not callable`,{list:t,env:e},R(t))}const o=t.value.slice(tr).map(c=>n.evaluate(c,e)),i=R(t),l={fnName:u.symbol(r)?r.name:null,line:null,col:null,source:n.currentFile??null,pos:i??null};n.frameStack.push(l);try{return n.applyCallable(s,o,e)}catch(c){throw Gr(c,t),c instanceof f&&!c.frames&&(c.frames=[...n.frameStack].reverse()),c}finally{n.frameStack.pop()}}function Yd(t,e,n){var s;const r=tt(t);if(r!==null)return r(e,n);switch(t.kind){case y.number:case y.string:case y.character:case y.keyword:case y.nil:case y.function:case y.multiMethod:case y.boolean:case y.regex:case y.delay:case y.lazySeq:case y.cons:case y.namespace:return t;case y.symbol:{const o=t.name.indexOf("/");if(o>0&&o<t.name.length-1){const i=t.name.slice(0,o),l=t.name.slice(o+1),d=((s=de(e).ns)==null?void 0:s.aliases.get(i))??n.resolveNs(i)??null;if(!d)throw new f(`No such namespace or alias: ${i}`,{symbol:t.name,env:e},R(t));const m=d.vars.get(l);if(m===void 0)throw new f(`Symbol ${t.name} not found`,{symbol:t.name,env:e},R(t));return ye(m)}return Or(t.name,e)}case y.vector:return bd(t,e,n);case y.map:return kd(t,e,n);case y.set:return wd(t,e,n);case y.list:return Qd(t,e,n);default:throw new f("Unexpected value",{expr:t,env:e},R(t))}}function Xd(t,e,n){let r=a.nil();for(const s of t)r=n.evaluate(s,e);return r}function Zd(){const t={evaluate:(e,n)=>Yd(e,n,t),evaluateForms:(e,n)=>Xd(e,n,t),applyFunction:(e,n,r)=>es(e,n,t,r),applyCallable:(e,n,r)=>ts(e,n,t,r),applyMacro:(e,n)=>Qu(e,n,t),expandAll:(e,n)=>Ne(e,n,t),resolveNs:e=>null,allNamespaces:()=>[],io:{stdout:e=>console.log(e),stderr:e=>console.error(e)},frameStack:[]};return t}function Lt(t){const e=t.filter(n=>n.kind!==j.Comment);return e.length<3||e[0].kind!=="LParen"||e[1].kind!=="Symbol"||e[1].value!=="ns"||e[2].kind!=="Symbol"?null:e[2].value}function xn(t){const e=new Map,n=t.filter(o=>o.kind!==j.Comment&&o.kind!==j.Whitespace);if(n.length<3||n[0].kind!==j.LParen||n[1].kind!==j.Symbol||n[1].value!=="ns")return e;let r=3,s=1;for(;r<n.length&&s>0;){const o=n[r];if(o.kind===j.LParen){s++,r++;continue}if(o.kind===j.RParen){s--,r++;continue}if(o.kind===j.LBracket){let i=r+1,l=null;for(;i<n.length&&n[i].kind!==j.RBracket;){const c=n[i];c.kind===j.Symbol&&l===null&&(l=c.value),c.kind===j.Keyword&&(c.value===":as"||c.value===":as-alias")&&(i++,i<n.length&&n[i].kind===j.Symbol&&l&&e.set(n[i].value,l)),i++}}r++}return e}function ef(t){const e=t.find(n=>u.list(n)&&n.value.length>0&&u.symbol(n.value[0])&&n.value[0].name==="ns");return!e||!u.list(e)?null:e}function nr(t){const e=ef(t);if(!e)return[];const n=[];for(let r=2;r<e.value.length;r++){const s=e.value[r];u.list(s)&&u.keyword(s.value[0])&&s.value[0].name===":require"&&n.push(s.value.slice(1))}return n}const ls=(t,e,n)=>({line:t,col:e,offset:n}),cs=(t,e)=>({peek:(n=0)=>{const r=e.offset+n;return r>=t.length?null:t[r]},isAtEnd:()=>e.offset>=t.length,position:()=>({offset:e.offset,line:e.line,col:e.col})});function tf(t){const e=ls(0,0,0),n={...cs(t,e),advance:()=>{if(e.offset>=t.length)return null;const r=t[e.offset];return e.offset++,r===`
`?(e.line++,e.col=0):e.col++,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s.join("")}};return n}function us(t){const e=ls(0,0,0),n={...cs(t,e),advance:()=>{if(e.offset>=t.length)return null;const r=t[e.offset];return e.offset++,e.col=r.end.col,e.line=r.end.line,r},consumeWhile(r){const s=[];for(;!n.isAtEnd()&&r(n.peek());)s.push(n.advance());return s},consumeN(r){for(let s=0;s<r;s++)n.advance()}};return n}const nf=t=>t===`
`,st=t=>[" ",",",`
`,"\r","	"].includes(t),qt=t=>t===";",ds=t=>t==="(",fs=t=>t===")",ms=t=>t==="[",ps=t=>t==="]",hs=t=>t==="{",gs=t=>t==="}",rf=t=>t==='"',vs=t=>t==="'",ys=t=>t==="`",sf=t=>t==="~",Hn=t=>t==="@",dt=t=>{const e=parseInt(t);return isNaN(e)?!1:e>=0&&e<=9},af=t=>t===".",bs=t=>t===":",of=t=>t==="#",ws=t=>t==="^",lf=t=>t==="\\",St=t=>ds(t)||fs(t)||ms(t)||ps(t)||hs(t)||gs(t)||ys(t)||vs(t)||Hn(t)||ws(t),cf=t=>{const e=t.scanner,n=e.position();return e.consumeWhile(st),{kind:j.Whitespace,start:n,end:e.position()}},uf=t=>{const e=t.scanner,n=e.position();e.advance();const r=e.consumeWhile(s=>!nf(s));return!e.isAtEnd()&&e.peek()===`
`&&e.advance(),{kind:j.Comment,value:r,start:n,end:e.position()}},df=t=>{const e=t.scanner,n=e.position();e.advance();const r=[];let s=!1;for(;!e.isAtEnd();){const o=e.peek();if(o==="\\"){e.advance();const i=e.peek();switch(i){case'"':r.push('"');break;case"\\":r.push("\\");break;case"n":r.push(`
`);break;case"r":r.push("\r");break;case"t":r.push("	");break;default:r.push(i)}e.isAtEnd()||e.advance();continue}if(o==='"'){e.advance(),s=!0;break}r.push(e.advance())}if(!s)throw new Ce(`Unterminated string detected at ${n.offset}`,e.position());return{kind:j.String,value:r.join(""),start:n,end:e.position()}},ff=t=>{const e=t.scanner,n=e.position(),r=e.consumeWhile(s=>bs(s)||!st(s)&&!St(s)&&!qt(s));return{kind:j.Keyword,value:r,start:n,end:e.position()}};function mf(t,e){const r=e.scanner.peek(1);return dt(t)||t==="-"&&r!==null&&dt(r)}const pf=t=>{const e=t.scanner,n=e.position();let r="";if(e.peek()==="-"&&(r+=e.advance()),r+=e.consumeWhile(dt),!e.isAtEnd()&&e.peek()==="."&&e.peek(1)!==null&&dt(e.peek(1))&&(r+=e.advance(),r+=e.consumeWhile(dt)),!e.isAtEnd()&&(e.peek()==="e"||e.peek()==="E")){r+=e.advance(),!e.isAtEnd()&&(e.peek()==="+"||e.peek()==="-")&&(r+=e.advance());const s=e.consumeWhile(dt);if(s.length===0)throw new Ce(`Invalid number format at line ${n.line} column ${n.col}: "${r}"`,{start:n,end:e.position()});r+=s}if(!e.isAtEnd()&&af(e.peek()))throw new Ce(`Invalid number format at line ${n.line} column ${n.col}: "${r}${e.consumeWhile(s=>!st(s)&&!St(s))}"`,{start:n,end:e.position()});return{kind:j.Number,value:Number(r),start:n,end:e.position()}},hf=t=>{const e=t.scanner,n=e.position(),r=e.consumeWhile(s=>!st(s)&&!St(s)&&!qt(s));return{kind:j.Symbol,value:r,start:n,end:e.position()}},gf=t=>{const e=t.scanner,n=e.position();return e.advance(),{kind:"Deref",start:n,end:e.position()}},vf=t=>{const e=t.scanner,n=e.position();return e.advance(),{kind:"Meta",start:n,end:e.position()}},yf=(t,e)=>{const n=t.scanner;n.advance();const r=[];let s=!1;for(;!n.isAtEnd();){const o=n.peek();if(o==="\\"){n.advance();const i=n.peek();if(i===null)throw new Ce(`Unterminated regex literal at ${e.offset}`,n.position());i==='"'?r.push('"'):(r.push("\\"),r.push(i)),n.advance();continue}if(o==='"'){n.advance(),s=!0;break}r.push(n.advance())}if(!s)throw new Ce(`Unterminated regex literal at ${e.offset}`,n.position());return{kind:j.Regex,value:r.join(""),start:e,end:n.position()}},bf={space:" ",newline:`
`,tab:"	",return:"\r",backspace:"\b",formfeed:"\f"},wf=t=>{const e=t.scanner,n=e.position();if(e.advance(),e.isAtEnd())throw new Ce("Unexpected end of input after \\",e.position());const r=e.advance();let s=r;if(/[a-zA-Z]/.test(r)&&(s+=e.consumeWhile(i=>!st(i)&&!St(i)&&!qt(i)&&i!=='"')),s.length===1)return{kind:j.Character,value:s,start:n,end:e.position()};const o=bf[s];if(o!==void 0)return{kind:j.Character,value:o,start:n,end:e.position()};if(/^u[0-9a-fA-F]{4}$/.test(s)){const i=parseInt(s.slice(1),16);return{kind:j.Character,value:String.fromCodePoint(i),start:n,end:e.position()}}throw new Ce(`Unknown character literal: \\${s} at line ${n.line} column ${n.col}`,n)};function kf(t){const e=t.scanner,n=e.position();e.advance();const r=e.peek();if(r==="(")return e.advance(),{kind:j.AnonFnStart,start:n,end:e.position()};if(r==='"')return yf(t,n);if(r==="'")return e.advance(),{kind:j.VarQuote,start:n,end:e.position()};if(r==="{")return e.advance(),{kind:j.SetStart,start:n,end:e.position()};if(r===":"){const s=e.consumeWhile(o=>o!=="{"&&o!==" "&&o!==`
`&&o!=="	"&&o!==",");return{kind:j.NsMapPrefix,value:s,start:n,end:e.position()}}if(r==="_")return e.advance(),{kind:j.Discard,start:n,end:e.position()};if(r!==null&&/[a-zA-Z]/.test(r)){const s=e.consumeWhile(o=>!st(o)&&!St(o)&&!qt(o)&&o!=='"');return{kind:j.ReaderTag,value:s,start:n,end:e.position()}}throw new Ce(`Unknown dispatch character: #${r??"EOF"}`,n)}function Be(t,e){return n=>{const r=n.scanner,s=r.position();return r.advance(),{kind:t,value:e,start:s,end:r.position()}}}function xf(t){const e=t.scanner,n=e.position();e.advance();const r=e.peek();if(!r)throw new Ce(`Unexpected end of input while parsing unquote at ${n.offset}`,n);return Hn(r)?(e.advance(),{kind:j.UnquoteSplicing,value:xe.UnquoteSplicing,start:n,end:e.position()}):{kind:j.Unquote,value:xe.Unquote,start:n,end:e.position()}}const $f=[[st,cf],[qt,uf],[ds,Be(j.LParen,xe.LParen)],[fs,Be(j.RParen,xe.RParen)],[ms,Be(j.LBracket,xe.LBracket)],[ps,Be(j.RBracket,xe.RBracket)],[hs,Be(j.LBrace,xe.LBrace)],[gs,Be(j.RBrace,xe.RBrace)],[rf,df],[bs,ff],[mf,pf],[vs,Be(j.Quote,xe.Quote)],[ys,Be(j.Quasiquote,xe.Quasiquote)],[sf,xf],[Hn,gf],[ws,vf],[of,kf],[lf,wf]];function _f(t){const n=t.scanner.peek(),r=$f.find(([s])=>s(n,t));if(r){const[,s]=r;return s(t)}return hf(t)}function qf(t){const e=[];let n;try{for(;!t.scanner.isAtEnd();){const s=_f(t);if(!s)break;s.kind!==j.Whitespace&&e.push(s)}}catch(s){n=s}return{tokens:e,scanner:t.scanner,error:n}}function qe(t){return"value"in t?t.value:""}function ft(t){const e=t.length,r={scanner:tf(t)},s=qf(r);if(s.error)throw s.error;if(s.scanner.position().offset!==e)throw new Ce(`Unexpected end of input, expected ${e} characters, got ${s.scanner.position().offset}`,s.scanner.position());return s.tokens}function ne(t){var n;const e=t.scanner;for(;((n=e.peek())==null?void 0:n.kind)===j.Discard;){e.advance(),ne(t);const r=e.peek();if(!r)throw new M("Expected a form after #_, got end of input",e.position());if(Ft(r))throw new M(`Expected a form after #_, got '${qe(r)||r.kind}'`,r,{start:r.start.offset,end:r.end.offset});te(t)}}function Sf(t){const e=t.scanner,n=e.peek();e.advance();const r=n.kind===j.ReaderTag?n.value:"";if(ne(t),e.isAtEnd())throw new M(`Expected a form after reader tag #${r}, got end of input`,e.position());const s=te(t);if(t.dataReaders){const o=t.dataReaders.get(r);if(o)try{return o(s)}catch(i){throw i instanceof M?i:new M(`Error in reader tag #${r}: ${i.message}`,n,{start:n.start.offset,end:n.end.offset})}if(t.defaultDataReader)return t.defaultDataReader(r,s);throw new M(`No reader function for tag #${r}`,n,{start:n.start.offset,end:n.end.offset})}throw new M(`Reader tags (#${r}) are only supported in EDN mode. Use clojure.edn/read-string for tagged literals.`,n,{start:n.start.offset,end:n.end.offset})}function Ff(t){const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input",e.position());switch(n.kind){case j.Symbol:return Tf(e);case j.String:{e.advance();const r=a.string(n.value);return _e(r,{start:n.start.offset,end:n.end.offset}),r}case j.Number:{e.advance();const r=a.number(n.value);return _e(r,{start:n.start.offset,end:n.end.offset}),r}case j.Character:{e.advance();const r=a.char(n.value);return _e(r,{start:n.start.offset,end:n.end.offset}),r}case j.Keyword:{e.advance();const r=n.value;let s;if(r.startsWith("::")){if(t.ednMode)throw new M("Auto-qualified keywords (::) are not valid in EDN",n,{start:n.start.offset,end:n.end.offset});const o=r.slice(2);if(o.includes("/")){const i=o.indexOf("/"),l=o.slice(0,i),c=o.slice(i+1),d=t.aliases.get(l);if(!d)throw new M(`No namespace alias '${l}' found for ::${l}/${c}`,n,{start:n.start.offset,end:n.end.offset});s=a.keyword(`:${d}/${c}`)}else s=a.keyword(`:${t.namespace}/${o}`)}else s=a.keyword(r);return _e(s,{start:n.start.offset,end:n.end.offset}),s}}throw new M(`Unexpected token: ${n.kind}`,n,{start:n.start.offset,end:n.end.offset})}const jf=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing quote",e.position());e.advance(),ne(t);const r=te(t);if(!r)throw new M(`Unexpected token: ${qe(n)}`,n);return a.list([a.symbol("quote"),r])},Rf=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing quasiquote",e.position());e.advance(),ne(t);const r=te(t);if(!r)throw new M(`Unexpected token: ${qe(n)}`,n);return a.list([a.symbol("quasiquote"),r])},If=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing unquote",e.position());e.advance(),ne(t);const r=te(t);if(!r)throw new M(`Unexpected token: ${qe(n)}`,n);return a.list([a.symbol("unquote"),r])},Af=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing metadata",e.position());e.advance(),ne(t);const r=te(t);ne(t);const s=te(t);let o;if(u.keyword(r))o=[[r,a.boolean(!0)]];else if(u.map(r))o=r.entries;else if(u.symbol(r))o=[[a.keyword(":tag"),r]];else throw new M("Metadata must be a keyword, map, or symbol",n);if(u.symbol(s)||u.list(s)||u.vector(s)||u.map(s)){const i=s.meta?s.meta.entries:[],l={...s,meta:a.map([...i,...o])},c=R(s);return c&&_e(l,c),l}return s},Pf=t=>{const e=t.scanner;if(!e.peek())throw new M("Unexpected end of input while parsing var quote",e.position());e.advance(),ne(t);const r=te(t);return a.list([a.symbol("var"),r])},Cf=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing deref",e.position());e.advance(),ne(t);const r=te(t);if(!r)throw new M(`Unexpected token: ${qe(n)}`,n);return{kind:y.list,value:[a.symbol("deref"),r]}},Mf=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing unquote splicing",e.position());e.advance(),ne(t);const r=te(t);if(!r)throw new M(`Unexpected token: ${qe(n)}`,n);return a.list([a.symbol(xe.UnquoteSplicing),r])},Ft=t=>[j.RParen,j.RBracket,j.RBrace].includes(t.kind),ks=(t,e)=>function(n){const r=n.scanner,s=r.peek();if(!s)throw new M("Unexpected end of input while parsing collection",r.position());r.advance();const o=[];let i=!1,l;for(;!r.isAtEnd();){ne(n);const d=r.peek();if(!d)break;if(Ft(d)&&d.kind!==e)throw new M(`Expected '${e}' to close ${t} started at line ${s.start.line} column ${s.start.col}, but got '${qe(d)}' at line ${d.start.line} column ${d.start.col}`,d,{start:d.start.offset,end:d.end.offset});if(d.kind===e){l=d.end.offset,r.advance(),i=!0;break}const m=te(n);o.push(m)}if(!i)throw new M(`Unmatched ${t} started at line ${s.start.line} column ${s.start.col}`,r.peek());const c={kind:t,value:o};return l!==void 0&&_e(c,{start:s.start.offset,end:l}),c},Nf=ks("list",j.RParen),Lf=ks("vector",j.RBracket),Ef=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing set",e.position());e.advance();const r=[];let s=!1,o;for(;!e.isAtEnd();){ne(t);const c=e.peek();if(!c)break;if(Ft(c)&&c.kind!==j.RBrace)throw new M(`Expected '}' to close set started at line ${n.start.line} column ${n.start.col}, but got '${qe(c)}' at line ${c.start.line} column ${c.start.col}`,c,{start:c.start.offset,end:c.end.offset});if(c.kind===j.RBrace){o=c.end.offset,e.advance(),s=!0;break}r.push(te(t))}if(!s)throw new M(`Unmatched set started at line ${n.start.line} column ${n.start.col}`,e.peek());const i=[];for(const c of r)i.some(d=>u.equal(d,c))||i.push(c);const l=a.set(i);return o!==void 0&&_e(l,{start:n.start.offset,end:o}),l},Tf=t=>{const e=t.peek();if(!e)throw new M("Unexpected end of input",t.position());if(e.kind!==j.Symbol)throw new M(`Unexpected token: ${qe(e)}`,e,{start:e.start.offset,end:e.end.offset});t.advance();let n;switch(e.value){case"true":case"false":n=a.boolean(e.value==="true");break;case"nil":n=a.nil();break;default:n=a.symbol(e.value)}return _e(n,{start:e.start.offset,end:e.end.offset}),n},zf=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing map",e.position());let r=!1,s;e.advance();const o=[];for(;!e.isAtEnd();){ne(t);const l=e.peek();if(!l)break;if(Ft(l)&&l.kind!==j.RBrace)throw new M(`Expected '}' to close map started at line ${n.start.line} column ${n.start.col}, but got '${l.kind}' at line ${l.start.line} column ${l.start.col}`,l,{start:l.start.offset,end:l.end.offset});if(l.kind===j.RBrace){s=l.end.offset,e.advance(),r=!0;break}const c=te(t);ne(t);const d=e.peek();if(!d)throw new M(`Expected value in map started at line ${n.start.line} column ${n.start.col}, but got end of input`,e.position());if(d.kind===j.RBrace)throw new M(`Map started at line ${n.start.line} column ${n.start.col} has key ${c.kind} but no value`,e.position());const m=te(t);if(!m)break;o.push([c,m])}if(!r)throw new M(`Unmatched map started at line ${n.start.line} column ${n.start.col}`,e.peek());const i={kind:y.map,entries:o};return s!==void 0&&_e(i,{start:n.start.offset,end:s}),i};function Vf(t){let e=0,n=!1;function r(s){switch(s.kind){case"symbol":{const o=s.name;o==="%"||o==="%1"?e=Math.max(e,1):/^%[2-9]$/.test(o)?e=Math.max(e,parseInt(o[1])):o==="%&"&&(n=!0);break}case"list":case"vector":for(const o of s.value)r(o);break;case"map":for(const[o,i]of s.entries)r(o),r(i);break}}for(const s of t)r(s);return{maxIndex:e,hasRest:n}}function xt(t){switch(t.kind){case"symbol":{const e=t.name;return e==="%"||e==="%1"?a.symbol("p1"):/^%[2-9]$/.test(e)?a.symbol(`p${e[1]}`):e==="%&"?a.symbol("rest"):t}case"list":return{...t,value:t.value.map(xt)};case"vector":return{...t,value:t.value.map(xt)};case"map":return{...t,entries:t.entries.map(([e,n])=>[xt(e),xt(n)])};default:return t}}const Df=t=>{const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input while parsing anonymous function",e.position());e.advance();const r=[];let s=!1,o;for(;!e.isAtEnd();){ne(t);const h=e.peek();if(!h)break;if(Ft(h)&&h.kind!==j.RParen)throw new M(`Expected ')' to close anonymous function started at line ${n.start.line} column ${n.start.col}, but got '${qe(h)}' at line ${h.start.line} column ${h.start.col}`,h,{start:h.start.offset,end:h.end.offset});if(h.kind===j.RParen){o=h.end.offset,e.advance(),s=!0;break}if(h.kind===j.AnonFnStart)throw new M("Nested anonymous functions (#(...)) are not allowed",h,{start:h.start.offset,end:h.end.offset});r.push(te(t))}if(!s)throw new M(`Unmatched anonymous function started at line ${n.start.line} column ${n.start.col}`,e.peek());const i=a.list(r),{maxIndex:l,hasRest:c}=Vf([i]),d=[];for(let h=1;h<=l;h++)d.push(a.symbol(`p${h}`));c&&(d.push(a.symbol("&")),d.push(a.symbol("rest")));const m=xt(i),p=a.list([a.symbol("fn"),a.vector(d),m]);return o!==void 0&&_e(p,{start:n.start.offset,end:o}),p};function Bf(t){let e=t,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(e))!==null;){for(const o of s[1]){if(o==="x")throw new M("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",null);n.includes(o)||(n+=o)}e=e.slice(s[0].length)}return{pattern:e,flags:n}}const Of=t=>{const e=t.scanner,n=e.peek();if(!n||n.kind!==j.Regex)throw new M("Expected regex token",e.position());e.advance();const{pattern:r,flags:s}=Bf(n.value),o=a.regex(r,s);return _e(o,{start:n.start.offset,end:n.end.offset}),o};function te(t){const e=t.scanner,n=e.peek();if(!n)throw new M("Unexpected end of input",e.position());if(t.ednMode)switch(n.kind){case j.Quote:throw new M("Quote (') is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.Quasiquote:throw new M("Syntax-quote (`) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.Unquote:throw new M("Unquote (~) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.UnquoteSplicing:throw new M("Unquote-splicing (~@) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.AnonFnStart:throw new M("Anonymous function (#(...)) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.Regex:throw new M('Regex literal (#"...") is not valid in EDN',n,{start:n.start.offset,end:n.end.offset});case j.Deref:throw new M("Deref (@) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.VarQuote:throw new M("Var-quote (#') is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.Meta:throw new M("Metadata (^) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset});case j.NsMapPrefix:throw new M("Namespaced map (#:ns{...}) is not valid in EDN",n,{start:n.start.offset,end:n.end.offset})}switch(n.kind){case j.String:case j.Number:case j.Keyword:case j.Symbol:case j.Character:return Ff(t);case j.LParen:return Nf(t);case j.LBrace:return zf(t);case j.LBracket:return Lf(t);case j.Quote:return jf(t);case j.Quasiquote:return Rf(t);case j.Unquote:return If(t);case j.UnquoteSplicing:return Mf(t);case j.AnonFnStart:return Df(t);case j.SetStart:return Ef(t);case j.Deref:return Cf(t);case j.VarQuote:return Pf(t);case j.Meta:return Af(t);case j.Regex:return Of(t);case j.NsMapPrefix:return Uf(t);case j.ReaderTag:return Sf(t);case j.Discard:throw new M("Unexpected #_ discard in this context",n,{start:n.start.offset,end:n.end.offset});default:throw new M(`Unexpected token: ${qe(n)} at line ${n.start.line} column ${n.start.col}`,n,{start:n.start.offset,end:n.end.offset})}}function Hf(t,e,n){if(t.startsWith("::")){const r=t.slice(2);if(!r)return e.namespace;const s=e.aliases.get(r);if(!s)throw new M(`No namespace alias '${r}' found for #${t}{...}`,n,{start:n.start.offset,end:n.end.offset});return s}return t.slice(1)}const Uf=t=>{const e=t.scanner,n=e.peek();if(!n||n.kind!==j.NsMapPrefix)throw new M("Expected namespace map prefix",e.position());e.advance();const r=Hf(n.value,t,n),s=te(t);if(s.kind!=="map")throw new M(`#:${r}{...} requires a map literal, got ${s.kind}`,n,{start:n.start.offset,end:n.end.offset});const o=s.entries.map(([i,l])=>{if(i.kind==="keyword"){const c=i.name.slice(1);if(!c.includes("/"))return[a.keyword(`:${r}/${c}`),l]}return[i,l]});return a.map(o)};function Ut(t,e="user",n=new Map){const r=t.filter(l=>l.kind!==j.Comment),s=us(r),o={scanner:s,namespace:e,aliases:n},i=[];for(;!s.isAtEnd()&&(ne(o),!s.isAtEnd());)i.push(te(o));return i}function Wf(t,e){const n=t.filter(i=>i.kind!==j.Comment),r=us(n),s={scanner:r,namespace:"user",aliases:new Map,ednMode:!0,dataReaders:e==null?void 0:e.dataReaders,defaultDataReader:e==null?void 0:e.defaultDataReader},o=[];for(;!r.isAtEnd()&&(ne(s),!r.isAtEnd());)o.push(te(s));return o}const Kf=["clojure","user"];function Jf(t,e){if(e==="all")return!0;const n=t.split(".")[0];return Kf.includes(n)?!0:e.some(r=>t===r||t.startsWith(r+"."))}function Gf(t){const e=new Map;for(const[n,r]of t)e.set(n,r.kind==="var"?{...r}:r);return e}function xs(t,e){if(e.has(t))return e.get(t);const n={bindings:Gf(t.bindings),outer:null};return t.ns&&(n.ns={kind:"namespace",name:t.ns.name,vars:new Map([...t.ns.vars].map(([r,s])=>[r,{...s}])),aliases:new Map,readerAliases:new Map(t.ns.readerAliases)}),e.set(t,n),t.outer&&(n.outer=xs(t.outer,e)),n}function Qf(t){const e=new Map,n=new Map;for(const[r,s]of t)n.set(r,xs(s,e));for(const[r,s]of t){const o=n.get(r);if(s.ns&&o.ns)for(const[i,l]of s.ns.aliases){const c=n.get(l.name);c!=null&&c.ns&&o.ns.aliases.set(i,c.ns)}}return n}function Wt(t,e,n){if(!t.has(n)){const r=Ke(e);r.ns=Ot(n),t.set(n,r)}return t.get(n)}function Et(t,e,n,r,s,o){if(!u.vector(t))throw new f("require spec must be a vector, e.g. [my.ns :as alias]",{spec:t});const i=t.value;if(i.length===0||!u.symbol(i[0]))throw new f("First element of require spec must be a namespace symbol",{spec:t});const l=i[0].name;if((o?o(l):!0)&&s!==void 0&&!Jf(l,s)){const h=s==="all"?[]:s,g=new f(`Access denied: namespace '${l}' is not in the allowed packages for this session.
Allowed packages: ${JSON.stringify(h)}
To allow all packages, use: allowedPackages: 'all'`,{nsName:l,allowedPackages:s});throw g.code="namespace/access-denied",g}if(i.some(h=>u.keyword(h)&&h.name===":as-alias")){let h=1;for(;h<i.length;){const g=i[h];if(!u.keyword(g))throw new f(`Expected keyword in require spec, got ${g.kind}`,{spec:t,position:h});if(g.name===":as-alias"){h++;const w=i[h];if(!w||!u.symbol(w))throw new f(":as-alias expects a symbol alias",{spec:t,position:h});e.ns.readerAliases.set(w.name,l),h++}else throw new f(`:as-alias specs only support :as-alias, got ${g.name}`,{spec:t})}return}let m=n.get(l);if(!m&&r&&(r(l),m=n.get(l)),!m){const h=new f(`Namespace '${l}' not found. Only already-loaded namespaces can be required.`,{nsName:l});throw h.code="namespace/not-found",h}let p=1;for(;p<i.length;){const h=i[p];if(!u.keyword(h))throw new f(`Expected keyword in require spec, got ${h.kind}`,{spec:t,position:p});if(h.name===":as"){p++;const g=i[p];if(!g||!u.symbol(g))throw new f(":as expects a symbol alias",{spec:t,position:p});e.ns.aliases.set(g.name,m.ns),p++}else if(h.name===":refer"){p++;const g=i[p];if(!g||!u.vector(g))throw new f(":refer expects a vector of symbols",{spec:t,position:p});for(const w of g.value){if(!u.symbol(w))throw new f(":refer vector must contain only symbols",{spec:t,sym:w});const k=m.ns.vars.get(w.name);if(k===void 0)throw new f(`Symbol ${w.name} not found in namespace ${l}`,{nsName:l,symbol:w.name});e.ns.vars.set(w.name,k)}p++}else throw new f(`Unknown require option ${h.name}. Supported: :as, :refer`,{spec:t,keyword:h.name})}}function Yf(t,e,n,r){var l,c;const s=((l=t.get("user"))==null?void 0:l.ns)??Ot("user");K("*ns*",s,e);const o=(c=e.ns)==null?void 0:c.vars.get("*ns*");o&&(o.dynamic=!0);function i(d){var m;return d===void 0?null:hn(d)?d:Qe(d)?((m=t.get(d.name))==null?void 0:m.ns)??null:null}K("ns-name",a.nativeFn("ns-name",d=>d===void 0?a.nil():d.kind==="namespace"?a.symbol(d.name):d.kind==="symbol"?d:d.kind==="string"?a.symbol(d.value):a.nil()),e),K("all-ns",a.nativeFn("all-ns",()=>a.list([...t.values()].map(d=>d.ns).filter(Boolean))),e),K("find-ns",a.nativeFn("find-ns",d=>{var m;return d===void 0||!Qe(d)?a.nil():((m=t.get(d.name))==null?void 0:m.ns)??a.nil()}),e),K("in-ns",a.nativeFnCtx("in-ns",(d,m,p)=>{var h;if(!p||!Qe(p))throw new f("in-ns expects a symbol",{sym:p});return d.setCurrentNs&&d.setCurrentNs(p.name),((h=t.get(p.name))==null?void 0:h.ns)??a.nil()}),e),K("ns-aliases",a.nativeFn("ns-aliases",d=>{const m=i(d);if(!m)return a.map([]);const p=[];return m.aliases.forEach((h,g)=>{p.push([a.symbol(g),h])}),a.map(p)}),e),K("ns-interns",a.nativeFn("ns-interns",d=>{const m=i(d);if(!m)return a.map([]);const p=[];return m.vars.forEach((h,g)=>{h.ns===m.name&&p.push([a.symbol(g),h])}),a.map(p)}),e),K("ns-publics",a.nativeFn("ns-publics",d=>{const m=i(d);if(!m)return a.map([]);const p=[];return m.vars.forEach((h,g)=>{var k;if(h.ns!==m.name)return;(((k=h.meta)==null?void 0:k.entries)??[]).some(([S,I])=>S.kind==="keyword"&&S.name===":private"&&I.kind==="boolean"&&I.value===!0)||p.push([a.symbol(g),h])}),a.map(p)}),e),K("ns-refers",a.nativeFn("ns-refers",d=>{const m=i(d);if(!m)return a.map([]);const p=[];return m.vars.forEach((h,g)=>{h.ns!==m.name&&p.push([a.symbol(g),h])}),a.map(p)}),e),K("ns-map",a.nativeFn("ns-map",d=>{const m=i(d);if(!m)return a.map([]);const p=[];return m.vars.forEach((h,g)=>{p.push([a.symbol(g),h])}),a.map(p)}),e),K("ns-imports",a.nativeFn("ns-imports",d=>a.map([])),e),K("the-ns",a.nativeFn("the-ns",d=>{var m;return d===void 0?a.nil():hn(d)?d:Qe(d)?((m=t.get(d.name))==null?void 0:m.ns)??a.nil():a.nil()}),e),K("instance?",a.nativeFn("instance?",(d,m)=>a.boolean(!1)),e),K("class",a.nativeFn("class",d=>d===void 0?a.nil():a.string(`conjure.${d.kind}`)),e),K("class?",a.nativeFn("class?",d=>a.boolean(!1)),e),K("special-symbol?",a.nativeFn("special-symbol?",d=>{if(d===void 0||!Qe(d))return a.boolean(!1);const m=new Set([...Object.values(W),"import"]);return a.boolean(m.has(d.name))}),e),K("loaded-libs",a.nativeFn("loaded-libs",()=>a.set([...t.keys()].map(a.symbol))),e),K("require",a.nativeFnCtx("require",(d,m,...p)=>{const h=t.get(n());for(const g of p)Et(g,h,t,w=>r(w,d));return a.nil()}),e),K("resolve",a.nativeFn("resolve",d=>{if(!Qe(d))return a.nil();const m=d.name.indexOf("/");if(m>0){const h=d.name.slice(0,m),g=d.name.slice(m+1),w=t.get(h)??null;return w?Ht(g,w)??a.nil():a.nil()}const p=t.get(n());return Ht(d.name,p)??a.nil()}),e)}function Xf(t,e){const n=Wt(t,e,"clojure.reflect");K("parse-flags",a.nativeFn("parse-flags",(s,o)=>a.set([])),n),K("reflect",a.nativeFn("reflect",s=>a.map([])),n),K("type-reflect",a.nativeFn("type-reflect",(s,...o)=>a.map([])),n);const r=Wt(t,e,"cursive.repl.runtime");K("completions",a.nativeFn("completions",(...s)=>a.nil()),r);for(const s of["Class","Object","String","Number","Boolean","Integer","Long","Double","Float","Byte","Short","Character","Void","Math","System","Runtime","Thread","Throwable","Exception","Error","Iterable","Comparable","Runnable","Cloneable"])K(s,a.keyword(`:java.lang/${s}`),e)}function Zf(t,e){const n=new Map;for(const c of t){if(n.has(c.id))throw new Error(`Duplicate module ID: '${c.id}'`);n.set(c.id,c)}const r=new Map;for(const c of t)for(const d of c.declareNs){const m=r.get(d.name)??[];m.push(c.id),r.set(d.name,m)}const s=new Map,o=new Map;for(const c of t)s.set(c.id,[]),o.set(c.id,0);for(const c of t)for(const d of c.dependsOn??[]){if(e!=null&&e.has(d))continue;const m=r.get(d);if(!m||m.length===0)throw new Error(`No module provides namespace '${d}' (required by '${c.id}')`);for(const p of m)p!==c.id&&(s.get(p).push(c.id),o.set(c.id,o.get(c.id)+1))}const i=[];for(const[c,d]of o)d===0&&i.push(c);const l=[];for(;i.length>0;){const c=i.shift();l.push(n.get(c));for(const d of s.get(c)){const m=o.get(d)-1;o.set(d,m),m===0&&i.push(d)}}if(l.length!==t.length){const c=t.map(d=>d.id).filter(d=>!l.some(m=>m.id===d));throw new Error(`Circular dependency detected in module system. Modules in cycle: ${c.join(", ")}`)}return l}const em={"+":a.nativeFn("+",function(...e){if(e.length===0)return a.number(0);if(e.length===2){if(e[0].kind!=="number")throw f.atArg("+ expects all arguments to be numbers",{args:e},0);if(e[1].kind!=="number")throw f.atArg("+ expects all arguments to be numbers",{args:e},1);return a.number(e[0].value+e[1].value)}let n=0;for(let r=0;r<e.length;r++){if(e[r].kind!=="number")throw f.atArg("+ expects all arguments to be numbers",{args:e},r);n+=e[r].value}return a.number(n)}).doc("Returns the sum of the arguments. Throws on non-number arguments.",[["&","nums"]]),"-":a.nativeFn("-",function(...e){if(e.length===0)throw new f("- expects at least one argument",{args:e});if(e[0].kind!=="number")throw f.atArg("- expects all arguments to be numbers",{args:e},0);if(e.length===1)return a.number(-e[0].value);if(e.length===2){if(e[1].kind!=="number")throw f.atArg("- expects all arguments to be numbers",{args:e},1);return a.number(e[0].value-e[1].value)}let n=e[0].value;for(let r=1;r<e.length;r++){if(e[r].kind!=="number")throw f.atArg("- expects all arguments to be numbers",{args:e},r);n-=e[r].value}return a.number(n)}).doc("Returns the difference of the arguments. Throws on non-number arguments.",[["&","nums"]]),"*":a.nativeFn("*",function(...e){if(e.length===0)return a.number(1);if(e.length===2){if(e[0].kind!=="number")throw f.atArg("* expects all arguments to be numbers",{args:e},0);if(e[1].kind!=="number")throw f.atArg("* expects all arguments to be numbers",{args:e},1);return a.number(e[0].value*e[1].value)}let n=1;for(let r=0;r<e.length;r++){if(e[r].kind!=="number")throw f.atArg("* expects all arguments to be numbers",{args:e},r);n*=e[r].value}return a.number(n)}).doc("Returns the product of the arguments. Throws on non-number arguments.",[["&","nums"]]),"/":a.nativeFn("/",function(...e){if(e.length===0)throw new f("/ expects at least one argument",{args:e});if(e[0].kind!=="number")throw f.atArg("/ expects all arguments to be numbers",{args:e},0);if(e.length===2){if(e[1].kind!=="number")throw f.atArg("/ expects all arguments to be numbers",{args:e},1);if(e[1].value===0)throw f.atArg("division by zero",{args:e},1);return a.number(e[0].value/e[1].value)}let n=e[0].value;for(let r=1;r<e.length;r++){if(e[r].kind!=="number")throw f.atArg("/ expects all arguments to be numbers",{args:e},r);if(e[r].value===0){const s=new f("division by zero",{args:e});throw s.data={argIndex:r},s}n/=e[r].value}return a.number(n)}).doc("Returns the quotient of the arguments. Throws on non-number arguments or division by zero.",[["&","nums"]]),">":a.nativeFn(">",function(...e){if(e.length<2)throw new f("> expects at least two arguments",{args:e});if(e.length===2){if(e[0].kind!=="number")throw f.atArg("> expects all arguments to be numbers",{args:e},0);if(e[1].kind!=="number")throw f.atArg("> expects all arguments to be numbers",{args:e},1);return a.boolean(e[0].value>e[1].value)}if(e[0].kind!=="number")throw f.atArg("> expects all arguments to be numbers",{args:e},0);for(let n=1;n<e.length;n++){if(e[n].kind!=="number")throw f.atArg("> expects all arguments to be numbers",{args:e},n);if(e[n].value>=e[n-1].value)return a.boolean(!1)}return a.boolean(!0)}).doc("Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.",[["&","nums"]]),"<":a.nativeFn("<",function(...e){if(e.length<2)throw new f("< expects at least two arguments",{args:e});if(e.length===2){if(e[0].kind!=="number")throw f.atArg("< expects all arguments to be numbers",{args:e},0);if(e[1].kind!=="number")throw f.atArg("< expects all arguments to be numbers",{args:e},1);return a.boolean(e[0].value<e[1].value)}for(let n=0;n<e.length;n++)if(e[n].kind!=="number")throw f.atArg("< expects all arguments to be numbers",{args:e},n);for(let n=1;n<e.length;n++)if(e[n].value<=e[n-1].value)return a.boolean(!1);return a.boolean(!0)}).doc("Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.",[["&","nums"]]),">=":a.nativeFn(">=",function(...e){if(e.length<2)throw new f(">= expects at least two arguments",{args:e});if(e.length===2){if(e[0].kind!=="number")throw f.atArg(">= expects all arguments to be numbers",{args:e},0);if(e[1].kind!=="number")throw f.atArg(">= expects all arguments to be numbers",{args:e},1);return a.boolean(e[0].value>=e[1].value)}for(let n=0;n<e.length;n++)if(e[n].kind!=="number")throw f.atArg(">= expects all arguments to be numbers",{args:e},n);for(let n=1;n<e.length;n++)if(e[n].value>e[n-1].value)return a.boolean(!1);return a.boolean(!0)}).doc("Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.",[["&","nums"]]),"<=":a.nativeFn("<=",function(...e){if(e.length<2)throw new f("<= expects at least two arguments",{args:e});if(e.length===2){if(e[0].kind!=="number")throw f.atArg("<= expects all arguments to be numbers",{args:e},0);if(e[1].kind!=="number")throw f.atArg("<= expects all arguments to be numbers",{args:e},1);return a.boolean(e[0].value<=e[1].value)}for(let n=0;n<e.length;n++)if(e[n].kind!=="number")throw f.atArg("<= expects all arguments to be numbers",{args:e},n);for(let n=1;n<e.length;n++)if(e[n].value<e[n-1].value)return a.boolean(!1);return a.boolean(!0)}).doc("Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.",[["&","nums"]]),"=":a.nativeFn("=",function(...e){if(e.length<2)throw new f("= expects at least two arguments",{args:e});for(let n=1;n<e.length;n++)if(!u.equal(e[n],e[n-1]))return a.boolean(!1);return a.boolean(!0)}).doc("Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.",[["&","vals"]]),inc:a.nativeFn("inc",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`inc expects a number${e!==void 0?`, got ${b(e)}`:""}`,{x:e},0);return a.number(e.value+1)}).doc("Returns the argument incremented by 1. Throws on non-number arguments.",[["x"]]),dec:a.nativeFn("dec",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`dec expects a number${e!==void 0?`, got ${b(e)}`:""}`,{x:e},0);return a.number(e.value-1)}).doc("Returns the argument decremented by 1. Throws on non-number arguments.",[["x"]]),max:a.nativeFn("max",function(...e){if(e.length===0)throw new f("max expects at least one argument",{args:e});if(e[0].kind!=="number")throw f.atArg("max expects all arguments to be numbers",{args:e},0);let n=e[0].value;for(let r=1;r<e.length;r++){if(e[r].kind!=="number")throw f.atArg("max expects all arguments to be numbers",{args:e},r);const s=e[r].value;s>n&&(n=s)}return a.number(n)}).doc("Returns the largest of the arguments. Throws on non-number arguments.",[["&","nums"]]),min:a.nativeFn("min",function(...e){if(e.length===0)throw new f("min expects at least one argument",{args:e});if(e[0].kind!=="number")throw f.atArg("min expects all arguments to be numbers",{args:e},0);let n=e[0].value;for(let r=1;r<e.length;r++){if(e[r].kind!=="number")throw f.atArg("min expects all arguments to be numbers",{args:e},r);const s=e[r].value;s<n&&(n=s)}return a.number(n)}).doc("Returns the smallest of the arguments. Throws on non-number arguments.",[["&","nums"]]),mod:a.nativeFn("mod",function(e,n){if(e===void 0||e.kind!=="number")throw f.atArg(`mod expects a number as first argument${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);if(n===void 0||n.kind!=="number")throw f.atArg(`mod expects a number as second argument${n!==void 0?`, got ${b(n)}`:""}`,{d:n},1);if(n.value===0){const s=new f("mod: division by zero",{n:e,d:n});throw s.data={argIndex:1},s}const r=e.value%n.value;return a.number(r<0?r+Math.abs(n.value):r)}).doc("Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.",[["n","d"]]),"even?":a.nativeFn("even?",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`even? expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.boolean(e.value%2===0)}).doc("Returns true if the argument is an even number, false otherwise.",[["n"]]),"odd?":a.nativeFn("odd?",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`odd? expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.boolean(Math.abs(e.value)%2!==0)}).doc("Returns true if the argument is an odd number, false otherwise.",[["n"]]),"pos?":a.nativeFn("pos?",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`pos? expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.boolean(e.value>0)}).doc("Returns true if the argument is a positive number, false otherwise.",[["n"]]),"neg?":a.nativeFn("neg?",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`neg? expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.boolean(e.value<0)}).doc("Returns true if the argument is a negative number, false otherwise.",[["n"]]),"zero?":a.nativeFn("zero?",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`zero? expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.boolean(e.value===0)}).doc("Returns true if the argument is zero, false otherwise.",[["n"]]),abs:a.nativeFn("abs",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`abs expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.number(Math.abs(e.value))}).doc("Returns the absolute value of a.",[["a"]]),sqrt:a.nativeFn("sqrt",function(e){if(e===void 0||e.kind!=="number")throw f.atArg(`sqrt expects a number${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.number(Math.sqrt(e.value))}).doc("Returns the square root of n.",[["n"]]),quot:a.nativeFn("quot",function(e,n){if(e===void 0||e.kind!=="number")throw f.atArg("quot expects a number as first argument",{num:e},0);if(n===void 0||n.kind!=="number")throw f.atArg("quot expects a number as second argument",{div:n},1);if(n.value===0)throw f.atArg("quot: division by zero",{num:e,div:n},1);return a.number(Math.trunc(e.value/n.value))}).doc("quot[ient] of dividing numerator by denominator.",[["num","div"]]),rem:a.nativeFn("rem",function(e,n){if(e===void 0||e.kind!=="number")throw f.atArg("rem expects a number as first argument",{num:e},0);if(n===void 0||n.kind!=="number")throw f.atArg("rem expects a number as second argument",{div:n},1);if(n.value===0)throw f.atArg("rem: division by zero",{num:e,div:n},1);return a.number(e.value%n.value)}).doc("remainder of dividing numerator by denominator.",[["num","div"]]),rand:a.nativeFn("rand",function(...e){if(e.length===0)return a.number(Math.random());if(e[0].kind!=="number")throw f.atArg("rand expects a number",{n:e[0]},0);return a.number(Math.random()*e[0].value)}).doc("Returns a random floating point number between 0 (inclusive) and n (default 1) (exclusive).",[[],["n"]]),"rand-int":a.nativeFn("rand-int",function(e){if(e===void 0||e.kind!=="number")throw f.atArg("rand-int expects a number",{n:e},0);return a.number(Math.floor(Math.random()*e.value))}).doc("Returns a random integer between 0 (inclusive) and n (exclusive).",[["n"]]),"rand-nth":a.nativeFn("rand-nth",function(e){if(e===void 0||!u.list(e)&&!u.vector(e))throw f.atArg("rand-nth expects a list or vector",{coll:e},0);const n=e.value;if(n.length===0)throw f.atArg("rand-nth called on empty collection",{coll:e},0);return n[Math.floor(Math.random()*n.length)]}).doc("Return a random element of the (sequential) collection.",[["coll"]]),shuffle:a.nativeFn("shuffle",function(e){if(e===void 0||e.kind==="nil")return a.vector([]);if(!u.seqable(e))throw f.atArg(`shuffle expects a collection, got ${b(e)}`,{coll:e},0);const n=[...X(e)];for(let r=n.length-1;r>0;r--){const s=Math.floor(Math.random()*(r+1));[n[r],n[s]]=[n[s],n[r]]}return a.vector(n)}).doc("Return a random permutation of coll.",[["coll"]]),"bit-and":a.nativeFn("bit-and",function(e,n){if((e==null?void 0:e.kind)!=="number")throw f.atArg("bit-and expects numbers",{x:e},0);if((n==null?void 0:n.kind)!=="number")throw f.atArg("bit-and expects numbers",{y:n},1);return a.number(e.value&n.value)}).doc("Bitwise and",[["x","y"]]),"bit-or":a.nativeFn("bit-or",function(e,n){if((e==null?void 0:e.kind)!=="number")throw f.atArg("bit-or expects numbers",{x:e},0);if((n==null?void 0:n.kind)!=="number")throw f.atArg("bit-or expects numbers",{y:n},1);return a.number(e.value|n.value)}).doc("Bitwise or",[["x","y"]]),"bit-xor":a.nativeFn("bit-xor",function(e,n){if((e==null?void 0:e.kind)!=="number")throw f.atArg("bit-xor expects numbers",{x:e},0);if((n==null?void 0:n.kind)!=="number")throw f.atArg("bit-xor expects numbers",{y:n},1);return a.number(e.value^n.value)}).doc("Bitwise exclusive or",[["x","y"]]),"bit-not":a.nativeFn("bit-not",function(e){if((e==null?void 0:e.kind)!=="number")throw f.atArg("bit-not expects a number",{x:e},0);return a.number(~e.value)}).doc("Bitwise complement",[["x"]]),"bit-shift-left":a.nativeFn("bit-shift-left",function(e,n){if((e==null?void 0:e.kind)!=="number")throw f.atArg("bit-shift-left expects numbers",{x:e},0);if((n==null?void 0:n.kind)!=="number")throw f.atArg("bit-shift-left expects numbers",{n},1);return a.number(e.value<<n.value)}).doc("Bitwise shift left",[["x","n"]]),"bit-shift-right":a.nativeFn("bit-shift-right",function(e,n){if((e==null?void 0:e.kind)!=="number")throw f.atArg("bit-shift-right expects numbers",{x:e},0);if((n==null?void 0:n.kind)!=="number")throw f.atArg("bit-shift-right expects numbers",{n},1);return a.number(e.value>>n.value)}).doc("Bitwise shift right",[["x","n"]]),"unsigned-bit-shift-right":a.nativeFn("unsigned-bit-shift-right",function(e,n){if((e==null?void 0:e.kind)!=="number")throw f.atArg("unsigned-bit-shift-right expects numbers",{x:e},0);if((n==null?void 0:n.kind)!=="number")throw f.atArg("unsigned-bit-shift-right expects numbers",{n},1);return a.number(e.value>>>n.value)}).doc("Bitwise shift right, without sign-extension",[["x","n"]])};function rr(t,e,n,r){if(t.validator&&u.aFunction(t.validator)){const s=n.applyFunction(t.validator,[e],r);if(u.falsy(s))throw new f("Invalid reference state",{newVal:e})}}function sr(t,e,n){if(t.watches)for(const[,{key:r,fn:s,ctx:o,callEnv:i}]of t.watches)o.applyFunction(s,[r,{kind:"atom",value:n},e,n],i)}const tm={atom:a.nativeFn("atom",function(e){return a.atom(e)}).doc("Returns a new atom holding the given value.",[["value"]]),deref:a.nativeFn("deref",function(e){if(u.atom(e)||u.volatile(e)||u.reduced(e))return e.value;if(u.delay(e))return Qr(e);throw e.kind==="pending"?f.atArg("@ on a pending value requires an (async ...) context. Use (async @x) or compose with then/catch.",{value:e},0):f.atArg(`deref expects an atom, volatile, reduced, or delay value, got ${e.kind}`,{value:e},0)}).doc("Returns the wrapped value from an atom, volatile, reduced, or delay value.",[["value"]]),"swap!":a.nativeFnCtx("swap!",function(e,n,r,s,...o){if(!u.atom(r))throw f.atArg(`swap! expects an atom as its first argument, got ${r.kind}`,{atomVal:r},0);if(!u.aFunction(s))throw f.atArg(`swap! expects a function as its second argument, got ${s.kind}`,{fn:s},1);const i=r,l=i.value,c=e.applyFunction(s,[l,...o],n);return rr(i,c,e,n),i.value=c,sr(i,l,c),c}).doc("Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.",[["atomVal","fn","&","extraArgs"]]),"reset!":a.nativeFnCtx("reset!",function(e,n,r,s){if(!u.atom(r))throw f.atArg(`reset! expects an atom as its first argument, got ${r.kind}`,{atomVal:r},0);const o=r,i=o.value;return rr(o,s,e,n),o.value=s,sr(o,i,s),s}).doc("Sets the value of the atom to newVal and returns the new value.",[["atomVal","newVal"]]),"atom?":a.nativeFn("atom?",function(e){return a.boolean(u.atom(e))}).doc("Returns true if the value is an atom, false otherwise.",[["value"]]),"swap-vals!":a.nativeFnCtx("swap-vals!",function(e,n,r,s,...o){if(!u.atom(r))throw f.atArg(`swap-vals! expects an atom, got ${b(r)}`,{atomVal:r},0);if(!u.aFunction(s))throw f.atArg(`swap-vals! expects a function, got ${b(s)}`,{fn:s},1);const i=r.value,l=e.applyFunction(s,[i,...o],n);return r.value=l,a.vector([i,l])}).doc("Atomically swaps the value of atom to be (apply f current-value-of-atom args). Returns [old new].",[["atom","f","&","args"]]),"reset-vals!":a.nativeFn("reset-vals!",function(e,n){if(!u.atom(e))throw f.atArg(`reset-vals! expects an atom, got ${b(e)}`,{atomVal:e},0);const r=e.value;return e.value=n,a.vector([r,n])}).doc("Sets the value of atom to newVal. Returns [old new].",[["atom","newval"]]),"compare-and-set!":a.nativeFn("compare-and-set!",function(e,n,r){if(!u.atom(e))throw f.atArg(`compare-and-set! expects an atom, got ${b(e)}`,{atomVal:e},0);return u.equal(e.value,n)?(e.value=r,a.boolean(!0)):a.boolean(!1)}).doc("Atomically sets the value of atom to newval if and only if the current value of the atom is identical to oldval. Returns true if set happened, else false.",[["atom","oldval","newval"]]),"add-watch":a.nativeFnCtx("add-watch",function(e,n,r,s,o){if(!u.atom(r))throw f.atArg(`add-watch expects an atom, got ${b(r)}`,{atomVal:r},0);if(!u.aFunction(o))throw f.atArg(`add-watch expects a function, got ${b(o)}`,{fn:o},2);const i=r;return i.watches||(i.watches=new Map),i.watches.set(b(s),{key:s,fn:o,ctx:e,callEnv:n}),r}).doc("Adds a watch function to an atom. The watch fn must be a fn of 4 args: a key, the atom, its old-state, its new-state.",[["atom","key","fn"]]),"remove-watch":a.nativeFn("remove-watch",function(e,n){if(!u.atom(e))throw f.atArg(`remove-watch expects an atom, got ${b(e)}`,{atomVal:e},0);const r=e;return r.watches&&r.watches.delete(b(n)),e}).doc("Removes a watch (set by add-watch) from an atom.",[["atom","key"]]),"set-validator!":a.nativeFnCtx("set-validator!",function(e,n,r,s){if(!u.atom(r))throw f.atArg(`set-validator! expects an atom, got ${b(r)}`,{atomVal:r},0);if(s.kind==="nil")return r.validator=void 0,a.nil();if(!u.aFunction(s))throw f.atArg(`set-validator! expects a function or nil, got ${b(s)}`,{fn:s},1);return r.validator=s,a.nil()}).doc("Sets the validator-fn for an atom. fn must be nil or a side-effect-free fn of one argument.",[["atom","fn"]])},nm={"hash-map":a.nativeFn("hash-map",function(...e){if(e.length===0)return a.map([]);if(e.length%2!==0)throw new f(`hash-map expects an even number of arguments, got ${e.length}`,{args:e});const n=[];for(let r=0;r<e.length;r+=2){const s=e[r],o=e[r+1];n.push([s,o])}return a.map(n)}).doc("Returns a new hash-map containing the given key-value pairs.",[["&","kvals"]]),assoc:a.nativeFn("assoc",function(e,...n){if(!e)throw new f("assoc expects a collection as first argument",{collection:e});if(u.nil(e)&&(e=a.map([])),u.list(e))throw new f("assoc on lists is not supported, use vectors instead",{collection:e});if(!u.collection(e))throw f.atArg(`assoc expects a collection, got ${b(e)}`,{collection:e},0);if(n.length<2)throw new f("assoc expects at least two arguments",{args:n});if(n.length%2!==0)throw new f("assoc expects an even number of binding arguments",{args:n});if(u.vector(e)){const r=[...e.value];for(let s=0;s<n.length;s+=2){const o=n[s];if(o.kind!=="number")throw f.atArg(`assoc on vectors expects each key argument to be a index (number), got ${b(o)}`,{index:o},s+1);if(o.value>r.length)throw f.atArg(`assoc index ${o.value} is out of bounds for vector of length ${r.length}`,{index:o,collection:e},s+1);r[o.value]=n[s+1]}return a.vector(r)}if(u.record(e)){const r=[...e.fields];for(let s=0;s<n.length;s+=2){const o=n[s],i=n[s+1],l=r.findIndex(([c])=>u.equal(c,o));l===-1?r.push([o,i]):r[l]=[o,i]}return a.map(r)}if(u.map(e)){const r=[...e.entries];for(let s=0;s<n.length;s+=2){const o=n[s],i=n[s+1],l=r.findIndex(function(d){return u.equal(d[0],o)});l===-1?r.push([o,i]):r[l]=[o,i]}return a.map(r)}throw new f(`unhandled collection type, got ${b(e)}`,{collection:e})}).doc("Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.",[["collection","&","kvals"]]),dissoc:a.nativeFn("dissoc",function(e,...n){if(!e)throw new f("dissoc expects a collection as first argument",{collection:e});if(u.list(e))throw f.atArg("dissoc on lists is not supported, use vectors instead",{collection:e},0);if(!u.collection(e))throw f.atArg(`dissoc expects a collection, got ${b(e)}`,{collection:e},0);if(u.vector(e)){if(e.value.length===0)return e;const r=[...e.value];for(let s=0;s<n.length;s+=1){const o=n[s];if(o.kind!=="number")throw f.atArg(`dissoc on vectors expects each key argument to be a index (number), got ${b(o)}`,{index:o},s+1);if(o.value>=r.length)throw f.atArg(`dissoc index ${o.value} is out of bounds for vector of length ${r.length}`,{index:o,collection:e},s+1);r.splice(o.value,1)}return a.vector(r)}if(u.record(e)){const r=[...e.fields];for(let s=0;s<n.length;s+=1){const o=n[s],i=r.findIndex(([l])=>u.equal(l,o));i!==-1&&r.splice(i,1)}return a.map(r)}if(u.map(e)){if(e.entries.length===0)return e;const r=[...e.entries];for(let s=0;s<n.length;s+=1){const o=n[s],i=r.findIndex(function(c){return u.equal(c[0],o)});i!==-1&&r.splice(i,1)}return a.map(r)}throw new f(`unhandled collection type, got ${b(e)}`,{collection:e})}).doc("Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.",[["collection","&","keys"]]),zipmap:a.nativeFn("zipmap",function(e,n){if(e===void 0||!u.seqable(e))throw new f(`zipmap expects a collection or string as first argument${e!==void 0?`, got ${b(e)}`:""}`,{ks:e});if(n===void 0||!u.seqable(n))throw new f(`zipmap expects a collection or string as second argument${n!==void 0?`, got ${b(n)}`:""}`,{vs:n});const r=X(e),s=X(n),o=Math.min(r.length,s.length),i=[];for(let l=0;l<o;l++)i.push([r[l],s[l]]);return a.map(i)}).doc("Returns a new map with the keys and values of the given collections.",[["ks","vs"]]),keys:a.nativeFn("keys",function(e){if(e===void 0||!u.map(e)&&!u.record(e))throw f.atArg(`keys expects a map or record${e!==void 0?`, got ${b(e)}`:""}`,{m:e},0);const n=u.record(e)?e.fields:e.entries;return a.vector(n.map(function([s]){return s}))}).doc("Returns a vector of the keys of the given map or record.",[["m"]]),vals:a.nativeFn("vals",function(e){if(e===void 0||!u.map(e)&&!u.record(e))throw f.atArg(`vals expects a map or record${e!==void 0?`, got ${b(e)}`:""}`,{m:e},0);const n=u.record(e)?e.fields:e.entries;return a.vector(n.map(function([,s]){return s}))}).doc("Returns a vector of the values of the given map or record.",[["m"]]),"hash-set":a.nativeFn("hash-set",function(...e){const n=[];for(const r of e)n.some(s=>u.equal(s,r))||n.push(r);return a.set(n)}).doc("Returns a set containing the given values.",[["&","xs"]]),set:a.nativeFn("set",function(e){if(e===void 0||e.kind==="nil")return a.set([]);const n=X(e),r=[];for(const s of n)r.some(o=>u.equal(o,s))||r.push(s);return a.set(r)}).doc("Returns a set of the distinct elements of the given collection.",[["coll"]]),"set?":a.nativeFn("set?",function(e){return a.boolean(e!==void 0&&e.kind==="set")}).doc("Returns true if x is a set.",[["x"]]),disj:a.nativeFn("disj",function(e,...n){if(e===void 0||e.kind==="nil")return a.set([]);if(e.kind!=="set")throw f.atArg(`disj expects a set, got ${b(e)}`,{s:e},0);const r=e.values.filter(s=>!n.some(o=>u.equal(o,s)));return a.set(r)}).doc("Returns a set with the given items removed.",[["s","&","items"]])},rm={list:a.nativeFn("list",function(...e){return e.length===0?a.list([]):a.list(e)}).doc("Returns a new list containing the given values.",[["&","args"]]),seq:a.nativeFn("seq",function t(e){if(e.kind==="nil")return a.nil();if(u.lazySeq(e)){const r=ge(e);return u.nil(r)?a.nil():t(r)}if(u.cons(e))return e;if(!u.seqable(e))throw f.atArg(`seq expects a collection, string, or nil, got ${b(e)}`,{collection:e},0);const n=X(e);return n.length===0?a.nil():a.list(n)}).doc("Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.",[["coll"]]),first:a.nativeFn("first",function t(e){if(e.kind==="nil")return a.nil();if(u.lazySeq(e)){const r=ge(e);return u.nil(r)?a.nil():t(r)}if(u.cons(e))return e.head;if(!u.seqable(e))throw f.atArg("first expects a collection or string",{collection:e},0);const n=X(e);return n.length===0?a.nil():n[0]}).doc("Returns the first element of the given collection or string.",[["coll"]]),rest:a.nativeFn("rest",function t(e){if(e.kind==="nil")return a.list([]);if(u.lazySeq(e)){const n=ge(e);return u.nil(n)?a.list([]):t(n)}if(u.cons(e))return e.tail;if(!u.seqable(e))throw f.atArg("rest expects a collection or string",{collection:e},0);if(u.list(e))return e.value.length===0?e:a.list(e.value.slice(1));if(u.vector(e))return a.vector(e.value.slice(1));if(u.map(e))return e.entries.length===0?e:a.map(e.entries.slice(1));if(e.kind==="string"){const n=X(e);return a.list(n.slice(1))}throw f.atArg(`rest expects a collection or string, got ${b(e)}`,{collection:e},0)}).doc("Returns a sequence of the given collection or string excluding the first element.",[["coll"]]),conj:a.nativeFn("conj",function(e,...n){if(!e)throw new f("conj expects a collection as first argument",{collection:e});if(n.length===0)return e;if(!u.collection(e))throw f.atArg(`conj expects a collection, got ${b(e)}`,{collection:e},0);if(u.list(e)){const r=[];for(let s=n.length-1;s>=0;s--)r.push(n[s]);return a.list([...r,...e.value])}if(u.vector(e))return a.vector([...e.value,...n]);if(u.map(e)){const r=[...e.entries];for(let s=0;s<n.length;s+=1){const o=n[s],i=s+1;if(o.kind!=="vector")throw f.atArg(`conj on maps expects each argument to be a vector key-pair for maps, got ${b(o)}`,{pair:o},i);if(o.value.length!==2)throw f.atArg(`conj on maps expects each argument to be a vector key-pair for maps, got ${b(o)}`,{pair:o},i);const l=o.value[0],c=r.findIndex(function(m){return u.equal(m[0],l)});c===-1?r.push([l,o.value[1]]):r[c]=[l,o.value[1]]}return a.map([...r])}if(u.set(e)){const r=[...e.values];for(const s of n)r.some(o=>u.equal(o,s))||r.push(s);return a.set(r)}throw new f(`unhandled collection type, got ${b(e)}`,{collection:e})}).doc("Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.",[["collection","&","args"]]),cons:a.nativeFn("cons",function(e,n){if(u.lazySeq(n)||u.cons(n))return a.cons(e,n);if(u.nil(n))return a.list([e]);if(!u.collection(n))throw f.atArg(`cons expects a collection as second argument, got ${b(n)}`,{xs:n},1);if(u.map(n)||u.set(n)||u.record(n))throw f.atArg("cons on maps, sets, and records is not supported, use vectors instead",{xs:n},1);const r=u.list(n)?a.list:a.vector,s=[e,...n.value];return r(s)}).doc("Returns a new collection with x prepended to the head of xs.",[["x","xs"]]),get:a.nativeFn("get",function(e,n,r){const s=r??a.nil();switch(e.kind){case y.map:{const o=e.entries;for(const[i,l]of o)if(u.equal(i,n))return l;return s}case y.record:{for(const[o,i]of e.fields)if(u.equal(o,n))return i;return s}case y.vector:{const o=e.value;if(n.kind!=="number")throw new f("get on vectors expects a 0-based index as parameter",{key:n});return n.value<0||n.value>=o.length?s:o[n.value]}default:return s}}).doc("Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.",[["target","key"],["target","key","not-found"]]),nth:a.nativeFn("nth",function(e,n,r){if(n===void 0||n.kind!=="number")throw new f(`nth expects a number index${n!==void 0?`, got ${b(n)}`:""}`,{n});const s=n.value;if(e===void 0||u.nil(e)){if(r!==void 0)return r;throw new f(`nth index ${s} is out of bounds for collection of length 0`,{coll:e,n})}if(u.lazySeq(e)||u.cons(e)){let i=e,l=0;for(;;){for(;u.lazySeq(i);)i=ge(i);if(u.nil(i)){if(r!==void 0)return r;const d=new f(`nth index ${s} is out of bounds`,{coll:e,n});throw d.data={argIndex:1},d}if(u.cons(i)){if(l===s)return i.head;i=i.tail,l++;continue}if(u.list(i)||u.vector(i)){const d=s-l,m=i.value;if(d<0||d>=m.length){if(r!==void 0)return r;const p=new f(`nth index ${s} is out of bounds for collection of length ${l+m.length}`,{coll:e,n});throw p.data={argIndex:1},p}return m[d]}if(r!==void 0)return r;const c=new f(`nth index ${s} is out of bounds`,{coll:e,n});throw c.data={argIndex:1},c}}if(!u.list(e)&&!u.vector(e))throw new f(`nth expects a list or vector, got ${b(e)}`,{coll:e});const o=e.value;if(s<0||s>=o.length){if(r!==void 0)return r;const i=new f(`nth index ${s} is out of bounds for collection of length ${o.length}`,{coll:e,n});throw i.data={argIndex:1},i}return o[s]}).doc("Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.",[["coll","n","not-found"]]),last:a.nativeFn("last",function(e){if(e===void 0||!u.list(e)&&!u.vector(e))throw new f(`last expects a list or vector${e!==void 0?`, got ${b(e)}`:""}`,{coll:e});const n=e.value;return n.length===0?a.nil():n[n.length-1]}).doc("Returns the last element of the given collection.",[["coll"]]),reverse:a.nativeFn("reverse",function(e){if(e===void 0||!u.list(e)&&!u.vector(e))throw f.atArg(`reverse expects a list or vector${e!==void 0?`, got ${b(e)}`:""}`,{coll:e},0);return a.list([...e.value].reverse())}).doc("Returns a new sequence with the elements of the given collection in reverse order.",[["coll"]]),"empty?":a.nativeFn("empty?",function(e){if(e===void 0)throw f.atArg("empty? expects one argument",{},0);if(e.kind==="nil")return a.boolean(!0);if(!u.seqable(e))throw f.atArg(`empty? expects a collection, string, or nil, got ${b(e)}`,{coll:e},0);return a.boolean(X(e).length===0)}).doc("Returns true if coll has no items. Accepts collections, strings, and nil.",[["coll"]]),"contains?":a.nativeFn("contains?",function(e,n){if(e===void 0)throw f.atArg("contains? expects a collection as first argument",{},0);if(n===void 0)throw f.atArg("contains? expects a key as second argument",{},1);if(e.kind==="nil")return a.boolean(!1);if(u.map(e))return a.boolean(e.entries.some(function([s]){return u.equal(s,n)}));if(u.record(e))return a.boolean(e.fields.some(([r])=>u.equal(r,n)));if(u.vector(e))return n.kind!=="number"?a.boolean(!1):a.boolean(n.value>=0&&n.value<e.value.length);if(u.set(e))return a.boolean(e.values.some(r=>u.equal(r,n)));throw f.atArg(`contains? expects a map, record, set, vector, or nil, got ${b(e)}`,{coll:e},0)}).doc("Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.",[["coll","key"]]),"repeat*":a.nativeFn("repeat*",function(e,n){if(e===void 0||e.kind!=="number")throw f.atArg(`repeat expects a number as first argument${e!==void 0?`, got ${b(e)}`:""}`,{n:e},0);return a.list(Array(e.value).fill(n))}).doc("Returns a finite sequence of n copies of x (native helper).",[["n","x"]]),"range*":a.nativeFn("range*",function(...e){if(e.length===0||e.length>3)throw new f("range expects 1, 2, or 3 arguments: (range n), (range start end), or (range start end step)",{args:e});const n=e.findIndex(function(c){return c.kind!=="number"});if(n!==-1)throw f.atArg("range expects number arguments",{args:e},n);let r,s,o;if(e.length===1?(r=0,s=e[0].value,o=1):e.length===2?(r=e[0].value,s=e[1].value,o=1):(r=e[0].value,s=e[1].value,o=e[2].value),o===0)throw f.atArg("range step cannot be zero",{args:e},e.length-1);const i=[];if(o>0)for(let l=r;l<s;l+=o)i.push(a.number(l));else for(let l=r;l>s;l+=o)i.push(a.number(l));return a.list(i)}).doc("Returns a finite sequence of numbers (native helper).",[["n"],["start","end"],["start","end","step"]]),"concat*":a.nativeFn("concat*",function(...e){const n=[];for(const r of e)if(!u.nil(r))if(u.list(r)||u.vector(r))n.push(...r.value);else if(u.cons(r)||u.lazySeq(r))n.push(...X(r));else if(u.set(r))n.push(...r.values);else throw new f(`concat* expects seqable arguments, got ${b(r)}`,{arg:r});return a.list(n)}).doc("Eagerly concatenates seqable collections into a list (quasiquote bootstrap helper).",[["&","colls"]]),count:a.nativeFn("count",function(e){if(e.kind==="nil")return a.number(0);if(u.lazySeq(e)||u.cons(e))return a.number(X(e).length);if(![y.list,y.vector,y.map,y.record,y.set,y.string].includes(e.kind))throw f.atArg(`count expects a countable value, got ${b(e)}`,{countable:e},0);switch(e.kind){case y.list:return a.number(e.value.length);case y.vector:return a.number(e.value.length);case y.map:return a.number(e.entries.length);case y.record:return a.number(e.fields.length);case y.set:return a.number(e.values.length);case y.string:return a.number(e.value.length);default:throw new f(`count expects a countable value, got ${b(e)}`,{countable:e})}}).doc("Returns the number of elements in the given countable value.",[["countable"]]),empty:a.nativeFn("empty",function(e){if(e===void 0||e.kind==="nil")return a.nil();switch(e.kind){case"list":return a.list([]);case"vector":return a.vector([]);case"map":return a.map([]);case"set":return a.set([]);default:return a.nil()}}).doc("Returns an empty collection of the same category as coll, or nil.",[["coll"]])},sm={vector:a.nativeFn("vector",function(...e){return e.length===0?a.vector([]):a.vector(e)}).doc("Returns a new vector containing the given values.",[["&","args"]]),vec:a.nativeFn("vec",function(e){if(e===void 0||e.kind==="nil")return a.vector([]);if(u.vector(e))return e;if(!u.seqable(e))throw f.atArg(`vec expects a collection or string, got ${b(e)}`,{coll:e},0);return a.vector(X(e))}).doc("Creates a new vector containing the contents of coll.",[["coll"]]),subvec:a.nativeFn("subvec",function(e,n,r){if(e===void 0||!u.vector(e))throw f.atArg(`subvec expects a vector, got ${b(e)}`,{v:e},0);if(n===void 0||n.kind!=="number")throw f.atArg("subvec expects a number start index",{start:n},1);const s=n.value,o=r!==void 0&&r.kind==="number"?r.value:e.value.length;if(s<0||o>e.value.length||s>o)throw new f(`subvec index out of bounds: start=${s}, end=${o}, length=${e.value.length}`,{v:e,start:n,end:r});return a.vector(e.value.slice(s,o))}).doc("Returns a persistent vector of the items in vector from start (inclusive) to end (exclusive).",[["v","start"],["v","start","end"]]),peek:a.nativeFn("peek",function(e){if(e===void 0||e.kind==="nil")return a.nil();if(u.vector(e))return e.value.length===0?a.nil():e.value[e.value.length-1];if(u.list(e))return e.value.length===0?a.nil():e.value[0];throw f.atArg(`peek expects a list or vector, got ${b(e)}`,{coll:e},0)}).doc("For a list, same as first. For a vector, same as last.",[["coll"]]),pop:a.nativeFn("pop",function(e){if(e===void 0||e.kind==="nil")throw f.atArg("Can't pop empty list",{coll:e},0);if(u.vector(e)){if(e.value.length===0)throw f.atArg("Can't pop empty vector",{coll:e},0);return a.vector(e.value.slice(0,-1))}if(u.list(e)){if(e.value.length===0)throw f.atArg("Can't pop empty list",{coll:e},0);return a.list(e.value.slice(1))}throw f.atArg(`pop expects a list or vector, got ${b(e)}`,{coll:e},0)}).doc("For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.",[["coll"]])},am={throw:a.nativeFn("throw",function(...e){throw e.length!==1?new f(`throw requires exactly 1 argument, got ${e.length}`,{args:e}):new Le(e[0])}).doc("Throws a value as an exception. The value may be any CljValue; maps are idiomatic.",[["value"]]),"ex-info":a.nativeFn("ex-info",function(...e){if(e.length<2)throw new f(`ex-info requires at least 2 arguments, got ${e.length}`,{args:e});const[n,r,s]=e;if(!u.string(n))throw new f("ex-info: first argument must be a string",{msg:n});const o=[[a.keyword(":message"),n],[a.keyword(":data"),r]];return s!==void 0&&o.push([a.keyword(":cause"),s]),a.map(o)}).doc("Creates an error map with :message and :data keys. Optionally accepts a :cause.",[["msg","data"],["msg","data","cause"]]),"ex-message":a.nativeFn("ex-message",function(...e){const[n]=e;if(!u.map(n))return a.nil();const r=n.entries.find(function([o]){return u.keyword(o)&&o.name===":message"});return r?r[1]:a.nil()}).doc("Returns the :message of an error map, or nil.",[["e"]]),"ex-data":a.nativeFn("ex-data",function(...e){const[n]=e;if(!u.map(n))return a.nil();const r=n.entries.find(function([o]){return u.keyword(o)&&o.name===":data"});return r?r[1]:a.nil()}).doc("Returns the :data map of an error map, or nil.",[["e"]]),"ex-cause":a.nativeFn("ex-cause",function(...e){const[n]=e;if(!u.map(n))return a.nil();const r=n.entries.find(function([o]){return u.keyword(o)&&o.name===":cause"});return r?r[1]:a.nil()}).doc("Returns the :cause of an error map, or nil.",[["e"]])},om={reduce:a.nativeFnCtx("reduce",function(e,n,r,...s){if(r===void 0||!u.aFunction(r))throw f.atArg(`reduce expects a function as first argument${r!==void 0?`, got ${b(r)}`:""}`,{fn:r},0);if(s.length===0||s.length>2)throw new f("reduce expects 2 or 3 arguments: (reduce f coll) or (reduce f init coll)",{fn:r});const o=s.length===2,i=o?s[0]:void 0,l=o?s[1]:s[0];if(l.kind==="nil"){if(!o)throw new f("reduce called on empty collection with no initial value",{fn:r});return i}if(!u.seqable(l))throw f.atArg(`reduce expects a collection or string, got ${b(l)}`,{collection:l},s.length);const c=X(l);if(!o){if(c.length===0)throw new f("reduce called on empty collection with no initial value",{fn:r});if(c.length===1)return c[0];let m=c[0];for(let p=1;p<c.length;p++){const h=e.applyFunction(r,[m,c[p]],n);if(u.reduced(h))return h.value;m=h}return m}let d=i;for(const m of c){const p=e.applyFunction(r,[d,m],n);if(u.reduced(p))return p.value;d=p}return d}).doc("Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).",[["f","coll"],["f","val","coll"]]),apply:a.nativeFnCtx("apply",(t,e,n,...r)=>{if(n===void 0||!u.callable(n))throw f.atArg(`apply expects a callable as first argument${n!==void 0?`, got ${b(n)}`:""}`,{fn:n},0);if(r.length===0)throw new f("apply expects at least 2 arguments",{fn:n});const s=r[r.length-1];if(!u.nil(s)&&!u.seqable(s))throw f.atArg(`apply expects a collection or string as last argument, got ${b(s)}`,{lastArg:s},r.length);const o=[...r.slice(0,-1),...u.nil(s)?[]:X(s)];return t.applyCallable(n,o,e)}).doc("Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.",[["f","args"],["f","&","args"]]),partial:a.nativeFn("partial",(t,...e)=>{if(t===void 0||!u.callable(t))throw f.atArg(`partial expects a callable as first argument${t!==void 0?`, got ${b(t)}`:""}`,{fn:t},0);const n=t;return a.nativeFnCtx("partial",(r,s,...o)=>r.applyCallable(n,[...e,...o],s))}).doc("Returns a function that calls f with pre-applied args prepended to any additional arguments.",[["f","&","args"]]),comp:a.nativeFn("comp",(...t)=>{if(t.length===0)return a.nativeFn("identity",r=>r);const e=t.findIndex(r=>!u.callable(r));if(e!==-1)throw f.atArg("comp expects functions or other callable values (keywords, maps)",{fns:t},e);const n=t;return a.nativeFnCtx("composed",(r,s,...o)=>{let i=r.applyCallable(n[n.length-1],o,s);for(let l=n.length-2;l>=0;l--)i=r.applyCallable(n[l],[i],s);return i})}).doc("Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and maps.",[[],["f"],["f","g"],["f","g","&","fns"]]),identity:a.nativeFn("identity",t=>{if(t===void 0)throw f.atArg("identity expects one argument",{},0);return t}).doc("Returns its single argument unchanged.",[["x"]])},im={meta:a.nativeFn("meta",function(e){if(e===void 0)throw f.atArg("meta expects one argument",{},0);return e.kind==="function"||e.kind==="native-function"||e.kind==="var"||e.kind==="list"||e.kind==="vector"||e.kind==="map"||e.kind==="symbol"||e.kind==="atom"?e.meta??a.nil():a.nil()}).doc("Returns the metadata map of a value, or nil if the value has no metadata.",[["val"]]),"with-meta":a.nativeFn("with-meta",function(e,n){if(e===void 0)throw f.atArg("with-meta expects two arguments",{},0);if(n===void 0)throw f.atArg("with-meta expects two arguments",{},1);if(n.kind!=="map"&&n.kind!=="nil")throw f.atArg(`with-meta expects a map as second argument, got ${b(n)}`,{m:n},1);if(!(e.kind==="function"||e.kind==="native-function"||e.kind==="list"||e.kind==="vector"||e.kind==="map"||e.kind==="symbol"))throw f.atArg(`with-meta does not support ${e.kind}, got ${b(e)}`,{val:e},0);const s=n.kind==="nil"?void 0:n;return{...e,meta:s}}).doc("Returns a new value with the metadata map m applied to val.",[["val","m"]]),"alter-meta!":a.nativeFnCtx("alter-meta!",function(e,n,r,s,...o){if(r===void 0)throw f.atArg("alter-meta! expects at least two arguments",{},0);if(s===void 0)throw f.atArg("alter-meta! expects at least two arguments",{},1);if(r.kind!=="var"&&r.kind!=="atom")throw f.atArg(`alter-meta! expects a Var or Atom as first argument, got ${r.kind}`,{},0);if(!u.aFunction(s))throw f.atArg(`alter-meta! expects a function as second argument, got ${s.kind}`,{},1);const i=r.meta??a.nil(),l=e.applyCallable(s,[i,...o],n);if(l.kind!=="map"&&l.kind!=="nil")throw new f(`alter-meta! function must return a map or nil, got ${l.kind}`,{});return r.meta=l.kind==="nil"?void 0:l,l}).doc("Applies f to ref's current metadata (with optional args), sets the result as the new metadata, and returns it.",[["ref","f","&","args"]])},lm={"nil?":a.nativeFn("nil?",function(e){return a.boolean(e.kind==="nil")}).doc("Returns true if the value is nil, false otherwise.",[["arg"]]),"true?":a.nativeFn("true?",function(e){return e.kind!=="boolean"?a.boolean(!1):a.boolean(e.value===!0)}).doc("Returns true if the value is a boolean and true, false otherwise.",[["arg"]]),"false?":a.nativeFn("false?",function(e){return e.kind!=="boolean"?a.boolean(!1):a.boolean(e.value===!1)}).doc("Returns true if the value is a boolean and false, false otherwise.",[["arg"]]),"truthy?":a.nativeFn("truthy?",function(e){return a.boolean(u.truthy(e))}).doc("Returns true if the value is not nil or false, false otherwise.",[["arg"]]),"falsy?":a.nativeFn("falsy?",function(e){return a.boolean(u.falsy(e))}).doc("Returns true if the value is nil or false, false otherwise.",[["arg"]]),"not=":a.nativeFn("not=",function(...e){if(e.length<2)throw new f("not= expects at least two arguments",{args:e});for(let n=1;n<e.length;n++)if(!u.equal(e[n],e[n-1]))return a.boolean(!0);return a.boolean(!1)}).doc("Returns true if any two adjacent arguments are not equal, false otherwise.",[["&","vals"]]),"char?":a.nativeFn("char?",function(e){return a.boolean(e!==void 0&&u.char(e))}).doc("Returns true if the value is a character, false otherwise.",[["x"]]),char:a.nativeFn("char",function(e){if(e===void 0||e.kind!=="number")throw new f(`char expects a number, got ${e!==void 0?b(e):"nothing"}`,{n:e});const n=Math.trunc(e.value);if(n<0||n>1114111)throw new f(`char: code point ${n} is out of Unicode range`,{n:e});return a.char(String.fromCodePoint(n))}).doc("Returns the character at the given Unicode code point.",[["n"]]),int:a.nativeFn("int",function(e){if(e===void 0)throw new f("int expects one argument",{});if(e.kind==="character")return a.number(e.value.codePointAt(0));if(e.kind==="number")return a.number(Math.trunc(e.value));throw new f(`int expects a number or character, got ${b(e)}`,{x:e})}).doc("Coerces x to int. For characters, returns the Unicode code point.",[["x"]]),"number?":a.nativeFn("number?",function(e){return a.boolean(e!==void 0&&e.kind==="number")}).doc("Returns true if the value is a number, false otherwise.",[["x"]]),"string?":a.nativeFn("string?",function(e){return a.boolean(e!==void 0&&u.string(e))}).doc("Returns true if the value is a string, false otherwise.",[["x"]]),"boolean?":a.nativeFn("boolean?",function(e){return a.boolean(e!==void 0&&e.kind==="boolean")}).doc("Returns true if the value is a boolean, false otherwise.",[["x"]]),"vector?":a.nativeFn("vector?",function(e){return a.boolean(e!==void 0&&u.vector(e))}).doc("Returns true if the value is a vector, false otherwise.",[["x"]]),"list?":a.nativeFn("list?",function(e){return a.boolean(e!==void 0&&u.list(e))}).doc("Returns true if the value is a list, false otherwise.",[["x"]]),"map?":a.nativeFn("map?",function(e){return a.boolean(e!==void 0&&u.map(e))}).doc("Returns true if the value is a map, false otherwise.",[["x"]]),"keyword?":a.nativeFn("keyword?",function(e){return a.boolean(e!==void 0&&u.keyword(e))}).doc("Returns true if the value is a keyword, false otherwise.",[["x"]]),"qualified-keyword?":a.nativeFn("qualified-keyword?",function(e){return a.boolean(e!==void 0&&u.keyword(e)&&e.name.includes("/"))}).doc("Returns true if the value is a qualified keyword, false otherwise.",[["x"]]),"symbol?":a.nativeFn("symbol?",function(e){return a.boolean(e!==void 0&&u.symbol(e))}).doc("Returns true if the value is a symbol, false otherwise.",[["x"]]),"namespace?":a.nativeFn("namespace?",function(e){return a.boolean(e!==void 0&&e.kind==="namespace")}).doc("Returns true if x is a namespace.",[["x"]]),"qualified-symbol?":a.nativeFn("qualified-symbol?",function(e){return a.boolean(e!==void 0&&u.symbol(e)&&e.name.includes("/"))}).doc("Returns true if the value is a qualified symbol, false otherwise.",[["x"]]),"ident?":a.nativeFn("ident?",function(e){return a.boolean(e!==void 0&&(u.keyword(e)||u.symbol(e)))}).doc("Returns true if x is a symbol or keyword.",[["x"]]),"simple-ident?":a.nativeFn("simple-ident?",function(e){return a.boolean(e!==void 0&&(u.keyword(e)&&!e.name.includes("/")||u.symbol(e)&&!e.name.includes("/")))}).doc("Returns true if x is a symbol or keyword with no namespace component.",[["x"]]),"qualified-ident?":a.nativeFn("qualified-ident?",function(e){return a.boolean(e!==void 0&&(u.keyword(e)&&e.name.includes("/")||u.symbol(e)&&e.name.includes("/")))}).doc("Returns true if x is a symbol or keyword with a namespace component.",[["x"]]),"simple-keyword?":a.nativeFn("simple-keyword?",function(e){return a.boolean(e!==void 0&&u.keyword(e)&&!e.name.includes("/"))}).doc("Returns true if x is a keyword with no namespace component.",[["x"]]),"simple-symbol?":a.nativeFn("simple-symbol?",function(e){return a.boolean(e!==void 0&&u.symbol(e)&&!e.name.includes("/"))}).doc("Returns true if x is a symbol with no namespace component.",[["x"]]),"fn?":a.nativeFn("fn?",function(e){return a.boolean(e!==void 0&&u.aFunction(e))}).doc("Returns true if the value is a function, false otherwise.",[["x"]]),"coll?":a.nativeFn("coll?",function(e){return a.boolean(e!==void 0&&u.collection(e))}).doc("Returns true if the value is a collection, false otherwise.",[["x"]]),some:a.nativeFnCtx("some",function(e,n,r,s){if(r===void 0||!u.callable(r))throw f.atArg(`some expects a callable as first argument${r!==void 0?`, got ${b(r)}`:""}`,{pred:r},0);if(s===void 0)return a.nil();if(!u.seqable(s))throw f.atArg(`some expects a collection or string as second argument, got ${b(s)}`,{coll:s},1);for(const o of X(s)){const i=e.applyCallable(r,[o],n);if(u.truthy(i))return i}return a.nil()}).doc("Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.",[["pred","coll"]]),"every?":a.nativeFnCtx("every?",function(e,n,r,s){if(r===void 0||!u.callable(r))throw f.atArg(`every? expects a callable as first argument${r!==void 0?`, got ${b(r)}`:""}`,{pred:r},0);if(s===void 0||!u.seqable(s))throw f.atArg(`every? expects a collection or string as second argument${s!==void 0?`, got ${b(s)}`:""}`,{coll:s},1);for(const o of X(s))if(u.falsy(e.applyCallable(r,[o],n)))return a.boolean(!1);return a.boolean(!0)}).doc("Returns true if all items in coll satisfy pred, false otherwise.",[["pred","coll"]]),"identical?":a.nativeFn("identical?",function(e,n){return a.boolean(e===n)}).doc("Tests if 2 arguments are the same object (reference equality).",[["x","y"]]),"seqable?":a.nativeFn("seqable?",function(e){return a.boolean(e!==void 0&&u.seqable(e))}).doc("Return true if the seq function is supported for x.",[["x"]]),"sequential?":a.nativeFn("sequential?",function(e){return a.boolean(e!==void 0&&(u.list(e)||u.vector(e)))}).doc("Returns true if coll is a sequential collection (list or vector).",[["coll"]]),"associative?":a.nativeFn("associative?",function(e){return a.boolean(e!==void 0&&(u.map(e)||u.vector(e)))}).doc("Returns true if coll implements Associative (map or vector).",[["coll"]]),"counted?":a.nativeFn("counted?",function(e){return a.boolean(e!==void 0&&(u.list(e)||u.vector(e)||u.map(e)||e.kind==="set"||u.string(e)))}).doc("Returns true if coll implements count in constant time.",[["coll"]]),"int?":a.nativeFn("int?",function(e){return a.boolean(e!==void 0&&e.kind==="number"&&Number.isInteger(e.value))}).doc("Return true if x is a fixed precision integer.",[["x"]]),"pos-int?":a.nativeFn("pos-int?",function(e){return a.boolean(e!==void 0&&e.kind==="number"&&Number.isInteger(e.value)&&e.value>0)}).doc("Return true if x is a positive fixed precision integer.",[["x"]]),"neg-int?":a.nativeFn("neg-int?",function(e){return a.boolean(e!==void 0&&e.kind==="number"&&Number.isInteger(e.value)&&e.value<0)}).doc("Return true if x is a negative fixed precision integer.",[["x"]]),"nat-int?":a.nativeFn("nat-int?",function(e){return a.boolean(e!==void 0&&e.kind==="number"&&Number.isInteger(e.value)&&e.value>=0)}).doc("Return true if x is a non-negative fixed precision integer.",[["x"]]),"double?":a.nativeFn("double?",function(e){return a.boolean(e!==void 0&&e.kind==="number")}).doc("Return true if x is a Double (all numbers in JS are doubles).",[["x"]]),"NaN?":a.nativeFn("NaN?",function(e){return a.boolean(e!==void 0&&e.kind==="number"&&isNaN(e.value))}).doc("Returns true if num is NaN, else false.",[["num"]]),"infinite?":a.nativeFn("infinite?",function(e){return a.boolean(e!==void 0&&e.kind==="number"&&!isFinite(e.value)&&!isNaN(e.value))}).doc("Returns true if num is positive or negative infinity, else false.",[["num"]]),compare:a.nativeFn("compare",function(e,n){if(u.nil(e)&&u.nil(n))return a.number(0);if(u.nil(e))return a.number(-1);if(u.nil(n))return a.number(1);if(u.number(e)&&u.number(n)||u.string(e)&&u.string(n)||u.char(e)&&u.char(n))return a.number(e.value<n.value?-1:e.value>n.value?1:0);if(u.keyword(e)&&u.keyword(n))return a.number(e.name<n.name?-1:e.name>n.name?1:0);throw new f(`compare: cannot compare ${b(e)} to ${b(n)}`,{x:e,y:n})}).doc("Comparator. Returns a negative number, zero, or a positive number.",[["x","y"]]),hash:a.nativeFn("hash",function(e){const n=b(e);let r=0;for(let s=0;s<n.length;s++)r=Math.imul(31,r)+n.charCodeAt(s)|0;return a.number(r)}).doc("Returns the hash code of its argument.",[["x"]])};function cm(t){let e=t,n="";const r=/^\(\?([imsx]+)\)/;let s;for(;(s=r.exec(e))!==null;){for(const o of s[1]){if(o==="x")throw new f("Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported",{});n.includes(o)||(n+=o)}e=e.slice(s[0].length)}return{pattern:e,flags:n}}function on(t,e){if(!u.regex(t))throw new f(`${e} expects a regex as first argument, got ${b(t)}`,{val:t});return t}function ln(t,e){if(t.kind!=="string")throw new f(`${e} expects a string as second argument, got ${b(t)}`,{val:t});return t.value}function cn(t){return t.length===1?a.string(t[0]):a.vector(t.map(function(n){return n==null?a.nil():a.string(n)}))}const um={"regexp?":a.nativeFn("regexp?",function(e){return a.boolean(e!==void 0&&u.regex(e))}).doc("Returns true if x is a regular expression pattern.",[["x"]]),"re-pattern":a.nativeFn("re-pattern",function(e){if(e===void 0||e.kind!=="string")throw new f(`re-pattern expects a string argument${e!==void 0?`, got ${b(e)}`:""}`,{s:e});const{pattern:n,flags:r}=cm(e.value);return a.regex(n,r)}).doc(`Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.
  (re-pattern "\\\\d+") produces the same pattern as #"\\d+".`,[["s"]]),"re-find":a.nativeFn("re-find",function(e,n){const r=on(e,"re-find"),s=ln(n,"re-find"),i=new RegExp(r.pattern,r.flags).exec(s);return i?cn(i):a.nil()}).doc(`Returns the next regex match, if any, of string to pattern, using
  java.util.regex.Matcher.find(). Returns the match or nil. When there
  are groups, returns a vector of the whole match and groups (nil for
  unmatched optional groups).`,[["re","s"]]),"re-matches":a.nativeFn("re-matches",function(e,n){const r=on(e,"re-matches"),s=ln(n,"re-matches"),i=new RegExp(r.pattern,r.flags).exec(s);return!i||i.index!==0||i[0].length!==s.length?a.nil():cn(i)}).doc(`Returns the match, if any, of string to pattern, using
  java.util.regex.Matcher.matches(). The entire string must match.
  Returns the match or nil. When there are groups, returns a vector
  of the whole match and groups (nil for unmatched optional groups).`,[["re","s"]]),"re-seq":a.nativeFn("re-seq",function(e,n){const r=on(e,"re-seq"),s=ln(n,"re-seq"),o=new RegExp(r.pattern,r.flags+"g"),i=[];let l;for(;(l=o.exec(s))!==null;){if(l[0].length===0){o.lastIndex++;continue}i.push(cn(l))}return i.length===0?a.nil():{kind:"list",value:i}}).doc(`Returns a lazy sequence of successive matches of pattern in string,
  using java.util.regex.Matcher.find(), each such match processed with
  re-groups.`,[["re","s"]]),"str-split*":a.nativeFn("str-split*",function(e,n,r){if(e===void 0||e.kind!=="string")throw new f(`str-split* expects a string as first argument${e!==void 0?`, got ${b(e)}`:""}`,{sVal:e});const s=e.value,i=r!==void 0&&r.kind!=="nil"&&r.kind==="number"?r.value:void 0;let l,c;if(n.kind!=="regex")throw new f(`str-split* expects a regex pattern as second argument, got ${b(n)}`,{sepVal:n});if(n.pattern===""){const p=[...s];if(i===void 0||i>=p.length)return a.vector(p.map(a.string));const h=[...p.slice(0,i-1),p.slice(i-1).join("")];return a.vector(h.map(function(w){return a.string(w)}))}l=n.pattern,c=n.flags;const d=new RegExp(l,c+"g"),m=dm(s,d,i);return a.vector(m.map(function(h){return a.string(h)}))}).doc(`Internal helper for clojure.string/split. Splits string s by a regex or
  string separator. Optional limit keeps all parts when provided.`,[["s","sep"],["s","sep","limit"]])};function dm(t,e,n){const r=[];let s=0,o,i=0;for(;(o=e.exec(t))!==null;){if(o[0].length===0){e.lastIndex++;continue}if(n!==void 0&&i>=n-1)break;r.push(t.slice(s,o.index)),s=o.index+o[0].length,i++}if(r.push(t.slice(s)),n===void 0)for(;r.length>0&&r[r.length-1]==="";)r.pop();return r}function me(t,e){if(t===void 0||t.kind!=="string")throw new f(`${e} expects a string as first argument${t!==void 0?`, got ${b(t)}`:""}`,{val:t});return t.value}function wt(t,e,n){if(t===void 0||t.kind!=="string")throw new f(`${n} expects a string as ${e} argument${t!==void 0?`, got ${b(t)}`:""}`,{val:t});return t.value}function fm(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function mm(t){return t.replace(/\$/g,"$$$$")}function pm(t,e){let n=-1;for(let s=e.length-1;s>=0;s--)if(typeof e[s]=="number"){n=s;break}const r=n>0?e.slice(0,n):[];return r.length===0?a.string(t):a.vector([a.string(t),...r.map(function(o){return o==null?a.nil():a.string(String(o))})])}function ar(t,e,n,r,s,o,i){const l=me(r,n);if(s===void 0||o===void 0)throw new f(`${n} expects 3 arguments`,{});if(s.kind==="string"){if(o.kind!=="string")throw new f(`${n}: when match is a string, replacement must also be a string, got ${b(o)}`,{replVal:o});const c=new RegExp(fm(s.value),i?"g":"");return a.string(l.replace(c,mm(o.value)))}if(s.kind==="regex"){const c=s,d=i?c.flags+"g":c.flags,m=new RegExp(c.pattern,d);if(o.kind==="string")return a.string(l.replace(m,o.value));if(u.aFunction(o)){const p=o,h=l.replace(m,function(w,...k){const S=pm(w,k),I=t.applyFunction(p,[S],e);return Y(I)});return a.string(h)}throw new f(`${n}: replacement must be a string or function, got ${b(o)}`,{replVal:o})}throw new f(`${n}: match must be a string or regex, got ${b(s)}`,{matchVal:s})}const hm={"str-upper-case*":a.nativeFn("str-upper-case*",function(e){return a.string(me(e,"str-upper-case*").toUpperCase())}).doc("Internal helper. Converts s to upper-case.",[["s"]]),"str-lower-case*":a.nativeFn("str-lower-case*",function(e){return a.string(me(e,"str-lower-case*").toLowerCase())}).doc("Internal helper. Converts s to lower-case.",[["s"]]),"str-trim*":a.nativeFn("str-trim*",function(e){return a.string(me(e,"str-trim*").trim())}).doc("Internal helper. Removes whitespace from both ends of s.",[["s"]]),"str-triml*":a.nativeFn("str-triml*",function(e){return a.string(me(e,"str-triml*").trimStart())}).doc("Internal helper. Removes whitespace from the left of s.",[["s"]]),"str-trimr*":a.nativeFn("str-trimr*",function(e){return a.string(me(e,"str-trimr*").trimEnd())}).doc("Internal helper. Removes whitespace from the right of s.",[["s"]]),"str-reverse*":a.nativeFn("str-reverse*",function(e){return a.string([...me(e,"str-reverse*")].reverse().join(""))}).doc("Internal helper. Returns s with its characters reversed (Unicode-safe).",[["s"]]),"str-starts-with*":a.nativeFn("str-starts-with*",function(e,n){const r=me(e,"str-starts-with*"),s=wt(n,"second","str-starts-with*");return a.boolean(r.startsWith(s))}).doc("Internal helper. Returns true if s starts with substr.",[["s","substr"]]),"str-ends-with*":a.nativeFn("str-ends-with*",function(e,n){const r=me(e,"str-ends-with*"),s=wt(n,"second","str-ends-with*");return a.boolean(r.endsWith(s))}).doc("Internal helper. Returns true if s ends with substr.",[["s","substr"]]),"str-includes*":a.nativeFn("str-includes*",function(e,n){const r=me(e,"str-includes*"),s=wt(n,"second","str-includes*");return a.boolean(r.includes(s))}).doc("Internal helper. Returns true if s contains substr.",[["s","substr"]]),"str-index-of*":a.nativeFn("str-index-of*",function(e,n,r){const s=me(e,"str-index-of*"),o=wt(n,"second","str-index-of*");let i;if(r!==void 0&&r.kind!=="nil"){if(r.kind!=="number")throw new f(`str-index-of* expects a number as third argument, got ${b(r)}`,{fromVal:r});i=s.indexOf(o,r.value)}else i=s.indexOf(o);return i===-1?a.nil():a.number(i)}).doc("Internal helper. Returns index of value in s, or nil if not found.",[["s","value"],["s","value","from-index"]]),"str-last-index-of*":a.nativeFn("str-last-index-of*",function(e,n,r){const s=me(e,"str-last-index-of*"),o=wt(n,"second","str-last-index-of*");let i;if(r!==void 0&&r.kind!=="nil"){if(r.kind!=="number")throw new f(`str-last-index-of* expects a number as third argument, got ${b(r)}`,{fromVal:r});i=s.lastIndexOf(o,r.value)}else i=s.lastIndexOf(o);return i===-1?a.nil():a.number(i)}).doc("Internal helper. Returns last index of value in s, or nil if not found.",[["s","value"],["s","value","from-index"]]),"str-replace*":a.nativeFnCtx("str-replace*",function(e,n,r,s,o){return ar(e,n,"str-replace*",r,s,o,!0)}).doc("Internal helper. Replaces all occurrences of match with replacement in s.",[["s","match","replacement"]]),"str-replace-first*":a.nativeFnCtx("str-replace-first*",function(e,n,r,s,o){return ar(e,n,"str-replace-first*",r,s,o,!1)}).doc("Internal helper. Replaces the first occurrence of match with replacement in s.",[["s","match","replacement"]])},gm={reduced:a.nativeFn("reduced",function(e){if(e===void 0)throw new f("reduced expects one argument",{});return a.reduced(e)}).doc("Returns a reduced value, indicating termination of the reduction process.",[["value"]]),"reduced?":a.nativeFn("reduced?",function(e){if(e===void 0)throw new f("reduced? expects one argument",{});return a.boolean(u.reduced(e))}).doc("Returns true if the given value is a reduced value, false otherwise.",[["value"]]),unreduced:a.nativeFn("unreduced",function(e){if(e===void 0)throw new f("unreduced expects one argument",{});return u.reduced(e)?e.value:e}).doc("Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.",[["value"]]),"ensure-reduced":a.nativeFn("ensure-reduced",function(e){if(e===void 0)throw new f("ensure-reduced expects one argument",{});return u.reduced(e)?e:a.reduced(e)}).doc("Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.",[["value"]]),"volatile!":a.nativeFn("volatile!",function(e){if(e===void 0)throw new f("volatile! expects one argument",{});return a.volatile(e)}).doc("Returns a volatile value with the given value as its value.",[["value"]]),"volatile?":a.nativeFn("volatile?",function(e){if(e===void 0)throw new f("volatile? expects one argument",{});return a.boolean(u.volatile(e))}).doc("Returns true if the given value is a volatile value, false otherwise.",[["value"]]),"vreset!":a.nativeFn("vreset!",function(e,n){if(!u.volatile(e))throw new f(`vreset! expects a volatile as its first argument, got ${b(e)}`,{vol:e});if(n===void 0)throw new f("vreset! expects two arguments",{vol:e});return e.value=n,n}).doc("Resets the value of the given volatile to the given new value and returns the new value.",[["vol","newVal"]]),"vswap!":a.nativeFnCtx("vswap!",function(e,n,r,s,...o){if(!u.volatile(r))throw new f(`vswap! expects a volatile as its first argument, got ${b(r)}`,{vol:r});if(!u.aFunction(s))throw new f(`vswap! expects a function as its second argument, got ${b(s)}`,{fn:s});const i=e.applyFunction(s,[r.value,...o],n);return r.value=i,i}).doc("Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.",[["vol","fn"],["vol","fn","&","extraArgs"]]),transduce:a.nativeFnCtx("transduce",function(e,n,r,s,o,i){if(!u.aFunction(r))throw new f(`transduce expects a transducer (function) as first argument, got ${b(r)}`,{xf:r});if(!u.aFunction(s))throw new f(`transduce expects a reducing function as second argument, got ${b(s)}`,{f:s});if(o===void 0)throw new f("transduce expects 3 or 4 arguments: (transduce xf f coll) or (transduce xf f init coll)",{});let l,c;i===void 0?(c=o,l=e.applyFunction(s,[],n)):(l=o,c=i);const d=e.applyFunction(r,[s],n);if(u.nil(c))return e.applyFunction(d,[l],n);if(!u.seqable(c))throw new f(`transduce expects a collection or string as ${i===void 0?"third":"fourth"} argument, got ${b(c)}`,{coll:c});const m=X(c);let p=l;for(const h of m){const g=e.applyFunction(d,[p,h],n);if(u.reduced(g)){p=g.value;break}p=g}return e.applyFunction(d,[p],n)}).doc(Mt(["reduce with a transformation of f (xf). If init is not","supplied, (f) will be called to produce it. f should be a reducing","step function that accepts both 1 and 2 arguments, if it accepts","only 2 you can add the arity-1 with 'completing'. Returns the result","of applying (the transformed) xf to init and the first item in coll,","then applying xf to that result and the 2nd item, etc. If coll","contains no items, returns init and f is not called. Note that","certain transforms may inject or skip items."]),[["xform","f","coll"],["xform","f","init","coll"]])};function or(t,e,n){var s;const r=t.indexOf("/");if(r>0&&r<t.length-1){const o=t.slice(0,r),i=t.slice(r+1),c=((s=de(e).ns)==null?void 0:s.aliases.get(o))??n.resolveNs(o)??null;if(!c)return;const d=c.vars.get(i);return d!==void 0?ye(d):void 0}return Ht(t,e)}const vm={str:a.nativeFn("str",function(...e){return a.string(e.map(n=>n.kind==="nil"?"":Y(n)).join(""))}).doc("Returns a concatenated string representation of the given values.",[["&","args"]]),subs:a.nativeFn("subs",function(e,n,r){if(e===void 0||e.kind!=="string")throw f.atArg(`subs expects a string as first argument${e!==void 0?`, got ${b(e)}`:""}`,{s:e},0);if(n===void 0||n.kind!=="number")throw f.atArg(`subs expects a number as second argument${n!==void 0?`, got ${b(n)}`:""}`,{start:n},1);if(r!==void 0&&r.kind!=="number")throw f.atArg(`subs expects a number as optional third argument${r!==void 0?`, got ${b(r)}`:""}`,{end:r},2);const s=n.value,o=r==null?void 0:r.value;return a.string(o===void 0?e.value.slice(s):e.value.slice(s,o))}).doc("Returns the substring of s beginning at start, and optionally ending before end.",[["s","start"],["s","start","end"]]),type:a.nativeFn("type",function(e){if(e===void 0)throw new f("type expects an argument",{x:e});if(e.kind==="record")return a.keyword(`:${e.ns}/${e.recordType}`);const r={number:":number",string:":string",boolean:":boolean",nil:":nil",keyword:":keyword",symbol:":symbol",char:":char",list:":list",vector:":vector",map:":map",set:":set",function:":function","native-function":":function",macro:":macro","multi-method":":multimethod",regex:":regex",var:":var",delay:":delay","lazy-seq":":lazy-seq",cons:":cons",atom:":atom",namespace:":namespace",protocol:":protocol",pending:":pending","js-value":":js-value"}[e.kind];if(!r)throw new f(`type: unhandled kind ${e.kind}`,{x:e});return a.keyword(r)}).doc("Returns a keyword representing the type of a value. Records return :ns/RecordType; built-ins return :string, :number, :nil, etc.",[["x"]]),gensym:a.nativeFn("gensym",function(...e){if(e.length>1)throw new f("gensym takes 0 or 1 arguments",{args:e});const n=e[0];if(n!==void 0&&n.kind!=="string")throw f.atArg(`gensym prefix must be a string${n!==void 0?`, got ${b(n)}`:""}`,{prefix:n},0);const r=(n==null?void 0:n.kind)==="string"?n.value:"G";return a.symbol(ns(r))}).doc('Returns a unique symbol with the given prefix. Defaults to "G" if no prefix is provided.',[[],["prefix"]]),eval:a.nativeFnCtx("eval",function(e,n,r){if(r===void 0)throw new f("eval expects a form as argument",{form:r});const s=e.expandAll(r,n);return e.evaluate(s,n)}).doc("Evaluates the given form in the global environment and returns the result.",[["form"]]),"macroexpand-1":a.nativeFnCtx("macroexpand-1",function(e,n,r){if(!u.list(r)||r.value.length===0)return r;const s=r.value[0];if(!u.symbol(s))return r;const o=or(s.name,n,e);return o===void 0||!u.macro(o)?r:e.applyMacro(o,r.value.slice(1))}).doc("If the head of the form is a macro, expands it and returns the resulting forms. Otherwise, returns the form unchanged.",[["form"]]),macroexpand:a.nativeFnCtx("macroexpand",function(e,n,r){let s=r;for(;;){if(!u.list(s)||s.value.length===0)return s;const o=s.value[0];if(!u.symbol(o))return s;const i=or(o.name,n,e);if(i===void 0||!u.macro(i))return s;s=e.applyMacro(i,s.value.slice(1))}}).doc(Mt(["Expands all macros until the expansion is stable (head is no longer a macro)","","Note neither macroexpand-1 nor macroexpand will expand macros in sub-forms"]),[["form"]]),"macroexpand-all":a.nativeFnCtx("macroexpand-all",function(e,n,r){return e.expandAll(r,n)}).doc(Mt(["Fully expands all macros in a form recursively — including in sub-forms.","","Unlike macroexpand, this descends into every sub-expression.","Expansion stops at quote/quasiquote boundaries and fn/loop bodies."]),[["form"]]),namespace:a.nativeFn("namespace",function(e){if(e===void 0)throw f.atArg("namespace expects an argument",{x:e},0);let n;if(u.keyword(e))n=e.name.slice(1);else if(u.symbol(e))n=e.name;else throw f.atArg(`namespace expects a keyword or symbol, got ${b(e)}`,{x:e},0);const r=n.indexOf("/");return r<=0?a.nil():a.string(n.slice(0,r))}).doc("Returns the namespace string of a qualified keyword or symbol, or nil if the argument is not qualified.",[["x"]]),name:a.nativeFn("name",function(e){if(e===void 0)throw f.atArg("name expects an argument",{x:e},0);let n;if(u.keyword(e))n=e.name.slice(1);else if(u.symbol(e))n=e.name;else{if(e.kind==="string")return e;throw f.atArg(`name expects a keyword, symbol, or string, got ${b(e)}`,{x:e},0)}const r=n.indexOf("/");return a.string(r>=0?n.slice(r+1):n)}).doc("Returns the local name of a qualified keyword or symbol, or the string value if the argument is a string.",[["x"]]),keyword:a.nativeFn("keyword",function(...e){if(e.length===0||e.length>2)throw new f("keyword expects 1 or 2 string arguments",{args:e});if(e[0].kind!=="string")throw f.atArg(`keyword expects a string, got ${b(e[0])}`,{args:e},0);if(e.length===1)return a.keyword(`:${e[0].value}`);if(e[1].kind!=="string")throw f.atArg(`keyword second argument must be a string, got ${b(e[1])}`,{args:e},1);return a.keyword(`:${e[0].value}/${e[1].value}`)}).doc(Mt(["Constructs a keyword with the given name and namespace strings. Returns a keyword value.","","Note: do not use : in the keyword strings, it will be added automatically.",'e.g. (keyword "foo") => :foo']),[["name"],["ns","name"]]),boolean:a.nativeFn("boolean",function(e){return e===void 0?a.boolean(!1):a.boolean(u.truthy(e))}).doc("Coerces to boolean. Everything is true except false and nil.",[["x"]]),"clojure-version":a.nativeFn("clojure-version",function(){return a.string("1.12.0")}).doc("Returns a string describing the current Clojure version.",[[]]),"pr-str":a.nativeFnCtx("pr-str",function(e,n,...r){return Fe(je(e),()=>a.string(r.map(b).join(" ")))}).doc("Returns a readable string representation of the given values (strings are quoted).",[["&","args"]]),"pretty-print-str":a.nativeFnCtx("pretty-print-str",function(e,n,...r){if(r.length===0)return a.string("");const s=r[0],o=r[1],i=o!==void 0&&o.kind==="number"?o.value:80;return Fe(je(e),()=>a.string(Kr(s,i)))}).doc("Returns a pretty-printed string representation of form.",[["form"],["form","max-width"]]),"read-string":a.nativeFn("read-string",function(e){if(e===void 0||e.kind!=="string")throw f.atArg(`read-string expects a string${e!==void 0?`, got ${b(e)}`:""}`,{s:e},0);const n=ft(e.value),r=Ut(n);return r.length===0?a.nil():r[0]}).doc("Reads one object from the string s. Returns nil if string is empty.",[["s"]]),"prn-str":a.nativeFnCtx("prn-str",function(e,n,...r){return Fe(je(e),()=>a.string(r.map(b).join(" ")+`
`))}).doc("pr-str to a string, followed by a newline.",[["&","args"]]),"print-str":a.nativeFnCtx("print-str",function(e,n,...r){return Fe(je(e),()=>a.string(r.map(Y).join(" ")))}).doc("print to a string (human-readable, no quotes on strings).",[["&","args"]]),"println-str":a.nativeFn("println-str",function(...e){return a.string(e.map(Y).join(" ")+`
`)}).doc("println to a string.",[["&","args"]]),symbol:a.nativeFn("symbol",function(...e){if(e.length===0||e.length>2)throw new f("symbol expects 1 or 2 string arguments",{args:e});if(e.length===1){if(u.symbol(e[0]))return e[0];if(e[0].kind!=="string")throw f.atArg(`symbol expects a string, got ${b(e[0])}`,{args:e},0);return a.symbol(e[0].value)}if(e[0].kind!=="string"||e[1].kind!=="string")throw new f("symbol expects string arguments",{args:e});return a.symbol(`${e[0].value}/${e[1].value}`)}).doc("Returns a Symbol with the given namespace and name.",[["name"],["ns","name"]]),"parse-long":a.nativeFn("parse-long",function(e){if(e===void 0||e.kind!=="string")throw f.atArg(`parse-long expects a string${e!==void 0?`, got ${b(e)}`:""}`,{s:e},0);if(!/^[+-]?\d+$/.test(e.value))return a.nil();const n=Number.parseInt(e.value,10);return Number.isFinite(n)?a.number(n):a.nil()}).doc("Parses string s as a long integer. Returns nil if s is not a valid integer string.",[["s"]]),"parse-double":a.nativeFn("parse-double",function(e){if(e===void 0||e.kind!=="string")throw f.atArg(`parse-double expects a string${e!==void 0?`, got ${b(e)}`:""}`,{s:e},0);const n=e.value.trim();if(n==="")return a.nil();const r=Number(n);return Number.isNaN(r)&&n!=="NaN"?a.nil():a.number(r)}).doc("Parses string s as a double. Returns nil if s is not a valid number string.",[["s"]]),"parse-boolean":a.nativeFn("parse-boolean",function(e){if(e===void 0||e.kind!=="string")throw f.atArg(`parse-boolean expects a string${e!==void 0?`, got ${b(e)}`:""}`,{s:e},0);return e.value==="true"?a.boolean(!0):e.value==="false"?a.boolean(!1):a.nil()}).doc('Parses string s as a boolean. Returns true for "true", false for "false", nil for anything else.',[["s"]])},ym={force:a.nativeFn("force",function(e){return u.delay(e)?Qr(e):u.lazySeq(e)?ge(e):e}).doc("If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.",[["x"]]),"delay?":a.nativeFn("delay?",function(e){return a.boolean(u.delay(e))}).doc("Returns true if x is a Delay.",[["x"]]),"lazy-seq?":a.nativeFn("lazy-seq?",function(e){return a.boolean(u.lazySeq(e))}).doc("Returns true if x is a LazySeq.",[["x"]]),"realized?":a.nativeFn("realized?",function(e){return u.delay(e)||u.lazySeq(e)?a.boolean(e.realized):a.boolean(!1)}).doc("Returns true if a Delay or LazySeq has been realized.",[["x"]]),"make-delay":a.nativeFnCtx("make-delay",function(e,n,r){if(!u.aFunction(r))throw new f(`make-delay: argument must be a function, got ${r.kind}`,{fn:r});return a.delay(()=>e.applyCallable(r,[],n))}).doc("Creates a Delay that invokes thunk-fn (a zero-arg function) on first force.",[["thunk-fn"]])},bm={"var?":a.nativeFn("var?",function(e){return a.boolean(u.var(e))}).doc("Returns true if x is a Var.",[["x"]]),"var-get":a.nativeFn("var-get",function(e){if(!u.var(e))throw new f(`var-get expects a Var, got ${e.kind}`,{x:e});return e.value}).doc("Returns the value in the Var object.",[["x"]]),"alter-var-root":a.nativeFnCtx("alter-var-root",function(e,n,r,s,...o){if(!u.var(r))throw new f(`alter-var-root expects a Var as its first argument, got ${r.kind}`,{varVal:r});if(!u.aFunction(s))throw new f(`alter-var-root expects a function as its second argument, got ${s.kind}`,{f:s});const i=e.applyFunction(s,[r.value,...o],n);return r.value=i,i}).doc("Atomically alters the root binding of var v by applying f to its current value plus any additional args.",[["v","f","&","args"]])};function wm(t){return a.nativeFn(`kw:${t.name}`,(...e)=>{const n=e[0];if(!u.map(n))return a.nil();const r=n.entries.find(([s])=>u.equal(s,t));return r?r[1]:a.nil()})}const km={"multimethod?":a.nativeFn("multimethod?",function(e){return a.boolean(u.multiMethod(e))}).doc("Returns true if x is a multimethod.",[["x"]]),"make-multimethod!":a.nativeFnCtx("make-multimethod!",function(e,n,r,s,...o){if(!u.string(r))throw new f(`make-multimethod!: first argument must be a string, got ${r.kind}`,{nameVal:r});const i=r.value,l=de(n),c=l.ns.vars.get(i);if(c&&u.multiMethod(c.value))return a.nil();let d;if(u.keyword(s))d=wm(s);else if(u.aFunction(s))d=s;else throw new f(`make-multimethod!: dispatch-fn must be a function or keyword, got ${s.kind}`,{dispatchFnVal:s});let m;for(let h=0;h+1<o.length;h+=2)u.keyword(o[h])&&o[h].name===":default"&&(m=o[h+1]);const p=a.multiMethod(i,d,[],void 0,m);return K(i,p,l),a.nil()}).doc("Creates a multimethod with the given name and dispatch-fn in the current namespace. Accepts optional :default <sentinel-val> to customize the fallback sentinel. No-op if already a multimethod (re-eval safe).",[["name","dispatch-fn","& opts"]]),"add-method!":a.nativeFnCtx("add-method!",function(e,n,r,s,o){if(!u.var(r))throw new f(`add-method!: first argument must be a Var, got ${r.kind}`,{varVal:r});if(!u.multiMethod(r.value))throw new f(`add-method!: ${r.name} is not a multimethod`,{varVal:r});if(!u.aFunction(o))throw new f(`add-method!: method must be a function, got ${o.kind}`,{methodFn:o});const i=r.value,l=i.defaultDispatchVal??a.keyword(":default"),c=u.equal(s,l);let d;if(c)d=a.multiMethod(i.name,i.dispatchFn,i.methods,o,i.defaultDispatchVal);else{const m=i.methods.filter(p=>!u.equal(p.dispatchVal,s));d=a.multiMethod(i.name,i.dispatchFn,[...m,{dispatchVal:s,fn:o}],i.defaultMethod,i.defaultDispatchVal)}return r.value=d,a.nil()}).doc("Adds or replaces a method on a multimethod var. Uses :default as the fallback dispatch value.",[["mm-var","dispatch-val","fn"]])};function Tt(t){return u.record(t)?`${t.ns}/${t.recordType}`:t.kind}function*$n(t){for(const e of t.allNamespaces())for(const n of e.vars.values())u.protocol(n.value)&&(yield n.value)}function $s(t){return t.arities.map(e=>{const n=e.params.map(r=>b(r));return e.restParam?[...n,"&",b(e.restParam)]:n})}function _s(t){const e=t.meta;if(!e)return[];const n=e.entries.find(([s])=>u.keyword(s)&&s.name===":arglists");if(!n)return[];const r=n[1];return u.vector(r)?r.value.filter(u.vector).map(s=>s.value.map(o=>u.symbol(o)?o.name:b(o))):[]}function Kt(t){if(!t)return a.nil();const e=t.entries.find(([n])=>u.keyword(n)&&n.name===":doc");return e?e[1]:a.nil()}function qs(t,e){if(!t)return a.nil();const n=t.entries.find(([r])=>u.keyword(r)&&r.name===e);return n?n[1]:a.nil()}function Ss(t){return t.meta!==void 0&&t.meta.entries.some(([e])=>u.keyword(e)&&e.name===":protocol")}function xm(t){switch(t.kind){case"function":{const e=$s(t);return a.map([[a.kw(":kind"),a.kw(":fn")],...t.name?[[a.kw(":name"),a.string(t.name)]]:[],[a.kw(":arglists"),a.vector(e.map(n=>a.vector(n.map(a.string))))],[a.kw(":doc"),Kt(t.meta)]])}case"native-function":{if(Ss(t))return a.map([[a.kw(":kind"),a.kw(":protocol-fn")],[a.kw(":name"),a.string(t.name)],[a.kw(":protocol"),qs(t.meta,":protocol")]]);const e=_s(t);return a.map([[a.kw(":kind"),a.kw(":native-fn")],[a.kw(":name"),a.string(t.name)],[a.kw(":arglists"),a.vector(e.map(n=>a.vector(n.map(a.string))))],[a.kw(":doc"),Kt(t.meta)]])}case"protocol":return a.map([[a.kw(":kind"),a.kw(":protocol")],[a.kw(":name"),a.string(t.name)],[a.kw(":methods"),a.vector(t.fns.map(e=>a.string(e.name)))]]);case"multi-method":return a.map([[a.kw(":kind"),a.kw(":multi-method")],[a.kw(":name"),a.string(t.name)],[a.kw(":dispatch-vals"),a.vector(t.methods.map(e=>e.dispatchVal))],[a.kw(":default?"),a.boolean(t.defaultMethod!==void 0)]]);case"macro":return a.map([[a.kw(":kind"),a.kw(":macro")],...t.name?[[a.kw(":name"),a.string(t.name)]]:[]]);default:return a.map([[a.kw(":kind"),a.kw(`:${t.kind}`)]])}}function Fs(t,e,n){switch(e.kind){case"protocol":{const r=[...e.impls.keys()].map(o=>a.keyword(`:${o}`)),s=e.fns.map(o=>a.map([[a.kw(":name"),a.string(o.name)],[a.kw(":arglists"),a.vector(o.arglists.map(i=>a.vector(i.map(a.string))))],[a.kw(":doc"),o.doc!==void 0?a.string(o.doc):a.nil()]]));return a.map([[a.kw(":kind"),a.kw(":protocol")],[a.kw(":name"),a.string(e.name)],[a.kw(":ns"),a.string(e.ns)],[a.kw(":doc"),e.doc!==void 0?a.string(e.doc):a.nil()],[a.kw(":methods"),a.vector(s)],[a.kw(":extenders"),a.vector(r)]])}case"function":{const r=$s(e);return a.map([[a.kw(":kind"),a.kw(":fn")],[a.kw(":name"),e.name!==void 0?a.string(e.name):a.nil()],[a.kw(":arglists"),a.vector(r.map(s=>a.vector(s.map(a.string))))],[a.kw(":doc"),Kt(e.meta)]])}case"native-function":{if(Ss(e)){const s=qs(e.meta,":protocol"),o=[];if(u.string(s)){for(const i of $n(t))if(`${i.ns}/${i.name}`===s.value){const l=i.fns.find(c=>c.name===e.name);l&&o.push(...l.arglists);break}}return a.map([[a.kw(":kind"),a.kw(":protocol-fn")],[a.kw(":name"),a.string(e.name)],[a.kw(":protocol"),s],[a.kw(":arglists"),a.vector(o.map(i=>a.vector(i.map(a.string))))]])}const r=_s(e);return a.map([[a.kw(":kind"),a.kw(":native-fn")],[a.kw(":name"),a.string(e.name)],[a.kw(":arglists"),a.vector(r.map(s=>a.vector(s.map(a.string))))],[a.kw(":doc"),Kt(e.meta)]])}case"multi-method":return a.map([[a.kw(":kind"),a.kw(":multi-method")],[a.kw(":name"),a.string(e.name)],[a.kw(":dispatch-vals"),a.vector(e.methods.map(r=>r.dispatchVal))],[a.kw(":default?"),a.boolean(e.defaultMethod!==void 0)]]);case"record":{const r=Tt(e),s=[];for(const o of $n(t))o.impls.has(r)&&s.push(a.keyword(`:${o.ns}/${o.name}`));return a.map([[a.kw(":kind"),a.kw(":record")],[a.kw(":type"),a.keyword(`:${e.ns}/${e.recordType}`)],[a.kw(":ns"),a.string(e.ns)],[a.kw(":name"),a.string(e.recordType)],[a.kw(":fields"),a.map(e.fields)],[a.kw(":protocols"),a.vector(s)]])}case"namespace":{const r=[...e.vars.entries()],s=r.length,o=n!==null&&s>n,l=(o?r.slice(0,n):r).map(([c,d])=>[a.string(c),xm(d.value)]);return a.map([[a.kw(":kind"),a.kw(":namespace")],[a.kw(":name"),a.string(e.name)],[a.kw(":var-count"),a.number(s)],...o?[[a.kw(":showing"),a.number(n)]]:[],[a.kw(":vars"),a.map(l)]])}case"var":return a.map([[a.kw(":kind"),a.kw(":var")],[a.kw(":ns"),a.string(e.ns)],[a.kw(":name"),a.string(e.name)],[a.kw(":dynamic"),a.boolean(e.dynamic??!1)],[a.kw(":value"),Fs(t,e.value,null)]]);case"string":return a.map([[a.kw(":kind"),a.kw(":string")],[a.kw(":value"),e],[a.kw(":count"),a.number(e.value.length)]]);case"number":return a.map([[a.kw(":kind"),a.kw(":number")],[a.kw(":value"),e]]);case"boolean":return a.map([[a.kw(":kind"),a.kw(":boolean")],[a.kw(":value"),e]]);case"nil":return a.map([[a.kw(":kind"),a.kw(":nil")]]);case"keyword":{const r=e.name.slice(1),s=r.indexOf("/");return a.map([[a.kw(":kind"),a.kw(":keyword")],[a.kw(":name"),a.string(s>=0?r.slice(s+1):r)],[a.kw(":ns"),s>=0?a.string(r.slice(0,s)):a.nil()]])}case"symbol":{const r=e.name,s=r.indexOf("/");return a.map([[a.kw(":kind"),a.kw(":symbol")],[a.kw(":name"),a.string(s>=0?r.slice(s+1):r)],[a.kw(":ns"),s>=0?a.string(r.slice(0,s)):a.nil()]])}case"list":return a.map([[a.kw(":kind"),a.kw(":list")],[a.kw(":count"),a.number(e.value.length)]]);case"vector":return a.map([[a.kw(":kind"),a.kw(":vector")],[a.kw(":count"),a.number(e.value.length)]]);case"map":return a.map([[a.kw(":kind"),a.kw(":map")],[a.kw(":count"),a.number(e.entries.length)]]);case"set":return a.map([[a.kw(":kind"),a.kw(":set")],[a.kw(":count"),a.number(e.values.length)]]);case"atom":return a.map([[a.kw(":kind"),a.kw(":atom")],[a.kw(":deref-kind"),a.kw(`:${e.value.kind}`)]]);case"lazy-seq":return a.map([[a.kw(":kind"),a.kw(":lazy-seq")],[a.kw(":realized"),a.boolean(e.realized)]]);case"cons":return a.map([[a.kw(":kind"),a.kw(":cons")]]);case"regex":return a.map([[a.kw(":kind"),a.kw(":regex")],[a.kw(":pattern"),a.string(e.pattern)],[a.kw(":flags"),a.string(e.flags)]]);case"delay":return a.map([[a.kw(":kind"),a.kw(":delay")],[a.kw(":realized"),a.boolean(e.realized)]]);case"macro":return a.map([[a.kw(":kind"),a.kw(":macro")],...e.name?[[a.kw(":name"),a.string(e.name)]]:[]]);default:return a.map([[a.kw(":kind"),a.kw(`:${e.kind}`)]])}}const $m={"make-protocol!":a.nativeFnCtx("make-protocol!",function(e,n,r,s,o){if(!u.string(r))throw new f(`make-protocol!: name must be a string, got ${r.kind}`,{nameVal:r});if(!u.vector(o))throw new f(`make-protocol!: method-defs must be a vector, got ${o.kind}`,{methodDefsVal:o});const i=r.value,l=u.string(s)?s.value:void 0,c=[];for(const g of o.value){if(!u.vector(g))continue;const[w,k,S]=g.value;if(!u.string(w))continue;const I=[];if(u.vector(k))for(const N of k.value)u.vector(N)&&I.push(N.value.map(P=>u.string(P)?P.value:b(P)));c.push({name:w.value,arglists:I,doc:u.string(S)?S.value:void 0})}const d=de(n),m=d.ns.name,p=d.ns.vars.get(i);if(p&&u.protocol(p.value))return a.nil();const h=a.protocol(i,m,c,l);K(i,h,d);for(const g of c){const w=g.name,k={kind:"native-function",name:w,fn:()=>{throw new f(`Protocol dispatch function '${w}' called without context`,{})},fnWithContext:(I,N,...P)=>{if(P.length===0)throw new f(`Protocol method '${w}' called with no arguments`,{});const D=P[0],A=Tt(D),O=h.impls.get(A);if(!O||!O[w])throw new f(`No implementation of protocol method '${m}/${i}/${w}' for type '${A}'`,{target:D,tag:A,protocolName:i,methodName:w});return I.applyFunction(O[w],P,N)},meta:a.map([[a.kw(":protocol"),a.string(`${m}/${i}`)],[a.kw(":name"),a.string(w)]])},S=d.ns.vars.get(w);S&&!u.protocol(S.value)&&e.io.stderr(`WARNING: defprotocol '${i}' method '${w}' shadows existing var in ${m}`),K(w,k,d)}return a.nil()}).doc("Creates a protocol with the given name, docstring, and method definitions. Interns the protocol and its dispatch functions in the current namespace.",[["name","doc","method-defs"]]),"extend-protocol!":a.nativeFnCtx("extend-protocol!",function(e,n,r,s,o){let i;if(u.var(r)&&u.protocol(r.value))i=r.value;else if(u.protocol(r))i=r;else throw new f(`extend-protocol!: first argument must be a protocol var or protocol, got ${r.kind}`,{protoVal:r});if(!u.string(s))throw new f(`extend-protocol!: type-tag must be a string, got ${s.kind}`,{typeTagVal:s});if(!u.map(o))throw new f(`extend-protocol!: impl-map must be a map, got ${o.kind}`,{implMapVal:o});const l=s.value,c={};for(const[d,m]of o.entries)if(u.string(d)){if(!u.aFunction(m))throw new f(`extend-protocol!: implementation for '${d.value}' must be a function, got ${m.kind}`,{fnVal:m});c[d.value]=m}return i.impls.set(l,c),a.nil()}).doc("Registers method implementations for type-tag on a protocol. Mutates the protocol in place.",[["proto-var","type-tag","impl-map"]]),"satisfies?":a.nativeFn("satisfies?",function(e,n){let r;if(u.var(e)&&u.protocol(e.value))r=e.value;else if(u.protocol(e))r=e;else throw new f(`satisfies?: first argument must be a protocol, got ${e.kind}`,{protoVal:e});if(n===void 0)throw new f("satisfies?: second argument is required",{});const s=Tt(n);return a.boolean(r.impls.has(s))}).doc("Returns true if value implements the protocol.",[["protocol","value"]]),protocols:a.nativeFnCtx("protocols",function(e,n,r){if(r===void 0)throw new f("protocols: argument is required",{});const s=u.keyword(r)?r.name.slice(1):Tt(r),o=[];for(const i of $n(e))i.impls.has(s)&&o.push(i);return a.vector(o)}).doc("Returns a vector of all protocols that a type implements. Accepts a keyword type tag (:string, :user/Circle) or any value.",[["type-kw-or-value"]]),extenders:a.nativeFn("extenders",function(e){let n;if(u.var(e)&&u.protocol(e.value))n=e.value;else if(u.protocol(e))n=e;else throw new f(`extenders: argument must be a protocol, got ${e.kind}`,{protoVal:e});return a.vector([...n.impls.keys()].map(r=>a.keyword(`:${r}`)))}).doc("Returns a vector of type-tag strings that have extended the protocol.",[["protocol"]]),"make-record!":a.nativeFn("make-record!",function(e,n,r){if(!u.string(e))throw new f(`make-record!: record-type must be a string, got ${e.kind}`,{recordTypeVal:e});if(!u.string(n))throw new f(`make-record!: ns-name must be a string, got ${n.kind}`,{nsNameVal:n});if(!u.map(r))throw new f(`make-record!: field-map must be a map, got ${r.kind}`,{fieldMapVal:r});return a.record(e.value,n.value,r.entries)}).doc("Creates a record value. Called by generated constructors (->Name, map->Name).",[["record-type","ns-name","field-map"]]),"protocol?":a.nativeFn("protocol?",function(e){return a.boolean(u.protocol(e))}).doc("Returns true if x is a protocol.",[["x"]]),"record?":a.nativeFn("record?",function(e){return a.boolean(u.record(e))}).doc("Returns true if x is a record.",[["x"]]),"record-type":a.nativeFn("record-type",function(e){if(!u.record(e))throw new f(`record-type: expected a record, got ${e.kind}`,{x:e});return a.string(`${e.ns}/${e.recordType}`)}).doc("Returns the qualified type name (ns/Name) of a record.",[["record"]]),"describe*":a.nativeFnCtx("describe*",function(e,n,r,s){if(r===void 0)throw new f("describe*: argument is required",{});const o=s!==void 0&&u.number(s)?s.value:null;return Fs(e,r,o)}).doc("Returns a plain map describing any cljam value. Called by describe — prefer using describe directly.",[["value"],["value","limit"]])};function We(t,e){const n=a.kw(e),r=t.entries.find(([s])=>u.equal(s,n));return r&&u.map(r[1])?r[1]:a.map([])}function he(t,e){const n=t.entries.find(([r])=>u.equal(r,e));return n&&u.set(n[1])?n[1]:a.set([])}function zt(t,e,n){const r=t.entries.filter(([s])=>!u.equal(s,e));return n.values.length>0&&r.push([e,n]),a.map(r)}function At(t,e){const n=[...t.values];for(const r of e.values)n.some(s=>u.equal(s,r))||n.push(r);return a.set(n)}function js(t,e){return t.values.some(n=>u.equal(n,e))}function _m(t,e){const n=[],r=[...he(t,e).values];for(;r.length>0;){const s=r.shift();if(!n.some(o=>u.equal(o,s))){n.push(s);for(const o of he(t,s).values)n.some(i=>u.equal(i,o))||r.push(o)}}return a.set(n)}function qm(t){const e=[];for(const[i,l]of t.entries)if(e.some(c=>u.equal(c,i))||e.push(i),u.set(l))for(const c of l.values)e.some(d=>u.equal(d,c))||e.push(c);const n=[];for(const i of e){const l=_m(t,i);l.values.length>0&&n.push([i,l])}const r=a.map(n),s=new Map;for(const[i,l]of n)if(u.set(l))for(const c of l.values){const d=b(c);s.has(d)||s.set(d,{key:c,values:[]}),s.get(d).values.push(i)}const o=a.map([...s.values()].map(({key:i,values:l})=>[i,a.set(l)]));return a.map([[a.kw(":parents"),t],[a.kw(":ancestors"),r],[a.kw(":descendants"),o]])}function ir(t,e,n){if(u.equal(e,n))throw new f(`derive: cannot derive ${b(e)} from itself`,{child:e});const r=We(t,":ancestors"),s=he(r,n);if(js(s,e))throw new f(`derive: cycle — ${b(e)} is already an ancestor of ${b(n)}`,{child:e,parent:n});const o=At(a.set([n]),s),i=We(t,":descendants"),l=he(i,e),c=[e,...l.values];let d=r;for(const S of c){const I=he(d,S);d=zt(d,S,At(I,o))}const m=a.set(c),p=[n,...s.values];let h=i;for(const S of p){const I=he(h,S);h=zt(h,S,At(I,m))}const g=We(t,":parents"),w=he(g,e),k=zt(g,e,At(w,a.set([n])));return a.map([[a.kw(":parents"),k],[a.kw(":ancestors"),d],[a.kw(":descendants"),h]])}function lr(t,e,n){if(u.equal(e,n))return!0;const r=We(t,":ancestors");return js(he(r,e),n)}function cr(t,e,n){const r=We(t,":parents"),s=he(r,e),o=a.set(s.values.filter(l=>!u.equal(l,n))),i=zt(r,e,o);return qm(i)}function ot(t){const e=t.allNamespaces().find(n=>n.name==="clojure.core");return e?e.vars.get("*hierarchy*")??null:null}function it(t){const e=t.dynamic&&t.bindingStack&&t.bindingStack.length>0?t.bindingStack[t.bindingStack.length-1]:t.value;return u.map(e)?e:null}const Sm={"hierarchy-derive*":a.nativeFn("hierarchy-derive*",function(e,n,r){if(!u.map(e))throw new f(`hierarchy-derive*: expected a hierarchy map, got ${e.kind}`,{h:e});return ir(e,n,r)}).doc("Pure derive — returns a new hierarchy with child deriving from parent.",[["h","child","parent"]]),"hierarchy-underive*":a.nativeFn("hierarchy-underive*",function(e,n,r){if(!u.map(e))throw new f(`hierarchy-underive*: expected a hierarchy map, got ${e.kind}`,{h:e});return cr(e,n,r)}).doc("Pure underive — returns a new hierarchy with the child→parent edge removed.",[["h","child","parent"]]),"hierarchy-isa?*":a.nativeFn("hierarchy-isa?*",function(e,n,r){if(!u.map(e))throw new f(`hierarchy-isa?*: expected a hierarchy map, got ${e.kind}`,{h:e});return a.boolean(lr(e,n,r))}).doc("Returns true if child isa? parent according to the given hierarchy.",[["h","child","parent"]]),"hierarchy-derive-global!":a.nativeFnCtx("hierarchy-derive-global!",function(e,n,r,s){const o=ot(e);if(!o)throw new f("hierarchy-derive-global!: *hierarchy* not found in clojure.core",{child:r,parent:s});const i=it(o);if(!i)throw new f("hierarchy-derive-global!: *hierarchy* root value is not a map",{child:r,parent:s});const l=ir(i,r,s);return o.value=l,l}).doc("Derives child from parent in the global *hierarchy* (session-safe).",[["child","parent"]]),"hierarchy-underive-global!":a.nativeFnCtx("hierarchy-underive-global!",function(e,n,r,s){const o=ot(e);if(!o)throw new f("hierarchy-underive-global!: *hierarchy* not found in clojure.core",{child:r,parent:s});const i=it(o);if(!i)throw new f("hierarchy-underive-global!: *hierarchy* root value is not a map",{child:r,parent:s});const l=cr(i,r,s);return o.value=l,l}).doc("Underives child from parent in the global *hierarchy* (session-safe).",[["child","parent"]]),"hierarchy-isa?-global":a.nativeFnCtx("hierarchy-isa?-global",function(e,n,r,s){const o=ot(e);if(!o)return a.boolean(u.equal(r,s));const i=it(o);return i?a.boolean(lr(i,r,s)):a.boolean(u.equal(r,s))}).doc("Returns true if child isa? parent in the global *hierarchy* (session-safe).",[["child","parent"]]),"hierarchy-parents-global":a.nativeFnCtx("hierarchy-parents-global",function(e,n,r){const s=ot(e);if(!s)return a.nil();const o=it(s);if(!o)return a.nil();const i=he(We(o,":parents"),r);return i.values.length>0?i:a.nil()}).doc("Returns the immediate parents of tag in the global *hierarchy* (session-safe), or nil.",[["tag"]]),"hierarchy-ancestors-global":a.nativeFnCtx("hierarchy-ancestors-global",function(e,n,r){const s=ot(e);if(!s)return a.nil();const o=it(s);if(!o)return a.nil();const i=he(We(o,":ancestors"),r);return i.values.length>0?i:a.nil()}).doc("Returns all ancestors of tag in the global *hierarchy* (session-safe), or nil.",[["tag"]]),"hierarchy-descendants-global":a.nativeFnCtx("hierarchy-descendants-global",function(e,n,r){const s=ot(e);if(!s)return a.nil();const o=it(s);if(!o)return a.nil();const i=he(We(o,":descendants"),r);return i.values.length>0?i:a.nil()}).doc("Returns all descendants of tag in the global *hierarchy* (session-safe), or nil.",[["tag"]])};function Fm(t){if(t.kind!=="string")throw new f(`#inst requires a string, got ${t.kind}`,{form:t});const e=new Date(t.value);if(isNaN(e.getTime()))throw new f(`#inst: invalid date string "${t.value}"`,{form:t});return a.jsValue(e)}function jm(t){if(t.kind!=="string")throw new f(`#uuid requires a string, got ${t.kind}`,{form:t});return t}const Rm=new Map([["inst",Fm],["uuid",jm]]);function Im(t,e,n){const r=new Map(Rm),s=pt("*data-readers*",e);if(s){const i=ye(s);i.kind==="map"&&ur(i,r,n,e)}let o;if(t&&t.kind==="map"){const i=t.entries.find(([c])=>c.kind==="keyword"&&c.name===":readers");if(i){const c=i[1];c.kind==="map"&&ur(c,r,n,e)}const l=t.entries.find(([c])=>c.kind==="keyword"&&c.name===":default");if(l){const c=l[1];if(c.kind==="function"||c.kind==="native-function"){const d=c;o=(m,p)=>n.applyCallable(d,[a.string(m),p],e)}}}return{readers:r,defaultFn:o}}function ur(t,e,n,r){for(const[s,o]of t.entries)if((s.kind==="symbol"||s.kind==="keyword")&&(o.kind==="function"||o.kind==="native-function"||o.kind==="multi-method")){const i=s.kind==="symbol"?s.name:s.name.slice(1),l=o;e.set(i,c=>n.applyCallable(l,[c],r))}}const Am={"edn-read-string*":a.nativeFnCtx("edn-read-string*",(t,e,...n)=>{if(n.length===0||n.length>2)throw new f(`edn-read-string* expects 1 or 2 arguments, got ${n.length}`,{});let r=null,s;if(n.length===1?s=n[0]:(r=n[0],s=n[1]),s.kind!=="string")throw new f(`edn-read-string*: expected string, got ${b(s)}`,{sourceArg:s});const{readers:o,defaultFn:i}=Im(r,e,t),l=ft(s.value),c=Wf(l,{dataReaders:o,defaultDataReader:i});if(c.length===0)throw new f("edn-read-string*: empty input",{});return c[0]}),"edn-pr-str*":a.nativeFn("edn-pr-str*",(...t)=>{if(t.length!==1)throw new f(`edn-pr-str* expects 1 argument, got ${t.length}`,{});return a.string(b(t[0]))})},Pm={"*data-readers*":a.map([])};function Q(t,e){if(t===void 0||t.kind!=="number")throw new f(`${e} expects a number${t!==void 0?`, got ${b(t)}`:""}`,{val:t});return t.value}function kt(t,e,n){return[Q(t,n),Q(e,n)]}function Cm(t){const e=Math.floor(t);return t-e===.5?e%2===0?e:e+1:Math.round(t)}const Mm={"math-floor*":a.nativeFn("math-floor*",function(e){return a.number(Math.floor(Q(e,"floor")))}).doc("Returns the largest integer ≤ x.",[["x"]]),"math-ceil*":a.nativeFn("math-ceil*",function(e){return a.number(Math.ceil(Q(e,"ceil")))}).doc("Returns the smallest integer ≥ x.",[["x"]]),"math-round*":a.nativeFn("math-round*",function(e){return a.number(Math.round(Q(e,"round")))}).doc("Returns the closest integer to x, with ties rounding up.",[["x"]]),"math-rint*":a.nativeFn("math-rint*",function(e){return a.number(Cm(Q(e,"rint")))}).doc("Returns the integer closest to x, with ties rounding to the nearest even (IEEE 754 round-half-to-even).",[["x"]]),"math-pow*":a.nativeFn("math-pow*",function(e,n){const[r,s]=kt(e,n,"pow");return a.number(Math.pow(r,s))}).doc("Returns x raised to the power of y.",[["x","y"]]),"math-exp*":a.nativeFn("math-exp*",function(e){return a.number(Math.exp(Q(e,"exp")))}).doc("Returns Euler's number e raised to the power of x.",[["x"]]),"math-log*":a.nativeFn("math-log*",function(e){return a.number(Math.log(Q(e,"log")))}).doc("Returns the natural logarithm (base e) of x.",[["x"]]),"math-log10*":a.nativeFn("math-log10*",function(e){return a.number(Math.log10(Q(e,"log10")))}).doc("Returns the base-10 logarithm of x.",[["x"]]),"math-cbrt*":a.nativeFn("math-cbrt*",function(e){return a.number(Math.cbrt(Q(e,"cbrt")))}).doc("Returns the cube root of x.",[["x"]]),"math-hypot*":a.nativeFn("math-hypot*",function(e,n){const[r,s]=kt(e,n,"hypot");return a.number(Math.hypot(r,s))}).doc("Returns sqrt(x² + y²), the length of the hypotenuse.",[["x","y"]]),"math-sin*":a.nativeFn("math-sin*",function(e){return a.number(Math.sin(Q(e,"sin")))}).doc("Returns the sine of x (in radians).",[["x"]]),"math-cos*":a.nativeFn("math-cos*",function(e){return a.number(Math.cos(Q(e,"cos")))}).doc("Returns the cosine of x (in radians).",[["x"]]),"math-tan*":a.nativeFn("math-tan*",function(e){return a.number(Math.tan(Q(e,"tan")))}).doc("Returns the tangent of x (in radians).",[["x"]]),"math-asin*":a.nativeFn("math-asin*",function(e){return a.number(Math.asin(Q(e,"asin")))}).doc("Returns the arc sine of x, in radians.",[["x"]]),"math-acos*":a.nativeFn("math-acos*",function(e){return a.number(Math.acos(Q(e,"acos")))}).doc("Returns the arc cosine of x, in radians.",[["x"]]),"math-atan*":a.nativeFn("math-atan*",function(e){return a.number(Math.atan(Q(e,"atan")))}).doc("Returns the arc tangent of x, in radians.",[["x"]]),"math-atan2*":a.nativeFn("math-atan2*",function(e,n){const[r,s]=kt(e,n,"atan2");return a.number(Math.atan2(r,s))}).doc("Returns the angle θ from the conversion of rectangular (x, y) to polar (r, θ). Args: y, x.",[["y","x"]]),"math-sinh*":a.nativeFn("math-sinh*",function(e){return a.number(Math.sinh(Q(e,"sinh")))}).doc("Returns the hyperbolic sine of x.",[["x"]]),"math-cosh*":a.nativeFn("math-cosh*",function(e){return a.number(Math.cosh(Q(e,"cosh")))}).doc("Returns the hyperbolic cosine of x.",[["x"]]),"math-tanh*":a.nativeFn("math-tanh*",function(e){return a.number(Math.tanh(Q(e,"tanh")))}).doc("Returns the hyperbolic tangent of x.",[["x"]]),"math-signum*":a.nativeFn("math-signum*",function(e){const n=Q(e,"signum");return n===0||Number.isNaN(n)?a.number(n):a.number(n>0?1:-1)}).doc("Returns -1.0, 0.0, or 1.0 indicating the sign of x.",[["x"]]),"math-floor-div*":a.nativeFn("math-floor-div*",function(e,n){const[r,s]=kt(e,n,"floor-div");if(s===0)throw new f("floor-div: division by zero",{x:e,y:n});return a.number(Math.floor(r/s))}).doc("Returns the largest integer ≤ x/y (floor division).",[["x","y"]]),"math-floor-mod*":a.nativeFn("math-floor-mod*",function(e,n){const[r,s]=kt(e,n,"floor-mod");if(s===0)throw new f("floor-mod: division by zero",{x:e,y:n});return a.number((r%s+s)%s)}).doc("Returns x - (floor-div x y) * y (floor modulo).",[["x","y"]]),"math-to-radians*":a.nativeFn("math-to-radians*",function(e){return a.number(Q(e,"to-radians")*Math.PI/180)}).doc("Converts an angle in degrees to radians.",[["deg"]]),"math-to-degrees*":a.nativeFn("math-to-degrees*",function(e){return a.number(Q(e,"to-degrees")*180/Math.PI)}).doc("Converts an angle in radians to degrees.",[["rad"]])},Nm={then:a.nativeFnCtx("then",(t,e,n,r)=>{if(!u.callable(r))throw new f(`${b(r)} is not a callable value`,{fn:r,args:[]});if(n.kind!=="pending")return t.applyCallable(r,[n],e);const s=n.promise.then(o=>{try{const i=t.applyCallable(r,[o],e);return i.kind==="pending"?i.promise:i}catch(i){return Promise.reject(i)}});return a.pending(s)}).doc("Applies f to the resolved value of a pending, or to val directly if not pending.",[["val","f"]]),"catch*":a.nativeFnCtx("catch*",(t,e,n,r)=>{if(!u.callable(r))throw new f(`${b(r)} is not a callable value`,{fn:r,args:[]});if(n.kind!=="pending")return n;const s=n.promise.catch(o=>{let i;o instanceof Le?i=o.value:i={kind:"map",entries:[[{kind:"keyword",name:":type"},{kind:"keyword",name:":error/js"}],[{kind:"keyword",name:":message"},{kind:"string",value:o instanceof Error?o.message:String(o)}]]};try{const l=t.applyCallable(r,[i],e);return l.kind==="pending"?l.promise:l}catch(l){return Promise.reject(l)}});return a.pending(s)}).doc("Handles rejection of a pending value by calling f with the thrown value or an error map.",[["val","f"]]),"pending?":a.nativeFn("pending?",t=>a.boolean(t.kind==="pending")).doc("Returns true if val is a pending (async) value.",[["val"]]),"promise-of":a.nativeFn("promise-of",t=>a.pending(Promise.resolve(t))).doc("Wraps val in an immediately-resolving pending value. Useful for testing async composition.",[["val"]]),all:a.nativeFn("all",t=>{const n=(t.kind==="nil"?[]:X(t)).map(r=>r.kind==="pending"?r.promise:Promise.resolve(r));return a.pending(Promise.all(n).then(r=>a.vector(r)))}).doc("Returns a pending that resolves with a vector of all results when every input resolves.",[["pendings"]])};function lt(t,e,n){var o;const r=(o=t.resolveNs("clojure.core"))==null?void 0:o.vars.get("*out*"),s=r?ye(r):void 0;s&&(s.kind==="function"||s.kind==="native-function")?t.applyCallable(s,[a.string(n)],e):t.io.stdout(n)}function Lm(t,e,n){var o;const r=(o=t.resolveNs("clojure.core"))==null?void 0:o.vars.get("*err*"),s=r?ye(r):void 0;s&&(s.kind==="function"||s.kind==="native-function")?t.applyCallable(s,[a.string(n)],e):t.io.stderr(n)}const Em={println:a.nativeFnCtx("println",(t,e,...n)=>(Fe(je(t),()=>{lt(t,e,n.map(Y).join(" ")+`
`)}),a.nil())),print:a.nativeFnCtx("print",(t,e,...n)=>(Fe(je(t),()=>{lt(t,e,n.map(Y).join(" "))}),a.nil())),newline:a.nativeFnCtx("newline",(t,e)=>(lt(t,e,`
`),a.nil())),pr:a.nativeFnCtx("pr",(t,e,...n)=>(Fe(je(t),()=>{lt(t,e,n.map(r=>b(r)).join(" "))}),a.nil())),prn:a.nativeFnCtx("prn",(t,e,...n)=>(Fe(je(t),()=>{lt(t,e,n.map(r=>b(r)).join(" ")+`
`)}),a.nil())),pprint:a.nativeFnCtx("pprint",(t,e,n,r)=>{if(n===void 0)return a.nil();const s=(r==null?void 0:r.kind)==="number"?r.value:80;return Fe(je(t),()=>{lt(t,e,Kr(n,s)+`
`)}),a.nil()}),warn:a.nativeFnCtx("warn",(t,e,...n)=>(Fe(je(t),()=>{Lm(t,e,n.map(Y).join(" ")+`
`)}),a.nil()))},Tm={"*out*":a.nil(),"*err*":a.nil(),"*print-length*":a.nil(),"*print-level*":a.nil(),"*compiler-options*":a.map([])},zm={...em,...tm,...rm,...sm,...nm,...am,...lm,...om,...im,...gm,...um,...hm,...vm,...bm,...km,...$m,...Sm,...Am,...Mm,...ym,...Em,...Nm},Vm={...Tm,...Pm};function Dm(){return{id:"clojure/core",declareNs:[{name:"clojure.core",vars(t){const e=new Map;for(const[n,r]of Object.entries(zm)){const s=r.meta;e.set(n,{value:r,...s?{meta:s}:{}})}for(const[n,r]of Object.entries(Vm))e.set(n,{value:r,dynamic:!0});return e}}]}}function ct(t,e){if(u.string(t))return t.value;if(u.keyword(t))return t.name.slice(1);if(u.number(t))return String(t.value);throw new f(`${e}: key must be a string, keyword, or number, got ${t.kind}`,{key:t})}function Oe(t,e){switch(t.kind){case y.jsValue:return t.value;case y.string:case y.number:case y.boolean:return t.value;case y.nil:throw new f(`${e}: cannot access properties on nil`,{val:t});default:throw new f(`${e}: expected a js-value or primitive, got ${t.kind}`,{val:t})}}const Bm={"clj->js":a.nativeFnCtx("clj->js",(t,e,n)=>{if(u.jsValue(n))return n;const r={applyFunction:(s,o)=>t.applyCallable(s,o,e)};return a.jsValue(et(n,r))}),"js->clj":a.nativeFn("js->clj",(t,e)=>{if(t.kind==="nil")return t;if(!u.jsValue(t))throw new f(`js->clj expects a js-value, got ${t.kind}`,{val:t});const n=(()=>{if(!e||e.kind!=="map")return!1;for(const[r,s]of e.entries)if(r.kind==="keyword"&&r.name===":keywordize-keys")return s.kind!=="boolean"||s.value!==!1;return!1})();return $t(t.value,{keywordizeKeys:n})})},Om={get:a.nativeFn("js/get",(t,e,...n)=>{const r=Oe(t,"js/get"),s=ct(e,"js/get"),o=r[s];return o===void 0&&n.length>0?n[0]:oe(o)}),"set!":a.nativeFnCtx("js/set!",(t,e,n,r,s)=>{const o=Oe(n,"js/set!"),i=ct(r,"js/set!");return o[i]=pe(s,t,e),s}),call:a.nativeFnCtx("js/call",(t,e,n,...r)=>{const s=n.kind==="js-value"?n.value:void 0;if(typeof s!="function")throw new f(`js/call: expected a js-value wrapping a function, got ${n.kind}`,{fn:n});const o=r.map(i=>pe(i,t,e));return oe(s(...o))}),typeof:a.nativeFn("js/typeof",t=>{switch(t.kind){case"nil":return a.string("object");case"number":return a.string("number");case"string":return a.string("string");case"boolean":return a.string("boolean");case"js-value":return a.string(typeof t.value);default:throw new f(`js/typeof: cannot determine JS type of Clojure ${t.kind}`,{x:t})}}),"instanceof?":a.nativeFn("js/instanceof?",(t,e)=>{if(t.kind!=="js-value")throw new f(`js/instanceof?: expected js-value, got ${t.kind}`,{obj:t});if(e.kind!=="js-value")throw new f(`js/instanceof?: expected js-value constructor, got ${e.kind}`,{cls:e});return a.boolean(t.value instanceof e.value)}),"array?":a.nativeFn("js/array?",t=>t.kind!=="js-value"?a.boolean(!1):a.boolean(Array.isArray(t.value))),"null?":a.nativeFn("js/null?",t=>a.boolean(t.kind==="nil")),"undefined?":a.nativeFn("js/undefined?",t=>a.boolean(t.kind==="js-value"&&t.value===void 0)),"some?":a.nativeFn("js/some?",t=>t.kind==="nil"||t.kind==="js-value"&&t.value===void 0?a.boolean(!1):a.boolean(!0)),"get-in":a.nativeFn("js/get-in",(t,e,...n)=>{if(e.kind!=="vector")throw new f(`js/get-in: path must be a vector, got ${e.kind}`,{path:e});if(t.kind==="nil")throw new f("js/get-in: cannot access properties on nil",{obj:t});const r=n.length>0?n[0]:a.jsValue(void 0);let s=t;for(const o of e.value){if(s.kind==="nil"||s.kind==="js-value"&&s.value===void 0)return r;const i=Oe(s,"js/get-in"),l=ct(o,"js/get-in");s=oe(i[l])}return s.kind==="js-value"&&s.value===void 0&&n.length>0?r:s}),prop:a.nativeFn("js/prop",(t,...e)=>{const n=e.length>0?e[0]:a.nil();return a.nativeFn("js/prop-accessor",r=>{const s=Oe(r,"js/prop"),o=ct(t,"js/prop"),i=s[o];return i===void 0?n:oe(i)})}),method:a.nativeFn("js/method",(t,...e)=>a.nativeFnCtx("js/method-caller",(n,r,s,...o)=>{const i=Oe(s,"js/method"),l=ct(t,"js/method"),c=i[l];if(typeof c!="function")throw new f(`js/method: property '${l}' is not callable`,{jsKey:l});const d=[...e,...o].map(m=>pe(m,n,r));return oe(c.apply(i,d))})),merge:a.nativeFnCtx("js/merge",(t,e,...n)=>{const r=Object.assign({},...n.map(s=>pe(s,t,e)));return a.jsValue(r)}),seq:a.nativeFn("js/seq",t=>{if(t.kind!=="js-value"||!Array.isArray(t.value))throw new f(`js/seq: expected a js-value wrapping an array, got ${t.kind}`,{arr:t});return a.vector(t.value.map(oe))}),array:a.nativeFnCtx("js/array",(t,e,...n)=>a.jsValue(n.map(r=>pe(r,t,e)))),obj:a.nativeFnCtx("js/obj",(t,e,...n)=>{if(n.length%2!==0)throw new f("js/obj: requires even number of arguments",{count:n.length});const r={};for(let s=0;s<n.length;s+=2){const o=ct(n[s],"js/obj");r[o]=pe(n[s+1],t,e)}return a.jsValue(r)}),keys:a.nativeFn("js/keys",t=>{const e=Oe(t,"js/keys");return a.vector(Object.keys(e).map(a.string))}),values:a.nativeFn("js/values",t=>{const e=Oe(t,"js/values");return a.vector(Object.values(e).map(oe))}),entries:a.nativeFn("js/entries",t=>{const e=Oe(t,"js/entries");return a.vector(Object.entries(e).map(([n,r])=>a.vector([a.string(n),oe(r)])))})};function Hm(){return{id:"cljam/js-namespace",declareNs:[{name:"clojure.core",vars(t){const e=new Map;for(const[n,r]of Object.entries(Bm))e.set(n,{value:r});return e}},{name:"js",vars(t){const e=new Map;for(const[n,r]of Object.entries(Om))e.set(n,{value:r});return e}}]}}function Um(t,e,n){const r=new Set((n==null?void 0:n.sourceRoots)??[]),s=new Map;let o="user";function i(m,p){var w;const h=_r[m];if(h)return d.loadFile(h(),m,void 0,p),!0;const g=(w=n==null?void 0:n.registeredSources)==null?void 0:w.get(m);if(g!==void 0)return d.loadFile(g,m,void 0,p),!0;if(!(n!=null&&n.readFile)||r.size===0)return!1;for(const k of r){const S=`${k.replace(/\/$/,"")}/${m.replace(/\./g,"/")}.clj`;try{const I=n.readFile(S);if(I)return d.loadFile(I,void 0,void 0,p),!0}catch{continue}}return!1}function l(m){var p;return((p=n==null?void 0:n.registeredSources)==null?void 0:p.has(m))??!1}function c(m,p){return p==="all"?!0:p.some(h=>m===h||m.startsWith(h))}Yf(t,e,()=>o,i),Xf(t,e);const d={get registry(){return t},ensureNamespace(m){return Wt(t,e,m)},getNamespaceEnv(m){return t.get(m)??null},getNs(m){var p;return((p=t.get(m))==null?void 0:p.ns)??null},syncNsVar(m){var h,g;o=m;const p=(h=e.ns)==null?void 0:h.vars.get("*ns*");if(p){const w=(g=t.get(m))==null?void 0:g.ns;w&&(p.value=w)}},addSourceRoot(m){r.add(m)},processRequireSpec(m,p,h){Et(m,p,t,g=>i(g,h),h.allowedPackages,l)},processNsRequires(m,p,h){const g=nr(m);for(const w of g)for(const k of w){if(u.vector(k)&&k.value.length>0&&u.string(k.value[0])){const S=k.value[0].value;throw new f(`String module require ["${S}" :as ...] is async — use evaluateAsync() instead of evaluate()`,{specifier:S})}Et(k,p,t,S=>i(S,h),h.allowedPackages,l)}},async processNsRequiresAsync(m,p,h){const g=nr(m);for(const w of g)for(const k of w)if(u.vector(k)&&k.value.length>0&&u.string(k.value[0])){const S=k.value[0].value;if(!h.importModule)throw new f(`importModule is not configured; cannot require "${S}". Pass importModule to createSession().`,{specifier:S});if(h.allowedHostModules!==void 0&&!c(S,h.allowedHostModules)){const D=h.allowedHostModules==="all"?[]:h.allowedHostModules,A=new f(`Access denied: host module '${S}' is not in the allowed host modules for this session.
Allowed host modules: ${JSON.stringify(D)}
To allow all host modules, use: allowedHostModules: 'all'`,{specifier:S,allowedHostModules:h.allowedHostModules});throw A.code="namespace/access-denied",A}const I=k.value;let N=null;for(let D=1;D<I.length;D++)if(u.keyword(I[D])&&I[D].name===":as"){D++;const A=I[D];if(!A||!u.symbol(A))throw new f(":as expects a symbol alias",{spec:k});N=A.name;break}if(N===null)throw new f(`String require spec must have an :as alias: ["${S}" :as Alias]`,{spec:k});const P=await h.importModule(S);K(N,a.jsValue(P),p)}else Et(k,p,t,S=>i(S,h),h.allowedPackages,l)},loadFile(m,p,h,g){const w=ft(m),k=Lt(w)??p??"user",S=xn(w),I=Ut(w,k,S),N=this.ensureNamespace(k);g.currentSource=m,g.currentFile=h,g.currentLineOffset=0,g.currentColOffset=0,this.processNsRequires(I,N,g);try{for(const P of I){const D=g.expandAll(P,N);g.evaluate(D,N)}}finally{g.currentSource=void 0,g.currentFile=void 0}return k},installModules(m){const p=Zf(m,new Set(t.keys()));for(const h of p)for(const g of h.declareNs){const w=Wt(t,e,g.name),k={getVar(I,N){var A;const P=t.get(I);return((A=P==null?void 0:P.ns)==null?void 0:A.vars.get(N))??null},getNamespace(I){var N;return((N=t.get(I))==null?void 0:N.ns)??null}},S=g.vars(k);for(const[I,N]of S){const P=`${w.ns.name}/${I}`,D=s.get(P);if(D!==void 0)throw new Error(`var '${I}' in '${w.ns.name}' already declared by module '${D}'`);if(K(I,N.value,w,N.meta),N.dynamic){const A=w.ns.vars.get(I);A.dynamic=!0}s.set(P,h.id)}}},snapshot(){return{registry:Qf(t)}}};return d}function Wm(t){const e=new Map,n=Ke();n.ns=Ot("clojure.core"),e.set("clojure.core",n);const r=Ke(n);r.ns=Ot("user"),e.set("user",r);const s=Um(e,n,t);return s.installModules([Dm(),Hm()]),s}function Km(t,e,n){let r=e;const s=Zd();s.resolveNs=l=>t.getNs(l),s.allNamespaces=()=>{const l=[];for(const c of t.registry.values())c.ns&&l.push(c.ns);return l},s.io={stdout:(n==null?void 0:n.output)??(l=>console.log(l)),stderr:(n==null?void 0:n.stderr)??(l=>console.error(l))},s.importModule=n==null?void 0:n.importModule,s.allowedPackages=(n==null?void 0:n.allowedPackages)??"all",s.allowedHostModules=(n==null?void 0:n.allowedHostModules)??"all",s.setCurrentNs=l=>{t.ensureNamespace(l),r=l,t.syncNsVar(l)};const o={allowedPackages:(n==null?void 0:n.allowedPackages)??"all",allowedHostModules:(n==null?void 0:n.allowedHostModules)??"all",hostBindings:Object.keys((n==null?void 0:n.hostBindings)??{}),allowDynamicImport:(n==null?void 0:n.importModule)!==void 0,libraries:((n==null?void 0:n.libraries)??[]).map(l=>l.id)},i={get runtime(){return t},get capabilities(){return o},get registry(){return t.registry},get currentNs(){return r},get libraries(){return(n==null?void 0:n.libraries)??[]},setNs(l){t.ensureNamespace(l),r=l,t.syncNsVar(l)},getNs(l){return t.getNs(l)},loadFile(l,c,d){return t.loadFile(l,c,d,s)},async loadFileAsync(l,c,d){if(c){const m=ft(l);Lt(m)||(t.ensureNamespace(c),r=c,t.syncNsVar(c))}return await i.evaluateAsync(l,{file:d}),r},addSourceRoot(l){t.addSourceRoot(l)},evaluate(l,c){var d,m,p,h;s.currentSource=l,s.currentFile=c==null?void 0:c.file,s.currentLineOffset=(c==null?void 0:c.lineOffset)??0,s.currentColOffset=(c==null?void 0:c.colOffset)??0;try{const g=ft(l),w=Lt(g);w&&(t.ensureNamespace(w),r=w,t.syncNsVar(w));const k=t.getNamespaceEnv(r),S=xn(g);(d=k.ns)==null||d.aliases.forEach((P,D)=>{S.set(D,P.name)}),(m=k.ns)==null||m.readerAliases.forEach((P,D)=>{S.set(D,P)});const I=Ut(g,r,S);t.processNsRequires(I,k,s);let N=a.nil();for(const P of I){const D=s.expandAll(P,k);N=s.evaluate(D,k)}return N}catch(g){if(g instanceof Le)throw new f(`Unhandled throw: ${b(g.value)}`,{thrownValue:g.value});if(g instanceof ve)throw new f("recur called outside of loop or fn",{args:g.args});if(g instanceof f||g instanceof M){const w=g.pos??(g instanceof f?(h=(p=g.frames)==null?void 0:p[0])==null?void 0:h.pos:void 0);w&&(g.message+=Qn(l,w,{lineOffset:s.currentLineOffset,colOffset:s.currentColOffset})),g instanceof f&&g.frames&&g.frames.length>0&&(g.message+=Yn(g.frames,l,{lineOffset:s.currentLineOffset,colOffset:s.currentColOffset}))}throw g}finally{s.currentSource=void 0,s.currentFile=void 0,s.frameStack=[]}},async evaluateAsync(l,c){var d,m,p,h;s.currentSource=l,s.currentFile=c==null?void 0:c.file,s.currentLineOffset=(c==null?void 0:c.lineOffset)??0,s.currentColOffset=(c==null?void 0:c.colOffset)??0;try{const g=ft(l),w=Lt(g);w&&(t.ensureNamespace(w),r=w,t.syncNsVar(w));const k=t.getNamespaceEnv(r),S=xn(g);(d=k.ns)==null||d.aliases.forEach((P,D)=>{S.set(D,P.name)}),(m=k.ns)==null||m.readerAliases.forEach((P,D)=>{S.set(D,P)});const I=Ut(g,r,S);await t.processNsRequiresAsync(I,k,s);let N=a.nil();for(const P of I){const D=s.expandAll(P,k);N=s.evaluate(D,k)}if(N.kind!=="pending")return N;try{return await N.promise}catch(P){throw P instanceof Le?new f(`Unhandled throw: ${b(P.value)}`,{thrownValue:P.value}):P}}catch(g){if(g instanceof Le)throw new f(`Unhandled throw: ${b(g.value)}`,{thrownValue:g.value});if(g instanceof ve)throw new f("recur called outside of loop or fn",{args:g.args});if(g instanceof f||g instanceof M){const w=g.pos??(g instanceof f?(h=(p=g.frames)==null?void 0:p[0])==null?void 0:h.pos:void 0);w&&(g.message+=Qn(l,w,{lineOffset:s.currentLineOffset,colOffset:s.currentColOffset})),g instanceof f&&g.frames&&g.frames.length>0&&(g.message+=Yn(g.frames,l,{lineOffset:s.currentLineOffset,colOffset:s.currentColOffset}))}throw g}finally{s.currentSource=void 0,s.currentFile=void 0,s.frameStack=[]}},applyFunction(l,c){return s.applyCallable(l,c,Ke())},cljToJs(l){return et(l,{applyFunction:(c,d)=>s.applyCallable(c,d,Ke())})},evaluateForms(l){try{const c=t.getNamespaceEnv(r);let d=a.nil();for(const m of l){const p=s.expandAll(m,c);d=s.evaluate(p,c)}return d}catch(c){throw c instanceof Le?new f(`Unhandled throw: ${b(c.value)}`,{thrownValue:c.value}):c instanceof ve?new f("recur called outside of loop or fn",{args:c.args}):c}},getCompletions(l,c){let d=t.registry.get(c??r)??null;const m=new Set;for(;d;){for(const h of d.bindings.keys())m.add(h);if(d.ns)for(const h of d.ns.vars.keys())m.add(h);d=d.outer}const p=[...m];return l?p.filter(h=>h.startsWith(l)).sort():p.sort()}};return i}function Jm(t){var d;const e=(t==null?void 0:t.modules)??[],n=(t==null?void 0:t.libraries)??[],r=new Map,s=new Map;for(const m of n)for(const[p,h]of Object.entries(m.sources??{})){const g=s.get(p);if(g!==void 0)throw new Error(`Library '${m.id}' tried to register namespace '${p}', already registered by '${g}'.`);r.set(p,h),s.set(p,m.id)}const o=Wm({sourceRoots:t==null?void 0:t.sourceRoots,readFile:t==null?void 0:t.readFile,registeredSources:r.size>0?r:void 0}),i=Km(o,"user",t),l=_r["clojure.core"];if(!l)throw new Error("Missing built-in clojure.core source in registry");i.loadFile(l(),"clojure.core"),e.length>0&&i.runtime.installModules(e);const c=n.flatMap(m=>m.module?[m.module]:[]);if(c.length>0&&i.runtime.installModules(c),t!=null&&t.hostBindings){const m=o.getNamespaceEnv("js");if(m)for(const[p,h]of Object.entries(t.hostBindings)){if((d=m.ns)!=null&&d.vars.has(p))throw new Error(`createSession: hostBindings key '${p}' conflicts with built-in js/${p} — choose a different key`);K(p,oe(h),m)}}for(const m of(t==null?void 0:t.entries)??[])i.loadFile(m);return i}function Gm(t){return Jm({output:t})}function Rs(){const t={session:void 0,history:[],entries:[],outputs:[]};return t.session=Gm(e=>t.outputs.push(e)),t}async function _n(t,e){const n=e.trim();if(!n)return[];t.history.push(n),t.outputs=[];const r=performance.now();try{const s=await t.session.evaluateAsync(n),o=performance.now(),i=[];i.push({kind:"source",text:n});for(const l of t.outputs)i.push({kind:"output",text:l});return i.push({kind:"result",output:b(s),durationMs:o-r}),t.entries.push(...i),i}catch(s){const o=performance.now(),i=Qm(n,s,o-r);return t.entries.push(i),[i]}}function Qm(t,e,n){const r=e instanceof f||e instanceof Error?e.message:String(e);return{kind:"error",source:t,message:r,durationMs:n}}const Ym=`(ns user
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
`,Xm=`(ns user.collections)

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
`,Zm=`(ns user.hof
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
`,ep=`(ns user.destructuring)

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
`,tp=`(ns user.strings-regex
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
`,np=`(ns user.errors)

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
`,rp={class:"pg"},sp={class:"pg-header"},ap={class:"pg-header__actions"},op=["value"],ip={class:"pg-body"},lp={key:0,class:"pg-loading"},cp={class:"pg-quickref"},up=L({__name:"Playground",setup(t){const e=[{label:"Welcome",content:Ym},{label:"Collections",content:Xm},{label:"Higher-Order Fns",content:Zm},{label:"Destructuring",content:ep},{label:"Strings & Regex",content:tp},{label:"Error Handling",content:np}],n=B(),r=B(),s=B(),o=B(),i=B(!0),l=B(!1);let c=null,d=null,m=null,p=0;function h(A,O){const se=document.createElement(A);return O&&(se.className=O),se}function g(A){return A<1?`${Math.round(A*1e3)} µs`:A<10?`${+A.toFixed(2)} ms`:A<100?`${+A.toFixed(1)} ms`:A<1e3?`${Math.round(A)} ms`:`${+(A/1e3).toFixed(2)} s`}function w(A,O,se){const fe=h("div","pg-entry"),Je=h("div","pg-entry__source");Je.textContent=se,fe.appendChild(Je);for(const be of A)if(be.kind==="output"){const ie=h("div","pg-entry__output");ie.textContent=be.text,fe.appendChild(ie)}else if(be.kind==="result"){const ie=h("div","pg-entry__result");ie.textContent=`→ ${be.output} `;const we=h("span","pg-entry__duration");we.textContent=`(${g(be.durationMs)})`,ie.appendChild(we),fe.appendChild(ie)}else if(be.kind==="error"){const ie=h("div","pg-entry__result pg-entry__result--error");ie.textContent=`✗ ${be.message} `;const we=h("span","pg-entry__duration");we.textContent=`(${g(be.durationMs)})`,ie.appendChild(we),fe.appendChild(ie)}O.appendChild(fe)}Me(async()=>{if(!n.value||!s.value||!r.value)return;document.documentElement.classList.add("pg-full-page"),window.MonacoEnvironment={getWorker(Z,ke){return new Worker(new URL("/cljam/assets/editor.worker-CKy7Pnvo.js",import.meta.url),{type:"module"})}};const[A,{registerClojureLanguage:O,defineMonacoTheme:se,THEME_ID:fe},{findFormBeforeCursor:Je}]=await Promise.all([Pt(()=>import("./editor.main.Ml3tWnmV.js"),__vite__mapDeps([2,1])),Pt(()=>import("./clojure-tokens.Co1bCbEI.js"),__vite__mapDeps([3,4])),Pt(()=>import("./find-form.DPvUu3aR.js"),__vite__mapDeps([5,1]))]);O(A),se(A),n.value.addEventListener("keydown",Z=>Z.stopPropagation()),c=A.editor.create(n.value,{value:e[0].content,language:"clojure",theme:fe,fontSize:14,fontFamily:"'JetBrains Mono', 'SF Mono', ui-monospace, monospace",fontLigatures:!0,lineNumbers:"on",minimap:{enabled:!1},scrollBeyondLastLine:!1,automaticLayout:!0,padding:{top:16,bottom:16},renderLineHighlight:"gutter",bracketPairColorization:{enabled:!0},matchBrackets:"always",overviewRulerLanes:0,hideCursorInOverviewRuler:!0,scrollbar:{verticalScrollbarSize:6,horizontalScrollbarSize:6}}),l.value=!0;const be=Rs();function ie(Z,ke,ht){we();const gt=c.getModel();if(!gt)return;const vt=gt.getPositionAt(Math.max(0,Z-1)).lineNumber,yt=gt.getLineMaxColumn(vt),Ge=document.createElement("span");Ge.className=ht?"pg-inline-error":"pg-inline-result",Ge.textContent=`  ⇒ ${ke}`;const jt={getId:()=>"pg.inline",getDomNode:()=>Ge,getPosition:()=>({position:{lineNumber:vt,column:yt},preference:[A.editor.ContentWidgetPositionPreference.EXACT]})};d=jt,c.addContentWidget(jt),m=c.onDidChangeModelContent(()=>we())}function we(){d&&(c.removeContentWidget(d),d=null),m==null||m.dispose(),m=null}async function Is(){const Z=c.getValue();if(!Z.trim())return;const ke=c.getModel(),ht=c.getPosition(),gt=ke&&ht?ke.getOffsetAt(ht):Z.length,at=Je(Z,gt),vt=at?Z.slice(at.start,at.end):Z.trim(),yt=at?at.end:Z.trimEnd().length,Ge=await _n(be,vt);i.value=!1,w(Ge,s.value,vt),r.value.scrollTop=r.value.scrollHeight;const jt=Z.slice(yt).trim().length>0,Wn=Kn=>jt?Kn.split(`
`)[0]:Kn,De=Ge[Ge.length-1];(De==null?void 0:De.kind)==="result"?ie(yt,Wn(De.output),!1):(De==null?void 0:De.kind)==="error"&&ie(yt,Wn(De.message),!0)}async function Un(){const Z=c.getValue();if(!Z.trim())return;we();const ke=await _n(be,Z.trim());i.value=!1,w(ke,s.value,Z.trim()),r.value.scrollTop=r.value.scrollHeight}c.addCommand(A.KeyMod.CtrlCmd|A.KeyCode.Enter,()=>{Is()}),c.addCommand(A.KeyMod.CtrlCmd|A.KeyMod.Shift|A.KeyCode.Enter,()=>{Un()}),k=Un,S=()=>{s.value.innerHTML="",i.value=!0,we()},I=Z=>{const ke=e[Z];if(!ke)return;if(!window.confirm(`Load "${ke.label}"?

Your current edits will be lost.`)){o.value&&(o.value.value=String(p));return}p=Z,c.setValue(ke.content),we()}}),Gt(()=>{document.documentElement.classList.remove("pg-full-page"),m==null||m.dispose(),c&&(c.dispose(),c=null)});let k=null,S=null,I=null;function N(){k==null||k()}function P(){S==null||S()}function D(A){const O=Number(A.target.value);I==null||I(O)}return(A,O)=>(v(),$("div",rp,[_("header",sp,[O[0]||(O[0]=_("div",{class:"pg-header__left"},[_("span",{class:"pg-header__title"},"cljam REPL"),_("span",{class:"pg-header__hint"},[_("kbd",null,"⌘Enter"),Te(" eval form   "),_("kbd",null,"⇧⌘Enter"),Te(" eval all")])],-1)),_("div",ap,[_("select",{class:"pg-btn pg-sample-select",ref_key:"sampleSelectRef",ref:o,onChange:D},[(v(),$(G,null,re(e,(se,fe)=>_("option",{key:fe,value:String(fe)},U(se.label),9,op)),64))],544),_("button",{class:"pg-btn pg-btn--primary",onClick:N,title:"Evaluate the entire editor buffer (Shift+⌘Enter)"},"Run all"),_("button",{class:"pg-btn pg-btn--danger",onClick:P,title:"Clear the output panel"},"Clear output")])]),_("div",ip,[_("div",{class:"pg-editor-wrap",ref_key:"editorWrapRef",ref:n},[l.value?C("",!0):(v(),$("div",lp,"Loading editor…"))],512),_("div",{class:"pg-output",ref_key:"outputRef",ref:r},[_("div",{class:"pg-output-inner",ref_key:"outputInnerRef",ref:s},null,512),vr(_("div",cp,[...O[1]||(O[1]=[Ks('<div class="pg-quickref__section"><div class="pg-quickref__label">Shortcuts</div><div class="pg-quickref__shortcut"><kbd>⌘Enter</kbd><span>eval form at cursor</span></div><div class="pg-quickref__shortcut"><kbd>⇧⌘Enter</kbd><span>eval entire buffer</span></div></div><div class="pg-quickref__section"><div class="pg-quickref__label">Tips</div><ul class="pg-quickref__tips"><li>Place cursor inside any <code>(…)</code> <code>[…]</code> <code>{…}</code> and press <kbd>⌘Enter</kbd> to eval just that form</li><li>Place cursor right after a symbol, keyword, or number to eval an atom</li><li><code>def</code> bindings and <code>atom</code> state persist between evals — same session throughout</li><li>Use the sample dropdown to explore collections, HOFs, destructuring, strings, and error handling</li></ul></div><div class="pg-quickref__section"><div class="pg-quickref__label">Available via require</div><div class="pg-quickref__packages"><code>[clojure.string :as str]</code><code>[clojure.edn :as edn]</code><code>[clojure.math :as math]</code><code>[cljam.schema.core :as s]</code><code>[cljam.date :as date]</code><code>[cljam.integrant :as ig]</code></div></div>',3)])],512),[[Ws,i.value]])],512)])]))}}),dp={class:"mr"},fp={class:"mr-header"},mp={class:"mr-hint"},pp={class:"mr-actions"},hp=["disabled"],gp=["disabled","title"],vp={key:0},yp={key:1},bp={key:2},wp=["rows"],kp={key:0,class:"mr-results"},xp={class:"mr-arrow"},$p={class:"mr-value"},_p={key:0,class:"mr-duration"},qp=L({__name:"MiniRepl",props:{code:{}},setup(t){const e=t,n=B(e.code),r=V(()=>Math.max(3,e.code.split(`
`).length)),s=B(!1),o=B(!1),i=B(!1),l=B(null),c=B(!1),d=B(null),m=B([]),p=B(null),h=V(()=>n.value!==e.code),g=V(()=>!s.value||o.value?"":"editable · ⌘/Ctrl + Enter to run");let w=0,k=null;Me(()=>{k=Rs(),s.value=!0,ut(S)}),Pe(()=>e.code,A=>{n.value=A,ut(S)});function S(){const A=p.value;A&&(A.style.height="auto",A.style.height=`${A.scrollHeight}px`)}function I(){n.value=e.code,ut(S)}function N(A){if(A.key==="Enter"&&(A.metaKey||A.ctrlKey)){A.preventDefault(),P();return}if(A.key==="Tab"&&!A.shiftKey){A.preventDefault();const O=p.value;if(!O)return;const se=O.selectionStart,fe=O.selectionEnd,Je=n.value;n.value=Je.slice(0,se)+"  "+Je.slice(fe),ut(()=>{O.selectionStart=O.selectionEnd=se+2,S()})}}async function P(){if(!(!k||o.value)){o.value=!0,i.value=!0,m.value=[],l.value=null,c.value=!1,d.value=null;try{const A=await _n(k,n.value);for(const O of A)O.kind==="output"?m.value.push({id:w++,text:O.text}):O.kind==="result"?(l.value=O.output,d.value=O.durationMs):O.kind==="error"&&(l.value=O.message,c.value=!0,d.value=O.durationMs)}finally{o.value=!1}}}function D(A){return A<1?`${Math.round(A*1e3)} µs`:A<10?`${A.toFixed(2)} ms`:A<100?`${A.toFixed(1)} ms`:A<1e3?`${Math.round(A)} ms`:`${(A/1e3).toFixed(2)} s`}return(A,O)=>(v(),$("div",dp,[_("div",fp,[O[1]||(O[1]=_("span",{class:"mr-lang"},"cljam",-1)),_("span",mp,U(g.value),1),_("div",pp,[h.value?(v(),$("button",{key:0,type:"button",class:"mr-btn mr-btn--ghost",onClick:I,disabled:o.value,title:"Reset to the original snippet"},"Reset",8,hp)):C("",!0),_("button",{type:"button",class:"mr-btn",onClick:P,disabled:o.value||!s.value,title:s.value?"Evaluate this snippet (Ctrl/Cmd + Enter)":"Loading runtime..."},[o.value?(v(),$("span",vp,"running…")):s.value?(v(),$("span",bp,"▶ Run")):(v(),$("span",yp,"loading…"))],8,gp)])]),vr(_("textarea",{ref_key:"taRef",ref:p,class:"mr-code","onUpdate:modelValue":O[0]||(O[0]=se=>n.value=se),spellcheck:"false",autocapitalize:"off",autocomplete:"off",autocorrect:"off",rows:r.value,onInput:S,onKeydown:N},null,40,wp),[[Js,n.value]]),i.value?(v(),$("div",kp,[(v(!0),$(G,null,re(m.value,se=>(v(),$("div",{key:`p-${se.id}`,class:"mr-line mr-line--print"},U(se.text),1))),128)),l.value!==null?(v(),$("div",{key:0,class:J(["mr-line",{"mr-line--error":c.value}])},[_("span",xp,U(c.value?"✗":"⇒"),1),_("span",$p,U(l.value),1),d.value!==null?(v(),$("span",_p,"("+U(D(d.value))+")",1)):C("",!0)],2)):C("",!0)])):C("",!0)]))}}),Sp=z(qp,[["__scopeId","data-v-dd7091a5"]]),Rp={extends:Rc,enhanceApp({app:t}){t.component("Playground",up),t.component("MiniRepl",Sp)}};export{Rp as R,dl as c,ft as t,H as u};
