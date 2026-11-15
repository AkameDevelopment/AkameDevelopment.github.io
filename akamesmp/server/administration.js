import {createClient} from '/supabase-client.js';
const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0',{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const server=Number(document.body.dataset.serverId),$=id=>document.getElementById(id);
const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
let allowed=false,canWrite=false,output=[],mode='checking',timer,agent=null,commands=[],posting=false,checking=false,actionMessage='',logFailed=false;
const fresh=()=>agent&&Date.now()-new Date(agent.updated_at).getTime()<30000;
const active=()=>posting||commands.some(row=>['queued','claimed'].includes(row.status));
function render(){document.querySelectorAll('[data-smp-de]').forEach(el=>{el.textContent=tr(el.dataset.smpDe,el.dataset.smpEn);});
 const messages={checking:['Berechtigung wird geprüft …','Checking access …'],login:['Bitte melde dich mit Discord an.','Please sign in with Discord.'],denied:['Für diese Administration benötigst du die Adminrolle dieses Servers.','You need the administrator role for this server.'],error:['Der Zugriff kann gerade nicht geprüft werden. Bitte versuche es erneut.','Cannot verify access right now. Please try again.']};
 $('administration-access-state').hidden=allowed;if(!allowed)$('administration-access-state').textContent=tr(...(messages[mode]||messages.error));
 $('administration-workspace').hidden=!allowed;const consolePanel=document.querySelector('.server-console');if(consolePanel)consolePanel.hidden=!allowed;
 const connected=allowed&&fresh(),running=connected&&agent.state==='running';
 const states={stopped:['Gestoppt','Stopped'],starting:['Startet …','Starting …'],running:['Läuft','Running'],stopping:['Stoppt …','Stopping …'],error:['Verbindung prüfen','Check connection']};
 $('agent-status').textContent=connected?tr('Agent verbunden · ','Agent connected · ')+tr(...states[agent.state]):tr('Agent nicht verbunden','Agent not connected');
 $('agent-status').dataset.state=connected?agent.state:'offline';
 $('agent-detail').textContent=connected?(agent.detail||''):tr('Installiere den Windows-Agenten. Er startet anschließend automatisch mit Windows.','Install the Windows agent. It will then start automatically with Windows.');
 document.querySelectorAll('[data-server-action]').forEach(button=>{button.disabled=!connected||active()||(button.dataset.serverAction==='start'?agent.state!=='stopped':!running);});
 $('console-permission').textContent=canWrite?tr('Vollzugriff','Full access'):tr('Nur lesen','Read only');
 $('console-command-form').hidden=!allowed||!canWrite;$('console-command').disabled=!canWrite||!running||active();document.querySelector('#console-command-form button').disabled=$('console-command').disabled;
 $('console-note').textContent=canWrite?tr('Konsolenbefehle werden ausschließlich an diesen Server gesendet.','Console commands are sent only to this server.'):tr('Du kannst die Konsole mitlesen, aber keine Befehle senden.','You can read the console but cannot send commands.');
 const text=output.length?output.map(row=>`[${new Date(row.created_at).toLocaleTimeString()}] ${row.line}`).join('\n'):logFailed?tr('Konsole momentan nicht verfügbar.','Console currently unavailable.'):connected?tr('Warte auf Konsolenausgabe …','Waiting for console output …'):tr('Noch nicht mit der Serverkonsole verbunden.','Not connected to the server console yet.');
 const box=$('console-output');if(box.textContent!==text){const bottom=box.scrollHeight-box.scrollTop-box.clientHeight<30;box.textContent=text;if(bottom)box.scrollTop=box.scrollHeight;}
 $('console-command').placeholder=running?tr('Minecraft-Befehl eingeben','Enter Minecraft command'):tr('Serverkonsole nicht erreichbar','Server console unavailable');
 const last=commands[0],labels={queued:['Wartet auf Agent …','Waiting for agent …'],claimed:['Wird ausgeführt …','Executing …'],succeeded:['Erfolgreich','Succeeded'],failed:['Fehlgeschlagen','Failed'],expired:['Nicht ausgeführt: abgelaufen','Not executed: expired']};
 $('control-action-message').textContent=actionMessage||(last?tr(...labels[last.status])+(last.result?' · '+last.result:''):'');
}
async function check(){if(checking)return;checking=true;try{const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(!user){allowed=false;mode='login';render();return;}
 const [staff,roles]=await Promise.all([db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle(),db.from('smp_server_roles').select('role').eq('user_id',user.id)]);if(staff.error||roles.error)throw staff.error||roles.error;
 canWrite=['owner','developer'].includes(staff.data?.role);allowed=[1,2].includes(server)&&(canWrite||(roles.data||[]).some(row=>row.role===(server===1?'smp_admin':'smp_admin2')));
 if(!allowed){output=[];agent=null;commands=[];mode='denied';render();return;}
 let logQuery=db.from('smp_console_lines').select('id,line,created_at').eq('server_id',server);logQuery=output.length?logQuery.gt('id',output.at(-1).id).order('id',{ascending:true}):logQuery.order('id',{ascending:false});
 const [logs,state,history]=await Promise.all([logQuery.limit(200),db.from('smp_agent_state').select('state,detail,updated_at').eq('server_id',server).maybeSingle(),db.from('smp_control_commands').select('id,kind,status,result,created_at').eq('server_id',server).order('created_at',{ascending:false}).limit(5)]);
 if(state.error||history.error)throw state.error||history.error;agent=state.data;commands=history.data||[];logFailed=!!logs.error;if(!logs.error){const rows=output.length?(logs.data||[]):(logs.data||[]).reverse();output=[...output,...rows].slice(-200);}render();
 }catch{allowed=false;agent=null;output=[];mode='error';render();}finally{checking=false;}}
async function send(kind,command=null){if(!allowed||!fresh()||active()||kind==='console'&&!canWrite)return;
 posting=true;actionMessage='';render();try{const payload={server_id:server,kind};if(kind==='console')payload.command=command;const result=await db.from('smp_control_commands').insert(payload).select('id,kind,status,result,created_at');if(result.error)throw result.error;commands=[...(result.data||[]),...commands].slice(0,5);if(kind==='console')$('console-command').value='';}
 catch{actionMessage=tr('Aktion nicht gesendet. Agent, Berechtigung oder bereits laufende Aktion prüfen.','Action was not sent. Check the agent, permissions or an existing action.');}finally{posting=false;render();}}
document.querySelectorAll('[data-server-action]').forEach(button=>button.addEventListener('click',()=>void send(button.dataset.serverAction)));
$('console-command-form').addEventListener('submit',event=>{event.preventDefault();const text=$('console-command').value.trim().replace(/^\//,'');if(text&&text.length<=1000&&!/[\r\n]/.test(text))void send('console',text);});
document.addEventListener('akame-language-change',render);
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){clearInterval(timer);allowed=false;canWrite=false;output=[];agent=null;commands=[];mode='login';render();location.reload();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')void check();});
render();void check();timer=setInterval(()=>{if(document.visibilityState!=='hidden')void check();},3000);
