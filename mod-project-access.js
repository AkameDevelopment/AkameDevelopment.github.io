import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const id=new URLSearchParams(location.search).get("mod");
const slugs=new Set(["modcore","chest","crosshair","chunkloader","items","hud","info","admin","zoom"]);
const main=document.querySelector("main");
if(main&&slugs.has(id)){
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
function blocked(message){main.replaceChildren();const section=document.createElement("section");section.style.cssText="padding:90px 20px;text-align:center;max-width:700px;margin:0 auto";const title=document.createElement("h1");title.textContent=message;const link=document.createElement("a");link.href="index.html#projects";link.textContent="← "+(window.AkameLanguage?.get()==="en"?"Back to projects":"Zurück zu Projekten");section.append(title,link);main.append(section);}
try{
const rules=await db.from("mod_visibility").select("visibility,visible").eq("project_slug",id).maybeSingle();
if(rules.error)throw rules.error;
const mode=rules.data?.visibility||(rules.data?.visible===false?"hidden":"public");
let allowed=mode==="public";
if(!allowed){
const {data}=await db.auth.getUser(),uid=data?.user?.id;
if(uid){
const admin=await db.from("staff_access").select("role").eq("user_id",uid).maybeSingle();
allowed=!admin.error&&admin.data?.role==="admin";
if(!allowed&&mode==="beta"){const beta=await db.from("beta_access").select("project_slug").eq("user_id",uid).eq("project_slug",id).maybeSingle();allowed=!beta.error&&!!beta.data;}
}}
if(!allowed)blocked(window.AkameLanguage?.get()==="en"?"This mod is currently not available for your account.":"Diese Mod ist für dein Konto derzeit nicht verfügbar.");
}catch(error){blocked(window.AkameLanguage?.get()==="en"?"Mod availability could not be checked.":"Mod-Verfügbarkeit konnte nicht geprüft werden.");}
main.style.visibility="visible";
}
