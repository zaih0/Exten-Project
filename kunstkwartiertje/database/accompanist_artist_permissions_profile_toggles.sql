alter table if exists public.accompanist_artist_permissions
  add column if not exists can_edit_profile_pic boolean not null default false,
  add column if not exists can_edit_username boolean not null default false,
  add column if not exists can_edit_about_me boolean not null default false;