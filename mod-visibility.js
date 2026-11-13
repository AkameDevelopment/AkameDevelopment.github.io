import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
const cards=[...document.querySelectorAll(".project[data-category='minecraft']")];
async function refresh(){
 const [{data:rules,error},{data:auth}]=await Promise.all([db.from("mod_visibility").select("project_slug,visibility,visible"),db.auth.getUser()]);
 if(error||!Array.isArray(rules)){console.warn("Mod visibility unavailable",error);const grid=document.getElementById("projectGrid");if(grid){grid.removeAttribute("data-visibility-pending");grid.setAttribute("aria-busy","false");}for(const card of cards)card.dataset.adminHidden="true";window.akameRefreshProjects?.();return;}
 const userId=auth?.user?.id;
 let isAdmin=false;
 if(userId){const access=await db.from("staff_access").select("role").eq("user_id",userId).maybeSingle();isAdmin=!access.error&&["admin","owner"].includes(access.data?.role);}
 let allowed=new Set();
 if(userId){const beta=await db.from("beta_access").select("project_slug").eq("user_id",userId);if(!beta.error)allowed=new Set((beta.data||[]).map(x=>x.project_slug));}
 const bySlug=new Map(rules.map(r=>[r.project_slug,r.visibility|| (r.visible?"public":"hidden")]));
 for(const card of cards){
   const href=card.querySelector("a.details")?.getAttribute("href")||"";
   const slug=new URL(href,location.href).searchParams.get("mod");
   const mode=bySlug.get(slug)||"hidden";
   card.dataset.adminHidden=isAdmin||mode==="public"||mode==="beta"&&allowed.has(slug)?"false":"true";
 }
 const grid=document.getElementById("projectGrid");if(grid){grid.removeAttribute("data-visibility-pending");grid.setAttribute("aria-busy","false");}
 window.akameRefreshProjects?.();
}
if(cards.length){void refresh();db.auth.onAuthStateChange(()=>{void refresh();});}
