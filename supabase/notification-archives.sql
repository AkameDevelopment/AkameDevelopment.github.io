-- Per-account archive visibility only. No existing source table is modified.
-- Minimal expiry markers prevent an expired item from returning to the inbox.
begin;
create table public.notification_archives (
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('smp','mod','support','site','beta','beta-feedback')),
  notification_id text not null check (length(notification_id) between 1 and 128),
  archived_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  deleted_at timestamptz,
  primary key (user_id, source, notification_id)
);
alter table public.notification_archives enable row level security;
revoke all on public.notification_archives from public,anon,authenticated;
grant select,delete on public.notification_archives to authenticated;
grant insert(user_id,source,notification_id) on public.notification_archives to authenticated;
create policy "Read own archive state" on public.notification_archives for select to authenticated
  using (user_id=(select auth.uid()));
create policy "Archive own notification" on public.notification_archives for insert to authenticated
  with check (user_id=(select auth.uid()) and case source
    when 'site' then exists(select 1 from public.site_notifications n where n.id=notification_archives.notification_id::bigint and n.recipient_id=(select auth.uid()))
    when 'smp' then exists(select 1 from public.akamesmp_notifications n where n.id=notification_archives.notification_id::bigint and n.recipient_id=(select auth.uid()))
    when 'mod' then exists(select 1 from public.mod_comment_notifications n where n.id=notification_archives.notification_id::bigint and n.recipient_id=(select auth.uid()))
    when 'support' then exists(select 1 from public.support_notifications n where n.id=notification_archives.notification_id::bigint and n.recipient_id=(select auth.uid()))
    when 'beta' then exists(select 1 from public.beta_invitations n where n.id=notification_archives.notification_id::uuid and n.user_id=(select auth.uid()))
    when 'beta-feedback' then exists(select 1 from public.beta_invitations n where n.id=notification_archives.notification_id::uuid and n.invited_by=(select auth.uid()))
    else false end);
create policy "Restore own unexpired notification" on public.notification_archives for delete to authenticated
  using (user_id=(select auth.uid()) and deleted_at is null and expires_at>now());
create index notification_archives_due on public.notification_archives(expires_at) where deleted_at is null;
create schema if not exists private;
create function private.expire_notification_archive_views() returns void language plpgsql security invoker set search_path='' as $$
begin
  update public.notification_archives set deleted_at=expires_at
    where deleted_at is null and expires_at<=now();
end;
$$;
revoke all on function private.expire_notification_archive_views() from public,anon,authenticated;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('expire-notification-archive','15 3 * * *','select private.expire_notification_archive_views();');
commit;
