import{r as W,i as j,w as q,t as I,a as K,u as P,s as l,v as $,b as S,d as O,h as F,e as t,x,g as M,c as w,f as T}from"./layout-Iys708Ms.js";import{g as Q,c as G,l as J,e as V,a as X,r as Y}from"./biometricService-Dv5uUPpu.js";import{e as Z,g as H,h as _,i as U,j as ee,d as te,b as ae,u as ne,s as se}from"./gymService-C6eyi2AL.js";let B=[],A=[],z="all",R="",g=null;function re(){const d=document.getElementById("reg-package-select");if(!d)return;const s=A.filter(i=>i.isActive);d.innerHTML='<option value="">No initial subscription (Register profile only)</option>'+s.map(i=>`<option value="${t(i.id)}">${t(i.name)}</option>`).join("")}function L(){const d=document.getElementById("reg-package-select"),s=document.getElementById("reg-duration-select"),i=document.getElementById("reg-price-preview"),e=document.getElementById("reg-subscription-fields");if(!d||!s||!i||!e)return;const o=A.find(m=>m.id===d.value);if(!o){e.classList.add("hidden"),i.textContent="—";return}e.classList.remove("hidden");const f=s.value;i.textContent=F(o.prices[f]??0)}function C(){const d=document.getElementById("members-table-body");if(!d)return;const s=R.trim().toLowerCase(),i=B.filter(e=>{const o=z==="all"||e.status===z,f=!s||e.fullName.toLowerCase().includes(s)||e.memberCode.toLowerCase().includes(s)||e.phone.toLowerCase().includes(s)||e.email.toLowerCase().includes(s);return o&&f});if(i.length===0){d.innerHTML='<tr><td colspan="8" class="empty-state">No members match the current filter.</td></tr>';return}d.innerHTML=i.map(e=>{var m;const o=e.activeSubscription,f=((m=e.latestPayment)==null?void 0:m.status)??"unpaid";return`
        <tr>
          <td class="mono">${t(e.memberCode)}</td>
          <td>
            <div><strong>${t(e.fullName)}</strong></div>
            <div class="section-subtitle">${t(e.email)}</div>
          </td>
          <td class="mono">${t(e.phone)}</td>
          <td class="col-numeric">${e.age}</td>
          <td>${o?`${t(o.packageName)} (${t(x(o.duration))})`:"None"}</td>
          <td class="mono">${o?t(S(o.expiryDate)):"—"}</td>
          <td>
            <span class="${M(e.status)}">${t(w(e.status))}</span>
            ${(o==null?void 0:o.status)==="frozen"?`<div class="section-subtitle">Frozen (${Number(o.frozenRemainingDays??0)} days saved)</div>`:`<div class="section-subtitle">Payment: ${t(w(f))} · Fingerprints: ${e.biometricCount}</div>`}
          </td>
          <td>
            <div class="toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" data-action="view" data-id="${t(e.id)}">Profile</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="biometrics" data-id="${t(e.id)}">Fingerprint</button>
              ${e.status==="active"&&(o==null?void 0:o.status)==="active"?`<button type="button" class="btn btn-secondary btn-sm" data-action="freeze" data-id="${t(e.id)}">Freeze</button>`:e.status==="frozen"||(o==null?void 0:o.status)==="frozen"?`<button type="button" class="btn btn-primary btn-sm" data-action="unfreeze" data-id="${t(e.id)}">Unfreeze</button>`:""}
              <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${t(e.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `}).join("")}async function ie(d){var i,e,o,f;g=d;const s=document.getElementById("member-profile-content");if(s){s.innerHTML='<div class="empty-state">Loading member profile...</div>',P("member-profile-modal");try{const m=await ae(d),c=m.member,p=m.subscriptions[0],E=c.status==="frozen"||(p==null?void 0:p.status)==="frozen";s.innerHTML=`
      <div class="profile-kv-grid">
        <div class="kv-item"><div class="kv-label">Member ID</div><div class="kv-value mono">${t(c.memberCode)}</div></div>
        <div class="kv-item"><div class="kv-label">Full Name</div><div class="kv-value">${t(c.fullName)}</div></div>
        <div class="kv-item"><div class="kv-label">Phone Number</div><div class="kv-value mono">${t(c.phone)}</div></div>
        <div class="kv-item"><div class="kv-label">Age</div><div class="kv-value mono">${c.age}</div></div>
        <div class="kv-item"><div class="kv-label">Account Status</div><div class="kv-value"><span class="${M(c.status)}">${t(w(c.status))}</span></div></div>
        <div class="kv-item"><div class="kv-label">${E?"Saved Frozen Days":"Latest Expiry"}</div><div class="kv-value mono">${E?`${Number((p==null?void 0:p.frozen_remaining_days)??0)} days saved`:p?t(S(String(p.expiry_date))):"—"}</div></div>
      </div>

      <form id="edit-member-form" class="form-grid mt-16">
        <div class="form-field">
          <label class="form-label" for="edit-full-name">Full Name</label>
          <input id="edit-full-name" name="fullName" class="form-input" value="${t(c.fullName)}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-phone">Phone Number</label>
          <input id="edit-phone" name="phone" class="form-input" value="${t(c.phone)}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-age">Age</label>
          <input id="edit-age" name="age" type="number" min="12" max="110" class="form-input" value="${c.age}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-notes">Admin Notes</label>
          <input id="edit-notes" name="notes" class="form-input" value="${t(c.notes)}" />
        </div>
        <div class="form-field-full toolbar-group">
          <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
          ${c.status==="active"&&(p==null?void 0:p.status)==="active"?'<button type="button" id="modal-freeze-btn" class="btn btn-secondary btn-sm">Freeze Membership</button>':E?'<button type="button" id="modal-unfreeze-btn" class="btn btn-primary btn-sm">Unfreeze Membership</button>':""}
          <button type="button" id="toggle-suspend-btn" class="btn btn-secondary btn-sm">
            ${c.status==="suspended"?"Reactivate Membership":"Suspend Membership"}
          </button>
          <button type="button" id="delete-member-btn" class="btn btn-danger btn-sm">Delete Member</button>
        </div>
      </form>

      <div class="mt-20">
        <h3 class="section-title">Subscription History (${m.subscriptions.length})</h3>
        <div class="table-wrap mt-12">
          <table class="data-table">
            <thead>
              <tr><th>Plan</th><th>Duration</th><th>Start</th><th>Expiry</th><th>Status</th><th>Payment</th></tr>
            </thead>
            <tbody>
              ${m.subscriptions.length===0?'<tr><td colspan="6" class="empty-state">No subscriptions recorded.</td></tr>':m.subscriptions.map(n=>`
                  <tr>
                    <td>${t(n.package_name)}</td>
                    <td>${t(x(String(n.duration)))}</td>
                    <td class="mono">${t(S(String(n.start_date)))}</td>
                    <td class="mono">${t(S(String(n.expiry_date)))}</td>
                    <td><span class="${M(String(n.status))}">${t(w(String(n.status)))}</span></td>
                    <td><span class="${M(String(n.payment_status))}">${t(w(String(n.payment_status)))}</span></td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-20">
        <h3 class="section-title">Payment History (${m.payments.length})</h3>
        <div class="table-wrap mt-12">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Method</th><th class="col-numeric">Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              ${m.payments.length===0?'<tr><td colspan="5" class="empty-state">No payments recorded.</td></tr>':m.payments.map(n=>`
                  <tr>
                    <td class="mono">${t(T(String(n.paid_at||n.created_at)))}</td>
                    <td>${t(w(String(n.method)))}</td>
                    <td class="col-numeric">${t(F(Number(n.amount)))}</td>
                    <td><span class="${M(String(n.status))}">${t(w(String(n.status)))}</span></td>
                    <td class="mono">${t(n.reference_no||"—")}</td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;const y=document.getElementById("edit-member-form");y==null||y.addEventListener("submit",async n=>{n.preventDefault();const h=new FormData(y);try{await ne(c.id,{fullName:String(h.get("fullName")||""),phone:String(h.get("phone")||""),age:Number(h.get("age")||0),notes:String(h.get("notes")||"")}),l("Member profile updated","success"),$("member-profile-modal"),await v()}catch(k){l(k instanceof Error?k.message:"Update failed","error")}}),(i=document.getElementById("modal-freeze-btn"))==null||i.addEventListener("click",async()=>{try{const n=await H(c.id);l(`Membership frozen (${n.remainingDays} days saved)`,"success"),$("member-profile-modal"),await v()}catch(n){l(n instanceof Error?n.message:"Freeze failed","error")}}),(e=document.getElementById("modal-unfreeze-btn"))==null||e.addEventListener("click",async()=>{try{const n=await _(c.id);l(`Membership unfrozen until ${S(n.expiryDate)}`,"success"),$("member-profile-modal"),await v()}catch(n){l(n instanceof Error?n.message:"Unfreeze failed","error")}}),(o=document.getElementById("toggle-suspend-btn"))==null||o.addEventListener("click",async()=>{try{await se(c.id,c.status==="suspended"?"active":"suspended"),l(c.status==="suspended"?"Member reactivated":"Member suspended","success"),$("member-profile-modal"),await v()}catch(n){l(n instanceof Error?n.message:"Status update failed","error")}}),(f=document.getElementById("delete-member-btn"))==null||f.addEventListener("click",async()=>{if(window.confirm(`Delete member ${c.fullName}? This cannot be undone.`))try{await U(c.id),l("Member deleted","success"),$("member-profile-modal"),await v()}catch(n){l(n instanceof Error?n.message:"Delete failed","error")}})}catch(m){s.innerHTML=`<div class="error-banner">${t(m instanceof Error?m.message:"Failed to load profile")}</div>`}}}async function oe(d){g=d;const s=B.find(o=>o.id===d),i=document.getElementById("bio-modal-member-name");i&&s&&(i.textContent=`${s.fullName} (${s.memberCode})`);const e=document.getElementById("bio-capability-note");if(e){const o=await G();e.textContent=o.platformAuthenticatorAvailable?"Platform biometric hardware (Touch ID / Windows Hello / FIDO2) detected and ready.":o.webauthnSupported?"WebAuthn API available for external FIDO2 USB fingerprint security keys, or use a connected USB Scanner SDK daemon below.":"WebAuthn unavailable in this browser context; use the USB Scanner SDK bridge below."}await N(d),P("biometric-enroll-modal")}async function N(d){const s=document.getElementById("enrolled-biometrics-list");if(s)try{const i=await J(d);if(i.length===0){s.innerHTML='<div class="empty-state">No hardware fingerprints enrolled for this member yet.</div>';return}s.innerHTML=i.map(e=>`
        <div class="breakdown-row">
          <div>
            <div><strong>${t(e.device_label)}</strong></div>
            <div class="section-subtitle mono">${t(e.provider.toUpperCase())} · ${t(T(e.created_at))}</div>
          </div>
          <button type="button" class="btn btn-danger btn-sm" data-remove-bio="${t(e.id)}">Remove</button>
        </div>
      `).join("")}catch(i){s.innerHTML=`<div class="error-banner">${t(i instanceof Error?i.message:"Unable to load credentials")}</div>`}}async function v(){try{const[d,s]=await Promise.all([ee(),te()]);B=d,A=s,re(),L(),C()}catch(d){l(d instanceof Error?d.message:"Failed to load members.","error")}}async function de(){var o,f,m,c,p,E,y,n,h,k;const d=await W("admin");if(!d)return;j({user:d,activeNavKey:"members",pageTitle:"Member Directory & Biometric Enrollment"}),q(document),I("register-member-modal"),I("member-profile-modal"),I("biometric-enroll-modal"),await v(),K.subscribe(r=>{(r.type==="member:updated"||r.type==="subscription:updated"||r.type==="payment:updated"||r.type==="biometric:updated")&&v()}),(o=document.getElementById("open-register-modal-btn"))==null||o.addEventListener("click",()=>{P("register-member-modal")}),(f=document.getElementById("reg-package-select"))==null||f.addEventListener("change",L),(m=document.getElementById("reg-duration-select"))==null||m.addEventListener("change",L);const s=document.getElementById("register-member-form");s==null||s.addEventListener("submit",async r=>{r.preventDefault();const a=new FormData(s);try{await Z({fullName:String(a.get("fullName")||""),email:String(a.get("email")||""),phone:String(a.get("phone")||""),age:Number(a.get("age")||0),notes:String(a.get("notes")||""),accountPassword:String(a.get("accountPassword")||""),packageId:String(a.get("packageId")||"")||void 0,duration:String(a.get("duration")||"1m"),startDate:String(a.get("startDate")||"")||void 0,paymentStatus:String(a.get("paymentStatus")||"paid"),paymentMethod:String(a.get("paymentMethod")||"cash"),referenceNo:String(a.get("referenceNo")||"")}),l("Member registered successfully","success"),s.reset(),L(),$("register-member-modal"),await v()}catch(u){l(u instanceof Error?u.message:"Member registration failed.","error")}}),(c=document.getElementById("member-search-input"))==null||c.addEventListener("input",r=>{R=r.target.value,C()}),(p=document.getElementById("member-status-filters"))==null||p.addEventListener("click",r=>{var u;const a=r.target.closest("[data-status]");if(a){z=a.dataset.status||"all";for(const b of((u=a.parentElement)==null?void 0:u.querySelectorAll(".segment-btn"))||[])b.classList.remove("active");a.classList.add("active"),C()}}),(E=document.getElementById("members-table-body"))==null||E.addEventListener("click",async r=>{const a=r.target.closest("[data-action]");if(!a||!a.dataset.id)return;const u=a.dataset.id;if(a.dataset.action==="view")ie(u);else if(a.dataset.action==="biometrics")oe(u);else if(a.dataset.action==="freeze")try{const b=await H(u);l(`Account frozen (${b.remainingDays} remaining days saved)`,"success"),await v()}catch(b){l(b instanceof Error?b.message:"Freeze failed.","error")}else if(a.dataset.action==="unfreeze")try{const b=await _(u);l(`Account unfrozen! Resumed until ${S(b.expiryDate)}`,"success"),await v()}catch(b){l(b instanceof Error?b.message:"Unfreeze failed.","error")}else if(a.dataset.action==="delete"){const b=B.find(D=>D.id===u);if(!window.confirm(`Delete member ${(b==null?void 0:b.fullName)||""}? This cannot be undone.`))return;try{await U(u),l("Member deleted","success"),await v()}catch(D){l(D instanceof Error?D.message:"Delete failed.","error")}}}),(y=document.getElementById("enroll-webauthn-btn"))==null||y.addEventListener("click",async()=>{if(!g)return;const r=document.getElementById("bio-device-label");try{await V(g,(r==null?void 0:r.value.trim())||"WebAuthn Biometric Sensor"),l("Hardware biometric enrolled via WebAuthn","success"),await N(g),await v()}catch(a){l(a instanceof Error?a.message:"WebAuthn enrollment failed.","error")}});const i=document.getElementById("sdk-provider-select"),e=document.getElementById("sdk-endpoint-input");i==null||i.addEventListener("change",()=>{e&&(e.value=Q(i.value))}),(n=document.getElementById("enroll-sdk-btn"))==null||n.addEventListener("click",async()=>{if(!g||!i||!e)return;const r=document.getElementById("bio-device-label");try{await X(g,i.value,e.value.trim(),(r==null?void 0:r.value.trim())||`${i.value.toUpperCase()} Scanner`),l("USB Scanner SDK fingerprint enrolled","success"),await N(g),await v()}catch(a){l(a instanceof Error?a.message:"Scanner SDK enrollment failed.","error")}}),(h=document.getElementById("enrolled-biometrics-list"))==null||h.addEventListener("click",async r=>{const a=r.target.closest("[data-remove-bio]");if(!(!a||!a.dataset.removeBio||!g))try{await Y(a.dataset.removeBio),l("Biometric credential removed","success"),await N(g),await v()}catch(u){l(u instanceof Error?u.message:"Failed to remove credential.","error")}}),(k=document.getElementById("export-members-btn"))==null||k.addEventListener("click",()=>{O(`gym-members-${new Date().toISOString().slice(0,10)}.csv`,["Member Code","Full Name","Email","Phone","Age","Status","Active Plan","Expiry Date","Payment Status"],B.map(r=>{var a,u,b;return[r.memberCode,r.fullName,r.email,r.phone,r.age,r.status,((a=r.activeSubscription)==null?void 0:a.packageName)||"None",((u=r.activeSubscription)==null?void 0:u.expiryDate)||"",((b=r.latestPayment)==null?void 0:b.status)||"unpaid"]})),l("Member directory exported","success")})}de();
