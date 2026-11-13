(()=>{"use strict";
const $=id=>document.getElementById(id),store=window.localStorage;
const words={
de:{home:"Startseite",profile:"Mein Profil",profileSettings:"Profileinstellungen",eyebrow:"PERSONALISIERUNG",title:"Einstellungen",intro:"Passe AkameDevelopment an deine Wünsche an. Änderungen werden direkt übernommen.",appearance:"Darstellung",appearanceIntro:"Gestalte das Aussehen der Website.",theme:"Farbschema",themeHint:"Wähle den dunklen oder hellen Modus.",accent:"Akzentfarbe",accentHint:"Passe die Hervorhebungsfarbe an.",compact:"Kompakte Ansicht",compactHint:"Weniger Abstände und kompaktere Bedienelemente.",profileHint:"Profilbild, Name, Beschreibung und Sichtbarkeit verwalten.",systemMotion:"Systemeinstellung beachten",systemMotionHint:"Dein Gerät kann Animationen automatisch reduzieren.",systemMotionOn:"Aktiv",systemMotionOff:"Nicht aktiv",localNote:"Deine Akzentfarbe wird bei Anmeldung mit deinem Konto synchronisiert. Andere Website-Einstellungen bleiben auf diesem Gerät.",language:"Sprache",siteLanguage:"Website-Sprache",languageHint:"Automatisch verwendet die Sprache deines Browsers.",notifications:"Benachrichtigungen",notificationIntro:"Bestimme, welche Kategorien in deiner Benachrichtigungszentrale erscheinen.",communityHint:"Kommentare, Antworten und Reaktionen.",betaInvites:"Beta-Einladungen",betaHint:"Einladungen zu neuen Testversionen.",modUpdates:"Mod-Updates",updatesHint:"Vorbereitet für zukünftige Release-Benachrichtigungen.",notificationNote:"Diese Einstellungen filtern die Anzeige im Browser. Einladungen und Zugriffe bleiben erhalten.",accessibility:"Barrierefreiheit",reducedMotion:"Animationen reduzieren",motionHint:"Reduziert Übergänge und Bewegungen auf der Website.",privacy:"Datenschutz",privacyIntro:"Die Sichtbarkeit deines Profils, deines Discord-Namens und deiner Mitgliedschaft kannst du in deinen Profileinstellungen verwalten.",openProfile:"Profileinstellungen öffnen",reset:"Standardeinstellungen wiederherstellen",saved:"Einstellungen gespeichert.",restored:"Standardeinstellungen wiederhergestellt.",saveAccent:"Akzentfarbe speichern",accentSaved:"Akzentfarbe gespeichert."},
en:{home:"Home",profile:"My profile",profileSettings:"Profile settings",eyebrow:"PERSONALIZATION",title:"Settings",intro:"Customize AkameDevelopment to your preferences. Changes apply instantly.",appearance:"Appearance",appearanceIntro:"Customize the look of the website.",theme:"Color theme",themeHint:"Choose dark or light mode.",accent:"Accent color",accentHint:"Change the highlight color.",compact:"Compact layout",compactHint:"Reduce spacing and control sizes.",profileHint:"Manage your avatar, name, bio and profile visibility.",systemMotion:"Respect device preferences",systemMotionHint:"Your device can automatically request reduced motion.",systemMotionOn:"Enabled",systemMotionOff:"Not enabled",localNote:"Your accent color syncs with your account when signed in. Other website preferences remain on this device.",language:"Language",siteLanguage:"Website language",languageHint:"Automatic uses your browser language.",notifications:"Notifications",notificationIntro:"Choose which categories appear in your notification center.",communityHint:"Comments, replies and reactions.",betaInvites:"Beta invitations",betaHint:"Invitations to test new versions.",modUpdates:"Mod updates",updatesHint:"Prepared for future release notifications.",notificationNote:"These settings filter what you see in this browser. Invitations and access remain unchanged.",accessibility:"Accessibility",reducedMotion:"Reduce animations",motionHint:"Reduce transitions and motion across the website.",privacy:"Privacy",privacyIntro:"Manage the visibility of your profile, Discord name and membership in your profile settings.",openProfile:"Open profile settings",reset:"Restore defaults",saved:"Settings saved.",restored:"Default settings restored.",saveAccent:"Save accent color",accentSaved:"Accent color saved."}};
const defaults={compact:false,accent:"#a678ec",motion:false,community:true,beta:true,updates:true};
const keys={compact:"akame-site-compact",accent:"akame-site-accent",motion:"akame-site-motion",community:"akame-notify-community",beta:"akame-notify-beta",updates:"akame-notify-updates"};
const current=k=>store.getItem(keys[k])??String(defaults[k]);
let pendingAccent=null;
function updateAccentButton(){const actions=$("accent-save-actions");if(actions)actions.hidden=!pendingAccent||pendingAccent.toLowerCase()===current("accent").toLowerCase()}
function previewAccent(value){if(!/^#[0-9a-f]{6}$/i.test(value))return;document.documentElement.style.setProperty("--settings-accent",value);const hex=$("settings-accent-hex");if(hex)hex.textContent=value.toUpperCase();const swatch=document.querySelector("#settings-accent-preview .accent-swatch");if(swatch)swatch.style.background=value;}

const lang=()=>window.AkameLanguage?.get?.()||store.getItem("akame-lang")||"de";
function renderLanguage(){const t=words[lang()]||words.de;document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(t[key])el.textContent=t[key]});document.documentElement.lang=lang();const status=$("system-motion-status");if(status)status.textContent=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?t.systemMotionOn:t.systemMotionOff;}
function applyLocal(){const accent=current("accent");document.documentElement.style.setProperty("--akame-user-accent",accent);document.documentElement.style.setProperty("--settings-accent",/^#[0-9a-f]{6}$/i.test(accent)?accent:"#a678ec");document.documentElement.style.accentColor=accent;document.documentElement.style.setProperty("--akame-accent",accent);document.documentElement.classList.toggle("akame-compact",current("compact")==="true");document.documentElement.classList.toggle("akame-reduced-motion",current("motion")==="true");}
function sync(){applyLocal();for(const key of Object.keys(keys)){const el=$("setting-"+(key==="motion"?"motion":key==="community"?"notify-community":key==="beta"?"notify-beta":key==="updates"?"notify-updates":key));if(!el)continue;if(el.type==="checkbox")el.checked=current(key)==="true";else el.value=current(key)}$("setting-language").value=store.getItem("akame-lang-preference")||"auto";renderLanguage();pendingAccent=null;previewAccent(current("accent"));updateAccentButton()}
function save(key,value){store.setItem(keys[key],String(value));window.AkameWebsiteSettings?.apply?.();applyLocal();$("save-status").textContent=(words[lang()]||words.de).saved;document.dispatchEvent(new CustomEvent("akame-settings-change"))}
for(const key of Object.keys(keys)){if(key==="accent")continue;const el=$("setting-"+(key==="community"?"notify-community":key==="beta"?"notify-beta":key==="updates"?"notify-updates":key));if(el)el.addEventListener(el.type==="checkbox"?"change":"input",()=>save(key,el.type==="checkbox"?el.checked:el.value))}
$("setting-accent").addEventListener("input",e=>{pendingAccent=e.target.value;previewAccent(pendingAccent);updateAccentButton()});
$("save-accent").addEventListener("click",async()=>{
 if(!pendingAccent||pendingAccent.toLowerCase()===current("accent").toLowerCase())return;
 const value=pendingAccent,button=$("save-accent");button.disabled=true;
 try{
  const result=await window.AkameAccent?.saveAccount?.(value);
  if(!result)throw Error("Accent synchronization is unavailable");
  store.setItem(keys.accent,value);
  window.AkameWebsiteSettings?.apply?.();applyLocal();previewAccent(value);
  pendingAccent=null;updateAccentButton();document.dispatchEvent(new CustomEvent("akame-settings-change"));
  const message=result.account?(lang()==="en"?"Accent color saved to your account.":"Akzentfarbe in deinem Profil gespeichert."):(lang()==="en"?"Accent color saved on this device.":"Akzentfarbe auf diesem Gerät gespeichert.");
  $("save-status").textContent=message;showResetToast(message);
 }catch(error){console.error("Accent save failed",error);showResetToast(lang()==="en"?"Could not save accent color to your account.":"Akzentfarbe konnte nicht im Profil gespeichert werden.")}
 finally{button.disabled=false}
});
document.addEventListener("akame-accent-account-loaded",()=>{if(pendingAccent)return;sync()});
$("setting-language").addEventListener("change",e=>{const preference=e.target.value;store.setItem("akame-lang-preference",preference);const target=preference==="auto"?((navigator.languages?.[0]||navigator.language||"en").toLowerCase().startsWith("de")?"de":"en"):preference;window.AkameLanguage?.set?.(target);if(!window.AkameLanguage)store.setItem("akame-lang",target);renderLanguage();$("save-status").textContent=(words[lang()]||words.de).saved});
function selectTab(name,updateHash=true){const target=$(name);if(!target||!target.classList.contains("section"))return;document.querySelectorAll("[data-tab]").forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});document.querySelectorAll(".section").forEach(x=>x.classList.toggle("active",x===target));if(updateHash)history.replaceState(null,"","#"+name)}
// Entire setting rows can be clicked, not just the tiny controls.
document.querySelectorAll(".setting").forEach(row=>{
 const input=row.querySelector('input[type="checkbox"],input[type="color"],select');
 if(!input)return;
 row.dataset.interactive="true";
 const title=row.querySelector("strong");
 if(title&&!input.getAttribute("aria-label")&&input.type!=="checkbox")input.setAttribute("aria-label",title.textContent.trim());
 if(title&&input.type==="checkbox")input.setAttribute("aria-label",title.textContent.trim());
 row.addEventListener("click",event=>{
  if(event.target.closest("input,select,button,a,label"))return;
  if(input.type==="checkbox"){input.checked=!input.checked;input.dispatchEvent(new Event("change",{bubbles:true}));}
  else if(input.type==="color"&&typeof input.showPicker==="function"){try{input.showPicker()}catch{input.focus()}}
  else input.focus();
 });
});
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>selectTab(b.dataset.tab)));
window.addEventListener("hashchange",()=>selectTab(location.hash.slice(1),false));
function showResetToast(message){
 let toast=document.getElementById("akame-settings-reset-toast");
 if(!toast){toast=document.createElement("div");toast.id="akame-settings-reset-toast";toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");Object.assign(toast.style,{position:"fixed",right:"20px",bottom:"24px",zIndex:"99999",background:"#261b38",color:"#f4eaff",border:"1px solid #a678ec",borderRadius:"12px",padding:"13px 18px",boxShadow:"0 12px 36px #0009",font:"600 14px Inter,system-ui,sans-serif",maxWidth:"calc(100vw - 40px)",transition:"opacity .2s ease"});document.body.appendChild(toast)}
 toast.textContent="✓ "+message;toast.style.opacity="1";toast.hidden=false;
 clearTimeout(showResetToast.timeout);showResetToast.timeout=setTimeout(()=>{toast.style.opacity="0";setTimeout(()=>{toast.hidden=true},220)},3200);
}
$("reset-settings").addEventListener("click",()=>{
 const button=$("reset-settings");button.disabled=true;
 try{
  for(const [k,v] of Object.entries(defaults))store.setItem(keys[k],String(v));
  store.removeItem("akame-site-theme");
  store.setItem("akame-lang-preference","auto");
  const browser=(navigator.languages?.[0]||navigator.language||"en").toLowerCase().startsWith("de")?"de":"en";
  store.setItem("akame-lang",browser);
  sync();
  window.AkameWebsiteSettings?.apply?.();
  document.dispatchEvent(new CustomEvent("akame-settings-change"));
  const message=(words[browser]||words.de).restored;
  $("save-status").textContent=message;showResetToast(message);
  // Set language last so a language change cannot interrupt resetting other preferences.
  try{window.AkameLanguage?.set?.(browser)}catch(error){console.warn("Language reset:",error)}
 }catch(error){console.error("Settings reset failed:",error);showResetToast(lang()==="en"?"Could not restore defaults.":"Standardeinstellungen konnten nicht wiederhergestellt werden.")}
 finally{button.disabled=false}
});

document.addEventListener("akame-language-change",renderLanguage);window.addEventListener("storage",()=>{sync();applyLocal()});window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change",renderLanguage);sync();selectTab(location.hash.slice(1)||"appearance",false);
})();