(() => {
  'use strict';
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;
  const toolbar = dashboard.querySelector('.admin-dashboard-toolbar');
  const content = document.createElement('div'); content.className = 'admin-workspace-content';
  const children = [...dashboard.children].filter(n => n !== toolbar);
  dashboard.append(content); children.forEach(n => content.append(n));
  const stats = content.querySelector(':scope > .grid');
  const review = document.getElementById('media-review-manager');
  if (review) { if (stats) stats.after(review); else content.prepend(review); }
  for (const id of ['news-manager', 'mod-visibility-manager', 'requests-manager']) {
    const panel = document.getElementById(id); if (panel) content.append(panel);
  }
  document.querySelectorAll('main.shell > .admin-section-heading').forEach(n => n.remove());
  const links = [...toolbar.querySelectorAll('.admin-quicknav a')];
  function markActive() {
    const hash = location.hash || '#admin-controls';
    links.forEach(a => { if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  }
  links.forEach(a => a.addEventListener('click', event => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target || target.hidden) { event.preventDefault(); return; }
    target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true});
  }));
  function updateLinks() {
    links.forEach(a => { const target = document.getElementById(a.getAttribute('href').slice(1)); a.hidden = !target || target.hidden; });
    markActive();
  }
  const observer = new MutationObserver(updateLinks);
  links.forEach(a => { const panel = document.getElementById(a.getAttribute('href').slice(1)); if (panel) observer.observe(panel, {attributes:true, attributeFilter:['hidden']}); });
  window.addEventListener('hashchange', markActive); updateLinks();
})();
