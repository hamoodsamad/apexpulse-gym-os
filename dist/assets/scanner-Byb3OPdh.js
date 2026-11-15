import{r as w,i as B,a as A,s as v,e as t,f as E,g as h,c as S,x as D,b as f}from"./layout-Iys708Ms.js";import{c as I,v as L,g as x,b as R}from"./biometricService-Dv5uUPpu.js";import{j as T,f as F}from"./gymService-C6eyi2AL.js";let g=[];function y(e){var o,d;const n=document.getElementById("scan-result-panel");if(!n)return;let s="result-danger",i="✕",c=e.statusLabel;e.verificationResult==="valid"?(s="result-valid",i="✓",c=e.wasAutoResumed?"VALID · RESUMED":"VALID"):e.verificationResult==="suspended"&&(s="result-warning",i="!");const r=e.verificationResult==="valid"?`${Number(e.daysRemaining??0)} days left`:e.verificationResult==="expired"?"0 days (Expired)":"—";n.innerHTML=`
    <div class="scan-photo-replacement ${s}">
      <div>
        <h2 class="section-title">${t(e.member.fullName)} (${t(e.member.memberCode)})</h2>
        <p class="section-subtitle">${t(e.reason)}</p>
        <div class="section-subtitle mono mt-12">Scanned: ${t(E(e.scannedAt))}</div>
      </div>
      <div class="scan-verdict-stamp" aria-label="Verification status">
        <span aria-hidden="true">${i}</span>
        <span>${t(c)}</span>
      </div>
    </div>

    <div class="profile-kv-grid">
      <div class="kv-item">
        <div class="kv-label">Member Name</div>
        <div class="kv-value">${t(e.member.fullName)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Age</div>
        <div class="kv-value mono">${e.member.age} yrs</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Phone Number</div>
        <div class="kv-value mono">${t(e.member.phone)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Subscription Plan</div>
        <div class="kv-value">
          ${e.subscription?`${t(e.subscription.packageName)} (${t(D(e.subscription.duration))})`:"No Active Plan"}
        </div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Subscribed Date (Start)</div>
        <div class="kv-value mono">${e.subscription?t(f(e.subscription.startDate)):"—"}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Expiry Date</div>
        <div class="kv-value mono">${e.subscription?t(f(e.subscription.expiryDate)):"—"}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Remaining Subscription</div>
        <div class="kv-value mono">${t(r)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Fee / Payment Status</div>
        <div class="kv-value">
          <span class="${h(((o=e.payment)==null?void 0:o.status)||"unpaid")}">
            ${t(S(((d=e.payment)==null?void 0:d.status)||"unpaid"))}
          </span>
        </div>
      </div>
    </div>
  `}function k(e){const n=document.getElementById("scan-result-panel");n&&(n.innerHTML=`
    <div class="error-banner">${t(e)}</div>
  `)}async function m(){const e=document.getElementById("scanner-recent-body");if(e)try{const s=(await F()).slice(0,12);if(s.length===0){e.innerHTML='<tr><td colspan="5" class="empty-state">No biometric attendance scans recorded yet.</td></tr>';return}e.innerHTML=s.map(i=>`
        <tr>
          <td class="mono">${t(E(String(i.scanned_at)))}</td>
          <td>${t(i.member_name)} <span class="mono">(${t(i.member_code)})</span></td>
          <td>${t(i.package_name||"—")}</td>
          <td>${t(i.device_label)}</td>
          <td><span class="${h(String(i.verification_result))}">${t(S(String(i.verification_result)))}</span></td>
        </tr>
      `).join("")}catch(n){v(n instanceof Error?n.message:"Unable to load recent scans.","error")}}async function $(){const e=document.getElementById("scanner-member-select");e&&(g=await T(),e.innerHTML='<option value="">Identify automatically across all enrolled members</option>'+g.map(n=>`<option value="${t(n.id)}">${t(n.fullName)} (${t(n.memberCode)}) — ${n.biometricCount} enrolled</option>`).join(""))}async function N(){var d,u,p,b;const e=await w("admin");if(!e)return;B({user:e,activeNavKey:"scanner",pageTitle:"Fingerprint Hardware Verification Terminal"});const n=a=>{document.body.classList.toggle("kiosk-mode",a),a&&document.documentElement.requestFullscreen?document.documentElement.requestFullscreen().catch(()=>{}):!a&&document.fullscreenElement&&document.exitFullscreen&&document.exitFullscreen().catch(()=>{})};(d=document.getElementById("toggle-kiosk-btn"))==null||d.addEventListener("click",()=>n(!0)),(u=document.getElementById("exit-kiosk-btn"))==null||u.addEventListener("click",()=>n(!1));const s=document.getElementById("hardware-capability-status");if(s){const a=await I();s.textContent=a.platformAuthenticatorAvailable?"WebAuthn Platform Biometric Authenticator detected. Ready for real fingerprint verification.":a.webauthnSupported?"WebAuthn FIDO2 supported (external USB security key) or connect a local vendor Scanner SDK daemon below.":"WebAuthn unavailable in this browser; connect a local USB Scanner SDK daemon below."}await Promise.all([$(),m()]),A.subscribe(a=>{a.type==="attendance:recorded"?m():(a.type==="member:updated"||a.type==="biometric:updated")&&$()});const i=document.getElementById("scanner-member-select"),c=document.getElementById("scanner-device-label");(p=document.getElementById("scan-webauthn-btn"))==null||p.addEventListener("click",async()=>{try{const a=await L((c==null?void 0:c.value.trim())||"Front Desk WebAuthn Sensor",(i==null?void 0:i.value)||void 0);y(a),await m()}catch(a){const l=a instanceof Error?a.message:"WebAuthn fingerprint scan failed.";k(l),v(l,"error")}});const r=document.getElementById("terminal-sdk-provider"),o=document.getElementById("terminal-sdk-endpoint");r==null||r.addEventListener("change",()=>{o&&(o.value=x(r.value))}),(b=document.getElementById("scan-sdk-btn"))==null||b.addEventListener("click",async()=>{if(!(!r||!o))try{const a=await R(r.value,o.value.trim(),(c==null?void 0:c.value.trim())||`${r.value.toUpperCase()} USB Scanner`);y(a),await m()}catch(a){const l=a instanceof Error?a.message:"Hardware SDK capture failed.";k(l),v(l,"error")}})}N();
