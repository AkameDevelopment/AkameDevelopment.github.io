import {createClient} from '/supabase-client.js';
export const db=createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0');
export const FILE_LIMIT=50*1024*1024,IMAGE_LIMIT=5*1024*1024;
export const fileExtension=name=>String(name).toLowerCase().split('.').pop();
export function validateFile(file,image=false){
 if(!file||!file.size)throw Error('Bitte eine Datei auswählen.');
 if(file.size>(image?IMAGE_LIMIT:FILE_LIMIT))throw Error(image?'Bilder dürfen höchstens 5 MB groß sein.':'Download-Dateien dürfen höchstens 50 MB groß sein.');
 const ext=fileExtension(file.name);
 if(!(image?['png','jpg','jpeg','webp']:['jar','zip','exe','msi','dmg','appimage','gz','7z']).includes(ext))throw Error('Dieses Dateiformat wird nicht unterstützt.');
 if(image&&!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Bitte ein PNG-, JPEG- oder WebP-Bild verwenden.');
 return ext;
}
export const assetUrl=path=>typeof path==='string'&&/^[a-z0-9-]+\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/.test(path)?db.storage.from('mod-assets').getPublicUrl(path).data.publicUrl:'';
export async function loadCatalogue(){
 const [mods,versions]=await Promise.all([
  db.from('mod_catalogue').select('slug,name,summary,description,gallery,cover_path,banner_path,visibility,published,release_status,release_note,expected_release_date').eq('published',true).order('created_at',{ascending:false}),
  db.from('mod_releases').select('id,mod_slug,version,minecraft_version,loader,channel,side,changelog,storage_path,file_name,file_size,created_at').eq('published',true).order('created_at',{ascending:false})
 ]);
 if(mods.error||versions.error)throw mods.error||versions.error;
 const bySlug=new Map((mods.data||[]).map(mod=>[mod.slug,mod]));
 return {mods:mods.data||[],releases:(versions.data||[]).filter(r=>bySlug.has(r.mod_slug)).map(r=>{
  const mod=bySlug.get(r.mod_slug);
  return {...r,modId:r.mod_slug,mod:mod.name,summary:mod.summary,description:mod.description,gallery:mod.gallery,image:assetUrl(mod.cover_path),bannerUrl:assetUrl(mod.banner_path),minecraftVersion:r.minecraft_version,date:r.created_at.slice(0,10),catalogue:true,releaseStatus:mod.release_status,releaseNote:mod.release_note,releaseDate:mod.expected_release_date};
 })};
}
export async function recordDownload(release,source='downloads'){
 try{
  const {data}=await db.auth.getSession();if(!data?.session)return;
  const {error}=await db.from('download_events').insert({release_id:release.catalogue?release.id:null,mod_slug:String(release.modId||release.mod).slice(0,100),mod_name:String(release.mod||release.modId).slice(0,100),version:String(release.version||'—').slice(0,80),minecraft_version:String(release.minecraftVersion||'').slice(0,60),loader:String(release.loader||'').slice(0,40),source});
  if(error)console.warn('Download-Verlauf konnte nicht gespeichert werden',error);
 }catch(error){console.warn('Download-Verlauf nicht verfügbar',error);}
}
export function attachDownload(anchor,release,{source='downloads',onError=()=>{}}={}){
 let busy=false,lastStarted=0;
 anchor.href=release.catalogue?'#':release.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
 anchor.addEventListener('click',async event=>{
  if(release.catalogue)event.preventDefault();
  if(busy||Date.now()-lastStarted<1500){event.preventDefault();return;}
  if(!release.catalogue){lastStarted=Date.now();void recordDownload(release,source);return;}
  busy=true;anchor.setAttribute('aria-busy','true');
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
  try{
   const {data,error}=await db.storage.from('mod-files').createSignedUrl(release.storage_path,60,{download:release.file_name});
   if(error||!data?.signedUrl)throw error||Error('Download konnte nicht vorbereitet werden.');
   if(popup)popup.location.replace(data.signedUrl);else window.location.assign(data.signedUrl);
   lastStarted=Date.now();void recordDownload(release,source);
  }catch(error){if(popup)popup.close();onError(error);}
  finally{busy=false;anchor.removeAttribute('aria-busy');}
 });
}
