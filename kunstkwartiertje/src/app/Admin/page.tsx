// Admin page Desktop (with tabs)
"use client";

import { useState } from "react";

type AdminTabKey = "access" | "chat" | "kunst" | "users" | "resetpw";

const adminTabs: Array<{ key: AdminTabKey; label: string }> = [
    { key: "access", label: "Toegangsverzoeken" },
    { key: "chat", label: "Chat moderatie" },
    { key: "kunst", label: "Kunst moderatie" },
    { key: "users", label: "Gebruikers verwijderen" },
    { key: "resetpw", label: "Wachtwoord herstellen" },
];

const adminTabExamples: Record<AdminTabKey, string[]> = {
    access: [
        "Gebruiker vraagt toegang aan (nieuwe artiest/partner aanvraag).",
        "Toegang wordt geweigerd door ontbrekende verificatie/gegevens.",
        "Nieuwe gebruiker vraagt toegang na het invullen van aanvullende info.",
    ],
    chat: [
        "Mogelijke spam of herhaald ongewenst gedrag in berichten.",
        "Discussies met beledigingen/haatdragende taal die gemodereerd moeten worden.",
        "Verdachte links of pogingen tot phishing via chatberichten.",
    ],
    kunst: [
        "Inzending bevat mogelijk auteursrechtelijk beschermde content.",
        "Kunstwerk lijkt ongepast (bv. geweld/naaktheid) of mist context.",
        "Dubbele/repeteerde inzendingen die verwijderd/afgekeurd moeten worden.",
    ],
    users: [
        "Account is herhaaldelijk in overtreding en verdient verwijdering.",
        "Verdacht gedrag of misbruik (bv. ban-omzeiling).",
        "Rapporten van meerdere gebruikers die samen een actie vragen.",
    ],
    resetpw: [
        "Gebruiker wil een wachtwoordherstel aanvragen (normale flow).",
        "Herstel wordt geblokkeerd door risicovolle/potentieel frauduleuze activiteit.",
        "Wachtwoordherstel voor accounts die tijdelijk vergrendeld zijn.",
    ],
};

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTabKey>("access");

    return (
        <div
            className="min-h-screen px-6 py-8 font-sans"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
            }}
        >
            <div className="mx-auto w-full max-w-6xl">
                {/* Top bar */}
                <div className="mb-6 rounded-xl border border-purple-200/35 bg-white/75 backdrop-blur">
                    <div className="flex h-16 items-center px-6">
                        <span className="text-sm font-semibold text-zinc-900">
                            Admin page Desktop
                        </span>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Sidebar */}
                    <aside className="w-64 rounded-xl border border-purple-200/35 bg-white/75 p-4 backdrop-blur">
                        <div className="mb-3 text-xs font-semibold text-purple-700/80">Tabs</div>
                        <div role="tablist" className="flex flex-col gap-2">
                            {adminTabs.map((tab) => {
                                const isActive = tab.key === activeTab;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={
                                            isActive
                                                ? "rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3 py-2 text-left text-sm font-semibold text-white shadow-md"
                                                : "rounded-lg bg-white/60 px-3 py-2 text-left text-sm font-semibold text-purple-900/80 ring-1 ring-purple-200/70 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-300"
                                        }
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 rounded-xl border border-purple-200/35 bg-white/75 p-6 backdrop-blur">
                        <div className="space-y-4">
                            <div className="rounded-lg border border-purple-200/60 bg-white/60 p-4">
                                <div className="text-sm font-semibold text-purple-700/90">
                                    {adminTabs.find((t) => t.key === activeTab)?.label}
                                </div>
                                <div className="mt-1 text-xs text-zinc-600/80">
                                    Voorbeelden van mogelijke situaties:
                                </div>

                                <ul className="mt-3 space-y-2 text-sm text-zinc-700/90">
                                    {adminTabExamples[activeTab].map((example) => (
                                        <li
                                            key={example}
                                            className="rounded-md bg-purple-50/70 px-3 py-2 ring-1 ring-purple-200/60"
                                        >
                                            {example}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="h-12 rounded-lg bg-gradient-to-r from-purple-200/55 to-fuchsia-200/40 ring-1 ring-purple-300/25" />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
