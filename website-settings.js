(()=>{"use strict";
const $=id=>document.getElementById(id),store=window.localStorage;
const words={
de:{home:"Startseite",profile:"Mein Profil",profileSettings:"Profileinstellungen",eyebrow:"PERSONALISIERUNG",title:"Einstellungen",intro:"Passe AkameDevelopment an deine Wünsche an. Änderungen werden direkt übernommen.",appearance:"Darstellung",appearanceIntro:"Gestalte das Aussehen der Website.",theme:"Farbschema",themeHint:"Wähle Dunkel oder Hell. Der Hellmodus ist eine Beta-Funktion.",darkMode:"Dunkel",lightMode:"Hell",accent:"Akzentfarbe",accentHint:"Beta-Funktion: Die Akzentfarbe ist noch in Entwicklung. Standard wird empfohlen.",compact:"Kompakte Ansicht",compactHint:"Weniger Abstände und kompaktere Bedienelemente.",profileHint:"Profilbild, Name, Beschreibung und Sichtbarkeit verwalten.",systemMotion:"Systemeinstellung beachten",systemMotionHint:"Dein Gerät kann Animationen automatisch reduzieren.",systemMotionOn:"Aktiv",systemMotionOff:"Nicht aktiv",localNote:"Website-Einstellungen werden auf diesem Gerät gespeichert. Profileinstellungen werden mit deinem Konto verwaltet.",language:"Sprache",siteLanguage:"Website-Sprache",languageHint:"Wähle Deutsch oder Englisch für die Website.",notifications:"Benachrichtigungen",notificationIntro:"Bestimme, welche Kategorien in deiner Benachrichtigungszentrale erscheinen.",communityHint:"Kommentare, Antworten und Reaktionen.",betaInvites:"Beta-Einladungen",betaHint:"Einladungen zu neuen Testversionen.",modUpdates:"Mod-Updates",updatesHint:"Vorbereitet für zukünftige Release-Benachrichtigungen.",notificationNote:"Diese Einstellungen filtern die Anzeige im Browser. Einladungen und Zugriffe bleiben erhalten.",accessibility:"Barrierefreiheit",reducedMotion:"Animationen reduzieren",motionHint:"Reduziert Übergänge und Bewegungen auf der Website.",privacy:"Datenschutz",privacyIntro:"Die Sichtbarkeit deines Profils, deines Discord-Namens und deiner Mitgliedschaft kannst du in deinen Profileinstellungen verwalten.",openProfile:"Profileinstellungen öffnen",reset:"Standardeinstellungen wiederherstellen",saved:"Einstellungen gespeichert.",restored:"Standardeinstellungen wiederhergestellt.",saveAccent:"Akzentfarbe speichern",accentSaved:"Akzentfarbe gespeichert."},
en:{home:"Home",profile:"My profile",profileSettings:"Profile settings",eyebrow:"PERSONALIZATION",title:"Settings",intro:"Customize AkameDevelopment to your preferences. Changes apply instantly.",appearance:"Appearance",appearanceIntro:"Customize the look of the website.",theme:"Color theme",themeHint:"Choose Dark or Light. Light mode is a beta feature.",darkMode:"Dark",lightMode:"Light",accent:"Accent color",accentHint:"Beta feature: Accent colors are still in development. The default color is recommended.",compact:"Compact layout",compactHint:"Reduce spacing and control sizes.",profileHint:"Manage your avatar, name, bio and profile visibility.",systemMotion:"Respect device preferences",systemMotionHint:"Your device can automatically request reduced motion.",systemMotionOn:"Enabled",systemMotionOff:"Not enabled",localNote:"Website settings are saved on this device. Profile settings are managed with your account.",language:"Language",siteLanguage:"Website language",languageHint:"Choose German or English for the website.",notifications:"Notifications",notificationIntro:"Choose which categories appear in your notification center.",communityHint:"Comments, replies and reactions.",betaInvites:"Beta invitations",betaHint:"Invitations to test new versions.",modUpdates:"Mod updates",updatesHint:"Prepared for future release notifications.",notificationNote:"These settings filter what you see in this browser. Invitations and access remain unchanged.",accessibility:"Accessibility",reducedMotion:"Reduce animations",motionHint:"Reduce transitions and motion across the website.",privacy:"Privacy",privacyIntro:"Manage the visibility of your profile, Discord name and membership in your profile settings.",openProfile:"Open profile settings",reset:"Restore defaults",saved:"Settings saved.",restored:"Default settings restored.",saveAccent:"Save accent color",accentSaved:"Accent color saved."}};
const defaults={theme:"dark",compact:false,accent:"#a678ec",motion:false,community:true,beta:true,updates:true};
const keys={theme:"akame-site-theme",compact:"akame-site-compact",accent:"akame-site-accent",motion:"akame-site-motion",community:"akame-notify-community",beta:"akame-notify-beta",updates:"akame-notify-updates"};
const current=k=>k==="accent"?defaults.accent:(store.getItem(keys[k])??String(defaults[k]));
let pendingAccent=null;
function updateAccentButton(){const actions=$("accent-save-actions");if(actions)actions.hidden=!pendingAccent||pendingAccent.toLowerCase()===current("accent").toLowerCase()}
function previewAccent(value){if(!/^#[0-9a-f]{6}$/i.test(value))return;document.documentElement.style.setProperty("--settings-accent",value);const hex=$("settings-accent-hex");if(hex)hex.textContent=value.toUpperCase();const swatch=document.querySelector("#settings-accent-preview .accent-swatch");if(swatch)swatch.style.background=value;}

const lang=()=>window.AkameLanguage?.get?.()||store.getItem("akame-lang")||"de";
function renderLanguage(){const t=words[lang()]||words.de;document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(t[key])el.textContent=t[key]});document.documentElement.lang=lang();const theme=$("setting-theme");if(theme){theme.value=current("theme")==="light"?"light":"dark";for(const option of theme.options)option.textContent=option.value==="light"?t.lightMode:t.darkMode}const status=$("system-motion-status");if(status)status.textContent=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?t.systemMotionOn:t.systemMotionOff;}
function applyLocal(){document.documentElement.dataset.akameTheme=current("theme");const accent=current("accent");document.documentElement.style.setProperty("--akame-user-accent",accent);document.documentElement.style.setProperty("--settings-accent",/^#[0-9a-f]{6}$/i.test(accent)?accent:"#a678ec");document.documentElement.style.accentColor=accent;document.documentElement.style.setProperty("--akame-accent",accent);document.documentElement.classList.toggle("akame-compact",current("compact")==="true");document.documentElement.classList.toggle("akame-reduced-motion",current("motion")==="true");}
function sync(){applyLocal();for(const key of Object.keys(keys)){const el=$("setting-"+(key==="motion"?"motion":key==="community"?"notify-community":key==="beta"?"notify-beta":key==="updates"?"notify-updates":key));if(!el)continue;if(el.type==="checkbox")el.checked=current(key)==="true";else el.value=current(key)}$("setting-language").value=["de","en"].includes(store.getItem("akame-lang-preference"))?store.getItem("akame-lang-preference"):lang();renderLanguage();pendingAccent=null;previewAccent(current("accent"));updateAccentButton()}
function save(key,value){store.setItem(keys[key],String(value));window.AkameWebsiteSettings?.apply?.();applyLocal();$("save-status").textContent=(words[lang()]||words.de).saved;document.dispatchEvent(new CustomEvent("akame-settings-change"))}
for(const key of Object.keys(keys)){if(key==="accent")continue;const el=$("setting-"+(key==="community"?"notify-community":key==="beta"?"notify-beta":key==="updates"?"notify-updates":key));if(el)el.addEventListener(el.type==="checkbox"?"change":"input",()=>save(key,el.type==="checkbox"?el.checked:el.value))}
$("setting-accent")?.addEventListener("input",e=>{pendingAccent=e.target.value;previewAccent(pendingAccent);updateAccentButton()});
$("save-accent")?.addEventListener("click",async()=>{
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
function selectTab(name,updateHash=true){const target=$(name);if(!target||!target.classList.contains("section"))return;document.querySelectorAll("[data-tab]").forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});document.querySelectorAll(".section").forEach(x=>x.classList.toggle("active",x===target));const resetActions=$("settings-reset-actions");if(resetActions)resetActions.hidden=name==="privacy";if(updateHash)history.replaceState(null,"","#"+name)}
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
 const button=$("reset-settings");
 // A synchronous, self-contained reset: no network, promises or account operations.
 try{
  for(const [key,value] of Object.entries(defaults)){
   if(key==="accent")continue;
   localStorage.setItem(keys[key],String(value));
  }
  localStorage.removeItem("akame-site-accent");
  localStorage.setItem("akame-site-theme","dark");
  localStorage.setItem("akame-lang-preference","de");
  localStorage.setItem("akame-lang","de");
  document.documentElement.dataset.akameTheme="dark";
  document.documentElement.classList.remove("akame-compact","akame-reduced-motion");
  document.documentElement.style.setProperty("--akame-user-accent","#a678ec");
  document.documentElement.style.setProperty("--settings-accent","#a678ec");
  document.documentElement.style.setProperty("--akame-accent","#a678ec");
  for(const key of Object.keys(defaults)){
   const id=key==="community"?"setting-notify-community":key==="beta"?"setting-notify-beta":key==="updates"?"setting-notify-updates":"setting-"+key;
   const el=$(id);if(!el)continue;
   if(el.type==="checkbox")el.checked=!!defaults[key];else el.value=String(defaults[key]);
  }
  $("setting-language").value="de";
  pendingAccent=null;
  window.AkameTheme?.apply?.();
  window.AkameWebsiteSettings?.apply?.();
  window.AkameAccent?.apply?.();
  document.dispatchEvent(new CustomEvent("akame-settings-change"));
  try{window.AkameLanguage?.set?.("de")}catch(error){console.warn("Language change",error)}
  renderLanguage();
  const message=(words.de).restored;
  $("save-status").textContent=message;
  showResetToast(message);
 }catch(error){
  console.error("Restore defaults error:",error);
  showResetToast(lang()==="en"?"Could not restore defaults.":"Standardeinstellungen konnten nicht wiederhergestellt werden.");
 }finally{button.disabled=false}
});

document.addEventListener("akame-language-change",renderLanguage);window.addEventListener("storage",()=>{sync();applyLocal()});window.addEventListener("pageshow",()=>{sync();window.AkameTheme?.apply?.()});document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync()});window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change",renderLanguage);sync();selectTab(location.hash.slice(1)||"appearance",false);
})();