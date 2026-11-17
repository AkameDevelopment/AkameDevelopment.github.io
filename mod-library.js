import {badgeText as t} from './badge-ui.js';
import {assetUrl} from './mod-catalogue.js';
import {libraryState} from './mod-library-model.js';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function mountModLibrary(db,host){
 let mods=[],status='idle',filter='all',generation=0,uid=null;
 const date=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString(t('de-DE','en-GB'));};
 function render(){if(!host)return;host.replaceChildren();if(!uid)return;
  host.append(node('p',t('Deine Download-Historie – keine Erkennung installierter Mods. Verifizierte Einträge belegen einen autorisierten Download-Start, nicht das Speichern oder Installieren.','Your download history — not a list of installed mods. Verified entries mean an authorised download start, not a completed save or installation.'),'mod-library-note'));
  const controls=node('div',undefined,'mod-library-controls');for(const [value,de,en]of [['all','Alle','All'],['updates','Updates verfügbar','Updates available'],['beta','Beta / Alpha','Beta / Alpha']]){const b=node('button',t(de,en),'personal-button');b.type='button';b.setAttribute('aria-pressed',String(filter===value));b.onclick=()=>{filter=value;render()};controls.append(b)}host.append(controls);
  if(status==='loading'){host.append(node('p',t('Bibliothek wird geladen …','Loading library …')));return}
  if(status==='error'){const b=node('button',t('Erneut versuchen','Try again'),'personal-button');b.type='button';b.onclick=()=>load(uid);host.append(node('p',t('Die Bibliothek konnte nicht geladen werden.','Could not load your library.')),b);return}
  const shown=mods.filter(m=>filter==='all'||filter==='updates'&&libraryState(m).update||filter==='beta'&&(m.beta||[]).length);
  if(!shown.length){host.append(node('p',mods.length?t('Keine Mods passen zu diesem Filter.','No mods match this filter.'):t('Noch keine Downloads gespeichert. Angemeldete Mod-Downloads erscheinen hier.','No saved downloads yet. Downloads started while signed in will appear here.'),'personal-empty'));return}
  for(const mod of shown){const row=node('article',undefined,'mod-library-item'),heading=node('div',undefined,'mod-library-heading'),image=node('img');image.alt='';image.loading='lazy';image.src=assetUrl(mod.cover_path)||'assets/mod-placeholder.svg';heading.append(image,node('strong',mod.name||mod.slug));row.append(heading);
   const state=libraryState(mod),last=node('p',t('Zuletzt heruntergeladen: ','Last downloaded: ')+mod.last_version+' · '+date(mod.last_downloaded_at)+(mod.last_loader?' · '+mod.last_loader:''));if(mod.last_channel){const channel=node('span',mod.last_channel==='stable'?'Release':mod.last_channel==='beta'?'Beta':'Alpha','mod-library-channel');channel.dataset.channel=mod.last_channel;last.append(channel)}row.append(last);
   if(!mod.verified)row.append(node('small',t('Älterer Eintrag · nicht serverseitig verifiziert','Older record · not server-verified'),'mod-library-note'));
   row.append(node('p',t('Aktueller Release: ','Latest release: ')+(state.stable?.version||t('Nicht verfügbar','Unavailable'))));if(state.update)row.append(node('span',t('Update verfügbar','Update available'),'mod-library-update'));
   if((mod.beta||[]).length)row.append(node('p',t('Für dich freigegebene Vorschauen: ','Previews available to you: ')+mod.beta.map(r=>r.version+' ('+(r.channel==='alpha'?'Alpha':'Beta')+')').join(' · ')));
   if(mod.available){const link=node('a',t('Versionen & Downloads','Versions & downloads'),'personal-button');link.href='downloads.html#'+new URLSearchParams({mod:mod.slug,view:'versions'});row.append(link)}else row.append(node('p',t('Diese Mod ist momentan nicht verfügbar.','This mod is currently unavailable.')));
   const details=node('details',undefined,'mod-library-history');details.append(node('summary',t('Letzte Downloads','Recent downloads')));const list=node('ul');const seenHistory=new Set();for(const entry of mod.history||[]){const key=JSON.stringify([entry.version,entry.loader,entry.channel]);if(seenHistory.has(key))continue;seenHistory.add(key);list.append(node('li',entry.version+' · '+(entry.loader||'—')+' · '+date(entry.created_at)));}details.append(list);row.append(details);host.append(row);
  }
 }
 async function load(userId){if(!host)return;uid=userId;const run=++generation;if(!uid){mods=[];status='idle';render();return}status='loading';render();try{const result=await db.rpc('get_my_mod_library');if(run!==generation)return;if(result.error||!Array.isArray(result.data))throw Error();mods=result.data;status='ready';}catch{if(run!==generation)return;mods=[];status='error'}render();}
 document.addEventListener('akame-language-change',render);return {load,render,clear(){generation++;uid=null;mods=[];status='idle';render()}};
}
