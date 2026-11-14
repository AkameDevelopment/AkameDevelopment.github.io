(() => {
  'use strict';
  const root = document.getElementById('mod-browser');
  let releases = [], failed = false;
  let lang = localStorage.getItem('akame-lang') === 'en' ? 'en' : 'de';
  const t = (de, en) => lang === 'en' ? en : de;
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const safeUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && ['github.com', 'objects.githubusercontent.com', 'raw.githubusercontent.com'].includes(u.hostname); } catch { return false; } };
  const key = r => r.modId || r.mod;
  const demo = r => r.demo === true || /test|demo/i.test(r.version || '');
  const params = () => new URLSearchParams(location.hash.slice(1));
  function navigate(id, versions = false) {
    const p = new URLSearchParams(); if (id) p.set('mod', id); if (versions) p.set('view', 'versions');
    location.hash = p.toString();
  }
  function button(text, action, cls = 'mod-button') { const b = el('button', text, cls); b.type = 'button'; b.addEventListener('click', action); return b; }
  function image(r) {
    const n = el('img', undefined, 'mod-art'); n.alt = ''; n.loading = 'lazy';
    n.src = typeof r.image === 'string' && /^assets\/[a-z0-9/_-]+\.(svg|png|jpg|webp)$/i.test(r.image) ? r.image : 'assets/crosshair-demo.svg'; return n;
  }
  function chips(values) { const n = el('div', undefined, 'download-chips'); values.filter(Boolean).forEach(v => n.append(el('span', v, 'download-chip'))); return n; }
  function render() {
    root.replaceChildren();
    document.getElementById('downloads-intro').textContent = t('Wähle eine Mod aus, entdecke die Details und lade die passende Version herunter.', 'Choose a mod, explore its details and download the right version.');
    if (failed) { root.append(el('p', t('Die Downloads konnten nicht geladen werden. Bitte versuche es später erneut.', 'Downloads could not be loaded. Please try again later.'))); return; }
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
        body.append(chips([...new Set(items.map(x => x.loader).filter(Boolean)), `${items.length} ${t('Version(en)', 'version(s)')}`, items.every(demo) ? t('Testdateien · keine installierbare Mod', 'Test files · not an installable mod') : null]));
        body.append(button(t('Mod auswählen →', 'Select mod →'), () => navigate(modId))); card.append(body); grid.append(card);
      }
      root.append(grid); return;
    }
    if (!selected) { root.append(el('p', t('Diese Mod wurde nicht gefunden.', 'This mod was not found.')), button(t('← Alle Mods', '← All mods'), () => navigate())); return; }
    const r = selected[0], versions = p.get('view') === 'versions';
    root.append(button(t('← Alle Mods', '← All mods'), () => navigate(), 'mod-back'));
    const hero = el('div', undefined, 'mod-heading');
    const heading = el('div'); heading.append(el('h2', r.mod || id), el('p', r.summary || ''));
    hero.append(image(r), heading, button(t('↓ Download', '↓ Download'), () => navigate(id, true))); root.append(hero);
    const tabs = el('nav', undefined, 'mod-tabs'); tabs.setAttribute('aria-label', t('Mod-Ansicht', 'Mod view'));
    for (const [label, value] of [[t('Beschreibung', 'Description'), false], [t('Versionen', 'Versions'), true]]) {
      const b = button(label, () => navigate(id, value), 'mod-tab'); if (versions === value) b.setAttribute('aria-current', 'page'); tabs.append(b);
    }
    root.append(tabs);
    const layout = el('div', undefined, 'mod-layout'), content = el('section', undefined, 'mod-content'), aside = el('aside', undefined, 'mod-content');
    aside.append(el('h3', t('Kompatibilität', 'Compatibility')), el('p', 'Minecraft: Java Edition'));
    aside.append(chips([...new Set(selected.map(x => x.minecraftVersion).filter(Boolean))]), el('h3', 'Modloader'), chips([...new Set(selected.map(x => x.loader).filter(Boolean))]), el('h3', t('Umgebung', 'Environment')), chips([...new Set(selected.map(x => x.side === 'both' ? 'Client & Server' : x.side === 'server' ? 'Server' : x.side === 'client' ? 'Client' : null))]));
    if (!versions) {
      content.append(el('h3', r.mod || id), el('p', r.summary || t('Wähle unter Versionen die passende Datei für dein Minecraft aus.', 'Choose the right file for your Minecraft under Versions.')));
      if (selected.every(demo)) content.append(el('p', t('Hinweis: Aktuell sind nur Testdateien verfügbar. Diese Dateien sind keine installierbaren Minecraft-Mods.', 'Notice: Only test files are currently available. These files are not installable Minecraft mods.'), 'mod-warning'));
      content.append(button(t('Download · Version auswählen', 'Download · Choose version'), () => navigate(id, true)));
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
        const shown = selected.filter(x => controls.every(({field,select}) => !select.value || (x[field] || (field === 'channel' ? 'stable' : '')) === select.value)).slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.version || '').localeCompare(String(a.version || ''), undefined, {numeric:true}));
        if (!shown.length) list.append(el('p', t('Keine Version passt zu diesen Filtern.', 'No versions match these filters.')));
        shown.forEach(x => {
          const row = el('article', undefined, 'mod-release'), info = el('div'); info.append(el('h4', `${x.mod || id} · ${x.version || '—'}`), chips([x.minecraftVersion ? `Minecraft ${x.minecraftVersion}` : null, x.loader, x.channel || 'stable', x.date]));
          if (demo(x)) info.append(el('p', t('TESTDATEI · Keine installierbare Mod', 'TEST FILE · Not an installable mod'), 'mod-warning'));
          const a = el('a', demo(x) ? t('Testdatei öffnen ↗', 'Open test file ↗') : t('Herunterladen ↗', 'Download ↗'), 'mod-button'); a.href = x.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; row.append(info, a); list.append(row);
        });
      };
      controls.forEach(({select}) => select.addEventListener('change', show)); content.append(filters, list); show();
    }
    layout.append(content, aside); root.append(layout);
  }
  window.addEventListener('hashchange', render);
  document.addEventListener('akame-language-change', e => { lang = e.detail.lang === 'en' ? 'en' : 'de'; render(); });
  fetch('./updates.json', {cache:'no-store'}).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { releases = Array.isArray(data.releases) ? data.releases.filter(r => r && key(r) && safeUrl(r.url)) : []; render(); }).catch(() => { failed = true; render(); });
  document.getElementById('year').textContent = new Date().getFullYear();
})();
