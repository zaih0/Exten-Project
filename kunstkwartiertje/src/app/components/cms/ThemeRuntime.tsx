"use client";

import { useEffect } from "react";
import useSiteContent from "src/app/components/cms/useSiteContent";

const asCssColorOrFallback = (value: string | undefined, fallback: string) => {
    const normalized = (value ?? "").trim();
    if (!normalized) return fallback;

    if (typeof document === "undefined") return fallback;

    const probe = document.createElement("span");
    probe.style.color = "";
    probe.style.color = normalized;
    return probe.style.color ? normalized : fallback;
};

const asRadiusPxOrFallback = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return `${fallback}px`;
    const clamped = Math.max(0, Math.min(40, parsed));
    return `${clamped}px`;
};

const readRgb = (cssColor: string): [number, number, number] | null => {
    if (typeof document === "undefined") return null;
    const probe = document.createElement("span");
    probe.style.color = cssColor;
    const computed = probe.style.color;
    const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const contrastTextColor = (cssColor: string, dark = "#111827", light = "#ffffff") => {
    const rgb = readRgb(cssColor);
    if (!rgb) return light;
    const [r, g, b] = rgb;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? dark : light;
};

export default function ThemeRuntime() {
    const { content } = useSiteContent();

    useEffect(() => {
        const root = document.documentElement;
        const background = asCssColorOrFallback(content.theme.backgroundColor, "#ffffff");
        const foreground = asCssColorOrFallback(content.theme.foregroundColor, "#171717");
        const primary = asCssColorOrFallback(content.theme.primaryColor, "#7c3aed");
        const accent = asCssColorOrFallback(content.theme.accentColor, "#f59e0b");
        const buttonText = asCssColorOrFallback(
            content.theme.buttonTextColor,
            contrastTextColor(accent),
        );
        const card = asCssColorOrFallback(content.theme.cardColor, "#ffffff");

        root.style.setProperty("--background", background);
        root.style.setProperty("--foreground", foreground);
        root.style.setProperty("--kk-primary", primary);
        root.style.setProperty("--kk-accent", accent);
        root.style.setProperty("--kk-button-text", buttonText);
        root.style.setProperty("--kk-card", card);
        root.style.setProperty("--kk-radius", asRadiusPxOrFallback(content.theme.radius, 16));
        root.style.setProperty("--kk-on-primary", contrastTextColor(primary));
        root.style.setProperty("--kk-on-accent", buttonText);
    }, [content]);

    return null;
}
