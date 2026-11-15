import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0');
const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
const section=document.getElementById('agent-setup'),button=document.getElementById('agent-config-download'),message=document.getElementById('agent-setup-message');
async function permitted(){const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;const row=await db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle();return !row.error&&['owner','developer'].includes(row.data?.role);}
try{section.hidden=!await permitted();}catch{section.hidden=true;}
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
button.addEventListener('click',async()=>{button.disabled=true;message.textContent='';try{
 if(!await permitted())throw new Error('access');const previous=await db.from('smp_control_credentials').select('server_id');if(previous.error)throw previous.error;
 if(previous.data?.length&&!confirm(tr('Neue Agent-Schlüssel ersetzen die bisherigen für beide Server. Bereits installierte Agenten müssen danach mit dieser Datei neu eingerichtet werden. Fortfahren?','New agent keys replace the existing keys for both servers. Existing agents must be reconfigured with this file. Continue?')))return;
 const servers=[{id:1,directory:String.raw`C:\Game Server\Minecraft v26.3`,rconPort:25575},{id:2,directory:String.raw`C:\Game Server\Minecraft V26.3 v2`,rconPort:25576}].map(row=>({...row,controlToken:random(),rconPassword:random()}));
 const keys=await Promise.all(servers.map(async row=>({server_id:row.id,token_hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(row.controlToken))),x=>x.toString(16).padStart(2,'0')).join('')})));
 const saved=await db.from('smp_control_credentials').upsert(keys,{onConflict:'server_id'});if(saved.error)throw saved.error;
 const config={endpoint:'https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/smp-server-agent',servers};const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='agent-setup.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 message.textContent=tr('agent-setup.json in den entpackten Agentenordner legen. Beide Minecraft-Server regulär stoppen und Installieren.cmd als Administrator starten. Danach startet der Agent auch nach einem Windows-Neustart automatisch.','Place agent-setup.json in the extracted agent folder. Stop both Minecraft servers normally and run Installieren.cmd as administrator. The agents will then start automatically after Windows restarts.');
 }catch{message.textContent=tr('Konfiguration konnte nicht erstellt werden. Bitte erneut versuchen.','Could not create configuration. Please try again.');}finally{button.disabled=false;}});
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')section.hidden=true;});
