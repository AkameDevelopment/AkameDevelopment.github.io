import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const labels={modcore:"Core",chest:"ChestScout",crosshair:"Crosshair+",chunkloader:"ChunkLoader",items:"AkameItems",hud:"AkameHud",info:"AkameInfos",admin:"Server Admin",zoom:"AkameZoom"};
const fallback=$("profile-fallback"), avatar=$("profile-avatar");
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
 const [saved,beta,staff]=await Promise.all([
  db.from("user_profiles").select("bio,display_name").eq("user_id",user.id).maybeSingle(),
  db.from("beta_access").select("project_slug").eq("user_id",user.id),
  db.from("staff_access").select("role").eq("user_id",user.id).maybeSingle()
 ]);
 $("profile-bio").value=saved.error?"":(saved.data?.bio||"");
 $("profile-display-name").value=saved.error?"":(saved.data?.display_name||"");
 $("profile-name").textContent=saved.data?.display_name||name;
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
$("profile-save").addEventListener("click",async()=>{
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){showError("Bitte zuerst anmelden.");return}
 const bio=$("profile-bio").value.trim();
 const displayName=$("profile-display-name").value.trim();
 if(displayName.length>32||/[\\x00-\\x1F\\x7F]/.test(displayName)){showError("Ungültiger Anzeigename (max. 32 Zeichen).");return}
 if(bio.length>400){showError("Maximal 400 Zeichen.");return}
 const btn=$("profile-save");btn.disabled=true;
 const {error}=await db.from("user_profiles").upsert({user_id:user.id,bio,display_name:displayName,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 btn.disabled=false;
 if(error)showError("Speichern fehlgeschlagen: "+error.message);
 else{$("profile-name").textContent=displayName||String(user.user_metadata?.full_name||user.user_metadata?.name||user.user_metadata?.user_name||"Discord User");$("save-message").textContent="Gespeichert ✓";$("save-message").dataset.state="success"}
});
$("profile-logout").addEventListener("click",async()=>{const {error}=await db.auth.signOut();if(error)showError(error.message);else showSignedOut()});
try{const {data,error}=await db.auth.getUser();if(error||!data.user)showSignedOut();else await showProfile(data.user)}
catch(error){$("profile-loading").textContent="Profil konnte nicht geladen werden.";console.error(error)}
db.auth.onAuthStateChange((_event,session)=>{if(!session?.user)showSignedOut()});
