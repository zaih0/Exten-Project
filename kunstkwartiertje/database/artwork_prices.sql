alter table if exists public.artworks
  add column if not exists price numeric(10,2) null;
