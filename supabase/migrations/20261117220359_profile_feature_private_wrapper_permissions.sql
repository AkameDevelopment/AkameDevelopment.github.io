-- Permit invoker wrappers to call their explicitly granted private entrypoints.
-- Remove inherited PUBLIC execute first, so schema usage exposes no internal trigger/maintenance functions.
do $fix$ declare f record;begin
 for f in select p.oid,p.proname,pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and has_function_privilege('anon',p.oid,'EXECUTE') and p.proname<>'public_profile_badges' loop
 execute format('revoke all on function private.%I(%s) from public,anon,authenticated',f.proname,f.args);
 if f.proname in ('is_owner','can_manage_staff') then execute format('grant execute on function private.%I(%s) to authenticated',f.proname,f.args);end if;
 end loop;
end $fix$;
grant usage on schema private to anon,authenticated;

