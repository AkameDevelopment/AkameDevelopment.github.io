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
  .akame-comment-meta{display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap}.akame-comment-meta strong{color:#ead7ff}
  .akame-comment-meta time{font-size:12px;color:#9f91af}.akame-comment p{white-space:pre-wrap;color:#ded2ec;margin:10px 0 0;max-width:none}
  .akame-comment-list .akame-delete{background:transparent;border:1px solid #84526a;color:#f4afc5;padding:5px 9px;font-size:12px}
  .akame-comments [hidden]{display:none!important}.akame-comment-msg{color:#cbb5e7;font-size:13px}
  `;
  document.head.append(style);
  const supabase = createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  const q = (s) => root.querySelector(s);
  const list = q("#comment-list"), message = q("#comment-message"), composer = q("#comment-composer"), guest = q("#comment-guest");
  const textarea = q("#comment-body"), counter = q("#comment-count"), submit = q("#comment-submit");
  let currentUser = null, moderator = false;
  function showMessage(text){message.textContent=text;}
  function timestamp(iso){return new Date(iso).toLocaleString(document.documentElement.lang==="en"?"en-GB":"de-DE",{dateStyle:"medium",timeStyle:"short"});}
  async function fetchComments(){
    list.replaceChildren();
    showMessage("Kommentare werden geladen …");
    const {data,error} = await supabase.from("mod_comments").select("id,project_slug,author_id,author_name,body,created_at").eq("project_slug",slug).order("created_at",{ascending:false}).limit(50);
    if(error){showMessage("Kommentare konnten nicht geladen werden: "+error.message);return;}
    showMessage(data.length ? data.length+" Kommentar"+(data.length===1?"":"e")+" (maximal 50 angezeigt)" : "Noch keine Kommentare. Sei die erste Person!");
    for(const item of data){
      const article=document.createElement("article");article.className="akame-comment";
      const meta=document.createElement("div");meta.className="akame-comment-meta";
      const name=document.createElement("strong");name.textContent=item.author_name||"Discord-Nutzer";
      const time=document.createElement("time");time.dateTime=item.created_at;time.textContent=timestamp(item.created_at);
      const info=document.createElement("div");info.append(name,document.createTextNode(" · "),time);meta.append(info);
      if(currentUser && (currentUser.id===item.author_id || moderator)){
        const remove=document.createElement("button");remove.type="button";remove.className="akame-delete";remove.textContent="Löschen";
        remove.addEventListener("click",async()=>{
          if(!confirm("Diesen Kommentar wirklich löschen?"))return;
          remove.disabled=true;
          const {error}=await supabase.from("mod_comments").delete().eq("id",item.id);
          if(error){showMessage("Löschen fehlgeschlagen: "+error.message);remove.disabled=false;return;}
          await fetchComments();
        });meta.append(remove);
      }
      const body=document.createElement("p");body.textContent=item.body;
      article.append(meta,body);list.append(article);
    }
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
    if(body.length<3 || body.length>1200){showMessage("Bitte 3 bis 1200 Zeichen eingeben.");return;}
    submit.disabled=true;submit.textContent="Wird veröffentlicht …";
    const {error}=await supabase.from("mod_comments").insert({project_slug:slug,body});
    submit.disabled=false;submit.textContent="Kommentar veröffentlichen";
    if(error){showMessage("Kommentar konnte nicht gespeichert werden: "+error.message);return;}
    textarea.value="";counter.textContent="0/1200";await fetchComments();
  });
  await checkUser();
  supabase.auth.onAuthStateChange((_event,session)=>{applyUser(session?.user||null);void checkUser();});
}
