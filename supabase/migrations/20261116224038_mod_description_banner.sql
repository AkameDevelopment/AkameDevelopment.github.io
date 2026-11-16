alter table public.mod_catalogue add column banner_path text check (banner_path is null or banner_path ~ '^[a-z0-9-]+/[a-f0-9-]+\.(png|jpg|jpeg|webp)$');
