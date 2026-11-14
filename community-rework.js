(()=>{"use strict";
const main=document.querySelector('main'),layout=document.querySelector('.community-main-layout');if(!main||!layout)return;
let view='feed';
const language=()=>window.AkameLanguage?.get?.()||localStorage.getItem('akame-lang')||'de';
function translate(){const english=language()==='en';document.querySelectorAll('[data-community-de][data-community-en]').forEach(el=>{const value=el.getAttribute(english?'data-community-en':'data-community-de');if(el.textContent!==value)el.textContent=value;});}
function activate(next,updateHash=false){
 if(!['feed','members','personal'].includes(next))return;view=next;layout.setAttribute('data-view',view);layout.hidden=view==='personal';
 layout.querySelector('.community-feed-column').hidden=view!=='feed';layout.querySelector('.community-sidebar').hidden=view==='personal';
 document.querySelectorAll('[data-community-personal]').forEach(el=>el.hidden=view!=='personal');
 document.querySelectorAll('[data-community-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.getAttribute('data-community-view')===view)));
 if(updateHash)history.replaceState(null,'',view==='feed'?'#community-social-feed':view==='members'?'#members':'#personal');
 document.dispatchEvent(new CustomEvent('akame-community-view',{detail:{view}}));
}
function fromHash(){const hash=location.hash;activate(hash==='#members'?'members':['#personal','#community-requests','#my-requests'].includes(hash)?'personal':'feed');}
for(const button of document.querySelectorAll('[data-community-view]'))button.addEventListener('click',()=>activate(button.getAttribute('data-community-view'),true));
window.addEventListener('hashchange',fromHash);document.addEventListener('akame-language-change',translate);translate();fromHash();
})();
