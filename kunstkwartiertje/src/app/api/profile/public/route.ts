import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { normalizeRole, resolveRoleTable } from "src/utils/profileRoleTable";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const userId = Number(url.searchParams.get("userId"));

    if (!Number.isFinite(userId)) {
        return NextResponse.json({ error: "Ongeldige userId." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, email, username, type, status, blocked_status")
            .eq("id", userId)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
        }

        const role = normalizeRole(user.type) ?? user.type ?? null;
        const table = await resolveRoleTable(supabase, role);

        let roleProfile: { username?: string | null; about_me?: string | null; profile_pic?: string | null } | null = null;
        if (table) {
            const { data, error } = await supabase
                .from(table)
                .select("username, about_me, profile_pic")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            roleProfile = data;
        }

        return NextResponse.json({
            profile: {
                userId: Number(user.id),
                username: roleProfile?.username ?? user.username ?? user.email?.split("@")[0] ?? "Gebruiker",
                aboutMe: roleProfile?.about_me ?? "",
                profilePic: roleProfile?.profile_pic ?? "",
                role,
                email: user.email?.trim().toLowerCase() ?? "",
                status: user.status ?? null,
                blocked: Boolean(user.blocked_status),
            },
        });
    } catch (error) {
        console.error("Public profile GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van publiek profiel." }, { status: 500 });
    }
}
