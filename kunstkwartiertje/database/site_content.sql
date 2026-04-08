create table if not exists public.site_content (
    id bigserial primary key,
    content_key text not null unique,
    content_value text not null default '',
    updated_by text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists site_content_key_idx on public.site_content (content_key);

create or replace function public.set_site_content_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_site_content_updated_at on public.site_content;
create trigger trg_site_content_updated_at
before update on public.site_content
for each row
execute function public.set_site_content_updated_at();

insert into public.site_content (content_key, content_value)
values
    ('home.pretitle', 'Welkom bij'),
    ('home.title', 'KUNSTKWARTIERTJE'),
    ('home.subtitle', 'Ontdek, bewonder en deel unieke kunstwerken van talentvolle kunstenaars.'),
    ('home.ctaLabel', 'Start hier'),
    ('home.ctaHref', '/register'),
    ('gallery.title', 'Art gallery'),
    ('gallery.subtitle', 'Bekijk goedgekeurde kunstwerken uit de community.'),
    ('gallery.loadingText', 'Kunstwerken laden...'),
    ('gallery.emptyText', 'Nog geen goedgekeurde kunstwerken beschikbaar.'),
    ('navbar.viewProfileLabel', 'Bekijk profiel'),
    ('navbar.reservationsLabel', 'Mijn reserveringen'),
    ('navbar.pickupsLabel', 'Pickup systeem'),
    ('navbar.logoutLabel', 'Log out'),
    ('branding.logoUrl', '/kunstkwartiertje-logo.png'),
    ('branding.logoWidth', '240'),
    ('branding.logoHeight', '120'),
    ('branding.navbarLogoWidth', '140'),
    ('branding.navbarLogoHeight', '42'),
    ('heroLayout.logoOffsetX', '0'),
    ('heroLayout.logoOffsetY', '0'),
    ('heroLayout.titleOffsetX', '0'),
    ('heroLayout.titleOffsetY', '0'),
    ('heroLayout.subtitleOffsetY', '0'),
    ('heroLayout.ctaOffsetY', '0'),
    ('theme.backgroundColor', '#ffffff'),
    ('theme.foregroundColor', '#171717'),
    ('theme.primaryColor', '#7c3aed'),
    ('theme.accentColor', '#f59e0b'),
    ('theme.buttonTextColor', '#111827'),
    ('theme.cardColor', '#ffffff'),
    ('theme.radius', '16')
on conflict (content_key) do nothing;
