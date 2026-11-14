import{e as n,h as v,a as w}from"./toast-WcZTWCaQ.js";async function D(){return n("/api/analytics/dashboard")}async function I(){return(await n("/api/members")).members}async function R(e){return n(`/api/members/${encodeURIComponent(e)}`)}async function $(e){return n("/api/members",{method:"POST",body:JSON.stringify(e)})}async function j(e,t){await n(`/api/members/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(t)})}async function B(e,t){await n(`/api/members/${encodeURIComponent(e)}/status`,{method:"POST",body:JSON.stringify({status:t})})}async function H(e){await n(`/api/members/${encodeURIComponent(e)}`,{method:"DELETE"})}async function J(){return(await n("/api/services")).services}async function V(e,t){await n("/api/services",{method:"POST",body:JSON.stringify({name:e,description:t})})}async function _(e){await n(`/api/services/${encodeURIComponent(e)}`,{method:"DELETE"})}async function F(){return(await n("/api/packages")).packages}async function q(e){await n("/api/packages",{method:"POST",body:JSON.stringify(e)})}async function G(e,t){await n(`/api/packages/${encodeURIComponent(e)}`,{method:"PUT",body:JSON.stringify(t)})}async function K(e){await n(`/api/packages/${encodeURIComponent(e)}`,{method:"DELETE"})}async function z(){return(await n("/api/subscriptions")).subscriptions}async function Z(e){await n("/api/subscriptions",{method:"POST",body:JSON.stringify(e)})}async function Y(e,t){await n(`/api/subscriptions/${encodeURIComponent(e)}/renew`,{method:"POST",body:JSON.stringify(t)})}async function Q(){return(await n("/api/payments")).payments}async function W(e){await n(`/api/payments/${encodeURIComponent(e)}/confirm`,{method:"POST"})}async function X(e){await n(`/api/payments/${encodeURIComponent(e)}/reject`,{method:"POST"})}async function ee(){return(await n("/api/attendance")).attendance}/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=([e,t,a])=>{const c=document.createElementNS("http://www.w3.org/2000/svg",e);return Object.keys(t).forEach(s=>{c.setAttribute(s,String(t[s]))}),a!=null&&a.length&&a.forEach(s=>{const i=b(s);c.appendChild(i)}),c},p=(e,t={})=>{const c={...x,...t};return b(["svg",c,e])};/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"m9 14 2 2 4-4"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=[["path",{d:"M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"}],["path",{d:"M14 13.12c0 2.38 0 6.38-1 8.88"}],["path",{d:"M17.29 21.02c.12-.6.43-2.3.5-3.02"}],["path",{d:"M2 12a10 10 0 0 1 18-6"}],["path",{d:"M2 16h.01"}],["path",{d:"M21.8 16c.2-2 .131-5.354 0-6"}],["path",{d:"M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"}],["path",{d:"M8.65 22c.21-.66.45-1.32.57-2"}],["path",{d:"M9 6.8a6 6 0 0 1 9 5.2v2"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}],["polyline",{points:"16 17 21 12 16 7"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=[["line",{x1:"4",x2:"20",y1:"12",y2:"12"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"}],["path",{d:"M12 22V12"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["path",{d:"m7.5 4.27 9 5.15"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["polyline",{points:"16 11 18 13 22 9"}]];/**
 * @license lucide v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75"}]];function f(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function te(e){const t=Number(e||0);return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(t)}function ne(e){switch(e){case"1m":return"1 Month";case"3m":return"3 Months";case"6m":return"6 Months";case"1y":return"1 Year";default:return String(e).toUpperCase()}}function ae(e){if(!e)return"—";const t=e.slice(0,10),a=new Date(`${t}T00:00:00Z`);return Number.isNaN(a.getTime())?e:a.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"})}function se(e){if(!e)return"—";const t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function ce(e){switch(e){case"active":case"valid":case"confirmed":case"paid":return"status-tag status-valid";case"expired":case"unpaid":case"rejected":case"cancelled":return"status-tag status-danger";case"suspended":case"pending":case"pending_approval":return"status-tag status-warning";default:return"status-tag status-neutral"}}function re(e){return String(e||"unknown").replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function ie(e,t,a){const c=d=>{const r=String(d??"");return r.includes(",")||r.includes('"')||r.includes(`
`)?`"${r.replace(/"/g,'""')}"`:r},s=[t.map(c).join(","),...a.map(d=>d.map(c).join(","))],i=new Blob([s.join(`
`)],{type:"text/csv;charset=utf-8;"}),m=URL.createObjectURL(i),o=document.createElement("a");o.href=m,o.download=e,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(m)}const P=[{href:"/index-dashboard.html",label:"Dashboard",key:"dashboard",icon:M},{href:"/index-members.html",label:"Members",key:"members",icon:U},{href:"/index-scanner.html",label:"Scanner Terminal",key:"scanner",icon:E},{href:"/index-packages.html",label:"Plans & Deals",key:"packages",icon:T},{href:"/index-payments.html",label:"Payments",key:"payments",icon:S},{href:"/index-attendance.html",label:"Attendance",key:"attendance",icon:C}],O=[{href:"/index-member-portal.html",label:"My Membership",key:"member-portal",icon:L}];function oe(e){const t=document.getElementById("app-sidebar"),a=document.getElementById("sidebar-backdrop"),c=document.getElementById("topbar-left");if(t){const s=e.user.role==="admin"?P:O;t.innerHTML="";const i=document.createElement("div"),m=document.createElement("div");m.className="sidebar-brand",m.textContent="ApexPulse Gym OS",i.appendChild(m);const o=document.createElement("nav");o.className="sidebar-nav",o.setAttribute("aria-label","Primary navigation");for(const u of s){const l=document.createElement("a");l.href=u.href,l.className=`nav-link${u.key===e.activeNavKey?" active":""}`;const g=p(u.icon,{class:"nav-icon","aria-hidden":"true"}),y=document.createElement("span");y.textContent=u.label,l.appendChild(g),l.appendChild(y),o.appendChild(l)}i.appendChild(o),t.appendChild(i);const d=document.createElement("div");d.className="sidebar-footer",d.innerHTML=`
      <div class="sidebar-user">
        <div class="sidebar-user-name">${f(e.user.fullName)}</div>
        <div class="sidebar-user-meta">${f(e.user.role==="admin"?"Administrator":"Member Account")}</div>
      </div>
    `;const r=document.createElement("button");r.type="button",r.className="btn btn-ghost btn-sm",r.appendChild(p(k,{class:"nav-icon","aria-hidden":"true"}));const h=document.createElement("span");h.textContent="Sign Out",r.appendChild(h),r.addEventListener("click",()=>{v()}),d.appendChild(r),t.appendChild(d)}if(c){c.innerHTML="";const s=document.createElement("button");s.type="button",s.className="mobile-menu-btn",s.setAttribute("aria-label","Open navigation menu"),s.appendChild(p(N,{class:"nav-icon","aria-hidden":"true"})),s.addEventListener("click",()=>{t==null||t.classList.toggle("open"),a==null||a.classList.toggle("open")}),a==null||a.addEventListener("click",()=>{t==null||t.classList.remove("open"),a==null||a.classList.remove("open")});const i=document.createElement("h1");i.className="topbar-title",i.textContent=e.pageTitle,c.appendChild(s),c.appendChild(i)}w.connect()}export{W as A,X as B,Q as C,z as D,se as a,ae as b,re as c,ie as d,f as e,ee as f,D as g,te as h,oe as i,Z as j,R as k,F as l,ne as m,$ as n,I as o,B as p,H as q,V as r,ce as s,_ as t,j as u,K as v,G as w,q as x,J as y,Y as z};
