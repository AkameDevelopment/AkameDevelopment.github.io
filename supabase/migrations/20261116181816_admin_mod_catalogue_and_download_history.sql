create table public.mod_catalogue (
 slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
 name text not null check (length(name) between 1 and 100),
 summary text not null default '' check (length(summary)<=400),
 description text not null default '' check (length(description)<=12000),
 gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery)='array' and jsonb_array_length(gallery)<=12),
 visibility text not null default 'public' check (visibility in ('public','beta','hidden')),
 published boolean not null default false,
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.mod_releases (
 id uuid primary key default gen_random_uuid(),
 mod_slug text not null references public.mod_catalogue(slug) on delete cascade,
 version text not null check (length(version) between 1 and 40),
 minecraft_version text not null default '' check (length(minecraft_version)<=60),
 loader text not null default '' check (length(loader)<=40),
 channel text not null default 'stable' check (channel in ('stable','beta','alpha')),
 side text not null default 'client' check (side in ('client','server','both')),
 changelog text not null default '' check (length(changelog)<=8000),
 storage_path text not null unique check (storage_path ~ '^[a-z0-9-]+/[a-f0-9-]+\.(jar|zip|exe|msi|dmg|appimage|gz|7z)$'),
 file_name text not null check (length(file_name) between 1 and 200),
 file_size bigint not null check (file_size between 1 and 52428800),
 published boolean not null default false,
 created_by uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index mod_releases_mod_created_idx on public.mod_releases(mod_slug,created_at desc,id desc);
create index mod_releases_created_by_idx on public.mod_releases(created_by);
create index mod_catalogue_created_by_idx on public.mod_catalogue(created_by);
create table public.download_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 release_id uuid references public.mod_releases(id) on delete set null,
 mod_slug text not null check (length(mod_slug) between 1 and 100),
 mod_name text not null check (length(mod_name) between 1 and 100),
 version text not null check (length(version) between 1 and 80),
 minecraft_version text not null default '' check (length(minecraft_version)<=60),
 loader text not null default '' check (length(loader)<=40),
 source text not null default 'downloads' check (source in ('downloads','project','release-feed')),
 created_at timestamptz not null default now()
);
create index download_events_user_created_idx on public.download_events(user_id,created_at desc,id desc);
create index download_events_created_idx on public.download_events(created_at desc,id desc);
create index download_events_release_idx on public.download_events(release_id);
alter table public.mod_catalogue enable row level security;
alter table public.mod_releases enable row level security;
alter table public.download_events enable row level security;

create function private.can_manage_mod_catalogue() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.staff_access where user_id=(select auth.uid()) and role in ('owner','developer'));
$$;
revoke all on function private.can_manage_mod_catalogue() from public,anon;
grant execute on function private.can_manage_mod_catalogue() to authenticated;
-- Anon can evaluate the same helper safely (no staff table permission needed).
-- Keep public read policies independent of this helper for anonymous readers.
create policy catalogue_public on public.mod_catalogue for select to anon using (published and visibility='public');
create policy catalogue_member on public.mod_catalogue for select to authenticated using (
 (select private.can_manage_mod_catalogue()) or (select private.is_admin()) or
 (published and (visibility='public' or (visibility='beta' and exists(select 1 from public.beta_access b where b.user_id=(select auth.uid()) and b.project_slug=slug))))
);
create policy catalogue_edit on public.mod_catalogue for all to authenticated using ((select private.can_manage_mod_catalogue())) with check ((select private.can_manage_mod_catalogue()));
create policy releases_public on public.mod_releases for select to anon using (published and exists(select 1 from public.mod_catalogue m where m.slug=mod_slug));
create policy releases_member on public.mod_releases for select to authenticated using ((select private.can_manage_mod_catalogue()) or (select private.is_admin()) or (published and exists(select 1 from public.mod_catalogue m where m.slug=mod_slug)));
create policy releases_edit on public.mod_releases for all to authenticated using ((select private.can_manage_mod_catalogue())) with check ((select private.can_manage_mod_catalogue()));
create policy download_history_read on public.download_events for select to authenticated using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy download_history_insert on public.download_events for insert to authenticated with check (user_id=(select auth.uid()) and (release_id is null or exists(select 1 from public.mod_releases r where r.id=release_id)));
revoke all on public.mod_catalogue,public.mod_releases,public.download_events from anon,authenticated;
grant select on public.mod_catalogue,public.mod_releases to anon,authenticated;
grant insert,update,delete on public.mod_catalogue,public.mod_releases to authenticated;
grant select on public.download_events to authenticated;
grant insert(release_id,mod_slug,mod_name,version,minecraft_version,loader,source) on public.download_events to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('mod-assets','mod-assets',true,5242880,array['image/png','image/jpeg','image/webp']),
 ('mod-files','mod-files',false,52428800,null);
create policy mod_assets_read on storage.objects for select to anon,authenticated using (bucket_id='mod-assets');
create policy mod_assets_insert on storage.objects for insert to authenticated with check (bucket_id='mod-assets' and (select private.can_manage_mod_catalogue()) and name ~ '^[a-z0-9-]+/[a-f0-9-]+\.(png|jpg|jpeg|webp)$');
create policy mod_assets_delete on storage.objects for delete to authenticated using (bucket_id='mod-assets' and (select private.can_manage_mod_catalogue()));
create policy mod_files_public_read on storage.objects for select to anon using (bucket_id='mod-files' and exists(select 1 from public.mod_releases r where r.storage_path=name and r.published));
create policy mod_files_member_read on storage.objects for select to authenticated using (bucket_id='mod-files' and ((select private.can_manage_mod_catalogue()) or exists(select 1 from public.mod_releases r join public.mod_catalogue m on m.slug=r.mod_slug where r.storage_path=name and r.published and m.published and (m.visibility='public' or (m.visibility='beta' and exists(select 1 from public.beta_access b where b.user_id=(select auth.uid()) and b.project_slug=m.slug))))));
create policy mod_files_insert on storage.objects for insert to authenticated with check (bucket_id='mod-files' and (select private.can_manage_mod_catalogue()) and name ~ '^[a-z0-9-]+/[a-f0-9-]+\.(jar|zip|exe|msi|dmg|appimage|gz|7z)$');
create policy mod_files_delete on storage.objects for delete to authenticated using (bucket_id='mod-files' and (select private.can_manage_mod_catalogue()));
-- Dynamic catalogue IDs must also work with the existing beta invitation flow.
alter table public.beta_access drop constraint beta_access_project_slug_check;
alter table public.beta_access add constraint beta_access_project_slug_check check (project_slug ~ '^[a-z0-9][a-z0-9-]{1,63}$');
alter table public.beta_invitations drop constraint beta_invitations_project_slug_check;
alter table public.beta_invitations add constraint beta_invitations_project_slug_check check (project_slug ~ '^[a-z0-9][a-z0-9-]{1,63}$');
