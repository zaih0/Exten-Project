import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type PatchBody = {
    accompanistEmail?: string;
    messageId?: number;
    newText?: string;
};

const parseArtistId = async (context: { params: { artistId: string } | Promise<{ artistId: string }> }) => {
    const params = await Promise.resolve(context.params);
    const artistId = Number(params.artistId);
    return Number.isFinite(artistId) ? artistId : null;
};

const verifyLink = async (supabase: ReturnType<typeof createAdminClient>, accompanistEmail: string, artistUserId: number) => {
    const { data: accompanist, error: accError } = await supabase
        .from("users")
        .select("id")
        .eq("email", accompanistEmail)
        .maybeSingle();

    if (accError) return { error: accError.message, status: 500 as const };
    if (!accompanist?.id) return { error: "Begeleider niet gevonden.", status: 404 as const };

    const { data: link, error: linkError } = await supabase
        .from("accompanist_artist_permissions")
        .select("artist_user_id")
        .eq("accompanist_user_id", Number(accompanist.id))
        .eq("artist_user_id", artistUserId)
        .maybeSingle();

    if (linkError) {
        if (linkError.code === "42P01") {
            return { error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit.", status: 500 as const };
        }
        return { error: linkError.message, status: 500 as const };
    }

    if (!link) return { error: "Deze artiest is niet gekoppeld aan jouw account.", status: 403 as const };
    return { ok: true as const };
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
    if (!artistId) return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });

    try {
        const supabase = createAdminClient();
        const access = await verifyLink(supabase, accompanistEmail, artistId);
        if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

        const { data: rows, error } = await supabase
            .from("chat")
            .select("id, sender_id, receiver_id, message, image_url, sent_date, read_date")
            .eq("sender_id", artistId)
            .order("sent_date", { ascending: false });

        if (error) {
            if (error.code === "42P01") return NextResponse.json({ messages: [] });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        type ChatRow = {
            id: number;
            sender_id: number | null;
            receiver_id: number | null;
            message: string | null;
            image_url: string | null;
            sent_date: string | null;
            read_date: string | null;
        };

        const receiverIds = [...new Set((rows ?? []).map((r: ChatRow) => Number(r.receiver_id)))];
        const usernameMap = new Map<number, string>();

        if (receiverIds.length > 0) {
            const { data: users } = await supabase
                .from("users")
                .select("id, username, email")
                .in("id", receiverIds);

            for (const u of users ?? []) {
                usernameMap.set(Number(u.id), (u.username as string | null) ?? (u.email as string | null) ?? "Gebruiker");
            }
        }

        const messages = (rows ?? []).map((row: ChatRow) => ({
            id: row.id,
            receiverId: Number(row.receiver_id),
            receiverName: usernameMap.get(Number(row.receiver_id)) ?? "Onbekend",
            message: row.message ?? "",
            imageUrl: row.image_url ?? null,
            sentDate: row.sent_date ?? null,
            readDate: row.read_date ?? null,
        }));

        return NextResponse.json({ messages });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Serverfout" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: { params: { artistId: string } | Promise<{ artistId: string }> },
) {
    let payload: PatchBody;
    try {
        payload = (await request.json()) as PatchBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const accompanistEmail = payload.accompanistEmail?.trim().toLowerCase();
    const messageId = Number(payload.messageId);
    const newText = typeof payload.newText === "string" ? payload.newText.trim() : null;

    if (!accompanistEmail || !Number.isFinite(messageId) || newText === null) {
        return NextResponse.json(
            { error: "accompanistEmail, messageId en newText zijn verplicht." },
            { status: 400 },
        );
    }

    const artistId = await parseArtistId(context);
    if (!artistId) return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });

    try {
        const supabase = createAdminClient();
        const access = await verifyLink(supabase, accompanistEmail, artistId);
        if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

        // Verify the message was actually sent by this artist
        const { data: msg, error: msgError } = await supabase
            .from("chat")
            .select("id, sender_id")
            .eq("id", messageId)
            .eq("sender_id", artistId)
            .maybeSingle();

        if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });
        if (!msg) {
            return NextResponse.json(
                { error: "Bericht niet gevonden of niet verzonden door deze artiest." },
                { status: 404 },
            );
        }

        const { error: updateError } = await supabase
            .from("chat")
            .update({ message: newText || null })
            .eq("id", messageId);

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Serverfout" }, { status: 500 });
    }
}
