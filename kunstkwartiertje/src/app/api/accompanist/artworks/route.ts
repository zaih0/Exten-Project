import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const { data: accompanist, error: accompanistError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (accompanistError) {
            return NextResponse.json({ error: accompanistError.message }, { status: 500 });
        }

        if (!accompanist?.id) {
            return NextResponse.json({ pendingArtworks: [], approvedArtworks: [] });
        }

        const accompanistId = Number(accompanist.id);

        const { data: links, error: linksError } = await supabase
            .from("accompanist_artist_permissions")
            .select("artist_user_id")
            .eq("accompanist_user_id", accompanistId);

        if (linksError) {
            if (linksError.code === "42P01") {
                return NextResponse.json(
                    { error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: linksError.message }, { status: 500 });
        }

        const artistIds = (links ?? [])
            .map((item: { artist_user_id: unknown }) => Number(item.artist_user_id))
            .filter((id: number) => Number.isFinite(id));

        if (artistIds.length === 0) {
            return NextResponse.json({ pendingArtworks: [], approvedArtworks: [] });
        }

        const { data: artists, error: artistsError } = await supabase
            .from("users")
            .select("id, username, email")
            .in("id", artistIds);

        if (artistsError) {
            return NextResponse.json({ error: artistsError.message }, { status: 500 });
        }

        const artistById = new Map<number, { username: string | null; email: string | null }>();
        for (const artist of artists ?? []) {
            artistById.set(Number(artist.id), {
                username: artist.username ?? null,
                email: artist.email ?? null,
            });
        }

        const { data: artworks, error: artworksError } = await supabase
            .from("artworks")
            .select("id, user_id, title, description, images, status")
            .in("user_id", artistIds)
            .in("status", ["pending", "approved"])
            .order("id", { ascending: false });

        if (artworksError) {
            return NextResponse.json({ error: artworksError.message }, { status: 500 });
        }

        const normalized = (artworks ?? []).map((item) => {
            const owner = artistById.get(Number(item.user_id));
            return {
                id: Number(item.id),
                title: item.title ?? "Onbekend kunstwerk",
                artistName: owner?.username ?? owner?.email ?? "Onbekende artiest",
                description: item.description ?? "",
                imageUrl: Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? ""),
                status: (item.status ?? "pending") as "pending" | "approved" | "denied",
            };
        });

        return NextResponse.json({
            pendingArtworks: normalized.filter((item) => item.status === "pending"),
            approvedArtworks: normalized.filter((item) => item.status === "approved"),
        });
    } catch (error) {
        console.error("Accompanist artworks GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van kunstwerken." }, { status: 500 });
    }
}
