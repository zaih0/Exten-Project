create table if not exists public.user_follows (
    id bigserial primary key,
    follower_user_id bigint not null references public.users(id) on delete cascade,
    followed_user_id bigint not null references public.users(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    constraint user_follows_unique unique (follower_user_id, followed_user_id),
    constraint user_follows_no_self_follow check (follower_user_id <> followed_user_id)
);

create index if not exists user_follows_follower_idx
    on public.user_follows (follower_user_id, followed_user_id);

create index if not exists user_follows_followed_idx
    on public.user_follows (followed_user_id, follower_user_id);

create index if not exists chat_sender_receiver_sent_idx
    on public.chat (sender_id, receiver_id, sent_date desc);

create index if not exists chat_receiver_sender_sent_idx
    on public.chat (receiver_id, sender_id, sent_date desc);

alter table public.chat
    add column if not exists image_url text null;

alter table public.chat
    alter column read_date drop default;

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;
