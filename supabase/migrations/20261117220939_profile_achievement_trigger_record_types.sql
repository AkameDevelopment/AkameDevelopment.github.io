create or replace function private.achievement_event() returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if tg_table_name='akamesmp_posts' then perform private.evaluate_achievements(new.author_id);
 elsif tg_table_name='community_requests' then
  if new.kind='bug' and new.status='resolved' then perform private.evaluate_achievements(new.author_id);end if;
 elsif tg_table_name='download_events' then
  if new.verified_at is not null and new.achievement_eligible then perform private.evaluate_achievements(new.user_id);end if;
 end if;return new;
end $fn$;
revoke all on function private.achievement_event() from public,anon,authenticated;
