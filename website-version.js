/* Website build indicator: Owner and Developer only; Owner can disable globally. */
(async()=>{"use strict";
const endpoint="https://wycdpuzlbivtfxwtarzn.supabase.co",key="sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0";
try{
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(endpoint,key,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:{user}}=await db.auth.getUser();if(!user)return;
 const {data:staff,error:roleError}=await db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle();
 if(roleError||!["owner","developer"].includes(staff?.role))return;
 const {data:config,error:configError}=await db.from("website_version_settings").select("public_visible").eq("id",true).maybeSingle();
 if(configError||!config)return;
 // Legacy public_visible is now a private disable flag. Never allow public display.
 if(config.public_visible===true)return;
 const badge=document.createElement("div");badge.id="akame-website-build";badge.setAttribute("role","status");badge.style.cssText="position:fixed;left:12px;bottom:12px;z-index:1000;max-width:calc(100vw - 24px);padding:5px 9px;border:1px solid #a982ff40;border-radius:8px;background:#130e1be8;backdrop-filter:blur(9px);color:#a99ab9;font:500 10px/1.4 system-ui,sans-serif;letter-spacing:.015em;pointer-events:none;box-shadow:0 4px 20px #0003";badge.textContent="AkameDevelopment · Build …";document.body.append(badge);
 const en=(localStorage.getItem("akame-lang")||"de")==="en";
 try{
  const res=await fetch("website-version.json",{cache:"no-store"});
  if(!res.ok)throw new Error("Version unavailable");
  const data=await res.json();
  if(!/^\\d+\\.\\d+\\.\\d+$/.test(data.version))throw new Error("Invalid version");
  badge.textContent="AkameDevelopment · v"+data.version;
  badge.title=en?"Website version":"Website-Version";
 }catch{badge.textContent="AkameDevelopment · Version";badge.title=en?"Version information unavailable":"Versionsinformation derzeit nicht verfügbar"}

}catch(error){console.warn("Website build indicator unavailable",error)}
})();
