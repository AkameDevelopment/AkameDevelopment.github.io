(()=>{"use strict";
const KEY="akame-site-accent",DEFAULT="#a678ec",valid=v=>/^#[0-9a-f]{6}$/i.test(v||"");
const URL="https://wycdpuzlbivtfxwtarzn.supabase.co",PUBLISHABLE="sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0";
let dbPromise=null,activeUser=null,loaded=false,revision=0;
function apply(){
 let value=DEFAULT;try{localStorage.removeItem(KEY)}catch{}
 const root=document.documentElement;
 for(const name of ["--akame-user-accent","--akame-accent","--settings-accent","--purple","--accent"])root.style.setProperty(name,value);
 root.style.accentColor=value;
}
function db(){return dbPromise||(dbPromise=import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(({createClient})=>createClient(URL,PUBLISHABLE,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})));}
async function loadAccount(){
 const startingRevision=revision;
 try{
  const client=await db(),{data:{user},error}=await client.auth.getUser();
  if(error||!user){activeUser=null;loaded=true;return}
  activeUser=user.id;
  const result=await client.from("user_profiles").select("site_accent_color").eq("user_id",user.id).maybeSingle();
  if(result.error)throw result.error;
  if(startingRevision!==revision)return;
  if(valid(result.data?.site_accent_color)){
   localStorage.setItem(KEY,result.data.site_accent_color);apply();
   document.dispatchEvent(new CustomEvent("akame-accent-account-loaded"));
  }
  loaded=true;
 }catch(error){loaded=true;console.warn("Account accent load failed",error)}
}
async function saveAccount(value){
 if(!valid(value))throw Error("Invalid accent color");
 revision++;
 localStorage.setItem(KEY,value);apply();
 const client=await db(),{data:{user},error}=await client.auth.getUser();
 if(error)throw error;
 if(!user)return {account:false};
 let result=await client.from("user_profiles").update({site_accent_color:value}).eq("user_id",user.id).select("site_accent_color").maybeSingle();
 if(!result.error&&!result.data)result=await client.from("user_profiles").upsert({user_id:user.id,site_accent_color:value},{onConflict:"user_id"}).select("site_accent_color").single();
 if(result.error)throw result.error;
 if(result.data?.site_accent_color?.toLowerCase()!==value.toLowerCase())throw Error("Accent color was not saved");
 activeUser=user.id;return {account:true};
}
apply();
document.addEventListener("akame-settings-change",apply);
window.addEventListener("storage",e=>{if(!e.key||e.key===KEY)apply()});
window.AkameAccent={apply,saveAccount,loadAccount,reset(){revision++;localStorage.setItem(KEY,DEFAULT);apply();document.dispatchEvent(new CustomEvent("akame-accent-account-loaded"));return saveAccount(DEFAULT)}};
// Custom accents are retired; keep the default purple on every page.
})();