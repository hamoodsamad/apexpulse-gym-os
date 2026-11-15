var B=Object.defineProperty;var D=(e,t,n)=>t in e?B(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var h=(e,t,n)=>D(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(a){if(a.ep)return;a.ep=!0;const r=n(a);fetch(a.href,r)}})();const w="apexpulse_session_token";function L(){return sessionStorage.getItem(w)}function b(e){sessionStorage.setItem(w,e)}function U(){sessionStorage.removeItem(w)}class H extends Error{constructor(n,s){super(n);h(this,"status");this.status=s}}async function m(e,t={}){const n=L(),s=new Headers(t.headers||{});!s.has("Content-Type")&&t.body&&s.set("Content-Type","application/json"),n&&s.set("Authorization",`Bearer ${n}`);const a=await fetch(e,{...t,headers:s,credentials:"include"}),r=await a.text();let o={};if(r)try{o=JSON.parse(r)}catch{o={error:r}}if(!a.ok){const i=typeof o.error=="string"?o.error:`Request failed (${a.status})`;throw new H(i,a.status)}return o}class F{constructor(){h(this,"listeners",new Set);h(this,"pollTimer",null);h(this,"lastStamp",null);h(this,"running",!1);h(this,"isFetching",!1);h(this,"handleVisibilityChange",()=>{!document.hidden&&this.running&&this.checkForUpdates()})}emit(t){const n={type:t,memberId:"*",timestamp:new Date().toISOString()};for(const s of this.listeners)s(n)}async checkForUpdates(){if(!(!this.running||this.isFetching||document.hidden)&&L()){this.isFetching=!0;try{const{stamp:t}=await m("/api/sync/stamp");if(!this.lastStamp){this.lastStamp=t;return}const n=[["members","member:updated"],["subscriptions","subscription:updated"],["payments","payment:updated"],["packages","package:updated"],["services","service:updated"],["attendance","attendance:recorded"],["biometrics","biometric:updated"]];for(const[s,a]of n)this.lastStamp[s]!==t[s]&&this.emit(a);this.lastStamp=t}catch{}finally{this.isFetching=!1}}}connect(){this.running||(this.running=!0,this.checkForUpdates(),this.pollTimer=window.setInterval(()=>{this.checkForUpdates()},5e3),document.addEventListener("visibilitychange",this.handleVisibilityChange))}subscribe(t){return this.listeners.add(t),()=>{this.listeners.delete(t)}}disconnect(){this.running=!1,this.lastStamp=null,this.pollTimer!==null&&(window.clearInterval(this.pollTimer),this.pollTimer=null),document.removeEventListener("visibilitychange",this.handleVisibilityChange)}}const T=new F;async function le(){return m("/api/auth/status")}async function ue(e){const t=await m("/api/auth/setup-admin",{method:"POST",body:JSON.stringify(e)});return b(t.token),t.user}async function me(e,t){const n=await m("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:t})});return b(n.token),n.user}async function pe(e){const t=await m("/api/auth/register",{method:"POST",body:JSON.stringify(e)});return b(t.token),t.user}async function A(e){const t=await m("/api/auth/demo",{method:"POST",body:JSON.stringify({role:e})});return b(t.token),t.user}async function S(e){const t=await A(e);j(t)}async function R(e,t){await m("/api/auth/change-password",{method:"POST",body:JSON.stringify({currentPassword:e,newPassword:t})})}async function he(e,t,n){await m("/api/auth/forgot-reset-password",{method:"POST",body:JSON.stringify({email:e,verificationSecret:t,newPassword:n})})}async function V(){try{await m("/api/auth/logout",{method:"POST"})}finally{U(),T.disconnect(),window.location.href="/index-login.html?switch=1"}}async function q(){try{return(await m("/api/auth/me")).user}catch{return null}}async function fe(e){let t=await q();if(!t)try{t=await A(e)}catch{return window.location.href="/index-login.html",null}return e==="admin"&&t.role!=="admin"?(window.location.href="/index-member-portal.html",null):t}function j(e){e.role==="admin"?window.location.href="/index-dashboard.html":window.location.href="/index-member-portal.html"}/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=([e,t,n])=>{const s=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(t).forEach(a=>{s.setAttribute(a,String(t[a]))}),n!=null&&n.length&&n.forEach(a=>{const r=P(a);s.appendChild(r)}),s},u=(e,t={})=>{const s={..._,...t};return P(["svg",s,e])};/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"m12 19-7-7 7-7"}],["path",{d:"M19 12H5"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"m9 14 2 2 4-4"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"}],["path",{d:"m2 2 20 20"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"}],["circle",{cx:"12",cy:"12",r:"3"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["path",{d:"M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"}],["path",{d:"M14 13.12c0 2.38 0 6.38-1 8.88"}],["path",{d:"M17.29 21.02c.12-.6.43-2.3.5-3.02"}],["path",{d:"M2 12a10 10 0 0 1 18-6"}],["path",{d:"M2 16h.01"}],["path",{d:"M21.8 16c.2-2 .131-5.354 0-6"}],["path",{d:"M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"}],["path",{d:"M8.65 22c.21-.66.45-1.32.57-2"}],["path",{d:"M9 6.8a6 6 0 0 1 9 5.2v2"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}],["polyline",{points:"16 17 21 12 16 7"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=[["line",{x1:"4",x2:"20",y1:"12",y2:"12"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"}],["path",{d:"M12 22V12"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["path",{d:"m7.5 4.27 9 5.15"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["polyline",{points:"16 11 18 13 22 9"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}],["circle",{cx:"12",cy:"7",r:"4"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75"}]];function ae(e){const t=document.getElementById(e);if(!t)return;t.classList.remove("hidden");const n=t.querySelector("input, select, textarea, button");n&&n.focus()}function y(e){const t=document.getElementById(e);t&&t.classList.add("hidden")}function se(e){const t=document.getElementById(e);if(!t)return;t.addEventListener("click",s=>{s.target===t&&y(e)});const n=t.querySelectorAll("[data-close-modal]");for(const s of n)s.addEventListener("click",()=>y(e))}function re(){let e=document.getElementById("toast-stack");return e||(e=document.createElement("div"),e.id="toast-stack",e.className="toast-stack",e.setAttribute("aria-live","polite"),document.body.appendChild(e)),e}function k(e,t="info"){const n=re(),s=document.createElement("div");s.className=`toast-item${t==="error"?" toast-error":t==="success"?" toast-success":""}`,s.setAttribute("role","status"),s.textContent=e,n.appendChild(s),window.setTimeout(()=>{s.remove()},3800)}function M(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ge(e){const t=Number(e||0);return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(t)}function be(e){switch(e){case"1m":return"1 Month";case"3m":return"3 Months";case"6m":return"6 Months";case"1y":return"1 Year";default:return String(e).toUpperCase()}}function ye(e){if(!e)return"—";const t=e.slice(0,10),n=new Date(`${t}T00:00:00Z`);return Number.isNaN(n.getTime())?e:n.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"})}function we(e){if(!e)return"—";const t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function ve(e){switch(e){case"active":case"valid":case"confirmed":case"paid":return"status-tag status-valid";case"expired":case"unpaid":case"rejected":case"cancelled":return"status-tag status-danger";case"suspended":case"pending":case"pending_approval":return"status-tag status-warning";case"frozen":return"status-tag status-frozen";default:return"status-tag status-neutral"}}function Ce(e){return String(e||"unknown").replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Se(e,t,n){const s=d=>{const c=String(d??"");return c.includes(",")||c.includes('"')||c.includes(`
`)?`"${c.replace(/"/g,'""')}"`:c},a=[t.map(s).join(","),...n.map(d=>d.map(s).join(","))],r=new Blob([a.join(`
`)],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(r),i=document.createElement("a");i.href=o,i.download=e,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(o)}const N="https://my-portfolio-czuhuqnne-hamoodsamad0321-6526.vercel.app",oe=[{href:"/index-dashboard.html",label:"Dashboard",key:"dashboard",icon:Y},{href:"/index-members.html",label:"Members",key:"members",icon:ne},{href:"/index-scanner.html",label:"Scanner Terminal",key:"scanner",icon:K},{href:"/index-packages.html",label:"Plans & Deals",key:"packages",icon:W},{href:"/index-payments.html",label:"Payments",key:"payments",icon:z},{href:"/index-attendance.html",label:"Attendance",key:"attendance",icon:$}],ie=[{href:"/index-member-portal.html",label:"My Membership",key:"member-portal",icon:ee}];function O(e=document){const t=e.querySelectorAll("[data-toggle-password]");for(const n of t)n.dataset.wired!=="1"&&(n.dataset.wired="1",n.innerHTML="",n.appendChild(u(E,{"aria-hidden":"true"})),n.addEventListener("click",()=>{const s=n.dataset.togglePassword;if(!s)return;const a=document.getElementById(s);if(!a)return;const r=a.type==="password";a.type=r?"text":"password",n.setAttribute("aria-label",r?"Hide password":"Show password"),n.innerHTML="",n.appendChild(u(r?J:E,{"aria-hidden":"true"}))}))}function ce(){if(document.getElementById("global-change-password-modal"))return;const e=document.createElement("div");e.id="global-change-password-modal",e.className="modal-overlay hidden",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-labelledby","chg-pwd-title"),e.innerHTML=`
    <div class="modal-panel">
      <div class="modal-header">
        <h2 id="chg-pwd-title" class="section-title">Change Account Password</h2>
        <button type="button" class="btn btn-secondary btn-sm" data-close-modal>Close</button>
      </div>
      <form id="global-change-password-form" class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label" for="chg-current-pwd">Current Password</label>
          <div class="password-field-wrap">
            <input id="chg-current-pwd" name="currentPassword" type="password" class="form-input" required />
            <button type="button" class="password-toggle-btn" data-toggle-password="chg-current-pwd" aria-label="Show password"></button>
          </div>
        </div>
        <div class="form-field form-field-full">
          <label class="form-label" for="chg-new-pwd">New Password (minimum 8 characters)</label>
          <div class="password-field-wrap">
            <input id="chg-new-pwd" name="newPassword" type="password" minlength="8" class="form-input" required />
            <button type="button" class="password-toggle-btn" data-toggle-password="chg-new-pwd" aria-label="Show password"></button>
          </div>
        </div>
        <div class="modal-footer form-field-full">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Update Password</button>
        </div>
      </form>
    </div>
  `,document.body.appendChild(e),se("global-change-password-modal"),O(e);const t=document.getElementById("global-change-password-form");t==null||t.addEventListener("submit",async n=>{n.preventDefault();const s=new FormData(t);try{await R(String(s.get("currentPassword")||""),String(s.get("newPassword")||"")),k("Password updated successfully","success"),t.reset(),y("global-change-password-modal")}catch(a){k(a instanceof Error?a.message:"Unable to update password.","error")}})}function xe(e){const t=document.getElementById("app-sidebar"),n=document.getElementById("sidebar-backdrop"),s=document.getElementById("topbar-left");if(t){const a=e.user.role==="admin"?oe:ie;t.innerHTML="";const r=document.createElement("div"),o=document.createElement("div");o.className="sidebar-brand",o.textContent="ApexPulse Gym OS",r.appendChild(o);const i=document.createElement("a");i.href=N,i.className="portfolio-back-link",i.appendChild(u(x,{class:"nav-icon","aria-hidden":"true"}));const d=document.createElement("span");d.textContent="Back to Portfolio",i.appendChild(d),r.appendChild(i);const c=document.createElement("nav");c.className="sidebar-nav",c.setAttribute("aria-label","Primary navigation");for(const l of a){const p=document.createElement("a");p.href=l.href,p.className=`nav-link${l.key===e.activeNavKey?" active":""}`;const I=u(l.icon,{class:"nav-icon","aria-hidden":"true"}),C=document.createElement("span");C.textContent=l.label,p.appendChild(I),p.appendChild(C),c.appendChild(p)}r.appendChild(c),t.appendChild(r);const g=document.createElement("div");if(g.className="sidebar-footer",g.innerHTML=`
      <div class="sidebar-user">
        <div class="sidebar-user-name">${M(e.user.fullName)}</div>
        <div class="sidebar-user-meta">${M(e.user.isDemo?"Read-Only Portfolio Demo":e.user.role==="admin"?"Administrator (Full Access)":"Member Account")}</div>
      </div>
    `,!e.user.isDemo){ce();const l=document.createElement("button");l.type="button",l.className="btn btn-ghost btn-sm",l.appendChild(u(G,{class:"nav-icon","aria-hidden":"true"}));const p=document.createElement("span");p.textContent="Change Password",l.appendChild(p),l.addEventListener("click",()=>{ae("global-change-password-modal")}),g.appendChild(l)}const f=document.createElement("button");f.type="button",f.className="btn btn-ghost btn-sm",f.appendChild(u(Z,{class:"nav-icon","aria-hidden":"true"}));const v=document.createElement("span");v.textContent=e.user.isDemo?"Admin / Member Login":"Sign Out",f.appendChild(v),f.addEventListener("click",()=>{V()}),g.appendChild(f),t.appendChild(g)}if(s){s.innerHTML="";const a=document.createElement("button");a.type="button",a.className="mobile-menu-btn",a.setAttribute("aria-label","Open navigation menu"),a.appendChild(u(Q,{class:"nav-icon","aria-hidden":"true"})),a.addEventListener("click",()=>{t==null||t.classList.toggle("open"),n==null||n.classList.toggle("open")}),n==null||n.addEventListener("click",()=>{t==null||t.classList.remove("open"),n==null||n.classList.remove("open")});const r=document.createElement("h1");r.className="topbar-title",r.textContent=e.pageTitle;const o=document.createElement("div");o.className="role-switcher-group",o.setAttribute("role","group"),o.setAttribute("aria-label","Switch portal view");const i=document.createElement("button");i.type="button",i.className=`role-switch-btn${e.user.role==="admin"?" active":""}`,i.appendChild(u(X,{class:"nav-icon","aria-hidden":"true"})),i.appendChild(document.createTextNode("Admin View")),i.addEventListener("click",()=>{e.user.role!=="admin"&&S("admin")});const d=document.createElement("button");d.type="button",d.className=`role-switch-btn${e.user.role==="member"?" active":""}`,d.appendChild(u(te,{class:"nav-icon","aria-hidden":"true"})),d.appendChild(document.createTextNode("Member View")),d.addEventListener("click",()=>{e.user.role!=="member"&&S("member")}),o.appendChild(i),o.appendChild(d);const c=document.createElement("a");c.href=N,c.className="topbar-portfolio-btn",c.appendChild(u(x,{class:"nav-icon","aria-hidden":"true"})),c.appendChild(document.createTextNode("Portfolio")),s.appendChild(a),s.appendChild(r),s.appendChild(o),s.appendChild(c)}if(e.user.isDemo&&!document.getElementById("demo-readonly-banner")){const a=document.querySelector(".main-viewport"),r=a==null?void 0:a.querySelector(".topbar");if(a&&r){const o=document.createElement("div");o.id="demo-readonly-banner",o.className="demo-readonly-banner",o.innerHTML=`
        <span>Portfolio Preview (Read-Only Demo): Visitors can explore all pages &amp; analytics, while adding, editing, or deleting is locked.</span>
        <a href="/index-login.html?switch=1" class="btn btn-secondary btn-sm">Admin Sign In</a>
      `,r.insertAdjacentElement("afterend",o)}}O(document),T.connect()}export{T as a,ye as b,Ce as c,Se as d,M as e,we as f,ve as g,ge as h,xe as i,q as j,j as k,le as l,A as m,ue as n,me as o,pe as p,he as q,fe as r,k as s,se as t,ae as u,y as v,O as w,be as x,m as y};
