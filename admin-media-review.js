import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0");
const root=document.getElementById("media-review-manager");
if(root){
 const list=root.querySelector("#media-review-list"),state=root.querySelector("#media-review-status"),count=root.querySelector("#media-review-count");
 const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang"))==="en"?en:de;
 async function refresh(){
  const {data,error}=await db.from("media_moderation_reviews").select("id,submitted_by,surface,media_url,reason,created_at,post_body,post_tag,post_topic,gallery_slot").eq("status","pending").order("created_at",{ascending:true}).limit(100);
  list.replaceChildren();if(error){state.textContent=error.message;return}
  count.textContent=String(data.length);state.textContent=data.length?"":tr("Keine offenen Prüfungen.","No pending reviews.");
  for(const item of data){
   const card=document.createElement("article");card.style.cssText="border:1px solid #ffffff25;border-radius:13px;padding:16px;margin:12px 0;background:#ffffff08";
   const head=document.createElement("strong");head.textContent=(item.surface==="community_post"?tr("Community-Beitrag","Community post"):tr("Profilbild","Profile image"))+" · #"+item.id;card.append(head);
   const info=document.createElement("p");info.style.cssText="font-size:12px;color:#c7b6d6;overflow-wrap:anywhere";info.textContent=tr("Eingereicht: ","Submitted: ")+new Date(item.created_at).toLocaleString()+" · "+(item.reason||"manual_review");card.append(info);
   const img=document.createElement("img");img.src=item.media_url;img.alt=tr("Bild zur Prüfung","Image for review");img.loading="lazy";img.referrerPolicy="no-referrer";img.style.cssText="display:block;max-width:100%;max-height:240px;object-fit:contain;border-radius:10px;margin:10px 0";card.append(img);
   const link=document.createElement("a");link.href=item.media_url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=tr("Bildlink öffnen","Open image URL");card.append(link);
   if(item.post_body){const body=document.createElement("p");body.style.whiteSpace="pre-wrap";body.textContent=item.post_body;card.append(body)}
   const actions=document.createElement("div");actions.style.cssText="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px";
   for(const [approve,label] of [[true,tr("Freigeben","Approve")],[false,tr("Ablehnen","Reject")]]){
    const btn=document.createElement("button");btn.type="button";btn.className="ghost";btn.textContent=label;
    btn.addEventListener("click",async()=>{if(!confirm(approve?tr("Bild wirklich freigeben?","Approve this image?"):tr("Bild wirklich ablehnen?","Reject this image?")))return;for(const b of actions.querySelectorAll("button"))b.disabled=true;const {error}=await db.rpc("review_media_request",{p_id:item.id,p_approve:approve});if(error){state.textContent=error.message;for(const b of actions.querySelectorAll("button"))b.disabled=false;return}await refresh()});actions.append(btn);
   }card.append(actions);list.append(card);
  }
 }
 const {data:{user}}=await db.auth.getUser();
 if(user){const {data}=await db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle();if(["owner","admin"].includes(data?.role)){root.hidden=false;root.querySelector("#media-review-refresh").onclick=refresh;await refresh()}}
 document.addEventListener("akame-language-change",()=>{if(!root.hidden)void refresh()});
}
