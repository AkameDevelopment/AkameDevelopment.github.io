begin;
-- Server 2 has its own tables and credentials. No Server 1 rows are migrated.
create table public.akamesmp2_player_stats (like public.akamesmp_player_stats including all);
create table public.akamesmp2_server_status (like public.akamesmp_server_status including all);
create table public.akamesmp2_public_totals (like public.akamesmp_public_totals including all);
create table public.smp_stats_ingest_keys (
 server_id smallint primary key check(server_id=2),
 token_hash text not null check(token_hash ~ '^[0-9a-f]{64}$')
);
alter table public.akamesmp2_player_stats enable row level security;
alter table public.akamesmp2_server_status enable row level security;
alter table public.akamesmp2_public_totals enable row level security;
alter table public.smp_stats_ingest_keys enable row level security;
revoke all on public.akamesmp2_player_stats,public.akamesmp2_server_status,public.akamesmp2_public_totals,public.smp_stats_ingest_keys from anon,authenticated;
grant select on public.akamesmp2_player_stats,public.akamesmp2_server_status,public.akamesmp2_public_totals to authenticated;
grant select,insert,update on public.smp_stats_ingest_keys to authenticated;
grant all on public.akamesmp2_player_stats,public.akamesmp2_server_status,public.akamesmp2_public_totals,public.smp_stats_ingest_keys to service_role;
create policy "Server 2 managers read player statistics" on public.akamesmp2_player_stats for select to authenticated using (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
 or exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role='smp_admin2')
);
create policy "Server 2 members read status" on public.akamesmp2_server_status for select to authenticated using (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
 or exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role in ('smp2','smp_admin2'))
);
create policy "Server 2 members read totals" on public.akamesmp2_public_totals for select to authenticated using (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
 or exists(select 1 from public.smp_server_roles r where r.user_id=(select auth.uid()) and r.role in ('smp2','smp_admin2'))
);
create policy "Owners and developers manage Server 2 ingest key" on public.smp_stats_ingest_keys for all to authenticated using (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
) with check (
 exists(select 1 from public.staff_access s where s.user_id=(select auth.uid()) and s.role in ('owner','developer'))
);
commit;
