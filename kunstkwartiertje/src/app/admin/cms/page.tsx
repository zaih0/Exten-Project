"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    buildSiteContent,
    type CmsFieldDefinition,
    CMS_FIELD_DEFINITIONS,
    flattenSiteContent,
    SITE_CONTENT_DEFAULTS,
    type SiteContent,
} from "src/utils/siteContent";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

const sectionTitle: Record<string, string> = {
    home: "Homepage",
    gallery: "Art gallery",
    navbar: "Navigatie",
    branding: "Branding",
    heroLayout: "Hero layout",
    theme: "Thema",
};

type CmsFieldGroups = Record<string, CmsFieldDefinition[]>;

const COLOR_PRESETS: Array<{ name: string; values: Record<string, string> }> = [
    {
        name: "Soft Light",
        values: {
            "theme.backgroundColor": "#f8fafc",
            "theme.foregroundColor": "#1f2937",
            "theme.primaryColor": "#475569",
            "theme.accentColor": "#f59e0b",
            "theme.buttonTextColor": "#111827",
            "theme.cardColor": "#ffffff",
        },
    },
    {
        name: "Minimal Neutral",
        values: {
            "theme.backgroundColor": "#ffffff",
            "theme.foregroundColor": "#111827",
            "theme.primaryColor": "#111827",
            "theme.accentColor": "#6b7280",
            "theme.buttonTextColor": "#ffffff",
            "theme.cardColor": "#f3f4f6",
        },
    },
    {
        name: "Dark Contrast",
        values: {
            "theme.backgroundColor": "#0b1020",
            "theme.foregroundColor": "#e5e7eb",
            "theme.primaryColor": "#1d4ed8",
            "theme.accentColor": "#f59e0b",
            "theme.buttonTextColor": "#111827",
            "theme.cardColor": "#111827",
        },
    },
];

export default function AdminCmsPage() {
    const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
    const [flatValues, setFlatValues] = useState<Record<string, string>>(flattenSiteContent(SITE_CONTENT_DEFAULTS));
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const groupedFields = useMemo<CmsFieldGroups>(() => {
        return CMS_FIELD_DEFINITIONS.reduce<CmsFieldGroups>((acc, field) => {
            if (!acc[field.section]) acc[field.section] = [];
            acc[field.section].push(field);
            return acc;
        }, {});
    }, []);

    const previewContent: SiteContent = useMemo(() => {
        return buildSiteContent(flatValues);
    }, [flatValues]);

    useEffect(() => {
        let isMounted = true;

        const checkAuthAndLoad = async () => {
            setError(null);
            const sessionResponse = await fetch("/api/admin/auth/session", {
                method: "GET",
                cache: "no-store",
            });

            const sessionText = await sessionResponse.text();
            const sessionResult = (() => {
                try {
                    return JSON.parse(sessionText) as { authenticated?: boolean };
                } catch {
                    return null;
                }
            })();

            if (!sessionResponse.ok || !sessionResult?.authenticated) {
                if (isMounted) {
                    setAuthStatus("unauthenticated");
                    setIsLoading(false);
                }
                return;
            }

            if (!isMounted) return;
            setAuthStatus("authenticated");

            const response = await fetch("/api/admin/content", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as {
                        error?: string;
                        warning?: string;
                        flatValues?: Record<string, string>;
                    };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok) {
                setError(result?.error ?? "Kon CMS-gegevens niet laden.");
                setIsLoading(false);
                return;
            }

            if (result?.warning) {
                setError(result.warning);
            }

            setFlatValues(result?.flatValues ?? flattenSiteContent(SITE_CONTENT_DEFAULTS));
            setIsLoading(false);
        };

        void checkAuthAndLoad();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setMessage(null);

        const response = await fetch("/api/admin/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ values: flatValues }),
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; flatValues?: Record<string, string> };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Opslaan mislukt.");
            setIsSaving(false);
            return;
        }

        if (result?.flatValues) {
            setFlatValues(result.flatValues);
        }

        setMessage("CMS-inhoud opgeslagen.");
        setIsSaving(false);
    };

    if (authStatus === "checking" || isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
                <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-200 bg-white p-6">CMS laden...</div>
            </div>
        );
    }

    if (authStatus === "unauthenticated") {
        return (
            <div className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
                <div className="mx-auto max-w-5xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                    Admin login vereist. <Link href="/admin?login=1" className="font-semibold underline">Ga naar admin login</Link>.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-10 text-zinc-900">
            <div className="mx-auto max-w-6xl space-y-5">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">No-code beheer</p>
                            <h1 className="mt-1 text-2xl font-bold">Website CMS editor</h1>
                            <p className="mt-2 text-sm text-zinc-600">
                                Pas teksten aan zonder code te wijzigen. Klik op opslaan en vernieuw de website.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/admin" className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-100">
                                Terug naar admin
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setFlatValues(flattenSiteContent(SITE_CONTENT_DEFAULTS));
                                    setMessage("Teruggezet naar standaardwaarden. Klik nog op opslaan.");
                                }}
                                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold hover:bg-zinc-200"
                            >
                                Reset naar standaard
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                                {isSaving ? "Opslaan..." : "Opslaan"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-500">Kleur presets:</span>
                        {COLOR_PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                    setFlatValues((previous) => ({ ...previous, ...preset.values }));
                                    setMessage(`Preset toegepast: ${preset.name}`);
                                }}
                                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>

                    {(error || message) && (
                        <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {error ?? message}
                        </p>
                    )}
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-4">
                        {Object.keys(groupedFields).map((section) => (
                            <div key={section} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">{sectionTitle[section] ?? section}</h2>
                                <div className="mt-4 space-y-4">
                                    {groupedFields[section].map((field) => (
                                        <label key={field.key} className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
                                            {field.label}
                                            {field.type === "textarea" ? (
                                                <textarea
                                                    value={flatValues[field.key] ?? ""}
                                                    rows={3}
                                                    onChange={(event) =>
                                                        setFlatValues((previous) => ({
                                                            ...previous,
                                                            [field.key]: event.target.value,
                                                        }))
                                                    }
                                                    className="rounded-xl border border-zinc-200 px-3 py-2"
                                                />
                                            ) : field.type === "color" ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={flatValues[field.key] ?? "#000000"}
                                                        onChange={(event) =>
                                                            setFlatValues((previous) => ({
                                                                ...previous,
                                                                [field.key]: event.target.value,
                                                            }))
                                                        }
                                                        className="h-10 w-16 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={flatValues[field.key] ?? ""}
                                                        onChange={(event) =>
                                                            setFlatValues((previous) => ({
                                                                ...previous,
                                                                [field.key]: event.target.value,
                                                            }))
                                                        }
                                                        className="flex-1 rounded-xl border border-zinc-200 px-3 py-2"
                                                    />
                                                    <div
                                                        className="h-10 w-10 rounded-lg border border-zinc-200"
                                                        style={{ backgroundColor: flatValues[field.key] ?? "transparent" }}
                                                        title="Kleur preview"
                                                    />
                                                </div>
                                            ) : field.type === "range" ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="range"
                                                        min={field.min ?? 0}
                                                        max={field.max ?? 100}
                                                        step={field.step ?? 1}
                                                        value={flatValues[field.key] ?? "0"}
                                                        onChange={(event) =>
                                                            setFlatValues((previous) => ({
                                                                ...previous,
                                                                [field.key]: event.target.value,
                                                            }))
                                                        }
                                                        className="w-full"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={field.min}
                                                        max={field.max}
                                                        step={field.step ?? 1}
                                                        value={flatValues[field.key] ?? "0"}
                                                        onChange={(event) =>
                                                            setFlatValues((previous) => ({
                                                                ...previous,
                                                                [field.key]: event.target.value,
                                                            }))
                                                        }
                                                        className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type={field.type === "url" ? "url" : "text"}
                                                    value={flatValues[field.key] ?? ""}
                                                    onChange={(event) =>
                                                        setFlatValues((previous) => ({
                                                            ...previous,
                                                            [field.key]: event.target.value,
                                                        }))
                                                    }
                                                    className="rounded-xl border border-zinc-200 px-3 py-2"
                                                />
                                            )}
                                            {field.helpText && <span className="text-xs text-zinc-500">{field.helpText}</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold">Live preview (tekst)</h2>
                        <div className="mt-4 space-y-5 text-sm text-zinc-700">
                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Homepage</p>
                                <p className="mt-2 text-base font-semibold">{previewContent.home.pretitle}</p>
                                <p className="text-xl font-bold">{previewContent.home.title}</p>
                                <p className="mt-2">{previewContent.home.subtitle}</p>
                                <p className="mt-2 text-xs text-zinc-500">
                                    Knop: {previewContent.home.ctaLabel} → {previewContent.home.ctaHref}
                                </p>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Art gallery</p>
                                <p className="mt-2 text-base font-semibold">{previewContent.gallery.title}</p>
                                <p className="mt-2">{previewContent.gallery.subtitle}</p>
                                <p className="mt-2 text-xs text-zinc-500">Laadtekst: {previewContent.gallery.loadingText}</p>
                                <p className="text-xs text-zinc-500">Lege status: {previewContent.gallery.emptyText}</p>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Navigatiemenu</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                    <li>{previewContent.navbar.viewProfileLabel}</li>
                                    <li>{previewContent.navbar.reservationsLabel}</li>
                                    <li>{previewContent.navbar.pickupsLabel}</li>
                                    <li>{previewContent.navbar.logoutLabel}</li>
                                </ul>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Thema</p>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                    <p>Achtergrond: {previewContent.theme.backgroundColor}</p>
                                    <p>Tekst: {previewContent.theme.foregroundColor}</p>
                                    <p>Primair: {previewContent.theme.primaryColor}</p>
                                    <p>Accent: {previewContent.theme.accentColor}</p>
                                    <p>Knoptekst: {previewContent.theme.buttonTextColor}</p>
                                    <p>Kaart: {previewContent.theme.cardColor}</p>
                                    <p>Radius: {previewContent.theme.radius}px</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Live page preview</p>
                                <div
                                    className="mt-3 overflow-hidden rounded-xl border border-zinc-200"
                                    style={{
                                        backgroundColor: previewContent.theme.backgroundColor,
                                        borderRadius: `${Number(previewContent.theme.radius) || 16}px`,
                                    }}
                                >
                                    <div className="flex items-center justify-between border-b border-white/30 px-4 py-3" style={{ backgroundColor: previewContent.theme.cardColor }}>
                                        <img
                                            src={previewContent.branding.logoUrl || "/kunstkwartiertje-logo.png"}
                                            alt="Logo preview"
                                            style={{
                                                width: `${Number(previewContent.branding.navbarLogoWidth) || 140}px`,
                                                height: `${Number(previewContent.branding.navbarLogoHeight) || 42}px`,
                                                objectFit: "contain",
                                            }}
                                        />
                                        <div className="text-xs" style={{ color: previewContent.theme.foregroundColor }}>Menu</div>
                                    </div>

                                    <div className="px-6 py-8 text-center" style={{ backgroundColor: previewContent.theme.primaryColor }}>
                                        <p className="text-xs tracking-[0.15em]" style={{ color: "#f8fafc" }}>{previewContent.home.pretitle}</p>
                                        <div className="mt-3 flex items-center justify-center gap-3">
                                            <img
                                                src={previewContent.branding.logoUrl || "/kunstkwartiertje-logo.png"}
                                                alt="Hero logo preview"
                                                style={{
                                                    width: `${Number(previewContent.branding.logoWidth) || 240}px`,
                                                    height: `${Number(previewContent.branding.logoHeight) || 120}px`,
                                                    transform: `translate(${Number(previewContent.heroLayout.logoOffsetX) || 0}px, ${Number(previewContent.heroLayout.logoOffsetY) || 0}px)`,
                                                    objectFit: "contain",
                                                }}
                                            />
                                            <h3
                                                className="text-lg font-bold"
                                                style={{
                                                    color: "#ffffff",
                                                    transform: `translate(${Number(previewContent.heroLayout.titleOffsetX) || 0}px, ${Number(previewContent.heroLayout.titleOffsetY) || 0}px)`,
                                                }}
                                            >
                                                {previewContent.home.title}
                                            </h3>
                                        </div>
                                        <p className="mx-auto mt-3 max-w-md text-xs" style={{ color: "#e5e7eb", transform: `translateY(${Number(previewContent.heroLayout.subtitleOffsetY) || 0}px)` }}>
                                            {previewContent.home.subtitle}
                                        </p>
                                        <button
                                            type="button"
                                            className="mt-4 px-4 py-2 text-xs font-semibold"
                                            style={{
                                                backgroundColor: previewContent.theme.accentColor,
                                                color: previewContent.theme.buttonTextColor,
                                                borderRadius: `${Number(previewContent.theme.radius) || 16}px`,
                                                transform: `translateY(${Number(previewContent.heroLayout.ctaOffsetY) || 0}px)`,
                                            }}
                                        >
                                            {previewContent.home.ctaLabel}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
