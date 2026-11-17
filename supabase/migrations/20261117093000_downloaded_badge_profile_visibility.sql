-- Award the existing Download badge once a signed-in user starts a mod download,
-- and let each user hide all profile badges without deleting their grants.
alter table public.user_profiles
  add column if not exists show_profile_badges boolean not null default true;

alter table public.profile_badge_definitions
  add column if not exists system_key text;

create unique index if not exists profile_badge_definitions_system_key_unique
  on public.profile_badge_definitions(system_key)
  where system_key is not null;

update public.profile_badge_definitions
set system_key='downloaded',
    name='Downloaded',
    description='Has downloaded a mod from AkameDevelopment.'
where id=(
  select id from public.profile_badge_definitions
  where system_key='downloaded'
     or (system_key is null and lower(name) in ('download','downloaded','heruntergeladen') and icon='download')
  order by (system_key='downloaded') desc, id
  limit 1
);

insert into public.profile_badge_definitions(name,icon,color,description,system_key)
select 'Downloaded','download','#69d8bf','Has downloaded a mod from AkameDevelopment.','downloaded'
where not exists(select 1 from public.profile_badge_definitions where system_key='downloaded');

insert into public.profile_badge_grants(user_id,badge_id)
select distinct events.user_id,badges.id
from public.download_events events
cross join public.profile_badge_definitions badges
where events.user_id is not null and badges.system_key='downloaded'
on conflict(user_id,badge_id) do nothing;

create or replace function private.grant_downloaded_badge()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  downloaded_badge_id bigint;
begin
  if new.user_id is null then
    return new;
  end if;

  select id into downloaded_badge_id
  from public.profile_badge_definitions
  where system_key='downloaded'
  limit 1;

  if downloaded_badge_id is not null then
    insert into public.profile_badge_grants(user_id,badge_id)
    values(new.user_id,downloaded_badge_id)
    on conflict(user_id,badge_id) do nothing;
  end if;
  return new;
end
$function$;

revoke all on function private.grant_downloaded_badge() from public,anon,authenticated;
drop trigger if exists grant_downloaded_badge_after_event on public.download_events;
create trigger grant_downloaded_badge_after_event
after insert on public.download_events
for each row execute function private.grant_downloaded_badge();

drop function public.get_public_profile(uuid);
create function public.get_public_profile(p_user_id uuid)
returns table(
  display_name text,
  bio text,
  show_member_since boolean,
  avatar_url text,
  created_at timestamptz,
  role text,
  smp_member boolean,
  show_profile_badges boolean
)
language sql
stable
security definer
set search_path=''
as $function$
  select coalesce(up.display_name,cp.display_name),
         up.bio,
         coalesce(up.show_member_since,true),
         cp.avatar_url,
         case when coalesce(up.show_member_since,true) then cp.created_at else null::timestamptz end,
         (select s.role from public.staff_access s where s.user_id=p_user_id limit 1),
         exists(select 1 from public.akamesmp_members a where a.user_id=p_user_id),
         coalesce(up.show_profile_badges,true)
  from public.community_profiles cp
  left join public.user_profiles up on up.user_id=cp.user_id
  where cp.user_id=p_user_id
$function$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to anon,authenticated;
