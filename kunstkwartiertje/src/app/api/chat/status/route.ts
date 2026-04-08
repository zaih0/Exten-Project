import { NextResponse } from "next/server";
import { getChatContext } from "src/utils/chatAccess";

export async function GET() {
    try {
        const context = await getChatContext();
        if ("error" in context) {
            return NextResponse.json({ error: context.error }, { status: context.status });
        }

        const { supabase, currentUser } = context;

        // Non-artists always have full send access
        if (currentUser.type !== "kunstenaar") {
            return NextResponse.json({ chatEnabled: true });
        }

        // Check accompanist links for this artist
        const { data: links, error } = await supabase
            .from("accompanist_artist_permissions")
            .select("can_use_chat")
            .eq("artist_user_id", currentUser.id);

        if (error) {
            // Table doesn't exist yet → no restrictions
            if (error.code === "42P01") {
                return NextResponse.json({ chatEnabled: true });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // No accompanist manages this artist → free artist → full access
        if (!links || links.length === 0) {
            return NextResponse.json({ chatEnabled: true });
        }

        // Chat is enabled if ANY accompanist has explicitly granted it
        const chatEnabled = (links as Array<{ can_use_chat: boolean }>).some((row) => row.can_use_chat);
        return NextResponse.json({ chatEnabled });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Onbekende fout" },
            { status: 500 },
        );
    }
}
