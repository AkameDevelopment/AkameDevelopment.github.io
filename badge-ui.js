export const badgeLang=()=>((window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang'))==='de'?'de':'en');
export const badgeText=(de,en)=>badgeLang()==='de'?de:en;
export const badgeName=b=>badgeLang()==='de'?(b.name_de||b.name):b.name;
export const badgeDescription=b=>badgeLang()==='de'?(b.description_de||b.description):b.description;
export const badgeSymbols={users:'♧',download:'↓',gem:'◆','code-2':'⌘','flask-conical':'⚗',bug:'✦',crown:'♛',shield:'⬡',star:'★',award:'✧',heart:'♥',trophy:'🏆',minecraft:'▧'};
export function badgeChip(b,{publicProfile=false}={}){
 const chip=document.createElement('span');chip.className=publicProfile?'akame-badge':'personal-badge';chip.title=badgeDescription(b)||badgeName(b);chip.dataset.badgeDescription=chip.title;
 const color=/^#[a-f\d]{6}$/i.test(b.color||'')?b.color:'#b58cff';chip.style.setProperty('--badge-color',color);chip.style.setProperty('--profile-badge-color',color);
 const icon=document.createElement('span');icon.className='akame-badge-icon';icon.setAttribute('aria-hidden','true');
 if(b.system_key==='minecraft'){const img=document.createElement('img');img.src='assets/minecraft-grass-block.svg';img.width=18;img.height=19;img.alt='';img.className='minecraft-grass-badge';icon.append(img)}else icon.textContent=badgeSymbols[b.icon]||'✧';
 const name=document.createElement('span');name.className='akame-badge-name';name.textContent=badgeName(b);chip.append(icon,name);
 if(b.showcase_position){chip.classList.add('badge-showcase-favorite');chip.dataset.showcasePosition=b.showcase_position;chip.title=badgeText('Badge-Favorit','Showcase badge')+' · '+chip.title;}
 return chip;
}
export function renderPublicBadgeList(root,rows,{publicProfile=true}={}){root.replaceChildren();const seen=new Set();for(const b of rows||[]){const alias=String(b.name).toLowerCase(),key=['admin','administrator'].includes(alias)?'role:admin':['developer','entwickler'].includes(alias)?'role:developer':['staff','team'].includes(alias)?'role:staff':alias==='owner'?'role:owner':'badge:'+b.id;if(seen.has(key))continue;seen.add(key);root.append(badgeChip(b,{publicProfile}));}}
