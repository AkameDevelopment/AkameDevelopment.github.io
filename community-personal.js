import {db,userReady,getPublicProfile} from './community-session.js?v=1';
const $ = id => document.getElementById(id);
const tr = (de,en) => (window.AkameLanguage?.get?.() || localStorage.getItem('akame-lang')) === 'en' ? en : de;
const node = (tag,value,cls) => { const n=document.createElement(tag); if(value!==undefined)n.textContent=value; if(cls)n.className=cls; return n; };
const link = (label,href) => { const n=node('a',label,'personal-button'); n.href=href; return n; };
const action = (label,fn) => { const n=node('button',label,'personal-button'); n.type='button'; n.addEventListener('click',fn); return n; };
const canonical = value => ({core:'modcore',chestscout:'chest',akameitems:'items',akamezoom:'zoom'})[String(value||'').toLowerCase()] || String(value||'').toLowerCase();
const names={modcore:'ModCore',chest:'ChestScout',crosshair:'Crosshair+',chunkloader:'ChunkLoader',items:'AkameItems',hud:'Hud+',info:'Infos',admin:'Admin',zoom:'AkameZoom',akamesmp:'AkameSMP'};
const safeUrl = value => { try {const u=new URL(value); return u.protocol==='https:'&&!u.username&&!u.password;} catch{return false;} };
let user=null, profile=null, posts=[], tickets=[], mods=[], betas=[], rules=[], releases=[], definitions=[], grants=[];
let loaded=false, loading=false, generation=0, admin=false;
let errors={}, postCount=null,ticketCount=null,morePosts=false,moreTickets=false;
const pageSize=12;
function translate(){
  document.querySelectorAll('[data-personal-de]').forEach(n=>n.textContent=tr(n.dataset.personalDe,n.dataset.personalEn));
  document.querySelector('.personal-navigation')?.setAttribute('aria-label',tr('Persönliche Bereiche','Personal areas'));
}
function allowed(slug,betaOnly=false){
  const rule=rules.find(r=>canonical(r.project_slug)===canonical(slug));
  if(!rule)return false;
  const mode=rule.visible===false?'hidden':rule.visibility || (rule.visible?'public':'hidden');
  const hasBeta=betas.some(b=>canonical(b.project_slug)===canonical(slug));
  return betaOnly ? hasBeta && (mode==='public'||mode==='beta'||admin) : admin || mode==='public' || mode==='beta'&&hasBeta;
}
function matching(slug,betaOnly=false){
  if(!allowed(slug,betaOnly))return [];
  return releases.filter(r=>[r.project_slug,r.mod_slug,r.modId,r.slug,r.mod].some(v=>canonical(v)===canonical(slug)) && safeUrl(r.url) && (r.channel!=='beta'||admin||betas.some(b=>canonical(b.project_slug)===canonical(slug))));
}
function state(root,error,empty){root.replaceChildren();if(error)root.append(node('p',tr('Dieser Bereich konnte nicht geladen werden. Nutze „Aktualisieren“, um es erneut zu versuchen.','This area could not be loaded. Use Refresh to try again.'),'personal-error'));else if(empty)root.append(node('p',empty,'personal-empty'));}
function renderProfile(){
  const fallback=user?.user_metadata?.full_name || user?.user_metadata?.name || tr('Mitglied','Member');
  const name=profile?.display_name || fallback;
  $('display-name').textContent=name;
  const avatar=$('personal-avatar');avatar.replaceChildren(node('span',String(name).trim().slice(0,2).toUpperCase()));
  const url=profile?.avatar_url || user?.user_metadata?.avatar_url;
  if(safeUrl(url)){const image=node('img');image.src=url;image.alt='';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove());avatar.append(image);}
  $('profile-link').href='user.html?id='+encodeURIComponent(user.id);
  const badges=$('personal-badges');badges.replaceChildren();
  const role={owner:'Owner',admin:'Admin',developer:'Developer',staff:tr('Mitarbeiter','Staff')}[profile?.role] || tr('Mitglied','Member');
  badges.append(node('span',role,'personal-badge'));
  const owned=new Set(grants.map(g=>g.badge_id));
  for(const b of definitions.filter(b=>b.name==='Community'||owned.has(b.id))){const n=node('span',b.name,'personal-badge');n.title=b.description||b.name;badges.append(n);}
  $('personal-post-count').textContent=postCount??'—';$('personal-ticket-count').textContent=ticketCount??'—';$('personal-beta-count').textContent=(!loaded||errors.betas)?'—':String(betas.length);
}
function date(value){return new Date(value).toLocaleDateString(tr('de-DE','en-GB'));}
function renderPosts(){
  const root=$('personal-posts-list');state(root,errors.posts,!posts.length?tr('Du hast noch keine Beiträge veröffentlicht.','You have not published any posts yet.'):null);
  if(errors.posts)return;
  for(const p of posts){const row=node('article',undefined,'personal-post'),body=node('p',p.body||'','personal-post-body');row.append(node('small',date(p.created_at)),body);
    if(safeUrl(p.image_url)){const image=node('img');image.src=p.image_url;image.alt=tr('Bild deines Beitrags','Image from your post');image.loading='lazy';row.append(image);}
    const actions=node('div',undefined,'personal-actions');actions.append(link(tr('Beitrag öffnen','Open post'),'community.html?post='+encodeURIComponent(p.id)+'#community-social-feed'));
    // Match the existing feed: owners may delete; only administrators may edit.
    if(admin)actions.append(action(tr('Bearbeiten','Edit'),async()=>{const value=prompt(tr('Beitrag bearbeiten:','Edit post:'),p.body);if(value===null)return;const body=value.trim();if(!body||body.length>2000){$('intro').textContent=tr('Ein Beitrag muss 1–2000 Zeichen enthalten.','A post must contain 1–2000 characters.');return;}await mutatePost(p,'edit',body);}));
    actions.append(action(tr('Löschen','Delete'),async()=>{if(confirm(tr('Diesen Beitrag wirklich löschen?','Really delete this post?')))await mutatePost(p,'delete');}));row.append(actions);root.append(row);
  }
  $('personal-posts-more').hidden=!morePosts;
}
async function mutatePost(post,kind,body){
  if(!user||loading)return;const run=generation,uid=user.id;loading=true;$('personal-posts-list').querySelectorAll('button').forEach(b=>b.disabled=true);
  try {const query=kind==='delete'?db.from('akamesmp_posts').delete():db.from('akamesmp_posts').update({body});const {data,error}=await query.eq('id',post.id).eq('author_id',uid).select('id');if(run!==generation)return;if(error||!data?.length)throw Error();await loadRows('posts');document.dispatchEvent(new CustomEvent('akame-personal-posts-changed'));}
  catch{if(run===generation)$('intro').textContent=tr('Änderung nicht erlaubt oder fehlgeschlagen. Dein Beitrag wurde nicht verändert.','Change denied or failed. Your post was not changed.');}
  finally{if(run===generation){loading=false;renderPosts();}}
}
function renderDownloads(){
  const root=$('my-mods-feed');state(root,errors.mods||errors.rules||errors.releases||errors.betas,null);if(errors.mods||errors.rules||errors.releases||errors.betas)return;
  const slugs=[...new Set([...mods.map(m=>canonical(m.mod_slug)),...betas.map(b=>canonical(b.project_slug))])].filter(s=>allowed(s));
  let count=0;
  for(const slug of slugs){const found=matching(slug);if(!found.length)continue;count++;const row=node('article',undefined,'personal-row');row.append(node('strong',names[slug]||slug));
    for(const release of found){const meta=[release.version,release.minecraftVersion||release.minecraft_version,release.loader].filter(Boolean).join(' · ');row.append(link(meta||tr('Version auswählen','Choose version'),'downloads.html#'+new URLSearchParams({mod:release.modId||release.mod||slug,view:'versions'})));if(release.demo)row.append(node('small',tr('Testdatei · keine installierbare Mod','Test file · not an installable mod')));}
    root.append(row);
  }
  if(!count)root.append(node('p',tr('Für deine ausgewählten Mods und Zugänge sind aktuell keine freigegebenen Downloads vorhanden.','No approved downloads are currently available for your selected mods and access.'),'personal-empty'));
}
function renderBetas(){
  const root=$('my-beta-feed');state(root,errors.betas||errors.rules||errors.releases,!betas.length?tr('Du hast noch keine Beta-Zugänge.','You do not have any beta access yet.'):null);if(errors.betas||errors.rules||errors.releases)return;
  let count=0;
  for(const b of betas){const slug=canonical(b.project_slug);if(!allowed(slug,true))continue;count++;const row=node('article',undefined,'personal-row');row.append(node('strong',names[slug]||slug),node('small',tr('Beta-Zugang freigeschaltet','Beta access granted')),link(tr('Projekt öffnen','Open project'),'project.html?mod='+encodeURIComponent(slug)));
    const found=matching(slug,true);if(!found.length)row.append(node('p',tr('Noch keine freigegebene Version verfügbar.','No approved version available yet.')));else for(const r of found)row.append(link(r.version||tr('Version öffnen','Open version'),'downloads.html#'+new URLSearchParams({mod:r.modId||r.mod||slug,view:'versions'})));root.append(row);
  }
  if(betas.length&&!count)root.append(node('p',tr('Deine Beta-Projekte sind momentan nicht zur Ansicht freigegeben.','Your beta projects are currently unavailable.'),'personal-empty'));
}
function renderTickets(){
  const root=$('personal-tickets-list');state(root,errors.tickets,!tickets.length?tr('Du hast noch keine Fehler gemeldet oder Features vorgeschlagen.','You have not reported any bugs or suggested features yet.'):null);if(errors.tickets)return;
  const statuses={open:tr('Offen','Open'),reviewing:tr('In Bearbeitung','In progress'),planned:tr('Geplant','Planned'),resolved:tr('Erledigt','Resolved'),declined:tr('Abgelehnt','Declined')};
  for(const ticket of tickets){const row=node('a',undefined,'personal-ticket');row.href='support.html?ticket='+encodeURIComponent(ticket.id)+'#tickets';row.append(node('small',(ticket.ticket_number||'')+' · '+date(ticket.created_at)),node('strong',ticket.title),node('span',statuses[ticket.status]||tr('Status unbekannt','Status unknown'),'personal-ticket-status'));root.append(row);}
  $('personal-tickets-more').hidden=!moreTickets;
}
function render(){translate();if(!user)return;renderProfile();renderPosts();renderDownloads();renderBetas();renderTickets();}
async function read(query,key){try{const result=await query;if(result.error)throw result.error;return result;}catch{ return {data:[],count:null,failed:key};}}
async function loadRows(type,more=false){
  const run=generation,uid=user?.id;if(!uid)return;const isPost=type==='posts',offset=more?(isPost?posts.length:tickets.length):0;
  const result=await read(db.from(isPost?'akamesmp_posts':'community_requests').select(isPost?'id,body,image_url,created_at':'id,ticket_number,title,status,created_at',{count:'exact'}).eq('author_id',uid).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+pageSize-1),type);
  if(run!==generation)return;
  errors[type]=!!result.failed;
  if(isPost){posts=result.failed?[]:more?[...posts,...result.data]:result.data||[];postCount=result.count;morePosts=!result.failed&&posts.length<(result.count??posts.length);}
  else{tickets=result.failed?[]:more?[...tickets,...result.data]:result.data||[];ticketCount=result.count;moreTickets=!result.failed&&tickets.length<(result.count??tickets.length);}
  render();
}
async function load(){
  if(loading||!user)return;loading=true;const run=generation;$('personal-refresh').disabled=true;$('intro').textContent=tr('Dein Bereich wird geladen …','Loading your space …');
  const uid=user.id;
  try{
    const tasks=await Promise.all([
      read(getPublicProfile(uid),'profile'),
      read(db.from('profile_mods').select('mod_slug').eq('user_id',uid),'mods'),
      read(db.from('beta_access').select('project_slug').eq('user_id',uid),'betas'),
      read(db.from('mod_visibility').select('project_slug,visibility,visible'),'rules'),
      read(db.from('profile_badge_definitions').select('id,name,description'),'definitions'),
      read(db.from('profile_badge_grants').select('badge_id').eq('user_id',uid),'grants'),
      fetch('updates.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>({data:Array.isArray(data.releases)?data.releases:[]})).catch(()=>({data:[],failed:'releases'})),
      loadRows('posts'),loadRows('tickets')
    ]);
    if(run!==generation)return;
    const [p,m,b,r,d,g,f]=tasks;for(const [key,value] of Object.entries({profile:p,mods:m,betas:b,rules:r,definitions:d,grants:g,releases:f}))errors[key]=!!value.failed;
    profile=(Array.isArray(p.data)?p.data[0]:p.data)||null;admin=['owner','admin'].includes(profile?.role);mods=m.data||[];betas=b.data||[];rules=r.data||[];definitions=d.data||[];grants=g.data||[];releases=f.data||[];
    loaded=true;$('intro').textContent=Object.values(errors).some(Boolean)?tr('Einige Daten konnten nicht geladen werden. Bitte versuche es erneut.','Some data could not be loaded. Please try again.'):'';render();
  }finally{if(run===generation){loading=false;$('personal-refresh').disabled=false;}}
}
function clear(){generation++;user=null;profile=null;posts=[];tickets=[];mods=[];betas=[];rules=[];releases=[];grants=[];definitions=[];loaded=false;loading=false;errors={};postCount=null;ticketCount=null;$('dashboard').hidden=true;['personal-posts-list','personal-tickets-list','my-mods-feed','my-beta-feed','personal-badges','personal-avatar'].forEach(id=>$(id).replaceChildren());$('display-name').textContent='';$('profile-link').href='profile.html';$('intro').textContent='';$('auth-required').hidden=false;}
document.addEventListener('akame-community-view',e=>{if(e.detail.view==='personal'&&user&&!loaded)void load();});
document.addEventListener('akame-language-change',render);
document.addEventListener('akame-community-signout',clear);
document.addEventListener('akame-feed-posts-changed',()=>{if(user&&loaded)void loadRows('posts');});
$('personal-refresh').addEventListener('click',()=>void load());
for(const [id,type] of [['personal-posts-more','posts'],['personal-tickets-more','tickets']])$(id).addEventListener('click',async()=>{const button=$(id);if(loading||button.disabled)return;loading=true;button.disabled=true;try{await loadRows(type,true);}finally{loading=false;button.disabled=false;}});
translate();const initialGeneration=generation;user=await userReady;if(initialGeneration!==generation)user=null;
if(!user)clear();else{$('dashboard').hidden=false;$('auth-required').hidden=true;if(!$('dashboard-area').hidden)void load();}
