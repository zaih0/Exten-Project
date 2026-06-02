import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type PickupAssignmentBody = {
    email?: string;
    artId?: number;
    entrepreneurUserId?: number;
    action?: "assign" | "confirm_pickup";
};

type ReservationRow = {
    user_id: number | string;
    art_id: number | string;
    pickup_status?: string | null;
    reservation_status?: string | null;
    picked_up_at?: string | null;
    current_location_name?: string | null;
    current_location_address?: string | null;
};

const normalizePickupStatus = (pickupStatus: string | null | undefined, reservationStatus: string | null | undefined) => {
    if (reservationStatus === "pending") {
        return "pending_request";
    }

    if (pickupStatus === "awaiting_artist_confirmation" || pickupStatus === "picked_up") {
        return pickupStatus;
    }

    return "reserved";
};

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

        let reservationsQuery: any = await supabase
            .from("reserved_artworks")
            .select("user_id, art_id, pickup_status, reservation_status, picked_up_at, current_location_name, current_location_address")
            .in("art_id", artIds)
            .in("reservation_status", ["pending", "approved"])
            .in("pickup_status", ["pending_request", "reserved", "awaiting_artist_confirmation"]);

        if (reservationsQuery.error?.code === "42703") {
            reservationsQuery = await supabase
                .from("reserved_artworks")
                .select("user_id, art_id, pickup_status, picked_up_at, current_location_name, current_location_address")
                .in("art_id", artIds);
        }

        const reservationsError = reservationsQuery.error;
        const reservations = (reservationsQuery.data ?? []) as ReservationRow[];

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
            new Set(reservations.map((item) => Number(item.user_id)).filter((value) => Number.isFinite(value))),
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

        const pickups = reservations.map((reservation) => {
            const artwork = artworksById.get(Number(reservation.art_id));
            const entrepreneur = entrepreneursById.get(Number(reservation.user_id));
            const reservationStatus = reservation.reservation_status ?? "approved";
            const pickupStatus = normalizePickupStatus(reservation.pickup_status ?? null, reservationStatus);

            return {
                artId: Number(reservation.art_id),
                artworkTitle: artwork?.title ?? "Onbekend kunstwerk",
                artworkDescription: artwork?.description ?? "",
                artworkImageUrl: Array.isArray(artwork?.images)
                    ? (artwork?.images?.[0] ?? "")
                    : (artwork?.images ?? ""),
                entrepreneurUserId: Number(reservation.user_id),
                entrepreneurName: entrepreneur?.username ?? entrepreneur?.email ?? "Onbekende ondernemer",
                reservationStatus,
                pickupStatus,
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

export async function PATCH(request: Request) {
    let payload: PickupAssignmentBody;

    try {
        payload = (await request.json()) as PickupAssignmentBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = payload.email?.trim();
    const artId = Number(payload.artId);
    const entrepreneurUserId = Number(payload.entrepreneurUserId);
    const action = payload.action ?? "assign";

    if (!email || !Number.isFinite(artId)) {
        return NextResponse.json({ error: "Missing email or artId." }, { status: 400 });
    }

    if (action === "confirm_pickup") {
        if (!Number.isFinite(entrepreneurUserId)) {
            return NextResponse.json({ error: "Missing entrepreneurUserId." }, { status: 400 });
        }
        try {
            const supabase = createAdminClient();

            const { data: artistUser, error: artistError } = await supabase
                .from("users")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (artistError) return NextResponse.json({ error: artistError.message }, { status: 500 });
            if (!artistUser?.id) return NextResponse.json({ error: "Kunstenaar niet gevonden." }, { status: 404 });

            const { data: artwork, error: artworkError } = await supabase
                .from("artworks")
                .select("id, user_id")
                .eq("id", artId)
                .maybeSingle();

            if (artworkError) return NextResponse.json({ error: artworkError.message }, { status: 500 });
            if (!artwork?.id || Number(artwork.user_id) !== Number(artistUser.id)) {
                return NextResponse.json({ error: "Je mag dit kunstwerk niet bevestigen." }, { status: 403 });
            }

            let confirmResult: any = await supabase
                .from("reserved_artworks")
                .update({
                    pickup_status: "picked_up",
                    picked_up_at: new Date().toISOString(),
                })
                .eq("art_id", artId)
                .eq("user_id", entrepreneurUserId)
                .eq("pickup_status", "awaiting_artist_confirmation");

            if (confirmResult.error?.code === "42703") {
                confirmResult = await supabase
                    .from("reserved_artworks")
                    .update({ pickup_status: "picked_up", picked_up_at: new Date().toISOString() })
                    .eq("art_id", artId)
                    .eq("user_id", entrepreneurUserId);
            }

            if (confirmResult.error) return NextResponse.json({ error: confirmResult.error.message }, { status: 500 });

            return NextResponse.json({ ok: true, message: "Ophalen bevestigd door kunstenaar." });
        } catch (err) {
            console.error("Pickups confirm_pickup error", err);
            return NextResponse.json({ error: "Serverfout bij bevestigen ophalen." }, { status: 500 });
        }
    }

    if (!Number.isFinite(entrepreneurUserId)) {
        return NextResponse.json({ error: "Missing entrepreneurUserId." }, { status: 400 });
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
            return NextResponse.json({ error: "Kunstenaar niet gevonden." }, { status: 404 });
        }

        const { data: artwork, error: artworkError } = await supabase
            .from("artworks")
            .select("id, user_id")
            .eq("id", artId)
            .maybeSingle();

        if (artworkError) {
            return NextResponse.json({ error: artworkError.message }, { status: 500 });
        }

        if (!artwork?.id || Number(artwork.user_id) !== Number(artistUser.id)) {
            return NextResponse.json({ error: "Je mag dit kunstwerk niet toewijzen." }, { status: 403 });
        }

        const { data: targetRequest, error: targetError } = await supabase
            .from("reserved_artworks")
            .select("user_id, art_id")
            .eq("art_id", artId)
            .eq("user_id", entrepreneurUserId)
            .limit(1);

        if (targetError) {
            return NextResponse.json({ error: targetError.message }, { status: 500 });
        }

        if (!targetRequest || targetRequest.length === 0) {
            return NextResponse.json({ error: "Reserveringsverzoek niet gevonden." }, { status: 404 });
        }

        let approveResult: any = await supabase
            .from("reserved_artworks")
            .update({
                reservation_status: "approved",
                pickup_status: "reserved",
                picked_up_at: null,
            })
            .eq("art_id", artId)
            .eq("user_id", entrepreneurUserId);

        if (approveResult.error?.code === "42703") {
            approveResult = await supabase
                .from("reserved_artworks")
                .update({
                    pickup_status: "reserved",
                    picked_up_at: null,
                })
                .eq("art_id", artId)
                .eq("user_id", entrepreneurUserId);
        }

        if (approveResult.error) {
            return NextResponse.json({ error: approveResult.error.message }, { status: 500 });
        }

        let rejectOthersResult: any = await supabase
            .from("reserved_artworks")
            .update({
                reservation_status: "rejected",
                pickup_status: "pending_request",
            })
            .eq("art_id", artId)
            .neq("user_id", entrepreneurUserId)
            .eq("reservation_status", "pending");

        if (rejectOthersResult.error?.code === "42703") {
            rejectOthersResult = await supabase
                .from("reserved_artworks")
                .delete()
                .eq("art_id", artId)
                .neq("user_id", entrepreneurUserId)
                .eq("reservation_status", "pending");
        }

        if (rejectOthersResult.error) {
            return NextResponse.json({ error: rejectOthersResult.error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: "Ondernemer toegewezen aan dit kunstwerk." });
    } catch (error) {
        console.error("Pickups PATCH error", error);
        return NextResponse.json({ error: "Serverfout bij toewijzen van ondernemer." }, { status: 500 });
    }
}
