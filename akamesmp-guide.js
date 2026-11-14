import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0',{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.akameSmpDb=db;
const $=id=>document.getElementById(id),page=document.body.dataset.smpGuidePage||'overview';
const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const pages=[{id:'join',de:'Server beitreten',en:'Join the server',title:'Server beitreten',href:'akamesmp/join.html',description:['Minecraft starten und gemeinsam auf AkameSMP spielen.','Start Minecraft and play together on AkameSMP.']},{id:'mods',de:'Benötigte Mods',en:'Required mods',title:'Benötigte Mods',href:'akamesmp/mods.html',description:['Version, Mod-Auswahl und Hinweise zur Installation.','Version, required mods and installation notes.']},{id:'rules',de:'Serverregeln & Hilfe',en:'Server rules & help',title:'Serverregeln & Hilfe',href:'akamesmp/rules.html',description:['Ein paar einfache Regeln und Antworten auf häufige Fragen.','A few simple rules and answers to common questions.']}];
let records=[],authorized=false,failed=false,access='checking';
const href=id=>pages.find(p=>p.id===id)?.href||'akamesmp.html';
function anchor(text,url){const a=node('a',text,'smp-guide-button');a.href=url;return a;}
function content(id){const record=records.find(r=>r.title===pages.find(p=>p.id===id)?.title);if(!record?.body||/^Hier (folgen|kommt)/.test(record.body))return {};try{const value=JSON.parse(record.body);if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}return {de:record.body,en:record.body};}
function localizedText(value){return tr(value.de||value.en||'',value.en||value.de||'');}
function labels(){document.querySelectorAll('[data-smp-de]').forEach(n=>n.textContent=tr(n.dataset.smpDe,n.dataset.smpEn));const entry=pages.find(p=>p.id===page);if(entry){$('smp-guide-title').textContent=tr(entry.de,entry.en);$('smp-guide-description').textContent=tr(...entry.description);document.title=tr(entry.de,entry.en)+' · AkameSMP';}}
function render(){labels();if(!authorized){const state=$('state');state.hidden=false;state.replaceChildren();if(access==='login'){state.append(node('p',tr('Melde dich mit Discord an, um die AkameSMP-Informationen zu sehen.','Sign in with Discord to view the AkameSMP information.')),anchor(tr('Mit Discord anmelden','Sign in with Discord'),'profile.html'));}else state.textContent=access==='denied'?tr('Für diesen Bereich benötigst du die Zusatzrolle AkameSMP. Bitte wende dich an das Team.','You need the AkameSMP membership role to access this area. Please contact the team.'):access==='error'?tr('Die Zugangsprüfung ist momentan nicht verfügbar. Bitte versuche es später erneut.','Access verification is currently unavailable. Please try again later.'):tr('Berechtigung wird geprüft …','Checking access …');return;}const root=page==='overview'?$('guide'):$('smp-guide-body');root.replaceChildren();
 if(failed){root.append(node('p',tr('Die Serverinformationen konnten nicht geladen werden. Bitte versuche es später erneut.','Server information could not be loaded. Please try again later.')));return;}
 if(page==='overview'){const links=node('nav',undefined,'smp-quick-links');links.setAttribute('aria-label',tr('Serverinformationen','Server information'));links.append(anchor(tr('Loslegen →','Get started →'),href('join')));root.append(links);return;}
 // The header already provides navigation between guide pages.
 const nav=$('smp-guide-nav');nav.replaceChildren();nav.hidden=true;
 const data=content(page),join=content('join');
 if(page==='join'){
  root.append(node('h2',tr('So kommst du auf den Server','How to join the server')));
  const steps=node('ol');for(const text of [tr('Starte Minecraft Java Edition '+(join.minecraftVersion||'26.3')+'.','Start Minecraft Java Edition '+(join.minecraftVersion||'26.3')+'.'),tr('Prüfe vorher die Seite „Benötigte Mods“.','Check the Required mods page first.'),tr('Öffne „Mehrspieler“ → „Server hinzufügen“ und trage die Serveradresse ein.','Open Multiplayer → Add Server and enter the server address.'),tr('Wähle AkameSMP aus und verbinde dich.','Select AkameSMP and connect.')])steps.append(node('li',text));root.append(steps);
  const address=typeof join.serverAddress==='string'&&join.serverAddress.trim()?join.serverAddress.trim():null;
  if(address)root.append(node('code',address,'smp-server-address'));else root.append(node('p',tr('Die Serveradresse wird noch vom Team bekannt gegeben.','The team will announce the server address.'),'smp-guide-note'));
  const actions=node('div',undefined,'smp-guide-actions'),copy=node('button',tr('Serveradresse kopieren','Copy server address'),'smp-guide-button');copy.type='button';copy.disabled=!address;copy.hidden=!address;
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(address);copy.textContent=tr('Adresse kopiert!','Address copied!');}catch{copy.textContent=tr('Bitte die Adresse oben markieren und kopieren.','Please select and copy the address above.');}});actions.append(copy,anchor(tr('Benötigte Mods ansehen','View required mods'),href('mods')));
  root.append(actions);
 }else if(page==='mods'){
  root.append(node('h2','Minecraft Java '+(join.minecraftVersion||'26.3')));
  const mods=Array.isArray(data.mods)?data.mods:[];
  if(!mods.length)root.append(node('p',tr('Eine verbindliche Liste benötigter Client-Mods wurde noch nicht veröffentlicht. Frage vor der Installation kurz beim Team nach.','A confirmed list of required client mods has not been published yet. Check with the team before installing mods.'),'smp-guide-note'));
  for(const mod of mods){if(!mod||typeof mod.name!=='string')continue;const row=node('article',undefined,'smp-mod-row');row.append(node('h3',mod.name));if(typeof mod.version==='string')row.append(node('p',mod.version));try{const url=new URL(mod.url);if(url.protocol==='https:'&&!url.username&&!url.password){const a=anchor(tr('Download öffnen','Open download'),url.href);a.target='_blank';a.rel='noopener noreferrer';row.append(a);}}catch{}root.append(row);}
  root.append(node('h3',tr('Vor der Installation','Before installing')),node('p',tr('Achte darauf, dass Minecraft-Version, Modloader und Mod-Version zusammenpassen. Lege nur vom Team bestätigte Client-Mods in deinen mods-Ordner.','Make sure the Minecraft version, modloader and mod versions match. Only put team-confirmed client mods into your mods folder.')),anchor(tr('Hilfe bei der Einrichtung','Setup help'),href('rules')));
 }else if(page==='rules'){
  root.append(node('h2',tr('Unsere Serverregeln','Our server rules')));
  const text=localizedText(data);root.append(node('p',text||tr('Das Team hat noch keine Serverregeln veröffentlicht.','The team has not published server rules yet.'),'smp-guide-prose'));
  root.append(node('h2',tr('Häufige Fragen','Frequently asked questions')));
  const questions=[[tr('Ich kann die Serverinfos nicht sehen.','I cannot see the server information.'),tr('Melde dich mit Discord an. Für AkameSMP benötigst du die entsprechende Zusatzrolle; das Team kann deinen Zugang prüfen.','Sign in with Discord. You need the AkameSMP membership role; the team can check your access.')],[tr('Minecraft meldet eine falsche Version.','Minecraft reports a version mismatch.'),tr('Prüfe, ob du Minecraft Java '+(join.minecraftVersion||'26.3')+' gestartet hast und deine Mods zur Serverversion passen.','Check that you started Minecraft Java '+(join.minecraftVersion||'26.3')+' and your mods match the server version.')],[tr('Wo melde ich ein Problem oder eine Idee?','Where can I report a problem or suggest an idea?'),tr('Nutze den Support-Bereich. Beschreibe kurz, was passiert ist, und nenne AkameSMP als Projekt.','Use the support area. Briefly describe what happened and choose AkameSMP as the project.')]];
  for(const [q,a] of questions){const details=node('details'),summary=node('summary',q);details.append(summary,node('p',a));root.append(details);}const actions=node('div',undefined,'smp-guide-actions');actions.append(anchor(tr('Fehler melden','Report a bug'),'support.html#bug'),anchor(tr('Idee vorschlagen','Suggest an idea'),'support.html#feature'));root.append(actions);
 }
}
async function init(){render();try{
 const {data,error}=await db.auth.getUser();if(error)throw error;const user=data?.user;
 if(!user){access='login';render();return;}
 const [member,staff]=await Promise.all([db.from('akamesmp_members').select('user_id').eq('user_id',user.id).maybeSingle(),db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle()]);
 if(member.error)throw member.error;const role=staff.error?null:staff.data?.role;
 const stats=$('smp-admin-stats');if(stats)stats.hidden=!['owner','admin','developer'].includes(role);
 if(!member.data&&!['owner','admin'].includes(role)){access='denied';render();return;}
 authorized=true;window.akameSmpUserId=user.id;document.dispatchEvent(new Event('akamesmp-member-ready'));
 const result=await db.from('akamesmp_guide').select('title,body').order('sort_order');failed=!!result.error;records=result.data||[];$('state').hidden=true;$('guide').hidden=false;render();
 }catch{if(authorized){failed=true;$('state').hidden=true;$('guide').hidden=false;}else access='error';render();}}
document.addEventListener('akame-language-change',render);
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){authorized=false;window.akameSmpUserId=null;records=[];$('guide').replaceChildren();$('guide').hidden=true;location.reload();}});
void init();
