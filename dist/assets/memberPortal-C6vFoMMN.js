import"./components-CVxSCubC.js";import{r as q,i as w,s as g,a as P,u as N,l as T,m as L,n as _,k as m,o as I,c as $,h as v,g as p,e as n,b as B}from"./toast-DjTol1G8.js";import{w as C,o as D,c as x}from"./modals-DzvRu_L9.js";let l=null,S=[],y=null;function H(a){const s=a.member,e=a.subscriptions[0],d=(t,k)=>{const E=document.getElementById(t);E&&(E.textContent=k)};d("portal-member-name",s.fullName),d("portal-member-code",s.memberCode),d("portal-member-phone",s.phone),d("portal-member-age",`${s.age} yrs`),d("portal-sub-name",e?`${String(e.package_name)} (${I(String(e.duration))})`:"No Plan Yet"),d("portal-sub-expiry",e?$(String(e.expiry_date)):"—");const c=document.getElementById("portal-status-badge");c&&(c.className=v(s.status),c.textContent=p(s.status));const r=document.getElementById("portal-payment-badge");if(r){const t=e?String(e.payment_status):"unpaid";r.className=v(t),r.textContent=p(t)}const i=document.getElementById("portal-edit-phone"),o=document.getElementById("portal-edit-age");i&&(i.value=s.phone),o&&(o.value=String(s.age));const u=document.getElementById("portal-subscriptions-body");u&&(a.subscriptions.length===0?u.innerHTML='<tr><td colspan="6" class="empty-state">No subscription history yet. Select a package below to request enrollment.</td></tr>':u.innerHTML=a.subscriptions.map(t=>`
          <tr>
            <td>${n(t.package_name)}</td>
            <td>${n(I(String(t.duration)))}</td>
            <td class="mono">${n($(String(t.start_date)))}</td>
            <td class="mono">${n($(String(t.expiry_date)))}</td>
            <td class="col-numeric">${n(m(Number(t.amount)))}</td>
            <td><span class="${v(String(t.status))}">${n(p(String(t.status)))}</span></td>
          </tr>
        `).join(""));const b=document.getElementById("portal-payments-body");b&&(a.payments.length===0?b.innerHTML='<tr><td colspan="5" class="empty-state">No payments recorded yet.</td></tr>':b.innerHTML=a.payments.map(t=>`
          <tr>
            <td class="mono">${n(B(String(t.paid_at||t.created_at)))}</td>
            <td>${n(p(String(t.method)))}</td>
            <td class="col-numeric">${n(m(Number(t.amount)))}</td>
            <td><span class="${v(String(t.status))}">${n(p(String(t.status)))}</span></td>
            <td class="mono">${n(t.reference_no||"—")}</td>
          </tr>
        `).join(""));const h=document.getElementById("portal-attendance-body");h&&(a.attendance.length===0?h.innerHTML='<tr><td colspan="3" class="empty-state">No gym check-ins recorded yet.</td></tr>':h.innerHTML=a.attendance.map(t=>`
          <tr>
            <td class="mono">${n(B(String(t.scanned_at)))}</td>
            <td>${n(t.device_label)}</td>
            <td><span class="${v(String(t.verification_result))}">${n(p(String(t.verification_result)))}</span></td>
          </tr>
        `).join(""))}function j(){const a=document.getElementById("portal-packages-grid");if(!a)return;const s=S.filter(e=>e.isActive);if(s.length===0){a.innerHTML='<div class="empty-state">No subscription packages currently available.</div>';return}a.innerHTML=s.map(e=>{const d=e.services.map(c=>c.name).join(" · ");return`
        <article class="surface-card">
          <div class="section-header">
            <div>
              <div class="metadata-line">
                <span>${e.isDeal?"Featured Deal":"Membership Plan"}</span>
              </div>
              <h3 class="section-title mt-12">${n(e.name)}</h3>
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-request-pkg="${n(e.id)}">Request Plan</button>
          </div>
          <p class="section-subtitle">${n(e.description||"")}</p>
          <div class="metadata-line mt-12">
            <span>Includes: ${n(d)}</span>
          </div>
          <div class="duration-price-grid">
            <div class="duration-cell"><div class="duration-label">1M</div><div class="duration-price">${n(m(e.prices["1m"]))}</div></div>
            <div class="duration-cell"><div class="duration-label">3M</div><div class="duration-price">${n(m(e.prices["3m"]))}</div></div>
            <div class="duration-cell"><div class="duration-label">6M</div><div class="duration-price">${n(m(e.prices["6m"]))}</div></div>
            <div class="duration-cell"><div class="duration-label">1Y</div><div class="duration-price">${n(m(e.prices["1y"]))}</div></div>
          </div>
        </article>
      `}).join("")}function M(){const a=document.getElementById("req-duration-select"),s=document.getElementById("req-price-preview");if(!a||!s||!y)return;const e=a.value;s.textContent=m(y.prices[e]??0)}async function f(){if(l)try{const[a,s]=await Promise.all([L(l),_()]);S=s,H(a),j()}catch(a){g(a instanceof Error?a.message:"Unable to load member portal data.","error")}}async function R(){var d,c;const a=await q("member");if(!a)return;if(l=a.memberId,w({user:a,activeNavKey:"member-portal",pageTitle:"My Membership & Billing Portal"}),C("request-plan-modal"),!l){g("No member profile linked to this account. Contact front desk.","error");return}await f(),P.subscribe(r=>{(r.type==="package:updated"||r.type==="service:updated"||r.memberId===l||r.memberId==="*")&&f()});const s=document.getElementById("portal-contact-form");s==null||s.addEventListener("submit",async r=>{if(r.preventDefault(),!l)return;const i=new FormData(s);try{await N(l,{phone:String(i.get("phone")||""),age:Number(i.get("age")||0)}),g("Contact details updated","success"),await f()}catch(o){g(o instanceof Error?o.message:"Failed to update contact details.","error")}}),(d=document.getElementById("portal-packages-grid"))==null||d.addEventListener("click",r=>{const i=r.target.closest("[data-request-pkg]");if(!(i!=null&&i.dataset.requestPkg))return;const o=S.find(b=>b.id===i.dataset.requestPkg);if(!o)return;y=o;const u=document.getElementById("req-package-name");u&&(u.textContent=o.name),M(),D("request-plan-modal")}),(c=document.getElementById("req-duration-select"))==null||c.addEventListener("change",M);const e=document.getElementById("request-plan-form");e==null||e.addEventListener("submit",async r=>{if(r.preventDefault(),!y)return;const i=new FormData(e);try{await T({packageId:y.id,duration:String(i.get("duration")||"1m"),paymentMethod:String(i.get("paymentMethod")||"transfer"),referenceNo:String(i.get("referenceNo")||"")}),g("Renewal / plan request submitted for Admin approval","success"),e.reset(),x("request-plan-modal"),await f()}catch(o){g(o instanceof Error?o.message:"Unable to submit request.","error")}})}R();
