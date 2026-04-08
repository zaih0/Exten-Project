export type SiteContent = {
    home: {
        pretitle: string;
        title: string;
        subtitle: string;
        ctaLabel: string;
        ctaHref: string;
    };
    gallery: {
        title: string;
        subtitle: string;
        loadingText: string;
        emptyText: string;
    };
    navbar: {
        viewProfileLabel: string;
        reservationsLabel: string;
        pickupsLabel: string;
        logoutLabel: string;
    };
    branding: {
        logoUrl: string;
        logoWidth: string;
        logoHeight: string;
        navbarLogoWidth: string;
        navbarLogoHeight: string;
    };
    heroLayout: {
        logoOffsetX: string;
        logoOffsetY: string;
        titleOffsetX: string;
        titleOffsetY: string;
        subtitleOffsetY: string;
        ctaOffsetY: string;
    };
    theme: {
        backgroundColor: string;
        foregroundColor: string;
        primaryColor: string;
        accentColor: string;
        buttonTextColor: string;
        cardColor: string;
        radius: string;
    };
};

export type CmsFieldType = "text" | "textarea" | "url" | "color" | "range";

export type CmsFieldDefinition = {
    key: string;
    section: "home" | "gallery" | "navbar" | "branding" | "heroLayout" | "theme";
    label: string;
    type: CmsFieldType;
    helpText?: string;
    min?: number;
    max?: number;
    step?: number;
};

export const SITE_CONTENT_DEFAULTS: SiteContent = {
    home: {
        pretitle: "Welkom bij",
        title: "KUNSTKWARTIERTJE",
        subtitle: "Ontdek, bewonder en deel unieke kunstwerken van talentvolle kunstenaars.",
        ctaLabel: "Start hier",
        ctaHref: "/register",
    },
    gallery: {
        title: "Art gallery",
        subtitle: "Bekijk goedgekeurde kunstwerken uit de community.",
        loadingText: "Kunstwerken laden...",
        emptyText: "Nog geen goedgekeurde kunstwerken beschikbaar.",
    },
    navbar: {
        viewProfileLabel: "Bekijk profiel",
        reservationsLabel: "Mijn reserveringen",
        pickupsLabel: "Pickup systeem",
        logoutLabel: "Log out",
    },
    branding: {
        logoUrl: "/kunstkwartiertje-logo.png",
        logoWidth: "240",
        logoHeight: "120",
        navbarLogoWidth: "140",
        navbarLogoHeight: "42",
    },
    heroLayout: {
        logoOffsetX: "0",
        logoOffsetY: "0",
        titleOffsetX: "0",
        titleOffsetY: "0",
        subtitleOffsetY: "0",
        ctaOffsetY: "0",
    },
    theme: {
        backgroundColor: "#ffffff",
        foregroundColor: "#171717",
        primaryColor: "#7c3aed",
        accentColor: "#f59e0b",
        buttonTextColor: "#111827",
        cardColor: "#ffffff",
        radius: "16",
    },
};

export const CMS_FIELD_DEFINITIONS: CmsFieldDefinition[] = [
    {
        key: "home.pretitle",
        section: "home",
        label: "Home - kleine titel",
        type: "text",
    },
    {
        key: "home.title",
        section: "home",
        label: "Home - hoofdtitel",
        type: "text",
    },
    {
        key: "home.subtitle",
        section: "home",
        label: "Home - introductietekst",
        type: "textarea",
    },
    {
        key: "home.ctaLabel",
        section: "home",
        label: "Home - knoptekst",
        type: "text",
    },
    {
        key: "home.ctaHref",
        section: "home",
        label: "Home - knoplink",
        type: "url",
        helpText: "Bijvoorbeeld /register, /login of https://...",
    },
    {
        key: "gallery.title",
        section: "gallery",
        label: "Gallery - titel",
        type: "text",
    },
    {
        key: "gallery.subtitle",
        section: "gallery",
        label: "Gallery - subtitel",
        type: "textarea",
    },
    {
        key: "gallery.loadingText",
        section: "gallery",
        label: "Gallery - laadtekst",
        type: "text",
    },
    {
        key: "gallery.emptyText",
        section: "gallery",
        label: "Gallery - lege status",
        type: "text",
    },
    {
        key: "navbar.viewProfileLabel",
        section: "navbar",
        label: "Menu - Bekijk profiel",
        type: "text",
    },
    {
        key: "navbar.reservationsLabel",
        section: "navbar",
        label: "Menu - Mijn reserveringen",
        type: "text",
    },
    {
        key: "navbar.pickupsLabel",
        section: "navbar",
        label: "Menu - Pickup systeem",
        type: "text",
    },
    {
        key: "navbar.logoutLabel",
        section: "navbar",
        label: "Menu - Uitloggen",
        type: "text",
    },
    {
        key: "branding.logoUrl",
        section: "branding",
        label: "Branding - logo URL",
        type: "url",
        helpText: "Bijvoorbeeld /kunstkwartiertje-logo.png of https://...",
    },
    {
        key: "branding.logoWidth",
        section: "branding",
        label: "Branding - logo breedte homepage",
        type: "range",
        min: 60,
        max: 500,
        step: 1,
    },
    {
        key: "branding.logoHeight",
        section: "branding",
        label: "Branding - logo hoogte homepage",
        type: "range",
        min: 30,
        max: 260,
        step: 1,
    },
    {
        key: "branding.navbarLogoWidth",
        section: "branding",
        label: "Branding - logo breedte navbar",
        type: "range",
        min: 60,
        max: 260,
        step: 1,
    },
    {
        key: "branding.navbarLogoHeight",
        section: "branding",
        label: "Branding - logo hoogte navbar",
        type: "range",
        min: 20,
        max: 120,
        step: 1,
    },
    {
        key: "heroLayout.logoOffsetX",
        section: "heroLayout",
        label: "Hero - logo horizontale positie",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
    },
    {
        key: "heroLayout.logoOffsetY",
        section: "heroLayout",
        label: "Hero - logo verticale positie",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
    },
    {
        key: "heroLayout.titleOffsetX",
        section: "heroLayout",
        label: "Hero - titel horizontale positie",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
    },
    {
        key: "heroLayout.titleOffsetY",
        section: "heroLayout",
        label: "Hero - titel verticale positie",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
    },
    {
        key: "heroLayout.subtitleOffsetY",
        section: "heroLayout",
        label: "Hero - subtitel verticale positie",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
    },
    {
        key: "heroLayout.ctaOffsetY",
        section: "heroLayout",
        label: "Hero - knop verticale positie",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
    },
    {
        key: "theme.backgroundColor",
        section: "theme",
        label: "Thema - Achtergrondkleur",
        type: "color",
    },
    {
        key: "theme.foregroundColor",
        section: "theme",
        label: "Thema - Tekstkleur",
        type: "color",
    },
    {
        key: "theme.primaryColor",
        section: "theme",
        label: "Thema - Primaire kleur",
        type: "color",
    },
    {
        key: "theme.accentColor",
        section: "theme",
        label: "Thema - Accentkleur",
        type: "color",
    },
    {
        key: "theme.buttonTextColor",
        section: "theme",
        label: "Thema - Kleur knoptekst",
        type: "color",
    },
    {
        key: "theme.cardColor",
        section: "theme",
        label: "Thema - Kaartkleur",
        type: "color",
    },
    {
        key: "theme.radius",
        section: "theme",
        label: "Thema - Hoekafronding (px)",
        type: "text",
        helpText: "Bijvoorbeeld 8, 12 of 20",
    },
];

export const flattenSiteContent = (content: SiteContent): Record<string, string> => ({
    "home.pretitle": content.home.pretitle,
    "home.title": content.home.title,
    "home.subtitle": content.home.subtitle,
    "home.ctaLabel": content.home.ctaLabel,
    "home.ctaHref": content.home.ctaHref,
    "gallery.title": content.gallery.title,
    "gallery.subtitle": content.gallery.subtitle,
    "gallery.loadingText": content.gallery.loadingText,
    "gallery.emptyText": content.gallery.emptyText,
    "navbar.viewProfileLabel": content.navbar.viewProfileLabel,
    "navbar.reservationsLabel": content.navbar.reservationsLabel,
    "navbar.pickupsLabel": content.navbar.pickupsLabel,
    "navbar.logoutLabel": content.navbar.logoutLabel,
    "branding.logoUrl": content.branding.logoUrl,
    "branding.logoWidth": content.branding.logoWidth,
    "branding.logoHeight": content.branding.logoHeight,
    "branding.navbarLogoWidth": content.branding.navbarLogoWidth,
    "branding.navbarLogoHeight": content.branding.navbarLogoHeight,
    "heroLayout.logoOffsetX": content.heroLayout.logoOffsetX,
    "heroLayout.logoOffsetY": content.heroLayout.logoOffsetY,
    "heroLayout.titleOffsetX": content.heroLayout.titleOffsetX,
    "heroLayout.titleOffsetY": content.heroLayout.titleOffsetY,
    "heroLayout.subtitleOffsetY": content.heroLayout.subtitleOffsetY,
    "heroLayout.ctaOffsetY": content.heroLayout.ctaOffsetY,
    "theme.backgroundColor": content.theme.backgroundColor,
    "theme.foregroundColor": content.theme.foregroundColor,
    "theme.primaryColor": content.theme.primaryColor,
    "theme.accentColor": content.theme.accentColor,
    "theme.buttonTextColor": content.theme.buttonTextColor,
    "theme.cardColor": content.theme.cardColor,
    "theme.radius": content.theme.radius,
});

export const buildSiteContent = (overrides?: Record<string, string | null | undefined>): SiteContent => {
    const merged = {
        ...flattenSiteContent(SITE_CONTENT_DEFAULTS),
    };

    for (const [key, value] of Object.entries(overrides ?? {})) {
        if (typeof value === "string" && key in merged) {
            merged[key as keyof typeof merged] = value;
        }
    }

    return {
        home: {
            pretitle: merged["home.pretitle"],
            title: merged["home.title"],
            subtitle: merged["home.subtitle"],
            ctaLabel: merged["home.ctaLabel"],
            ctaHref: merged["home.ctaHref"],
        },
        gallery: {
            title: merged["gallery.title"],
            subtitle: merged["gallery.subtitle"],
            loadingText: merged["gallery.loadingText"],
            emptyText: merged["gallery.emptyText"],
        },
        navbar: {
            viewProfileLabel: merged["navbar.viewProfileLabel"],
            reservationsLabel: merged["navbar.reservationsLabel"],
            pickupsLabel: merged["navbar.pickupsLabel"],
            logoutLabel: merged["navbar.logoutLabel"],
        },
        branding: {
            logoUrl: merged["branding.logoUrl"],
            logoWidth: merged["branding.logoWidth"],
            logoHeight: merged["branding.logoHeight"],
            navbarLogoWidth: merged["branding.navbarLogoWidth"],
            navbarLogoHeight: merged["branding.navbarLogoHeight"],
        },
        heroLayout: {
            logoOffsetX: merged["heroLayout.logoOffsetX"],
            logoOffsetY: merged["heroLayout.logoOffsetY"],
            titleOffsetX: merged["heroLayout.titleOffsetX"],
            titleOffsetY: merged["heroLayout.titleOffsetY"],
            subtitleOffsetY: merged["heroLayout.subtitleOffsetY"],
            ctaOffsetY: merged["heroLayout.ctaOffsetY"],
        },
        theme: {
            backgroundColor: merged["theme.backgroundColor"],
            foregroundColor: merged["theme.foregroundColor"],
            primaryColor: merged["theme.primaryColor"],
            accentColor: merged["theme.accentColor"],
            buttonTextColor: merged["theme.buttonTextColor"],
            cardColor: merged["theme.cardColor"],
            radius: merged["theme.radius"],
        },
    };
};
