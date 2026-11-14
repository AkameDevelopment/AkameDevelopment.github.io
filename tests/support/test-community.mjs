import {parseHTML} from 'linkedom';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
const base=fileURLToPath(new URL('../../',import.meta.url));const tick=()=>new Promise(r=>setTimeout(r,0));
const user={id:'self',user_metadata:{name:'Akame'}};
const fixtures={akamesmp_posts:[{id:'p1',author_id:'self',body:'My post <script>bad()</script>',created_at:'2026-11-14'},{id:'foreign',author_id:'other',body:'PRIVATE FOREIGN',created_at:'2026-11-14'}],community_requests:[{id:'t1',author_id:'self',ticket_number:'AK-000001',title:'My ticket',status:'reviewing',created_at:'2026-11-14'},{id:'other',author_id:'other',title:'PRIVATE TICKET'}],profile_mods:[{user_id:'self',mod_slug:'crosshair'},{user_id:'self',mod_slug:'chest'},{user_id:'self',mod_slug:'hidden'},{user_id:'self',mod_slug:'unknown'}],beta_access:[{user_id:'self',project_slug:'chest'}],mod_visibility:[{project_slug:'crosshair',visible:true,visibility:'public'},{project_slug:'chest',visible:true,visibility:'beta'},{project_slug:'hidden',visible:false,visibility:'hidden'}],profile_badge_definitions:[{id:'b1',name:'Community'}],profile_badge_grants:[]};
const releases=[{modId:'crosshair',mod:'Crosshair+',version:'1',url:'https://github.com/example/release'},{modId:'chest',version:'2-beta',channel:'beta',url:'https://github.com/example/beta'},{modId:'hidden',version:'3',url:'https://github.com/example/hidden'},{modId:'unknown',version:'4',url:'https://github.com/example/unknown'}];
async function setup({signedIn=true,hash='#personal',lang='de',role=null,fail=[],rows={},releaseRows=releases}={}){
 const {window}=parseHTML(fs.readFileSync(base+'community.html','utf8'));const document=window.document,calls=[];const location={hash,search:'',replace(value){this.replaced=value}};
 const storage={getItem:()=>lang,setItem(){}};
 const data={...fixtures,...rows};
 const db={from(table){const c={table,filters:[],method:'select'};calls.push(c);let start=0,end=Infinity,count=false;const q={select(fields,opts){c.fields=fields;count=opts?.count==='exact';return q},eq(k,v){c.filters.push([k,v]);return q},order(){return q},range(a,b){start=a;end=b;return q},delete(){c.method='delete';return q},update(value){c.method='update';return q},then(resolve,reject){if(fail.includes(table))return Promise.resolve({error:{message:'denied'}}).then(resolve,reject);let records=(data[table]||[]).filter(row=>c.filters.every(([k,v])=>row[k]===v));return Promise.resolve({data:records.slice(start,end+1),count:count?records.length:null}).then(resolve,reject)}};return q},rpc(name,params){calls.push({rpc:name,params});return Promise.resolve({data:{display_name:'Akame',role,avatar_url:null}})}};
 const context={getPublicProfile:id=>db.rpc('get_public_profile',{p_user_id:id}),db,userReady:Promise.resolve(signedIn?user:null),document,window,location,history:{pushState(_,__,hash){location.hash=hash}},localStorage:storage,URL,URLSearchParams,CustomEvent:window.CustomEvent,console,fetch:async()=>({ok:true,json:async()=>({releases:releaseRows})}),prompt:()=>null,confirm:()=>false};
 vm.runInNewContext(fs.readFileSync(base+'community-rework.js','utf8'),context);
 const code=fs.readFileSync(base+'community-personal.js','utf8').replace(/^import[^\n]+\n/,'');await vm.runInNewContext('(async()=>{'+code+'})()',context);await tick();await tick();
 return {document,window,context,calls,location,storage};
}
test('community views, personal data and permission boundaries', async()=>{
 let x=await setup({signedIn:false});assert.equal(x.document.getElementById('dashboard').hidden,true);assert.equal(x.document.getElementById('auth-required').hidden,false);assert.equal(x.calls.length,0);
 x=await setup({hash:'#community-social-feed'});assert.equal(x.document.querySelector('.community-sidebar').hidden,true);assert.equal(x.document.querySelector('.community-feed-column').hidden,false);assert.equal(x.calls.length,0,'personal data loads lazily');
 x.document.querySelector('[data-community-view=members]').click();assert.equal(x.location.hash,'#members');assert.equal(x.document.querySelector('.community-sidebar').hidden,false);assert.equal(x.document.querySelector('.community-feed-column').hidden,true);
 x.document.querySelector('[data-community-view=personal]').click();await tick();await tick();assert.equal(x.document.getElementById('dashboard-area').hidden,false);assert.equal(x.document.getElementById('personal-post-count').textContent,'1');assert.equal(x.document.getElementById('personal-ticket-count').textContent,'1');
 assert.equal(x.document.querySelectorAll('#my-mods-feed article').length,2);assert.ok(!x.document.getElementById('dashboard').textContent.includes('PRIVATE'));assert.ok(!x.document.getElementById('my-mods-feed').textContent.includes('hidden'));
 assert.equal(x.document.querySelectorAll('#personal-posts-list script').length,0);assert.match(x.document.getElementById('personal-tickets-list').textContent,/In Bearbeitung/);
 assert.equal(x.document.querySelectorAll('#personal-posts-list button').length,1,'members can delete, not edit');
 for(const c of x.calls.filter(c=>['akamesmp_posts','community_requests'].includes(c.table)))assert.ok(c.filters.some(([k,v])=>k==='author_id'&&v==='self'));
 const queries=x.calls.length;x.document.querySelector('[data-community-view=feed]').click();x.document.querySelector('[data-community-view=personal]').click();await tick();assert.equal(x.calls.length,queries,'tab switching reuses loaded personal data');
 x.location.hash='#personal-tickets';x.window.dispatchEvent(new x.window.Event('hashchange'));assert.equal(x.document.getElementById('dashboard-area').hidden,false);
 x.document.dispatchEvent(new x.window.CustomEvent('akame-community-signout'));assert.equal(x.document.getElementById('dashboard').hidden,true);assert.equal(x.document.getElementById('my-mods-feed').textContent,'');
 x=await setup({lang:'en',role:'admin'});assert.match(x.document.getElementById('personal-tickets-list').textContent,/In progress/);assert.equal(x.document.querySelectorAll('#personal-posts-list button').length,2);assert.match(x.document.getElementById('personal-badges').textContent,/Admin/);
 x=await setup({fail:['mod_visibility','community_requests']});assert.equal(x.document.querySelectorAll('#my-mods-feed a').length,0);assert.equal(x.document.getElementById('personal-ticket-count').textContent,'—');assert.match(x.document.getElementById('personal-tickets-list').textContent,/nicht geladen/);
 x=await setup({rows:{beta_access:[]}});assert.equal(x.document.querySelectorAll('#my-mods-feed article').length,1,'beta projects excluded without grants');assert.match(x.document.getElementById('my-beta-feed').textContent,/keine Beta/);
 x=await setup({rows:{akamesmp_posts:Array.from({length:15},(_,i)=>({id:'p'+i,author_id:'self',body:'Post '+i,created_at:'2026-11-14'}))}});assert.equal(x.document.getElementById('personal-post-count').textContent,'15');assert.equal(x.document.querySelectorAll('.personal-post').length,12);x.document.getElementById('personal-posts-more').click();await tick();assert.equal(x.document.querySelectorAll('.personal-post').length,15);assert.equal(x.document.getElementById('personal-posts-more').hidden,true);
 const ids=[...x.document.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);assert.equal(x.document.querySelectorAll('#news-feed,#release-feed,#update-feed,.dash-shortcuts').length,0);
 console.log('PASS: three views + hashes/history, signed-out state, lazy queries/cache, own-row filters, counts, post permissions, safe rendering, downloads/beta permissions, failure states, English, sign-out clearing, pagination, unique IDs and removed redundant UI');
});

test('member directory keeps public RPC, all role filters, sorting, layouts and pagination',async()=>{
  const x=await setup({signedIn:false,hash:'#members'});
  const rows=Array.from({length:20},(_,i)=>({user_id:'m'+i,display_name:'Member '+String(i).padStart(2,'0')}));
  const roles=['owner','admin','developer','staff',null];let rpcCalls=0;
  x.context.db.rpc=async name=>{assert.equal(name,'list_visible_members');rpcCalls++;return {data:rows};};
  x.context.getPublicProfile=async id=>({data:{role:roles[Number(id.slice(1))%5],smp_member:Number(id.slice(1))%2===0}});
  x.window.AkameLanguage={get:()=> 'en'};
  for(const [id,value] of [['member-rank-filter','all'],['member-sort','name']])Object.defineProperty(x.document.getElementById(id),'value',{value,writable:true,configurable:true});
  const code=fs.readFileSync(base+'members.js','utf8').replace(/^import[^\n]+\n/,'');await vm.runInNewContext('(async()=>{'+code+'})()',x.context);
  const list=x.document.getElementById('member-list'),rank=x.document.getElementById('member-rank-filter'),sort=x.document.getElementById('member-sort');
  assert.equal(list.children.length,12);assert.equal(x.document.getElementById('member-count').textContent,'20');
  x.document.getElementById('member-next').click();assert.equal(list.children.length,8);assert.equal(x.document.getElementById('member-next').disabled,true);
  for(const [role,expected] of [['team',16],['owner',4],['admin',4],['developer',4],['staff',4],['akamesmp',10],['member',4],['all',20]]){
    rank.value=role;rank.dispatchEvent(new x.window.Event('change'));assert.equal(list.children.length,Math.min(12,expected));assert.match(x.document.getElementById('member-results').textContent,new RegExp('of '+expected+' profiles'));
  }
  sort.value='name-desc';sort.dispatchEvent(new x.window.Event('change'));assert.equal(list.querySelector('.member-name').textContent,'Member 19');
  sort.value='role';sort.dispatchEvent(new x.window.Event('change'));assert.equal(list.querySelector('.member-role').getAttribute('data-role'),'owner');
  x.document.querySelector('[data-member-layout=list]').click();assert.equal(list.dataset.layout,'list');x.document.querySelector('[data-member-layout=cards]').click();assert.equal(list.dataset.layout,'cards');
  const search=x.document.getElementById('member-search');search.value='Member 01';search.dispatchEvent(new x.window.Event('input'));assert.equal(list.children.length,1);assert.equal(list.querySelector('a').getAttribute('href'),'user.html?id=m1');
  search.value='does not exist';search.dispatchEvent(new x.window.Event('input'));assert.match(list.textContent,/No matching members/);assert.equal(rpcCalls,1);
});

test('shared community session deduplicates profile reads and clears cache on sign-out',async()=>{
  const {window}=parseHTML('<html><body></body></html>');let authReads=0,profileReads=0,onAuth;
  const db={auth:{getUser:async()=>{authReads++;return {data:{user}}},onAuthStateChange:fn=>{onAuth=fn}},rpc:async()=>{profileReads++;return {data:{display_name:'Public name'}}}};
  const code=fs.readFileSync(base+'community-session.js','utf8').replace(/^import[^\n]+\n/,'').replaceAll('export ','');
  const module=await vm.runInNewContext('(async()=>{'+code+';return {getPublicProfile,userReady};})()',{createClient:()=>db,document:window.document,CustomEvent:window.CustomEvent});
  await Promise.all([module.getPublicProfile('self'),module.getPublicProfile('self'),module.userReady]);assert.equal(profileReads,1);assert.equal(authReads,1);
  onAuth('SIGNED_OUT');await module.getPublicProfile('self');assert.equal(profileReads,2);
});
