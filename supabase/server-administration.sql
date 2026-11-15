-- Separate console streams; browsers can only read their authorized server.
-- The trusted server connection will publish logs in the next integration step.
begin;
create table if not exists public.smp_console_lines (
 id bigint generated always as identity primary key,
 server_id smallint not null check (server_id in (1,2)),
 line text not null check (length(line)<=8000),
 created_at timestamptz not null default now()
);
create index if not exists smp_console_lines_server_latest on public.smp_console_lines(server_id,id desc);
alter table public.smp_console_lines enable row level security;
revoke all on public.smp_console_lines from anon,authenticated;
grant select on public.smp_console_lines to authenticated;
grant all on public.smp_console_lines to service_role;
grant usage,select on sequence public.smp_console_lines_id_seq to service_role;
create policy "Read console for managed server" on public.smp_console_lines for select to authenticated using (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
 or exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role=case server_id when 1 then 'smp_admin' when 2 then 'smp_admin2' end)
);
-- Existing statistics belong to Server 1. A Server 2 admin cannot read them.
alter policy "Owners developers and admins can view SMP stats" on public.akamesmp_player_stats to authenticated using (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
 or exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role='smp_admin')
);
create policy "Server admins read own server status" on public.akamesmp_server_status for select to authenticated using (
 exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role=case id when 1 then 'smp_admin' when 2 then 'smp_admin2' end)
);
commit;
