-- Store per-badge display preferences with the user's own profile.
alter table public.user_profiles
  add column if not exists badge_visibility jsonb not null default '{}'::jsonb;

alter table public.user_profiles
  drop constraint if exists user_profiles_badge_visibility_object;
alter table public.user_profiles
  add constraint user_profiles_badge_visibility_object
  check (jsonb_typeof(badge_visibility)='object');

create or replace function public.get_public_profile_badges(p_user_id uuid)
returns table(id bigint,name text,icon text,color text,description text,system_key text)
language sql
stable
security definer
set search_path=''
as $function$
  select b.id,b.name,b.icon,b.color,b.description,b.system_key
  from public.profile_badge_definitions b
  left join public.profile_badge_grants g
    on g.badge_id=b.id and g.user_id=p_user_id
  left join public.user_profiles up on up.user_id=p_user_id
  where (b.name='Community' or g.user_id is not null)
    and coalesce(up.show_profile_badges,true)
    and coalesce(up.badge_visibility->(b.id::text), 'true'::jsonb) <> 'false'::jsonb
  order by b.id
$function$;

revoke all on function public.get_public_profile_badges(uuid) from public;
grant execute on function public.get_public_profile_badges(uuid) to anon,authenticated;
