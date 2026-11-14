import{r as _,a as U,s as c}from"./toast-WcZTWCaQ.js";import{g as q,c as W,l as R,e as j,a as K,r as O}from"./biometricService-HW8B33Eh.js";import{i as Q,n as z,d as G,o as J,l as V,h as x,e as t,m as T,b as E,s as h,c as f,k as X,a as H,u as Y,p as Z,q as ee}from"./layout-Bo-xb1TQ.js";import{w as M,o as N,c as w}from"./modals-DzvRu_L9.js";let B=[],D=[],L="all",F="",b=null;function te(){const d=document.getElementById("reg-package-select");if(!d)return;const s=D.filter(r=>r.isActive);d.innerHTML='<option value="">No initial subscription (Register profile only)</option>'+s.map(r=>`<option value="${t(r.id)}">${t(r.name)}</option>`).join("")}function $(){const d=document.getElementById("reg-package-select"),s=document.getElementById("reg-duration-select"),r=document.getElementById("reg-price-preview"),e=document.getElementById("reg-subscription-fields");if(!d||!s||!r||!e)return;const i=D.find(u=>u.id===d.value);if(!i){e.classList.add("hidden"),r.textContent="—";return}e.classList.remove("hidden");const l=s.value;r.textContent=x(i.prices[l]??0)}function I(){const d=document.getElementById("members-table-body");if(!d)return;const s=F.trim().toLowerCase(),r=B.filter(e=>{const i=L==="all"||e.status===L,l=!s||e.fullName.toLowerCase().includes(s)||e.memberCode.toLowerCase().includes(s)||e.phone.toLowerCase().includes(s)||e.email.toLowerCase().includes(s);return i&&l});if(r.length===0){d.innerHTML='<tr><td colspan="8" class="empty-state">No members match the current filter.</td></tr>';return}d.innerHTML=r.map(e=>{var u;const i=e.activeSubscription,l=((u=e.latestPayment)==null?void 0:u.status)??"unpaid";return`
        <tr>
          <td class="mono">${t(e.memberCode)}</td>
          <td>
            <div><strong>${t(e.fullName)}</strong></div>
            <div class="section-subtitle">${t(e.email)}</div>
          </td>
          <td class="mono">${t(e.phone)}</td>
          <td class="col-numeric">${e.age}</td>
          <td>${i?`${t(i.packageName)} (${t(T(i.duration))})`:"None"}</td>
          <td class="mono">${i?t(E(i.expiryDate)):"—"}</td>
          <td>
            <span class="${h(e.status)}">${t(f(e.status))}</span>
            <div class="section-subtitle">Payment: ${t(f(l))} · Fingerprints: ${e.biometricCount}</div>
          </td>
          <td>
            <div class="toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" data-action="view" data-id="${t(e.id)}">Profile</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="biometrics" data-id="${t(e.id)}">Fingerprint</button>
            </div>
          </td>
        </tr>
      `}).join("")}async function ae(d){var r,e;b=d;const s=document.getElementById("member-profile-content");if(s){s.innerHTML='<div class="empty-state">Loading member profile...</div>',N("member-profile-modal");try{const i=await X(d),l=i.member,u=i.subscriptions[0];s.innerHTML=`
      <div class="profile-kv-grid">
        <div class="kv-item"><div class="kv-label">Member ID</div><div class="kv-value mono">${t(l.memberCode)}</div></div>
        <div class="kv-item"><div class="kv-label">Full Name</div><div class="kv-value">${t(l.fullName)}</div></div>
        <div class="kv-item"><div class="kv-label">Phone Number</div><div class="kv-value mono">${t(l.phone)}</div></div>
        <div class="kv-item"><div class="kv-label">Age</div><div class="kv-value mono">${l.age}</div></div>
        <div class="kv-item"><div class="kv-label">Account Status</div><div class="kv-value"><span class="${h(l.status)}">${t(f(l.status))}</span></div></div>
        <div class="kv-item"><div class="kv-label">Latest Expiry</div><div class="kv-value mono">${u?t(E(String(u.expiry_date))):"—"}</div></div>
      </div>

      <form id="edit-member-form" class="form-grid mt-16">
        <div class="form-field">
          <label class="form-label" for="edit-full-name">Full Name</label>
          <input id="edit-full-name" name="fullName" class="form-input" value="${t(l.fullName)}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-phone">Phone Number</label>
          <input id="edit-phone" name="phone" class="form-input" value="${t(l.phone)}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-age">Age</label>
          <input id="edit-age" name="age" type="number" min="12" max="110" class="form-input" value="${l.age}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-notes">Admin Notes</label>
          <input id="edit-notes" name="notes" class="form-input" value="${t(l.notes)}" />
        </div>
        <div class="form-field-full toolbar-group">
          <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
          <button type="button" id="toggle-suspend-btn" class="btn btn-secondary btn-sm">
            ${l.status==="suspended"?"Reactivate Membership":"Suspend Membership"}
          </button>
          <button type="button" id="delete-member-btn" class="btn btn-danger btn-sm">Delete Member</button>
        </div>
      </form>

      <div class="mt-20">
        <h3 class="section-title">Subscription History (${i.subscriptions.length})</h3>
        <div class="table-wrap mt-12">
          <table class="data-table">
            <thead>
              <tr><th>Plan</th><th>Duration</th><th>Start</th><th>Expiry</th><th>Status</th><th>Payment</th></tr>
            </thead>
            <tbody>
              ${i.subscriptions.length===0?'<tr><td colspan="6" class="empty-state">No subscriptions recorded.</td></tr>':i.subscriptions.map(o=>`
                  <tr>
                    <td>${t(o.package_name)}</td>
                    <td>${t(T(String(o.duration)))}</td>
                    <td class="mono">${t(E(String(o.start_date)))}</td>
                    <td class="mono">${t(E(String(o.expiry_date)))}</td>
                    <td><span class="${h(String(o.status))}">${t(f(String(o.status)))}</span></td>
                    <td><span class="${h(String(o.payment_status))}">${t(f(String(o.payment_status)))}</span></td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-20">
        <h3 class="section-title">Payment History (${i.payments.length})</h3>
        <div class="table-wrap mt-12">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Method</th><th class="col-numeric">Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              ${i.payments.length===0?'<tr><td colspan="5" class="empty-state">No payments recorded.</td></tr>':i.payments.map(o=>`
                  <tr>
                    <td class="mono">${t(H(String(o.paid_at||o.created_at)))}</td>
                    <td>${t(f(String(o.method)))}</td>
                    <td class="col-numeric">${t(x(Number(o.amount)))}</td>
                    <td><span class="${h(String(o.status))}">${t(f(String(o.status)))}</span></td>
                    <td class="mono">${t(o.reference_no||"—")}</td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;const v=document.getElementById("edit-member-form");v==null||v.addEventListener("submit",async o=>{o.preventDefault();const g=new FormData(v);try{await Y(l.id,{fullName:String(g.get("fullName")||""),phone:String(g.get("phone")||""),age:Number(g.get("age")||0),notes:String(g.get("notes")||"")}),c("Member profile updated","success"),w("member-profile-modal"),await p()}catch(y){c(y instanceof Error?y.message:"Update failed","error")}}),(r=document.getElementById("toggle-suspend-btn"))==null||r.addEventListener("click",async()=>{try{await Z(l.id,l.status==="suspended"?"active":"suspended"),c(l.status==="suspended"?"Member reactivated":"Member suspended","success"),w("member-profile-modal"),await p()}catch(o){c(o instanceof Error?o.message:"Status update failed","error")}}),(e=document.getElementById("delete-member-btn"))==null||e.addEventListener("click",async()=>{try{await ee(l.id),c("Member deleted","success"),w("member-profile-modal"),await p()}catch(o){c(o instanceof Error?o.message:"Delete failed","error")}})}catch(i){s.innerHTML=`<div class="error-banner">${t(i instanceof Error?i.message:"Failed to load profile")}</div>`}}}async function se(d){b=d;const s=B.find(i=>i.id===d),r=document.getElementById("bio-modal-member-name");r&&s&&(r.textContent=`${s.fullName} (${s.memberCode})`);const e=document.getElementById("bio-capability-note");if(e){const i=await W();e.textContent=i.platformAuthenticatorAvailable?"Platform biometric hardware (Touch ID / Windows Hello / FIDO2) detected and ready.":i.webauthnSupported?"WebAuthn API available for external FIDO2 USB fingerprint security keys, or use a connected USB Scanner SDK daemon below.":"WebAuthn unavailable in this browser context; use the USB Scanner SDK bridge below."}await k(d),N("biometric-enroll-modal")}async function k(d){const s=document.getElementById("enrolled-biometrics-list");if(s)try{const r=await R(d);if(r.length===0){s.innerHTML='<div class="empty-state">No hardware fingerprints enrolled for this member yet.</div>';return}s.innerHTML=r.map(e=>`
        <div class="breakdown-row">
          <div>
            <div><strong>${t(e.device_label)}</strong></div>
            <div class="section-subtitle mono">${t(e.provider.toUpperCase())} · ${t(H(e.created_at))}</div>
          </div>
          <button type="button" class="btn btn-danger btn-sm" data-remove-bio="${t(e.id)}">Remove</button>
        </div>
      `).join("")}catch(r){s.innerHTML=`<div class="error-banner">${t(r instanceof Error?r.message:"Unable to load credentials")}</div>`}}async function p(){try{const[d,s]=await Promise.all([J(),V()]);B=d,D=s,te(),$(),I()}catch(d){c(d instanceof Error?d.message:"Failed to load members.","error")}}async function ne(){var i,l,u,v,o,g,y,C,P,A;const d=await _("admin");if(!d)return;Q({user:d,activeNavKey:"members",pageTitle:"Member Directory & Biometric Enrollment"}),M("register-member-modal"),M("member-profile-modal"),M("biometric-enroll-modal"),await p(),U.subscribe(n=>{(n.type==="member:updated"||n.type==="subscription:updated"||n.type==="payment:updated"||n.type==="biometric:updated")&&p()}),(i=document.getElementById("open-register-modal-btn"))==null||i.addEventListener("click",()=>{N("register-member-modal")}),(l=document.getElementById("reg-package-select"))==null||l.addEventListener("change",$),(u=document.getElementById("reg-duration-select"))==null||u.addEventListener("change",$);const s=document.getElementById("register-member-form");s==null||s.addEventListener("submit",async n=>{n.preventDefault();const a=new FormData(s);try{await z({fullName:String(a.get("fullName")||""),email:String(a.get("email")||""),phone:String(a.get("phone")||""),age:Number(a.get("age")||0),notes:String(a.get("notes")||""),accountPassword:String(a.get("accountPassword")||""),packageId:String(a.get("packageId")||"")||void 0,duration:String(a.get("duration")||"1m"),startDate:String(a.get("startDate")||"")||void 0,paymentStatus:String(a.get("paymentStatus")||"paid"),paymentMethod:String(a.get("paymentMethod")||"cash"),referenceNo:String(a.get("referenceNo")||"")}),c("Member registered successfully","success"),s.reset(),$(),w("register-member-modal"),await p()}catch(m){c(m instanceof Error?m.message:"Member registration failed.","error")}}),(v=document.getElementById("member-search-input"))==null||v.addEventListener("input",n=>{F=n.target.value,I()}),(o=document.getElementById("member-status-filters"))==null||o.addEventListener("click",n=>{var m;const a=n.target.closest("[data-status]");if(a){L=a.dataset.status||"all";for(const S of((m=a.parentElement)==null?void 0:m.querySelectorAll(".segment-btn"))||[])S.classList.remove("active");a.classList.add("active"),I()}}),(g=document.getElementById("members-table-body"))==null||g.addEventListener("click",n=>{const a=n.target.closest("[data-action]");!a||!a.dataset.id||(a.dataset.action==="view"?ae(a.dataset.id):a.dataset.action==="biometrics"&&se(a.dataset.id))}),(y=document.getElementById("enroll-webauthn-btn"))==null||y.addEventListener("click",async()=>{if(!b)return;const n=document.getElementById("bio-device-label");try{await j(b,(n==null?void 0:n.value.trim())||"WebAuthn Biometric Sensor"),c("Hardware biometric enrolled via WebAuthn","success"),await k(b),await p()}catch(a){c(a instanceof Error?a.message:"WebAuthn enrollment failed.","error")}});const r=document.getElementById("sdk-provider-select"),e=document.getElementById("sdk-endpoint-input");r==null||r.addEventListener("change",()=>{e&&(e.value=q(r.value))}),(C=document.getElementById("enroll-sdk-btn"))==null||C.addEventListener("click",async()=>{if(!b||!r||!e)return;const n=document.getElementById("bio-device-label");try{await K(b,r.value,e.value.trim(),(n==null?void 0:n.value.trim())||`${r.value.toUpperCase()} Scanner`),c("USB Scanner SDK fingerprint enrolled","success"),await k(b),await p()}catch(a){c(a instanceof Error?a.message:"Scanner SDK enrollment failed.","error")}}),(P=document.getElementById("enrolled-biometrics-list"))==null||P.addEventListener("click",async n=>{const a=n.target.closest("[data-remove-bio]");if(!(!a||!a.dataset.removeBio||!b))try{await O(a.dataset.removeBio),c("Biometric credential removed","success"),await k(b),await p()}catch(m){c(m instanceof Error?m.message:"Failed to remove credential.","error")}}),(A=document.getElementById("export-members-btn"))==null||A.addEventListener("click",()=>{G(`gym-members-${new Date().toISOString().slice(0,10)}.csv`,["Member Code","Full Name","Email","Phone","Age","Status","Active Plan","Expiry Date","Payment Status"],B.map(n=>{var a,m,S;return[n.memberCode,n.fullName,n.email,n.phone,n.age,n.status,((a=n.activeSubscription)==null?void 0:a.packageName)||"None",((m=n.activeSubscription)==null?void 0:m.expiryDate)||"",((S=n.latestPayment)==null?void 0:S.status)||"unpaid"]})),c("Member directory exported","success")})}ne();
