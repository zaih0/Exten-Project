import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim();

    if (!email) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const { data: artistUser, error: artistError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (artistError) {
            return NextResponse.json({ error: artistError.message }, { status: 500 });
        }

        if (!artistUser?.id) {
            return NextResponse.json({ pickups: [] });
        }

        const { data: artworkRows, error: artworksError } = await supabase
            .from("artworks")
            .select("id, title, description, images, status")
            .eq("user_id", artistUser.id)
            .eq("status", "approved");

        if (artworksError) {
            return NextResponse.json({ error: artworksError.message }, { status: 500 });
        }

        const artIds = (artworkRows ?? []).map((item) => Number(item.id)).filter((value) => Number.isFinite(value));

        if (artIds.length === 0) {
            return NextResponse.json({ pickups: [] });
        }

        const { data: reservations, error: reservationsError } = await supabase
            .from("reserved_artworks")
            .select("user_id, art_id, pickup_status, picked_up_at, current_location_name, current_location_address")
            .in("art_id", artIds);

        if (reservationsError) {
            if (reservationsError.code === "42703") {
                return NextResponse.json(
                    {
                        error:
                            "Pickup kolommen ontbreken in reserved_artworks. Voeg pickup_status, picked_up_at, current_location_name en current_location_address toe.",
                    },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: reservationsError.message }, { status: 500 });
        }

        const entrepreneurIds = Array.from(
            new Set((reservations ?? []).map((item) => Number(item.user_id)).filter((value) => Number.isFinite(value))),
        );

        const entrepreneursById = new Map<number, { username: string | null; email: string | null }>();

        if (entrepreneurIds.length > 0) {
            const { data: users, error: usersError } = await supabase
                .from("users")
                .select("id, username, email")
                .in("id", entrepreneurIds);

            if (usersError) {
                return NextResponse.json({ error: usersError.message }, { status: 500 });
            }

            for (const user of users ?? []) {
                entrepreneursById.set(Number(user.id), {
                    username: user.username ?? null,
                    email: user.email ?? null,
                });
            }
        }

        const artworksById = new Map<number, (typeof artworkRows)[number]>();
        for (const artwork of artworkRows ?? []) {
            artworksById.set(Number(artwork.id), artwork);
        }

        const pickups = (reservations ?? []).map((reservation) => {
            const artwork = artworksById.get(Number(reservation.art_id));
            const entrepreneur = entrepreneursById.get(Number(reservation.user_id));

            return {
                artId: Number(reservation.art_id),
                artworkTitle: artwork?.title ?? "Onbekend kunstwerk",
                artworkDescription: artwork?.description ?? "",
                artworkImageUrl: Array.isArray(artwork?.images)
                    ? (artwork?.images?.[0] ?? "")
                    : (artwork?.images ?? ""),
                entrepreneurUserId: Number(reservation.user_id),
                entrepreneurName: entrepreneur?.username ?? entrepreneur?.email ?? "Onbekende ondernemer",
                pickupStatus: reservation.pickup_status ?? "reserved",
                pickedUpAt: reservation.picked_up_at ?? null,
                locationName: reservation.current_location_name ?? null,
                locationAddress: reservation.current_location_address ?? null,
            };
        });

        return NextResponse.json({ pickups });
    } catch (error) {
        console.error("Pickups GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van pickup overzicht." }, { status: 500 });
    }
}
