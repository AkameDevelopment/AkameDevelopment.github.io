// Only the public badge catalogue is cached. Identity, privacy settings, grants,
// comments and viewer permissions are always read afresh.
async function badgeDefinitions(db) {
 const key='akame-public-badge-definitions-v1';
 try {
  const entry=JSON.parse(sessionStorage.getItem(key)||'null');
  const age=Date.now()-entry?.at;
  if(age>=0&&age<300000&&Array.isArray(entry?.data))return {data:entry.data,error:null};
 } catch {}
 const result=await db.from('profile_badge_definitions').select('id,name,icon,color,description');
 if(!result.error&&Array.isArray(result.data)) {
  try {sessionStorage.setItem(key,JSON.stringify({at:Date.now(),data:result.data}));} catch {}
 }
 return result;
}

export function startPublicProfileReads(db,id) {
 // Convert optional failures into ordinary results immediately so a rejected
 // request cannot go unhandled while another part of the page is rendering.
 const read=query=>Promise.resolve().then(query).catch(error=>({data:null,error}));
 const viewer=read(()=>db.auth.getUser()).then(result=>({...result,data:result.data||{user:null}}));
 const staff=viewer.then(({data:{user}})=>user
  ?read(()=>db.from('staff_access').select('role').eq('user_id',user.id).maybeSingle())
  :{data:null});
 return {
  viewer,staff,
  profile:read(()=>db.rpc('get_public_profile',{p_user_id:id})),
  comments:read(()=>db.from('mod_comments').select('id,project_slug,author_id,author_name,author_avatar_url,body,created_at,parent_id').eq('author_id',id).is('parent_id',null).order('created_at',{ascending:false}).limit(100)),
  gallery:read(()=>db.from('profile_gallery').select('slot,image_url').eq('user_id',id).order('slot')),
  mods:read(()=>db.from('profile_mods').select('mod_slug').eq('user_id',id)),
  appearance:read(()=>db.from('profile_appearance').select('theme,banner_url,custom_color,banner_position_x,banner_position_y,banner_zoom,name_outline_color').eq('user_id',id).maybeSingle()),
  badgeDefinitions:read(()=>badgeDefinitions(db)),
  badgeGrants:read(()=>db.from('profile_badge_grants').select('badge_id').eq('user_id',id)),
  discord:read(()=>db.rpc('get_profile_discord_name',{p_user_id:id})),
  posts:read(()=>db.from('akamesmp_posts').select('id,body,image_url,created_at').eq('author_id',id).order('created_at',{ascending:false}).limit(100)),
  spotify:read(()=>db.rpc('get_public_favorite_spotify_tracks',{p_user_id:id})),
  visibility:read(()=>db.from('mod_visibility').select('project_slug,visibility,visible')),
  beta:viewer.then(({data:{user}})=>user
   ?read(()=>db.from('beta_access').select('project_slug').eq('user_id',user.id))
   :{data:[]})
 };
}
