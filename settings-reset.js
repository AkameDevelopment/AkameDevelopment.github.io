/* Independent reset: no Supabase, no dependency on settings UI initialization. */
(()=>{
"use strict";
const defaults={
"akame-site-theme":"dark","akame-site-compact":"false","akame-site-motion":"false",
"akame-notify-community":"true","akame-notify-beta":"true","akame-notify-updates":"true",
"akame-lang-preference":"de","akame-lang":"de"
};
function apply(){
 const theme=localStorage.getItem("akame-site-theme")==="light"?"light":"dark";
 document.documentElement.dataset.akameTheme=theme;
 const themeSelect=document.getElementById("setting-theme");if(themeSelect)themeSelect.value=theme;
 for(const [key,id] of [["akame-site-compact","setting-compact"],["akame-site-motion","setting-motion"],["akame-notify-community","setting-notify-community"],["akame-notify-beta","setting-notify-beta"],["akame-notify-updates","setting-notify-updates"]]){
  const el=document.getElementById(id);if(el)el.checked=localStorage.getItem(key)==="true";
 }
 const language=document.getElementById("setting-language");if(language)language.value=localStorage.getItem("akame-lang")||"de";
 document.documentElement.classList.toggle("akame-compact",localStorage.getItem("akame-site-compact")==="true");
 document.documentElement.classList.toggle("akame-reduced-motion",localStorage.getItem("akame-site-motion")==="true");
}
function reset(){
 const en=(localStorage.getItem("akame-lang")||"de")==="en";
 try{
  for(const [key,value] of Object.entries(defaults))localStorage.setItem(key,value);
  localStorage.removeItem("akame-site-accent");
  apply();
  window.AkameTheme?.apply?.();
  document.dispatchEvent(new CustomEvent("akame-settings-change"));
  try{window.AkameLanguage?.set?.("de")}catch(e){console.warn("Language reset:",e)}
  const message="Standardeinstellungen wiederhergestellt.";
  const status=document.getElementById("save-status");if(status)status.textContent=message;
  let toast=document.getElementById("akame-reset-confirmation");
  if(!toast){toast=document.createElement("div");toast.id="akame-reset-confirmation";toast.setAttribute("role","status");toast.style.cssText="position:fixed;right:18px;bottom:22px;z-index:999999;padding:13px 18px;background:#302045;color:#fff;border:1px solid #a678ec;border-radius:12px;box-shadow:0 8px 30px #0004;font:600 14px system-ui";document.body.append(toast)}
  toast.textContent="✓ "+message;toast.hidden=false;
  if(window.__akameResetHide)clearTimeout(window.__akameResetHide);
  window.__akameResetHide=setTimeout(()=>{toast.hidden=true},3500);
 }catch(error){console.error("Restore defaults failed:",error);alert(en?"Could not restore defaults.":"Standardeinstellungen konnten nicht wiederhergestellt werden.")}
}
function init(){
 const button=document.getElementById("reset-settings");
 if(button)button.addEventListener("click",reset);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();