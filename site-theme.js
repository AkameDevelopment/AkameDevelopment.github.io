(()=>{"use strict";
const KEY="akame-site-theme",root=document.documentElement;
const stored=()=>{try{return localStorage.getItem(KEY)==="light"?"light":"dark"}catch{return "dark"}};
const apply=()=>{root.dataset.akameTheme=stored();syncSelector()};
function syncSelector(){const select=document.getElementById("setting-theme");if(!select)return;const active=root.dataset.akameTheme==="light"?"light":"dark";if(select.value!==active)select.value=active}
function initSelector(){
 const select=document.getElementById("setting-theme");if(!select)return;
 // Reconcile the visible theme with persisted preference before showing the selector.
 apply();
 select.addEventListener("change",()=>{
  const theme=select.value==="light"?"light":"dark";
  try{localStorage.setItem(KEY,theme)}catch{}
  root.dataset.akameTheme=theme;
  document.dispatchEvent(new CustomEvent("akame-settings-change"));
  syncSelector();
 });
 new MutationObserver(syncSelector).observe(root,{attributes:true,attributeFilter:["data-akame-theme"]});
 syncSelector();
}
apply();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initSelector,{once:true});else initSelector();
window.addEventListener("storage",e=>{if(!e.key||e.key===KEY)apply()});
window.addEventListener("pageshow",apply);
document.addEventListener("akame-settings-change",apply);
window.AkameTheme={apply};
})();