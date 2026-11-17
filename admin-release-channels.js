const choices=[['stable','Release','Fertige Version','Finished version'],['beta','Beta','Zum Testen · Beta-Zugang nötig','Testing · beta access required'],['alpha','Alpha','Frühe Vorschau · Beta-Zugang nötig','Early preview · beta access required']];
const text=(de,en)=>localStorage.getItem('akame-lang')==='en'?en:de;
export function channelBadge(value='stable'){
 const badge=document.createElement('span');badge.className='catalogue-channel-badge';badge.dataset.channel=value;badge.textContent=choices.find(c=>c[0]===value)?.[1]||value;return badge;
}
export function mountChannelPicker(select){
 const label=select.closest('label');label.hidden=true;label.style.display='none';
 const group=document.createElement('fieldset');group.className='catalogue-channel-picker';group.id=select.id+'-picker';
 const legend=document.createElement('legend');legend.textContent=text('Art der Version','Release channel');group.append(legend);
 const grid=document.createElement('div');grid.className='catalogue-channel-options';group.append(grid);
 for(const [value,title,de,en]of choices){
  const option=document.createElement('label');option.className='catalogue-channel-option';option.dataset.channel=value;
  const input=document.createElement('input');input.type='radio';input.name=select.id+'-choice';input.value=value;input.defaultChecked=value==='stable';input.setAttribute('aria-label',title);
  const body=document.createElement('span');body.className='catalogue-channel-body';const hint=document.createElement('small');hint.textContent=text(de,en);body.append(channelBadge(value),hint);option.append(input,body);grid.append(option);
  input.addEventListener('change',()=>{if(input.checked){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}});
 }
 const note=document.createElement('p');note.className='catalogue-channel-note';note.setAttribute('aria-live','polite');group.append(note);label.after(group);
 function sync(){const value=select.value||'stable';for(const input of grid.querySelectorAll('input')){input.checked=input.value===value;input.closest('label').classList.toggle('is-selected',input.checked);}legend.textContent=text('Art der Version','Release channel');grid.querySelectorAll('small').forEach((el,i)=>el.textContent=text(choices[i][2],choices[i][3]));note.textContent=value==='stable'?text('Öffentliche Mods können ohne Beta-Zugang heruntergeladen werden.','Public mods can be downloaded without beta access.'):text('Die Version ist sichtbar. Zum Herunterladen ist ein Beta-Zugang für diese Mod erforderlich.','The version is visible. Downloading requires beta access for this mod.');}
 select.addEventListener('change',sync);document.addEventListener('akame-language-change',sync);sync();return {group,sync};
}
