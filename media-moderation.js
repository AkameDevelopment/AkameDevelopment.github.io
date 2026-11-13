/* Shared media moderation gate. Never publish a new image when moderation is unavailable. */
(()=>{"use strict";
const ENDPOINT="https://wycdpuzlbivtfxwtarzn.supabase.co/functions/v1/moderate-media";
async function check(url,accessToken,payload={}){
 if(!url)return {allowed:true};
 let parsed;try{parsed=new URL(url)}catch{return {allowed:false,reason:"invalid_url"}}
 if(parsed.protocol!=="https:"||parsed.username||parsed.password)return {allowed:false,reason:"invalid_url"};
 if(!accessToken)return {allowed:false,reason:"authentication_required"};
 try{
  const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+accessToken},body:JSON.stringify({url:parsed.href,...payload})});
  const result=await response.json();
  if(!response.ok||result.status!=="approved")return {allowed:false,reason:result.reason||result.status||"review_required",pending:result.status==="review_required",review_id:result.review_id};
  return {allowed:true,reason:"approved"};
 }catch{return {allowed:false,reason:"service_unavailable"}}
}
window.AkameMediaModeration={check};
})();