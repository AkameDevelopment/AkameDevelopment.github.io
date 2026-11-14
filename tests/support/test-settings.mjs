import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';
const root=fileURLToPath(new URL('../../',import.meta.url));
function setup(){
 const {document,window}=parseHTML(fs.readFileSync(root+'settings.html','utf8'));const data=new Map([['akame-site-compact','true'],['akame-site-theme','light'],['akame-site-motion','true'],['akame-lang','de'],['session','keep']]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};window.localStorage=storage;window.matchMedia=()=>({matches:false,addEventListener(){}});window.AkameLanguage={get:()=>data.get('akame-lang'),set(lang){data.set('akame-lang',lang);document.dispatchEvent(new window.Event('akame-language-change'));}};
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??''},set(value){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.getAttribute('value')===String(value));},configurable:true});
 let focused=null;Object.defineProperty(document,'activeElement',{get:()=>focused});for(const b of document.querySelectorAll('[data-tab]'))b.focus=()=>{focused=b;};
 document.documentElement.classList.add('akame-compact');
 const location={hash:''},history={replaceState(_,__,hash){location.hash=hash;}};
 const ctx={document,window,localStorage:storage,location,history,navigator:{language:'de'},Event:window.Event,CustomEvent:window.CustomEvent,requestAnimationFrame:fn=>fn(),setTimeout:()=>1,clearTimeout(){},console,alert(){throw Error('unexpected alert');}};
 vm.runInNewContext(fs.readFileSync(root+'website-settings.js','utf8'),ctx);return {document,window,data,ctx,location};
}
test('compact layout is removed, saved preference cleared and other preferences preserved',()=>{
 const x=setup();assert.equal(x.document.getElementById('setting-compact'),null);assert.equal(x.data.has('akame-site-compact'),false);assert.equal(x.document.documentElement.classList.contains('akame-compact'),false);assert.equal(x.data.get('akame-site-theme'),'light');assert.equal(x.data.get('akame-site-motion'),'true');assert.equal(x.document.getElementById('setting-motion').checked,true);assert.equal(x.document.documentElement.dataset.akameTheme,'light');assert.equal(x.data.get('session'),'keep');
});
test('settings categories switch once, expose one panel and support keyboard navigation',()=>{
 const x=setup();for(const button of x.document.querySelectorAll('[data-tab]')){button.click();assert.equal(x.document.querySelectorAll('.section:not([hidden])').length,1);assert.equal(x.document.querySelector('.section:not([hidden])').id,button.dataset.tab);assert.equal(button.getAttribute('aria-selected'),'true');assert.equal(x.location.hash,'#'+button.dataset.tab);}
 const first=x.document.querySelector('[data-tab=appearance]');first.click();first.focus();const key=new x.window.Event('keydown',{cancelable:true});key.key='ArrowDown';x.document.querySelector('.tabs').dispatchEvent(key);assert.equal(x.document.activeElement.dataset.tab,'site-language');assert.equal(x.document.getElementById('site-language').hidden,false);
});
test('theme, notifications, language and reset continue to work',()=>{
 const x=setup(),theme=x.document.getElementById('setting-theme');theme.value='dark';theme.dispatchEvent(new x.window.Event('change'));assert.equal(x.data.get('akame-site-theme'),'dark');const notification=x.document.getElementById('setting-notify-community');notification.checked=false;notification.dispatchEvent(new x.window.Event('change'));assert.equal(x.data.get('akame-notify-community'),'false');
 const language=x.document.getElementById('setting-language');language.value='en';language.dispatchEvent(new x.window.Event('change'));assert.equal(x.document.querySelector('[data-i18n=title]').textContent,'Settings');assert.equal(x.document.querySelector('[data-tab=appearance]').textContent,'Appearance');
 x.data.set('akame-site-compact','true');vm.runInNewContext(fs.readFileSync(root+'settings-reset.js','utf8'),x.ctx);x.document.getElementById('reset-settings').click();assert.equal(x.data.has('akame-site-compact'),false);assert.equal(x.data.get('akame-site-theme'),'dark');assert.equal(x.data.get('akame-notify-community'),'true');assert.equal(x.data.get('session'),'keep');
});
test('site-wide preferences discard old compact state and do not inject condensed spacing',()=>{
 const x=setup();x.data.set('akame-site-compact','true');x.document.documentElement.classList.add('akame-compact');const code=fs.readFileSync(root+'mobile-nav.js','utf8');const start=code.indexOf('/* Site preferences:');vm.runInNewContext(code.slice(start,code.indexOf('/* Reduce motion:',start)),x.ctx);assert.equal(x.data.has('akame-site-compact'),false);assert.equal(x.document.documentElement.classList.contains('akame-compact'),false);assert.ok(!x.document.getElementById('akame-global-preferences').textContent.includes('padding:clamp'));
});
