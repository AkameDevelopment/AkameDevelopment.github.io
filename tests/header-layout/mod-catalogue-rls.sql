-- Rolled-back fixture: tests real RLS without retaining users, downloads or mods.
begin;
select set_config('test.owner',(select user_id::text from public.staff_access where role='owner' limit 1),true);
select set_config('test.member',(select id::text from auth.users u where not exists(select 1 from public.staff_access s where s.user_id=u.id) limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
insert into public.mod_catalogue(slug,name,published,visibility) values ('rls-fixture-public','Public fixture',true,'public'),('rls-fixture-draft','Draft fixture',false,'public'),('rls-fixture-beta','Beta fixture',true,'beta'),('rls-fixture-hidden','Hidden fixture',true,'hidden');
update public.mod_catalogue set release_status='pending',cover_path='rls-fixture-public/cccccccc-cccc-cccc-cccc-cccccccccccc.png',release_note='First release pending',expected_release_date='2026-12-25' where slug='rls-fixture-public';
insert into public.mod_releases(mod_slug,version,storage_path,file_name,file_size,published) values ('rls-fixture-public','1.0','rls-fixture-public/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jar','fixture.jar',10,true),('rls-fixture-draft','1.0','rls-fixture-draft/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jar','draft.jar',10,true);
insert into public.download_events(mod_slug,mod_name,version)values('rls-fixture-public','Public fixture','1.0');
set local role anon;
do $$begin
 if not exists(select 1 from public.mod_catalogue where slug='rls-fixture-public' and cover_path='rls-fixture-public/cccccccc-cccc-cccc-cccc-cccccccccccc.png' and release_status='pending' and expected_release_date='2026-12-25')then raise exception 'Release announcement unavailable';end if;
 if (select count(*) from public.mod_catalogue where slug like 'rls-fixture-%')<>1 then raise exception 'Anonymous catalogue visibility leaked';end if;
 if (select count(*) from public.mod_releases where mod_slug like 'rls-fixture-%')<>1 then raise exception 'Anonymous release visibility leaked';end if;
 begin perform 1 from public.download_events;raise exception 'Anonymous history access allowed';exception when insufficient_privilege then null;end;
 begin insert into public.mod_catalogue(slug,name)values('rls-forbidden','Forbidden');raise exception 'Anonymous catalogue insert allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
set local role authenticated;
do $$begin
 if (select count(*) from public.mod_catalogue where slug like 'rls-fixture-%')<>1 then raise exception 'Member sees unpublished/beta catalogue';end if;
 if exists(select 1 from public.download_events where mod_slug='rls-fixture-public')then raise exception 'Member sees another user history';end if;
 begin insert into public.mod_catalogue(slug,name)values('rls-forbidden','Forbidden');raise exception 'Member catalogue write allowed';exception when insufficient_privilege then null;end;
 begin insert into public.download_events(user_id,mod_slug,mod_name,version)values(current_setting('test.owner')::uuid,'rls-fixture-public','Spoofed','1');raise exception 'Member can spoof identity';exception when insufficient_privilege then null;end;
 begin insert into public.download_events(created_at,mod_slug,mod_name,version)values(now()-interval '1 year','rls-fixture-public','Spoofed','1');raise exception 'Member can spoof timestamp';exception when insufficient_privilege then null;end;
end$$;
insert into public.download_events(mod_slug,mod_name,version)values('rls-fixture-public','Public fixture','1.0');
do $$begin if (select count(*) from public.download_events where mod_slug='rls-fixture-public')<>1 then raise exception 'Own history unavailable';end if;end$$;
reset role;
insert into public.beta_access(user_id,project_slug)values(current_setting('test.member')::uuid,'rls-fixture-beta');
set local role authenticated;
do $$begin if (select count(*) from public.mod_catalogue where slug like 'rls-fixture-%')<>2 then raise exception 'Dynamic beta grant unavailable';end if;end$$;
reset role;
-- Simulate Developer on an existing fixture identity, restored by ROLLBACK.
update public.staff_access set role='developer' where user_id=current_setting('test.owner')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
insert into public.mod_catalogue(slug,name)values('rls-fixture-developer','Developer fixture');
do $$begin if (select count(*) from public.download_events where mod_slug='rls-fixture-public')<>1 then raise exception 'Developer sees another user history';end if;end$$;
reset role;
update public.staff_access set role='admin' where user_id=current_setting('test.owner')::uuid;
set local role authenticated;
do $$begin
 if (select count(*) from public.download_events where mod_slug='rls-fixture-public')<>2 then raise exception 'Admin cannot read member download histories';end if;
 begin insert into public.mod_catalogue(slug,name)values('rls-forbidden','Forbidden');raise exception 'Admin catalogue write allowed';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'PASS: owner/developer writes; admin history; member isolation; anon/draft/beta protection; identity and timestamp defaults' as result;
