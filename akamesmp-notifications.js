(()=>{"use strict";
const header=document.querySelector("header");if(!header||document.getElementById("akame-notify-root"))return;
const tr=(de,en)=>localStorage.getItem("akame-lang")==="en"?en:de;
const root=document.createElement("div");root.id="akame-notify-root";root.className="akame-notify-root";root.hidden=true;
const bell=document.createElement("button");bell.type="button";bell.className="akame-notify-bell";bell.setAttribute("aria-label","Benachrichtigungen");bell.textContent="";bell.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
const count=document.createElement("span");count.className="akame-notify-count";count.hidden=true;bell.append(count);
const panel=document.createElement("section");panel.className="akame-notify-panel";panel.hidden=true;panel.innerHTML='<div class="akame-notify-top"><strong></strong><button type="button" class="akame-notify-read"></button></div><div class="akame-notify-filters" role="group" aria-label="Notification filters"></div><div class="akame-notify-items"></div>';
const label=document.createElement("span");label.className="akame-notify-label";label.textContent="Benachrichtigungen";bell.append(label);root.append(bell,panel);
const accountDropdown=header.querySelector(".akame-account-dropdown");
if(!accountDropdown)return;
const signOut=accountDropdown.querySelector("button:last-child");
accountDropdown.insertBefore(root,signOut||null);
const css=document.createElement("style");css.textContent='.akame-notify-root{position:relative;flex:0 0 auto}.akame-notify-root[hidden],.akame-notify-panel[hidden],.akame-notify-count[hidden]{display:none!important}.akame-notify-bell{position:relative;display:grid;place-items:center;width:42px;height:42px;padding:0;border:1px solid #9c76c255;border-radius:50%;background:#21162e;color:#eadcff;cursor:pointer}.akame-notify-count{position:absolute;top:-5px;right:-6px;min-width:19px;padding:1px 5px;border-radius:20px;background:#9b5be6;color:white;font-size:11px;font-weight:800}.akame-notify-panel{position:absolute;top:calc(100% + 12px);right:0;width:min(350px,calc(100vw - 30px));max-height:420px;overflow-y:auto;padding:14px;background:#1a1225;border:1px solid #9976c177;border-radius:16px;box-shadow:0 20px 65px #000a;z-index:220;color:#f5edff}.akame-notify-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.akame-notify-read{border:0;background:transparent;color:#cba5ff;font-size:12px;cursor:pointer}.akame-notify-item{display:block;width:100%;padding:12px;border-radius:10px;border:0;text-align:left;text-decoration:none;color:#eee0ff;background:transparent;font-size:13px}.akame-notify-item.unread{background:#8b5bd022}.akame-notify-item small{display:block;color:#a998bb;margin-top:4px}.akame-notify-empty{padding:18px;color:#bca9cc;font-size:13px;text-align:center}@media(max-width:850px){.akame-notify-panel{position:fixed;top:70px;right:12px}.akame-notify-bell{width:38px;height:38px}}';document.head.append(css);
let client,user=null,items=[],activeFilter="all";
const top=panel.querySelector("strong"),read=panel.querySelector(".akame-notify-read"),list=panel.querySelector(".akame-notify-items"),filters=panel.querySelector(".akame-notify-filters");
function render(){
 label.textContent=tr("Benachrichtigungen","Notifications");
 top.textContent=tr("Benachrichtigungen","Notifications");
 read.textContent=tr("Community als gelesen","Mark community read");
 const unread=items.filter(i=>!i.read_at).length;
 count.hidden=!unread;count.textContent=unread>99?"99+":String(unread);
 bell.setAttribute("aria-label",tr("Benachrichtigungen","Notifications")+(unread?" ("+unread+")":""));
 filters.replaceChildren();
 for(const [key,de,en] of [["all","Alle","All"],["unread","Ungelesen","Unread"],["beta","Beta","Beta"],["community","Community","Community"],["updates","Updates","Updates"]]){
  const button=document.createElement("button");button.type="button";button.textContent=tr(de,en);
  button.className="akame-notify-filter"+(activeFilter===key?" active":"");
  button.setAttribute("aria-pressed",String(activeFilter===key));
  button.addEventListener("click",()=>{activeFilter=key;render()});filters.append(button);
 }
 list.replaceChildren();
 const visible=items.filter(i=>activeFilter==="all"||activeFilter==="unread"&&!i.read_at||activeFilter==="beta"&&i.source==="beta"||activeFilter==="community"&&i.source!=="beta"||activeFilter==="updates"&&i.source==="update");
 if(!visible.length){const empty=document.createElement("div");empty.className="akame-notify-empty";empty.textContent=tr("Keine Benachrichtigungen in dieser Kategorie.","No notifications in this category.");list.append(empty);return;}
 for(const item of visible){
  const card=document.createElement("div");card.className="akame-notify-item"+(item.read_at?"":" unread");
  const title=document.createElement("div");title.className="akame-notify-item-title";
  if(item.source==="beta")title.textContent=tr("Beta-Einladung: ","Beta invitation: ")+(betaNames[item.project_slug]||item.project_slug);
  else title.textContent=item.source==="mod"?tr("Jemand hat auf deinen Kommentar geantwortet.","Someone replied to your comment."):item.kind==="like"?tr("Jemandem gefällt dein AkameSMP-Beitrag.","Someone liked your AkameSMP post."):tr("Dein AkameSMP-Beitrag hat einen neuen Kommentar.","Someone commented on your AkameSMP post.");
  const date=document.createElement("small");date.textContent=new Date(item.created_at).toLocaleString(localStorage.getItem("akame-lang")==="en"?"en-GB":"de-DE");
  card.append(title,date);
  if(item.source==="beta"){
   const actions=document.createElement("div");actions.className="akame-notify-actions";
   if(item.status==="pending"){
    for(const [accept,de,en] of [[true,"Annehmen","Accept"],[false,"Ablehnen","Decline"]]){
     const btn=document.createElement("button");btn.type="button";btn.textContent=tr(de,en);btn.className=accept?"akame-notify-accept":"akame-notify-decline";
     btn.addEventListener("click",async()=>{
      actions.querySelectorAll("button").forEach(x=>x.disabled=true);
      const {error}=await client.rpc("respond_to_beta_invitation",{p_invitation_id:item.id,p_accept:accept});
      if(error){actions.querySelectorAll("button").forEach(x=>x.disabled=false);btn.title=error.message;alert(tr("Antwort konnte nicht gespeichert werden: ","Could not save response: ")+error.message);return;}
      await refresh();
     });actions.append(btn);
    }
   }else{const state=document.createElement("span");state.textContent=item.status==="accepted"?tr("Angenommen","Accepted"):tr("Abgelehnt","Declined");actions.append(state);}
   card.append(actions);
  }else{
   const a=document.createElement("a");a.className="akame-notify-open";
   a.href=item.source==="mod"?"project.html?mod="+encodeURIComponent(item.project_slug)+"&comment="+encodeURIComponent(item.reply_id)+"#mod-comments":"akamesmp.html#smp-gallery";
   a.textContent=tr("Ansehen","View");
   a.addEventListener("click",()=>{if(!item.read_at)void client.from(item.source==="mod"?"mod_comment_notifications":"akamesmp_notifications").update({read_at:new Date().toISOString()}).eq("id",item.id).eq("recipient_id",user.id)});
   card.append(a);
  }
  list.append(card);
 }
}
const betaNames={modcore:"Core",chest:"ChestScout",crosshair:"Crosshair+",chunkloader:"ChunkLoader",items:"AkameItems",hud:"Hud+",info:"Infos",admin:"Admin",zoom:"Zoom"};
async function refresh(){
 if(!user)return;
 const [smp,mod,beta]=await Promise.all([
  client.from("akamesmp_notifications").select("id,kind,post_id,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50),
  client.from("mod_comment_notifications").select("id,project_slug,comment_id,reply_id,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50),
  client.from("beta_invitations").select("id,project_slug,status,created_at,responded_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50)
 ]);
 if(smp.error&&mod.error&&beta.error)return;
 items=[...(smp.error?[]:smp.data||[]).map(i=>({...i,source:"smp"})),...(mod.error?[]:mod.data||[]).map(i=>({...i,source:"mod"})),...(beta.error?[]:beta.data||[]).map(i=>({...i,source:"beta",read_at:i.status==="pending"?null:i.responded_at||i.created_at}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,75);
 render();
}
bell.addEventListener("click",()=>{panel.hidden=!panel.hidden;if(!panel.hidden)void refresh()});read.addEventListener("click",async()=>{if(!user)return;const now=new Date().toISOString();await Promise.all([client.from("akamesmp_notifications").update({read_at:now}).eq("recipient_id",user.id).is("read_at",null),client.from("mod_comment_notifications").update({read_at:now}).eq("recipient_id",user.id).is("read_at",null)]);await refresh()});document.addEventListener("click",e=>{if(!root.contains(e.target))panel.hidden=true});document.addEventListener("keydown",e=>{if(e.key==="Escape")panel.hidden=true});document.addEventListener("akame-language-change",render);
const extra=document.createElement("style");extra.textContent=".akame-notify-filters{display:flex;gap:5px;overflow-x:auto;padding:3px 0 9px}.akame-notify-filter{border:1px solid #8e6db54a;background:transparent;color:#cfb9e9;padding:5px 8px;border-radius:8px;white-space:nowrap;font-size:11px;cursor:pointer}.akame-notify-filter.active{background:#8d5ddc45;color:#fff;border-color:#a983f1}.akame-notify-item{border-bottom:1px solid #ffffff14!important;border-radius:8px!important;margin-bottom:4px}.akame-notify-item-title{font-weight:650}.akame-notify-actions{display:flex;gap:7px;margin-top:10px;align-items:center}.akame-notify-actions button,.akame-notify-open{border:1px solid #a887d15e;border-radius:8px;padding:6px 10px;background:#ffffff10;color:#eadcff;font-size:12px;cursor:pointer}.akame-notify-accept{background:#7850bb!important}.akame-notify-actions button:disabled{opacity:.5}.akame-notify-open{display:inline-block;margin-top:8px;text-decoration:none}.akame-notify-panel{max-height:420px!important}";document.head.append(extra);
const style=document.createElement("style");style.textContent='#akame-notify-root{width:100%!important;position:static!important;margin:3px 0!important} .akame-account-dropdown #akame-notify-root>.akame-notify-bell{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;width:100%!important;height:auto!important;min-height:40px!important;padding:11px 12px!important;border:0!important;border-radius:9px!important;background:transparent!important;color:#e9ddfa!important;font:650 13px system-ui!important;text-align:left!important} .akame-account-dropdown #akame-notify-root>.akame-notify-bell:hover{background:#a982ff24!important} #akame-notify-root .akame-notify-label{flex:1} #akame-notify-root .akame-notify-count{position:static!important;min-width:19px;line-height:17px;text-align:center} #akame-notify-root .akame-notify-panel{position:static!important;width:100%!important;max-height:310px!important;overflow-y:auto!important;box-shadow:none!important;border:1px solid #9976c13a!important;border-radius:10px!important;padding:9px!important;margin-top:5px!important;background:#120d1e!important;z-index:auto!important} #akame-notify-root .akame-notify-read{width:auto!important;padding:5px!important;color:#cba5ff!important;font-size:11px!important;text-align:right!important} #akame-notify-root .akame-notify-item{font-weight:500!important;line-height:1.4!important;white-space:normal!important}';document.head.append(style);
(async()=>{const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");client=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0");const {data}=await client.auth.getUser();user=data?.user||null;root.hidden=!user;if(user)await refresh();client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;root.hidden=!user;items=[];render();if(user)void refresh()});setInterval(()=>{if(user)void refresh()},30000)})().catch(()=>{root.hidden=true});
})();