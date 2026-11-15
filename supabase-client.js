/* One auth client per page: shared session handling and concurrent user checks. */
import {createClient as createSupabaseClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
const endpoint='https://wycdpuzlbivtfxwtarzn.supabase.co';
let shared;
export function createClient(url,key,options){
 if(url!==endpoint)return createSupabaseClient(url,key,options);
 if(shared)return shared;
 shared=createSupabaseClient(url,key,{...options,auth:{...options?.auth,flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 // Coalesce only requests already in flight; never cache authorization results.
 const getUser=shared.auth.getUser.bind(shared.auth);let pending=null;
 shared.auth.getUser=(jwt)=>{
  if(jwt)return getUser(jwt);
  if(!pending){const request=Promise.resolve().then(()=>getUser());pending=request;request.finally(()=>{if(pending===request)pending=null;}).catch(()=>{});}
  return pending;
 };
 shared.auth.onAuthStateChange(event=>{if(event!=='INITIAL_SESSION')pending=null;});
 return shared;
}
