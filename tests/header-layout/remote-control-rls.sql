begin;
select set_config('akame.fixture_uid',(select u.id::text from auth.users u left join public.staff_access s on s.user_id=u.id order by (s.user_id is null) desc,u.created_at limit 1),true);
-- Temporary role changes exist only inside this rolled-back transaction.
delete from public.staff_access where user_id=current_setting('akame.fixture_uid')::uuid;
delete from public.smp_server_roles where user_id=current_setting('akame.fixture_uid')::uuid;
insert into public.smp_agent_state(server_id,agent_id,state,updated_at) values(1,'7e0d0000-0000-4000-8000-000000000001','running',now()),(2,'7e0d0000-0000-4000-8000-000000000002','running',now()) on conflict(server_id) do update set agent_id=excluded.agent_id,state=excluded.state,updated_at=now();
insert into public.smp_console_lines(server_id,line) values(1,'__CONTROL_RLS_FIXTURE__'),(2,'__CONTROL_RLS_FIXTURE__');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('akame.fixture_uid'),'role','authenticated')::text,true);
insert into public.smp_server_roles(user_id,role) values(current_setting('akame.fixture_uid')::uuid,'smp_admin');
set local role authenticated;
do $$ begin
 if (select count(*) from public.smp_console_lines where line='__CONTROL_RLS_FIXTURE__')<>1 then raise exception 'admin1 console isolation failed'; end if;
 if private.can_control_smp(2,false) or private.can_control_smp(1,true) then raise exception 'admin1 escalation'; end if;
 insert into public.smp_control_commands(server_id,kind) values(1,'stop');
 begin insert into public.smp_control_commands(server_id,kind) values(2,'start');raise exception 'admin1 could control server2';exception when insufficient_privilege then null;end;
 begin insert into public.smp_control_commands(server_id,kind,command) values(1,'console','say forbidden');raise exception 'admin1 could write console';exception when insufficient_privilege then null;end;
 begin update public.smp_agent_state set state='running' where server_id=1;raise exception 'client could forge heartbeat';exception when insufficient_privilege then null;end;
 begin perform public.smp_agent_exchange(1,'7e0d0000-0000-4000-8000-000000000001','running');raise exception 'client could call agent rpc';exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from public.smp_control_commands where requested_by=current_setting('akame.fixture_uid')::uuid;
update public.smp_server_roles set role='smp_admin2' where user_id=current_setting('akame.fixture_uid')::uuid;
set local role authenticated;
do $$ begin
 if (select count(*) from public.smp_console_lines where line='__CONTROL_RLS_FIXTURE__')<>1 or private.can_control_smp(1,false) or private.can_control_smp(2,true) then raise exception 'admin2 isolation failed';end if;
 insert into public.smp_control_commands(server_id,kind) values(2,'restart');
 begin insert into public.smp_control_commands(server_id,kind,command) values(2,'console','say forbidden');raise exception 'admin2 could write console';exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from public.smp_control_commands where requested_by=current_setting('akame.fixture_uid')::uuid;
delete from public.smp_server_roles where user_id=current_setting('akame.fixture_uid')::uuid;
insert into public.staff_access(user_id,role) values(current_setting('akame.fixture_uid')::uuid,'admin');
set local role authenticated;
do $$ begin if private.can_control_smp(1,false) or private.can_control_smp(2,false) then raise exception 'global admin received server privileges';end if;end $$;
reset role;
update public.staff_access set role='developer' where user_id=current_setting('akame.fixture_uid')::uuid;
set local role authenticated;
do $$ begin
 if not private.can_control_smp(1,true) or not private.can_control_smp(2,true) then raise exception 'developer missing privileges';end if;
 insert into public.smp_control_commands(server_id,kind,command) values(1,'console','say permitted');
 begin update public.smp_control_commands set status='succeeded';raise exception 'client could forge result';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Agent exchanges are scoped by server and lease; no command is executed in this test.
select public.smp_agent_exchange(1,'7e0d0000-0000-4000-8000-000000000001','running');
do $$ declare cmd uuid;begin
 select id into cmd from public.smp_control_commands where requested_by=current_setting('akame.fixture_uid')::uuid;
 if (select status from public.smp_control_commands where id=cmd)<>'claimed' then raise exception 'claim failed';end if;
 perform public.smp_agent_exchange(2,'7e0d0000-0000-4000-8000-000000000002','running','', '[]',cmd,true,'wrong server');
 if (select status from public.smp_control_commands where id=cmd)<>'claimed' then raise exception 'cross server acknowledgement';end if;
 begin perform public.smp_agent_exchange(1,'7e0d0000-0000-4000-8000-000000000003','running');raise exception 'duplicate agent accepted';exception when raise_exception then if sqlerrm<>'another_agent_is_active' then raise;end if;end;
 perform public.smp_agent_exchange(1,'7e0d0000-0000-4000-8000-000000000001','running','','[]',cmd,true,'fixture complete');
 if (select status from public.smp_control_commands where id=cmd)<>'succeeded' then raise exception 'acknowledgement failed';end if;
end $$;
rollback;
select 'PASS: RLS, server isolation, console write restrictions, heartbeat ownership and command acknowledgement' as result;
