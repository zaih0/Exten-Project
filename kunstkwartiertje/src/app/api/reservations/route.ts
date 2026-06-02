import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { normalizeRole } from "src/utils/profileRoleTable";

type ReservationStatus = "pending" | "approved" | "rejected";

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
    artistConfirm?: boolean;
};

const RESERVATION_EXPIRY_DAYS = 30;

const normalizePickupStatus = (pickupStatus: string | null | undefined, reservationStatus: ReservationStatus | null | undefined) => {
    if (reservationStatus === "pending") {
        return "pending_request";
    }

    if (pickupStatus === "awaiting_artist_confirmation" || pickupStatus === "picked_up") {
        return pickupStatus;
    }

    return "reserved";
};

const getReservationExpiryCutoff = () => {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - RESERVATION_EXPIRY_DAYS);
    return cutoff.toISOString();
};

const refreshExpiredReservations = async (supabase: ReturnType<typeof createAdminClient>) => {
    const { data: artistUsers, error: artistUsersError } = await supabase
        .from("users")
        .select("id")
        .in("type", ["kunstenaar", "artist"]);

    if (artistUsersError) {
        return artistUsersError;
    }

    const artistUserIds = (artistUsers ?? [])
        .map((user: { id: number | string }) => Number(user.id))
        .filter((value: number) => Number.isFinite(value));

    if (artistUserIds.length > 0) {
        const { error: deleteArtistReservationsError } = await supabase
            .from("reserved_artworks")
            .delete()
            .in("user_id", artistUserIds);

        if (deleteArtistReservationsError) {
            return deleteArtistReservationsError;
        }
    }

    const cutoff = getReservationExpiryCutoff();
    const { error: expireReservationsError } = await supabase
        .from("reserved_artworks")
        .update({
            reservation_status: "rejected",
            pickup_status: "pending_request",
            picked_up_at: null,
            current_location_name: null,
            current_location_address: null,
        })
        .in("reservation_status", ["pending", "approved"])
        .lt("created_at", cutoff);

    return expireReservationsError ?? null;
};

const isEntrepreneurUser = async (
    supabase: ReturnType<typeof createAdminClient>,
    user: { id: number | string; type?: string | null },
) => {
    const normalized = normalizeRole(user.type ?? null);
    if (normalized === "ondernemer") return true;

    const { data, error } = await supabase
        .from("entrepreneur")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        // Missing profile table in some environments.
        if (error.code === "42P01") return false;
        return false;
    }

    return Boolean(data?.user_id);
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim();
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    if (!email) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const cleanupError = await refreshExpiredReservations(supabase);

        if (cleanupError) {
            console.warn("Reservation cleanup warning", cleanupError);
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, type")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ artworks: [] });
        }

        const isEntrepreneur = await isEntrepreneurUser(supabase, user);

        if (!isEntrepreneur) {
            return NextResponse.json({ artworks: [] });
        }

        let reservationsQuery: any = await supabase
            .from("reserved_artworks")
            .select("art_id, pickup_status, reservation_status, picked_up_at, current_location_name, current_location_address")
            .eq("user_id", user.id);

        if (activeOnly) {
            reservationsQuery = reservationsQuery.in("reservation_status", ["pending", "approved"]);
        }

        if (reservationsQuery.error?.code === "42703") {
            reservationsQuery = await supabase
                .from("reserved_artworks")
                .select("art_id, pickup_status, picked_up_at, current_location_name, current_location_address")
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
                reservation_status?: ReservationStatus | null;
                picked_up_at?: string | null;
                current_location_name?: string | null;
                current_location_address?: string | null;
            }
        >();

        for (const reservation of reservations ?? []) {
            const reservationStatus =
                typeof (reservation as { reservation_status?: unknown }).reservation_status === "string"
                    ? (((reservation as { reservation_status?: ReservationStatus }).reservation_status ?? null) as ReservationStatus | null)
                    : "approved";
            const rawPickupStatus =
                typeof (reservation as { pickup_status?: unknown }).pickup_status === "string"
                    ? ((reservation as { pickup_status?: string }).pickup_status ?? null)
                    : null;

            reservationsByArtId.set(Number(reservation.art_id), {
                pickup_status: normalizePickupStatus(rawPickupStatus, reservationStatus),
                reservation_status: reservationStatus,
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
                reservationStatus: reservationState?.reservation_status ?? "approved",
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

    const pickupStatus = payload.pickupStatus === "picked_up" ? "awaiting_artist_confirmation" : "reserved";
    const locationName = payload.locationName?.trim() ?? "";
    const locationAddress = payload.locationAddress?.trim() ?? "";

    try {
        const supabase = createAdminClient();
        const cleanupError = await refreshExpiredReservations(supabase);

        if (cleanupError) {
            console.warn("Reservation cleanup warning", cleanupError);
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, type")
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
            picked_up_at: pickupStatus === "awaiting_artist_confirmation" ? new Date().toISOString() : null,
            current_location_name: locationName || null,
            current_location_address: locationAddress || null,
        };

        let updateQuery: any = await supabase
            .from("reserved_artworks")
            .update(updatePayload)
            .eq("user_id", user.id)
            .eq("art_id", artId)
            .eq("reservation_status", "approved")
            .eq("pickup_status", "reserved");

        if (updateQuery.error?.code === "42703") {
            updateQuery = await supabase
                .from("reserved_artworks")
                .update(updatePayload)
                .eq("user_id", user.id)
                .eq("art_id", artId);
        }

        const updateError = updateQuery.error;

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
        const cleanupError = await refreshExpiredReservations(supabase);

        if (cleanupError) {
            console.warn("Reservation cleanup warning", cleanupError);
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, type")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
        }

        const isEntrepreneur = await isEntrepreneurUser(supabase, user);

        if (!isEntrepreneur) {
            return NextResponse.json({ error: "Alleen ondernemers kunnen kunstwerken reserveren." }, { status: 403 });
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

        const { data: existingByUser, error: existingByUserError } = await supabase
            .from("reserved_artworks")
            .select("user_id, art_id")
            .eq("user_id", user.id)
            .eq("art_id", artId)
            .limit(1);

        if (existingByUserError) {
            return NextResponse.json({ error: existingByUserError.message }, { status: 500 });
        }

        if ((existingByUser ?? []).length > 0) {
            return NextResponse.json({ ok: true, message: "Aanvraag staat al open voor dit kunstwerk." });
        }

        let activeReservationQuery: any = await supabase
            .from("reserved_artworks")
            .select("art_id, reservation_status")
            .eq("art_id", artId)
            .in("reservation_status", ["approved"])
            .limit(1);

        if (activeReservationQuery.error?.code === "42703") {
            activeReservationQuery = await supabase
                .from("reserved_artworks")
                .select("art_id")
                .eq("art_id", artId)
                .limit(1);
        }

        if (activeReservationQuery.error) {
            return NextResponse.json({ error: activeReservationQuery.error.message }, { status: 500 });
        }

        if ((activeReservationQuery.data ?? []).length > 0) {
            return NextResponse.json({ error: "Dit kunstwerk is al toegewezen aan een ondernemer." }, { status: 409 });
        }

        const pendingRequestPayload = {
            user_id: user.id,
            art_id: artId,
            pickup_status: "pending_request",
            reservation_status: "pending",
            picked_up_at: null,
            current_location_name: null,
            current_location_address: null,
        };

        let insertResult = await supabase.from("reserved_artworks").insert(pendingRequestPayload);

        if (insertResult.error?.code === "42703") {
            insertResult = await supabase.from("reserved_artworks").insert({
                user_id: user.id,
                art_id: artId,
                pickup_status: "pending_request",
            });
        } else if (insertResult.error?.code === "23514" && String(insertResult.error.message).includes("reserved_artworks_pickup_status_check")) {
            insertResult = await supabase.from("reserved_artworks").insert({
                user_id: user.id,
                art_id: artId,
                pickup_status: "reserved",
                reservation_status: "pending",
                picked_up_at: null,
                current_location_name: null,
                current_location_address: null,
            });
        }

        const insertError = insertResult.error;

        if (insertError) {
            if (typeof insertError.code === "string" && insertError.code === "23505") {
                return NextResponse.json(
                    {
                        error:
                            "Reservering bestaat al. Controleer of de oude unieke index op art_id nog actief is en vervang deze door een combinatie-index op (art_id, user_id).",
                    },
                    { status: 409 },
                );
            }
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: "Reserveringsverzoek verzonden naar de kunstenaar." });
    } catch (error) {
        console.error("Reservations POST error", error);
        return NextResponse.json({ error: "Serverfout bij reserveren van kunstwerk." }, { status: 500 });
    }
}
