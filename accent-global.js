(()=>{"use strict";
const KEY="akame-site-accent",DEFAULT="#a678ec";
function apply(){
 let value=DEFAULT;
 try{const stored=localStorage.getItem(KEY);if(stored&&/^#[0-9a-f]{6}$/i.test(stored))value=stored}catch{}
 const root=document.documentElement;
 for(const name of ["--akame-user-accent","--akame-accent","--settings-accent","--purple","--accent"])root.style.setProperty(name,value);
}
apply();
document.addEventListener("akame-settings-change",apply);
window.addEventListener("storage",e=>{if(!e.key||e.key===KEY)apply()});
window.AkameAccent={apply};
})();