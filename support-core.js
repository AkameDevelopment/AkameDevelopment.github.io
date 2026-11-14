import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0');
export const tr=(de,en)=>(window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?en:de;
export const text=(tag,value,cls='')=>{const el=document.createElement(tag);el.textContent=value;el.className=cls;return el};
export const statuses=()=>({open:tr('Offen','Open'),reviewing:tr('In Bearbeitung','In Progress'),planned:tr('Geplant','Planned'),resolved:tr('Erledigt','Resolved'),declined:tr('Abgelehnt','Rejected')});
export const projects={'': 'Website',modcore:'ModCore',chest:'ChestScout',crosshair:'Crosshair+',chunkloader:'ChunkLoader',items:'AkameItems',hud:'Hud+',info:'Infos',admin:'Admin',zoom:'AkameZoom',akamesmp:'AkameSMP',downloads:'Downloads'};
export const date=value=>new Date(value).toLocaleString((window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='en'?'en-GB':'de-DE');
export function safeImage(value){if(!value)return '';try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}
export function ticketDetails(item){
 const fragment=document.createDocumentFragment();
 const meta=text('p',`${item.ticket_number} · ${item.kind==='bug'?tr('Fehler','Bug'):tr('Feature','Feature')} · ${projects[item.project_slug]||item.project_slug} · ${statuses()[item.status]||item.status}`,'support-meta');fragment.append(meta);
 for(const [label,value] of [[tr('Erstellt','Created'),date(item.created_at)],[tr('Aktualisiert','Updated'),date(item.updated_at)],[tr('Beschreibung','Description'),item.description],[tr('Version','Version'),item.game_version],[tr('Schritte zum Reproduzieren','Steps to reproduce'),item.steps],[tr('Gewünschter Nutzen','Expected benefit'),item.benefit]]){if(value){fragment.append(text('h3',label),text('p',value,'support-prose'))}}
 const image=safeImage(item.image_url);if(image){const link=text('a',tr('Bild öffnen','Open image'));link.href=image;link.target='_blank';link.rel='noopener noreferrer';fragment.append(link)}
 fragment.append(text('h3',tr('Antworten vom Team','Team replies')));
 const replies=item.replies?.length?item.replies:item.admin_note?[{body:item.admin_note,created_at:item.updated_at}]:[];
 if(!replies.length)fragment.append(text('p',tr('Noch keine Antwort.','No reply yet.'),'support-muted'));
 for(const reply of replies){const row=text('section','','support-reply');row.append(text('small',date(reply.created_at)),text('p',reply.body,'support-prose'));fragment.append(row)}
 return fragment;
}
