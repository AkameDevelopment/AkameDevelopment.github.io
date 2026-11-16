import {db,getPublicProfile} from './community-session.js?v=1';
const $=id=>document.getElementById(id),list=$("member-list"),search=$("member-search"),count=$("member-count");
const en=()=>window.AkameLanguage?.get?.()==="en",tr=(de,english)=>en()?english:de;
const roles={owner:["Owner","Owner"],admin:["Admin","Admin"],developer:["Developer","Developer"],staff:["Mitarbeiter","Staff"]},order={owner:0,admin:1,developer:2,staff:3};
let members=[],failed=false,page=1,layout="cards";
const avatars=new Map();
try{layout=localStorage.getItem("akame-community-member-layout")==="list"?"list":"cards"}catch{}
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function avatarUrl(value){
 try{const url=new URL(value);if(url.protocol!=="https:"||url.username||url.password)return null;
  const original=url.href;
  if(["cdn.discordapp.com","media.discordapp.net"].includes(url.hostname)&&/\/avatars\/(?:\d+\/)?a_[a-f0-9]+\.(?:png|webp|jpe?g|gif)$/i.test(url.pathname)){
   url.pathname=url.pathname.replace(/\.(?:png|webp|jpe?g|gif)$/i,".gif");url.searchParams.set("size","128");
  }
  return {src:url.href,original};
 }catch{return null;}
}
function memberAvatar(member){
 const initials=Array.from(member.display_name.trim()).slice(0,2).join("").toLocaleUpperCase(),url=avatarUrl(member.avatar_url);
 const key=url?.src||"",cached=avatars.get(member.user_id);
 if(cached&&cached.key===key&&cached.initials===initials)return cached.element;
 const avatar=node("span","member-avatar");avatar.setAttribute("aria-hidden","true");avatar.append(node("span","member-avatar-initials",initials));
 if(url){
  const img=document.createElement("img");img.alt="";img.loading="lazy";img.decoding="async";img.width=42;img.height=42;img.referrerPolicy="no-referrer";
  img.addEventListener("load",()=>img.setAttribute("data-loaded","true"));
  let retried=false;img.addEventListener("error",()=>{if(!retried&&url.src!==url.original){retried=true;img.src=url.original;}else img.remove();});
  // Lazy images must be in the DOM before the browser can decide to load them.
  avatar.append(img);img.src=url.src;
 }
 avatars.set(member.user_id,{key,initials,element:avatar});return avatar;
}
function render(){
 const query=search.value.trim().toLocaleLowerCase(en()?"en":"de"),role=$("member-rank-filter")?.value||"all",sort=$("member-sort")?.value||"name";
 const all=members.filter(m=>m.display_name.toLocaleLowerCase(en()?"en":"de").includes(query)&&(role==="all"||role==="team"&&Object.hasOwn(roles,m.role)||role==="akamesmp"&&m.smp_member||role==="member"&&!m.role||m.role===role));
 all.sort((a,b)=>(sort==="role"?(order[a.role]??4)-(order[b.role]??4):0)||(sort==="name-desc"?-1:1)*a.display_name.localeCompare(b.display_name,en()?"en":"de"));
 const full=document.querySelector('.community-main-layout')?.getAttribute('data-view')==="members",size=full?12:6,pages=Math.max(1,Math.ceil(all.length/size));page=Math.min(page,pages);
 const shown=all.slice((page-1)*size,page*size),visible=new Set(shown.map(m=>m.user_id));for(const id of avatars.keys())if(!visible.has(id))avatars.delete(id);list.replaceChildren();list.setAttribute("data-layout",layout);count.textContent=String(members.length);
 for(const button of document.querySelectorAll('[data-member-layout]'))button.setAttribute('aria-pressed',String(button.getAttribute('data-member-layout')===layout));
 if(failed)list.append(node("p","member-empty",tr("Mitglieder konnten nicht geladen werden. Lade die Seite erneut.","Members could not be loaded. Please reload the page.")));
 else if(!all.length)list.append(node("p","member-empty",members.length?tr("Keine passenden Mitglieder. Versuche einen anderen Namen oder Rang.","No matching members. Try another name or role."):tr("Noch keine öffentlichen Profile vorhanden.","No public profiles yet.")));
 for(const member of shown){
  const card=node("a","member-entry");card.href="user.html?id="+encodeURIComponent(member.user_id);card.setAttribute("aria-label",tr("Profil ansehen: ","View profile: ")+member.display_name);
  const avatar=memberAvatar(member);
  const info=node("div","member-info"),name=node("strong","member-name",member.display_name),badges=node("div","member-badges");
  const roleName=roles[member.role]?.[en()?1:0]||tr("Mitglied","Member"),badge=node("span","member-role",roleName);badge.setAttribute("data-role",Object.hasOwn(roles,member.role)?member.role:"member");badges.append(badge);
  if(member.smp_member)badges.append(node("span","member-smp","AkameSMP"));
  info.append(name,badges);const arrow=node("span","member-arrow","↗");arrow.setAttribute("aria-hidden","true");card.append(avatar,info,arrow);list.append(card);
 }
 $("member-results").textContent=failed?"":tr((all.length?(page-1)*size+1:0)+"–"+Math.min(page*size,all.length)+" von "+all.length+" Profilen",(all.length?(page-1)*size+1:0)+"–"+Math.min(page*size,all.length)+" of "+all.length+" profiles");
 $("member-page").textContent=page+" / "+pages;$("member-previous").disabled=page<=1;$("member-next").disabled=page>=pages;
 search.placeholder=tr("Name suchen …","Search by name…");search.setAttribute("aria-label",tr("Mitglieder suchen","Search members"));$("member-sort").setAttribute("aria-label",tr("Mitglieder sortieren","Sort members"));$("member-rank-filter").setAttribute("aria-label",tr("Mitglieder nach Rang filtern","Filter members by role"));
}
for(const id of ['member-search','member-rank-filter','member-sort'])$(id)?.addEventListener(id==='member-search'?'input':'change',()=>{page=1;render()});
$("member-previous").addEventListener("click",()=>{page--;render()});$("member-next").addEventListener("click",()=>{page++;render()});
for(const button of document.querySelectorAll('[data-member-layout]'))button.addEventListener('click',()=>{layout=button.getAttribute('data-member-layout');try{localStorage.setItem('akame-community-member-layout',layout)}catch{}render()});
document.addEventListener("akame-language-change",render);document.addEventListener("akame-community-view",()=>{page=1;render()});
try{
 const {data,error}=await db.rpc("list_visible_members");failed=!!error;members=Array.isArray(data)?data.filter(x=>typeof x.display_name==="string"&&typeof x.user_id==="string"):[];render();
 if(!failed)for(let i=0;i<members.length;i+=8){await Promise.all(members.slice(i,i+8).map(async member=>{try{const {data,error}=await getPublicProfile(member.user_id);const p=Array.isArray(data)?data[0]:data;if(!error&&p){member.role=p.role||null;member.smp_member=p.smp_member===true}}catch{}}));render();}
}catch{failed=true;render();}
