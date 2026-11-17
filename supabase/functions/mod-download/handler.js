export function createDownloadHandler({url,anon,service,createClient}){
 const origins=new Set(['https://akamedevelopment.github.io']);
 return async request=>{
  const origin=request.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&origins.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization,apikey,content-type';headers['Access-Control-Allow-Methods']='POST,OPTIONS';}
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  try{
   const body=await request.json();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.release_id||''))return reply({error:'Invalid release'},400);
   const authorization=request.headers.get('authorization');let userId=null;
   const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:authorization?{Authorization:authorization}:{}}});
   if(authorization){const token=authorization.match(/^Bearer (.+)$/i)?.[1];if(!token)return reply({error:'Sign in again'},401);const {data,error}=await client.auth.getUser(token);if(error||!data.user)return reply({error:'Sign in again'},401);userId=data.user.id;}
   const {data:release,error}=await client.from('mod_releases').select('id,storage_path,file_name,published,mod_catalogue!inner(published,visibility)').eq('id',body.release_id).eq('published',true).single();
   const mod=release?.mod_catalogue;
   if(error||!release?.storage_path||!mod?.published||!['public','beta'].includes(mod.visibility))return reply({error:'Release unavailable or access denied'},404);
   const signed=await client.storage.from('mod-files').createSignedUrl(release.storage_path,60,{download:release.file_name});
   if(signed.error||!signed.data?.signedUrl)return reply({error:'Download access denied'},403);
   let recorded=false;
   if(userId){const trusted=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const result=await trusted.rpc('record_verified_download',{p_release_id:release.id,p_user_id:userId,p_source:body.source==='library'?'library':'downloads'});recorded=!result.error;if(result.error)console.error('Verified download recorder failed',result.error.code);}
   return reply({url:signed.data.signedUrl,recorded});
  }catch{return reply({error:'Unable to prepare the download'},400);}
 };
}
