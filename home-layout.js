(()=>{"use strict";
 const language=()=>window.AkameLanguage?.get?.()||localStorage.getItem("akame-lang")||"de";
 function apply(){
  const english=language()==="en";
  document.querySelectorAll("[data-home-de][data-home-en]").forEach(node=>{
   const next=node.getAttribute(english?"data-home-en":"data-home-de");
   if(node.textContent!==next)node.textContent=next;
  });
  document.title=english?"AkameDevelopment · Your world. Your next level.":"AkameDevelopment · Deine Welt. Dein nächstes Level.";
  const description=document.querySelector('meta[name="description"]');
  if(description)description.content=english?"Discover Minecraft mods, explore AkameSMP and connect with the AkameDevelopment community.":"Entdecke Minecraft-Mods, erlebe AkameSMP und werde Teil der AkameDevelopment-Community.";
  window.akameRefreshProjects?.();
 }
 apply();document.addEventListener("akame-language-change",apply);
})();
