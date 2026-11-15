(()=>{"use strict";
const KEY="akame-site-theme",root=document.documentElement;
const stored=()=>{try{return localStorage.getItem(KEY)==="light"?"light":"dark"}catch{return "dark"}};
const current=()=>root.dataset.akameTheme==="light"?"light":"dark";
function sync(){
 const select=document.getElementById("setting-theme");
 if(select&&select.value!==current())select.value=current();
 const toggle=document.getElementById("setting-theme-toggle");
 if(toggle){
  const light=current()==="light";
  toggle.setAttribute("aria-checked",String(light));
  toggle.setAttribute("aria-label",light?"Light Mode aktiviert – zu Dark Mode wechseln":"Dark Mode aktiviert – zu Light Mode wechseln");
  const label=toggle.querySelector(".theme-toggle-state");
  if(label)label.textContent=light?"☀":"☾";
 }
}
function apply(){root.dataset.akameTheme=stored();sync()}
function set(theme){
 try{localStorage.setItem(KEY,theme)}catch{}
 root.dataset.akameTheme=theme;
 document.dispatchEvent(new CustomEvent("akame-settings-change"));
 sync();
}
function init(){
 apply();
 document.getElementById("setting-theme")?.addEventListener("change",e=>set(e.currentTarget.value==="light"?"light":"dark"));
 document.getElementById("setting-theme-toggle")?.addEventListener("click",()=>set(current()==="light"?"dark":"light"));
 new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:["data-akame-theme"]});
 sync();
}
apply();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("storage",e=>{if(!e.key||e.key===KEY)apply()});
window.addEventListener("pageshow",apply);
document.addEventListener("akame-settings-change",apply);
window.AkameTheme={apply};
})();