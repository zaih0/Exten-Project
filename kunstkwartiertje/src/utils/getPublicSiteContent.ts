import { cache } from "react";
import { buildSiteContent, type SiteContent } from "src/utils/siteContent";
import { createAdminClient } from "src/utils/supabase/admin";

type SiteContentRow = {
    content_key: string;
    content_value: string | null;
};

export const getPublicSiteContent = cache(async (): Promise<SiteContent> => {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase.from("site_content").select("content_key, content_value");

        if (error) {
            if (error.code === "42P01") {
                return buildSiteContent();
            }
            console.error("Public site content load error", error);
            return buildSiteContent();
        }

        const overrides: Record<string, string> = {};
        for (const row of (data ?? []) as SiteContentRow[]) {
            if (!row.content_key) continue;
            overrides[row.content_key] = row.content_value ?? "";
        }

        return buildSiteContent(overrides);
    } catch (error) {
        console.error("Public site content unexpected error", error);
        return buildSiteContent();
    }
});
