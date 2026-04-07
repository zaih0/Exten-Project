-- Pickup system schema extension for reserved_artworks
-- Run this in Supabase SQL editor.

alter table if exists public.reserved_artworks
  add column if not exists pickup_status text not null default 'reserved',
  add column if not exists picked_up_at timestamptz null,
  add column if not exists current_location_name text null,
  add column if not exists current_location_address text null;

-- Optional but recommended: prevent same artwork being reserved by multiple users.
create unique index if not exists reserved_artworks_art_id_unique_idx
  on public.reserved_artworks (art_id);

-- Optional check constraint for status integrity.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reserved_artworks_pickup_status_check'
  ) then
    alter table public.reserved_artworks
      add constraint reserved_artworks_pickup_status_check
      check (pickup_status in ('reserved', 'picked_up'));
  end if;
end $$;
