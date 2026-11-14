import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
// One account lookup shared by the community feed and personal dashboard.
export const db = createClient('https://wycdpuzlbivtfxwtarzn.supabase.co','sb_publishable_NBEO1vyOgowogxmZyr9ycA_DgObmPT0');
export const userReady = db.auth.getUser().then(({data,error}) => error ? null : data?.user || null).catch(() => null);
const profiles = new Map();
export function getPublicProfile(id) {
  if (!profiles.has(id)) profiles.set(id, db.rpc('get_public_profile',{p_user_id:id}).then(result => { if (result.error) profiles.delete(id); return result; }).catch(error => {profiles.delete(id); return {data:null,error};}));
  return profiles.get(id);
}
db.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') {profiles.clear();document.dispatchEvent(new CustomEvent('akame-community-signout'));}
});
