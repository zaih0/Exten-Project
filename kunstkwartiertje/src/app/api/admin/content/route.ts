import { NextResponse } from "next/server";
import { requireAdminSession } from "src/utils/adminAuth";
import { buildSiteContent, flattenSiteContent } from "src/utils/siteContent";
import { createAdminClient } from "src/utils/supabase/admin";

type SiteContentRow = {
    content_key: string;
    content_value: string | null;
};

type UpdateBody = {
    values?: Record<string, string>;
};

export async function GET() {
    try {
        const auth = await requireAdminSession();
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("site_content")
            .select("content_key, content_value")
            .order("content_key", { ascending: true });

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json({
                    content: buildSiteContent(),
                    flatValues: flattenSiteContent(buildSiteContent()),
                    warning: "Tabel site_content ontbreekt. Voer database/site_content.sql uit.",
                });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const overrides: Record<string, string> = {};
        for (const row of (data ?? []) as SiteContentRow[]) {
            if (!row.content_key) continue;
            overrides[row.content_key] = row.content_value ?? "";
        }

        const content = buildSiteContent(overrides);
        return NextResponse.json({ content, flatValues: flattenSiteContent(content) });
    } catch (error) {
        console.error("Admin content GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen CMS-content." }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    let payload: UpdateBody;

    try {
        payload = (await request.json()) as UpdateBody;
    } catch {
        return NextResponse.json({ error: "Ongeldige JSON body." }, { status: 400 });
    }

    const values = payload.values;
    if (!values || typeof values !== "object") {
        return NextResponse.json({ error: "values is verplicht." }, { status: 400 });
    }

    try {
        const auth = await requireAdminSession();
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabase = createAdminClient();

        const rows = Object.entries(values).map(([content_key, content_value]) => ({
            content_key,
            content_value: String(content_value ?? ""),
            updated_by: auth.email,
        }));

        if (rows.length === 0) {
            return NextResponse.json({ error: "Geen velden om op te slaan." }, { status: 400 });
        }

        const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "content_key" });

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json({ error: "Tabel site_content ontbreekt. Voer database/site_content.sql uit." }, { status: 500 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const content = buildSiteContent(values);
        return NextResponse.json({ ok: true, content, flatValues: flattenSiteContent(content) });
    } catch (error) {
        console.error("Admin content PUT error", error);
        return NextResponse.json({ error: "Serverfout bij opslaan CMS-content." }, { status: 500 });
    }
}
