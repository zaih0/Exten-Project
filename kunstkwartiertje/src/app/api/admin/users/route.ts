import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type BlockBody = {
    email?: string;
};

export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("users")
            .select("id, email, username, type, status, created_at, blocked_status")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: data ?? [] });
    } catch (error) {
        console.error("Admin users GET error", error);
        return NextResponse.json(
            { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request) {
    let payload: BlockBody;

    try {
        payload = (await request.json()) as BlockBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!payload.email) {
        return NextResponse.json({ error: "Missing user email." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const { error } = await supabase
            .from("users")
            .update({ blocked_status: true, status: "denied" })
            .eq("email", payload.email);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Admin users PATCH error", error);
        return NextResponse.json(
            { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
            { status: 500 },
        );
    }
}
