import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const slugs = new Set(["modcore","chest","crosshair","chunkloader","items","hud","info","admin","zoom"]);
const slug = new URLSearchParams(location.search).get("mod");
const root = document.getElementById("mod-comments");
if (root && slugs.has(slug)) {
  const style = document.createElement("style");
  style.textContent = `
  .akame-comments{margin-top:24px}.akame-comments-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
  .akame-comments h2{font-size:26px;margin:0}.akame-comments .akame-small{color:#b5a7c7;font-size:13px;margin:5px 0 18px}
  .akame-comment-box{background:#ffffff06;border:1px solid #a77bf24a;border-radius:14px;padding:16px;margin:18px 0}
  .akame-comment-box textarea{display:block;width:100%;min-height:100px;background:#120e1c;border:1px solid #9470c35c;border-radius:11px;padding:12px;color:white;resize:vertical;font:inherit}
  .akame-comment-box textarea:focus-visible{outline:2px solid #bc93ff}.akame-comment-box .akame-ctrl{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px}
  .akame-comment-box button,.akame-comment-list button{background:#8e5bdb;border:1px solid #ae86f6;border-radius:10px;color:#fff;padding:9px 14px;font:700 13px system-ui;cursor:pointer}
  .akame-comment-box button:disabled,.akame-comment-list button:disabled{opacity:.5;cursor:wait}.akame-comment-box small{color:#a99bbb}
  .akame-comment-list{display:grid;gap:12px}.akame-comment{border:1px solid #ffffff1d;background:#171120;border-radius:15px;padding:17px;overflow-wrap:anywhere}
  .akame-comment-meta{display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap}.akame-comment-identity{display:flex;align-items:center;gap:11px;min-width:0}.akame-comment-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#352344;flex:none;border:1px solid #a782cc55}.akame-comment-meta strong{color:#ead7ff}.akame-comment-profile{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:inherit;border-radius:9px}.akame-comment-profile:hover strong{text-decoration:underline;color:#caa7ff}.akame-comment-profile:focus-visible{outline:2px solid #bc93ff}
  .akame-comment-meta time{font-size:12px;color:#9f91af}.akame-comment p{white-space:pre-wrap;color:#ded2ec;margin:10px 0 0;max-width:none}
  .akame-comment-list .akame-delete{background:transparent;border:1px solid #84526a;color:#f4afc5;padding:5px 9px;font-size:12px}
.akame-replies{display:grid;gap:10px;margin:12px 0 0 24px;padding-left:14px;border-left:2px solid #8e5bdb55}.akame-replies .akame-comment{padding:12px;background:#1e1729}.akame-reply-actions{margin-top:12px}.akame-reply-actions button{background:transparent;border:1px solid #a77bf255;color:#d7b9ff}.akame-reply-form{margin:12px 0 0}.akame-reply-form textarea{width:100%;min-height:72px;background:#120e1c;border:1px solid #9470c35c;border-radius:10px;color:#fff;padding:10px;font:inherit;resize:vertical}.akame-reply-form .akame-ctrl{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}@media(max-width:600px){.akame-replies{margin-left:7px;padding-left:9px}}
.akame-reply-disclosure{margin-top:12px}.akame-reply-disclosure>summary{display:inline-flex;align-items:center;gap:7px;cursor:pointer;list-style:none;color:#caa4ff;font-size:13px;font-weight:650;padding:6px 0;user-select:none}.akame-reply-disclosure>summary::-webkit-details-marker{display:none}.akame-reply-disclosure>summary:before{content:"▸";font-size:15px;transition:transform .15s ease}.akame-reply-disclosure[open]>summary:before{transform:rotate(90deg)}.akame-reply-disclosure>summary:focus-visible{outline:2px solid #bc93ff;outline-offset:3px;border-radius:4px}
  .akame-comment{scroll-margin-top:100px}.akame-comment-target{outline:2px solid #bd8aff!important;outline-offset:4px!important;border-radius:12px}\n  .akame-comments [hidden]{display:none!important}.akame-comment-msg{color:#cbb5e7;font-size:13px}
  `;
  document.head.append(style);
  const supabase = createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  const q = (s) => root.querySelector(s);
  const list = q("#comment-list"), message = q("#comment-message"), composer = q("#comment-composer"), guest = q("#comment-guest");
  const textarea = q("#comment-body"), counter = q("#comment-count"), submit = q("#comment-submit");
  let currentUser = null, moderator = false, loadVersion = 0;
  const tr=(de,en)=>window.AkameLanguage?.get()==="en"?en:de;
  document.addEventListener("akame-language-change",()=>{submit.textContent=tr("Kommentar veröffentlichen","Post comment");void fetchComments();});
  function showMessage(text){message.textContent=text;}
  function timestamp(iso){return new Date(iso).toLocaleString(document.documentElement.lang==="en"?"en-GB":"de-DE",{dateStyle:"medium",timeStyle:"short"});}
  async function fetchComments(){
    const version=++loadVersion;
    showMessage(tr("Kommentare werden geladen …","Loading comments …"));
    const {data,error} = await supabase.from("mod_comments").select("id,project_slug,author_id,author_name,author_avatar_url,body,created_at,parent_id").eq("project_slug",slug).order("created_at",{ascending:false}).limit(200);
    if(version!==loadVersion)return;
    if(error){list.replaceChildren();showMessage(tr("Kommentare konnten nicht geladen werden: ","Could not load comments: ")+error.message);return;}
    const roots=data.filter(item=>item.parent_id==null);const replies=new Map();for(const item of data){if(item.parent_id!=null){const key=String(item.parent_id);if(!replies.has(key))replies.set(key,[]);replies.get(key).push(item);}}
    showMessage(roots.length ? (window.AkameLanguage?.get()==="en"?roots.length+" comment"+(roots.length===1?"":"s"):roots.length+" Kommentar"+(roots.length===1?"":"e")) : tr("Noch keine Kommentare. Sei die erste Person!","No comments yet. Be the first!"));
    function renderComment(item,isReply=false){
      const article=document.createElement("article");article.className="akame-comment";article.id="comment-"+item.id;
      const meta=document.createElement("div");meta.className="akame-comment-meta";
      const name=document.createElement("strong");name.textContent=item.author_name||tr("Discord-Nutzer","Discord user");
      const time=document.createElement("time");time.dateTime=item.created_at;time.textContent=timestamp(item.created_at);
      const info=document.createElement("div");info.append(name,document.createTextNode(" · "),time);const identity=document.createElement("div");identity.className="akame-comment-identity";const avatar=document.createElement("img");avatar.className="akame-comment-avatar";avatar.alt=tr("Profilbild von ","Profile picture of ")+name.textContent;avatar.loading="lazy";avatar.referrerPolicy="no-referrer";const avatarUrl=String(item.author_avatar_url||"");avatar.src=/^https:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//.test(avatarUrl)?avatarUrl:"https://cdn.discordapp.com/embed/avatars/0.png";const profileLink=document.createElement("a");profileLink.className="akame-comment-profile";profileLink.href="user.html?id="+encodeURIComponent(item.author_id);profileLink.title=tr("Profil ansehen","View profile");profileLink.append(avatar,info);identity.append(profileLink);meta.append(identity);
      if(currentUser && (currentUser.id===item.author_id || moderator)){
        const remove=document.createElement("button");remove.type="button";remove.className="akame-delete";remove.textContent=tr("Löschen","Delete");
        remove.addEventListener("click",async()=>{
          if(!confirm(tr("Diesen Kommentar wirklich löschen?","Really delete this comment?")))return;
          remove.disabled=true;
          const {error}=await supabase.from("mod_comments").delete().eq("id",item.id);
          if(error){showMessage(tr("Löschen fehlgeschlagen: ","Delete failed: ")+error.message);remove.disabled=false;return;}
          await fetchComments();
        });meta.append(remove);
      }
      const body=document.createElement("p");body.textContent=item.body;
      article.append(meta,body);
      if(!isReply){
        const actions=document.createElement("div");actions.className="akame-reply-actions";
        const replyButton=document.createElement("button");replyButton.type="button";replyButton.textContent=tr("Antworten","Reply");
        replyButton.addEventListener("click",()=>{
          const existing=article.querySelector(".akame-reply-form");if(existing){existing.remove();return;}
          if(!currentUser){showMessage(tr("Melde dich mit Discord an, um zu antworten.","Sign in with Discord to reply."));return;}
          const form=document.createElement("form");form.className="akame-reply-form";
          const input=document.createElement("textarea");input.required=true;input.minLength=3;input.maxLength=1200;input.placeholder=tr("Deine Antwort …","Your reply …");input.setAttribute("aria-label",tr("Antwort schreiben","Write a reply"));
          const controls=document.createElement("div");controls.className="akame-ctrl";const cancel=document.createElement("button");cancel.type="button";cancel.textContent=tr("Abbrechen","Cancel");cancel.onclick=()=>form.remove();const send=document.createElement("button");send.type="submit";send.textContent=tr("Antwort veröffentlichen","Post reply");controls.append(cancel,send);form.append(input,controls);
          form.addEventListener("submit",async event=>{event.preventDefault();const body=input.value.trim();if(body.length<3||body.length>1200)return;send.disabled=true;const {error}=await supabase.from("mod_comments").insert({project_slug:slug,parent_id:item.id,body});if(error){showMessage(tr("Antwort konnte nicht gespeichert werden: ","Could not post reply: ")+error.message);send.disabled=false;return;}await fetchComments();});
          article.append(form);input.focus();
        });actions.append(replyButton);article.append(actions);
        const children=replies.get(String(item.id))||[];
        if(children.length){const disclosure=document.createElement("details");disclosure.className="akame-reply-disclosure";const summary=document.createElement("summary");summary.textContent=tr(children.length===1?"1 Antwort anzeigen":children.length+" Antworten anzeigen",children.length===1?"Show 1 reply":"Show "+children.length+" replies");disclosure.append(summary);const thread=document.createElement("div");thread.className="akame-replies";children.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));for(const child of children)thread.append(renderComment(child,true));disclosure.append(thread);disclosure.addEventListener("toggle",()=>{summary.textContent=disclosure.open?tr("Antworten ausblenden","Hide replies"):tr(children.length===1?"1 Antwort anzeigen":children.length+" Antworten anzeigen",children.length===1?"Show 1 reply":"Show "+children.length+" replies");});article.append(disclosure);}
      }
      return article;
    }
    const fragment=document.createDocumentFragment();for(const item of roots)fragment.append(renderComment(item));list.replaceChildren(fragment);const targetId=new URLSearchParams(location.search).get("comment");if(targetId && /^\\d+$/.test(targetId)){const target=document.getElementById("comment-"+targetId);if(target){const details=target.closest(".akame-reply-disclosure");if(details)details.open=true;requestAnimationFrame(()=>{target.scrollIntoView({behavior:"smooth",block:"center"});target.classList.add("akame-comment-target");});}}
  }
  function applyUser(user){currentUser=user;composer.hidden=!user;guest.hidden=!!user;}
  async function checkUser(){
    const {data,error}=await supabase.auth.getUser();
    applyUser(error?null:data?.user||null);
    moderator=false;
    if(currentUser){
      const {data:staff}=await supabase.from("staff_access").select("role").eq("user_id",currentUser.id).maybeSingle();
      moderator=["admin","staff"].includes(staff?.role);
    }
    await fetchComments();
  }
  textarea.addEventListener("input",()=>counter.textContent=textarea.value.length+"/1200");
  q("#comment-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!currentUser)return;
    const body=textarea.value.trim();
    if(body.length<3 || body.length>1200){showMessage(tr("Bitte 3 bis 1200 Zeichen eingeben.","Please enter between 3 and 1,200 characters."));return;}
    submit.disabled=true;submit.textContent=tr("Wird veröffentlicht …","Posting …");
    const {error}=await supabase.from("mod_comments").insert({project_slug:slug,body});
    submit.disabled=false;submit.textContent=tr("Kommentar veröffentlichen","Post comment");
    if(error){showMessage(tr("Kommentar konnte nicht gespeichert werden: ","Could not save comment: ")+error.message);return;}
    textarea.value="";counter.textContent="0/1200";await fetchComments();
  });
  await checkUser();
  supabase.auth.onAuthStateChange((_event,session)=>{applyUser(session?.user||null);void checkUser();});
}
