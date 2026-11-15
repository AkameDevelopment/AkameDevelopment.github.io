const MAX_BODY_BYTES=1_000_000,MAX_PLAYERS=1000,MAX_COUNTER=Number.MAX_SAFE_INTEGER;
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const nonnegative=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=MAX_COUNTER;
function sameSecret(a:string,b:string){const n=Math.max(a.length,b.length);let x=a.length^b.length;for(let i=0;i<n;i++)x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return x===0;}
function serviceKey(){const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";if(legacy)return legacy;try{const v=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");return typeof v.default==="string"?v.default:"";}catch{return "";}}

async function tokenAllowed(given:string):Promise<boolean>{
 if(given.length<32)return false;
 const base=Deno.env.get("SUPABASE_URL")??"",key=serviceKey();
 if(!base||!key)throw new Error("backend_not_configured");
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(given));
 const tokenHash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
 const response=await fetch(base+"/rest/v1/smp_stats_ingest_keys?server_id=eq.2&select=token_hash",{headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error("token_lookup_failed");
 const rows=await response.json();
 return Array.isArray(rows)&&rows.length===1&&typeof rows[0].token_hash==="string"&&sameSecret(tokenHash,rows[0].token_hash);
}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const auth=req.headers.get("authorization")??"";const given=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!given||given.length>1024)return json({error:"unauthorized"},401);
 try{if(!await tokenAllowed(given))return json({error:"unauthorized"},401);}
 catch{console.error("AkameSMP2 token verification unavailable");return json({error:"token_verification_unavailable"},503);}
 if(Number(req.headers.get("content-length")??0)>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
 let p:Record<string,unknown>;try{const raw=await req.text();if(new TextEncoder().encode(raw).length>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);const v:unknown=JSON.parse(raw);if(!v||typeof v!=="object"||Array.isArray(v))return json({error:"invalid_payload"},400);p=v as Record<string,unknown>;}catch{return json({error:"invalid_json"},400);}
 if(p.server_id!==undefined&&p.server_id!==2)return json({error:"wrong_server"},400);
 const online=p.online_count,max=p.max_players,peak=p.peak_online_players,uptime=p.uptime_seconds,players=p.players;
 if(!nonnegative(online)||typeof max!=="number"||!Number.isSafeInteger(max)||max<1||max>MAX_PLAYERS||online>max||!nonnegative(peak)||peak>MAX_PLAYERS||!nonnegative(uptime)||!Array.isArray(players)||players.length>MAX_PLAYERS)return json({error:"invalid_payload"},400);
 const ids=new Set<string>();for(const value of players){if(!value||typeof value!=="object"||Array.isArray(value))return json({error:"invalid_player"},400);const x=value as Record<string,unknown>;const id=x.player_uuid,name=x.player_name;if(typeof id!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||ids.has(id.toLowerCase())||typeof name!=="string"||!name.trim()||name.length>32||/[\u0000-\u001f\u007f]/.test(name)||!nonnegative(x.playtime_seconds)||!nonnegative(x.deaths)||!nonnegative(x.player_kills)||!nonnegative(x.mob_kills)||!nonnegative(x.blocks_mined)||!nonnegative(x.distance_walked_cm)||typeof x.last_seen_at!=="string"||!Number.isFinite(Date.parse(x.last_seen_at)))return json({error:"invalid_player"},400);ids.add(id.toLowerCase());}
 const sums={playtime_seconds:0,player_kills:0,deaths:0,mob_kills:0,blocks_mined:0,distance_walked_cm:0};for(const value of players){const x=value as Record<string,number>;sums.playtime_seconds+=x.playtime_seconds;sums.player_kills+=x.player_kills;sums.deaths+=x.deaths;sums.mob_kills+=x.mob_kills;sums.blocks_mined+=x.blocks_mined;sums.distance_walked_cm+=x.distance_walked_cm;}if(Object.values(sums).some(n=>!Number.isSafeInteger(n)))return json({error:"counter_overflow"},400);
 const base=Deno.env.get("SUPABASE_URL")??"",key=serviceKey();if(!base||!key)return json({error:"backend_not_configured"},503);
 const headers={apikey:key,authorization:`Bearer ${key}`,"content-type":"application/json",prefer:"resolution=merge-duplicates,return=minimal"};const now=new Date().toISOString();
 const send=async(table:string,payload:unknown,conflict:string)=>fetch(`${base}/rest/v1/${table}?on_conflict=${conflict}`,{method:"POST",headers,body:JSON.stringify(payload)});
 try{
   if(players.length){const people=players.map(value=>{const x=value as Record<string,unknown>;return{player_uuid:x.player_uuid,player_name:x.player_name,playtime_seconds:x.playtime_seconds,player_kills:x.player_kills,deaths:x.deaths,mob_kills:x.mob_kills,blocks_mined:x.blocks_mined,distance_walked_cm:x.distance_walked_cm,last_seen_at:x.last_seen_at,updated_at:now};});const r=await send("akamesmp2_player_stats",people,"player_uuid");if(!r.ok){console.error("player stats update failed",r.status);return json({error:"player_stats_update_failed"},502);}}
   const status={id:1,online_count:online,max_players:max,player_names:[],peak_online_players:peak,uptime_seconds:uptime,total_unique_players:players.length,total_playtime_seconds:sums.playtime_seconds,total_player_kills:sums.player_kills,total_deaths:sums.deaths,total_mob_kills:sums.mob_kills,total_blocks_mined:sums.blocks_mined,total_distance_walked_cm:sums.distance_walked_cm,updated_at:now};
   const sr=await send("akamesmp2_server_status",status,"id");if(!sr.ok){console.error("server status update failed",sr.status);return json({error:"server_status_update_failed"},502);}
   const publicTotals={id:1,player_count:players.length,...sums,updated_at:now};const pr=await send("akamesmp2_public_totals",publicTotals,"id");if(!pr.ok){console.error("public totals update failed",pr.status);return json({error:"public_totals_update_failed"},502);}
 }catch(e){console.error("AkameSMP2 sync failed",e);return json({error:"backend_request_failed"},502);}
 return json({ok:true,server_id:2,player_count:players.length});
});

