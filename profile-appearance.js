/* AkameDevelopment — member profile banner customization. */
import{createClient}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const db=createClient("https://wycdpuzlbivtfxwtarzn.supabase.co","sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const themes={
 violet:["#563485","#241734","#b981ff"],
 midnight:["#26365c","#101728","#8ca7ec"],
 rose:["#713a66","#271429","#f2a8d9"],
 ocean:["#205b74","#112836","#91d7f1"],
 emerald:["#276259","#112e2b","#83e4ba"]
};
const strings={
 de:{heading:"Profilhintergrund",description:"Gestalte den Hintergrund deines öffentlichen Profilkopfes.",theme:"Farbthema",url:"Eigenes Hintergrundbild (HTTPS-Bild-URL)",placeholder:"https://example.com/banner.jpg",hint:"Unterstützt direkte GIF-URLs (z. B. media.tenor.com), Tenor-Links sowie JPG/PNG. Externe Bilder können deine IP-Adresse an den Anbieter übertragen.",save:"Hintergrund speichern",saved:"Hintergrund gespeichert ✓",error:"Speichern fehlgeschlagen: ",invalid:"Bitte eine gültige HTTPS-Bild-URL eingeben.",preview:"Vorschau",remove:"Bild entfernen",ownColor:"Eigene Farbe verwenden",outline:"Namenskontur",outlineHint:"Farbe der Umrandung deines Anzeigenamens (Standard: Schwarz).",outlinePreview:"Namensvorschau",position:"Bildausschnitt",horizontal:"Horizontal",vertical:"Vertikal",zoom:"Zoom",reset:"Zurücksetzen",drag:"Bild in der Vorschau verschieben oder die Regler verwenden.",colors:{violet:"Lila",midnight:"Mitternacht",rose:"Rosa",ocean:"Ozean",emerald:"Smaragd"}},
 en:{heading:"Profile background",description:"Customize the header of your public profile.",theme:"Color theme",url:"Custom background image (HTTPS image URL)",placeholder:"https://example.com/banner.jpg",hint:"Supports direct GIF URLs (e.g. media.tenor.com), Tenor links and JPG/PNG. External images may share your IP address with the provider.",save:"Save background",saved:"Background saved ✓",error:"Could not save: ",invalid:"Please enter a valid HTTPS image URL.",preview:"Preview",remove:"Remove image",ownColor:"Use custom color",outline:"Name outline",outlineHint:"Outline color for your display name (default: black).",outlinePreview:"Name preview",position:"Image framing",horizontal:"Horizontal",vertical:"Vertical",zoom:"Zoom",reset:"Reset",drag:"Drag the image in the preview or use the sliders.",colors:{violet:"Purple",midnight:"Midnight",rose:"Rose",ocean:"Ocean",emerald:"Emerald"}}
};
const language=()=>window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang")||"de";
function validUrl(value){if(!value)return true;try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&value.length<=1200&&!/[<>"'\\\s]/.test(value)}catch{return false}}
function tenorEmbed(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname))return null;const match=u.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:view\/(?:[^/]*-)?|embed\/)(\d+)\/?$/);return match?"https://tenor.com/embed/"+match[1]:null;}catch{return null;}}
async function resolveTenorShort(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname)||!/^\/[A-Za-z0-9_-]+\.gif\/?$/.test(u.pathname))return value;const response=await fetch("https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/resolve-tenor-gif?url="+encodeURIComponent(value));if(!response.ok)return value;const data=await response.json();return typeof data.url==="string"&&validUrl(data.url)?data.url:value;}catch{return value;}}
function applyFraming(media,x,y,zoom){
 const px=Math.min(100,Math.max(0,Number(x))),py=Math.min(100,Math.max(0,Number(y))),z=Math.min(200,Math.max(100,Number(zoom)));
 media.style.objectPosition=px+"% "+py+"%";
 media.style.transformOrigin=px+"% "+py+"%";
 media.style.transform="scale("+(z/100)+")";
}
function styleBanner(node,theme,image,customColor="",x=50,y=50,zoom=100){
 const [start,end,accent]=themes[theme]||themes.violet;
 const solid=/^#[0-9a-fA-F]{6}$/.test(customColor)?customColor:"";
 node.style.setProperty("--banner-start",start);node.style.setProperty("--banner-end",end);node.style.setProperty("--banner-accent",accent);
 node.style.backgroundColor=solid||end;node.style.backgroundPosition="center";node.style.backgroundSize="cover";
 let media=node.querySelector(":scope > .akame-banner-media");
 const embed=image&&validUrl(image)?tenorEmbed(image):null;
 const mediaUrl=embed||image;
 if(image&&validUrl(image)){
  node.style.backgroundImage="linear-gradient(120deg,var(--banner-start),var(--banner-end))";
  if(!media||media.dataset.bannerUrl!==mediaUrl||media.tagName!==(embed?"IFRAME":"IMG")){
   if(media)media.remove();
   media=document.createElement(embed?"iframe":"img");media.className="akame-banner-media";
   if(embed){media.src=embed;media.title="Tenor GIF banner";media.referrerPolicy="no-referrer";media.setAttribute("sandbox","allow-scripts allow-same-origin");}
   else{media.src=image;media.alt="";media.decoding="async";media.referrerPolicy="no-referrer";}
   media.dataset.bannerUrl=mediaUrl;
   media.style.cssText="position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;z-index:0;object-fit:cover;display:block";
   node.prepend(media);
  }
  applyFraming(media,x,y,zoom);
 }else{
  if(media)media.remove();
  if(solid)node.style.backgroundImage="none";
  else node.style.backgroundImage="radial-gradient(ellipse at 88% 10%,color-mix(in srgb,var(--banner-accent) 28%,transparent),transparent 63%),linear-gradient(120deg,var(--banner-start),var(--banner-end))";
 }
}

if(document.getElementById("profile-content")){
 const container=document.getElementById("profile-content");
 const panel=document.createElement("section");panel.className="panel akame-appearance-editor";panel.setAttribute("aria-label","Profile background");
 panel.innerHTML='<div class="appearance-head"><div><h3 id="appearance-heading"></h3><p id="appearance-description"></p></div></div><div class="appearance-preview" id="appearance-preview"><span id="appearance-preview-label"></span></div><label for="appearance-theme" id="appearance-theme-label"></label><select id="appearance-theme"></select><label class="appearance-color-choice"><input type="checkbox" id="appearance-use-color"><span id="appearance-color-label"></span><input type="color" id="appearance-color" value="#563485" aria-label="Color"></label><label for="appearance-url" id="appearance-url-label"></label><div class="appearance-url-row"><input type="url" id="appearance-url" maxlength="1200" autocomplete="off" inputmode="url"><button type="button" class="secondary" id="appearance-remove"></button></div><p class="appearance-hint" id="appearance-hint"></p><div id="appearance-framing" class="appearance-framing" hidden><div class="appearance-framing-head"><strong id="appearance-position-label"></strong><button type="button" id="appearance-reset" class="secondary"></button></div><p id="appearance-drag-tip" class="appearance-drag-tip"></p><div class="appearance-sliders"><label for="appearance-x"><span id="appearance-horizontal-label"></span><output id="appearance-x-value">50%</output><input type="range" id="appearance-x" min="0" max="100" value="50"></label><label for="appearance-y"><span id="appearance-vertical-label"></span><output id="appearance-y-value">50%</output><input type="range" id="appearance-y" min="0" max="100" value="50"></label><label for="appearance-zoom"><span id="appearance-zoom-label"></span><output id="appearance-zoom-value">100%</output><input type="range" id="appearance-zoom" min="100" max="200" value="100"></label></div></div><div class="appearance-outline-settings"><div class="appearance-outline-heading"><label for="appearance-outline-color" id="appearance-outline-label"></label><input id="appearance-outline-color" type="color" value="#000000" aria-label="Name outline color"></div><p id="appearance-outline-hint" class="appearance-hint"></p><div id="appearance-outline-preview" class="appearance-name-preview">Akame</div></div><div class="appearance-save-row"><button type="button" id="appearance-save" hidden></button><span id="appearance-message" role="status" aria-live="polite"></span></div>';
 const customEnabled=panel.querySelector("#appearance-use-color"),customInput=panel.querySelector("#appearance-color");
 const framing=panel.querySelector("#appearance-framing"),xInput=panel.querySelector("#appearance-x"),yInput=panel.querySelector("#appearance-y"),zoomInput=panel.querySelector("#appearance-zoom");
 const outlineInput=panel.querySelector("#appearance-outline-color"),outlinePreview=panel.querySelector("#appearance-outline-preview");
 const select=panel.querySelector("#appearance-theme"),input=panel.querySelector("#appearance-url"),preview=panel.querySelector("#appearance-preview"),save=panel.querySelector("#appearance-save"),remove=panel.querySelector("#appearance-remove"),message=panel.querySelector("#appearance-message");
 for(const key of Object.keys(themes)){const option=document.createElement("option");option.value=key;select.append(option);}
 let initial={theme:"violet",url:"",color:"",x:50,y:50,zoom:100,outline:"#000000"};let previewRequest=0;
 function translate(){const t=strings[language()]||strings.de;panel.querySelector("#appearance-heading").textContent=t.heading;panel.querySelector("#appearance-description").textContent=t.description;panel.querySelector("#appearance-preview-label").textContent=t.preview;panel.querySelector("#appearance-theme-label").textContent=t.theme;panel.querySelector("#appearance-url-label").textContent=t.url;panel.querySelector("#appearance-hint").textContent=t.hint;input.placeholder=t.placeholder;panel.querySelector("#appearance-color-label").textContent=t.ownColor;panel.querySelector("#appearance-outline-label").textContent=t.outline;panel.querySelector("#appearance-outline-hint").textContent=t.outlineHint;outlinePreview.setAttribute("aria-label",t.outlinePreview);panel.querySelector("#appearance-position-label").textContent=t.position;panel.querySelector("#appearance-horizontal-label").textContent=t.horizontal;panel.querySelector("#appearance-vertical-label").textContent=t.vertical;panel.querySelector("#appearance-zoom-label").textContent=t.zoom;panel.querySelector("#appearance-reset").textContent=t.reset;panel.querySelector("#appearance-drag-tip").textContent=t.drag;remove.textContent=t.remove;save.textContent=t.save;for(const option of select.options)option.textContent=t.colors[option.value]}
 function render(){
  const url=input.value.trim();
  const themeLabel=panel.querySelector("#appearance-theme-label");
  const colorChoice=panel.querySelector(".appearance-color-choice");
  select.hidden=!!url;themeLabel.hidden=!!url;colorChoice.hidden=!!url;
  if(url)customEnabled.checked=false;customEnabled.disabled=!!url;
  const color=!url&&customEnabled.checked?customInput.value:"";customInput.disabled=!!url||!customEnabled.checked;
  framing.hidden=!url;
  outlinePreview.style.webkitTextStroke="1px "+outlineInput.value;
  outlinePreview.style.textShadow="1px 1px 0 "+outlineInput.value+",-1px -1px 0 "+outlineInput.value+",1px -1px 0 "+outlineInput.value+",-1px 1px 0 "+outlineInput.value;
  const x=Number(xInput.value),y=Number(yInput.value),zoom=Number(zoomInput.value);
  for(const [key,n] of [["x",x],["y",y],["zoom",zoom]])panel.querySelector("#appearance-"+key+"-value").textContent=n+"%";
  styleBanner(preview,select.value,validUrl(url)?url:"",color,x,y,zoom);
  const request=++previewRequest;
  if(url&&validUrl(url)&&/^https:\/\/(?:www\.)?tenor\.com\/[A-Za-z0-9_-]+\.gif\/?$/i.test(url))resolveTenorShort(url).then(resolved=>{if(request===previewRequest&&resolved!==url)styleBanner(preview,select.value,resolved,color,x,y,zoom)});
  const changed=select.value!==initial.theme||url!==initial.url||color!==initial.color||x!==initial.x||y!==initial.y||zoom!==initial.zoom||outlineInput.value!==initial.outline;
  save.hidden=!changed;save.style.display=changed?"inline-flex":"none";message.textContent="";
 }

 let dragStart=null;
 preview.addEventListener("pointerdown",event=>{
  if(!input.value.trim()||event.button!==0)return;
  dragStart={x:event.clientX,y:event.clientY,px:Number(xInput.value),py:Number(yInput.value)};
  preview.setPointerCapture(event.pointerId);
 });
 preview.addEventListener("pointermove",event=>{
  if(!dragStart)return;
  const box=preview.getBoundingClientRect();
  xInput.value=Math.min(100,Math.max(0,Math.round(dragStart.px+(event.clientX-dragStart.x)*100/box.width)));
  yInput.value=Math.min(100,Math.max(0,Math.round(dragStart.py+(event.clientY-dragStart.y)*100/box.height)));
  render();
 });
 const endDrag=()=>{dragStart=null;};
 preview.addEventListener("pointerup",endDrag);preview.addEventListener("pointercancel",endDrag);
 select.addEventListener("change",render);customEnabled.addEventListener("change",render);customInput.addEventListener("input",render);outlineInput.addEventListener("input",render);input.addEventListener("input",render);for(const el of [xInput,yInput,zoomInput])el.addEventListener("input",render);panel.querySelector("#appearance-reset").addEventListener("click",()=>{xInput.value=50;yInput.value=50;zoomInput.value=100;render()});remove.addEventListener("click",()=>{input.value="";render()});
 translate();document.addEventListener("akame-language-change",translate);
 const profileSection=container.querySelector(".panel.lead");if(profileSection)profileSection.after(panel);else container.append(panel);
 (async()=>{const {data:{user},error}=await db.auth.getUser();if(error||!user)return;const result=await db.from("profile_appearance").select("theme,banner_url,custom_color,banner_position_x,banner_position_y,banner_zoom,name_outline_color").eq("user_id",user.id).maybeSingle();if(result.error){message.textContent=(strings[language()]||strings.de).error+result.error.message;return;}initial={theme:themes[result.data?.theme]?result.data.theme:"violet",url:result.data?.banner_url||"",color:result.data?.banner_url?"":(result.data?.custom_color||""),x:result.data?.banner_position_x??50,y:result.data?.banner_position_y??50,zoom:result.data?.banner_zoom??100,outline:result.data?.name_outline_color||"#000000"};outlineInput.value=initial.outline;select.value=initial.theme;input.value=initial.url;customEnabled.checked=!!initial.color;if(initial.color)customInput.value=initial.color;xInput.value=initial.x;yInput.value=initial.y;zoomInput.value=initial.zoom;render();
 save.addEventListener("click",async()=>{const image=input.value.trim();if(!validUrl(image)){message.textContent=(strings[language()]||strings.de).invalid;return;}save.disabled=true;const resolvedImage=image?await resolveTenorShort(image):"";const finalImage=resolvedImage&&validUrl(resolvedImage)?resolvedImage:image;const result=await db.from("profile_appearance").upsert({user_id:user.id,theme:select.value,banner_url:finalImage||null,custom_color:finalImage?null:(customEnabled.checked?customInput.value:null),banner_position_x:Number(xInput.value),banner_position_y:Number(yInput.value),banner_zoom:Number(zoomInput.value),name_outline_color:outlineInput.value,updated_at:new Date().toISOString()},{onConflict:"user_id"});save.disabled=false;if(result.error){message.textContent=(strings[language()]||strings.de).error+result.error.message;return;}initial={theme:select.value,url:finalImage,color:finalImage?"":(customEnabled.checked?customInput.value:""),x:Number(xInput.value),y:Number(yInput.value),zoom:Number(zoomInput.value),outline:outlineInput.value};input.value=finalImage;render();message.textContent=(strings[language()]||strings.de).saved;});
 })();
}
export {styleBanner};
