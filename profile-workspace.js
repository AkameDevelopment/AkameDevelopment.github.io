(() => {
 'use strict';
 const root=document.getElementById('profile-content');if(!root)return;
 const tr=(de,en)=>localStorage.getItem('akame-lang')==='en'?en:de;
 const node=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
 const biography=document.getElementById('profile-bio')?.closest('section');
 const beta=document.getElementById('profile-beta-list')?.closest('section');
 const identity=root.querySelector('.panel.lead');if(!biography||!identity)return;
 document.body.classList.add('profile-workspace');
 const privacy=node('section','panel');
 for(const id of ['profile-show-member-since','profile-show-discord-name','profile-show-member-list','profile-show-badges']){
  const label=document.getElementById(id).closest('label'),hint=label.nextElementSibling;
  privacy.append(label);if(hint?.classList.contains('privacy'))privacy.append(hint);
 }
 const spotify=document.getElementById('profile-spotify-track').parentElement;spotify.classList.add('panel','profile-spotify-settings');
 const saveActions=document.getElementById('profile-save').closest('.actions');saveActions.classList.add('profile-settings-save');
 const note=biography.querySelector(':scope > .privacy:last-child');if(note){note.dataset.profileNote='';note.textContent=tr('Hier bearbeitest du die Beschreibung deines öffentlichen Profils.','Edit the description of your public profile here.');}
 const shell=node('div','profile-workspace-shell'),sidebar=node('aside','profile-settings-sidebar'),nav=node('nav','profile-settings-nav'),content=node('div','profile-settings-content');
 nav.setAttribute('aria-label',tr('Profileinstellungen','Profile settings'));const caption=node('span','profile-settings-caption');sidebar.append(caption,nav);shell.append(sidebar,content);
 const pages=[];
 const definitions=[
  ['profile','Profil','Profile','Name und Profilbeschreibung verwalten.','Manage your name and biography.',[identity,biography]],
  ['appearance','Aussehen','Appearance','Profilhintergrund, Farben und Namenskontur anpassen.','Customize your profile background, colors and name outline.',[]],
  ['spotify','Spotify','Spotify','Deine Lieblingssongs für dein öffentliches Profil auswählen.','Choose favorite songs for your public profile.',[spotify]],
  ['visibility','Sichtbarkeit','Visibility','Festlegen, welche Profilangaben öffentlich sichtbar sind.','Choose which profile details are visible publicly.',[privacy]],
  ['showcase','Showcase','Showcase','Bilder und GIFs auf deinem Profil verwalten.','Manage images and GIFs on your profile.',[document.getElementById('gallery-panel')]],
  ['mods','Meine Mods','My mods','Die Mod-Auswahl in deinem öffentlichen Profil bearbeiten.','Edit the mod selection on your public profile.',[document.getElementById('profile-mod-list').closest('section')]],
  ['posts','Meine Beiträge','My posts','Deine Community-Beiträge verwalten.','Manage your Community posts.',[document.getElementById('profile-own-posts')]],
  ['beta','Beta-Zugänge','Beta access','Freischaltungen und Einladungen zu Testprojekten ansehen.','View access and invitations to test projects.',[beta]]
 ];
 for(const [id,de,en,descDe,descEn,targets]of definitions){
  const page=node('section','profile-settings-page');page.id='profile-page-'+id;page.hidden=true;
  const header=node('div','profile-settings-heading'),title=node('h2'),description=node('p');title.tabIndex=-1;header.append(title,description);page.append(header);
  const button=node('button');button.type='button';button.dataset.profilePage=id;button.setAttribute('aria-controls',page.id);nav.append(button);
  targets.filter(Boolean).forEach(target=>page.append(target));
  if(id==='appearance'){const slot=node('div');slot.id='profile-appearance-slot';page.append(slot);const existing=root.querySelector('.akame-appearance-editor');if(existing)slot.append(existing);}
  pages.push({id,de,en,descDe,descEn,page,title,description,button});content.append(page);
 }
 root.querySelector(':scope > .columns')?.remove();content.append(saveActions);root.append(shell);
 const publicLink=node('a','profile-view-public');publicLink.textContent=tr('Profil ansehen ↗','View profile ↗');publicLink.href=document.getElementById('profile-public-link').dataset.publicProfileUrl||'user.html';root.querySelector('.profile-public-link').append(publicLink);
 new MutationObserver(()=>{publicLink.href=document.getElementById('profile-public-link').dataset.publicProfileUrl||'user.html';}).observe(document.getElementById('profile-public-link'),{attributes:true,attributeFilter:['data-public-profile-url']});
 const key='akame-profile-settings-page-v1',valid=id=>pages.some(page=>page.id===id);
 function requested(){const raw=location.hash.slice(1);if(raw==='profile-show-member-list')return 'visibility';return valid(raw)?raw:null;}
 let stored;try{stored=sessionStorage.getItem(key)}catch{}
 let active=requested()||(valid(stored)?stored:'profile');
 function render(focus=false){
  const copyLabel=document.getElementById('profile-copy-label');if(copyLabel)copyLabel.textContent=tr('Link kopieren','Copy link');caption.textContent=tr('DEIN KONTO','YOUR ACCOUNT');nav.setAttribute('aria-label',tr('Profileinstellungen','Profile settings'));publicLink.textContent=tr('Profil ansehen ↗','View profile ↗');
  for(const page of pages){page.page.hidden=page.id!==active;page.button.textContent=tr(page.de,page.en);page.title.textContent=tr(page.de,page.en);page.description.textContent=tr(page.descDe,page.descEn);if(page.id===active){page.button.setAttribute('aria-current','page');if(focus)page.title.focus({preventScroll:true})}else page.button.removeAttribute('aria-current');}
  const note=document.querySelector('[data-profile-note]');if(note)note.textContent=tr('Hier bearbeitest du die Beschreibung deines öffentlichen Profils.','Edit the description of your public profile here.');
 }
 function select(id,focus=false){if(!valid(id))return;active=id;try{sessionStorage.setItem(key,id)}catch{}history.replaceState(history.state,'',location.pathname+location.search+'#'+id);render(focus);}
 nav.addEventListener('click',event=>{const button=event.target.closest('[data-profile-page]');if(button&&nav.contains(button))select(button.dataset.profilePage,true)});
 window.addEventListener('hashchange',()=>{const id=requested();if(id){active=id;try{sessionStorage.setItem(key,id)}catch{}render()}});
 document.addEventListener('akame-language-change',()=>render());
 const save=document.getElementById('profile-save'),message=document.getElementById('save-message');
 const updateSave=()=>{saveActions.hidden=save.hidden&&!message.textContent.trim();};
 new MutationObserver(updateSave).observe(save,{attributes:true,attributeFilter:['hidden','style']});new MutationObserver(updateSave).observe(message,{childList:true,characterData:true,subtree:true});updateSave();
 // Restore the section without creating history entries or triggering anchor scrolling.
 if(location.hash==='#profile-show-member-list'){try{sessionStorage.setItem(key,active)}catch{}render();}else select(active);
})();
