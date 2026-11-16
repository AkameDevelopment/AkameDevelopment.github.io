alter table public.mod_catalogue
add column release_status text not null default 'in_development' check (release_status in ('planned','in_development','pending')),
add column release_note text not null default '' check (length(release_note)<=240),
add column expected_release_date date;
