/* Website build indicator. Owner-only unless globally enabled in Admin. */
(async()=>{"use strict";
const endpoint="https://wycdpuzlbivtfxwtarzn.supabase.co",key="sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0";
try{
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(endpoint,key,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:config}=await db.from("website_version_settings").select("public_visible").eq("id",true).maybeSingle();
 let visible=config?.public_visible===true;
 if(!visible){const {data:{user}}=await db.auth.getUser();if(!user)return;const {data:staff}=await db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle();visible=staff?.role==="owner";}
 if(!visible)return;
 const badge=document.createElement("div");badge.id="akame-website-build";badge.setAttribute("role","status");badge.style.cssText="position:fixed;left:12px;bottom:12px;z-index:1000;max-width:calc(100vw - 24px);padding:5px 9px;border:1px solid #a982ff40;border-radius:8px;background:#130e1be8;backdrop-filter:blur(9px);color:#a99ab9;font:500 10px/1.4 system-ui,sans-serif;letter-spacing:.015em;pointer-events:none;box-shadow:0 4px 20px #0003";badge.textContent="AkameDevelopment · Build …";document.body.append(badge);
 const cacheKey="akame-build-latest";let data=null;
 try{const cache=JSON.parse(sessionStorage.getItem(cacheKey)||"null");if(cache&&Date.now()-cache.at<120000)data=cache.data}catch{}
 if(!data){try{const res=await fetch("https://api.github.com/repos/AkameDevelopment/AkameDevelopment.github.io/commits?per_page=1",{headers:{Accept:"application/vnd.github+json"}});if(res.ok){const commits=await res.json();const c=commits?.[0];if(c?.sha){data={sha:c.sha.slice(0,7),date:c.commit?.committer?.date||c.commit?.author?.date||null};sessionStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),data}))}}}catch{}}
 const en=(localStorage.getItem("akame-lang")||"de")==="en";if(data){badge.textContent="AkameDevelopment · Build "+data.sha;const date=data.date?new Date(data.date).toLocaleString(en?"en-GB":"de-DE",{dateStyle:"medium",timeStyle:"short"}):"";badge.title=(en?"Latest repository update":"Letztes Repository-Update")+(date?": "+date:"")+" · "+data.sha}else{badge.textContent="AkameDevelopment · Build";badge.title=en?"Build information unavailable":"Build-Information derzeit nicht verfügbar"}
}catch(error){console.warn("Website build indicator unavailable",error)}
})();
