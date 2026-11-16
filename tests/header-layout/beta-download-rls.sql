begin;
select set_config('test.owner',(select user_id::text from public.staff_access where role='owner' limit 1),true);
select set_config('test.member',(select id::text from auth.users u where not exists(select 1 from public.staff_access s where s.user_id=u.id) limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
insert into public.mod_catalogue(slug,name,published,visibility)values('beta-rls-public','Public',true,'public'),('beta-rls-beta','Beta',true,'beta'),('beta-rls-hidden','Hidden',true,'hidden'),('beta-rls-draft','Draft',false,'public');
insert into public.mod_releases(mod_slug,version,channel,storage_path,file_name,file_size,published)values
('beta-rls-public','1','stable','beta-rls-public/11111111-1111-1111-1111-111111111111.jar','stable.jar',10,true),
('beta-rls-public','2','beta','beta-rls-public/22222222-2222-2222-2222-222222222222.jar','beta.jar',10,true),
('beta-rls-beta','1','stable','beta-rls-beta/33333333-3333-3333-3333-333333333333.jar','private.jar',10,true),
('beta-rls-hidden','1','stable','beta-rls-hidden/44444444-4444-4444-4444-444444444444.jar','hidden.jar',10,true),
('beta-rls-draft','1','stable','beta-rls-draft/55555555-5555-5555-5555-555555555555.jar','draft.jar',10,true);
reset role;
-- Policy fixtures only; the entire transaction is rolled back and no physical files are created.
insert into storage.objects(bucket_id,name)select 'mod-files',storage_path from public.mod_releases where mod_slug like 'beta-rls-%';
insert into storage.objects(bucket_id,name)values('mod-files','beta-rls-public/66666666-6666-6666-6666-666666666666.jar');
set local role anon;
do $$begin
 if(select count(*)from public.mod_catalogue where slug like 'beta-rls-%')<>2 then raise exception 'Public/beta metadata is not discoverable or drafts leaked';end if;
 if(select count(*)from public.mod_releases where mod_slug like 'beta-rls-%')<>3 then raise exception 'Published version metadata missing or drafts leaked';end if;
 if(select count(*)from storage.objects where bucket_id='mod-files' and name like 'beta-rls-%')<>1 then raise exception 'Anonymous beta/hidden/orphan file access or public file blocked';end if;
 if not exists(select 1 from storage.objects where name='beta-rls-public/11111111-1111-1111-1111-111111111111.jar')then raise exception 'Public stable download unavailable';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
set local role authenticated;
do $$begin
 if(select count(*)from public.mod_catalogue where slug like 'beta-rls-%')<>2 then raise exception 'Signed-in beta metadata missing';end if;
 if(select count(*)from storage.objects where bucket_id='mod-files' and name like 'beta-rls-%')<>1 then raise exception 'Member without a grant can read beta files';end if;
 begin insert into public.beta_access(user_id,project_slug)values(current_setting('test.member')::uuid,'beta-rls-beta');raise exception 'Member self-grant allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into public.beta_access(user_id,project_slug)values(current_setting('test.member')::uuid,'beta-rls-beta'),(current_setting('test.member')::uuid,'beta-rls-public');
set local role authenticated;
do $$begin
 if(select count(*)from storage.objects where bucket_id='mod-files' and name like 'beta-rls-%')<>3 then raise exception 'Beta grants do not unlock the correct files';end if;
end$$;
reset role;
delete from public.beta_access where project_slug like 'beta-rls-%';
set local role authenticated;
do $$begin
 if(select count(*)from storage.objects where bucket_id='mod-files' and name like 'beta-rls-%')<>1 then raise exception 'Revoked beta access remains authorized';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
do $$begin
 if(select count(*)from storage.objects where bucket_id='mod-files' and name like 'beta-rls-%')<>6 then raise exception 'Owner cannot manage all uploaded files';end if;
end$$;
reset role;
insert into public.beta_access(user_id,project_slug)values(current_setting('test.member')::uuid,'beta-rls-beta');
insert into public.beta_invitations(user_id,project_slug,invited_by)values(current_setting('test.member')::uuid,'beta-rls-beta',current_setting('test.owner')::uuid);
delete from public.mod_catalogue where slug='beta-rls-beta';
do $$begin
 if exists(select 1 from public.beta_access where project_slug='beta-rls-beta')or exists(select 1 from public.beta_invitations where project_slug='beta-rls-beta')then raise exception 'Deleted catalogue mod left stale beta access';end if;
end$$;
rollback;
select 'PASS: public beta discovery, private beta files, grant/revocation, stable public files, drafts and orphan isolation, catalogue cascade' as result;
