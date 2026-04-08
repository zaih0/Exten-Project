"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { buildSiteContent, type SiteContent } from "src/utils/siteContent";

type SiteContentContextValue = {
    content: SiteContent;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

type SiteContentProviderProps = {
    initialContent: SiteContent;
    children: ReactNode;
};

export default function SiteContentProvider({ initialContent, children }: SiteContentProviderProps) {
    const [content, setContent] = useState<SiteContent>(initialContent);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/content", {
            method: "GET",
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; content?: SiteContent };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Kon websitecontent niet laden.");
            setContent(buildSiteContent());
            setIsLoading(false);
            return;
        }

        setContent(result?.content ?? buildSiteContent());
        setIsLoading(false);
    };

    const value = useMemo(
        () => ({
            content,
            isLoading,
            error,
            refresh,
        }),
        [content, error, isLoading],
    );

    return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export const useSiteContentContext = () => {
    const context = useContext(SiteContentContext);
    if (!context) {
        throw new Error("useSiteContentContext must be used within SiteContentProvider");
    }
    return context;
};
