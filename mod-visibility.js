import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0");
const cards=[...document.querySelectorAll(".project[data-category='minecraft']")];
if(cards.length){
 const {data,error}=await db.from("mod_visibility").select("project_slug,visible");
 if(!error&&Array.isArray(data)){
  const hidden=new Set(data.filter(item=>item.visible===false).map(item=>item.project_slug));
  for(const card of cards){
   const href=card.querySelector("a.details")?.getAttribute("href")||"";
   const slug=new URL(href,location.href).searchParams.get("mod");
   card.dataset.adminHidden=hidden.has(slug)?"true":"false";
  }
  window.akameRefreshProjects?.();
 }
}
