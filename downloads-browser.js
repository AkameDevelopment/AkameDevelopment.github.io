import {db,loadCatalogue,assetUrl,attachDownload} from './mod-catalogue.js';
(() => {
  'use strict';
  const root = document.getElementById('mod-browser');
  let releases = [], failed = false, catalogueFailed=false;
  let lang = localStorage.getItem('akame-lang') === 'en' ? 'en' : 'de';
  const t = (de, en) => lang === 'en' ? en : de;
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && ['github.com', 'objects.githubusercontent.com', 'raw.githubusercontent.com'].includes(u.hostname); } catch { return false; } };
  const key = r => r.modId || r.mod;
  function releaseAnnouncement(r){
    const status={planned:t('Release geplant','Release planned'),pending:t('Release ausstehend','Release pending'),in_development:t('In Entwicklung','In development')}[r.releaseStatus]||t('Release ausstehend','Release pending');
    const date=/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate||'')?new Date(r.releaseDate+'T12:00:00').toLocaleDateString(lang==='en'?'en-GB':'de-DE',{dateStyle:'long'}):'';
    return [status,date?t('Geplant: ','Expected: ')+date:'',r.releaseNote].filter(Boolean).join(' · ');
  }
  const demo = r => r.demo === true || /test|demo/i.test(r.version || '');
  const params = () => new URLSearchParams(location.hash.slice(1));
  function navigate(id, view = 'description') {
    const p = new URLSearchParams(); if (id) p.set('mod', id); if (view !== 'description') p.set('view', view);
    location.hash = p.toString();
  }
  function button(text, action, cls = 'mod-button') { const b = el('button', text, cls); b.type = 'button'; b.addEventListener('click', action); return b; }
  function image(r) {
    const n = el('img', undefined, 'mod-art');if(r.catalogue||r.catalogueMeta)n.classList.add('mod-profile-image'); n.alt = ''; n.loading = 'lazy';
    n.src = (r.catalogue||r.catalogueMeta)&&r.image?r.image:typeof r.image === 'string' && /^assets\/[a-z0-9/_-]+\.(svg|png|jpg|webp)$/i.test(r.image) ? r.image : 'assets/mod-placeholder.svg'; return n;
  }
  function chips(values) { const n = el('div', undefined, 'download-chips'); values.filter(Boolean).forEach(v => n.append(el('span', v, 'download-chip'))); return n; }
  function render() {
    root.replaceChildren();
    document.getElementById('downloads-intro').textContent = t('Wähle eine Mod aus, entdecke die Details und lade die passende Version herunter.', 'Choose a mod, explore its details and download the right version.');
    if (failed) { root.append(el('p', t('Die Downloads konnten nicht geladen werden. Bitte versuche es später erneut.', 'Downloads could not be loaded. Please try again later.'))); return; }
    if(catalogueFailed)root.append(el('p',t('Der Mod-Katalog konnte nicht geladen werden. Bestehende Downloads bleiben verfügbar.','The mod catalogue could not be loaded. Existing downloads remain available.'),'mod-warning'));
    if (!releases.length) { root.append(el('p', t('Noch keine veröffentlichten Downloads vorhanden.', 'No published downloads yet.'))); return; }
    const groups = new Map(); releases.forEach(r => { const id = key(r); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(r); });
    const p = params(), id = p.get('mod'), selected = groups.get(id);
    if (!id) {
      root.append(el('h2', t('Wähle deine Mod', 'Choose your mod')));
      const grid = el('div', undefined, 'downloads-grid');
      for (const [modId, items] of groups) {
        const r = items[0], card = el('article', undefined, 'entry'); card.append(image(r));
        const body = el('div', undefined, 'download-card-body');
        body.append(el('h3', r.mod || modId, 'download-card-title'), el('p', r.summary || '', 'download-description'));
        body.append(chips([...new Set(items.map(x => x.loader).filter(Boolean)), `${items.filter(x=>!x.noRelease).length} ${t('Version(en)', 'version(s)')}`, items.every(demo) ? t('Testdateien · keine installierbare Mod', 'Test files · not an installable mod') : null]));
        if(r.noRelease)body.append(el('p',releaseAnnouncement(r),'mod-warning'));
        body.append(button(t('Mod auswählen →', 'Select mod →'), () => navigate(modId))); card.append(body); grid.append(card);
      }
      root.append(grid); return;
    }
    if (!selected) { root.append(el('p', t('Diese Mod wurde nicht gefunden.', 'This mod was not found.')), button(t('← Alle Mods', '← All mods'), () => navigate())); return; }
    const r = selected[0], view = ['versions', 'changelog', 'gallery'].includes(p.get('view')) ? p.get('view') : 'description';
    root.append(button(t('← Alle Mods', '← All mods'), () => navigate(), 'mod-back'));
    const hero = el('div', undefined, 'mod-heading');
    const heading = el('div'); heading.append(el('h2', r.mod || id), el('p', r.summary || ''));
    const download=button(selected.some(item=>!item.noRelease)?t('↓ Download','↓ Download'):t('Release ausstehend','Release pending'),()=>navigate(id,'versions'));download.disabled=!selected.some(item=>!item.noRelease);hero.append(image(r),heading,download); root.append(hero);
    const tabs = el('nav', undefined, 'mod-tabs'); tabs.setAttribute('aria-label', t('Mod-Ansicht', 'Mod view'));
    for (const [label, value] of [[t('Beschreibung', 'Description'), 'description'], [t('Galerie','Gallery'),'gallery'], ['Changelog', 'changelog'], [t('Versionen', 'Versions'), 'versions']]) {
      const b = button(label, () => navigate(id, value), 'mod-tab'); if (view === value) b.setAttribute('aria-current', 'page'); tabs.append(b);
    }
    root.append(tabs);
    if(selected.every(item=>item.noRelease))root.append(el('p',releaseAnnouncement(r),'mod-warning'));
    const layout = el('div', undefined, 'mod-layout'), content = el('section', undefined, 'mod-content'), aside = el('aside', undefined, 'mod-content');
    aside.append(el('h3', t('Kompatibilität', 'Compatibility')), el('p', 'Minecraft: Java Edition'));
    aside.append(chips([...new Set(selected.map(x => x.minecraftVersion).filter(Boolean))]), el('h3', 'Modloader'), chips([...new Set(selected.map(x => x.loader).filter(Boolean))]), el('h3', t('Umgebung', 'Environment')), chips([...new Set(selected.map(x => x.side === 'both' ? 'Client & Server' : x.side === 'server' ? 'Server' : x.side === 'client' ? 'Client' : null))]));
    if(view==='gallery'){
      content.append(el('h3',t('Galerie','Gallery')));
      if((r.catalogue||r.catalogueMeta)&&Array.isArray(r.gallery)&&r.gallery.length){const gallery=el('div',undefined,'mod-catalogue-gallery');for(const item of r.gallery){const url=assetUrl(item.path);if(!url)continue;const link=el('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';const img=el('img');img.src=url;img.alt=item.caption||r.mod;img.loading='lazy';link.append(img);if(item.caption)link.append(el('span',item.caption));gallery.append(link)}content.append(gallery)}
      if(!content.querySelector('.mod-catalogue-gallery img'))content.append(el('p',t('Noch keine Galeriebilder vorhanden.','No gallery images yet.')));
    } else if (view === 'changelog') {
      content.append(el('h3', 'Changelog'));
      const ordered = selected.filter(x=>!x.noRelease).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.version || '').localeCompare(String(a.version || ''), undefined, {numeric: true}));
      for (const release of ordered) {
        const entry = el('article', undefined, 'mod-changelog-entry');
        entry.append(el('h4', `v${release.version || '—'}`), chips([release.date, release.minecraftVersion ? `Minecraft ${release.minecraftVersion}` : null, release.loader, release.channel || 'stable']));
        let notes = release.changelog;
        if (notes && typeof notes === 'object' && !Array.isArray(notes)) notes = notes[lang] || notes.de || notes.en;
        if (demo(release)) entry.append(el('p', t('TESTDATEI · Keine installierbare Mod', 'TEST FILE · Not an installable mod'), 'mod-warning'));
        if (!notes && release.previewBatch === 'downloads-layout-test-30') {
          entry.append(el('p', t('Beispiel-Changelog für die Layout-Vorschau:', 'Sample changelog for the layout preview:'), 'mod-warning'));
          notes = [t('Vorschau der Mod-Detailseite hinzugefügt.', 'Added a preview of the mod detail page.'), t('Minecraft-Version, Modloader und Kanal als Beispiel hinterlegt.', 'Added sample Minecraft version, modloader and channel.'), t('Download-Auswahl mit einer nicht installierbaren Testdatei verknüpft.', 'Linked the download picker to a non-installable test file.')];
        }
        if (Array.isArray(notes) && notes.some(n => typeof n === 'string' && n.trim())) {
          const list = el('ul'); notes.filter(n => typeof n === 'string' && n.trim()).forEach(note => list.append(el('li', note))); entry.append(list);
        } else if (typeof notes === 'string' && notes.trim()) {
          entry.append(el('p', notes, 'mod-changelog-text'));
        } else {
          entry.append(el('p', t('Für diese Version wurden noch keine Änderungen hinterlegt.', 'No changes have been recorded for this version yet.')));
        }
        content.append(entry);
      }
    } else if (view === 'description') {
      if(r.bannerUrl){const banner=el('img',undefined,'mod-description-banner');banner.src=r.bannerUrl;banner.alt=t('Beschreibungs-Banner für ','Description banner for ')+(r.mod||id);banner.decoding='async';content.append(banner);}
      content.append(el('h3', r.mod || id), el('p', r.description || r.summary || t('Wähle unter Versionen die passende Datei für dein Minecraft aus.', 'Choose the right file for your Minecraft under Versions.')));

      if (selected.every(demo)) content.append(el('p', t('Hinweis: Aktuell sind nur Testdateien verfügbar. Diese Dateien sind keine installierbaren Minecraft-Mods.', 'Notice: Only test files are currently available. These files are not installable Minecraft mods.'), 'mod-warning'));
      content.append(button(t('Download · Version auswählen', 'Download · Choose version'), () => navigate(id, 'versions')));
    } else {
      content.append(el('h3', t('Version auswählen', 'Choose a version')));
      const filters = el('div', undefined, 'mod-filters'), list = el('div');
      const controls = [['minecraftVersion', t('Minecraft-Version', 'Minecraft version')], ['loader', 'Modloader'], ['channel', t('Kanal', 'Channel')]].map(([field, label]) => {
        const wrap = el('label', label), select = el('select'); const all = el('option', t('Alle', 'All')); all.value = ''; select.append(all);
        [...new Set(selected.map(x => x[field] || (field === 'channel' ? 'stable' : '')).filter(Boolean))].sort((a,b) => b.localeCompare(a, undefined, {numeric:true})).forEach(value => { const o = el('option', value); o.value = value; select.append(o); });
        wrap.append(select); filters.append(wrap); return {field, select};
      });
      const show = () => {
        list.replaceChildren();
        const shown = selected.filter(x => !x.noRelease && controls.every(({field,select}) => !select.value || (x[field] || (field === 'channel' ? 'stable' : '')) === select.value)).slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.version || '').localeCompare(String(a.version || ''), undefined, {numeric:true}));
        if (!shown.length) list.append(el('p', t('Keine Version passt zu diesen Filtern.', 'No versions match these filters.')));
        shown.forEach(x => {
          const row = el('article', undefined, 'mod-release'), info = el('div'); info.append(el('h4', `${x.mod || id} · ${x.version || '—'}`), chips([x.minecraftVersion ? `Minecraft ${x.minecraftVersion}` : null, x.loader, x.channel || 'stable', x.date]));
          if (demo(x)) info.append(el('p', t('TESTDATEI · Keine installierbare Mod', 'TEST FILE · Not an installable mod'), 'mod-warning'));
          const a = el('a', demo(x) ? t('Testdatei öffnen ↗', 'Open test file ↗') : t('Herunterladen ↗', 'Download ↗'), 'mod-button'); attachDownload(a,x,{onError:()=>{const message=el('p',t('Download konnte nicht gestartet werden. Bitte erneut versuchen oder den Zugang prüfen.','Download could not start. Please retry or check your access.'),'mod-warning');row.append(message)}}); row.append(info, a); list.append(row);
        });
      };
      controls.forEach(({select}) => select.addEventListener('change', show)); content.append(filters, list); show();
    }
    layout.append(content, aside); root.append(layout);
  }
  window.addEventListener('hashchange', render);
  document.addEventListener('akame-language-change', e => { lang = e.detail.lang === 'en' ? 'en' : 'de'; render(); });
  let loadToken=0;
  async function load(){const token=++loadToken;
   const results=await Promise.allSettled([fetch('./updates.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json()}),loadCatalogue()]);
   if(token!==loadToken)return;const [legacy,catalogue]=results;catalogueFailed=catalogue.status==='rejected';failed=legacy.status==='rejected'&&catalogueFailed;
   const old=legacy.status==='fulfilled'&&Array.isArray(legacy.value.releases)?legacy.value.releases.filter(r=>r&&key(r)&&safeUrl(r.url)):[];
   const managed=catalogue.status==='fulfilled'?catalogue.value:{mods:[],releases:[]};
   let visibleOld=[];
   try{const [rules,auth]=await Promise.all([db.from('mod_visibility').select('project_slug,visibility,visible'),db.auth.getUser()]);if(rules.error)throw rules.error;const uid=auth.data?.user?.id;let beta=[],staff=null;if(uid){const [b,s]=await Promise.all([db.from('beta_access').select('project_slug').eq('user_id',uid),db.from('staff_access').select('role').eq('user_id',uid).maybeSingle()]);beta=b.error?[]:b.data||[];staff=s.error?null:s.data?.role}const visibility=new Map((rules.data||[]).map(r=>[r.project_slug,r.visibility||(r.visible?'public':'hidden')]));visibleOld=old.filter(r=>['owner','admin'].includes(staff)||visibility.get(key(r))==='public'||visibility.get(key(r))==='beta'&&beta.some(b=>b.project_slug===key(r)));}catch{catalogueFailed=true;}
   if(token!==loadToken)return;
   const replacement=new Set(managed.releases.map(r=>r.modId+'::'+r.version+'::'+r.loader+'::'+r.minecraftVersion));
   const catalogueBySlug=new Map(managed.mods.map(mod=>[mod.slug,mod]));
   releases=[...managed.releases,...visibleOld.filter(r=>!replacement.has(key(r)+'::'+r.version+'::'+(r.loader||'')+'::'+(r.minecraftVersion||''))).map(r=>{const mod=catalogueBySlug.get(key(r));return mod?{...r,mod:mod.name,summary:mod.summary,description:mod.description,gallery:mod.gallery,image:assetUrl(mod.cover_path),bannerUrl:assetUrl(mod.banner_path),releaseStatus:mod.release_status,releaseNote:mod.release_note,releaseDate:mod.expected_release_date,catalogueMeta:true}:r})];
   for(const mod of managed.mods){if(!releases.some(r=>key(r)===mod.slug))releases.push({modId:mod.slug,mod:mod.name,summary:mod.summary,description:mod.description,gallery:mod.gallery,image:assetUrl(mod.cover_path),bannerUrl:assetUrl(mod.banner_path),releaseStatus:mod.release_status,releaseNote:mod.release_note,releaseDate:mod.expected_release_date,catalogue:true,noRelease:true})}
   render();
  }
  void load();db.auth.onAuthStateChange(event=>{if(event!=='INITIAL_SESSION')setTimeout(()=>void load(),0)});
  document.getElementById('year').textContent = new Date().getFullYear();
})();
