import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const lang=()=>window.AkameLanguage?.get()||localStorage.getItem("akame-lang")||"de";
const tr=(de,en)=>lang()==="en"?en:de;
const number=n=>Number(n||0).toLocaleString(lang()==="en"?"en-GB":"de-DE");
const hours=n=>(Number(n||0)/3600).toLocaleString(lang()==="en"?"en-GB":"de-DE",{maximumFractionDigits:1})+" h";
const distance=n=>(Number(n||0)/100000).toLocaleString(lang()==="en"?"en-GB":"de-DE",{maximumFractionDigits:1})+" km";
const dateTime=value=>value?new Date(value).toLocaleString(lang()==="en"?"en-GB":"de-DE"):"—";
const duration=seconds=>{let s=Math.max(0,Number(seconds)||0);const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);return d?tr(d+" d ","d ")+h+" h":h?h+" h "+m+" min":m+" min";};
const labels={playtime_seconds:["Spielzeit","Playtime"],player_kills:["Spieler-Kills","Player kills"],deaths:["Tode","Deaths"],mob_kills:["Mob-Kills","Mob kills"],blocks_mined:["Blöcke abgebaut","Blocks mined"],distance_walked_cm:["Distanz","Distance"]};
let rows=[],server=null;
function render(){
  const key=$("sort").value, pair=labels[key]||labels.playtime_seconds;
  $("metric-label").textContent=tr(pair[0],pair[1]);
  const query=$("search-player").value.trim().toLocaleLowerCase();
  const sorted=rows.filter(p=>String(p.player_name||"").toLocaleLowerCase().includes(query)).sort((a,b)=>Number(b[key]||0)-Number(a[key]||0));
  $("ranking").replaceChildren();$("empty").hidden=sorted.length>0;
  sorted.forEach((p,i)=>{const trEl=document.createElement("tr");const value=key==="playtime_seconds"?hours(p[key]):key==="distance_walked_cm"?distance(p[key]):number(p[key]);for(const text of [String(i+1),p.player_name||"—",value,dateTime(p.last_seen_at)]){const td=document.createElement("td");td.textContent=text;trEl.append(td)}$("ranking").append(trEl)});
}
function renderServer(){
  if(!server){$("server-state").textContent=tr("Noch keine Daten","No data yet");$("server-players").textContent="0 / 0";$("server-peak").textContent="0";$("server-uptime").textContent="—";$("server-updated").textContent=tr("Warte auf die erste Verbindung zur Server-Mod.","Waiting for the first server mod sync.");return}
  const fresh=server.updated_at&&Date.now()-new Date(server.updated_at).getTime()<90000;
  $("server-state").textContent=fresh?tr("🟢 Online","🟢 Online"):tr("⚫ Offline","⚫ Offline");
  $("server-players").textContent=number(server.online_count)+" / "+number(server.max_players);
  $("server-peak").textContent=number(server.peak_online_players);
  $("server-uptime").textContent=fresh?duration(server.uptime_seconds):"—";
  $("server-updated").textContent=server.updated_at?tr("Letzte Servermeldung: ","Last server update: ")+dateTime(server.updated_at):tr("Noch keine Servermeldung","No server update yet");
}
async function refresh(){
  const [playerResult,serverResult]=await Promise.all([
    db.from("akamesmp_player_stats").select("player_uuid,player_name,playtime_seconds,player_kills,deaths,mob_kills,blocks_mined,distance_walked_cm,last_seen_at,updated_at").limit(1000),
    db.from("akamesmp_server_status").select("online_count,max_players,peak_online_players,total_unique_players,total_playtime_seconds,total_player_kills,total_deaths,total_mob_kills,total_blocks_mined,total_distance_walked_cm,uptime_seconds,updated_at").eq("id",1).maybeSingle()
  ]);
  if(playerResult.error||serverResult.error){$("notice").textContent=tr("Statistiken konnten nicht geladen werden: ","Could not load statistics: ")+(playerResult.error||serverResult.error).message;return}
  rows=playerResult.data||[];server=serverResult.data||null;renderServer();
  $("players").textContent=number(server?.total_unique_players??rows.length);
  $("hours").textContent=hours(server?.total_playtime_seconds??rows.reduce((s,p)=>s+Number(p.playtime_seconds||0),0));
  $("kills").textContent=number(server?.total_player_kills??rows.reduce((s,p)=>s+Number(p.player_kills||0),0));
  $("deaths").textContent=number(server?.total_deaths??rows.reduce((s,p)=>s+Number(p.deaths||0),0));
  $("mobs").textContent=number(server?.total_mob_kills??rows.reduce((s,p)=>s+Number(p.mob_kills||0),0));
  $("blocks").textContent=number(server?.total_blocks_mined??rows.reduce((s,p)=>s+Number(p.blocks_mined||0),0));
  $("distance").textContent=distance(server?.total_distance_walked_cm??rows.reduce((s,p)=>s+Number(p.distance_walked_cm||0),0));
  const lastSeen=rows.map(p=>p.last_seen_at).filter(Boolean).sort().at(-1);$("last-active").textContent=lastSeen?new Date(lastSeen).toLocaleDateString(lang()==="en"?"en-GB":"de-DE"):"—";
  const latest=rows.map(p=>p.updated_at).filter(Boolean).sort().at(-1);
  $("synced").textContent=latest?tr("Letzte Synchronisierung: ","Last synced: ")+dateTime(latest):tr("Warte auf die erste Synchronisierung mit der Server-Mod.","Waiting for the first sync from the server mod.");
  render();$("notice").hidden=true;$("dashboard").hidden=false;
}
const {data:{user},error}=await db.auth.getUser();
if(error||!user){$("notice").textContent=tr("Bitte melde dich zuerst mit Discord an.","Please sign in with Discord first.");}
else{
  const member=await db.from("akamesmp_members").select("user_id").eq("user_id",user.id).maybeSingle();
  if(member.error||!member.data){$("notice").textContent=tr("Kein Zugriff: Du benötigst die Zusatzrolle AkameSMP.","Access denied: You need the AkameSMP role.");}
  else{$("sort").addEventListener("change",render);$("search-player").addEventListener("input",render);await refresh();setInterval(()=>{void refresh()},30000);}
}
document.addEventListener("akame-language-change",()=>{if(!$("dashboard").hidden){render();renderServer();}});
