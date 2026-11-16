alter table public.mod_catalogue drop constraint mod_catalogue_release_status_check;
alter table public.mod_catalogue add constraint mod_catalogue_release_status_check check (release_status in ('planned','in_development','pending','released'));
