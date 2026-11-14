(()=>{"use strict";
const header=document.querySelector("header");if(!header||document.getElementById("akame-notify-root"))return;
const tr=(de,en)=>localStorage.getItem("akame-lang")==="en"?en:de;
const root=document.createElement("div");root.id="akame-notify-root";root.className="akame-notify-root";root.hidden=true;
const bell=document.createElement("button");bell.type="button";bell.className="akame-notify-bell";bell.setAttribute("aria-label","Benachrichtigungen");bell.textContent="";bell.innerHTML='<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
const count=document.createElement("span");count.className="akame-notify-count";count.hidden=true;bell.append(count);
const panel=document.createElement("section");panel.className="akame-notify-panel";panel.hidden=true;panel.innerHTML='<div class="akame-notify-top"><div class="akame-notify-heading"><strong></strong><span class="akame-notify-subtitle"></span></div></div><div class="akame-notify-toolbar"><div class="akame-notify-filters" role="group" aria-label="Notification filters"></div><button type="button" class="akame-notify-read"></button></div><div class="akame-notify-category"><select class="akame-notify-source-filter"></select></div><div class="akame-notify-items"></div>';
const label=document.createElement("span");label.className="akame-notify-label";label.textContent="Benachrichtigungen";bell.append(label);root.append(bell);document.body.append(panel);const backdrop=document.createElement('div');backdrop.className='akame-notify-backdrop';backdrop.hidden=true;document.body.append(backdrop);
const accountDropdown=header.querySelector(".akame-account-dropdown");
if(!accountDropdown)return;
const desktopRoot=document.getElementById("akame-desktop-notify-root")||document.createElement("div");desktopRoot.id="akame-desktop-notify-root";desktopRoot.className="akame-desktop-notify-root";desktopRoot.hidden=false;
const desktopBell=desktopRoot.querySelector("button")||document.createElement("button");desktopBell.type="button";desktopBell.className="akame-notify-bell akame-desktop-notify-bell";desktopBell.setAttribute("aria-label",tr("Benachrichtigungen","Notifications"));desktopBell.setAttribute("aria-haspopup","dialog");desktopBell.setAttribute("aria-expanded","false");desktopBell.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>';
const desktopCount=document.createElement("span");desktopCount.className="akame-notify-count";desktopCount.hidden=true;desktopBell.append(desktopCount);desktopRoot.append(desktopBell);desktopBell.disabled=true;desktopBell.setAttribute("aria-busy","true");
const headerActions=header.querySelector(".akame-header-actions");if(headerActions)headerActions.insertBefore(desktopRoot,headerActions.querySelector(".akame-account"));

const signOut=accountDropdown.querySelector("button:last-child");
accountDropdown.insertBefore(root,signOut||null);
const css=document.createElement("style");css.textContent='.akame-notify-root{position:relative;flex:0 0 auto}.akame-notify-root[hidden],.akame-notify-panel[hidden],.akame-notify-count[hidden]{display:none!important}.akame-notify-bell{position:relative;display:grid;place-items:center;width:42px;height:42px;padding:0;border:1px solid #9c76c255;border-radius:50%;background:#21162e;color:#eadcff;cursor:pointer}.akame-notify-count{position:absolute;top:-5px;right:-6px;min-width:19px;padding:1px 5px;border-radius:20px;background:#9b5be6;color:white;font-size:11px;font-weight:800}.akame-notify-panel{position:absolute;top:calc(100% + 12px);right:0;width:min(350px,calc(100vw - 30px));max-height:420px;overflow-y:auto;padding:14px;background:#1a1225;border:1px solid #9976c177;border-radius:16px;box-shadow:0 20px 65px #000a;z-index:220;color:#f5edff}.akame-notify-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.akame-notify-read{border:0;background:transparent;color:#cba5ff;font-size:12px;cursor:pointer}.akame-notify-item{display:block;width:100%;padding:12px;border-radius:10px;border:0;text-align:left;text-decoration:none;color:#eee0ff;background:transparent;font-size:13px}.akame-notify-item.unread{background:#8b5bd022}.akame-notify-item small{display:block;color:#a998bb;margin-top:4px}.akame-notify-empty{padding:18px;color:#bca9cc;font-size:13px;text-align:center}@media(max-width:850px){.akame-notify-panel{position:fixed;top:70px;right:12px}.akame-notify-bell{width:38px;height:38px}}';document.head.append(css);
let client,user=null,lastTrigger=null,mobilePageLock=null,lastTouchY=null,items=[],activeFilter="all",activeType="all",profiles=new Map();

async function fetchProfiles(){
 const ids=[...new Set(items.map(i=>i.source==="beta"?i.invited_by:i.source==="beta-feedback"?i.user_id:i.actor_id).filter(Boolean))].filter(id=>!profiles.has(id));
 await Promise.all(ids.map(async id=>{
  try{const {data,error}=await client.rpc("get_public_profile",{p_user_id:id});if(error)throw error;const profile=(Array.isArray(data)?data[0]:data)||{};profiles.set(id,profile)}catch(error){console.warn("Notification profile lookup failed",error);/* retry next refresh */}
 }));
}
const top=panel.querySelector("strong"),read=panel.querySelector(".akame-notify-read"),list=panel.querySelector(".akame-notify-items"),filters=panel.querySelector(".akame-notify-filters");
const sourceFilter=panel.querySelector(".akame-notify-source-filter");
sourceFilter.addEventListener("change",()=>{activeType=sourceFilter.value;render()});
function notificationTime(value){
 const date=new Date(value),minutes=Math.max(0,Math.floor((Date.now()-date.getTime())/60000));
 if(!Number.isFinite(minutes))return "—";
 if(minutes<1)return tr("Gerade eben","Just now");
 if(minutes<60)return tr("vor "+minutes+" Min.",minutes+" min ago");
 const hours=Math.floor(minutes/60);
 if(hours<24)return tr("vor "+hours+" Std.",hours+" hr ago");
 return date.toLocaleDateString(localStorage.getItem("akame-lang")==="en"?"en-GB":"de-DE",{day:"2-digit",month:"short",year:date.getFullYear()===new Date().getFullYear()?undefined:"numeric"});
}
async function markNotificationRead(item){
 if(!user||item.read_at)return true;
 const now=new Date().toISOString();
 const source=item.source;
 let query;
 if(source==="beta")query=client.from("beta_invitations").update({recipient_read_at:now}).eq("id",item.id).eq("user_id",user.id);
 else if(source==="beta-feedback")query=client.from("beta_invitations").update({sender_read_at:now}).eq("id",item.id).eq("invited_by",user.id);
 else query=client.from(source==="support"?"support_notifications":source==="mod"?"mod_comment_notifications":"akamesmp_notifications").update({read_at:now}).eq("id",item.id).eq("recipient_id",user.id);
 try{const {error}=await query;if(error)throw error;item.read_at=now;render();return true}catch(error){console.warn("Could not mark notification as read",error);return false}
}
function bindNotificationLink(link,item){link.addEventListener("click",async e=>{
 if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 e.preventDefault();const destination=link.href;await markNotificationRead(item);window.location.assign(destination);
})}
function render(){
 label.textContent=tr("Benachrichtigungen","Notifications");
 top.textContent=tr("Benachrichtigungen","Notifications");
 read.textContent=tr("Alle als gelesen","Mark all read");
 panel.setAttribute("aria-label",tr("Benachrichtigungen","Notifications"));
 closeButton.setAttribute("aria-label",tr("Schließen","Close"));
 filters.setAttribute("aria-label",tr("Benachrichtigungen filtern","Filter notifications"));
 sourceFilter.setAttribute("aria-label",tr("Bereich auswählen","Choose category"));
 sourceFilter.replaceChildren();
 for(const [key,de,en] of [["all","Alle Bereiche","All categories"],["community","Community","Community"],["support","Support","Support"],["beta","Beta-Einladungen","Beta invitations"],["updates","Updates","Updates"]]){
  const option=document.createElement("option");option.value=key;option.textContent=tr(de,en);option.selected=key===activeType;sourceFilter.append(option);
 }
 const enabled=i=>i.source==="support"?true:(i.source==="beta"||i.source==="beta-feedback")?localStorage.getItem("akame-notify-beta")!=="false":i.source==="update"?localStorage.getItem("akame-notify-updates")!=="false":localStorage.getItem("akame-notify-community")!=="false";const unread=items.filter(i=>enabled(i)&&!i.read_at).length;
 panel.querySelector(".akame-notify-subtitle").textContent=tr(unread+" ungelesen",unread+" unread");
 count.hidden=!unread;count.textContent=unread>99?"99+":String(unread);desktopCount.hidden=count.hidden;desktopCount.textContent=count.textContent;
 desktopBell.setAttribute("aria-label",tr("Benachrichtigungen","Notifications")+(unread?" ("+unread+")":""));read.disabled=!items.some(i=>!i.read_at);read.title=read.disabled?tr("Keine ungelesenen Benachrichtigungen","No unread notifications"):"";
 bell.setAttribute("aria-label",tr("Benachrichtigungen","Notifications")+(unread?" ("+unread+")":""));
 filters.replaceChildren();
 for(const [key,de,en] of [["all","Alle","All"],["unread","Ungelesen","Unread"]]){
  const button=document.createElement("button");button.type="button";button.textContent=tr(de,en);
  button.className="akame-notify-filter"+(activeFilter===key?" active":"");
  button.setAttribute("aria-pressed",String(activeFilter===key));
  button.addEventListener("click",()=>{activeFilter=key;render()});filters.append(button);
 }
 list.replaceChildren();
 const visible=items.filter(enabled).filter(i=>activeFilter!=="unread"||!i.read_at).filter(i=>activeType==="all"||activeType==="beta"&&(i.source==="beta"||i.source==="beta-feedback")||activeType==="community"&&(i.source==="smp"||i.source==="mod")||activeType==="support"&&i.source==="support"||activeType==="updates"&&i.source==="update");
 if(!visible.length){const empty=document.createElement("div");empty.className="akame-notify-empty";empty.textContent=tr("Keine Benachrichtigungen in dieser Kategorie.","No notifications in this category.");list.append(empty);return;}
 for(const item of visible){
  const card=document.createElement("div");card.className="akame-notify-item"+(item.read_at?"":" unread");
  const title=document.createElement(item.source==="beta"?"div":"a");title.className="akame-notify-item-title";
  if(item.source==="support")title.textContent=item.ticket_number+" · "+(item.kind==="resolved"?tr("Anfrage erledigt","Ticket resolved"):item.kind==="reply"?tr("Neue Antwort vom Team","New team reply"):tr("Status aktualisiert","Status updated"));
  else if(item.source==="beta-feedback")title.textContent=item.status==="accepted"?tr("Akzeptiert","Accepted"):tr("Abgelehnt","Declined");
  else if(item.source==="beta")title.textContent=tr("Beta-Einladung: ","Beta invitation: ")+(betaNames[item.project_slug]||item.project_slug);
  else title.textContent=item.source==="mod"?tr("Jemand hat auf deinen Kommentar geantwortet.","Someone replied to your comment."):item.kind==="like"?tr("Jemandem gefällt dein AkameSMP-Beitrag.","Someone liked your AkameSMP post."):tr("Dein AkameSMP-Beitrag hat einen neuen Kommentar.","Someone commented on your AkameSMP post.");
  const date=document.createElement("small");date.className="akame-notify-time";date.textContent=notificationTime(item.created_at);date.title=new Date(item.created_at).toLocaleString(localStorage.getItem("akame-lang")==="en"?"en-GB":"de-DE");
  const actor=profiles.get(item.source==="beta"?item.invited_by:item.source==="beta-feedback"?item.user_id:item.actor_id)||{};
  const actorId=item.source==="beta"?item.invited_by:item.source==="beta-feedback"?item.user_id:item.actor_id;
  const identity=document.createElement(actorId?"a":"div");identity.className="akame-notify-identity";
  if(actorId){identity.href="user.html?id="+encodeURIComponent(actorId);identity.title=tr("Profil ansehen","View profile");identity.setAttribute("aria-label",tr("Profil von ","Profile of ")+(actor.display_name||tr("Mitglied","Member")));}
  const avatar=document.createElement("span");avatar.className="akame-notify-avatar";
  const displayName=(actor.display_name||actor.name||tr("Mitglied","Member")).trim();
  avatar.textContent=displayName.slice(0,1).toUpperCase();
  if(actor.avatar_url&&/^https?:\/\//i.test(actor.avatar_url)){
   const img=document.createElement("img");img.src=actor.avatar_url;img.alt="";img.referrerPolicy="no-referrer";img.loading="lazy";
   img.onerror=()=>{img.remove();avatar.textContent=displayName.slice(0,1).toUpperCase()};avatar.replaceChildren(img);
  }
  const who=document.createElement("span");who.className="akame-notify-actor";who.textContent=displayName;
  identity.append(avatar,who);if(actorId)bindNotificationLink(identity,item);card.append(identity,title,date);
  if(item.source==="beta"){
   const actions=document.createElement("div");actions.className="akame-notify-actions";
   if(item.status==="pending"){
    for(const [accept,de,en] of [[true,"Annehmen","Accept"],[false,"Ablehnen","Decline"]]){
     const btn=document.createElement("button");btn.type="button";btn.textContent=tr(de,en);btn.className=accept?"akame-notify-accept":"akame-notify-decline";
     btn.addEventListener("click",async()=>{
      actions.querySelectorAll("button").forEach(x=>x.disabled=true);
      const {error}=await client.rpc("respond_to_beta_invitation",{p_invitation_id:item.id,p_accept:accept});
      if(error){actions.querySelectorAll("button").forEach(x=>x.disabled=false);btn.title=error.message;alert(tr("Antwort konnte nicht gespeichert werden: ","Could not save response: ")+error.message);return;}
      await markNotificationRead(item);await refresh();
     });actions.append(btn);
    }
   }else{const state=document.createElement("span");state.textContent=item.status==="accepted"?tr("Angenommen","Accepted"):tr("Abgelehnt","Declined");actions.append(state);}
   card.append(actions);
  }else{
   const a=document.createElement("a");a.className="akame-notify-open";
   a.href=item.source==="support"?"support.html?ticket="+encodeURIComponent(item.request_id):item.source==="beta-feedback"?"admin.html?member="+encodeURIComponent(item.user_id):item.source==="mod"?"project.html?mod="+encodeURIComponent(item.project_slug)+"&comment="+encodeURIComponent(item.reply_id)+"#mod-comments":"community.html?post="+encodeURIComponent(item.post_id)+"#community-social-feed";
   a.textContent=tr("Ansehen","View");
   title.href=a.href;title.classList.add("akame-notify-title-link");
   bindNotificationLink(title,item);
  }
  card.addEventListener("click",e=>{if(e.target.closest("a,button,input,select,textarea"))return;const link=card.querySelector(".akame-notify-title-link");if(link)link.click();else void markNotificationRead(item)});
  const avatarLink=document.createElement(actorId?"a":"span");avatarLink.className="akame-notify-avatar-link";
  if(actorId){avatarLink.href=identity.href;avatarLink.setAttribute("aria-label",identity.getAttribute("aria-label"));bindNotificationLink(avatarLink,item)}
  avatarLink.append(avatar);
  const body=document.createElement("div");body.className="akame-notify-body";
  while(card.firstChild)body.append(card.firstChild);
  card.append(avatarLink,body);list.append(card);
 }
}
const betaNames={modcore:"Core",chest:"ChestScout",crosshair:"Crosshair+",chunkloader:"ChunkLoader",items:"AkameItems",hud:"Hud+",info:"Infos",admin:"Admin",zoom:"Zoom"};
async function refresh(){
 if(!user)return;
 const [smp,mod,beta,sent,support]=await Promise.all([
  client.from("akamesmp_notifications").select("id,kind,actor_id,post_id,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50),
  client.from("mod_comment_notifications").select("id,actor_id,project_slug,comment_id,reply_id,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50),
  client.from("beta_invitations").select("id,project_slug,status,invited_by,created_at,responded_at,recipient_read_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50),
  client.from("beta_invitations").select("id,project_slug,status,user_id,created_at,responded_at,sender_read_at").eq("invited_by",user.id).neq("user_id",user.id).in("status",["accepted","declined"]).order("responded_at",{ascending:false}).limit(50),
  client.from("support_notifications").select("id,actor_id,request_id,ticket_number,kind,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(50)
 ]);
 if(smp.error&&mod.error&&beta.error&&sent.error&&support.error)return;
 items=[...(support.data||[]).map(i=>({...i,source:"support"})),...(smp.data||[]).map(i=>({...i,source:"smp"})),...(mod.data||[]).map(i=>({...i,source:"mod"})),...(beta.data||[]).map(i=>({...i,source:"beta",read_at:i.recipient_read_at||(i.status==="pending"?null:i.responded_at||i.created_at)})),...(sent.data||[]).map(i=>({...i,source:"beta-feedback",read_at:i.sender_read_at}))].sort((a,b)=>new Date(b.responded_at||b.created_at)-new Date(a.responded_at||a.created_at)).slice(0,100);
 await fetchProfiles();render();
}
function syncMobilePageLock(){
 const active=!panel.hidden&&window.innerWidth<=850;
 if(active&&!mobilePageLock)mobilePageLock={x:window.scrollX||0,y:window.scrollY||0};
 if(!active)mobilePageLock=null;
}
function preserveMobilePagePosition(){
 if(mobilePageLock&&(window.scrollX!==mobilePageLock.x||window.scrollY!==mobilePageLock.y))window.scrollTo({left:mobilePageLock.x,top:mobilePageLock.y,behavior:"instant"});
}
function canScrollNotifications(target,delta){
 const area=target?.closest?.(".akame-notify-items");
 if(!area||!panel.contains(area))return false;
 const max=Math.max(0,area.scrollHeight-area.clientHeight);
 return max>0&&(delta>0?area.scrollTop<max-1:delta<0?area.scrollTop>0:true);
}
document.addEventListener("touchstart",event=>{if(mobilePageLock&&event.touches.length===1)lastTouchY=event.touches[0].clientY},{capture:true,passive:true});
document.addEventListener("touchmove",event=>{
 if(!mobilePageLock||event.touches.length!==1)return;
 const y=event.touches[0].clientY,delta=lastTouchY===null?0:lastTouchY-y;lastTouchY=y;
 if(!canScrollNotifications(event.target,delta))event.preventDefault();
},{capture:true,passive:false});
document.addEventListener("touchend",()=>{lastTouchY=null},{capture:true,passive:true});
document.addEventListener("wheel",event=>{if(mobilePageLock&&!canScrollNotifications(event.target,event.deltaY))event.preventDefault()},{capture:true,passive:false});
document.addEventListener("keydown",event=>{
 if(!mobilePageLock||!panel.contains(event.target)||event.target.closest("input,select,textarea"))return;
 const key=event.key;
 if(!["PageDown","PageUp","ArrowDown","ArrowUp","Home","End"," "].includes(key))return;
 if(key===" "&&event.target.closest("button,a"))return;
 const area=panel.querySelector(".akame-notify-items");event.preventDefault();
 if(key==="Home")area.scrollTop=0;
 else if(key==="End")area.scrollTop=area.scrollHeight;
 else area.scrollBy({top:(key==="ArrowDown"||key==="ArrowUp"?40:area.clientHeight*.8)*(key==="ArrowUp"||key==="PageUp"||key===" "&&event.shiftKey?-1:1),behavior:"instant"});
});
function closeNotifications(){preserveMobilePagePosition();mobilePageLock=null;const focusInside=panel.contains(document.activeElement);panel.hidden=true;backdrop.hidden=true;document.documentElement.classList.remove("akame-notifications-open");bell.setAttribute("aria-expanded","false");desktopBell.setAttribute("aria-expanded","false");if(focusInside)(lastTrigger===desktopBell&&window.innerWidth>850?desktopBell:header.querySelector(".akame-account-trigger")||bell).focus({preventScroll:true})}
function placeNotifications(){
 syncMobilePageLock();
 const viewport=window.visualViewport;
 const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
 const width=viewport?.width||document.documentElement.clientWidth||window.innerWidth;
 const height=viewport?.height||window.innerHeight;
 const mobile=window.innerWidth<=850;
 const drawerWidth=mobile?width:Math.min(420,width);
 const drawerTop=mobile?top:Math.max(top,Math.min(header.getBoundingClientRect().bottom,top+height));
 const drawerHeight=Math.max(0,top+height-drawerTop);
 panel.style.setProperty("--akame-notify-left",left+width-drawerWidth+"px");
 panel.style.setProperty("--akame-notify-top",drawerTop+"px");
 panel.style.setProperty("--akame-notify-width",drawerWidth+"px");
 panel.style.setProperty("--akame-notify-height",drawerHeight+"px");
 backdrop.style.left=left+"px";backdrop.style.top=drawerTop+"px";
 backdrop.style.width=width+"px";backdrop.style.height=drawerHeight+"px";
}
function openNotifications(trigger=bell){
 lastTrigger=trigger;
 document.dispatchEvent(new CustomEvent("akame-open-overlay",{detail:{name:"notifications"}}));
 panel.hidden=false;backdrop.hidden=false;
 document.documentElement.classList.add("akame-notifications-open");
 placeNotifications();bell.setAttribute("aria-expanded","true");desktopBell.setAttribute("aria-expanded","true");
 closeButton.focus({preventScroll:true});void refresh();
}
bell.setAttribute("aria-haspopup","dialog");bell.setAttribute("aria-expanded","false");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",tr("Benachrichtigungen","Notifications"));
const closeButton=document.createElement("button");closeButton.type="button";closeButton.className="akame-notify-close";closeButton.setAttribute("aria-label",tr("Schließen","Close"));closeButton.textContent="×";panel.querySelector(".akame-notify-top").append(closeButton);closeButton.addEventListener("click",closeNotifications);backdrop.addEventListener("click",closeNotifications);
document.addEventListener("pointerdown",e=>{if(panel.hidden)return;if(panel.contains(e.target)||root.contains(e.target)||desktopRoot.contains(e.target))return;closeNotifications()},{capture:true});panel.addEventListener("click",e=>e.stopPropagation());window.addEventListener("resize",()=>{if(!panel.hidden)placeNotifications()});window.addEventListener("scroll",()=>{if(!panel.hidden){preserveMobilePagePosition();placeNotifications()}},{passive:true});
window.visualViewport?.addEventListener("resize",()=>{if(!panel.hidden)placeNotifications()});
window.visualViewport?.addEventListener("scroll",()=>{if(!panel.hidden)placeNotifications()});
document.addEventListener("akame-open-overlay",event=>{if(event.detail?.name!=="notifications")closeNotifications()});
bell.addEventListener("click",()=>{if(panel.hidden)openNotifications(bell);else closeNotifications()});
desktopBell.addEventListener("click",()=>{if(panel.hidden)openNotifications(desktopBell);else closeNotifications()});read.addEventListener("click",async()=>{
 if(!user||read.disabled)return;
 read.disabled=true;read.textContent=tr("Wird gespeichert…","Saving…");
 const now=new Date().toISOString();
 const tasks=[
  client.from("support_notifications").update({read_at:now}).eq("recipient_id",user.id).is("read_at",null).select("id"),
  client.from("akamesmp_notifications").update({read_at:now}).eq("recipient_id",user.id).is("read_at",null).select("id"),
  client.from("mod_comment_notifications").update({read_at:now}).eq("recipient_id",user.id).is("read_at",null).select("id"),
  client.from("beta_invitations").update({sender_read_at:now}).eq("invited_by",user.id).in("status",["accepted","declined"]).is("sender_read_at",null).select("id"),
  client.from("beta_invitations").update({recipient_read_at:now}).eq("user_id",user.id).is("recipient_read_at",null).select("id")
 ];
 const results=await Promise.allSettled(tasks);
 const errors=results.filter(r=>r.status==="rejected"||r.value.error).map(r=>r.status==="rejected"?String(r.reason):r.value.error.message);
 await refresh();
 if(errors.length){alert(tr("Nicht alle Benachrichtigungen konnten als gelesen markiert werden: ","Some notifications could not be marked as read: ")+errors.join("; "));}
});
document.addEventListener("keydown",event=>{
 if(panel.hidden||event.key!=="Tab")return;
 const focusable=[...panel.querySelectorAll("button,a[href],select,input,textarea,[tabindex]")].filter(el=>!el.disabled&&!el.hidden&&el.getAttribute("tabindex")!=="-1");
 const first=focusable[0],last=focusable.at(-1);
 if(!first){event.preventDefault();closeButton.focus({preventScroll:true});return}
 if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus({preventScroll:true})}
 else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus({preventScroll:true})}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){closeNotifications()}});document.addEventListener("akame-language-change",render);document.addEventListener("akame-settings-change",render);window.addEventListener("storage",render);
const identityStyle=document.createElement("style");identityStyle.textContent=".akame-notify-identity{display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:12px;font-weight:700;color:#e9d5ff;text-decoration:none;width:fit-content;max-width:100%;border-radius:8px}.akame-notify-identity[href]{cursor:pointer}.akame-notify-identity[href]:hover .akame-notify-actor{text-decoration:underline;color:#fff}.akame-notify-identity[href]:focus-visible{outline:2px solid #b892ff;outline-offset:3px}.akame-notify-avatar{width:28px;height:28px;border-radius:50%;background:#72509c;display:grid;place-items:center;overflow:hidden;flex:none}.akame-notify-avatar img{width:100%;height:100%;object-fit:cover}";document.head.append(identityStyle);
const extra=document.createElement("style");extra.textContent=".akame-notify-filters{display:flex;gap:5px;overflow-x:auto;padding:3px 0 9px}.akame-notify-filter{border:1px solid #8e6db54a;background:transparent;color:#cfb9e9;padding:5px 8px;border-radius:8px;white-space:nowrap;font-size:11px;cursor:pointer}.akame-notify-filter.active{background:#8d5ddc45;color:#fff;border-color:#a983f1}.akame-notify-item{border-bottom:1px solid #ffffff14!important;border-radius:8px!important;margin-bottom:4px}.akame-notify-item-title{font-weight:650}.akame-notify-actions{display:flex;gap:7px;margin-top:10px;align-items:center}.akame-notify-actions button,.akame-notify-open{border:1px solid #a887d15e;border-radius:8px;padding:6px 10px;background:#ffffff10;color:#eadcff;font-size:12px;cursor:pointer}.akame-notify-accept{background:#7850bb!important}.akame-notify-actions button:disabled{opacity:.5}.akame-notify-open{display:inline-block;margin-top:8px;text-decoration:none}.akame-notify-panel{max-height:420px!important}";document.head.append(extra);
const modalStyle=document.createElement("style");modalStyle.textContent="\n/* Right-aligned notification popover, anchored to account menu trigger. */\n.akame-notify-backdrop[hidden]{display:none!important}\n.akame-notify-backdrop{display:none!important}\n/* Nonmodal popovers must not change the document scroll container. */\n\nhtml.akame-notifications-open .akame-notify-panel{overscroll-behavior:contain!important}\nbody .akame-notify-panel:not([hidden]){position:fixed!important;inset:var(--akame-notify-top,80px) auto auto var(--akame-notify-left,12px)!important;transform:none!important;display:flex!important;flex-direction:column!important;width:var(--akame-notify-width,min(440px,calc(100vw - 24px)))!important;max-width:none!important;max-height:min(590px,var(--akame-notify-height,calc(100dvh - 100px)))!important;min-height:min(310px,var(--akame-notify-height,calc(100dvh - 100px)))!important;margin:0!important;padding:18px!important;background:#1a1225!important;border:1px solid #9e7bc06b!important;border-radius:17px!important;box-shadow:0 18px 65px #000a!important;z-index:9998!important;overflow:hidden!important;box-sizing:border-box!important}\nbody .akame-notify-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}\nbody .akame-notify-top strong{font-size:17px;flex:1 1 auto}\nbody .akame-notify-read{white-space:nowrap;text-align:center;max-width:none;padding:8px 12px;border:1px solid #a67ce077;border-radius:9px;background:#9261cf28;color:#ead5ff;font-weight:700;font-size:12px;cursor:pointer}body .akame-notify-read:hover:not(:disabled){background:#9261cf4d}body .akame-notify-read:disabled{opacity:.45;cursor:default}\nbody .akame-notify-close{flex:none;width:30px;height:30px;border:1px solid #9573b350;border-radius:9px;background:#ffffff0a;color:#f7efff;font-size:23px;line-height:1;cursor:pointer}\nbody .akame-notify-filters{display:flex;flex-wrap:wrap;overflow:visible;gap:6px;margin-bottom:10px;padding:0}\nbody .akame-notify-filter{font-size:12px;padding:7px 10px;white-space:nowrap}\nbody .akame-notify-items{overflow-y:auto;overflow-x:hidden;flex:1;min-height:0;scrollbar-width:thin}\nbody .akame-notify-item{box-sizing:border-box;overflow-wrap:anywhere}\n@media(max-width:600px){body .akame-notify-panel:not([hidden]){width:var(--akame-notify-width,calc(100vw - 24px))!important;max-height:var(--akame-notify-height,calc(100dvh - 100px))!important;min-height:min(320px,var(--akame-notify-height,calc(100dvh - 100px)))!important;padding:14px!important;border-radius:14px!important}body .akame-notify-top strong{font-size:16px}body .akame-notify-read{font-size:11px;white-space:normal}body .akame-notify-filter{padding:7px 9px;font-size:11px}}\n";document.head.append(modalStyle);
const style=document.createElement("style");style.textContent='#akame-notify-root{width:100%!important;position:static!important;margin:3px 0!important} .akame-account-dropdown #akame-notify-root>.akame-notify-bell{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;width:100%!important;height:auto!important;min-height:40px!important;padding:11px 12px!important;border:0!important;border-radius:9px!important;background:transparent!important;color:#e9ddfa!important;font:650 13px system-ui!important;text-align:left!important} .akame-account-dropdown #akame-notify-root>.akame-notify-bell:hover{background:#a982ff24!important} #akame-notify-root .akame-notify-label{flex:1} #akame-notify-root .akame-notify-count{position:static!important;min-width:19px;line-height:17px;text-align:center} #akame-notify-root .akame-notify-panel{position:static!important;width:100%!important;max-height:310px!important;overflow-y:auto!important;box-shadow:none!important;border:1px solid #9976c13a!important;border-radius:10px!important;padding:9px!important;margin-top:5px!important;background:#120d1e!important;z-index:auto!important} #akame-notify-root .akame-notify-read{width:auto!important;padding:5px!important;color:#cba5ff!important;font-size:11px!important;text-align:right!important} #akame-notify-root .akame-notify-item{font-weight:500!important;line-height:1.4!important;white-space:normal!important}';document.head.append(style);
const sideStyle=document.createElement("style");sideStyle.textContent=`
/* Keep the account dropdown anchored; open notifications to its LEFT. */
.akame-account-dropdown #akame-notify-root{position:relative!important;width:100%!important}
.akame-account-dropdown #akame-notify-root>.akame-notify-panel{
 position:absolute!important;right:calc(100% + 21px)!important;left:auto!important;top:0!important;
 width:min(370px,calc(100vw - 295px))!important;min-width:260px!important;
 max-height:min(520px,calc(100vh - 115px))!important;overflow-y:auto!important;
 margin:0!important;padding:13px!important;z-index:500!important;
 border:1px solid #9976c177!important;border-radius:14px!important;
 background:#1a1225!important;box-shadow:0 20px 65px #000a!important;
}
@media(max-width:680px){
 .akame-account-dropdown #akame-notify-root>.akame-notify-panel{
  position:fixed!important;left:12px!important;right:auto!important;top:75px!important;
  width:calc(100vw - 285px)!important;min-width:0!important;
  max-height:calc(100dvh - 95px)!important;
 }
}
@media(max-width:470px){
 .akame-account-dropdown #akame-notify-root>.akame-notify-panel{
  left:10px!important;right:10px!important;top:76px!important;
  width:calc(100vw - 20px)!important;
 }
}
`;document.head.append(sideStyle);
const drawerStyle=document.createElement("style");drawerStyle.id="akame-notify-drawer-style";drawerStyle.textContent="/* Notification centre: a drawer on desktop, a full-screen view on phones. */\nbody>.akame-notify-panel:not([hidden]){--nd-bg:#15121e;--nd-raised:#1d1729;--nd-text:#f3edfb;--nd-muted:#a99bbd;--nd-line:#ffffff12;--nd-accent:var(--akame-user-accent,#ad80f0);position:fixed!important;inset:var(--akame-notify-top,78px) auto auto var(--akame-notify-left,0)!important;width:var(--akame-notify-width,420px)!important;height:var(--akame-notify-height,calc(100dvh - 78px))!important;min-height:0!important;max-height:none!important;max-width:100vw!important;padding:0!important;margin:0!important;display:flex!important;flex-direction:column!important;border:0!important;border-left:1px solid var(--nd-line)!important;border-radius:14px 0 0 0!important;background:var(--nd-bg)!important;color:var(--nd-text)!important;box-shadow:-18px 0 80px #0005!important;overflow:hidden!important;overscroll-behavior:contain;z-index:9998!important;font:14px/1.55 system-ui,-apple-system,\"Segoe UI\",sans-serif;box-sizing:border-box!important}\nbody>.akame-notify-backdrop:not([hidden]){display:block!important;position:fixed;z-index:9997;background:#07050e55;backdrop-filter:blur(2px);margin:0;border:0;padding:0}\nbody>.akame-notify-panel .akame-notify-top{padding:25px 23px 19px;margin:0!important;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:nowrap!important}\nbody>.akame-notify-panel .akame-notify-heading{display:flex;flex-direction:column;gap:5px;min-width:0}body>.akame-notify-panel .akame-notify-heading>strong{font-size:22px!important;font-weight:650;line-height:1.3;letter-spacing:-.04em;color:var(--nd-text)!important}body>.akame-notify-panel .akame-notify-subtitle{font-size:11px;color:var(--nd-muted)}\nbody>.akame-notify-panel .akame-notify-close{width:35px!important;height:35px!important;min-width:35px;padding:0!important;background:var(--nd-raised)!important;color:var(--nd-muted)!important;border:1px solid var(--nd-line)!important;border-radius:9px!important;font-size:24px!important;display:grid;place-items:center;cursor:pointer;flex:none}body>.akame-notify-panel .akame-notify-close:hover{border-color:var(--nd-accent)!important;color:var(--nd-text)!important}\nbody>.akame-notify-panel .akame-notify-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 23px 17px;border-bottom:1px solid var(--nd-line)}body>.akame-notify-panel .akame-notify-filters{display:flex!important;flex-wrap:nowrap!important;margin:0!important;padding:3px!important;gap:3px!important;border:1px solid var(--nd-line);background:var(--nd-raised);border-radius:8px;overflow:visible}body>.akame-notify-panel .akame-notify-filter{padding:7px 10px!important;border:1px solid transparent!important;border-radius:5px!important;background:transparent!important;color:var(--nd-muted)!important;font-size:11px!important;line-height:1.4;cursor:pointer}body>.akame-notify-panel .akame-notify-filter.active{background:color-mix(in srgb,var(--nd-accent) 16%,transparent)!important;border-color:color-mix(in srgb,var(--nd-accent) 20%,transparent)!important;color:var(--nd-text)!important}\nbody>.akame-notify-panel .akame-notify-read{width:auto!important;max-width:150px;padding:8px 0!important;margin:0;border:0!important;border-radius:4px!important;background:transparent!important;color:var(--nd-accent)!important;font-size:10px!important;font-weight:550;white-space:normal!important;line-height:1.4;text-align:right!important}body>.akame-notify-panel .akame-notify-read:hover:not(:disabled){text-decoration:underline;background:transparent!important}body>.akame-notify-panel .akame-notify-read:disabled{color:var(--nd-muted)!important;opacity:.45}\nbody>.akame-notify-panel .akame-notify-category{padding:15px 23px 10px}body>.akame-notify-panel .akame-notify-source-filter{width:100%;max-width:100%;padding:9px 11px;background:var(--nd-raised)!important;border:1px solid var(--nd-line)!important;border-radius:7px;color:var(--nd-muted)!important;font:11px/1.5 system-ui;min-height:37px;cursor:pointer}body>.akame-notify-panel .akame-notify-source-filter option{background:var(--nd-bg);color:var(--nd-text)}\nbody>.akame-notify-panel .akame-notify-items{flex:1;min-height:0;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;scrollbar-width:thin;padding:0 13px 22px;scrollbar-color:#58436c transparent}\nbody>.akame-notify-panel .akame-notify-item{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:start;gap:12px;position:relative;padding:17px 12px!important;margin:3px 0!important;border:1px solid transparent!important;border-bottom:1px solid var(--nd-line)!important;border-radius:8px!important;background:transparent;color:var(--nd-text)!important;cursor:pointer;font-size:12px}\nbody>.akame-notify-panel .akame-notify-item.unread{background:color-mix(in srgb,var(--nd-accent) 6%,transparent);border-color:color-mix(in srgb,var(--nd-accent) 10%,transparent)!important;padding-right:24px!important}body>.akame-notify-panel .akame-notify-item.unread:after{content:\"\";position:absolute;right:12px;top:21px;height:5px;width:5px;border-radius:50%;background:var(--nd-accent)}body>.akame-notify-panel .akame-notify-item:hover{background:var(--nd-raised)}body>.akame-notify-panel .akame-notify-avatar-link{display:inline-flex;flex:none;width:34px;height:34px;align-self:start;text-decoration:none!important;border-radius:50%}body>.akame-notify-panel .akame-notify-avatar{width:34px;height:34px;flex:none;box-sizing:border-box;border:1px solid var(--nd-line);font-size:12px;background:#65488b;color:#f5efff}body>.akame-notify-panel .akame-notify-body{min-width:0}body>.akame-notify-panel .akame-notify-identity{display:inline-flex;max-width:100%;margin:0 0 4px!important;font-size:11px!important;line-height:1.4;color:var(--nd-text)!important;gap:0;font-weight:650}body>.akame-notify-panel .akame-notify-identity .akame-notify-actor{color:var(--nd-text)}body>.akame-notify-panel .akame-notify-item-title{display:block;margin:0;color:var(--nd-muted)!important;font-size:12px;font-weight:400;line-height:1.75;text-decoration:none;overflow-wrap:anywhere}body>.akame-notify-panel .akame-notify-title-link:hover{color:var(--nd-text)!important}body>.akame-notify-panel .akame-notify-time{display:block;margin-top:7px!important;color:var(--nd-muted)!important;font-size:9px!important;line-height:1.4;opacity:.8}body>.akame-notify-panel .akame-notify-actions{margin-top:12px;gap:8px;flex-wrap:wrap}body>.akame-notify-panel .akame-notify-actions button{font-size:10px;padding:7px 12px;background:var(--nd-raised);color:var(--nd-text);border-color:var(--nd-line);cursor:pointer}body>.akame-notify-panel .akame-notify-accept{background:color-mix(in srgb,var(--nd-accent) 26%,var(--nd-raised))!important;border-color:color-mix(in srgb,var(--nd-accent) 40%,transparent)!important}body>.akame-notify-panel .akame-notify-empty{padding:55px 20px;text-align:center;font-size:12px;line-height:1.85;color:var(--nd-muted)}body>.akame-notify-panel :is(button,select,a):focus-visible{outline:2px solid var(--nd-accent)!important;outline-offset:3px}\nhtml[data-akame-theme=\"light\"] body>.akame-notify-panel:not([hidden]){--nd-bg:#fff;--nd-raised:#f5f1fa;--nd-text:#281c37;--nd-muted:#786887;--nd-line:#e8e1ef;box-shadow:-18px 0 80px #23142e1a!important}html[data-akame-theme=\"light\"] body>.akame-notify-backdrop:not([hidden]){background:#28133228}\n@media(max-width:850px){body>.akame-notify-panel:not([hidden]){border:0!important;border-radius:0!important;box-shadow:none!important;padding-top:env(safe-area-inset-top,0px)!important;padding-bottom:env(safe-area-inset-bottom,0px)!important}body>.akame-notify-panel .akame-notify-top{padding:21px 20px 18px}body>.akame-notify-panel .akame-notify-heading>strong{font-size:24px!important}body>.akame-notify-panel .akame-notify-close{width:40px!important;height:40px!important;min-width:40px}body>.akame-notify-panel .akame-notify-toolbar{padding:0 20px 17px}body>.akame-notify-panel .akame-notify-category{padding:15px 20px 10px}body>.akame-notify-panel .akame-notify-source-filter{font-size:16px;min-height:42px}body>.akame-notify-panel .akame-notify-items{padding:0 10px 20px}body>.akame-notify-panel .akame-notify-item{padding-top:19px!important;padding-bottom:19px!important}body>.akame-notify-panel .akame-notify-item-title{font-size:13px}body>.akame-notify-panel .akame-notify-filter{min-height:36px;padding:8px 12px!important}body>.akame-notify-panel .akame-notify-read{min-height:40px}}\n@media(prefers-reduced-motion:no-preference){body>.akame-notify-panel:not([hidden]){animation:akame-notify-enter .18s ease-out} @keyframes akame-notify-enter{from{opacity:.6;translate:16px 0}to{opacity:1;translate:0 0}}}\n/* Direct desktop access; the existing account entry stays available on phones. */\n.akame-desktop-notify-root[hidden]{display:none!important}.akame-desktop-notify-root{display:flex;align-items:center;position:relative;flex:0 0 auto}.akame-desktop-notify-bell{height:40px!important;width:40px!important;min-width:40px;padding:0!important;border:1px solid #70538f!important;border-radius:11px!important;background:#a982ff13!important;color:#dfcdf4!important;cursor:pointer}.akame-desktop-notify-bell:hover,.akame-desktop-notify-bell[aria-expanded=\"true\"]{background:#a982ff20!important;border-color:#a982ff75!important}.akame-desktop-notify-bell svg{height:22px;width:22px;display:block}.akame-desktop-notify-bell .akame-notify-count{top:-5px;right:-5px;min-width:16px;padding:1px 4px;border:2px solid #100b18;font-size:9px;line-height:13px;background:#a678ec;color:#160c23}\n@media(min-width:851px){.akame-account-dropdown #akame-notify-root{display:none!important}}\n@media(max-width:850px){.akame-desktop-notify-root{display:none!important}}\nhtml[data-akame-theme=\"light\"] .akame-desktop-notify-bell{background:#f3edf9!important;border-color:#ddcfee!important;color:#765291!important}html[data-akame-theme=\"light\"] .akame-desktop-notify-bell .akame-notify-count{border-color:#fff}\n";document.head.append(drawerStyle);
(async()=>{const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");client=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0");const {data}=await client.auth.getUser();user=data?.user||null;root.hidden=!user;desktopRoot.hidden=false;desktopBell.disabled=!user;desktopBell.removeAttribute("aria-busy");if(user)await refresh();client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;root.hidden=!user;desktopRoot.hidden=false;desktopBell.disabled=!user;desktopBell.removeAttribute("aria-busy");if(!user)closeNotifications();items=[];render();if(user)void refresh()});setInterval(()=>{if(user)void refresh()},30000)})().catch(()=>{root.hidden=true;desktopBell.disabled=true;desktopBell.removeAttribute("aria-busy");desktopBell.title=tr("Bitte anmelden, um Benachrichtigungen zu sehen.","Sign in to view notifications.")});
})();