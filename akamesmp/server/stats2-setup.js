import {createClient} from '/supabase-client.js';
const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0');
const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
const section=document.getElementById('stats2-setup'),button=document.getElementById('stats2-config-download'),message=document.getElementById('stats2-setup-message');
let allowed=false;
async function permitted(){const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;const staff=await db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle();return !staff.error&&['owner','developer'].includes(staff.data?.role);}
try{allowed=await permitted();section.hidden=!allowed;}catch{section.hidden=true;}
button.addEventListener('click',async()=>{if(!allowed)return;button.disabled=true;message.textContent='';try{
 if(!await permitted())throw new Error('access');
 const existing=await db.from('smp_stats_ingest_keys').select('server_id').eq('server_id',2).maybeSingle();if(existing.error)throw existing.error;
 if(existing.data&&!confirm(tr('Eine Konfiguration ist bereits vorhanden. Ein neuer Schlüssel ersetzt den bisherigen und muss auf Server 2 neu eingetragen werden. Fortfahren?','A configuration already exists. A new key replaces the old one and must be updated on Server 2. Continue?')))return;
 const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)),hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 const result=await db.from('smp_stats_ingest_keys').upsert({server_id:2,token_hash:hash},{onConflict:'server_id'});if(result.error)throw result.error;
 const config={endpoint:'https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/akamesmp2-server-status',serverToken:secret,intervalSeconds:30};
 const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='akamesmp-stats2.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 message.textContent=tr('Datei als config/akamesmp-stats2.json auf Server 2 ablegen und den Server neu starten. Bewahre sie privat auf.','Place the file at config/akamesmp-stats2.json on Server 2 and restart the server. Keep it private.');
 }catch{message.textContent=tr('Konfiguration konnte nicht erstellt werden. Bitte erneut versuchen.','Could not create configuration. Please try again.');}finally{button.disabled=false;}});
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){allowed=false;section.hidden=true;}});
