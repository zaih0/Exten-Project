import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { createRequestClient } from "src/utils/supabase/request";

type FeedbackBody = {
    accompanistEmail?: string;
    feedbackText?: string;
};

const parseArtistId = async (context: { params: { artistId: string } | Promise<{ artistId: string }> }) => {
    const params = await Promise.resolve(context.params);
    const artistId = Number(params.artistId);
    if (!Number.isFinite(artistId)) return null;
    return artistId;
};

const verifyAccompanistArtistLink = async (supabase: any, accompanistEmail: string, artistUserId: number) => {
    const { data: accompanist, error: accompanistError } = await supabase
        .from("users")
        .select("id, username, email")
        .eq("email", accompanistEmail)
        .maybeSingle();

    if (accompanistError) {
        return { error: accompanistError.message, status: 500 as const };
    }

    if (!accompanist?.id) {
        return { error: "Begeleider niet gevonden.", status: 404 as const };
    }

    const { data: link, error: linkError } = await supabase
        .from("accompanist_artist_permissions")
        .select("artist_user_id")
        .eq("accompanist_user_id", Number(accompanist.id))
        .eq("artist_user_id", artistUserId)
        .maybeSingle();

    if (linkError) {
        if (linkError.code === "42P01") {
            return {
                error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit.",
                status: 500 as const,
            };
        }

        return { error: linkError.message, status: 500 as const };
    }

    if (!link) {
        return { error: "Deze artiest is niet gekoppeld aan jouw account.", status: 403 as const };
    }

    return {
        accompanist: {
            id: Number(accompanist.id),
            username: accompanist.username ?? accompanist.email ?? "Begeleider",
        },
    };
};

export async function GET(
    request: Request,
    context: { params: { artistId: string } | Promise<{ artistId: string }> },
) {
    const url = new URL(request.url);
    const accompanistEmail = url.searchParams.get("accompanistEmail")?.trim().toLowerCase();

    if (!accompanistEmail) {
        return NextResponse.json({ error: "Missing accompanistEmail query param." }, { status: 400 });
    }

    const artistId = await parseArtistId(context);
    if (!artistId) {
        return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });
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
        if (!sessionEmail || sessionEmail !== accompanistEmail) {
            return NextResponse.json({ error: "Je mag deze feedback niet bekijken." }, { status: 403 });
        }

        const supabase = createAdminClient();
        const access = await verifyAccompanistArtistLink(supabase, accompanistEmail, artistId);

        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { data, error } = await supabase
            .from("accompanist_artist_feedback")
            .select("id, feedback_text, created_at")
            .eq("accompanist_user_id", access.accompanist.id)
            .eq("artist_user_id", artistId)
            .order("created_at", { ascending: false });

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Feedbacktabel ontbreekt. Voer database/accompanist_artist_feedback.sql uit." },
                    { status: 500 },
                );
            }

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            feedback: (data ?? []).map((item: { id: number; feedback_text: string; created_at: string | null }) => ({
                id: item.id,
                feedbackText: item.feedback_text,
                createdAt: item.created_at ?? null,
                authorName: access.accompanist.username,
            })),
        });
    } catch (error) {
        console.error("Accompanist artist feedback GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van feedback." }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    context: { params: { artistId: string } | Promise<{ artistId: string }> },
) {
    let payload: FeedbackBody;

    try {
        payload = (await request.json()) as FeedbackBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const accompanistEmail = payload.accompanistEmail?.trim().toLowerCase();
    const feedbackText = payload.feedbackText?.trim();

    if (!accompanistEmail || !feedbackText) {
        return NextResponse.json({ error: "accompanistEmail en feedbackText zijn verplicht." }, { status: 400 });
    }

    const artistId = await parseArtistId(context);
    if (!artistId) {
        return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });
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
        if (!sessionEmail || sessionEmail !== accompanistEmail) {
            return NextResponse.json({ error: "Je mag geen feedback plaatsen voor deze artiest." }, { status: 403 });
        }

        const supabase = createAdminClient();
        const access = await verifyAccompanistArtistLink(supabase, accompanistEmail, artistId);

        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { data, error } = await supabase
            .from("accompanist_artist_feedback")
            .insert({
                accompanist_user_id: access.accompanist.id,
                artist_user_id: artistId,
                feedback_text: feedbackText,
            })
            .select("id, feedback_text, created_at")
            .single();

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Feedbacktabel ontbreekt. Voer database/accompanist_artist_feedback.sql uit." },
                    { status: 500 },
                );
            }

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            feedback: {
                id: data.id,
                feedbackText: data.feedback_text,
                createdAt: data.created_at ?? null,
                authorName: access.accompanist.username,
            },
        });
    } catch (error) {
        console.error("Accompanist artist feedback POST error", error);
        return NextResponse.json({ error: "Serverfout bij opslaan van feedback." }, { status: 500 });
    }
}
