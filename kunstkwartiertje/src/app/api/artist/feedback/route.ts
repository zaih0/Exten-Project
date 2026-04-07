import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { createRequestClient } from "src/utils/supabase/request";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const authClient = await createRequestClient();
        const {
            data: { user: sessionUser },
            error: sessionError,
        } = await authClient.auth.getUser();

        if (sessionError) {
            return NextResponse.json({ error: sessionError.message }, { status: 401 });
        }

        const sessionEmail = sessionUser?.email?.trim().toLowerCase();
        if (!sessionEmail || sessionEmail !== email) {
            return NextResponse.json({ error: "Je mag deze feedback niet bekijken." }, { status: 403 });
        }

        const supabase = createAdminClient();

        const { data: artist, error: artistError } = await supabase
            .from("users")
            .select("id, type")
            .eq("email", email)
            .eq("type", "kunstenaar")
            .maybeSingle();

        if (artistError) {
            return NextResponse.json({ error: artistError.message }, { status: 500 });
        }

        if (!artist?.id) {
            return NextResponse.json({ error: "Artiest niet gevonden." }, { status: 404 });
        }

        const { data: feedbackRows, error: feedbackError } = await supabase
            .from("accompanist_artist_feedback")
            .select("id, accompanist_user_id, feedback_text, created_at")
            .eq("artist_user_id", Number(artist.id))
            .order("created_at", { ascending: false });

        if (feedbackError) {
            if (feedbackError.code === "42P01") {
                return NextResponse.json(
                    { error: "Feedbacktabel ontbreekt. Voer database/accompanist_artist_feedback.sql uit." },
                    { status: 500 },
                );
            }

            return NextResponse.json({ error: feedbackError.message }, { status: 500 });
        }

        const accompanistIds = Array.from(
            new Set((feedbackRows ?? []).map((row: { accompanist_user_id: number }) => Number(row.accompanist_user_id))),
        ).filter((id) => Number.isFinite(id));

        const { data: accompanists, error: accompanistsError } = accompanistIds.length
            ? await supabase
                  .from("users")
                  .select("id, username, email")
                  .in("id", accompanistIds)
            : { data: [], error: null };

        if (accompanistsError) {
            return NextResponse.json({ error: accompanistsError.message }, { status: 500 });
        }

        const accompanistById = new Map<number, { username?: string | null; email?: string | null }>();
        for (const row of accompanists ?? []) {
            accompanistById.set(Number(row.id), {
                username: row.username ?? null,
                email: row.email ?? null,
            });
        }

        return NextResponse.json({
            feedback: (feedbackRows ?? []).map(
                (item: { id: number; accompanist_user_id: number; feedback_text: string; created_at: string | null }) => ({
                    id: item.id,
                    feedbackText: item.feedback_text,
                    createdAt: item.created_at ?? null,
                    authorName:
                        accompanistById.get(Number(item.accompanist_user_id))?.username ??
                        accompanistById.get(Number(item.accompanist_user_id))?.email ??
                        "Begeleider",
                }),
            ),
        });
    } catch (error) {
        console.error("Artist feedback GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van feedback." }, { status: 500 });
    }
}
