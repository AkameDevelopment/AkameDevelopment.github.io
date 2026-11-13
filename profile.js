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
 $("profile-role").textContent=role==="admin"?"Administrator":role==="staff"?"Team":"Community";
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
 if(!displayName||displayName.length>32||/[\\x00-\\x1F\\x7F]/.test(displayName)){message.textContent="Bitte 1–32 gültige Zeichen eingeben.";return}
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){message.textContent="Bitte erneut anmelden.";return}
 button.disabled=true;
 let {data:updated,error}=await db.from("user_profiles").update({display_name:displayName,updated_at:new Date().toISOString()}).eq("user_id",user.id).select("display_name").maybeSingle();
 if(!error&&!updated){
  const created=await db.from("user_profiles").upsert({user_id:user.id,display_name:displayName,updated_at:new Date().toISOString()},{onConflict:"user_id"}).select("display_name").single();
  updated=created.data;error=created.error;
 }
 button.disabled=false;
 if(error||!updated||updated.display_name!==displayName){message.textContent=error?.code==="23505"?"Dieser Name ist bereits vergeben. Bitte wähle einen anderen.":"Speichern fehlgeschlagen: "+(error?.message||"Keine Änderung in der Datenbank bestätigt.");return}
 $("profile-name").textContent=displayName;input.value=displayName;input.disabled=true;button.title="Namen bearbeiten";button.setAttribute("aria-label","Namen bearbeiten");$("profile-name-edit-icon").innerHTML='<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>';message.textContent="Anzeigename gespeichert ✓";
});
$("profile-logout").addEventListener("click",async()=>{const {error}=await db.auth.signOut();if(error)showError(error.message);else showSignedOut()});
try{const {data,error}=await db.auth.getUser();if(error||!data.user)showSignedOut();else await showProfile(data.user)}
catch(error){$("profile-loading").textContent="Profil konnte nicht geladen werden.";console.error(error)}
db.auth.onAuthStateChange((_event,session)=>{if(!session?.user)showSignedOut()});
