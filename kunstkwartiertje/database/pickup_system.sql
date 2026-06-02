-- Pickup system schema extension for reserved_artworks
-- Run this in Supabase SQL editor.

alter table if exists public.reserved_artworks
  add column if not exists pickup_status text not null default 'reserved',
  add column if not exists reservation_status text not null default 'pending',
  add column if not exists picked_up_at timestamptz null,
  add column if not exists current_location_name text null,
  add column if not exists current_location_address text null;

alter table if exists public.reserved_artworks
  alter column pickup_status set default 'pending_request';

update public.reserved_artworks
set pickup_status = case
  when pickup_status in ('awaiting_artist_confirmation', 'picked_up') then pickup_status
  when reservation_status = 'approved' then 'reserved'
  else 'pending_request'
end;

-- Remove reservations created by artists. Only ondernemers may reserve artworks.
delete from public.reserved_artworks ra
using public.users u
where u.id = ra.user_id
  and lower(coalesce(u.type, '')) in ('kunstenaar', 'artist');

-- Ensure one request per entrepreneur per artwork.
create unique index if not exists reserved_artworks_art_id_user_id_unique_idx
  on public.reserved_artworks (art_id, user_id);

-- Remove old uniqueness restriction if present (it blocked request-based flow).
drop index if exists public.reserved_artworks_art_id_unique_idx;

alter table if exists public.reserved_artworks
  drop constraint if exists reserved_artworks_pickup_status_check;

alter table public.reserved_artworks
  add constraint reserved_artworks_pickup_status_check
  check (pickup_status in ('pending_request', 'reserved', 'awaiting_artist_confirmation', 'picked_up'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reserved_artworks_reservation_status_check'
  ) then
    alter table public.reserved_artworks
      add constraint reserved_artworks_reservation_status_check
      check (reservation_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;
