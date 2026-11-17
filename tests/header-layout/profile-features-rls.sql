begin;
select set_config('test.member',(select cp.user_id::text from public.community_profiles cp where not exists(select 1 from public.staff_access s where s.user_id=cp.user_id) order by cp.created_at desc limit 1),true);
select set_config('test.other',(select cp.user_id::text from public.community_profiles cp where cp.user_id::text<>current_setting('test.member') and not exists(select 1 from public.staff_access s where s.user_id=cp.user_id) order by cp.created_at limit 1),true);
select set_config('test.admin',(select user_id::text from public.staff_access where role='owner' limit 1),true);
select set_config('test.before_verified',(select count(*)::text from public.download_events where user_id=current_setting('test.member')::uuid and verified_at is not null),true);
select set_config('test.member_veteran',(select (created_at<=now()-interval '365 days')::text from auth.users where id=current_setting('test.member')::uuid),true);
select set_config('test.other_veteran',(select (created_at<=now()-interval '365 days')::text from auth.users where id=current_setting('test.other')::uuid),true);
insert into public.profile_badge_grants(user_id,badge_id) select current_setting('test.member')::uuid,id from public.profile_badge_definitions where name='Early Supporter' on conflict do nothing;
insert into public.mod_catalogue(slug,name,published,visibility,release_status) select 'achievement-qa-'||n,'QA content '||n,true,case when n=6 then 'beta' else 'public' end,'released' from generate_series(1,6)n;
insert into public.mod_releases(id,mod_slug,version,loader,minecraft_version,channel,published,storage_path,file_name,file_size)
select ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'achievement-qa-'||n,'1.0.0','Fabric','26.3',case when n=6 then 'beta' else 'stable' end,true,'achievement-qa-'||n||'/00000000-0000-4000-8000-000000000001.jar','qa.jar',1 from generate_series(1,6)n;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.member'),'role','authenticated','app_metadata',jsonb_build_object('provider','discord'))::text,true);
set local role authenticated;
-- Direct forged events, service recorder and grants must be impossible.
do $$begin
 begin insert into public.download_events(mod_slug,mod_name,version) values('achievement-qa-1','Spoof','9');raise exception 'forged_event_allowed';exception when insufficient_privilege then null;end;
 begin perform public.record_verified_download('20000000-0000-4000-8000-000000000001',auth.uid(),'downloads');raise exception 'recorder_public';exception when insufficient_privilege then null;end;
 begin insert into public.profile_badge_grants(user_id,badge_id) select auth.uid(),id from public.profile_badge_definitions where system_key='mod_collector';raise exception 'self_award_allowed';exception when insufficient_privilege or raise_exception then if sqlerrm='self_award_allowed' then raise;end if;end;
 if exists(select 1 from public.mod_releases where mod_slug='achievement-qa-6') then raise exception 'private_beta_metadata_leak';end if;
end $$;
-- Registration age is sourced from Auth, never editable profile timestamps.
update public.user_profiles set created_at=now()-interval '5 years' where user_id=auth.uid();
select public.get_my_achievements();
do $$begin if exists(select 1 from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=auth.uid() and b.system_key='veteran')<>(current_setting('test.member_veteran')::boolean) then raise exception 'spoofed_age_award';end if;end $$;
insert into public.akamesmp_posts(body,topic) values('Achievement QA post one',null);
insert into public.akamesmp_posts(body,topic) select 'Achievement QA post '||n,null from generate_series(2,10)n;
do $$begin if (select count(*) from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=auth.uid() and b.system_key in('first_post','active_member'))<>2 then raise exception 'post_achievements_missing';end if;end $$;
-- Max three, no duplicates, no unearned IDs, own settings only.
update public.user_profiles set badge_showcase=array[(select id from public.profile_badge_definitions where system_key='first_post'),(select id from public.profile_badge_definitions where name='Early Supporter'),(select id from public.profile_badge_definitions where name='Community')] where user_id=auth.uid();
do $$declare b bigint;begin select id into b from public.profile_badge_definitions where system_key='first_post';
 begin update public.user_profiles set badge_showcase=array[b,b] where user_id=auth.uid();raise exception 'duplicate_showcase_allowed';exception when raise_exception then if sqlerrm='duplicate_showcase_allowed' then raise;end if;end;
 begin update public.user_profiles set badge_showcase=array[(select id from public.profile_badge_definitions where system_key='mod_collector')] where user_id=auth.uid();raise exception 'locked_showcase_allowed';exception when raise_exception then if sqlerrm='locked_showcase_allowed' then raise;end if;end;
 begin update public.user_profiles set badge_showcase=array[b,b,b,b] where user_id=auth.uid();raise exception 'four_showcase_allowed';exception when check_violation or raise_exception then if sqlerrm='four_showcase_allowed' then raise;end if;end;
end $$;
update public.user_profiles set badge_visibility=jsonb_build_object((select id::text from public.profile_badge_definitions where system_key='first_post'),false) where user_id=auth.uid();
-- A submitted or self-edited bug must not earn Bug Hunter.
insert into public.community_requests(author_id,kind,title,description,project_slug) values(auth.uid(),'bug','Achievement QA bug','Reproducible issue for transactional test only','website');
update public.community_requests set status='resolved' where author_id=auth.uid();
do $$begin if exists(select 1 from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=auth.uid() and b.system_key='bug_hunter') then raise exception 'unconfirmed_bug_award';end if;end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$begin
 begin perform 1 from public.profile_badge_grants;raise exception 'raw_grants_public';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.mod_releases where mod_slug='achievement-qa-6') then raise exception 'anon_beta_metadata_leak';end if;
 if exists(select 1 from public.get_public_profile_badges(current_setting('test.member')::uuid) where system_key='first_post') then raise exception 'hidden_favorite_public';end if;
 if (select name from public.get_public_profile_badges(current_setting('test.member')::uuid) limit 1)<>'Early Supporter' then raise exception 'showcase_order_wrong';end if;
 begin perform public.get_my_mod_library();raise exception 'anonymous_library';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Only the trusted server records downloads; repeated same-day starts are deduplicated.
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select public.record_verified_download(('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,current_setting('test.member')::uuid,'downloads') from generate_series(1,5)n;
select public.record_verified_download('20000000-0000-4000-8000-000000000001',current_setting('test.member')::uuid,'downloads');
reset role;
do $$begin
 if (select count(*) from public.download_events where user_id=current_setting('test.member')::uuid and verified_at is not null)<>5+current_setting('test.before_verified')::int then raise exception 'duplicate_downloads';end if;
 if (select count(*) from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=current_setting('test.member')::uuid and b.system_key in('downloaded','mod_collector'))<>2 then raise exception 'download_achievements_missing';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.member'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin if (select count(*) from jsonb_array_elements(public.get_my_mod_library())m where m->>'slug' like 'achievement-qa-%')<>5 then raise exception 'library_duplicates_or_missing';end if;end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.other'),'role','authenticated')::text,true);
set local role authenticated;
select public.get_my_achievements();
do $$begin
 if exists(select 1 from jsonb_array_elements(public.get_my_mod_library())m where m->>'slug' like 'achievement-qa-%') then raise exception 'foreign_library_leak';end if;
 if exists(select 1 from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=auth.uid() and b.system_key='veteran')<>(current_setting('test.other_veteran')::boolean) then raise exception 'veteran_age_mismatch';end if;
 if exists(select 1 from public.profile_badge_grants where user_id=current_setting('test.member')::uuid) then raise exception 'foreign_grants_leak';end if;
end $$;
reset role;
-- Confirm a bug, revoke earned badges, and check persistence without touching real owner rights.
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.admin'),'role','authenticated')::text,true);
set local role authenticated;
update public.community_requests set status='resolved' where author_id=current_setting('test.member')::uuid;
do $$begin if not exists(select 1 from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=current_setting('test.member')::uuid and b.system_key='bug_hunter') then raise exception 'confirmed_bug_missing';end if;end $$;
delete from public.profile_badge_grants where user_id=current_setting('test.member')::uuid and badge_id=(select id from public.profile_badge_definitions where system_key='first_post');
do $$begin
 begin update public.user_profiles set badge_showcase='{}' where user_id=current_setting('test.member')::uuid;raise exception 'admin_modified_foreign_showcase';exception when raise_exception then if sqlerrm='admin_modified_foreign_showcase' then raise;end if;end;
end $$;
select public.admin_refresh_achievements();
do $$begin if exists(select 1 from public.profile_badge_grants g join public.profile_badge_definitions b on b.id=g.badge_id where g.user_id=current_setting('test.member')::uuid and b.system_key='first_post') then raise exception 'revoked_badge_reawarded';end if;end $$;
insert into public.profile_badge_grants(user_id,badge_id) select current_setting('test.member')::uuid,id from public.profile_badge_definitions where system_key='first_post';
do $$begin if exists(select 1 from public.profile_badge_revocations r join public.profile_badge_definitions b on b.id=r.badge_id where r.user_id=current_setting('test.member')::uuid and b.system_key='first_post') then raise exception 'manual_regrant_did_not_clear_revocation';end if;end $$;
reset role;
-- Genuine role badges are present once, and per-badge hiding applies to roles too.
update public.user_profiles set show_profile_badges=true,badge_visibility='{}' where user_id=current_setting('test.admin')::uuid;
insert into public.profile_badge_grants(user_id,badge_id) select current_setting('test.admin')::uuid,id from public.profile_badge_definitions where name='Owner' on conflict do nothing;
do $$begin if (select count(*) from public.get_public_profile_badges(current_setting('test.admin')::uuid) where lower(name)='owner')<>1 then raise exception 'role_badge_duplicate';end if;end $$;
rollback;
select 'PASS: showcase privacy/order/limits, no forged events/grants, post/download/bug/veteran achievements, permanent revocation, deduplication, private beta API, own library, role deduplication' as result;
