-- Personal list preferences only: keep all admin records and achievement evidence.
alter table public.download_events add column if not exists hidden_from_library boolean not null default false;
grant update(hidden_from_library) on public.download_events to authenticated,service_role;
drop policy if exists own_download_list_visibility on public.download_events;
create policy own_download_list_visibility on public.download_events for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create or replace function public.clear_my_download_history() returns bigint language sql security invoker set search_path='' as $$
 with cleared as(update public.download_events set hidden_from_library=true where user_id=(select auth.uid()) and not hidden_from_library returning id) select count(*) from cleared
$$;
revoke all on function public.clear_my_download_history() from public,anon;
grant execute on function public.clear_my_download_history() to authenticated;
create or replace function public.record_verified_download(p_release_id uuid,p_user_id uuid,p_source text default 'downloads') returns uuid language plpgsql security invoker set search_path='' as $$
declare r record;event_id uuid;
begin
 select v.*,m.name,m.visibility into r from public.mod_releases v join public.mod_catalogue m on m.slug=v.mod_slug where v.id=p_release_id and v.published and m.published and m.visibility in ('public','beta');
 if not found then raise exception 'release_unavailable';end if;
 if not((r.visibility='public' and r.channel='stable') or exists(select 1 from public.beta_access where user_id=p_user_id and project_slug=r.mod_slug) or exists(select 1 from public.staff_access where user_id=p_user_id and role in ('owner','admin','developer'))) then raise exception 'beta_access_required';end if;
 if r.storage_path is null then raise exception 'no_download_file';end if;
 insert into public.download_events(user_id,release_id,mod_slug,mod_name,version,minecraft_version,loader,source,verified_at,achievement_eligible,channel)
 values(p_user_id,r.id,r.mod_slug,r.name,r.version,r.minecraft_version,r.loader,case when p_source in ('downloads','library') then p_source else 'downloads' end,now(),not((r.mod_slug||' '||r.version||' '||r.name)~*'(^|[-_. ])(demo|test|fixture)([-_. ]|$)'),r.channel)
 on conflict(user_id,release_id,verified_day) where verified_at is not null do update set hidden_from_library=false returning id into event_id;
 return event_id;
end $$;
revoke all on function public.record_verified_download(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_verified_download(uuid,uuid,text) to service_role;

create or replace function public.get_my_mod_library() returns jsonb language sql stable security invoker set search_path='' as $$
 with latest as(select distinct on(mod_slug) * from public.download_events where user_id=(select auth.uid()) and not hidden_from_library order by mod_slug,created_at desc,id desc)
 select coalesce(jsonb_agg(jsonb_build_object('slug',d.mod_slug,'name',coalesce(m.name,d.mod_name),'cover_path',m.cover_path,'last_version',d.version,'last_channel',d.channel,'last_loader',d.loader,'last_downloaded_at',d.created_at,'verified',d.verified_at is not null,'available',m.slug is not null and m.published and m.visibility in ('public','beta'),
 'stable',(select jsonb_build_object('id',r.id,'version',r.version,'channel',r.channel,'created_at',r.created_at) from public.mod_releases r where r.mod_slug=d.mod_slug and r.published and r.channel='stable' and r.storage_path is not null and(r.loader=d.loader or d.loader='') and(r.minecraft_version=d.minecraft_version or d.minecraft_version='') order by r.created_at desc,r.id desc limit 1),
 'stable_releases',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,'channel',r.channel,'created_at',r.created_at)) from public.mod_releases r where r.mod_slug=d.mod_slug and r.published and r.channel='stable' and r.storage_path is not null and(r.loader=d.loader or d.loader='') and(r.minecraft_version=d.minecraft_version or d.minecraft_version='')),'[]'),
 'beta',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'version',x.version,'channel',x.channel,'created_at',x.created_at)) from(select r.* from public.mod_releases r where r.mod_slug=d.mod_slug and r.published and r.channel in ('beta','alpha') and r.storage_path is not null and(r.loader=d.loader or d.loader='') order by r.created_at desc,r.id desc limit 3)x),'[]'),
 'history',(select jsonb_agg(jsonb_build_object('version',h.version,'channel',h.channel,'loader',h.loader,'created_at',h.created_at,'verified',h.verified_at is not null) order by h.created_at desc) from(select * from public.download_events e where e.user_id=(select auth.uid()) and not e.hidden_from_library and e.mod_slug=d.mod_slug order by e.created_at desc,e.id desc limit 5)h)
 ) order by d.created_at desc),'[]') from latest d left join public.mod_catalogue m on m.slug=d.mod_slug
$$;
revoke all on function public.get_my_mod_library() from public,anon;grant execute on function public.get_my_mod_library() to authenticated;


