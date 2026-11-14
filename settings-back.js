(() => {
  const button = document.getElementById('settings-back');
  if (!button) return;
  const translate = () => { button.textContent = (window.AkameLanguage?.get?.() || localStorage.getItem('akame-lang')) === 'en' ? '← Back' : '← Zurück'; };
  button.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (history.length > 1) { event.preventDefault(); history.back(); }
  });
  document.addEventListener('akame-language-change', translate);
  translate();
})();
