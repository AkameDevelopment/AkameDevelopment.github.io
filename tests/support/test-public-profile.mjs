import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const helper=fs.readFileSync(new URL('../../public-profile-data.js',import.meta.url),'utf8').replace('export function','function');
const html=fs.readFileSync(new URL('../../user.html',import.meta.url),'utf8');
const id='12345678-1234-1234-1234-123456789abc';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({storage=new Map(),blocked=false,fail=null,now=1000000,blockOnly=null,rows={},user=null}={}) {
 const calls=[];let release;const gate=blocked?new Promise(resolve=>{release=resolve}):Promise.resolve();
 const wait=name=>blocked&&(!blockOnly||blockOnly.includes(name))?gate:Promise.resolve();
 const db={auth:{getUser:async()=>{calls.push('auth');await wait('auth');return {data:{user}}}},
  rpc:async name=>{calls.push(name);if(name!=='get_public_profile')await wait(name);return {data:rows[name]??(name==='get_public_profile'?[{display_name:'Fixture member',bio:'Public biography'}]:null)}} ,
  from(table){const q={select(){return q},eq(){return q},is(){return q},order(){return q},limit(){return q},maybeSingle(){return q},in(){return q},then(resolve,reject){calls.push(table);return wait(table).then(()=>{if(fail===table)throw Error('network failure');return {data:rows[table]??(table==='profile_appearance'?null:table==='profile_badge_definitions'?[{id:'community',name:'Community'}]:[])}}).then(resolve,reject)}};return q}};
 const {window}=parseHTML(html);
 const context=vm.createContext({db,createClient:()=>db,console,document:window.document,window,URL,URLSearchParams,Date:class extends Date {static now(){return now}},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},localStorage:{getItem:()=>null},location:{search:'?id='+id},history:{replaceState(){}},navigator:{},setTimeout,clearTimeout,matchMedia:()=>({matches:false})});
 vm.runInContext(helper,context);
 return {context,calls,release,storage,document:window.document,start:()=>vm.runInContext(`startPublicProfileReads(db,'${id}')`,context)};
}
test('public header renders while optional profile data and viewer auth are pending',async()=>{
 const x=fixture({blocked:true});
 const module=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import[^\n]+\n/gm,'');
 const done=vm.runInContext('(async()=>{'+module+'})()',x.context);
 await tick();
 assert.equal(x.document.querySelector('#content h1')?.textContent,'Fixture member');
 assert.equal(x.document.querySelector('.profile-hero-bio')?.textContent,'Public biography');
 for(const name of ['profile_appearance','get_profile_discord_name','akamesmp_posts','get_public_favorite_spotify_tracks','profile_badge_definitions'])assert.ok(x.calls.includes(name),name+' already started');
 x.release();await done;
 assert.ok(x.document.querySelector('.profile-layout'));
 assert.equal(x.calls.filter(name=>name==='auth').length,1);
 assert.equal(x.calls.filter(name=>name==='staff_access').length,0);
});
test('only badge catalogue is reused; identity, privacy fields and grants stay fresh',async()=>{
 const storage=new Map();const a=fixture({storage});await Promise.all(Object.values(a.start()));
 const b=fixture({storage});await Promise.all(Object.values(b.start()));
 assert.ok(!b.calls.includes('profile_badge_definitions'));
 for(const name of ['get_public_profile','profile_badge_grants','profile_appearance','get_profile_discord_name','get_public_favorite_spotify_tracks','auth'])assert.ok(b.calls.includes(name));
 const c=fixture({storage,now:1300001});await Promise.all(Object.values(c.start()));assert.ok(c.calls.includes('profile_badge_definitions'));
});
test('optional network failures are results and cannot become unhandled rejections',async()=>{
 const x=fixture({fail:'profile_appearance'});const reads=x.start();await tick();
 assert.match((await reads.appearance).error.message,/network failure/);
 assert.equal((await reads.profile).data[0].display_name,'Fixture member');
 await Promise.all(Object.values(reads));
});
test('unavailable storage does not prevent reads',async()=>{
 const x=fixture();vm.runInContext('sessionStorage={getItem(){throw Error("blocked")},setItem(){throw Error("blocked")}}',x.context);
 const reads=x.start();assert.equal((await reads.badgeDefinitions).data[0].name,'Community');await Promise.all(Object.values(reads));
});
test('failed comments do not hide a valid public profile or claim it has no comments',async()=>{
 const x=fixture({fail:'mod_comments'});
 const module=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import[^\n]+\n/gm,'');
 await vm.runInContext('(async()=>{'+module+'})()',x.context);
 assert.equal(x.document.querySelector('#content h1')?.textContent,'Fixture member');
 assert.match(x.document.querySelector('#profile-comments-panel').textContent,/Kommentare konnten nicht geladen werden/);
});
function runPage(x){
 const module=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import[^\n]+\n/gm,'');
 return vm.runInContext('(async()=>{'+module+'})()',x.context);
}
const song='https://open.spotify.com/track/0123456789abcdefghijkl';
const post={id:'post-1',body:'Visible post body',created_at:'2026-11-16T12:00:00Z'};
test('Spotify, bio, posts and showcase render before slow badges, Discord and auth',async()=>{
 const x=fixture({blocked:true,blockOnly:['auth','profile_badge_definitions','get_profile_discord_name'],rows:{get_public_favorite_spotify_tracks:[song],akamesmp_posts:[post],profile_gallery:[{slot:1,image_url:'https://example.com/image.png'}]}});
 const done=runPage(x);await tick();
 assert.equal(x.document.querySelector('.profile-hero-bio')?.textContent,'Public biography');
 assert.equal(x.document.querySelector('.profile-spotify-tracks iframe')?.getAttribute('src'),'https://open.spotify.com/embed/track/0123456789abcdefghijkl?utm_source=generator');
 assert.equal(x.document.querySelector('.profile-spotify-tracks iframe').loading,'eager');
 assert.equal(x.document.querySelector('.profile-community-body')?.textContent,post.body);
 assert.ok(x.document.querySelector('.gallery-public img'));
 assert.ok(x.document.querySelector('.profile-share-icon'));
 assert.ok(!x.document.querySelector('.profile-post-like'),'controls wait for verified viewer');
 x.release();await done;assert.ok(x.document.querySelector('.profile-post-like'));
});
test('slow Spotify does not block comments, posts, showcase or mod section',async()=>{
 const x=fixture({blocked:true,blockOnly:['get_public_favorite_spotify_tracks'],rows:{get_public_favorite_spotify_tracks:[song],akamesmp_posts:[post]}});
 const done=runPage(x);await tick();
 assert.equal(x.document.querySelector('.profile-community-body')?.textContent,post.body);
 assert.ok(x.document.querySelector('.profile-post-like'));
 assert.match(x.document.querySelector('#profile-comments-panel').textContent,/keine Kommentare/);
 assert.match(x.document.querySelector('.profile-side').textContent,/Meine Mods/);
 assert.ok(!x.document.querySelector('.profile-spotify-tracks'));
 x.release();await done;assert.ok(x.document.querySelector('.profile-spotify-tracks'));
});
test('verified owner and moderation controls hydrate once after public content',async()=>{
 const x=fixture({blocked:true,blockOnly:['auth'],user:{id},rows:{staff_access:{role:'admin'},akamesmp_posts:[post]}});
 const done=runPage(x);await tick();
 assert.ok(x.document.querySelector('.profile-community-body'));
 assert.ok(!x.document.querySelector('.own-profile-edit'));
 x.release();await done;
 assert.equal(x.document.querySelectorAll('.own-profile-edit').length,1);
 assert.ok(x.document.querySelector('.profile-post-comment-form'));
 assert.equal(x.calls.filter(name=>name==='auth').length,1);
 assert.equal(x.calls.filter(name=>name==='staff_access').length,1);
});
