// Demo content uses the signed-in owner's/developer's normal Storage and RLS permissions.
const SLUG='demo-showcase';
export async function demoImage(kind,index=0){
 const canvas=document.createElement('canvas');canvas.width=kind==='cover'?512:1440;canvas.height=kind==='banner'?480:kind==='cover'?512:900;
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const gradient=c.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#120d22');gradient.addColorStop(1,['#553080','#24546d','#4e3376'][index%3]);c.fillStyle=gradient;c.fillRect(0,0,w,h);
 c.fillStyle='#b88bf5';c.font='bold '+(kind==='cover'?48:24)+'px sans-serif';c.fillText('DEMO',kind==='cover'?48:70,kind==='cover'?90:70);
 c.fillStyle='#fff';c.font='bold '+(kind==='cover'?66:64)+'px sans-serif';c.fillText(kind==='cover'?'Showcase':kind==='banner'?'Alles auf einen Blick.':['Dashboard-Vorschau','Modloader & Versionen','Updates & Changelog'][index],kind==='cover'?48:70,kind==='cover'?270:170);
 if(kind==='gallery')for(let i=0;i<3;i++){const x=70+i*435;c.fillStyle='#ffffff13';c.fillRect(x,250,405,420);c.fillStyle='#d3b6fa';c.font='bold 26px sans-serif';c.fillText(['Übersicht','Einstellungen','Aktivität'][i],x+28,305);for(let j=0;j<4;j++){c.fillStyle=j===0?'#a471ec':'#ffffff20';c.fillRect(x+28,350+j*64,300-j*30,22);}}
 c.fillStyle='#d8c9ec';c.font=(kind==='cover'?20:24)+'px sans-serif';c.fillText(kind==='cover'?'Keine installierbare Mod':'Testgrafik · kein Spiel-Screenshot · keine installierbare Mod',kind==='cover'?48:70,h-55);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Testbild konnte nicht erstellt werden.');return new File([blob],kind+'-'+index+'.png',{type:'image/png'});
}
export async function createDemoMod({db,makeImage=demoImage,fetchFile=()=>fetch('/assets/demo/test-download.zip')}){
 const found=await db.from('mod_catalogue').select('slug').eq('slug',SLUG).maybeSingle();if(found.error)throw found.error;if(found.data)return {slug:SLUG,existing:true};
 const assets=[],files=[];let created=false;
 const checked=async query=>{const result=await query;if(result.error)throw result.error;return result.data;};
 async function upload(bucket,file){const path=SLUG+'/'+crypto.randomUUID()+'.'+(bucket==='mod-assets'?'png':'zip');await checked(db.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'}));(bucket==='mod-assets'?assets:files).push(path);return path;}
 try{
  await checked(db.from('mod_catalogue').insert({slug:SLUG,name:'Demo Showcase · Test-Mod',summary:'Vollständige Vorschau mit Bildern, Galerie, Versionen und Modloadern. Keine installierbare Mod.',description:'DEMO / TEST-MOD\n\nDiese Mod dient ausschließlich zum Testen der Download-Seite. Alle Bilder sind Testgrafiken und keine Spiel-Screenshots.\n\nEnthalten: Profilbild, Beschreibungsbanner, drei Galeriebilder, vier Modloader, Release-, Beta- und Alpha-Kennzeichnungen sowie Changelogs.\n\nDie ZIP-Downloads enthalten nur eine README und können nicht als Minecraft-Mod installiert werden. Beta- und Alpha-Dateien benötigen den normalen Beta-Zugang.\n\nDu kannst diese Demo unter Admin → Mods bearbeiten oder mit allen Uploads löschen.',visibility:'public',published:false,release_status:'released'}));created=true;
  const cover=await upload('mod-assets',await makeImage('cover')),banner=await upload('mod-assets',await makeImage('banner')),gallery=[];
  for(let i=0;i<3;i++)gallery.push({path:await upload('mod-assets',await makeImage('gallery',i)),caption:['Dashboard · Testgrafik','Modloader · Testgrafik','Updates · Testgrafik'][i]});
  await checked(db.from('mod_catalogue').update({cover_path:cover,banner_path:banner,gallery}).eq('slug',SLUG));
  const response=await fetchFile();if(!response.ok)throw Error('Testdatei konnte nicht geladen werden.');const blob=await response.blob();
  const versions=[];for(const [i,loader]of ['Fabric','Forge','NeoForge','Quilt'].entries()){
   const file=new File([blob],'DEMO-keine-installierbare-Mod.zip',{type:'application/zip'}),path=await upload('mod-files',file),channel=['stable','beta','beta','alpha'][i];
   versions.push({mod_slug:SLUG,version:['1.0.0-demo','1.1.0-beta-demo','1.1.0-beta-demo','1.2.0-alpha-demo'][i],minecraft_version:'26.3',loader,channel,side:i===3?'both':'client',changelog:'DEMO – keine installierbare Mod.\n• Beispielversion für '+loader+'.\n• Profilbild, Banner und drei Testgrafiken enthalten.\n• Download enthält ausschließlich eine README.\n• Kanal: '+channel+'.',storage_path:path,file_name:file.name,file_size:file.size,published:true});
  }
  await checked(db.from('mod_releases').insert(versions));await checked(db.from('mod_catalogue').update({published:true}).eq('slug',SLUG));return {slug:SLUG,existing:false};
 }catch(error){
  const errors=[];for(const [bucket,paths]of [['mod-files',files],['mod-assets',assets]])if(paths.length){try{const result=await db.storage.from(bucket).remove(paths);if(result.error)errors.push(result.error)}catch(e){errors.push(e)}}
  if(created&&!errors.length){try{const result=await db.from('mod_catalogue').delete().eq('slug',SLUG);if(result.error)errors.push(result.error)}catch(e){errors.push(e)}}
  if(errors.length)throw Error('Demo konnte nicht vollständig erstellt werden. Bitte den unveröffentlichten Demo-Entwurf unter Mods löschen und erneut versuchen. '+error.message);
  throw error;
 }
}
