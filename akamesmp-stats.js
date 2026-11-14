import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const lang=()=>window.AkameLanguage?.get()||localStorage.getItem("akame-lang")||"de";
const tr=(de,en)=>lang()==="en"?en:de;
const locale=()=>lang()==="en"?"en-GB":"de-DE";
const num=n=>Number(n||0).toLocaleString(locale());
const hours=n=>(Number(n||0)/3600).toLocaleString(locale(),{maximumFractionDigits:1})+" h";
const km=n=>(Number(n||0)/100000).toLocaleString(locale(),{maximumFractionDigits:1})+" km";
const dt=x=>x&&Number.isFinite(new Date(x).getTime())?new Date(x).toLocaleString(locale(),{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const duration=n=>{let s=Math.max(0,Number(n)||0),d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return d?d+tr(" T "," d ")+h+" h":h?h+" h "+m+" min":m+" min";};
const label={playtime_seconds:["Spielzeit","Playtime"],player_kills:["Spieler-Kills","Player kills"],deaths:["Tode","Deaths"],mob_kills:["Besiegte Mobs","Mobs defeated"],blocks_mined:["Abgebaute Blöcke","Blocks mined"],distance_walked_cm:["Gelaufene Distanz","Distance walked"]};
const copy={
 statistics:["Statistiken","Statistics"],access:["Owner / Developer / Admin","Owner / Developer / Admin"],title:["Dein Server. In Zahlen.","Your server. In numbers."],description:["Jeder Block, jede Stunde, jede Geschichte. Alle Statistiken an einem Ort.","Every block, every hour, every story. All your statistics in one place."],"to-leaderboard":["Zum Leaderboard","View leaderboard"],"private-area":["Privater Statistikbereich","Private statistics"],"login-link":["Zur Anmeldung →","Sign in →"],"server-overview":["Serverübersicht","Server overview"],online:["Spieler online","Players online"],peak:["Spielerrekord","Peak players"],"peak-note":["Gleichzeitig online","Online at the same time"],uptime:["Aktuelle Laufzeit","Current uptime"],"uptime-note":["Seit dem letzten Start","Since the last restart"],"data-status":["Datenstatus","Data status"],"totals-title":["Was wir zusammen erreicht haben","What we have achieved together"],"all-time":["Gesamter Zeitraum","All time"],members:["Erfasste Spieler","Players tracked"],"members-note":["Alle bisherigen Mitglieder","Every member so far"],playtime:["Gesamte Spielzeit","Total playtime"],"playtime-note":["Gemeinsam auf AkameSMP","Together on AkameSMP"],kills:["Spieler-Kills","Player kills"],"kills-note":["Alle PvP-Kills","All PvP kills"],deaths:["Tode","Deaths"],"deaths-note":["Jeder Versuch zählt","Every attempt counts"],mobs:["Besiegte Mobs","Mobs defeated"],"mobs-note":["Alle Mob-Kills","All mob kills"],blocks:["Abgebaute Blöcke","Blocks mined"],"blocks-note":["Block für Block","One block at a time"],distance:["Gelaufene Distanz","Distance walked"],"distance-note":["Zu Fuß durch die Welt","Exploring the world on foot"],activity:["Zuletzt aktiv","Last active"],"activity-note":["Letzte Spieleraktivität","Latest player activity"],"ranking-eyebrow":["DIE COMMUNITY IN ZAHLEN","THE COMMUNITY IN NUMBERS"],"leaderboard-note":["Alle erfassten Mitglieder, auch wenn sie gerade offline sind.","Every tracked member, including those currently offline."],refresh:["Aktualisieren","Refresh"],"search-label":["Spieler suchen","Search players"],"search-placeholder":["Spieler suchen …","Search players…"],"sort-label":["Sortieren nach","Sort by"],"playtime-short":["Spielzeit","Playtime"],rank:["Rang","Rank"],player:["Spieler","Player"],"last-seen":["Zuletzt gesehen","Last seen"],"auto-refresh":["Automatische Aktualisierung alle 30 Sekunden","Updates automatically every 30 seconds"],"footer-note":["Jede Zahl erzählt eine Geschichte.","Every number tells a story."]
};
Object.assign(copy,{
 "profile-title":["AKAMESMP · SPIELERPROFIL","AKAMESMP · PLAYER PROFILE"],"profile-description":["Alle synchronisierten Minecraft-Statistiken dieses Spielers.","All synced Minecraft statistics for this player."],"profile-statistics":["Persönliche Statistiken","Personal statistics"],"profile-synced":["Zuletzt synchronisiert","Last synced"],"profile-footnote":["Auch die gespeicherten Werte von Offline-Spielern sind enthalten.","Includes saved statistics for offline players."]
});
const allowedRoles=new Set(["owner","developer","admin"]);
let currentUserId=null,selectedPlayerId=null;
let players=[],server=null,authorized=false,refreshing=false,noticeState="checking";
function translate(){
 document.querySelectorAll("[data-i18n]").forEach(el=>{const text=copy[el.getAttribute("data-i18n")];if(text)el.textContent=tr(...text);});
 document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{const text=copy[el.getAttribute("data-i18n-placeholder")];if(text)el.placeholder=tr(...text);});
 $("profile-close").setAttribute("aria-label",tr("Spielerprofil schließen","Close player profile"));
 $("refresh-stats").setAttribute("aria-label",tr("Statistiken aktualisieren","Refresh statistics"));
 $("population-meter").setAttribute("aria-label",tr("Serverbelegung","Server occupancy"));
 document.querySelector(".table-scroll").setAttribute("aria-label",tr("Spielerrangliste","Player leaderboard"));
 renderNotice();
}
function renderNotice(){
 const messages={checking:tr("Berechtigung wird geprüft …","Checking your access…"),login:tr("Bitte melde dich zuerst mit Discord an.","Please sign in with Discord first."),denied:tr("Kein Zugriff. Dieser Bereich ist nur für Owner, Developer und Admins freigegeben.","Access denied. This area is restricted to owners, developers and admins."),error:tr("Statistiken konnten nicht geladen werden. Bitte versuche es erneut.","Statistics could not be loaded. Please try again.")};
 $("notice-message").textContent=messages[noticeState]||messages.error;
 $("notice-login").hidden=noticeState!=="login";
}
function showNotice(state){noticeState=state;$("notice").hidden=false;renderNotice();}
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function renderRows(){
 const key=$("sort").value,q=$("search-player").value.trim().toLocaleLowerCase(locale());
 $("metric-label").textContent=tr(...(label[key]||label.playtime_seconds));
 const ranked=[...players].sort((a,b)=>Number(b[key]||0)-Number(a[key]||0)||String(a.player_name||"").localeCompare(String(b.player_name||""),locale())).map((player,index)=>({player,rank:index+1}));
 const list=ranked.filter(({player:p})=>String(p.player_name||"").toLocaleLowerCase(locale()).includes(q));
 const largest=Number(ranked[0]?.player[key]||0),fragment=document.createDocumentFragment();
 for(const {player:p,rank} of list){
  const row=element("tr","player-row"),rankCell=element("td"),badge=element("span","rank-number",String(rank));badge.dataset.rank=String(rank);rankCell.append(badge);
  const nameCell=element("td"),identity=element("div","player-cell"),name=String(p.player_name||"—"),avatar=element("span","player-avatar",Array.from(name).slice(0,2).join("").toLocaleUpperCase(locale()));avatar.setAttribute("aria-hidden","true");const profileLink=element("a","player-name player-profile-link",name);profileLink.href="#player="+encodeURIComponent(p.player_uuid);profileLink.setAttribute("aria-label",tr("Spielerprofil öffnen: ","Open player profile: ")+name);identity.append(avatar,profileLink);nameCell.append(identity);
  row.addEventListener("click",event=>{if(event.button&&event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openProfile(p.player_uuid,true);});
  const metricCell=element("td","metric-cell"),value=key==="playtime_seconds"?hours(p[key]):key==="distance_walked_cm"?km(p[key]):num(p[key]);
  metricCell.append(element("span","metric-value",value));const track=element("div","metric-track"),fill=element("span");track.setAttribute("aria-hidden","true");fill.style.width=(largest?Math.min(100,Math.max(0,Number(p[key]||0)/largest*100)):0)+"%";track.append(fill);metricCell.append(track);
  row.append(rankCell,nameCell,metricCell,element("td","last-seen-cell",dt(p.last_seen_at)));fragment.append(row);
 }
 $("ranking").replaceChildren(fragment);$("ranking-count").textContent=num(players.length);$("empty").hidden=list.length>0;
 $("empty-title").textContent=q?tr("Keine Spieler gefunden","No players found"):tr("Noch keine Statistiken","No statistics yet");
 $("empty-description").textContent=q?tr("Versuche einen anderen Namen oder leere die Suche.","Try another name or clear your search."):tr("Sobald der Server Daten überträgt, erscheinen die Mitglieder hier.","Members will appear here once the server sends its first statistics.");
 $("results-count").textContent=tr(num(list.length)+" von "+num(players.length)+" Mitgliedern",num(list.length)+" of "+num(players.length)+" members");
}
function openProfile(id,updateHash=false){
 if(!authorized)return;
 const player=players.find(p=>p.player_uuid===id);if(!player)return;
 selectedPlayerId=id;
 $("profile-name").textContent=String(player.player_name||"—");
 $("profile-avatar").textContent=Array.from(String(player.player_name||"?")).slice(0,2).join("").toLocaleUpperCase(locale());
 const fragment=document.createDocumentFragment();
 for(const [key,text] of Object.entries(label)){
  const card=element("div","profile-stat"),value=key==="playtime_seconds"?hours(player[key]):key==="distance_walked_cm"?km(player[key]):num(player[key]);
  card.append(element("span",null,tr(...text)),element("strong",null,value));fragment.append(card);
 }
 $("profile-stats").replaceChildren(fragment);$("profile-last-seen").textContent=dt(player.last_seen_at);$("profile-updated").textContent=dt(player.updated_at);
 if(updateHash)window.history.pushState(null,"","#player="+encodeURIComponent(id));
 if(!$("player-dialog").open)$("player-dialog").showModal();
}
function openProfileFromHash(){
 const match=window.location.hash.match(/^#player=([0-9a-f-]+)$/i);
 if(match)openProfile(match[1]);
 else if($("player-dialog").open)$("player-dialog").close();
}
function clearProfile(){
 selectedPlayerId=null;
 if($("player-dialog").open)$("player-dialog").close();
 $("profile-name").textContent="";$("profile-avatar").textContent="";$("profile-stats").replaceChildren();
 $("profile-last-seen").textContent="—";$("profile-updated").textContent="—";
}
function renderServer(){
 const live=!!server?.updated_at&&Date.now()-new Date(server.updated_at).getTime()<90000;
 $("server-status-badge").dataset.state=!server?"waiting":live?"online":"offline";
 $("server-state").textContent=!server?tr("Warte auf Serverdaten","Waiting for server data"):live?"Online":"Offline";
 const count=live?Number(server?.online_count||0):0,max=Number(server?.max_players||0),percent=max?Math.min(100,Math.max(0,count/max*100)):0;
 $("server-players").textContent=num(count)+" / "+num(max);$("population-fill").style.width=percent+"%";$("population-meter").setAttribute("aria-valuenow",String(Math.round(percent)));
 $("server-peak").textContent=num(server?.peak_online_players);$("server-uptime").textContent=live?duration(server?.uptime_seconds):"—";
 $("sync-state").textContent=!server?tr("Warte auf Daten","Waiting for data"):live?tr("Aktuell","Up to date"):tr("Letzter Stand","Last received");
 $("server-updated").textContent=server?.updated_at?dt(server.updated_at):tr("Noch keine Übertragung","No updates yet");
}
function render(){
 renderServer();
 const totals={players:["total_unique_players",null],hours:["total_playtime_seconds","playtime_seconds"],kills:["total_player_kills","player_kills"],deaths:["total_deaths","deaths"],mobs:["total_mob_kills","mob_kills"],blocks:["total_blocks_mined","blocks_mined"],distance:["total_distance_walked_cm","distance_walked_cm"]};
 for(const [id,[field,key]] of Object.entries(totals)){
  const value=server?.[field]??(key?players.reduce((sum,p)=>sum+Number(p[key]||0),0):players.length);
  $(id).textContent=id==="hours"?hours(value):id==="distance"?km(value):num(value);
 }
 const active=players.map(p=>p.last_seen_at).filter(Boolean).sort().at(-1);
 $("last-active").textContent=active?new Date(active).toLocaleDateString(locale(),{day:"2-digit",month:"short",year:"numeric"}):"—";
 const synced=[server?.updated_at,...players.map(p=>p.updated_at)].filter(Boolean).sort().at(-1);
 $("synced").textContent=synced?tr("Letzte Synchronisierung: ","Last synced: ")+dt(synced):tr("Warte auf erste Server-Synchronisierung.","Waiting for first server sync.");
 renderRows();
 if(selectedPlayerId)openProfile(selectedPlayerId);
 else openProfileFromHash();
}
async function refresh(){
 if(!authorized||refreshing)return;
 refreshing=true;$("refresh-stats").disabled=true;$("refresh-stats").setAttribute("aria-busy","true");
 try{
  const [pr,sr,access]=await Promise.all([db.from("akamesmp_player_stats").select("player_uuid,player_name,playtime_seconds,player_kills,deaths,mob_kills,blocks_mined,distance_walked_cm,last_seen_at,updated_at").limit(1000),db.from("akamesmp_server_status").select("online_count,max_players,peak_online_players,total_unique_players,total_playtime_seconds,total_player_kills,total_deaths,total_mob_kills,total_blocks_mined,total_distance_walked_cm,uptime_seconds,updated_at").eq("id",1).maybeSingle(),db.from("staff_access").select("role").eq("user_id",currentUserId).maybeSingle()]);
  if(!authorized)return;
  if(access.error)throw new Error("access_unavailable");
  if(!allowedRoles.has(access.data?.role)){authorized=false;players=[];server=null;clearProfile();$("ranking").replaceChildren();$("dashboard").hidden=true;showNotice("denied");return;}
  if(pr.error||sr.error)throw new Error("stats_unavailable");
  players=pr.data||[];server=sr.data||null;render();$("notice").hidden=true;$("dashboard").hidden=false;
 }catch{showNotice("error");}
 finally{refreshing=false;$("refresh-stats").disabled=false;$("refresh-stats").removeAttribute("aria-busy");}
}
$("profile-close").addEventListener("click",()=>$("player-dialog").close());
$("player-dialog").addEventListener("click",event=>{
 if(event.target!==$("player-dialog"))return;
 const rect=$("player-dialog").getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$("player-dialog").close();
});
$("player-dialog").addEventListener("close",()=>{
 selectedPlayerId=null;
 if(window.location.hash.startsWith("#player="))window.history.replaceState(null,"",window.location.pathname+window.location.search+"#leaderboard");
});
window.addEventListener("hashchange",openProfileFromHash);
window.addEventListener("popstate",openProfileFromHash);
translate();
try{
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)showNotice("login");
 else{
  const {data:staff,error:staffError}=await db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle();
  if(staffError||!allowedRoles.has(staff?.role))showNotice("denied");
  else{
   currentUserId=user.id;authorized=true;$("sort").addEventListener("change",renderRows);$("search-player").addEventListener("input",renderRows);$("refresh-stats").addEventListener("click",()=>void refresh());
   await refresh();setInterval(()=>void refresh(),30000);
  }
 }
}catch{showNotice("error");}
db.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"){authorized=false;players=[];server=null;clearProfile();$("ranking").replaceChildren();$("dashboard").hidden=true;showNotice("login");}});
document.addEventListener("akame-language-change",()=>{translate();if(authorized)render();});
