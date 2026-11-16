import {createClient} from "/supabase-client.js";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0");
const $=id=>document.getElementById(id);
const panel=$("profile-own-posts"),list=$("profile-own-posts-list"),message=$("profile-own-posts-message");
const en=()=>document.documentElement.lang==="en"||localStorage.getItem("akame-lang")==="en";
const tr=(de,english)=>en()?english:de;
function el(tag,content){const n=document.createElement(tag);if(content!==undefined)n.textContent=content;return n}
async function init(){
 if(!panel||!list)return;
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)return;
 panel.hidden=false;
 const cacheKey="akame-own-posts-v1:"+user.id;
 let posts=null;
 try{const entry=JSON.parse(sessionStorage.getItem(cacheKey)||"null");if(entry&&Date.now()-entry.savedAt<900000&&Array.isArray(entry.posts))posts=entry.posts}catch{}
 function render(){
  $("profile-own-posts-title").textContent=tr("Meine Beiträge","My posts");
  $("profile-own-posts-hint").textContent=tr("Deine Community-Beiträge verwalten und löschen.","Manage and delete your Community posts.");
  list.replaceChildren();
  if(!posts){message.textContent=tr("Beiträge werden geladen …","Loading posts …");return}
  if(!posts.length){list.append(el("p",tr("Du hast noch keine Beiträge.","You haven't posted anything yet.")));return}
  for(const post of posts){
   const card=el("article");card.style.cssText="padding:14px;border:1px solid #a982ff40;border-radius:12px;background:#a982ff08;min-width:0";
   const date=el("small",new Date(post.created_at).toLocaleString(en()?"en-US":"de-DE"));date.style.opacity=".75";card.append(date);
   const body=el("p",post.body||"");body.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;margin:9px 0";card.append(body);
   if(post.image_url){const a=el("a",tr("Bild ansehen","View image"));a.href=post.image_url;a.target="_blank";a.rel="noopener noreferrer";card.append(a)}
   const actions=el("div");actions.style.cssText="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px";
   const del=el("button",tr("Beitrag löschen","Delete post"));del.type="button";del.className="button";del.style.cssText="background:#652f4a;color:#fff";
   del.addEventListener("click",async()=>{
    if(!confirm(tr("Diesen Beitrag wirklich löschen?","Really delete this post?")))return;
    del.disabled=true;
    const {data,error}=await db.from("akamesmp_posts").delete().eq("id",post.id).eq("author_id",user.id).select("id");
    if(error||!data?.length){message.textContent=error?.message||tr("Löschen nicht erlaubt.","Delete not permitted.");del.disabled=false;return}
    posts=posts.filter(item=>item.id!==post.id);
    try{sessionStorage.removeItem(cacheKey)}catch{}
    render();message.textContent=tr("Beitrag gelöscht.","Post deleted.");
    document.dispatchEvent(new CustomEvent("akame-feed-posts-changed"));
   });
   actions.append(del);card.append(actions);list.append(card);
  }
 }
 render();
 async function load(){
  const result=await db.from("akamesmp_posts").select("id,body,image_url,created_at").eq("author_id",user.id).order("created_at",{ascending:false}).limit(100);
  if(result.error){message.textContent=tr("Beiträge konnten nicht aktualisiert werden.","Could not refresh posts.");return}
  posts=result.data||[];
  try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),posts}))}catch{}
  message.textContent="";render();
 }
 void load();
 document.addEventListener("akame-language-change",render);
 document.addEventListener("akame-feed-posts-changed",()=>void load());
}
void init();
