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
 document.dispatchEvent(new CustomEvent("akame-theme-user-change",{detail:{theme}}));
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

// Account sync: keep local fallback for guests, synchronize authenticated profiles.
let profileClient=null,profileUser=null,profileLoading=true,localChangeDuringLoad=false;
const notify=message=>{const el=document.getElementById("save-status");if(el)el.textContent=message};
async function saveProfileTheme(theme){
 if(!profileClient||!profileUser)return;
 const {error}=await profileClient.from("user_profiles").upsert({user_id:profileUser,site_theme:theme},{onConflict:"user_id"});
 if(error)notify("Farbschema lokal gespeichert; Profilsynchronisierung fehlgeschlagen.");
 else notify("Farbschema im Profil gespeichert.");
}
document.addEventListener("akame-theme-user-change",e=>{
 if(profileLoading)localChangeDuringLoad=true;
 if(profileUser)saveProfileTheme(e.detail.theme);
});
(async()=>{
 try{
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  profileClient=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const load=async user=>{
   profileUser=user?.id||null;
   if(!profileUser){profileLoading=false;return;}
   profileLoading=true;localChangeDuringLoad=false;
   const id=profileUser;
   const {data,error}=await profileClient.from("user_profiles").select("site_theme").eq("user_id",id).maybeSingle();
   if(profileUser!==id)return;
   profileLoading=false;
   if(error)return;
   if(localChangeDuringLoad){await saveProfileTheme(stored());return;}
   if(data?.site_theme==="dark"||data?.site_theme==="light"){
    try{localStorage.setItem(KEY,data.site_theme)}catch{}
    apply();
   }else await saveProfileTheme(stored());
  };
  const {data}=await profileClient.auth.getUser();
  await load(data?.user);
  profileClient.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_IN"&&session?.user?.id!==profileUser)queueMicrotask(()=>load(session.user));
   if(event==="SIGNED_OUT"){profileUser=null;profileLoading=false;}
  });
 }catch{profileLoading=false;}
})();
window.AkameTheme={apply};
})();