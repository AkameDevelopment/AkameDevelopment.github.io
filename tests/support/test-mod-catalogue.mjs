import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const moduleCode=fs.readFileSync(new URL('../../mod-catalogue.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('export ','');
function setup({signedIn=true,signError=false,insertError=false}={}){
 const {window}=parseHTML('<html><body><a id="download">Download</a></body></html>');const writes=[],opened=[],errors=[];
 const db={auth:{getSession:async()=>({data:{session:signedIn?{access_token:'fixture'}:null}})},from(){return {insert:async row=>{writes.push(row);return {error:insertError?Error('offline'):null}}}},storage:{from(){return {createSignedUrl:async()=>({data:signError?null:{signedUrl:'https://fixture.test/file'},error:signError?Error('denied'):null}),getPublicUrl:path=>({data:{publicUrl:'https://fixture.test/'+path}})}}}};
 const context=vm.createContext({window:{open(){const popup={opener:{},location:{replace(url){opened.push(url)}},close(){opened.push('closed')}};return popup},location:{assign(url){opened.push(url)}}},createClient:()=>db,console:{warn:()=>{}},Date,Error,URL,Promise,Map,Set});
 vm.runInContext(moduleCode+';globalThis.api={validateFile,assetUrl,recordDownload,attachDownload};',context);
 return {api:context.api,writes,opened,errors,anchor:window.document.getElementById('download'),window};
}
const release={id:'release',modId:'example',mod:'Example',version:'1.0',catalogue:true,storage_path:'example/fixture.jar',file_name:'example.jar'};
test('upload validation rejects oversized files, unsafe extensions and non-images',()=>{
 const {api}=setup();assert.equal(api.validateFile({name:'Mod.JAR',size:10,type:''}),'jar');
 assert.throws(()=>api.validateFile({name:'big.zip',size:50*1024*1024+1}),/50 MB/);
 assert.throws(()=>api.validateFile({name:'x.html',size:1}),/Dateiformat/);
 assert.throws(()=>api.validateFile({name:'x.svg',size:1,type:'image/svg+xml'},true),/Dateiformat/);
 assert.throws(()=>api.validateFile({name:'x.png',size:1,type:'text/html'},true),/PNG/);
 assert.equal(api.assetUrl('../../outside.png'),'');assert.equal(api.assetUrl('https://evil.test/x.png'),'');
});
test('download events use authenticated server defaults for identity and timestamp',async()=>{
 const x=setup();await x.api.recordDownload(release);assert.equal(x.writes.length,1);assert.equal(x.writes[0].release_id,'release');assert.equal(x.writes[0].mod_slug,'example');assert.ok(!('user_id'in x.writes[0]));assert.ok(!('created_at'in x.writes[0]));
 const anonymous=setup({signedIn:false});await anonymous.api.recordDownload(release);assert.equal(anonymous.writes.length,0);
});
test('signed download opens the file and records one start; repeat clicks are coalesced',async()=>{
 const x=setup();x.api.attachDownload(x.anchor,release);const event=new x.window.Event('click',{cancelable:true});x.anchor.dispatchEvent(event);await new Promise(r=>setImmediate(r));assert.equal(event.defaultPrevented,true);assert.deepEqual(x.opened,['https://fixture.test/file']);assert.equal(x.writes.length,1);x.anchor.dispatchEvent(new x.window.Event('click',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(x.writes.length,1);
});
test('failed signed URLs never record a download; tracking failures do not block download',async()=>{
 const x=setup({signError:true});x.api.attachDownload(x.anchor,release,{onError:error=>x.errors.push(error)});x.anchor.dispatchEvent(new x.window.Event('click',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(x.writes.length,0);assert.equal(x.errors.length,1);assert.deepEqual(x.opened,['closed']);
 const y=setup({insertError:true});y.api.attachDownload(y.anchor,release);y.anchor.dispatchEvent(new y.window.Event('click',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.deepEqual(y.opened,['https://fixture.test/file']);
});

test('locked beta downloads do not request a signed URL or record an event',async()=>{
 const x=setup();x.api.attachDownload(x.anchor,{...release,canDownload:false,signedIn:false},{onError:error=>x.errors.push(error)});x.anchor.dispatchEvent(new x.window.Event('click',{cancelable:true}));await new Promise(r=>setImmediate(r));assert.equal(x.opened.length,0);assert.equal(x.writes.length,0);assert.equal(x.anchor.getAttribute('aria-disabled'),'true');assert.match(x.errors[0].message,/Beta-Einladung/);
});
