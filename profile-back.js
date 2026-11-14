(() => {
  'use strict';
  const link = document.getElementById('profile-public-link');
  if (!link) return;
  // This is navigation, not the public profile URL used by "Copy link".
  link.href = 'index.html';
  const from = new URLSearchParams(location.search).get('from');
  if (from) {
    try {
      const candidate = new URL(from, document.baseURI);
      const page = candidate.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/, '');
      if (candidate.origin === location.origin && page !== 'profile') link.href = candidate.href;
    } catch { /* Keep the homepage fallback. */ }
  }
  link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (history.length > 1) { event.preventDefault(); history.back(); }
  });
  const translate = () => {
    const english = (window.AkameLanguage?.get?.() || localStorage.getItem('akame-lang')) === 'en';
    const label = document.getElementById('profile-public-back-label');
    if (label) label.textContent = english ? 'Back' : 'Zurück';
    link.setAttribute('aria-label', english ? 'Back to previous page' : 'Zurück zur vorherigen Seite');
  };
  document.addEventListener('akame-language-change', translate);
  translate();
})();
