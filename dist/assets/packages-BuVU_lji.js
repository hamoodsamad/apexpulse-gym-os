import{r as P,a as $,s as n}from"./toast-grLgSogJ.js";import{i as w,r as D,t as C,v as L,w as M,x as A,y as B,l as T,e as i,h as v}from"./layout-BTtqNsx0.js";import{w as h,o as S,c as E}from"./modals-DzvRu_L9.js";let y=[],b=[],g=null;function N(){const e=document.getElementById("services-table-body");if(e){if(y.length===0){e.innerHTML='<tr><td colspan="4" class="empty-state">No services defined yet.</td></tr>';return}e.innerHTML=y.map(t=>`
      <tr>
        <td><strong>${i(t.name)}</strong></td>
        <td>${i(t.description||"—")}</td>
        <td><span class="status-tag ${t.isActive?"status-valid":"status-neutral"}">${t.isActive?"Active":"Disabled"}</span></td>
        <td>
          <button type="button" class="btn btn-danger btn-sm" data-delete-service="${i(t.id)}">Remove</button>
        </td>
      </tr>
    `).join("")}}function x(){const e=document.getElementById("packages-catalog-grid");if(e){if(b.length===0){e.innerHTML='<div class="empty-state">No packages configured yet.</div>';return}e.innerHTML=b.map(t=>{const a=t.services.map(m=>m.name).join(" · ")||"No services attached",l=t.category==="gym_only"?"Gym Only":t.category==="cardio_only"?"Cardio Only":t.category==="gym_cardio"?"Gym + Cardio":t.isDeal?"Special Deal":"Custom Package";return`
        <article class="surface-card">
          <div class="section-header">
            <div>
              <div class="metadata-line">
                <span>${i(l)}</span>
                <span aria-hidden="true">·</span>
                <span>${t.isActive?"Active":"Archived"}</span>
              </div>
              <h3 class="section-title mt-12">${i(t.name)}</h3>
            </div>
            <div class="toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" data-edit-package="${i(t.id)}">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" data-delete-package="${i(t.id)}">Delete</button>
            </div>
          </div>
          <p class="section-subtitle">${i(t.description||"Configurable multi-duration gym membership plan.")}</p>
          <div class="metadata-line mt-12">
            <span>Services: ${i(a)}</span>
          </div>
          <div class="duration-price-grid">
            <div class="duration-cell">
              <div class="duration-label">1 Month</div>
              <div class="duration-price">${i(v(t.prices["1m"]))}</div>
            </div>
            <div class="duration-cell">
              <div class="duration-label">3 Months</div>
              <div class="duration-price">${i(v(t.prices["3m"]))}</div>
            </div>
            <div class="duration-cell">
              <div class="duration-label">6 Months</div>
              <div class="duration-price">${i(v(t.prices["6m"]))}</div>
            </div>
            <div class="duration-cell">
              <div class="duration-label">1 Year</div>
              <div class="duration-price">${i(v(t.prices["1y"]))}</div>
            </div>
          </div>
        </article>
      `}).join("")}}function H(e){const t=document.getElementById("pkg-services-checkboxes");t&&(t.innerHTML=y.map(a=>`
      <label class="checkbox-item">
        <input type="checkbox" name="serviceIds" value="${i(a.id)}" ${e.includes(a.id)?"checked":""} />
        <span>${i(a.name)}</span>
      </label>
    `).join(""))}function I(e){g=(e==null?void 0:e.id)??null;const t=document.getElementById("package-modal-title"),a=document.getElementById("package-form");!a||!t||(t.textContent=e?`Edit Package — ${e.name}`:"Create Custom Package / Deal",a.elements.namedItem("name").value=(e==null?void 0:e.name)??"",a.elements.namedItem("category").value=(e==null?void 0:e.category)??"custom_deal",a.elements.namedItem("description").value=(e==null?void 0:e.description)??"",a.elements.namedItem("isDeal").checked=(e==null?void 0:e.isDeal)??!0,a.elements.namedItem("price1m").value=String((e==null?void 0:e.prices["1m"])??0),a.elements.namedItem("price3m").value=String((e==null?void 0:e.prices["3m"])??0),a.elements.namedItem("price6m").value=String((e==null?void 0:e.prices["6m"])??0),a.elements.namedItem("price1y").value=String((e==null?void 0:e.prices["1y"])??0),H((e==null?void 0:e.serviceIds)??[]),S("package-modal"))}async function o(){try{const[e,t]=await Promise.all([B(),T()]);y=e,b=t,N(),x()}catch(e){n(e instanceof Error?e.message:"Failed to load packages catalog.","error")}}async function _(){var l,m,f,p;const e=await P("admin");if(!e)return;w({user:e,activeNavKey:"packages",pageTitle:"Services, Subscription Plans & Custom Deals"}),h("service-modal"),h("package-modal"),await o(),$.subscribe(r=>{(r.type==="package:updated"||r.type==="service:updated")&&o()}),(l=document.getElementById("open-service-modal-btn"))==null||l.addEventListener("click",()=>{S("service-modal")}),(m=document.getElementById("open-package-modal-btn"))==null||m.addEventListener("click",()=>{I()});const t=document.getElementById("service-form");t==null||t.addEventListener("submit",async r=>{r.preventDefault();const s=new FormData(t);try{await D(String(s.get("name")||""),String(s.get("description")||"")),n("Custom service created","success"),t.reset(),E("service-modal"),await o()}catch(c){n(c instanceof Error?c.message:"Failed to create service.","error")}}),(f=document.getElementById("services-table-body"))==null||f.addEventListener("click",async r=>{const s=r.target.closest("[data-delete-service]");if(!(!s||!s.dataset.deleteService))try{await C(s.dataset.deleteService),n("Service removed","success"),await o()}catch(c){n(c instanceof Error?c.message:"Unable to remove service.","error")}}),(p=document.getElementById("packages-catalog-grid"))==null||p.addEventListener("click",async r=>{const s=r.target.closest("[data-edit-package]");if(s!=null&&s.dataset.editPackage){const d=b.find(u=>u.id===s.dataset.editPackage);d&&I(d);return}const c=r.target.closest("[data-delete-package]");if(c!=null&&c.dataset.deletePackage)try{await L(c.dataset.deletePackage),n("Package removed or archived","success"),await o()}catch(d){n(d instanceof Error?d.message:"Unable to delete package.","error")}});const a=document.getElementById("package-form");a==null||a.addEventListener("submit",async r=>{r.preventDefault();const s=new FormData(a),c=s.getAll("serviceIds").map(String);if(c.length===0){n("Select at least one gym service for this package.","error");return}const d={name:String(s.get("name")||""),category:String(s.get("category")||"custom_deal"),description:String(s.get("description")||""),isDeal:a.elements.namedItem("isDeal").checked,serviceIds:c,prices:{"1m":Number(s.get("price1m")||0),"3m":Number(s.get("price3m")||0),"6m":Number(s.get("price6m")||0),"1y":Number(s.get("price1y")||0)}};try{g?(await M(g,{...d,isActive:!0}),n("Package pricing and services updated","success")):(await A(d),n("Custom package created","success")),E("package-modal"),await o()}catch(u){n(u instanceof Error?u.message:"Failed to save package.","error")}})}_();
