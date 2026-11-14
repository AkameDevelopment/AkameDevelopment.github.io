-- Extend the existing ticket store. No ticket rows are deleted or copied.
create function private.support_discord_member() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.identities where user_id=(select auth.uid()) and provider='discord');
$$;
revoke all on function private.support_discord_member() from public,anon;
grant execute on function private.support_discord_member() to authenticated;
create sequence private.support_ticket_sequence;
grant usage on sequence private.support_ticket_sequence to authenticated;
alter table public.community_requests add column ticket_seq bigint;
update public.community_requests set ticket_seq=nextval('private.support_ticket_sequence') where ticket_seq is null;
alter table public.community_requests alter column ticket_seq set not null;
alter table public.community_requests add constraint support_ticket_sequence_unique unique(ticket_seq);
alter table public.community_requests add column ticket_number text generated always as ('AK-'||lpad(ticket_seq::text,greatest(6,length(ticket_seq::text)),'0')) stored;
alter table public.community_requests add constraint support_ticket_number_unique unique(ticket_number);
alter table public.community_requests add column image_url text not null default '' check(length(image_url)<=2048 and (image_url='' or image_url ~ '^https://[^[:space:]]+$'));
alter table public.community_requests add column benefit text not null default '' check(length(benefit)<=3000);
alter table public.community_requests add column replies jsonb not null default '[]'::jsonb;
-- Existing admin_note was already member-visible. Preserve it in the conversation.
update public.community_requests set replies=jsonb_build_array(jsonb_build_object('body',admin_note,'created_at',updated_at,'author_id',null)) where admin_note<>'';
create index if not exists support_author_created on public.community_requests(author_id,created_at desc);
alter table public.community_requests enable row level security;
create policy "Discord session required for support" on public.community_requests as restrictive for all to authenticated using ((select private.support_discord_member())) with check ((select private.support_discord_member()));
-- Remove dangerous default TRUNCATE privileges (TRUNCATE bypasses RLS).
revoke all on public.community_requests from anon,authenticated;
grant select on public.community_requests to authenticated;
grant insert(author_id,kind,title,description,project_slug,game_version,steps,image_url,benefit) on public.community_requests to authenticated;
grant update(status,admin_note) on public.community_requests to authenticated;
create table public.support_notifications (
 id bigint generated always as identity primary key,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 request_id uuid not null references public.community_requests(id) on delete cascade,
 ticket_number text not null,
 kind text not null check(kind in ('reply','status','resolved')),
 created_at timestamptz not null default now(), read_at timestamptz
);
alter table public.support_notifications enable row level security;
revoke all on public.support_notifications from anon,authenticated;
grant select,update(read_at) on public.support_notifications to authenticated;
create policy "Members read own support events" on public.support_notifications for select to authenticated using (recipient_id=(select auth.uid()) and (select private.support_discord_member()));
create policy "Members mark own support events read" on public.support_notifications for update to authenticated using (recipient_id=(select auth.uid()) and (select private.support_discord_member())) with check (recipient_id=(select auth.uid()) and (select private.support_discord_member()));
create index support_notifications_recipient_date on public.support_notifications(recipient_id,created_at desc);
create function private.prepare_support_ticket() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.ticket_seq:=nextval('private.support_ticket_sequence');
  new.created_at:=now(); new.updated_at:=now(); new.status:='open';new.admin_note:='';new.replies:='[]'::jsonb;
 else
  if new.id<>old.id or new.author_id<>old.author_id or new.ticket_seq<>old.ticket_seq then raise exception 'immutable_ticket_reference'; end if;
  new.updated_at:=now();new.created_at:=old.created_at;
  if new.admin_note is distinct from old.admin_note and length(trim(new.admin_note))>0 then
   if length(new.admin_note)>3000 then raise exception 'reply_too_long';end if;
   new.replies:=old.replies||jsonb_build_array(jsonb_build_object('body',new.admin_note,'created_at',now(),'author_id',auth.uid()));
  end if;
 end if;return new;
end $$;
revoke all on function private.prepare_support_ticket() from public,anon,authenticated;
create trigger support_ticket_prepare before insert or update on public.community_requests for each row execute function private.prepare_support_ticket();
-- Trigger-only privilege for writing events; not exposed as an API RPC.
create function private.notify_support_ticket() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'admin_required';end if;
 if new.status is distinct from old.status or new.replies is distinct from old.replies then
  insert into public.support_notifications(recipient_id,actor_id,request_id,ticket_number,kind)
  values(new.author_id,auth.uid(),new.id,new.ticket_number,case when new.status='resolved' and old.status<>'resolved' then 'resolved' when new.replies is distinct from old.replies then 'reply' else 'status' end);
 end if;return new;
end $$;
revoke all on function private.notify_support_ticket() from public,anon,authenticated;
create trigger support_ticket_notify after update on public.community_requests for each row execute function private.notify_support_ticket();
