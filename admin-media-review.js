import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0");
const root=document.getElementById("media-review-manager");
if(root){
 const list=root.querySelector("#media-review-list"),state=root.querySelector("#media-review-status"),count=root.querySelector("#media-review-count");
 const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang"))==="en"?en:de;
 async function refresh(){
  const {data,error}=await db.from("media_moderation_reviews").select("id,submitted_by,surface,media_url,reason,created_at,post_body,post_tag,post_topic,gallery_slot").eq("status","pending").order("created_at",{ascending:true}).limit(100);
  list.replaceChildren();if(error){state.textContent=error.message;return}
  count.textContent=String(data.length);notificationCount.textContent=String(data.length);notificationCount.hidden=data.length===0;notificationButton.setAttribute("aria-label",tr("Offene Freigaben: ","Pending approvals: ")+data.length);state.textContent=data.length?"":tr("Keine offenen Prüfungen.","No pending reviews.");
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
 const notification=document.createElement("div");notification.className="media-review-notification";notification.hidden=true;
 notification.innerHTML='<button type="button" class="media-review-notification-button" aria-expanded="false" aria-controls="media-review-manager"><span aria-hidden="true">🔔</span> <span class="media-review-button-label">Freigaben</span> <span class="media-review-notification-count" hidden>0</span></button>';
 const notificationButton=notification.querySelector("button"),notificationCount=notification.querySelector(".media-review-notification-count");
 const styles=document.createElement("style");styles.textContent=`
 .media-review-notification{position:relative;display:flex;justify-content:flex-end;margin:0 0 12px}.media-review-notification[hidden]{display:none!important}
 .media-review-notification-button{display:inline-flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid #a982ff65;border-radius:12px;background:#a982ff16;color:#f5eaff;font-weight:700;cursor:pointer}
 .media-review-notification-button:hover{background:#a982ff30}
 .media-review-notification-count{min-width:21px;padding:1px 6px;border-radius:999px;background:#b68aff;color:#130c20;text-align:center;font-size:12px;font-weight:800}
 .media-review-notification-count[hidden]{display:none}
 #media-review-manager.media-review-popover{max-width:720px;margin:0 0 22px auto!important;box-shadow:0 14px 40px #0005}
 #media-review-manager.media-review-popover[hidden]{display:none!important}
 #media-review-manager.media-review-popover #media-review-list{max-height:min(65vh,650px);overflow-y:auto;overscroll-behavior:contain}
 @media(max-width:650px){#media-review-manager.media-review-popover{max-width:100%}#media-review-manager.media-review-popover #media-review-list{max-height:65vh}}
 `;document.head.append(styles);
 root.classList.add("media-review-popover");root.before(notification);
 notificationButton.addEventListener("click",async()=>{const open=root.hidden;root.hidden=!open;notificationButton.setAttribute("aria-expanded",String(open));if(open)await refresh()});
 const {data:{user}}=await db.auth.getUser();
 if(user){const {data}=await db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle();if(["owner","admin"].includes(data?.role)){notification.hidden=false;root.hidden=true;root.querySelector("#media-review-refresh").onclick=refresh;await refresh();setInterval(()=>{if(!document.hidden)void refresh()},45000)}}
 document.addEventListener("akame-language-change",()=>{notification.querySelector(".media-review-button-label").textContent=tr("Freigaben","Approvals");if(!notification.hidden)void refresh()});
}
