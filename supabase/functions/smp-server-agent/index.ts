const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const same=(a:string,b:string)=>{let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;};
function serviceKey(){const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(key)return key;try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');if(token.length<32||token.length>1024)return json({error:'unauthorized'},401);
 if(Number(req.headers.get('content-length')||0)>200000)return json({error:'payload_too_large'},413);
 let p;try{const raw=await req.text();if(new TextEncoder().encode(raw).length>200000)return json({error:'payload_too_large'},413);p=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
 if(!p||![1,2].includes(p.server_id)||!uuid(p.agent_id)||!['stopped','starting','running','stopping','error'].includes(p.state)||typeof p.detail!=='string'||p.detail.length>500||!Array.isArray(p.lines)||p.lines.length>40||p.lines.some((line:unknown)=>typeof line!=='string'||line.length>8000)||p.ack_id!=null&&(!uuid(p.ack_id)||typeof p.ack_ok!=='boolean'||typeof p.ack_result!=='string'||p.ack_result.length>4000))return json({error:'invalid_payload'},400);
 const base=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!base||!key)return json({error:'backend_not_configured'},503);
 const headers={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const lookup=await fetch(`${base}/rest/v1/smp_control_credentials?server_id=eq.${p.server_id}&select=token_hash`,{headers,signal:AbortSignal.timeout(8000)});
  if(!lookup.ok)return json({error:'credential_lookup_failed'},503);const rows=await lookup.json();if(!Array.isArray(rows)||rows.length!==1||!same(hash,rows[0].token_hash))return json({error:'unauthorized'},401);
  const result=await fetch(base+'/rest/v1/rpc/smp_agent_exchange',{method:'POST',headers,signal:AbortSignal.timeout(10000),body:JSON.stringify({p_server_id:p.server_id,p_agent_id:p.agent_id,p_state:p.state,p_detail:p.detail,p_lines:p.lines,p_ack_id:p.ack_id||null,p_ack_ok:p.ack_id?p.ack_ok:null,p_ack_result:p.ack_id?p.ack_result:null})});
  if(!result.ok){const message=await result.text();if(message.includes('another_agent_is_active'))return json({error:'another_agent_is_active'},409);console.error('Agent exchange failed',result.status);return json({error:'exchange_failed'},502);}
  return json(await result.json());
 }catch{console.error('Agent backend request failed');return json({error:'backend_unavailable'},503);}
});
