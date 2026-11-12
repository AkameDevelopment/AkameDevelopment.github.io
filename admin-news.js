import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
const root=document.getElementById("news-manager");
if(root){
const $=id=>document.getElementById(id);
const mods={all:"Allgemein",modcore:"ModCore",chest:"ChestScout",crosshair:"Crosshair+",chunkloader:"ChunkLoader",items:"AkameItems",hud:"AkameHud+",info:"AkameInfos",admin:"Admin",zoom:"AkameZoom"};
let current=null,records=[],selected=null,oldImage=null,removeImage=false,objectUrl=null;
const lang=()=>window.AkameLanguage?.get()==="en"?"en":"de";
const tr=(de,en)=>lang()==="en"?en:de;
const publicUrl=path=>db.storage.from("mod-news").getPublicUrl(path).data.publicUrl;
function status(message,error=false){$("news-message").textContent=message;$("news-message").className=error?"notice error":"notice success";}
function preview(){if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}const file=$("news-image").files[0],img=$("news-preview");if(file){objectUrl=URL.createObjectURL(file);img.src=objectUrl;img.hidden=false;}else if(oldImage&&!removeImage){img.src=publicUrl(oldImage);img.hidden=false;}else{img.hidden=true;img.removeAttribute("src");}}
function reset(){selected=null;oldImage=null;removeImage=false;$("news-form").reset();$("news-id").textContent=tr("Neue Meldung","New post");$("news-save").textContent=tr("Meldung speichern","Save post");$("news-delete").hidden=true;$("news-cancel").hidden=true;$("news-remove-image").hidden=true;preview();}
function edit(item){selected=item.id;oldImage=item.image_path||null;removeImage=false;$("news-id").textContent=tr("Meldung bearbeiten","Edit post")+" #"+item.id;$("news-mod").value=item.project_slug;$("news-kind").value=item.kind;$("news-title").value=item.title;$("news-body").value=item.body;$("news-published").checked=item.published;$("news-image").value="";$("news-remove-image").hidden=!oldImage;$("news-delete").hidden=false;$("news-cancel").hidden=false;$("news-save").textContent=tr("Änderungen speichern","Save changes");preview();root.scrollIntoView({behavior:"smooth",block:"start"});}
function render(){const list=$("news-list");list.replaceChildren();if(!records.length){list.textContent=tr("Noch keine Beiträge.","No posts yet.");return;}for(const item of records){const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid #ffffff24";const info=document.createElement("div");const title=document.createElement("strong");title.textContent=item.title;title.style.display="block";const meta=document.createElement("small");meta.textContent=(mods[item.project_slug]||item.project_slug)+" · "+(item.kind==="update"?tr("Changelog & Updates","Changelog & Updates"):tr("News & Releases","News & Releases"))+" · "+(item.published?tr("Veröffentlicht","Published"):tr("Entwurf","Draft"));info.append(title,meta);const actions=document.createElement("div");actions.className="controls";for(const [label,fn] of [[tr("Bearbeiten","Edit"),()=>edit(item)],[tr("Löschen","Delete"),()=>removePost(item)]]){const b=document.createElement("button");b.type="button";b.className="ghost";b.textContent=label;b.onclick=fn;actions.append(b)}row.append(info,actions);list.append(row);}}
async function load(){const {data,error}=await db.from("mod_news").select("id,project_slug,kind,title,body,published,image_path,created_at").order("created_at",{ascending:false}).limit(200);if(error){status(tr("Beiträge konnten nicht geladen werden: ","Could not load posts: ")+error.message,true);return;}records=data||[];render();}
async function removePost(item){if(!confirm(tr('Meldung "'+item.title+'" wirklich endgültig löschen?','Permanently delete "'+item.title+'"?')))return;const {error}=await db.from("mod_news").delete().eq("id",item.id);if(error){status(tr("Löschen fehlgeschlagen: ","Delete failed: ")+error.message,true);return;}if(item.image_path)await db.storage.from("mod-news").remove([item.image_path]);if(selected===item.id)reset();status(tr("Beitrag gelöscht.","Post deleted."));await load();}
for(const [slug,name] of Object.entries(mods))$("news-mod").add(new Option(name,slug));
$("news-image").addEventListener("change",()=>{const file=$("news-image").files[0];if(file&&(file.size>5242880||!["image/png","image/jpeg","image/webp"].includes(file.type))){$("news-image").value="";status(tr("Nur PNG, JPG oder WebP bis 5 MB erlaubt.","Only PNG, JPG or WebP up to 5 MB allowed."),true);}else if(file)removeImage=false;preview();});
$("news-remove-image").addEventListener("click",()=>{removeImage=true;$("news-image").value="";$("news-remove-image").hidden=true;preview();});
$("news-cancel").addEventListener("click",()=>{reset();status("");});
$("news-delete").addEventListener("click",()=>{const item=records.find(x=>x.id===selected);if(item)void removePost(item);});
$("news-form").addEventListener("submit",async event=>{
event.preventDefault();if(!current)return;const title=$("news-title").value.trim(),body=$("news-body").value.trim(),file=$("news-image").files[0];
if(title.length<3||title.length>140||body.length<3||body.length>8000){status(tr("Titel und Textlänge prüfen.","Please check title and body lengths."),true);return;}
$("news-save").disabled=true;status(tr("Wird gespeichert …","Saving …"));let image=removeImage?null:oldImage,uploaded=null;
try{
if(file){const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";uploaded="mod-news/"+crypto.randomUUID()+"."+ext;const result=await db.storage.from("mod-news").upload(uploaded,file,{contentType:file.type,upsert:false});if(result.error)throw result.error;image=uploaded;}
const payload={project_slug:$("news-mod").value,kind:$("news-kind").value,title,body,published:$("news-published").checked,image_path:image};
const result=selected?await db.from("mod_news").update(payload).eq("id",selected):await db.from("mod_news").insert({...payload,created_by:current.id});
if(result.error)throw result.error;
if(oldImage&&oldImage!==image)await db.storage.from("mod-news").remove([oldImage]);
reset();status(payload.published?tr("Beitrag veröffentlicht.","Post published."):tr("Entwurf gespeichert.","Draft saved."));await load();
}catch(error){if(uploaded)await db.storage.from("mod-news").remove([uploaded]);status(tr("Speichern fehlgeschlagen: ","Save failed: ")+error.message,true);}
finally{$("news-save").disabled=false;}
});
document.addEventListener("akame-language-change",()=>{render();});
(async()=>{const {data,error}=await db.auth.getUser();if(error||!data?.user)return;current=data.user;const access=await db.from("staff_access").select("role").eq("user_id",current.id).maybeSingle();if(access.error||access.data?.role!=="admin")return;root.hidden=false;reset();await load();})();
}