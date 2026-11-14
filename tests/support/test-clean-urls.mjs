import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('Pages build generates clean routes, working local links, versioned assets and legacy URL support',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'akame-pages-'));
  try{
    execFileSync('python3',[path.join(root,'scripts/build-pages.py'),'--output',temp]);
    const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
    for(const name of pages){
      const route=name==='index.html'?'/':'/'+name.replace(/\.html$/,'')+'/';
      const file=path.join(temp,route,'index.html');assert.ok(fs.existsSync(file),route);
      const source=fs.readFileSync(file,'utf8'),{document}=parseHTML(source);assert.equal(document.querySelector('base').getAttribute('href'),'/');
      for(const a of document.querySelectorAll('a[href]')){
        const raw=a.getAttribute('href');if(!raw||raw.startsWith('#'))continue;
        const url=new URL(raw,'https://akamedevelopment.github.io/');if(url.origin!=='https://akamedevelopment.github.io')continue;
        assert.ok(!url.pathname.endsWith('.html'),'internal HTML link: '+raw);
        const target=path.join(temp,decodeURIComponent(url.pathname));assert.ok(fs.existsSync(target),name+' -> '+raw);
      }
      assert.match(source,/site-routes\.js\?v=[a-f0-9]+/);
    }
    const code=fs.readFileSync(path.join(temp,'site-routes.js'),'utf8');
    for(const [pathname,expected] of [['/community.html','/community/'],['/index.html','/'],['/downloads/index.html','/downloads/'],['/share/akame.html','/share/akame/']]){
      let replaced;vm.runInNewContext(code,{location:{pathname,search:'?code=abc&mod=crosshair',hash:'#versions'},history:{state:{x:1},replaceState(state,_,url){replaced=url;assert.equal(state.x,1)}}});assert.equal(replaced,expected+'?code=abc&mod=crosshair#versions');
    }
    const feed=fs.readFileSync(path.join(temp,'akamesmp-gallery.js'),'utf8');assert.match(feed,/new URL\("\/community\/",location.href\)/);
    const mobile=fs.readFileSync(path.join(temp,'mobile-nav.js'),'utf8');assert.match(mobile,/redirectTo:"https:\/\/akamedevelopment.github.io\/index.html"/);
    const header=fs.readFileSync(path.join(temp,'header-page-indicator.js'),'utf8'),{document}=parseHTML('<header><div class="akame-site-nav"><a class="brand"></a></div></header>');vm.runInNewContext(header,{document,location:{pathname:'/community/'},localStorage:{getItem:()=> 'en'},window:{}});assert.equal(document.querySelector('.akame-current-page').textContent,'Community');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('settings back button uses history and keeps a homepage fallback, with DE/EN labels',()=>{
  const source=fs.readFileSync(path.join(root,'settings-back.js'),'utf8');
  for(const [length,language,expected] of [[2,'de','← Zurück'],[1,'en','← Back']]){
    const {document,window}=parseHTML(fs.readFileSync(path.join(root,'settings.html'),'utf8'));let back=0;
    vm.runInNewContext(source,{document,window,localStorage:{getItem:()=>language},history:{length,back(){back++;}}});
    const a=document.getElementById('settings-back');assert.equal(a.textContent,expected);const event=new window.Event('click',{cancelable:true});event.button=0;a.dispatchEvent(event);assert.equal(back,length>1?1:0);assert.equal(a.getAttribute('href'),'index.html');assert.equal(event.defaultPrevented,length>1);
  }
});

test('profile editor back uses actual history with clean URLs or missing referrer; profile link stays separate',()=>{
  const code=fs.readFileSync(path.join(root,'profile-back.js'),'utf8');
  for(const [length,referrer,language,from,expected] of [[3,'https://akamedevelopment.github.io/community/','de','','index.html'],[2,'','en','','index.html'],[1,'','de','','index.html'],[1,'','en','?from=%2Fcommunity%2F%23personal','https://akamedevelopment.github.io/community/#personal'],[1,'','de','?from=https%3A%2F%2Fexample.com','index.html']]){
    const {document,window}=parseHTML(fs.readFileSync(path.join(root,'profile.html'),'utf8'));Object.defineProperty(document,'baseURI',{value:'https://akamedevelopment.github.io/profile/'});Object.defineProperty(document,'referrer',{value:referrer});let back=0;
    vm.runInNewContext(code,{document,window,URL,URLSearchParams,location:{origin:'https://akamedevelopment.github.io',search:from},localStorage:{getItem:()=>language},history:{length,back(){back++;}}});
    const button=document.getElementById('profile-public-link');button.dataset.publicProfileUrl='/user/?id=self';assert.equal(button.getAttribute('href'),expected);
    const click=new window.Event('click',{cancelable:true});click.button=0;button.dispatchEvent(click);assert.equal(back,length>1?1:0);assert.equal(click.defaultPrevented,length>1);assert.equal(document.getElementById('profile-public-back-label').textContent,language==='en'?'Back':'Zurück');
  }
});
