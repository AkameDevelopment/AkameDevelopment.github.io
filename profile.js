async function confirmTenorPreview(url){return new Promise(resolve=>{const dialog=document.createElement("dialog");dialog.style.cssText="width:min(92vw,520px);padding:20px;border:1px solid #a982ff80;border-radius:18px;background:#1b1427;color:#f5edff;box-shadow:0 24px 80px #000b";dialog.innerHTML='<h3 style="margin:0 0 8px">Ist das dein GIF?</h3><p style="color:#bdaaca;font-size:13px">Prüfe die Vorschau. Nur wenn sie stimmt, wird das GIF gespeichert.</p>';const frame=document.createElement("iframe");frame.src=url;frame.title="Tenor GIF Vorschau";frame.loading="eager";frame.style.cssText="width:100%;height:270px;border:0;border-radius:12px;background:#100b18";frame.setAttribute("sandbox","allow-scripts allow-same-origin");dialog.append(frame);const actions=document.createElement("div");actions.style.cssText="display:flex;gap:10px;justify-content:flex-end;margin-top:14px";const cancel=document.createElement("button");cancel.textContent="Falsches GIF / Abbrechen";const accept=document.createElement("button");accept.textContent="Ja, GIF speichern";for(const b of [cancel,accept])b.style.cssText="padding:10px 12px;border-radius:9px;border:1px solid #a982ff66;background:#352449;color:white;cursor:pointer";accept.style.background="#7b4dc0";actions.append(cancel,accept);dialog.append(actions);let done=false;const finish=ok=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(ok)};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);dialog.addEventListener("cancel",e=>{e.preventDefault();finish(false)});document.body.append(dialog);dialog.showModal();});}
async function resolveShowcaseUrl(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname)||!/^\/[A-Za-z0-9_-]+\.gif\/?$/.test(u.pathname))return value;const endpoint="https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/resolve-tenor-gif?url="+encodeURIComponent(value);const response=await fetch(endpoint);const data=await response.json();return response.ok&&data.url?data.url:value;}catch{return value;}}
import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
$("profile-copy-link").addEventListener("click",async()=>{const link=$("profile-public-link").href;try{await navigator.clipboard.writeText(link);$("profile-link-message").textContent="Link kopiert ✓";}catch(e){$("profile-link-message").textContent="Kopieren nicht möglich. Öffne den Link und kopiere die Adresse.";}});
const labels={modcore:"Core",chest:"ChestScout",crosshair:"Crosshair+",chunkloader:"ChunkLoader",items:"AkameItems",hud:"AkameHud",info:"AkameInfos",admin:"Server Admin",zoom:"AkameZoom"};
const modOptions=[["modcore","Core"],["chest","Chest"],["crosshair","Crosshair+"],["chunkloader","ChunkLoader"],["items","Items"],["hud","AkameHud+"],["info","AkameInfos"],["admin","Admin"],["zoom","Zoom"]];
async function loadProfileMods(user){
 const list=$("profile-mod-list"),message=$("profile-mod-message"),counter=$("profile-mod-count");list.replaceChildren();message.textContent="";
 const [saved,visibility,beta,staff]=await Promise.all([
 db.from("profile_mods").select("mod_slug").eq("user_id",user.id),
 db.from("mod_visibility").select("project_slug,visibility,visible"),
 db.from("beta_access").select("project_slug").eq("user_id",user.id),
 db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle()
 ]);
 if(saved.error||visibility.error||beta.error||staff.error){message.textContent="Mod-Berechtigungen konnten nicht geladen werden. Bitte später erneut versuchen.";message.dataset.state="error";return}
 const selected=new Set((saved.data||[]).map(m=>m.mod_slug)),allowedBeta=new Set((beta.data||[]).map(m=>m.project_slug));
 const rules=new Map((visibility.data||[]).map(m=>[m.project_slug,m.visibility||(m.visible?"public":"hidden")]));
 const isAdmin=["owner","admin"].includes(staff.data?.role);
 const allowed=modOptions.filter(([slug])=>{const mode=rules.get(slug);return isAdmin||mode==="public"||(mode==="beta"&&allowedBeta.has(slug))});
 const updateCount=()=>counter.textContent=allowed.filter(([slug])=>selected.has(slug)).length+" ausgewählt";updateCount();
 if(!allowed.length){message.textContent="Für dich sind derzeit keine Mods freigeschaltet.";return}
 for(const [slug,name] of allowed){const label=document.createElement("label");label.className="profile-mod-item";const check=document.createElement("input");check.type="checkbox";check.checked=selected.has(slug);const title=document.createElement("span");title.textContent=name;label.append(check,title);list.append(label);check.addEventListener("change",async()=>{
 const enabled=check.checked;check.disabled=true;message.textContent="Speichert …";delete message.dataset.state;
 const result=enabled?await db.from("profile_mods").insert({user_id:user.id,mod_slug:slug,source:"manual"}):await db.from("profile_mods").delete().eq("user_id",user.id).eq("mod_slug",slug);
 check.disabled=false;if(result.error){check.checked=!enabled;message.textContent="Speichern fehlgeschlagen: "+result.error.message;message.dataset.state="error";return}
 if(enabled)selected.add(slug);else selected.delete(slug);updateCount();message.textContent="Auswahl gespeichert.";message.dataset.state="success"
 })}
}
const fallback=$("profile-fallback"), avatar=$("profile-avatar");
async function updateNameCooldown(){
 const button=$("profile-change-name"),message=$("profile-name-message");
 if(!button||!$("profile-display-name").disabled)return;
 const {data,error}=await db.rpc("profile_name_cooldown");
 if(error||!data?.length)return;
 const {changes_remaining,wait_seconds}=data[0];
 if(wait_seconds>0){
  button.disabled=true;
  const minutes=Math.ceil(wait_seconds/60);
  message.textContent="Namensänderung gesperrt. Noch "+minutes+" Min. warten.";
  button.title="Namensänderung in "+minutes+" Min. wieder möglich";
 }else{
  button.disabled=false;button.title="Namen bearbeiten";
  if(message.textContent.startsWith("Namensänderung gesperrt."))message.textContent="";
 }
}
let savedProfileState={bio:"",showMemberSince:true,showDiscordName:false,spotifyTrack:"",showSpotify:false};
function updateSaveVisibility(){const changed=$("profile-bio").value.trim()!==savedProfileState.bio||$("profile-show-member-since").checked!==savedProfileState.showMemberSince||$("profile-show-discord-name").checked!==savedProfileState.showDiscordName||$("profile-spotify-track").value.trim()!==savedProfileState.spotifyTrack||$("profile-show-spotify").checked!==savedProfileState.showSpotify;$("profile-save").hidden=!changed;$("profile-save").style.display=changed?"inline-flex":"none";if(changed){$("save-message").textContent="";delete $("save-message").dataset.state;}}
function lang(){return window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang")||"de"}
function showSignedOut(){
 $("profile-loading").hidden=true;$("profile-guest").hidden=false;$("profile-content").hidden=true;
}
function showError(message){$("save-message").textContent=message;$("save-message").dataset.state="error"}
function avatarUrl(user){const meta=user.user_metadata||{};const src=String(meta.avatar_url||"");return /^https:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//.test(src)?src:null}
async function showProfile(user){
 $("profile-public-link").href="user.html?id="+encodeURIComponent(user.id);if($("profile-badges-link"))$("profile-badges-link").href="user.html?id="+encodeURIComponent(user.id);
 $("profile-loading").hidden=true;$("profile-guest").hidden=true;$("profile-content").hidden=false;
 const meta=user.user_metadata||{};
 const name=String(meta.full_name||meta.name||meta.user_name||"Discord User");
 $("profile-name").textContent=name;
 $("profile-created").textContent=new Date(user.created_at).toLocaleDateString(lang()==="de"?"de-DE":"en-US",{day:"2-digit",month:"long",year:"numeric"});
 const url=avatarUrl(user);
 avatar.hidden=!url;fallback.hidden=!!url;if(url)avatar.src=url;
 let {data:existing,error:profileError}=await db.from("user_profiles").select("bio,display_name,show_member_since,show_discord_name,favorite_spotify_track,show_favorite_spotify").eq("user_id",user.id).maybeSingle();
 if(!profileError&&!existing){const created=await db.from("user_profiles").insert({user_id:user.id}).select("bio,display_name,show_member_since,show_discord_name,favorite_spotify_track,show_favorite_spotify").single();existing=created.data;profileError=created.error;if(profileError?.code==="23505"){const retry=await db.from("user_profiles").select("bio,display_name,show_member_since,show_discord_name,favorite_spotify_track,show_favorite_spotify").eq("user_id",user.id).single();existing=retry.data;profileError=retry.error;}}
 const [beta,staff]=await Promise.all([
  db.from("beta_access").select("project_slug").eq("user_id",user.id),
  db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle()
 ]);
 $("profile-bio").value=profileError?"":(existing?.bio||"");
 $("profile-display-name").value=profileError?"":(existing?.display_name||"");
 $("profile-name").textContent=existing?.display_name||name;
 if(existing?.display_name)$("profile-public-link").href="user.html?name="+encodeURIComponent(existing.display_name);
 $("profile-show-member-since").checked=existing?.show_member_since!==false; $("profile-show-discord-name").checked=existing?.show_discord_name===true; $("profile-spotify-track").value=existing?.favorite_spotify_track||""; $("profile-show-spotify").checked=existing?.show_favorite_spotify===true;
 $("member-since-visibility-note").textContent=existing?.show_member_since===false?"Nur für dich und Administratoren sichtbar":"Für andere sichtbar";
 savedProfileState={bio:$("profile-bio").value.trim(),showMemberSince:$("profile-show-member-since").checked,showDiscordName:$("profile-show-discord-name").checked,spotifyTrack:$("profile-spotify-track").value.trim(),showSpotify:$("profile-show-spotify").checked};updateSaveVisibility();await updateNameCooldown();await loadProfileMods(user);
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
$("profile-show-member-since").addEventListener("change",updateSaveVisibility);$("profile-show-discord-name").addEventListener("change",updateSaveVisibility);$("profile-spotify-track").addEventListener("input",updateSaveVisibility);$("profile-show-spotify").addEventListener("change",updateSaveVisibility);
$("profile-save").addEventListener("click",async()=>{
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){showError("Bitte zuerst anmelden.");return}
 const bio=$("profile-bio").value.trim();
 const showMemberSince=$("profile-show-member-since").checked; const showDiscordName=$("profile-show-discord-name").checked; const spotifyInput=$("profile-spotify-track").value.trim(); const spotifyMatch=spotifyInput.match(/^https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})(?:[/?#].*)?$/);if(spotifyInput&&!spotifyMatch){showError("Bitte einen gültigen Spotify-Songlink einfügen.");return}const spotifyTrack=spotifyMatch?"https://open.spotify.com/track/"+spotifyMatch[1]:"";const showSpotify=$("profile-show-spotify").checked;if(showSpotify&&!spotifyTrack){showError("Bitte zuerst einen Spotify-Song auswählen.");return}
 if(bio.length>400){showError("Maximal 400 Zeichen.");return}
 const btn=$("profile-save");btn.disabled=true;
 const {error}=await db.from("user_profiles").upsert({user_id:user.id,bio,show_member_since:showMemberSince,show_discord_name:showDiscordName,favorite_spotify_track:spotifyTrack||null,show_favorite_spotify:showSpotify,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 btn.disabled=false;
 if(error)showError("Speichern fehlgeschlagen: "+error.message);
 else{$("profile-spotify-track").value=spotifyTrack;savedProfileState={bio,showMemberSince,showDiscordName,spotifyTrack,showSpotify};updateSaveVisibility();$("member-since-visibility-note").textContent=showMemberSince?"Für andere sichtbar":"Nur für dich und Administratoren sichtbar";$("save-message").textContent="Gespeichert ✓";$("save-message").dataset.state="success"}
});
$("profile-change-name").addEventListener("click",async()=>{
 const input=$("profile-display-name"),button=$("profile-change-name"),message=$("profile-name-message");
 if(input.disabled){await updateNameCooldown();if(button.disabled)return;input.disabled=false;input.focus();input.setSelectionRange(input.value.length,input.value.length);button.title="Namen speichern";button.setAttribute("aria-label","Namen speichern");$("profile-name-edit-icon").innerHTML='<path d="M20 6 9 17l-5-5"/>';message.textContent="Neuen Namen eingeben und auf das Häkchen klicken.";return}
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
 if(error||!updated||updated.display_name!==displayName){if(error?.message?.includes("NAME_COOLDOWN:")){input.disabled=true;message.textContent="Zwei Namensänderungen genutzt. Bitte eine Stunde warten.";await updateNameCooldown();return;}message.textContent=error?.code==="23505"?"Dieser Name ist bereits vergeben. Bitte wähle einen anderen.":"Speichern fehlgeschlagen: "+(error?.message||"Keine Änderung in der Datenbank bestätigt.");return}
 $("profile-name").textContent=displayName;$("profile-public-link").href="user.html?name="+encodeURIComponent(displayName);input.value=displayName;input.disabled=true;button.title="Namen bearbeiten";button.setAttribute("aria-label","Namen bearbeiten");$("profile-name-edit-icon").innerHTML='<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>';message.textContent="Anzeigename gespeichert ✓";await updateNameCooldown();
 } catch(e){message.textContent="Speichern fehlgeschlagen: "+(e?.message||String(e));} finally {button.disabled=false;}
});

try{const {data,error}=await db.auth.getUser();if(error||!data.user)showSignedOut();else await showProfile(data.user)}
catch(error){$("profile-loading").textContent="Profil konnte nicht geladen werden.";console.error(error)}
db.auth.onAuthStateChange((_event,session)=>{if(!session?.user)showSignedOut()});


function tenorEmbedUrl(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname.toLowerCase()))return null;const m=u.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:view\/(?:[^/]*-)?|embed\/)(\d+)\/?$/);if(m)return "https://tenor.com/embed/"+m[1];return null;}catch{return null;}}
async function setupGallery(){
 const panel=$("gallery-panel"),grid=$("gallery-grid"),message=$("gallery-message");
 if(!panel||!grid)return;
 const {data:{user}}=await db.auth.getUser();if(!user)return;panel.hidden=false;
 const validUrl=value=>{try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&value.length<=2000;}catch{return false;}};
 async function render(){
  const {data,error}=await db.from("profile_gallery").select("slot,image_url").eq("user_id",user.id).order("slot");
  grid.replaceChildren();if(error){message.textContent="Showcase konnte nicht geladen werden: "+error.message;return;}
  const count=panel.querySelector(".gallery-count");if(count)count.textContent=(data?.length||0)+" / 4";
  for(let slot=1;slot<=4;slot++){
   const entry=data?.find(x=>x.slot===slot),cell=document.createElement("div");cell.className="gallery-slot";
   const preview=document.createElement("div");preview.className="gallery-preview";
   if(entry){const embed=tenorEmbedUrl(entry.image_url);if(embed){const frame=document.createElement("iframe");frame.src=embed;frame.title="Tenor GIF "+slot;frame.loading="lazy";frame.referrerPolicy="no-referrer";frame.setAttribute("sandbox","allow-scripts allow-same-origin");frame.style.cssText="width:100%;height:100%;border:0";preview.append(frame);}else{const img=document.createElement("img");img.src=entry.image_url;img.alt="Profilbild "+slot;img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>{preview.replaceChildren();const note=document.createElement("div");note.className="gallery-placeholder";note.textContent="Bild konnte nicht geladen werden";preview.append(note)};preview.append(img);}}
   else{const empty=document.createElement("div");empty.className="gallery-placeholder";const icon=document.createElement("span");icon.textContent="▧";const caption=document.createElement("div");caption.textContent="Noch kein Bild";empty.append(icon,caption);preview.append(empty);}
   cell.append(preview);
   const body=document.createElement("div");body.className="gallery-slot-body";
   const top=document.createElement("div");top.className="gallery-slot-top";
   const title=document.createElement("strong");title.className="gallery-slot-title";title.textContent="Highlight "+String(slot).padStart(2,"0");
   const state=document.createElement("span");state.className="gallery-slot-state";state.textContent=entry?"Hinzugefügt":"Leer";top.append(title,state);body.append(top);
   const label=document.createElement("label");label.className="gallery-url-label";label.textContent="Bild-URL";const input=document.createElement("input");input.className="gallery-url-input";input.type="url";input.placeholder="Bild- oder Tenor-GIF-Link";input.value=entry?.image_url||"";input.maxLength=2000;input.setAttribute("aria-label","Bild-URL "+slot);label.append(input);body.append(label);
   const actions=document.createElement("div");actions.className="gallery-slot-actions";const save=document.createElement("button");save.type="button";save.textContent=entry?"Link aktualisieren":"Bild hinzufügen";
   save.onclick=async()=>{const url=input.value.trim();if(!validUrl(url)){message.textContent="Bitte eine gültige HTTPS-Bildadresse eingeben.";return;}save.disabled=true;const isTenorShort=/^https:\/\/(?:www\.)?tenor\.com\/[A-Za-z0-9_-]+\.gif\/?$/.test(url);if(isTenorShort){save.disabled=false;message.textContent="Tenor-Kurzlinks liefern derzeit unzuverlässige GIFs. Öffne den Link bei Tenor, tippe auf SD-GIF und kopiere die direkte Adresse von media.tenor.com. So wird garantiert nicht ein anderes GIF gespeichert.";message.dataset.state="error";return;}const resolved=await resolveShowcaseUrl(url);if(resolved===url&&/^https:\/\/(?:www\.)?tenor\.com\/[A-Za-z0-9_-]+\.gif\/?$/.test(url)){save.disabled=false;message.textContent="Tenor-Kurzlink konnte nicht aufgelöst werden. Bitte später erneut versuchen oder direkten GIF-Link verwenden.";return;}if(/^https:\/\/(?:www\.)?tenor\.com\/[A-Za-z0-9_-]+\.gif\/?$/.test(url)){const approved=await confirmTenorPreview(resolved);if(!approved){save.disabled=false;message.textContent="Nicht gespeichert. Bitte den richtigen GIF-Link verwenden.";return;}}const result=await db.from("profile_gallery").upsert({user_id:user.id,slot,image_url:resolved},{onConflict:"user_id,slot"});save.disabled=false;if(result.error){message.textContent="Speichern fehlgeschlagen: "+result.error.message;return;}message.textContent="Bildlink gespeichert.";await render();};actions.append(save);
   if(entry){const remove=document.createElement("button");remove.type="button";remove.className="gallery-remove";remove.textContent="Entfernen";remove.onclick=async()=>{remove.disabled=true;const result=await db.from("profile_gallery").delete().eq("user_id",user.id).eq("slot",slot);if(result.error){message.textContent=result.error.message;remove.disabled=false;return;}message.textContent="Bild entfernt.";await render();};actions.append(remove);}
   body.append(actions);cell.append(body);grid.append(cell);
  }
 }
 await render();
}
void setupGallery();
