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
    ['overview', 'Übersicht', 'Overview', null, 'Alle Bereiche deines Admin-Panels auf einen Blick.', 'All areas of your admin panel at a glance.'],
    ['admin-controls', 'Benutzerverwaltung', 'Users', 'admin-controls', 'Benutzer suchen und Profile, Rollen sowie Beta-Zugänge verwalten.', 'Search users and manage profiles, roles and beta access.'],
    ['media-review-manager', 'Freigaben', 'Approvals', 'media-review-manager', 'Eingereichte Bilder und Beiträge prüfen.', 'Review submitted images and posts.'],
    ['news-manager', 'News & Updates', 'News & Updates', 'news-manager', 'Meldungen und Releases erstellen und bearbeiten.', 'Create and edit announcements and releases.'],
    ['mod-visibility-manager', 'Mods', 'Mods', 'mod-visibility-manager', 'Sichtbarkeit und Zugang deiner Projekte verwalten.', 'Manage visibility and access for your projects.'],
    ['requests-manager', 'Support', 'Support', 'requests-manager', 'Anfragen finden, beantworten und bearbeiten.', 'Find, reply to and manage tickets.'],
    ['admin-community-panel', 'Community', 'Community', 'admin-community-panel', 'Diskussionen und Community-Inhalte moderieren.', 'Moderate discussions and community content.'],
    ['owner-build-controls', 'Website', 'Website', 'owner-build-controls', 'Darstellung der Website-Version einstellen.', 'Configure website version visibility.']
  ];
  const pages = [], homeGrid = document.createElement('div'); homeGrid.className = 'admin-home-grid';
  nav.replaceChildren();
  for (const [id, de, en, targetId, descriptionDe, descriptionEn] of definitions) {
    const target = targetId ? document.getElementById(targetId) : null;
    if (targetId && !target) continue;
    const page = document.createElement('section'); page.className = 'admin-subpage'; page.id = 'admin-page-' + id; page.hidden = true;
    const head = document.createElement('div'); head.className = 'admin-page-heading';
    const back = document.createElement('a'); back.href = '#overview'; back.className = 'admin-page-back';
    const title = document.createElement('h2'); title.tabIndex = -1; const description = document.createElement('p');
    if (id !== 'overview') head.append(back); head.append(title, description); page.append(head);
    const link = document.createElement('a'); link.href = '#' + id; nav.append(link);
    const unavailable = document.createElement('p'); unavailable.className = 'state'; unavailable.hidden = true; page.append(unavailable);
    if (target) page.append(target);
    else { const stats = content.querySelector(':scope > .grid'); if (stats) page.append(stats); page.append(homeGrid); }
    content.append(page);
    let card;
    if (target) { card = document.createElement('a'); card.href = '#' + id; card.className = 'admin-home-card'; homeGrid.append(card); }
    pages.push({id, page, target, link, title, description, back, unavailable, card, de, en, descriptionDe, descriptionEn});
  }
  // Keep the hidden account data available to the existing account scripts.
  content.querySelectorAll(':scope > .layout').forEach(n => { n.hidden = true; });
  function activeId() { const id = location.hash.slice(1); return pages.some(p => p.id === id) ? id : new URLSearchParams(location.search).has('member') ? 'admin-controls' : 'overview'; }
  function render(focus = false) {
    const active = activeId();
    for (const p of pages) {
      const allowed = !p.target || !p.target.hidden;
      p.link.hidden = !allowed; if (p.card) p.card.hidden = !allowed;
      p.page.hidden = p.id !== active; p.unavailable.hidden = allowed;
      p.unavailable.textContent = tr('Dieser Bereich wird geladen oder ist für dein Konto nicht verfügbar.', 'This area is loading or is unavailable for your account.');
      p.link.textContent = tr(p.de, p.en); p.title.textContent = tr(p.de, p.en); p.description.textContent = tr(p.descriptionDe, p.descriptionEn); p.back.textContent = tr('← Zur Übersicht', '← Back to overview');
      if (p.card) { const strong = document.createElement('strong'), small = document.createElement('span'), arrow = document.createElement('span'); strong.textContent = tr(p.de,p.en); small.textContent = tr(p.descriptionDe,p.descriptionEn); arrow.textContent = tr('Bereich öffnen →','Open area →'); arrow.className = 'admin-home-card-action'; p.card.replaceChildren(strong,small,arrow); }
      if (p.id === active) { p.link.setAttribute('aria-current','page'); if (focus) { p.title.focus({preventScroll:true}); content.scrollIntoView?.({block:'start',behavior:'auto'}); } }
      else p.link.removeAttribute('aria-current');
    }
  }
  const observer = new MutationObserver(() => render());
  pages.forEach(p => { if (p.target) observer.observe(p.target, {attributes:true, attributeFilter:['hidden']}); });
  window.addEventListener('hashchange', () => render(true));
  document.addEventListener('akame-language-change', () => render());
  render();
})();
