import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const labels={modcore:"Core",chest:"ChestScout",crosshair:"Crosshair+",chunkloader:"ChunkLoader",items:"AkameItems",hud:"AkameHud",info:"AkameInfos",admin:"Server Admin",zoom:"AkameZoom"};
const fallback=$("profile-fallback"), avatar=$("profile-avatar");
let savedProfileState={bio:"",showMemberSince:true};
function updateSaveVisibility(){const changed=$("profile-bio").value.trim()!==savedProfileState.bio||$("profile-show-member-since").checked!==savedProfileState.showMemberSince;$("profile-save").hidden=!changed;$("profile-save").style.display=changed?"inline-flex":"none";if(changed){$("save-message").textContent="";delete $("save-message").dataset.state;}}
function lang(){return window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang")||"de"}
function showSignedOut(){
 $("profile-loading").hidden=true;$("profile-guest").hidden=false;$("profile-content").hidden=true;
}
function showError(message){$("save-message").textContent=message;$("save-message").dataset.state="error"}
function avatarUrl(user){const meta=user.user_metadata||{};const src=String(meta.avatar_url||"");return /^https:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//.test(src)?src:null}
async function showProfile(user){
 $("profile-loading").hidden=true;$("profile-guest").hidden=true;$("profile-content").hidden=false;
 const meta=user.user_metadata||{};
 const name=String(meta.full_name||meta.name||meta.user_name||"Discord User");
 $("profile-name").textContent=name;
 $("profile-created").textContent=new Date(user.created_at).toLocaleDateString(lang()==="de"?"de-DE":"en-US",{day:"2-digit",month:"long",year:"numeric"});
 const url=avatarUrl(user);
 avatar.hidden=!url;fallback.hidden=!!url;if(url)avatar.src=url;
 let {data:existing,error:profileError}=await db.from("user_profiles").select("bio,display_name,show_member_since").eq("user_id",user.id).maybeSingle();
 if(!profileError&&!existing){const created=await db.from("user_profiles").insert({user_id:user.id}).select("bio,display_name,show_member_since").single();existing=created.data;profileError=created.error;if(profileError?.code==="23505"){const retry=await db.from("user_profiles").select("bio,display_name,show_member_since").eq("user_id",user.id).single();existing=retry.data;profileError=retry.error;}}
 const [beta,staff]=await Promise.all([
  db.from("beta_access").select("project_slug").eq("user_id",user.id),
  db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle()
 ]);
 $("profile-bio").value=profileError?"":(existing?.bio||"");
 $("profile-display-name").value=profileError?"":(existing?.display_name||"");
 $("profile-name").textContent=existing?.display_name||name;
 $("profile-show-member-since").checked=existing?.show_member_since!==false;
 $("member-since-visibility-note").textContent=existing?.show_member_since===false?"Nur für dich und Administratoren sichtbar":"Für andere sichtbar";
 savedProfileState={bio:$("profile-bio").value.trim(),showMemberSince:$("profile-show-member-since").checked};updateSaveVisibility();
 const role=staff.data?.role;
 $("profile-role").textContent=role==="owner"?"Owner":role==="admin"?"Administrator":role==="staff"?"Team":"Community";
 const betas=beta.error?[]:(beta.data||[]);
 $("profile-beta-count").textContent=String(betas.length);
 const container=$("profile-beta-list");container.replaceChildren();
 if(beta.error){container.textContent="Beta-Zugänge konnten nicht geladen werden.";return}
 if(betas.length===0){container.textContent="Noch keine Beta-Freigaben.";return}
 for(const item of betas){const a=document.createElement("a");a.href="project.html?mod="+encodeURIComponent(item.project_slug);a.className="beta-pill";a.textContent=labels[item.project_slug]||item.project_slug;container.append(a)}
}
$("profile-login").addEventListener("click",async()=>{
 $("profile-login").disabled=true;
 try{
  const {error}=await db.auth.signInWithOAuth({provider:"discord",options:{redirectTo:"https://akamedevelopment.github.io/index.html",scopes:"identify email"}});
  if(error)throw error;
 }catch(e){$("profile-login").disabled=false;$("login-error").textContent=e.message||String(e)}
});
$("profile-bio").addEventListener("input",updateSaveVisibility);
$("profile-show-member-since").addEventListener("change",updateSaveVisibility);
$("profile-save").addEventListener("click",async()=>{
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){showError("Bitte zuerst anmelden.");return}
 const bio=$("profile-bio").value.trim();
 const showMemberSince=$("profile-show-member-since").checked;
 if(bio.length>400){showError("Maximal 400 Zeichen.");return}
 const btn=$("profile-save");btn.disabled=true;
 const {error}=await db.from("user_profiles").upsert({user_id:user.id,bio,show_member_since:showMemberSince,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 btn.disabled=false;
 if(error)showError("Speichern fehlgeschlagen: "+error.message);
 else{savedProfileState={bio,showMemberSince};updateSaveVisibility();$("member-since-visibility-note").textContent=showMemberSince?"Für andere sichtbar":"Nur für dich und Administratoren sichtbar";$("save-message").textContent="Gespeichert ✓";$("save-message").dataset.state="success"}
});
$("profile-change-name").addEventListener("click",async()=>{
 const input=$("profile-display-name"),button=$("profile-change-name"),message=$("profile-name-message");
 if(input.disabled){input.disabled=false;input.focus();input.select();button.title="Namen speichern";button.setAttribute("aria-label","Namen speichern");$("profile-name-edit-icon").innerHTML='<path d="M20 6 9 17l-5-5"/>';message.textContent="Neuen Namen eingeben und auf das Häkchen klicken.";return}
 const displayName=input.value.trim();
 if(!displayName||displayName.length>32||/[\x00-\x1F\x7F]/.test(displayName)){message.textContent="Bitte 1–32 gültige Zeichen eingeben.";return}
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){message.textContent="Bitte erneut anmelden.";return}
 button.disabled=true;message.textContent="Name wird gespeichert …";
 try {
 let {data:updated,error}=await db.from("user_profiles").update({display_name:displayName}).eq("user_id",user.id).select("display_name").maybeSingle();
 if(!error&&!updated){
  const created=await db.from("user_profiles").upsert({user_id:user.id,display_name:displayName},{onConflict:"user_id"}).select("display_name").single();
  updated=created.data;error=created.error;
 }
 button.disabled=false;
 if(error||!updated||updated.display_name!==displayName){message.textContent=error?.code==="23505"?"Dieser Name ist bereits vergeben. Bitte wähle einen anderen.":"Speichern fehlgeschlagen: "+(error?.message||"Keine Änderung in der Datenbank bestätigt.");return}
 $("profile-name").textContent=displayName;input.value=displayName;input.disabled=true;button.title="Namen bearbeiten";button.setAttribute("aria-label","Namen bearbeiten");$("profile-name-edit-icon").innerHTML='<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>';message.textContent="Anzeigename gespeichert ✓";
 } catch(e){message.textContent="Speichern fehlgeschlagen: "+(e?.message||String(e));} finally {button.disabled=false;}
});

try{const {data,error}=await db.auth.getUser();if(error||!data.user)showSignedOut();else await showProfile(data.user)}
catch(error){$("profile-loading").textContent="Profil konnte nicht geladen werden.";console.error(error)}
db.auth.onAuthStateChange((_event,session)=>{if(!session?.user)showSignedOut()});


function tenorEmbedUrl(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname.toLowerCase()))return null;const m=u.pathname.match(/^\/view\/(?:[^/]*-)?(\d+)\/?$/);return m?"https://tenor.com/embed/"+m[1]:null;}catch{return null;}}
async function setupGallery(){
 const panel=$("gallery-panel"),grid=$("gallery-grid"),message=$("gallery-message");
 if(!panel||!grid)return;
 const {data:{user}}=await db.auth.getUser();if(!user)return;panel.hidden=false;
 const validUrl=value=>{try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&value.length<=2000;}catch{return false;}};
 async function render(){
  const {data,error}=await db.from("profile_gallery").select("slot,image_url").eq("user_id",user.id).order("slot");
  grid.replaceChildren();if(error){message.textContent="Galerie konnte nicht geladen werden: "+error.message;return;}
  const count=panel.querySelector(".gallery-count");if(count)count.textContent=(data?.length||0)+" / 3";
  for(let slot=1;slot<=3;slot++){
   const entry=data?.find(x=>x.slot===slot),cell=document.createElement("div");cell.className="gallery-slot";
   const preview=document.createElement("div");preview.className="gallery-preview";
   if(entry){const embed=tenorEmbedUrl(entry.image_url);if(embed){const frame=document.createElement("iframe");frame.src=embed;frame.title="Tenor GIF "+slot;frame.loading="lazy";frame.referrerPolicy="no-referrer";frame.setAttribute("sandbox","allow-scripts allow-same-origin");frame.style.cssText="width:100%;height:100%;border:0";preview.append(frame);}else{const img=document.createElement("img");img.src=entry.image_url;img.alt="Profilbild "+slot;img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>{preview.replaceChildren();const note=document.createElement("div");note.className="gallery-placeholder";note.textContent="Bild konnte nicht geladen werden";preview.append(note)};preview.append(img);}}
   else{const empty=document.createElement("div");empty.className="gallery-placeholder";const icon=document.createElement("span");icon.textContent="▧";const caption=document.createElement("div");caption.textContent="Noch kein Bild";empty.append(icon,caption);preview.append(empty);}
   cell.append(preview);
   const body=document.createElement("div");body.className="gallery-slot-body";
   const top=document.createElement("div");top.className="gallery-slot-top";
   const title=document.createElement("strong");title.className="gallery-slot-title";title.textContent="Bild "+String(slot).padStart(2,"0");
   const state=document.createElement("span");state.className="gallery-slot-state";state.textContent=entry?"Hinzugefügt":"Leer";top.append(title,state);body.append(top);
   const label=document.createElement("label");label.className="gallery-url-label";label.textContent="Bild-URL";const input=document.createElement("input");input.className="gallery-url-input";input.type="url";input.placeholder="Bild- oder Tenor-GIF-Link";input.value=entry?.image_url||"";input.maxLength=2000;input.setAttribute("aria-label","Bild-URL "+slot);label.append(input);body.append(label);
   const actions=document.createElement("div");actions.className="gallery-slot-actions";const save=document.createElement("button");save.type="button";save.textContent=entry?"Link aktualisieren":"Bild hinzufügen";
   save.onclick=async()=>{const url=input.value.trim();if(!validUrl(url)){message.textContent="Bitte eine gültige HTTPS-Bildadresse eingeben.";return;}save.disabled=true;const result=await db.from("profile_gallery").upsert({user_id:user.id,slot,image_url:url},{onConflict:"user_id,slot"});save.disabled=false;if(result.error){message.textContent="Speichern fehlgeschlagen: "+result.error.message;return;}message.textContent="Bildlink gespeichert.";await render();};actions.append(save);
   if(entry){const remove=document.createElement("button");remove.type="button";remove.className="gallery-remove";remove.textContent="Entfernen";remove.onclick=async()=>{remove.disabled=true;const result=await db.from("profile_gallery").delete().eq("user_id",user.id).eq("slot",slot);if(result.error){message.textContent=result.error.message;remove.disabled=false;return;}message.textContent="Bild entfernt.";await render();};actions.append(remove);}
   body.append(actions);cell.append(body);grid.append(cell);
  }
 }
 await render();
}
void setupGallery();
