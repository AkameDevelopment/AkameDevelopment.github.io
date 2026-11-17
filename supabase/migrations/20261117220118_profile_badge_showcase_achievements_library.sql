-- Extend existing profile/badge/catalogue data. Historical grants and events are preserved.
alter table public.user_profiles add column if not exists badge_showcase bigint[] not null default '{}';
alter table public.user_profiles drop constraint if exists badge_showcase_limit;
alter table public.user_profiles add constraint badge_showcase_limit check(cardinality(badge_showcase)<=3 and array_position(badge_showcase,null) is null);
alter table public.profile_badge_definitions add column if not exists name_de text not null default '';
alter table public.profile_badge_definitions add column if not exists description_de text not null default '';
alter table public.profile_badge_definitions add column if not exists achievement_kind text;
alter table public.profile_badge_definitions add column if not exists achievement_target integer not null default 1;
alter table public.profile_badge_definitions add column if not exists achievement_enabled boolean not null default true;
alter table public.profile_badge_definitions drop constraint if exists achievement_rule_valid;
alter table public.profile_badge_definitions add constraint achievement_rule_valid check((achievement_kind is null or achievement_kind in ('posts','downloads','mods','bugs','days')) and achievement_target between 1 and 10000 and length(name_de)<=80 and length(description_de)<=500);
alter table public.profile_badge_grants add column if not exists grant_source text not null default 'manual' check(grant_source in ('manual','automatic'));
alter table public.download_events add column if not exists verified_at timestamptz;
alter table public.download_events add column if not exists achievement_eligible boolean not null default false;
alter table public.download_events add column if not exists channel text check(channel in ('stable','beta','alpha'));
alter table public.download_events add column if not exists verified_day date generated always as ((created_at at time zone 'UTC')::date) stored;
create unique index if not exists verified_download_daily_unique on public.download_events(user_id,release_id,verified_day) where verified_at is not null;
create index if not exists verified_downloads_user_mod_idx on public.download_events(user_id,mod_slug) where verified_at is not null and achievement_eligible;

-- Only own/admin raw grants. Public profiles use the visibility-filtered RPC below.
drop policy if exists badge_grants_read on public.profile_badge_grants;
create policy badge_grants_read on public.profile_badge_grants for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
revoke select on public.profile_badge_grants from anon;
-- TRUNCATE bypasses RLS; page-level roles never need these schema privileges.
revoke truncate,trigger,references on public.user_profiles,public.profile_badge_definitions,public.profile_badge_grants,public.download_events from anon,authenticated;
revoke insert on public.download_events from authenticated,anon;
do $$ declare cols text;begin select string_agg(quote_ident(column_name),',') into cols from information_schema.columns where table_schema='public' and table_name='download_events';execute 'revoke insert ('||cols||') on public.download_events from authenticated,anon';end $$;
drop policy if exists download_history_insert on public.download_events;
grant select,insert on public.download_events to service_role;
grant select on public.mod_catalogue,public.mod_releases,public.beta_access,public.staff_access to service_role;
revoke insert on public.profile_badge_grants from authenticated;
grant insert(user_id,badge_id) on public.profile_badge_grants to authenticated;

create table if not exists public.profile_badge_revocations(
 user_id uuid not null references auth.users(id) on delete cascade,
 badge_id bigint not null references public.profile_badge_definitions(id) on delete cascade,
 revoked_at timestamptz not null default now(),revoked_by uuid references auth.users(id) on delete set null,
 primary key(user_id,badge_id)
);
alter table public.profile_badge_revocations enable row level security;
revoke all on public.profile_badge_revocations from anon,authenticated;
grant select on public.profile_badge_revocations to authenticated;
drop policy if exists own_badge_revocations on public.profile_badge_revocations;
create policy own_badge_revocations on public.profile_badge_revocations for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));

-- Reuse Downloaded and Bug Hunter, and match any existing equivalent definitions.
update public.profile_badge_definitions set system_key='bug_hunter' where id=(select id from public.profile_badge_definitions where system_key='bug_hunter' or (system_key is null and lower(name)='bug hunter') order by id limit 1);
with rules(key,name,de,icon,color,description,description_de,kind,target) as(values
 ('downloaded','First Download','Erster Download','download','#69d8bf','Start your first verified mod download.','Starte deinen ersten verifizierten Mod-Download.','downloads',1),
 ('first_post','First Post','Erster Beitrag','users','#b58cff','Publish your first Community post.','Veröffentliche deinen ersten Community-Beitrag.','posts',1),
 ('active_member','Active Member','Aktives Mitglied','star','#c497fa','Publish 10 Community posts.','Veröffentliche 10 Community-Beiträge.','posts',10),
 ('mod_collector','Mod Collector','Mod-Sammler','gem','#79b8ff','Download 5 different mods through verified download starts.','Lade 5 verschiedene Mods über verifizierte Download-Starts herunter.','mods',5),
 ('bug_hunter','Bug Hunter','Fehlerjäger','bug','#f5a66a','Have a bug report resolved by the team.','Eine deiner Bugmeldungen wurde vom Team erledigt.','bugs',1),
 ('veteran','Veteran','Veteran','trophy','#e5b957','Be registered for at least one year.','Sei seit mindestens einem Jahr registriert.','days',365)
)
insert into public.profile_badge_definitions(name,name_de,icon,color,description,description_de,system_key,achievement_kind,achievement_target)
select r.name,r.de,r.icon,r.color,r.description,r.description_de,r.key,r.kind,r.target from rules r where not exists(select 1 from public.profile_badge_definitions b where b.system_key=r.key or lower(b.name)=lower(r.name));
update public.profile_badge_definitions set system_key='first_post' where system_key is null and lower(name)='first post';
update public.profile_badge_definitions set system_key='active_member' where system_key is null and lower(name)='active member';
update public.profile_badge_definitions set system_key='mod_collector' where system_key is null and lower(name)='mod collector';
update public.profile_badge_definitions set system_key='veteran' where system_key is null and lower(name)='veteran';
update public.profile_badge_definitions b set name=r.name,name_de=r.de,description=r.description,description_de=r.description_de,achievement_kind=r.kind,achievement_target=r.target from (values
 ('downloaded','First Download','Erster Download','Start your first verified mod download.','Starte deinen ersten verifizierten Mod-Download.','downloads',1),
 ('first_post','First Post','Erster Beitrag','Publish your first Community post.','Veröffentliche deinen ersten Community-Beitrag.','posts',1),
 ('active_member','Active Member','Aktives Mitglied','Publish 10 Community posts.','Veröffentliche 10 Community-Beiträge.','posts',10),
 ('mod_collector','Mod Collector','Mod-Sammler','Download 5 different mods through verified download starts.','Lade 5 verschiedene Mods über verifizierte Download-Starts herunter.','mods',5),
 ('bug_hunter','Bug Hunter','Fehlerjäger','Have a bug report resolved by the team.','Eine deiner Bugmeldungen wurde vom Team erledigt.','bugs',1),
 ('veteran','Veteran','Veteran','Be registered for at least one year.','Sei seit mindestens einem Jahr registriert.','days',365)
)r(key,name,de,description,description_de,kind,target) where b.system_key=r.key and b.achievement_kind is null;

create or replace function private.achievement_counts(p_uid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_uid is null then raise exception 'authentication_required';end if;
 if auth.uid() is not null and auth.uid()<>p_uid and not private.is_admin() then raise exception 'not_authorized';end if;
 return jsonb_build_object('posts',(select count(*) from public.akamesmp_posts where author_id=p_uid),'downloads',(select count(distinct mod_slug) from public.download_events where user_id=p_uid and verified_at is not null and achievement_eligible),'mods',(select count(distinct mod_slug) from public.download_events where user_id=p_uid and verified_at is not null and achievement_eligible),'bugs',(select count(*) from public.community_requests where author_id=p_uid and kind='bug' and status='resolved'),'days',coalesce((select greatest(0,extract(day from now()-created_at)::int) from auth.users where id=p_uid),0));
end $$;
revoke all on function private.achievement_counts(uuid) from public,anon,authenticated;

create or replace function private.evaluate_achievements(p_uid uuid) returns void language plpgsql security definer set search_path='' as $$
declare counts jsonb;
begin
 if p_uid is null then return;end if;
 counts:=private.achievement_counts(p_uid);
 insert into public.profile_badge_grants(user_id,badge_id,grant_source)
 select p_uid,b.id,'automatic' from public.profile_badge_definitions b where b.achievement_kind is not null and b.achievement_enabled and (counts->>b.achievement_kind)::int>=b.achievement_target and not exists(select 1 from public.profile_badge_revocations r where r.user_id=p_uid and r.badge_id=b.id)
 on conflict(user_id,badge_id) do nothing;
end $$;
revoke all on function private.evaluate_achievements(uuid) from public,anon,authenticated;

create or replace function private.guard_achievement_grant() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.profile_badge_definitions;counts jsonb;
begin
 select * into b from public.profile_badge_definitions where id=new.badge_id;
 if b.achievement_kind is not null then
  counts:=private.achievement_counts(new.user_id);
  if (counts->>b.achievement_kind)::int<b.achievement_target then raise exception 'achievement_requirements_not_met';end if;
  if private.is_admin() then delete from public.profile_badge_revocations where user_id=new.user_id and badge_id=new.badge_id;end if;
 end if;return new;
end $$;
revoke all on function private.guard_achievement_grant() from public,anon,authenticated;
drop trigger if exists guard_achievement_grant on public.profile_badge_grants;
create trigger guard_achievement_grant before insert on public.profile_badge_grants for each row execute function private.guard_achievement_grant();
create or replace function private.preserve_achievement_revocation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users where id=old.user_id) and exists(select 1 from public.profile_badge_definitions where id=old.badge_id and achievement_kind is not null) then
 insert into public.profile_badge_revocations(user_id,badge_id,revoked_by) values(old.user_id,old.badge_id,auth.uid()) on conflict(user_id,badge_id) do update set revoked_at=now(),revoked_by=excluded.revoked_by;
 end if;return old;
end $$;
revoke all on function private.preserve_achievement_revocation() from public,anon,authenticated;
drop trigger if exists preserve_achievement_revocation on public.profile_badge_grants;
create trigger preserve_achievement_revocation after delete on public.profile_badge_grants for each row execute function private.preserve_achievement_revocation();

create or replace function private.achievement_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='akamesmp_posts' then perform private.evaluate_achievements(new.author_id);
 elsif tg_table_name='community_requests' and new.kind='bug' and new.status='resolved' then perform private.evaluate_achievements(new.author_id);
 elsif tg_table_name='download_events' and new.verified_at is not null and new.achievement_eligible then perform private.evaluate_achievements(new.user_id);
 end if;return new;
end $$;
revoke all on function private.achievement_event() from public,anon,authenticated;
drop trigger if exists grant_downloaded_badge_after_event on public.download_events;
drop trigger if exists achievement_download on public.download_events;
create trigger achievement_download after insert on public.download_events for each row execute function private.achievement_event();
drop trigger if exists achievement_post on public.akamesmp_posts;
create trigger achievement_post after insert on public.akamesmp_posts for each row execute function private.achievement_event();
drop trigger if exists achievement_bug on public.community_requests;
create trigger achievement_bug after update of status on public.community_requests for each row execute function private.achievement_event();

create or replace function private.own_achievement_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();counts jsonb;result jsonb;
begin
 if uid is null then raise exception 'authentication_required';end if;
 perform private.evaluate_achievements(uid);counts:=private.achievement_counts(uid);
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'name_de',b.name_de,'icon',b.icon,'color',b.color,'description',b.description,'description_de',b.description_de,'kind',b.achievement_kind,'target',b.achievement_target,'enabled',b.achievement_enabled,'progress',least((counts->>b.achievement_kind)::int,b.achievement_target),'earned',g.user_id is not null,'legacy_award',g.user_id is not null and (counts->>b.achievement_kind)::int<b.achievement_target,'revoked',r.user_id is not null) order by b.id),'[]') into result from public.profile_badge_definitions b left join public.profile_badge_grants g on g.badge_id=b.id and g.user_id=uid left join public.profile_badge_revocations r on r.badge_id=b.id and r.user_id=uid where b.achievement_kind is not null;
 return result;
end $$;
revoke all on function private.own_achievement_status() from public,anon;
grant execute on function private.own_achievement_status() to authenticated;
create or replace function public.get_my_achievements() returns jsonb language sql security invoker set search_path='' as $$select private.own_achievement_status()$$;
revoke all on function public.get_my_achievements() from public,anon;grant execute on function public.get_my_achievements() to authenticated;
create or replace function private.refresh_all_achievements() returns integer language plpgsql security definer set search_path='' as $$
declare u record;n int:=0;
begin
 if auth.uid() is not null and not private.is_admin() then raise exception 'not_authorized';end if;
 for u in select id from auth.users loop perform private.evaluate_achievements(u.id);n:=n+1;end loop;return n;
end $$;
revoke all on function private.refresh_all_achievements() from public,anon;
grant execute on function private.refresh_all_achievements() to authenticated;
create or replace function public.admin_refresh_achievements() returns integer language sql security invoker set search_path='' as $$select private.refresh_all_achievements()$$;
revoke all on function public.admin_refresh_achievements() from public,anon;grant execute on function public.admin_refresh_achievements() to authenticated;

create or replace function private.protect_achievement_definition() returns trigger language plpgsql security definer set search_path='' as $$
begin if old.system_key is not null or old.achievement_kind is not null then raise exception 'system_badge_cannot_be_deleted_disable_automatic_awards_instead';end if;return old;end $$;
revoke all on function private.protect_achievement_definition() from public,anon,authenticated;
drop trigger if exists protect_achievement_definition on public.profile_badge_definitions;
create trigger protect_achievement_definition before delete on public.profile_badge_definitions for each row execute function private.protect_achievement_definition();

-- Validate favorites server-side, including virtual Community/Minecraft/real staff badges.
create or replace function private.badge_is_earned(p_uid uuid,p_badge bigint) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profile_badge_definitions b where b.id=p_badge and (b.name='Community' or exists(select 1 from public.profile_badge_grants g where g.user_id=p_uid and g.badge_id=b.id) or(b.system_key='minecraft' and exists(select 1 from public.akamesmp_members m where m.user_id=p_uid)) or exists(select 1 from public.staff_access s where s.user_id=p_uid and ((s.role='owner' and lower(b.name)='owner') or(s.role='admin' and lower(b.name) in ('admin','administrator')) or(s.role='developer' and lower(b.name) in ('developer','entwickler')) or(s.role='staff' and lower(b.name) in ('staff','team'))))))
$$;
revoke all on function private.badge_is_earned(uuid,bigint) from public,anon,authenticated;
create or replace function private.validate_badge_showcase() returns trigger language plpgsql security definer set search_path='' as $$
declare badge bigint;
begin
 if tg_op='UPDATE' and new.badge_showcase is not distinct from old.badge_showcase then return new;end if;
 if auth.uid() is not null and auth.uid()<>new.user_id and (tg_op='UPDATE' or cardinality(new.badge_showcase)>0) then raise exception 'own_showcase_only';end if;
 if cardinality(new.badge_showcase)>3 or (select count(distinct id) from unnest(new.badge_showcase) id)<>cardinality(new.badge_showcase) then raise exception 'showcase_max_three_unique_badges';end if;
 foreach badge in array new.badge_showcase loop if not private.badge_is_earned(new.user_id,badge) then raise exception 'showcase_badge_not_earned';end if;end loop;return new;
end $$;
revoke all on function private.validate_badge_showcase() from public,anon,authenticated;
drop trigger if exists validate_badge_showcase on public.user_profiles;
create trigger validate_badge_showcase before insert or update of badge_showcase on public.user_profiles for each row execute function private.validate_badge_showcase();

create or replace function private.public_profile_badges(p_uid uuid) returns table(id bigint,name text,icon text,color text,description text,system_key text,name_de text,description_de text,showcase_position integer) language sql stable security definer set search_path='' as $$
 with candidates as(select b.*,array_position(up.badge_showcase,b.id) as pos,case when lower(b.name) in ('owner','admin','administrator','developer','entwickler','staff','team') then case when lower(b.name) in ('admin','administrator') then 'role:admin' when lower(b.name) in ('developer','entwickler') then 'role:developer' when lower(b.name) in ('staff','team') then 'role:staff' else 'role:owner' end else 'badge:'||b.id end as unique_key
 from public.profile_badge_definitions b left join public.user_profiles up on up.user_id=p_uid
 where private.badge_is_earned(p_uid,b.id) and coalesce(up.show_profile_badges,true) and coalesce(up.badge_visibility->(b.id::text),'true'::jsonb)<>'false'::jsonb),dedup as(select distinct on(unique_key)* from candidates order by unique_key,pos nulls last,id)
 select d.id,d.name,d.icon,d.color,d.description,d.system_key,d.name_de,d.description_de,d.pos from dedup d order by d.pos nulls last,d.id
$$;
revoke all on function private.public_profile_badges(uuid) from public;grant execute on function private.public_profile_badges(uuid) to anon,authenticated;
drop function public.get_public_profile_badges(uuid);
create function public.get_public_profile_badges(p_user_id uuid) returns table(id bigint,name text,icon text,color text,description text,system_key text,name_de text,description_de text,showcase_position integer) language sql stable security invoker set search_path='' as $$select * from private.public_profile_badges(p_user_id)$$;
revoke all on function public.get_public_profile_badges(uuid) from public;grant execute on function public.get_public_profile_badges(uuid) to anon,authenticated;

-- Beta/alpha release rows themselves are private; public mod descriptions remain discoverable.
alter policy releases_public on public.mod_releases using(published and channel='stable' and exists(select 1 from public.mod_catalogue m where m.slug=mod_releases.mod_slug and m.published and m.visibility='public'));
alter policy releases_member on public.mod_releases using((select private.can_manage_mod_catalogue()) or (select private.is_admin()) or(published and exists(select 1 from public.mod_catalogue m where m.slug=mod_releases.mod_slug and m.published and m.visibility in ('public','beta') and ((m.visibility='public' and mod_releases.channel='stable') or exists(select 1 from public.beta_access b where b.user_id=(select auth.uid()) and b.project_slug=m.slug)))));

-- Service-only recorder: all identity and release metadata come from validated server inputs.
create or replace function public.record_verified_download(p_release_id uuid,p_user_id uuid,p_source text default 'downloads') returns uuid language plpgsql security invoker set search_path='' as $$
declare r record;event_id uuid;
begin
 select v.*,m.name,m.visibility into r from public.mod_releases v join public.mod_catalogue m on m.slug=v.mod_slug where v.id=p_release_id and v.published and m.published and m.visibility in ('public','beta');
 if not found then raise exception 'release_unavailable';end if;
 if not((r.visibility='public' and r.channel='stable') or exists(select 1 from public.beta_access where user_id=p_user_id and project_slug=r.mod_slug) or exists(select 1 from public.staff_access where user_id=p_user_id and role in ('owner','admin','developer'))) then raise exception 'beta_access_required';end if;
 if r.storage_path is null then raise exception 'no_download_file';end if;
 insert into public.download_events(user_id,release_id,mod_slug,mod_name,version,minecraft_version,loader,source,verified_at,achievement_eligible,channel)
 values(p_user_id,r.id,r.mod_slug,r.name,r.version,r.minecraft_version,r.loader,case when p_source in ('downloads','library') then p_source else 'downloads' end,now(),not((r.mod_slug||' '||r.version||' '||r.name)~*'(^|[-_. ])(demo|test|fixture)([-_. ]|$)'),r.channel)
 on conflict(user_id,release_id,verified_day) where verified_at is not null do nothing returning id into event_id;
 return event_id;
end $$;
revoke all on function public.record_verified_download(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_verified_download(uuid,uuid,text) to service_role;

create or replace function public.get_my_mod_library() returns jsonb language sql stable security invoker set search_path='' as $$
 with latest as(select distinct on(mod_slug) * from public.download_events where user_id=(select auth.uid()) order by mod_slug,created_at desc,id desc)
 select coalesce(jsonb_agg(jsonb_build_object('slug',d.mod_slug,'name',coalesce(m.name,d.mod_name),'cover_path',m.cover_path,'last_version',d.version,'last_channel',d.channel,'last_loader',d.loader,'last_downloaded_at',d.created_at,'verified',d.verified_at is not null,'available',m.slug is not null and m.published and m.visibility in ('public','beta'),
 'stable',(select jsonb_build_object('id',r.id,'version',r.version,'channel',r.channel,'created_at',r.created_at) from public.mod_releases r where r.mod_slug=d.mod_slug and r.published and r.channel='stable' and r.storage_path is not null and(r.loader=d.loader or d.loader='') and(r.minecraft_version=d.minecraft_version or d.minecraft_version='') order by r.created_at desc,r.id desc limit 1),
 'stable_releases',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,'channel',r.channel,'created_at',r.created_at)) from public.mod_releases r where r.mod_slug=d.mod_slug and r.published and r.channel='stable' and r.storage_path is not null and(r.loader=d.loader or d.loader='') and(r.minecraft_version=d.minecraft_version or d.minecraft_version='')),'[]'),
 'beta',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'version',x.version,'channel',x.channel,'created_at',x.created_at)) from(select r.* from public.mod_releases r where r.mod_slug=d.mod_slug and r.published and r.channel in ('beta','alpha') and r.storage_path is not null and(r.loader=d.loader or d.loader='') order by r.created_at desc,r.id desc limit 3)x),'[]'),
 'history',(select jsonb_agg(jsonb_build_object('version',h.version,'channel',h.channel,'loader',h.loader,'created_at',h.created_at,'verified',h.verified_at is not null) order by h.created_at desc) from(select * from public.download_events e where e.user_id=(select auth.uid()) and e.mod_slug=d.mod_slug order by e.created_at desc,e.id desc limit 5)h)
 ) order by d.created_at desc),'[]') from latest d left join public.mod_catalogue m on m.slug=d.mod_slug
$$;
revoke all on function public.get_my_mod_library() from public,anon;grant execute on function public.get_my_mod_library() to authenticated;

-- Daily age-based awards and a one-time verified-data backfill. No legacy events are promoted.
select private.refresh_all_achievements();
select cron.schedule('profile-achievements-daily','0 3 * * *','select private.refresh_all_achievements()');
