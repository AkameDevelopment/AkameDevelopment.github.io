import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';
const root=fileURLToPath(new URL('../../',import.meta.url));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const records=[{title:'Server beitreten',body:JSON.stringify({minecraftVersion:'26.3',serverAddress:null})},{title:'Benötigte Mods',body:JSON.stringify({mods:[]})},{title:'Serverregeln & Hilfe',body:JSON.stringify({de:'Seid nett. Kein Griefing.',en:'Be kind. No griefing.'})}];
async function setup({page='join',user=true,member=true,role=null,language='de',rows=records,error=false}={}){
 const {document,window}=parseHTML(fs.readFileSync(root+(page==='overview'?'akamesmp.html':'akamesmp/'+page+'.html'),'utf8'));Object.defineProperty(document,'baseURI',{value:'https://akamedevelopment.github.io/'});const calls=[];let authCallback,lang=language;const copied=[];
 const db={auth:{getUser:async()=>({data:{user:user?{id:'self'}:null}}),onAuthStateChange(fn){authCallback=fn;}},from(table){const call={table,filters:[]};calls.push(call);const q={select(){return q},eq(k,v){call.filters.push([k,v]);return q},maybeSingle:async()=>({data:table==='staff_access'?{role}:member?{user_id:'self'}:null}),order:async()=>({data:rows,error:error?{message:'unavailable'}:null})};return q;}};
 const ctx={createClient:()=>db,window,document,Event:window.Event,navigator:{clipboard:{writeText:async value=>copied.push(value)}},URL,localStorage:{getItem:()=>lang},location:{reload(){}},console};
 const code=fs.readFileSync(root+'akamesmp-guide.js','utf8').replace(/^import[^\n]+\n/,'');vm.runInNewContext(code,ctx);await tick();await tick();return {document,window,calls,copied,signout:()=>authCallback('SIGNED_OUT'),english(){lang='en';document.dispatchEvent(new window.Event('akame-language-change'));}};
}
test('AkameSMP guide preserves membership and manager gates',async()=>{
 for(const [user,member,role,allowed] of [[false,false,null,false],[true,false,null,false],[true,false,'developer',false],[true,true,null,true],[true,false,'admin',true],[true,false,'owner',true]]){
  const x=await setup({user,member,role});assert.equal(x.document.getElementById('guide').hidden,!allowed);assert.equal(x.calls.some(c=>c.table==='akamesmp_guide'),allowed);for(const c of x.calls.filter(c=>['staff_access','akamesmp_members'].includes(c.table)))assert.deepEqual(c.filters,[['user_id','self']]);
 }
});
test('join page shows 26.3, keeps unknown address disabled and shares a joining guide',async()=>{
 const x=await setup();assert.match(x.document.getElementById('smp-guide-body').textContent,/26.3/);const buttons=x.document.querySelectorAll('#smp-guide-body button');assert.equal(buttons[0].disabled,true);buttons[1].click();await tick();assert.equal(x.copied[0],'https://akamedevelopment.github.io/akamesmp/join.html');x.english();assert.equal(x.document.getElementById('smp-guide-title').textContent,'Join the server');assert.match(x.document.getElementById('smp-guide-body').textContent,/server address/);
});
test('confirmed address can be copied and unsafe mod download links are not rendered',async()=>{
 const rows=JSON.parse(JSON.stringify(records));rows[0].body=JSON.stringify({minecraftVersion:'26.3',serverAddress:'mc.example.test'});rows[1].body=JSON.stringify({mods:[{name:'Unsafe',url:'javascript:alert(1)'},{name:'Test mod',version:'1.0',url:'https://example.test/mod'}]});
 const join=await setup({rows});join.document.querySelector('#smp-guide-body button').click();await tick();assert.equal(join.copied[0],'mc.example.test');const mods=await setup({page:'mods',rows});assert.equal(mods.document.querySelectorAll('#smp-guide-body a[href^="javascript:"]').length,0);assert.equal(mods.document.querySelectorAll('#smp-guide-body a[href="https://example.test/mod"]').length,1);
});
test('rules/help localize, overview links to three subpages, errors and logout clear private content',async()=>{
 const rules=await setup({page:'rules'});assert.match(rules.document.getElementById('smp-guide-body').textContent,/Kein Griefing/);rules.english();assert.match(rules.document.getElementById('smp-guide-body').textContent,/No griefing/);assert.equal(rules.document.querySelectorAll('#smp-guide-body details').length,3);rules.signout();assert.equal(rules.document.getElementById('guide').hidden,true);assert.equal(rules.document.getElementById('guide').textContent,'');
 const overview=await setup({page:'overview'});assert.equal(overview.document.querySelectorAll('#guide a').length,3);
 const broken=await setup({error:true});assert.match(broken.document.getElementById('smp-guide-body').textContent,/nicht geladen/);assert.equal(broken.document.querySelectorAll('#smp-guide-body button').length,0);
 const guest=await setup({user:false});guest.english();assert.match(guest.document.getElementById('state').textContent,/Sign in with Discord/);
});

test('AkameSMP desktop dropdown and mobile sublinks localize and mark the active page',()=>{
 const {document,window}=parseHTML(fs.readFileSync(root+'akamesmp.html','utf8'));const panel=document.createElement('nav');panel.className='akame-menu-panel';panel.innerHTML='<div class="akame-links"><a data-smp-nav="1" href="akamesmp.html">AkameSMP</a></div>';document.body.append(panel);let language='de';
 const source=fs.readFileSync(root+'mobile-nav.js','utf8');const start=source.indexOf('/* AkameSMP guide navigation:');const code=source.slice(start,source.indexOf('/* Site preferences:',start));
 vm.runInNewContext(code,{document,window,location:{pathname:'/akamesmp/mods/'},localStorage:{getItem:()=>language}});
 assert.equal(document.querySelectorAll('.akame-smp-dropdown .akame-home-submenu a').length,3);assert.equal(document.querySelectorAll('.akame-smp-mobile-subnav a').length,3);assert.equal(document.querySelectorAll('.akame-smp-dropdown [aria-current=page],.akame-smp-mobile-subnav [aria-current=page]').length,2);
 language='en';document.dispatchEvent(new window.Event('akame-language-change'));assert.match(document.querySelector('.akame-smp-dropdown').textContent,/Required mods/);assert.match(document.querySelector('.akame-smp-mobile-subnav').textContent,/Server rules & help/);
});
