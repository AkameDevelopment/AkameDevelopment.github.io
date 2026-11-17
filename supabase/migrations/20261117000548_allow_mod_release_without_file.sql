alter table public.mod_releases alter column storage_path drop not null, alter column file_name drop not null, alter column file_size drop not null;
alter table public.mod_releases add constraint mod_releases_file_fields_together check ((storage_path is null and file_name is null and file_size is null) or (storage_path is not null and file_name is not null and file_size is not null));
