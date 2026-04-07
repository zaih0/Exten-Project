create table if not exists public.accompanist_artist_feedback (
    id bigserial primary key,
    accompanist_user_id bigint not null references public.users(id) on delete cascade,
    artist_user_id bigint not null references public.users(id) on delete cascade,
    feedback_text text not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists accompanist_artist_feedback_artist_idx
    on public.accompanist_artist_feedback (artist_user_id, created_at desc);

create index if not exists accompanist_artist_feedback_accompanist_idx
    on public.accompanist_artist_feedback (accompanist_user_id, artist_user_id, created_at desc);
