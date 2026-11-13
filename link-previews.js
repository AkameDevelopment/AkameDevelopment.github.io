/* AkameDevelopment link cards. Only public HTTPS URLs are previewed. */
const URL_PATTERN=/https:\/\/[^\s<>"']+/gi;
function safeUrl(value){try{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password||u.hostname==="localhost"||u.hostname.endsWith(".local")||u.hostname.endsWith(".internal")||/^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname))return null;return u;}catch{return null;}}
export function enhanceLinks(element,text){
  if(!element||!text)return;
  const found=[...String(text).matchAll(URL_PATTERN)].slice(0,3);
  if(!found.length)return;
  const links=document.createElement("div");links.className="akame-link-previews";
  const used=new Set();
  for(const match of found){
    const raw=match[0].replace(/[.,!?;:)\]]+$/,"");const url=safeUrl(raw);
    if(!url||used.has(url.href))continue;used.add(url.href);
    const card=document.createElement("a");card.className="akame-link-preview";card.href=url.href;card.target="_blank";card.rel="noopener noreferrer ugc";card.referrerPolicy="no-referrer";
    const details=document.createElement("span");details.className="akame-link-info";
    const host=document.createElement("span");host.className="akame-link-host";host.textContent=url.hostname.replace(/^www\./,"");
    const title=document.createElement("strong");title.className="akame-link-title";title.textContent=url.hostname;
    const desc=document.createElement("span");desc.className="akame-link-desc";desc.textContent=url.pathname==="/"?"Link öffnen":decodeURIComponent(url.pathname).slice(0,90);
    details.append(host,title,desc);card.append(details);links.append(card);
    /* Public metadata service: if unavailable, the clean domain card stays visible. */
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),4500);
    fetch("https://api.microlink.io?url="+encodeURIComponent(url.href)+"&data.title=true&data.description=true&data.image=true",{signal:controller.signal,referrerPolicy:"no-referrer"}).then(r=>r.ok?r.json():null).then(payload=>{
      if(!payload||payload.status!=="success"||!card.isConnected)return;
      const data=payload.data||{};if(typeof data.title==="string")title.textContent=data.title.slice(0,110);
      if(typeof data.description==="string")desc.textContent=data.description.slice(0,170);
      const imageUrl=safeUrl(data.image?.url);if(imageUrl){const img=document.createElement("img");img.className="akame-link-image";img.src=imageUrl.href;img.alt="";img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>img.remove();card.prepend(img);}
    }).catch(()=>{}).finally(()=>clearTimeout(timeout));
  }
  if(links.childElementCount)element.append(links);
}
