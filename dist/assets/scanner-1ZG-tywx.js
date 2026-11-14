import{r as $,a as h,s as l}from"./toast-CH4nMIJX.js";import{c as w,v as S,g as E,b as B}from"./biometricService-BZGqr46O.js";import{i as A,o as D,e as a,f as I,a as y,s as g,c as k,m as T,b as H}from"./layout-7d-O-mYI.js";let u=[];function p(e){var r,c;const n=document.getElementById("scan-result-panel");if(!n)return;let s="result-danger",t="✕";e.verificationResult==="valid"?(s="result-valid",t="✓"):e.verificationResult==="suspended"&&(s="result-warning",t="!"),n.innerHTML=`
    <div class="scan-result-banner ${s}">
      <div class="toolbar-group">
        <span class="scan-status-icon" aria-hidden="true">${t}</span>
        <div>
          <h2 class="section-title">${a(e.statusLabel)} — ${a(e.member.fullName)}</h2>
          <p class="section-subtitle">${a(e.reason)}</p>
        </div>
      </div>
      <div class="mono">${a(y(e.scannedAt))}</div>
    </div>

    <div class="profile-kv-grid">
      <div class="kv-item">
        <div class="kv-label">Member Name</div>
        <div class="kv-value">${a(e.member.fullName)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Phone Number</div>
        <div class="kv-value mono">${a(e.member.phone)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Age</div>
        <div class="kv-value mono">${e.member.age} yrs</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Subscription Plan</div>
        <div class="kv-value">
          ${e.subscription?`${a(e.subscription.packageName)} (${a(T(e.subscription.duration))})`:"No Active Plan"}
        </div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Payment Status</div>
        <div class="kv-value">
          <span class="${g(((r=e.payment)==null?void 0:r.status)||"unpaid")}">
            ${a(k(((c=e.payment)==null?void 0:c.status)||"unpaid"))}
          </span>
        </div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Expiry Date</div>
        <div class="kv-value mono">${e.subscription?a(H(e.subscription.expiryDate)):"—"}</div>
      </div>
    </div>
  `}function b(e){const n=document.getElementById("scan-result-panel");n&&(n.innerHTML=`
    <div class="error-banner">${a(e)}</div>
  `)}async function d(){const e=document.getElementById("scanner-recent-body");if(e)try{const s=(await I()).slice(0,12);if(s.length===0){e.innerHTML='<tr><td colspan="5" class="empty-state">No biometric attendance scans recorded yet.</td></tr>';return}e.innerHTML=s.map(t=>`
        <tr>
          <td class="mono">${a(y(String(t.scanned_at)))}</td>
          <td>${a(t.member_name)} <span class="mono">(${a(t.member_code)})</span></td>
          <td>${a(t.package_name||"—")}</td>
          <td>${a(t.device_label)}</td>
          <td><span class="${g(String(t.verification_result))}">${a(k(String(t.verification_result)))}</span></td>
        </tr>
      `).join("")}catch(n){l(n instanceof Error?n.message:"Unable to load recent scans.","error")}}async function f(){const e=document.getElementById("scanner-member-select");e&&(u=await D(),e.innerHTML='<option value="">Identify automatically across all enrolled members</option>'+u.map(n=>`<option value="${a(n.id)}">${a(n.fullName)} (${a(n.memberCode)}) — ${n.biometricCount} enrolled</option>`).join(""))}async function N(){var m,v;const e=await $("admin");if(!e)return;A({user:e,activeNavKey:"scanner",pageTitle:"Fingerprint Hardware Verification Terminal"});const n=document.getElementById("hardware-capability-status");if(n){const i=await w();n.textContent=i.platformAuthenticatorAvailable?"WebAuthn Platform Biometric Authenticator detected. Ready for real fingerprint verification.":i.webauthnSupported?"WebAuthn FIDO2 supported (external USB security key) or connect a local vendor Scanner SDK daemon below.":"WebAuthn unavailable in this browser; connect a local USB Scanner SDK daemon below."}await Promise.all([f(),d()]),h.subscribe(i=>{i.type==="attendance:recorded"?d():(i.type==="member:updated"||i.type==="biometric:updated")&&f()});const s=document.getElementById("scanner-member-select"),t=document.getElementById("scanner-device-label");(m=document.getElementById("scan-webauthn-btn"))==null||m.addEventListener("click",async()=>{try{const i=await S((t==null?void 0:t.value.trim())||"Front Desk WebAuthn Sensor",(s==null?void 0:s.value)||void 0);p(i),await d()}catch(i){const o=i instanceof Error?i.message:"WebAuthn fingerprint scan failed.";b(o),l(o,"error")}});const r=document.getElementById("terminal-sdk-provider"),c=document.getElementById("terminal-sdk-endpoint");r==null||r.addEventListener("change",()=>{c&&(c.value=E(r.value))}),(v=document.getElementById("scan-sdk-btn"))==null||v.addEventListener("click",async()=>{if(!(!r||!c))try{const i=await B(r.value,c.value.trim(),(t==null?void 0:t.value.trim())||`${r.value.toUpperCase()} USB Scanner`);p(i),await d()}catch(i){const o=i instanceof Error?i.message:"Hardware SDK capture failed.";b(o),l(o,"error")}})}N();
