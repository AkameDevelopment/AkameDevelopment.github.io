(() => {
  'use strict';
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;
  const toolbar = dashboard.querySelector('.admin-dashboard-toolbar');
  const nav = toolbar.querySelector('.admin-quicknav');
  const content = document.createElement('div'); content.className = 'admin-workspace-content';
  const children = [...dashboard.children].filter(n => n !== toolbar);
  dashboard.append(content); children.forEach(n => content.append(n));
  document.querySelectorAll('main.shell > .admin-section-heading').forEach(n => n.remove());
  const tr = (de, en) => localStorage.getItem('akame-lang') === 'en' ? en : de;
  const definitions = [
    ['overview', 'Übersicht', 'Overview', null, 'Neue Mitglieder und Download-Aktivitäten auf einen Blick.', 'New members and download activity at a glance.'],
    ['admin-controls', 'Benutzerverwaltung', 'Users', 'admin-controls', 'Benutzer suchen und Profile, Rollen sowie Beta-Zugänge verwalten.', 'Search users and manage profiles, roles and beta access.'],
    ['media-review-manager', 'Freigaben', 'Approvals', 'media-review-manager', 'Eingereichte Bilder und Beiträge prüfen.', 'Review submitted images and posts.'],
    ['news-manager', 'News & Updates', 'News & Updates', 'news-manager', 'Meldungen und Releases erstellen und bearbeiten.', 'Create and edit announcements and releases.'],
    ['mod-visibility-manager', 'Mods', 'Mods', 'mods-manager', 'Mods, Bilder, Dateien und Versionen verwalten.', 'Manage mods, images, files and versions.'],
    ['requests-manager', 'Support', 'Support', 'requests-manager', 'Anfragen finden, beantworten und bearbeiten.', 'Find, reply to and manage tickets.'],
    ['admin-community-panel', 'Community', 'Community', 'admin-community-panel', 'Diskussionen und Community-Inhalte moderieren.', 'Moderate discussions and community content.'],
    ['owner-build-controls', 'Website', 'Website', 'owner-build-controls', 'Darstellung der Website-Version einstellen.', 'Configure website version visibility.']
  ];
  const pages = [];
  nav.replaceChildren();
  for (const [id, de, en, targetId, descriptionDe, descriptionEn] of definitions) {
    const target = targetId ? document.getElementById(targetId) : null;
    if (targetId && !target) continue;
    const page = document.createElement('section'); page.className = 'admin-subpage'; page.id = 'admin-page-' + id; page.hidden = true;
    const head = document.createElement('div'); head.className = 'admin-page-heading';
    const back = document.createElement('button'); back.type = 'button'; back.className = 'admin-page-back'; back.dataset.adminPage = 'overview';
    const title = document.createElement('h2'); title.tabIndex = -1; const description = document.createElement('p');
    if (id !== 'overview') head.append(back); head.append(title, description); page.append(head);
    const link = document.createElement('button'); link.type = 'button'; link.dataset.adminPage = id; nav.append(link);
    const unavailable = document.createElement('p'); unavailable.className = 'state'; unavailable.hidden = true; page.append(unavailable);
    if (target) page.append(target);
    else { const stats = content.querySelector(':scope > .grid'); if (stats) page.append(stats); const activity = document.getElementById('admin-activity'); if (activity) page.append(activity); }
    content.append(page);
    let card;

    pages.push({id, page, target, link, title, description, back, unavailable, card, de, en, descriptionDe, descriptionEn});
  }
  // Keep the hidden account data available to the existing account scripts.
  content.querySelectorAll(':scope > .layout').forEach(n => { n.hidden = true; });
  let selectedPage = (()=>{const id=location.hash.slice(1);return pages.some(p=>p.id===id)?id:new URLSearchParams(location.search).has('member')?'admin-controls':'overview'})();
  function activeId(){return selectedPage;}
  function render(focus = false) {
    const active = activeId();
    for (const p of pages) {
      const allowed = !p.target || !p.target.hidden;
      p.link.hidden = !allowed; if (p.card) p.card.hidden = !allowed;
      p.page.hidden = p.id !== active; p.unavailable.hidden = allowed;
      p.unavailable.textContent = tr('Dieser Bereich wird geladen oder ist für dein Konto nicht verfügbar.', 'This area is loading or is unavailable for your account.');
      p.link.textContent = tr(p.de, p.en);
      if (p.id === 'media-review-manager') {
        const count = Number(document.getElementById('media-review-count')?.textContent || 0);
        if (count > 0) { const badge = document.createElement('span'); badge.className = 'admin-nav-count'; badge.textContent = String(count); p.link.append(badge); }
        p.link.setAttribute('aria-label', tr('Freigaben', 'Approvals') + (count > 0 ? ': ' + count + tr(' offen', ' pending') : ''));
      }
      p.title.textContent = tr(p.de, p.en); p.description.textContent = tr(p.descriptionDe, p.descriptionEn); p.back.textContent = tr('← Zur Übersicht', '← Back to overview');
      if (p.card) { const strong = document.createElement('strong'), small = document.createElement('span'), arrow = document.createElement('span'); strong.textContent = tr(p.de,p.en); small.textContent = tr(p.descriptionDe,p.descriptionEn); arrow.textContent = tr('Bereich öffnen →','Open area →'); arrow.className = 'admin-home-card-action'; p.card.replaceChildren(strong,small,arrow); }
      if (p.id === active) { p.link.setAttribute('aria-current','page'); if (focus) { p.title.focus({preventScroll:true}); } }
      else p.link.removeAttribute('aria-current');
    }
  }
  const modParent = document.getElementById('mods-manager');
  const modChildren = ['mod-catalogue-manager'].map(id=>document.getElementById(id)).filter(Boolean);
  function updateMods(){if(modParent)modParent.hidden=modChildren.every(n=>n.hidden);}
  const modObserver = new MutationObserver(updateMods);
  modChildren.forEach(n=>modObserver.observe(n,{attributes:true,attributeFilter:['hidden']}));
  updateMods();
  const observer = new MutationObserver(() => render());
  pages.forEach(p => { if (p.target) observer.observe(p.target, {attributes:true, attributeFilter:['hidden']}); });
  const reviewCount = document.getElementById('media-review-count');
  if (reviewCount) new MutationObserver(() => render()).observe(reviewCount, {childList:true,characterData:true,subtree:true});
  function navigate(id){
    if(!pages.some(p=>p.id===id))return;
    selectedPage=id;
    render(false);
    // No fragment navigation: Safari and shared navigation handlers must not redirect.
    if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);
  }
  dashboard.addEventListener('click',event=>{
    const control=event.target.closest?.('[data-admin-page]');
    if(!control||!dashboard.contains(control))return;
    event.preventDefault();
    event.stopPropagation();
    navigate(control.dataset.adminPage);
  },true);
  window.addEventListener('hashchange',()=>{
    const id=location.hash.slice(1);
    if(pages.some(p=>p.id===id))navigate(id);
  });
  document.addEventListener('akame-language-change', () => render());
  render();
})();
