import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type ReservationBody = {
    email?: string;
    artId?: number;
};

type ReservationPatchBody = {
    email?: string;
    artId?: number;
    pickupStatus?: "reserved" | "picked_up";
    locationName?: string;
    locationAddress?: string;
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim();

    if (!email) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ artworks: [] });
        }

        let reservationsQuery: any = await supabase
            .from("reserved_artworks")
            .select("art_id, pickup_status, picked_up_at, current_location_name, current_location_address")
            .eq("user_id", user.id);

        if (reservationsQuery.error?.code === "42703") {
            reservationsQuery = await supabase
                .from("reserved_artworks")
                .select("art_id")
                .eq("user_id", user.id);
        }

        if (reservationsQuery.error) {
            return NextResponse.json({ error: reservationsQuery.error.message }, { status: 500 });
        }

        const reservations = reservationsQuery.data;

        const artIds = Array.from(
            new Set(
                (reservations ?? [])
                    .map((item: { art_id: unknown }) => Number(item.art_id))
                    .filter((value: number) => Number.isFinite(value)),
            ),
        );

        if (artIds.length === 0) {
            return NextResponse.json({ artworks: [] });
        }

        const { data: artworkRows, error: artworksError } = await supabase
            .from("artworks")
            .select("id, user_id, title, description, images, status, created_at")
            .in("id", artIds)
            .order("created_at", { ascending: false });

        if (artworksError) {
            return NextResponse.json({ error: artworksError.message }, { status: 500 });
        }

        const userIds = Array.from(
            new Set((artworkRows ?? []).map((item) => String(item.user_id)).filter((value) => value.length > 0)),
        );

        const usersById = new Map<string, { username: string | null; email: string | null }>();

        if (userIds.length > 0) {
            const { data: users, error: usersError } = await supabase
                .from("users")
                .select("id, username, email")
                .in("id", userIds);

            if (usersError) {
                return NextResponse.json({ error: usersError.message }, { status: 500 });
            }

            for (const artist of users ?? []) {
                usersById.set(String(artist.id), {
                    username: artist.username ?? null,
                    email: artist.email ?? null,
                });
            }
        }

        const reservationsByArtId = new Map<
            number,
            {
                pickup_status?: string | null;
                picked_up_at?: string | null;
                current_location_name?: string | null;
                current_location_address?: string | null;
            }
        >();

        for (const reservation of reservations ?? []) {
            reservationsByArtId.set(Number(reservation.art_id), {
                pickup_status:
                    typeof (reservation as { pickup_status?: unknown }).pickup_status === "string"
                        ? ((reservation as { pickup_status?: string }).pickup_status ?? null)
                        : null,
                picked_up_at:
                    typeof (reservation as { picked_up_at?: unknown }).picked_up_at === "string"
                        ? ((reservation as { picked_up_at?: string }).picked_up_at ?? null)
                        : null,
                current_location_name:
                    typeof (reservation as { current_location_name?: unknown }).current_location_name === "string"
                        ? ((reservation as { current_location_name?: string }).current_location_name ?? null)
                        : null,
                current_location_address:
                    typeof (reservation as { current_location_address?: unknown }).current_location_address === "string"
                        ? ((reservation as { current_location_address?: string }).current_location_address ?? null)
                        : null,
            });
        }

        const artworks = (artworkRows ?? []).map((item) => {
            const owner = usersById.get(String(item.user_id));
            const reservationState = reservationsByArtId.get(Number(item.id));

            return {
                id: item.id,
                artistUserId: Number(item.user_id),
                title: item.title,
                description: item.description,
                imageUrl: Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? ""),
                status: item.status ?? null,
                created_at: item.created_at ?? null,
                artistName: owner?.username ?? owner?.email ?? "Onbekende artiest",
                pickupStatus: reservationState?.pickup_status ?? "reserved",
                pickedUpAt: reservationState?.picked_up_at ?? null,
                locationName: reservationState?.current_location_name ?? null,
                locationAddress: reservationState?.current_location_address ?? null,
            };
        });

        return NextResponse.json({ artworks });
    } catch (error) {
        console.error("Reservations GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van reserveringen." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    let payload: ReservationPatchBody;

    try {
        payload = (await request.json()) as ReservationPatchBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = payload.email?.trim();
    const artId = Number(payload.artId);

    if (!email || !Number.isFinite(artId)) {
        return NextResponse.json({ error: "Missing email or artId." }, { status: 400 });
    }

    const pickupStatus = payload.pickupStatus === "picked_up" ? "picked_up" : "reserved";
    const locationName = payload.locationName?.trim() ?? "";
    const locationAddress = payload.locationAddress?.trim() ?? "";

    try {
        const supabase = createAdminClient();

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
        }

        const updatePayload = {
            pickup_status: pickupStatus,
            picked_up_at: pickupStatus === "picked_up" ? new Date().toISOString() : null,
            current_location_name: locationName || null,
            current_location_address: locationAddress || null,
        };

        const { error: updateError } = await supabase
            .from("reserved_artworks")
            .update(updatePayload)
            .eq("user_id", user.id)
            .eq("art_id", artId);

        if (updateError) {
            if (updateError.code === "42703") {
                return NextResponse.json(
                    {
                        error:
                            "Pickup kolommen ontbreken in reserved_artworks. Voeg pickup_status, picked_up_at, current_location_name en current_location_address toe.",
                    },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Reservations PATCH error", error);
        return NextResponse.json({ error: "Serverfout bij updaten van pickup status." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    let payload: ReservationBody;

    try {
        payload = (await request.json()) as ReservationBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = payload.email?.trim();
    const artId = Number(payload.artId);

    if (!email || !Number.isFinite(artId)) {
        return NextResponse.json({ error: "Missing email or artId." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
        }

        const { data: artwork, error: artworkError } = await supabase
            .from("artworks")
            .select("id, status")
            .eq("id", artId)
            .maybeSingle();

        if (artworkError) {
            return NextResponse.json({ error: artworkError.message }, { status: 500 });
        }

        if (!artwork?.id) {
            return NextResponse.json({ error: "Kunstwerk niet gevonden." }, { status: 404 });
        }

        if (artwork.status !== "approved") {
            return NextResponse.json({ error: "Alleen goedgekeurde kunstwerken kunnen worden gereserveerd." }, { status: 400 });
        }

        const { data: existingReservations, error: existingError } = await supabase
            .from("reserved_artworks")
            .select("user_id, art_id")
            .eq("art_id", artId)
            .limit(1);

        if (existingError) {
            return NextResponse.json({ error: existingError.message }, { status: 500 });
        }

        if ((existingReservations ?? []).length > 0) {
            const reservedByUserId = Number(existingReservations?.[0]?.user_id);

            if (Number(user.id) === reservedByUserId) {
                return NextResponse.json({ ok: true, message: "Kunstwerk staat al in je reserveringen." });
            }

            return NextResponse.json({ error: "Dit kunstwerk is al door iemand anders gereserveerd." }, { status: 409 });
        }

        let insertResult = await supabase.from("reserved_artworks").insert({
            user_id: user.id,
            art_id: artId,
            pickup_status: "reserved",
            picked_up_at: null,
            current_location_name: null,
            current_location_address: null,
        });

        if (insertResult.error?.code === "42703") {
            insertResult = await supabase.from("reserved_artworks").insert({
                user_id: user.id,
                art_id: artId,
            });
        }

        const insertError = insertResult.error;

        if (insertError) {
            if (typeof insertError.code === "string" && insertError.code === "23505") {
                return NextResponse.json({ error: "Dit kunstwerk is al gereserveerd." }, { status: 409 });
            }
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: "Kunstwerk toegevoegd aan je reserveringen." });
    } catch (error) {
        console.error("Reservations POST error", error);
        return NextResponse.json({ error: "Serverfout bij reserveren van kunstwerk." }, { status: 500 });
    }
}
