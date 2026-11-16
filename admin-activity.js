const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function createAdminActivity({db,selectMember}){
 const root=document.getElementById('admin-activity'),history=document.getElementById('selected-downloads');
 let people=[],recent=[],total=null,week=null,error=false,selected=null,rows=[],hasMore=false,offset=0,request=0,overviewRequest=0,historyError=false;
 const tr=(de,en)=>localStorage.getItem('akame-lang')==='en'?en:de;
 const date=value=>new Date(value).toLocaleString(tr('de-DE','en-GB'),{dateStyle:'medium',timeStyle:'short'});
 const name=id=>people.find(p=>p.user_id===id)?.display_name||tr('Mitglied','Member');
 function member(id){const b=node('button',name(id),'admin-activity-member');b.type='button';b.onclick=()=>selectMember(id);return b;}
 function eventRow(event,showMember){const row=node('li',undefined,'admin-activity-row'),copy=node('div');if(showMember)copy.append(member(event.user_id));copy.append(node('strong',event.mod_name+' · '+event.version),node('small',[event.minecraft_version,event.loader].filter(Boolean).join(' · ')));const time=node('time',date(event.created_at));time.dateTime=event.created_at;row.append(copy,time);return row;}
 function render(){
  root.replaceChildren();root.hidden=false;
  const bar=node('div',undefined,'admin-activity-toolbar'),title=node('div');title.append(node('h3',tr('Aktivität','Activity')),node('p',tr('Neue Mitglieder und gestartete Downloads.','New members and started downloads.')));
  const refresh=node('button',tr('Aktualisieren','Refresh'),'ghost');refresh.type='button';refresh.onclick=refreshOverview;bar.append(title,refresh);root.append(bar);
  const metrics=node('div',undefined,'admin-download-metrics');for(const [value,label]of [[total,tr('Downloads erfasst','Downloads recorded')],[week,tr('In den letzten 7 Tagen','In the last 7 days')]]){const card=node('div');card.append(node('strong',value===null?'–':String(value)),node('span',label));metrics.append(card)}root.append(metrics);
  const grid=node('div',undefined,'admin-activity-grid'),registrations=node('section'),downloads=node('section');registrations.append(node('h3',tr('Kürzlich registriert','Recently registered')));const users=node('ul',undefined,'admin-activity-list');
  for(const p of people.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,6)){const row=node('li',undefined,'admin-activity-row'),copy=node('div');copy.append(member(p.user_id));if(p.created_at){const time=node('time',date(p.created_at));time.dateTime=p.created_at;row.append(copy,time)}else row.append(copy);users.append(row)}
  registrations.append(users);if(!people.length)registrations.append(node('p',tr('Noch keine Mitglieder vorhanden.','No members yet.'),'notice'));
  downloads.append(node('h3',tr('Letzte Downloads','Latest downloads')));const events=node('ul',undefined,'admin-activity-list');recent.forEach(e=>events.append(eventRow(e,true)));downloads.append(events);
  if(error)downloads.append(node('p',tr('Download-Aktivität konnte nicht geladen werden. Bitte erneut versuchen.','Download activity could not be loaded. Please retry.'),'notice error'));
  else if(!recent.length)downloads.append(node('p',tr('Noch keine Downloads erfasst.','No downloads recorded yet.'),'notice'));
  grid.append(registrations,downloads);root.append(grid,node('p',tr('Erfasst werden Download-Starts angemeldeter Benutzer ab Einführung dieser Funktion. Der Abschluss einer Übertragung wird nicht bestätigt.','Tracks download starts by signed-in users from the introduction of this feature. Transfer completion is not confirmed.'),'notice'));
 }
 async function refreshOverview(){const token=++overviewRequest;
  const results=await Promise.allSettled([db.from('download_events').select('id,user_id,mod_name,version,minecraft_version,loader,created_at').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(8),db.from('download_events').select('id',{count:'exact',head:true}),db.from('download_events').select('id',{count:'exact',head:true}).gte('created_at',new Date(Date.now()-7*86400000).toISOString())]);
  if(token!==overviewRequest)return;const [list,count,lastWeek]=results.map(r=>r.status==='fulfilled'?r.value:{error:r.reason});error=!!(list.error||count.error||lastWeek.error);recent=list.error?[]:list.data||[];total=count.error?null:count.count;week=lastWeek.error?null:lastWeek.count;render();
 }
 function renderHistory(){history.replaceChildren();if(!selected)return;
  history.append(node('h3',tr('Download-Verlauf','Download history')),node('p',tr('Nur für die Administration sichtbar · gestartete Downloads','Visible to administrators only · started downloads'),'notice'));
  const list=node('ul',undefined,'admin-activity-list');rows.forEach(row=>list.append(eventRow(row,false)));history.append(list);
  if(historyError)history.append(node('p',tr('Download-Verlauf konnte nicht geladen werden.','Download history could not be loaded.'),'notice error'));
  else if(!rows.length)history.append(node('p',tr('Noch keine Downloads erfasst.','No downloads recorded yet.'),'notice'));
  if(hasMore||historyError){const more=node('button',tr(historyError?'Erneut versuchen':'Weitere laden',historyError?'Retry':'Load more'),'ghost');more.type='button';more.onclick=()=>loadHistory(false);history.append(more)}
 }
 async function loadHistory(reset){const userId=selected,token=++request;if(reset){rows=[];offset=0;historyError=false;history.replaceChildren(node('p',tr('Downloads werden geladen …','Loading downloads …'),'notice'));}
  try{const result=await db.from('download_events').select('id,mod_name,version,minecraft_version,loader,created_at').eq('user_id',userId).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+20);if(token!==request||selected!==userId)return;if(result.error)throw result.error;const page=result.data||[];rows.push(...page.slice(0,20));offset+=Math.min(20,page.length);hasMore=page.length>20;historyError=false;}
  catch{if(token!==request||selected!==userId)return;historyError=true;}
  renderHistory();
 }
 document.addEventListener('akame-language-change',()=>{render();renderHistory()});
 return {update(nextPeople){people=nextPeople;render();void refreshOverview()},select(id){selected=id;void loadHistory(true)},clear(){selected=null;request++;rows=[];history.replaceChildren()}};
}
