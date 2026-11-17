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
 const [mods,versions,auth]=await Promise.all([
  db.from('mod_catalogue').select('slug,name,summary,description,gallery,cover_path,banner_path,visibility,published,release_status,release_note,expected_release_date').eq('published',true).order('created_at',{ascending:false}),
  db.from('mod_releases').select('id,mod_slug,version,minecraft_version,loader,channel,side,changelog,storage_path,file_name,file_size,created_at').eq('published',true).order('created_at',{ascending:false}),
  db.auth.getUser()
 ]);
 if(mods.error||versions.error)throw mods.error||versions.error;
 const visibleMods=(mods.data||[]).filter(mod=>['public','beta'].includes(mod.visibility));
 const uid=auth.data?.user?.id;let grants=new Set(),privileged=false;
 if(uid){const [beta,staff]=await Promise.all([db.from('beta_access').select('project_slug').eq('user_id',uid),db.from('staff_access').select('role').eq('user_id',uid).maybeSingle()]);if(!beta.error)grants=new Set((beta.data||[]).map(row=>row.project_slug));privileged=!staff.error&&['owner','admin','developer'].includes(staff.data?.role);}
 const bySlug=new Map(visibleMods.map(mod=>[mod.slug,mod]));
 return {mods:visibleMods,releases:(versions.data||[]).filter(r=>bySlug.has(r.mod_slug)).map(r=>{
  const mod=bySlug.get(r.mod_slug);
  return {...r,modId:r.mod_slug,mod:mod.name,summary:mod.summary,description:mod.description,gallery:mod.gallery,image:assetUrl(mod.cover_path),bannerUrl:assetUrl(mod.banner_path),minecraftVersion:r.minecraft_version,date:r.created_at.slice(0,10),catalogue:true,hasFile:!!r.storage_path,visibility:mod.visibility,betaRequired:mod.visibility==='beta'||['beta','alpha'].includes(r.channel),canDownload:privileged||grants.has(mod.slug)||(mod.visibility==='public'&&r.channel==='stable'),signedIn:!!uid,releaseStatus:mod.release_status,releaseNote:mod.release_note,releaseDate:mod.expected_release_date};
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
 if(release.catalogue&&!release.storage_path){anchor.removeAttribute('href');anchor.setAttribute('aria-disabled','true');anchor.textContent=localStorage.getItem('akame-lang')==='en'?'No download available':'Kein Download verfügbar';anchor.addEventListener('click',event=>event.preventDefault());return;}
 if(release.canDownload===false){anchor.href='#';anchor.setAttribute('aria-disabled','true');anchor.classList.add('mod-download-locked');anchor.addEventListener('click',event=>{event.preventDefault();onError(Error(release.signedIn?'Für diesen Download benötigst du einen Beta-Zugang.':'Bitte anmelden und eine Beta-Einladung annehmen.'))});return;}
 anchor.href=release.catalogue?'#':release.url;anchor.target='_self';anchor.rel='noopener noreferrer';
 anchor.addEventListener('click',async event=>{
  if(release.catalogue)event.preventDefault();
  if(busy||Date.now()-lastStarted<1500){event.preventDefault();return;}
  if(!release.catalogue){lastStarted=Date.now();void recordDownload(release,source);return;}
  busy=true;anchor.setAttribute('aria-busy','true');
  try{
   const {data,error}=await db.storage.from('mod-files').createSignedUrl(release.storage_path,60,{download:release.file_name});
   if(error||!data?.signedUrl)throw error||Error('Download konnte nicht vorbereitet werden.');
   window.location.assign(data.signedUrl);
   lastStarted=Date.now();void recordDownload(release,source);
  }catch(error){onError(error);}
  finally{busy=false;anchor.removeAttribute('aria-busy');}
 });
}
