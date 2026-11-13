(()=>{"use strict";
let timer;
window.AkameToast=function(message,type="success"){
 if(!message)return;
 let root=document.getElementById("akame-global-toast");
 if(!root){root=document.createElement("div");root.id="akame-global-toast";root.setAttribute("role","status");root.setAttribute("aria-live","polite");Object.assign(root.style,{position:"fixed",right:"18px",bottom:"22px",zIndex:"2147483000",padding:"12px 17px",borderRadius:"12px",background:"#251b34",color:"#f7f1ff",border:"1px solid var(--akame-user-accent,#a678ec)",boxShadow:"0 12px 32px #0008",font:"600 13px system-ui",maxWidth:"min(400px,calc(100vw - 36px))",transition:"opacity .2s"});document.body.appendChild(root)}
 root.textContent=(type==="error"?"⚠ ":"✓ ")+message;root.style.borderColor=type==="error"?"#e88b9b":"var(--akame-user-accent,#a678ec)";root.style.opacity="1";root.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{root.style.opacity="0";setTimeout(()=>root.hidden=true,220)},3200);
};
document.addEventListener("DOMContentLoaded",()=>{
 const ids=["edit-message","selected-posts-status","news-message","profile-edit-message","akamesmp-message"];
 for(const id of ids){const el=document.getElementById(id);if(!el)continue;let previous=el.textContent.trim();new MutationObserver(()=>{const value=el.textContent.trim();if(!value||value===previous)return;previous=value;if(/gesendet|gespeichert|gelöscht|entfernt|entzogen|freigeschaltet|zurückgezogen|aktualisiert|bearbeitet|erfolgreich|fehlgeschlagen|fehler/i.test(value))window.AkameToast(value,/fehler|fehlgeschlagen/i.test(value)?"error":"success")}).observe(el,{childList:true,characterData:true,subtree:true})}
});
})();