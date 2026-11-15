import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0',{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const server=Number(document.body.dataset.serverId),$=id=>document.getElementById(id);
const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
let allowed=false,canWrite=false,output=[],mode='checking',timer;
function render(){document.querySelectorAll('[data-smp-de]').forEach(el=>{el.textContent=tr(el.dataset.smpDe,el.dataset.smpEn);});
 const messages={checking:['Berechtigung wird geprüft …','Checking access …'],login:['Bitte melde dich mit Discord an.','Please sign in with Discord.'],denied:['Für diese Administration benötigst du die Adminrolle dieses Servers.','You need the administrator role for this server.'],error:['Der Zugriff kann gerade nicht geprüft werden. Bitte versuche es erneut.','Cannot verify access right now. Please try again.']};
 $('administration-access-state').hidden=allowed;if(!allowed)$('administration-access-state').textContent=tr(...(messages[mode]||messages.error));
 $('administration-workspace').hidden=!allowed;const stats=$('server-advanced-stats');if(stats)stats.hidden=!allowed;
 const consolePanel=document.querySelector('.server-console');if(consolePanel)consolePanel.hidden=!allowed;
 $('console-permission').textContent=canWrite?tr('Vollzugriff','Full access'):tr('Nur lesen','Read only');
 $('console-command-form').hidden=!allowed||!canWrite;
 $('console-note').textContent=canWrite?tr('Du darfst Konsolenbefehle senden, sobald der Server verbunden ist.','You may send console commands once the server is connected.'):tr('Du kannst die Konsole mitlesen, aber keine Befehle senden.','You can read the console but cannot send commands.');
 $('console-output').textContent=output.length?output.map(row=>`[${new Date(row.created_at).toLocaleTimeString()}] ${row.line}`).join('\n'):tr('Noch nicht mit der Serverkonsole verbunden.','Not connected to the server console yet.');
 $('console-command').placeholder=tr('Noch nicht verbunden','Not connected yet');
}
async function check(){try{const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(!user){allowed=false;mode='login';render();return;}
 const [staff,roles]=await Promise.all([db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle(),db.from('smp_server_roles').select('role').eq('user_id',user.id)]);if(staff.error||roles.error)throw staff.error||roles.error;
 canWrite=['owner','developer'].includes(staff.data?.role);allowed=[1,2].includes(server)&&(canWrite||(roles.data||[]).some(row=>row.role===(server===1?'smp_admin':'smp_admin2')));
 if(!allowed){output=[];mode='denied';render();return;}
 const logs=await db.from('smp_console_lines').select('id,line,created_at').eq('server_id',server).order('id',{ascending:false}).limit(200);
 if(logs.error){$('console-output').textContent=tr('Konsole momentan nicht verfügbar.','Console currently unavailable.');output=[];render();$('console-output').textContent=tr('Konsole momentan nicht verfügbar.','Console currently unavailable.');return;}
 output=(logs.data||[]).reverse();render();
 }catch{allowed=false;output=[];mode='error';render();}}
$('console-command-form').addEventListener('submit',event=>event.preventDefault());
document.addEventListener('akame-language-change',render);
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearInterval(timer);allowed=false;canWrite=false;output=[];mode='login';render();location.reload();}});
render();void check();timer=setInterval(()=>void check(),15000);
