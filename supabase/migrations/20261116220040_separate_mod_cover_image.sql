alter table public.mod_catalogue add column cover_path text check (cover_path is null or cover_path ~ '^[a-z0-9-]+/[a-f0-9-]+\.(png|jpg|jpeg|webp)$');
