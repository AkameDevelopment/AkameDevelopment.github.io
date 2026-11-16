-- Published beta metadata is discoverable; files keep separate authorization.
alter policy catalogue_public on public.mod_catalogue using (published and visibility in ('public','beta'));
alter policy catalogue_member on public.mod_catalogue using ((select private.can_manage_mod_catalogue()) or (select private.is_admin()) or (published and visibility in ('public','beta')));
alter policy releases_public on public.mod_releases using (published and exists(select 1 from public.mod_catalogue m where m.slug=mod_releases.mod_slug and m.published and m.visibility in ('public','beta')));
alter policy releases_member on public.mod_releases using ((select private.can_manage_mod_catalogue()) or (select private.is_admin()) or (published and exists(select 1 from public.mod_catalogue m where m.slug=mod_releases.mod_slug and m.published and m.visibility in ('public','beta'))));
alter policy mod_files_public_read on storage.objects using (bucket_id='mod-files' and exists(select 1 from public.mod_releases r join public.mod_catalogue m on m.slug=r.mod_slug where r.storage_path=objects.name and r.published and r.channel='stable' and m.published and m.visibility='public'));
alter policy mod_files_member_read on storage.objects using (bucket_id='mod-files' and ((select private.can_manage_mod_catalogue()) or (select private.is_admin()) or exists(select 1 from public.mod_releases r join public.mod_catalogue m on m.slug=r.mod_slug where r.storage_path=objects.name and r.published and m.published and m.visibility in ('public','beta') and ((m.visibility='public' and r.channel='stable') or exists(select 1 from public.beta_access b where b.user_id=(select auth.uid()) and b.project_slug=m.slug)))));
-- Remove obsolete grants/invitations for entries that are not actual catalogue mods.
delete from public.beta_invitations b where not exists(select 1 from public.mod_catalogue m where m.slug=b.project_slug);
delete from public.beta_access b where not exists(select 1 from public.mod_catalogue m where m.slug=b.project_slug);
alter table public.beta_access add constraint beta_access_catalogue_fkey foreign key(project_slug) references public.mod_catalogue(slug) on delete cascade;
alter table public.beta_invitations add constraint beta_invitations_catalogue_fkey foreign key(project_slug) references public.mod_catalogue(slug) on delete cascade;
create index beta_access_project_slug_idx on public.beta_access(project_slug);
create index beta_invitations_project_slug_idx on public.beta_invitations(project_slug);
