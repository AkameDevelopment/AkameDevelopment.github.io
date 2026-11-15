import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0',{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
const state=document.getElementById('server-access-state');
const detail=document.getElementById('server-details');
const list=document.getElementById('server-list');
const serverId=document.body.dataset.serverId;
function message(de,en){if(state){state.dataset.smpDe=de;state.dataset.smpEn=en;state.textContent=tr(de,en);}}
function localize(){document.querySelectorAll('[data-smp-de]').forEach(el=>{el.textContent=tr(el.dataset.smpDe,el.dataset.smpEn);});}
document.addEventListener('akame-language-change',localize);
localize();
async function init(){
 try{
  const {data:{user},error}=await db.auth.getUser();if(error)throw error;
  if(!user){message('Bitte mit Discord anmelden, um deine Server zu sehen.','Sign in with Discord to see your servers.');return;}
  const [member,staff,roles]=await Promise.all([
   db.from('akamesmp_members').select('user_id').eq('user_id',user.id).maybeSingle(),
   db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle(),
   db.from('smp_server_roles').select('role').eq('user_id',user.id)
  ]);
  if(member.error||staff.error||roles.error)throw member.error||staff.error||roles.error;
  const owner=['owner','developer'].includes(staff.data?.role);
  const assigned=new Set((roles.data||[]).map(row=>row.role));
  const main=owner||!!member.data||assigned.has('smp_admin');
  const second=owner||assigned.has('smp2')||assigned.has('smp_admin2');
  const admin=serverId==='1'?owner||assigned.has('smp_admin'):owner||assigned.has('smp_admin2');
  if(list){for(const card of list.querySelectorAll('[data-server]'))card.hidden=card.dataset.server==='1'?!main:!second;list.hidden=false;}
  if(detail&&((serverId==='1'&&main)||(serverId==='2'&&second))){detail.hidden=false;
   const administration=document.getElementById('server-administration-link');if(administration)administration.hidden=!admin;
   if(serverId==='1'){window.akameSmpUserId=user.id;document.dispatchEvent(new Event('akamesmp-member-ready'));}
   const controls=document.getElementById('server-controls');if(controls)controls.hidden=!admin;}
  if((serverId==='1'&&!main)||(serverId==='2'&&!second)||(!serverId&&!main&&!second)){message('Du hast keine Berechtigung für diesen Serverbereich.','You do not have permission to access this server area.');return;}
  if(state)state.hidden=true;
 }catch(error){console.error('Server access check failed',error);message('Zugriff kann gerade nicht geprüft werden. Bitte später erneut versuchen.','Cannot verify access right now. Please try again later.');}
}
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.reload();});
void init();
