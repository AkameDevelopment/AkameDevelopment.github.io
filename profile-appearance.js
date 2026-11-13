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
 de:{heading:"Profilhintergrund",description:"Gestalte den Hintergrund deines öffentlichen Profilkopfes.",theme:"Farbthema",url:"Eigenes Hintergrundbild (HTTPS-Bild-URL)",placeholder:"https://example.com/banner.jpg",hint:"Unterstützt direkte GIF-URLs (z. B. media.tenor.com), Tenor-Links sowie JPG/PNG. Externe Bilder können deine IP-Adresse an den Anbieter übertragen.",save:"Hintergrund speichern",saved:"Hintergrund gespeichert ✓",error:"Speichern fehlgeschlagen: ",invalid:"Bitte eine gültige HTTPS-Bild-URL eingeben.",preview:"Vorschau",remove:"Bild entfernen",ownColor:"Eigene Farbe verwenden",colors:{violet:"Lila",midnight:"Mitternacht",rose:"Rosa",ocean:"Ozean",emerald:"Smaragd"}},
 en:{heading:"Profile background",description:"Customize the header of your public profile.",theme:"Color theme",url:"Custom background image (HTTPS image URL)",placeholder:"https://example.com/banner.jpg",hint:"Supports direct GIF URLs (e.g. media.tenor.com), Tenor links and JPG/PNG. External images may share your IP address with the provider.",save:"Save background",saved:"Background saved ✓",error:"Could not save: ",invalid:"Please enter a valid HTTPS image URL.",preview:"Preview",remove:"Remove image",ownColor:"Use custom color",colors:{violet:"Purple",midnight:"Midnight",rose:"Rose",ocean:"Ocean",emerald:"Emerald"}}
};
const language=()=>window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang")||"de";
function validUrl(value){if(!value)return true;try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&value.length<=1200&&!/[<>"'\\\s]/.test(value)}catch{return false}}
function tenorEmbed(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname))return null;const match=u.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:view\/(?:[^/]*-)?|embed\/)(\d+)\/?$/);return match?"https://tenor.com/embed/"+match[1]:null;}catch{return null;}}
async function resolveTenorShort(value){try{const u=new URL(value);if(!["tenor.com","www.tenor.com"].includes(u.hostname)||!/^\/[A-Za-z0-9_-]+\.gif\/?$/.test(u.pathname))return value;const response=await fetch("https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/resolve-tenor-gif?url="+encodeURIComponent(value));if(!response.ok)return value;const data=await response.json();return typeof data.url==="string"&&validUrl(data.url)?data.url:value;}catch{return value;}}
function styleBanner(node,theme,image,customColor=""){
 const previous=node.querySelector(":scope > .akame-tenor-banner");if(previous)previous.remove();
 const [start,end,accent]=themes[theme]||themes.violet;
 const solid=/^#[0-9a-fA-F]{6}$/.test(customColor)?customColor:"";
 node.style.setProperty("--banner-start",start);
 node.style.setProperty("--banner-end",end);
 node.style.setProperty("--banner-accent",accent);
 node.style.backgroundColor=solid||end;
 const embed=image&&validUrl(image)?tenorEmbed(image):null;
 if(embed){node.style.backgroundImage="linear-gradient(120deg,var(--banner-start),var(--banner-end))";node.style.position="relative";node.style.overflow="hidden";const frame=document.createElement("iframe");frame.className="akame-tenor-banner";frame.src=embed;frame.loading="lazy";frame.title="Tenor GIF banner";frame.referrerPolicy="no-referrer";frame.setAttribute("sandbox","allow-scripts allow-same-origin");frame.style.cssText="position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;z-index:0";node.prepend(frame);}
 else if(image&&validUrl(image)){node.style.backgroundImage='linear-gradient(90deg,rgba(10,7,19,.66),rgba(11,7,19,.28)),url("'+image.replace(/"/g,"%22")+'")';node.style.backgroundPosition="center";node.style.backgroundSize="cover";}
 else if(solid){node.style.backgroundImage="none";}
 else{node.style.backgroundImage="radial-gradient(ellipse at 88% 10%,color-mix(in srgb,var(--banner-accent) 28%,transparent),transparent 63%),linear-gradient(120deg,var(--banner-start),var(--banner-end))";node.style.backgroundPosition="center";node.style.backgroundSize="cover";}
}
if(document.getElementById("profile-content")){
 const container=document.getElementById("profile-content");
 const panel=document.createElement("section");panel.className="panel akame-appearance-editor";panel.setAttribute("aria-label","Profile background");
 panel.innerHTML='<div class="appearance-head"><div><h3 id="appearance-heading"></h3><p id="appearance-description"></p></div></div><div class="appearance-preview" id="appearance-preview"><span id="appearance-preview-label"></span></div><label for="appearance-theme" id="appearance-theme-label"></label><select id="appearance-theme"></select><label class="appearance-color-choice"><input type="checkbox" id="appearance-use-color"><span id="appearance-color-label"></span><input type="color" id="appearance-color" value="#563485" aria-label="Color"></label><label for="appearance-url" id="appearance-url-label"></label><div class="appearance-url-row"><input type="url" id="appearance-url" maxlength="1200" autocomplete="off" inputmode="url"><button type="button" class="secondary" id="appearance-remove"></button></div><p class="appearance-hint" id="appearance-hint"></p><div class="appearance-save-row"><button type="button" id="appearance-save" hidden></button><span id="appearance-message" role="status" aria-live="polite"></span></div>';
 const customEnabled=panel.querySelector("#appearance-use-color"),customInput=panel.querySelector("#appearance-color");
 const select=panel.querySelector("#appearance-theme"),input=panel.querySelector("#appearance-url"),preview=panel.querySelector("#appearance-preview"),save=panel.querySelector("#appearance-save"),remove=panel.querySelector("#appearance-remove"),message=panel.querySelector("#appearance-message");
 for(const key of Object.keys(themes)){const option=document.createElement("option");option.value=key;select.append(option);}
 let initial={theme:"violet",url:"",color:""};let previewRequest=0;
 function translate(){const t=strings[language()]||strings.de;panel.querySelector("#appearance-heading").textContent=t.heading;panel.querySelector("#appearance-description").textContent=t.description;panel.querySelector("#appearance-preview-label").textContent=t.preview;panel.querySelector("#appearance-theme-label").textContent=t.theme;panel.querySelector("#appearance-url-label").textContent=t.url;panel.querySelector("#appearance-hint").textContent=t.hint;input.placeholder=t.placeholder;panel.querySelector("#appearance-color-label").textContent=t.ownColor;remove.textContent=t.remove;save.textContent=t.save;for(const option of select.options)option.textContent=t.colors[option.value]}
 function render(){const url=input.value.trim();if(url)customEnabled.checked=false;customEnabled.disabled=!!url;const color=!url&&customEnabled.checked?customInput.value:"";customInput.disabled=!!url||!customEnabled.checked;styleBanner(preview,select.value,validUrl(url)?url:"",color);const request=++previewRequest;if(url&&validUrl(url)&&/^https:\/\/(?:www\.)?tenor\.com\/[A-Za-z0-9_-]+\.gif\/?$/i.test(url)){resolveTenorShort(url).then(resolved=>{if(request===previewRequest&&resolved!==url)styleBanner(preview,select.value,resolved,color)})}const changed=select.value!==initial.theme||url!==initial.url||color!==initial.color;save.hidden=!changed;save.style.display=changed?"inline-flex":"none";message.textContent=""}
 select.addEventListener("change",render);customEnabled.addEventListener("change",render);customInput.addEventListener("input",render);input.addEventListener("input",render);remove.addEventListener("click",()=>{input.value="";render()});
 translate();document.addEventListener("akame-language-change",translate);
 const publicLink=container.querySelector(".profile-public-link");if(publicLink)publicLink.after(panel);else container.prepend(panel);
 (async()=>{const {data:{user},error}=await db.auth.getUser();if(error||!user)return;const result=await db.from("profile_appearance").select("theme,banner_url,custom_color").eq("user_id",user.id).maybeSingle();if(result.error){message.textContent=(strings[language()]||strings.de).error+result.error.message;return;}initial={theme:themes[result.data?.theme]?result.data.theme:"violet",url:result.data?.banner_url||"",color:result.data?.banner_url?"":(result.data?.custom_color||"")};select.value=initial.theme;input.value=initial.url;customEnabled.checked=!!initial.color;if(initial.color)customInput.value=initial.color;render();
 save.addEventListener("click",async()=>{const image=input.value.trim();if(!validUrl(image)){message.textContent=(strings[language()]||strings.de).invalid;return;}save.disabled=true;const resolvedImage=image?await resolveTenorShort(image):"";const finalImage=resolvedImage&&validUrl(resolvedImage)?resolvedImage:image;const result=await db.from("profile_appearance").upsert({user_id:user.id,theme:select.value,banner_url:finalImage||null,custom_color:finalImage?null:(customEnabled.checked?customInput.value:null),updated_at:new Date().toISOString()},{onConflict:"user_id"});save.disabled=false;if(result.error){message.textContent=(strings[language()]||strings.de).error+result.error.message;return;}initial={theme:select.value,url:finalImage,color:finalImage?"":(customEnabled.checked?customInput.value:"")};input.value=finalImage;render();message.textContent=(strings[language()]||strings.de).saved;});
 })();
}
export {styleBanner};
