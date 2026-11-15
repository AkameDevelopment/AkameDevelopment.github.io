begin;
create or replace function private.can_control_smp(p_server_id integer,p_console boolean default false)
returns boolean language sql stable security invoker set search_path='' as $$
 select p_server_id in (1,2) and (
  exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
  or (not p_console and exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role=case p_server_id when 1 then 'smp_admin' when 2 then 'smp_admin2' end))
 );
$$;
revoke all on function private.can_control_smp(integer,boolean) from public,anon;
grant execute on function private.can_control_smp(integer,boolean) to authenticated,service_role;
create table public.smp_control_credentials(server_id smallint primary key check(server_id in(1,2)),token_hash text not null check(token_hash ~ '^[0-9a-f]{64}$'));
create table public.smp_agent_state(
 server_id smallint primary key check(server_id in(1,2)),agent_id uuid not null,
 state text not null check(state in('stopped','starting','running','stopping','error')),
 detail text not null default '' check(length(detail)<=500),updated_at timestamptz not null default now()
);
create table public.smp_control_commands(
 id uuid primary key default gen_random_uuid(),server_id smallint not null check(server_id in(1,2)),
 kind text not null check(kind in('start','stop','restart','console')),command text,
 requested_by uuid not null default auth.uid(),status text not null default 'queued' check(status in('queued','claimed','succeeded','failed','expired')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default (now()+interval '60 seconds'),
 claimed_at timestamptz,completed_at timestamptz,agent_id uuid,result text check(length(result)<=4000),
 check((kind='console' and command is not null and length(btrim(command)) between 1 and 1000 and command !~ '[\r\n]') or (kind<>'console' and command is null))
);
create index smp_control_commands_pending on public.smp_control_commands(server_id,created_at) where status in('queued','claimed');
create unique index smp_control_commands_one_active on public.smp_control_commands(server_id) where status in('queued','claimed');
create index smp_control_commands_history on public.smp_control_commands(server_id,created_at desc);
alter table public.smp_control_credentials enable row level security;
alter table public.smp_agent_state enable row level security;
alter table public.smp_control_commands enable row level security;
revoke all on public.smp_control_credentials,public.smp_agent_state,public.smp_control_commands from anon,authenticated;
grant select,insert,update on public.smp_control_credentials to authenticated;
grant select on public.smp_agent_state,public.smp_control_commands to authenticated;
grant insert(server_id,kind,command) on public.smp_control_commands to authenticated;
grant all on public.smp_control_credentials,public.smp_agent_state,public.smp_control_commands to service_role;
create policy "Owners developers manage agent credentials" on public.smp_control_credentials for all to authenticated using(private.can_control_smp(server_id,true)) with check(private.can_control_smp(server_id,true));
create policy "Read managed server agent state" on public.smp_agent_state for select to authenticated using(private.can_control_smp(server_id,false));
create policy "Read managed server commands" on public.smp_control_commands for select to authenticated using(private.can_control_smp(server_id,false));
create policy "Queue authorized server commands" on public.smp_control_commands for insert to authenticated with check(
 requested_by=(select auth.uid()) and status='queued' and private.can_control_smp(server_id,kind='console')
 and exists(select 1 from public.smp_agent_state s where s.server_id=smp_control_commands.server_id and s.updated_at>now()-interval '30 seconds' and ((kind='start' and s.state='stopped') or (kind in('stop','restart','console') and s.state='running')))
);
-- This transactional exchange is callable only by the authenticated agent Edge Function.
create or replace function public.smp_agent_exchange(p_server_id integer,p_agent_id uuid,p_state text,p_detail text default '',p_lines jsonb default '[]',p_ack_id uuid default null,p_ack_ok boolean default null,p_ack_result text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.smp_agent_state; item public.smp_control_commands; logs jsonb;
begin
 if p_server_id not in(1,2) or p_state not in('stopped','starting','running','stopping','error') or p_agent_id is null then raise exception 'invalid_agent'; end if;
 perform pg_advisory_xact_lock(87235,p_server_id);
 select * into existing from public.smp_agent_state where server_id=p_server_id for update;
 if existing.server_id is not null and existing.agent_id<>p_agent_id and existing.updated_at>now()-interval '30 seconds' then raise exception 'another_agent_is_active'; end if;
 insert into public.smp_agent_state(server_id,agent_id,state,detail,updated_at) values(p_server_id,p_agent_id,p_state,left(coalesce(p_detail,''),500),now())
 on conflict(server_id) do update set agent_id=excluded.agent_id,state=excluded.state,detail=excluded.detail,updated_at=excluded.updated_at;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)>40 then raise exception 'invalid_lines'; end if;
 insert into public.smp_console_lines(server_id,line) select p_server_id,left(value #>> '{}',8000) from jsonb_array_elements(p_lines) where jsonb_typeof(value)='string';
 if p_ack_id is not null and p_ack_ok is not null then
  update public.smp_control_commands set status=case when p_ack_ok then 'succeeded' else 'failed' end,result=left(coalesce(p_ack_result,''),4000),completed_at=now()
  where id=p_ack_id and server_id=p_server_id and agent_id=p_agent_id and status='claimed';
 end if;
 update public.smp_control_commands set status='expired',completed_at=now(),result='Agent did not receive the command before it expired.' where server_id=p_server_id and status='queued' and expires_at<now();
 -- A lost/restarted agent must never replay a possibly executed command.
 update public.smp_control_commands set status='failed',completed_at=now(),result='Agent connection was interrupted; verify server state before retrying.' where server_id=p_server_id and status='claimed' and (agent_id<>p_agent_id or claimed_at<now()-interval '10 minutes');
 if not exists(select 1 from public.smp_control_commands where server_id=p_server_id and status='claimed') then
  select * into item from public.smp_control_commands where server_id=p_server_id and status='queued' and expires_at>=now() order by created_at limit 1 for update skip locked;
  if item.id is not null then update public.smp_control_commands set status='claimed',agent_id=p_agent_id,claimed_at=now() where id=item.id; end if;
 end if;
 return jsonb_build_object('ok',true,'server_id',p_server_id,'command',case when item.id is not null then jsonb_build_object('id',item.id,'kind',item.kind,'command',item.command) else null end);
end;
$$;
revoke all on function public.smp_agent_exchange(integer,uuid,text,text,jsonb,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.smp_agent_exchange(integer,uuid,text,text,jsonb,uuid,boolean,text) to service_role;
commit;
