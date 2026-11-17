/* AkameDevelopment safe rich text: **bold** in public/user-authored content.
   DOM-only rendering: never parse untrusted text as HTML. */
(()=>{"use strict";
  const forbidden="script,style,noscript,textarea,input,select,option,button,pre,code,kbd,samp,svg,math,[contenteditable],[data-no-richtext]";
  const bold=/\*\*([^*\n]+?)\*\*/g;
  function transform(node){
    if(node.nodeType!==Node.TEXT_NODE || !node.nodeValue?.includes("**"))return;
    const parent=node.parentElement;
    if(!parent || parent.closest(forbidden))return;
    const value=node.nodeValue;
    bold.lastIndex=0;
    let match,pos=0,changed=false;
    const fragment=document.createDocumentFragment();
    while((match=bold.exec(value))){
      if(match.index>pos)fragment.append(document.createTextNode(value.slice(pos,match.index)));
      const strong=document.createElement("strong");
      strong.textContent=match[1];
      fragment.append(strong);
      pos=bold.lastIndex;
      changed=true;
    }
    if(!changed)return;
    if(pos<value.length)fragment.append(document.createTextNode(value.slice(pos)));
    node.replaceWith(fragment);
  }
  function scan(root){
    if(!root || root.nodeType===Node.TEXT_NODE){if(root)transform(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;
    if(root.nodeType===Node.ELEMENT_NODE && root.matches(forbidden))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        if(!node.nodeValue?.includes("**"))return NodeFilter.FILTER_REJECT;
        if(node.parentElement?.closest(forbidden))return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const matches=[];
    while(walker.nextNode())matches.push(walker.currentNode);
    matches.forEach(transform);
  }
  function start(){
    scan(document.body);
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==="characterData")transform(record.target);
        else for(const node of record.addedNodes)scan(node);
      }
    });
    observer.observe(document.body,{childList:true,characterData:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();