import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type ArtworkStatus = "pending" | "approved" | "denied";

const checkManagedArtistPermission = async (params: {
    supabase: any;
    artistUserId: number;
    permissionColumn: "can_add_artworks" | "can_edit_artworks";
}) => {
    const { supabase, artistUserId, permissionColumn } = params;

    const { data, error } = await supabase
        .from("accompanist_artist_permissions")
        .select(`accompanist_user_id, ${permissionColumn}`)
        .eq("artist_user_id", artistUserId);

    if (error) {
        // table missing => do not block existing flows
        if (error.code === "42P01") return { allowed: true, reason: null as string | null };
        return { allowed: false, reason: error.message };
    }

    // If no accompanist links exist, artist is unmanaged and allowed by default.
    if (!data || data.length === 0) {
        return { allowed: true, reason: null as string | null };
    }

    const hasPermission = data.some((row: Record<string, unknown>) => Boolean(row[permissionColumn]));
    if (!hasPermission) {
        return { allowed: false, reason: "Je begeleider heeft deze actie uitgeschakeld voor jouw account." };
    }

    return { allowed: true, reason: null as string | null };
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim();
    const includeAll = url.searchParams.get("includeAll") === "true";

    try {
        const supabase = createAdminClient();

        if (!email) {
            const { data, error } = await supabase
                .from("artworks")
                .select("id, user_id, title, description, images, status, created_at, denial_reason")
                .eq("status", "approved")
                .order("created_at", { ascending: false });

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            const rows = data ?? [];
            const artIds = rows.map((item) => Number(item.id)).filter((value) => Number.isFinite(value));
            const userIds = Array.from(
                new Set(rows.map((item) => String(item.user_id)).filter((value) => value.length > 0)),
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

                for (const user of users ?? []) {
                    usersById.set(String(user.id), {
                        username: user.username ?? null,
                        email: user.email ?? null,
                    });
                }
            }

            const reservationByArtId = new Map<
                number,
                {
                    pickup_status?: string | null;
                    current_location_name?: string | null;
                    current_location_address?: string | null;
                }
            >();

            if (artIds.length > 0) {
                const { data: reservations, error: reservationsError } = await supabase
                    .from("reserved_artworks")
                    .select("art_id, pickup_status, current_location_name, current_location_address")
                    .in("art_id", artIds);

                if (reservationsError && reservationsError.code !== "42703") {
                    return NextResponse.json({ error: reservationsError.message }, { status: 500 });
                }

                for (const reservation of reservations ?? []) {
                    reservationByArtId.set(Number(reservation.art_id), {
                        pickup_status: reservation.pickup_status ?? null,
                        current_location_name: reservation.current_location_name ?? null,
                        current_location_address: reservation.current_location_address ?? null,
                    });
                }
            }

            const artworks = rows.map((item) => {
                const owner = usersById.get(String(item.user_id));
                const reservationState = reservationByArtId.get(Number(item.id));

                return {
                id: item.id,
                title: item.title,
                description: item.description,
                imageUrl: Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? ""),
                status: (item.status ?? "approved") as ArtworkStatus,
                created_at: item.created_at ?? null,
                denialReason: item.denial_reason ?? null,
                artistName: owner?.username ?? owner?.email ?? "Onbekende artiest",
                pickupStatus: reservationState?.pickup_status ?? null,
                locationName: reservationState?.current_location_name ?? null,
                locationAddress: reservationState?.current_location_address ?? null,
            };
            });

            return NextResponse.json({ artworks });
        }

        const { data: artistUser, error: artistLookupError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (artistLookupError) {
            return NextResponse.json({ error: artistLookupError.message }, { status: 500 });
        }

        if (!artistUser?.id) {
            return NextResponse.json({ artworks: [] });
        }

        let query = supabase
            .from("artworks")
            .select("id, title, description, images, status, created_at, denial_reason")
            .eq("user_id", artistUser.id);

        if (!includeAll) {
            query = query.eq("status", "approved");
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const artworks = (data ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            imageUrl: Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? ""),
            status: (item.status ?? "approved") as ArtworkStatus,
            created_at: item.created_at ?? null,
            denialReason: item.denial_reason ?? null,
        }));

        return NextResponse.json({ artworks });
    } catch (error) {
        console.error("Artworks GET error", error);
        return NextResponse.json({ error: "Serverfout bij het ophalen van kunstwerken." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Ongeldige formulierdata." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null)?.trim();
    const description = ((formData.get("description") as string | null) ?? "").trim();
    const authUserId = (formData.get("userId") as string | null)?.trim();
    const email = (formData.get("email") as string | null)?.trim();

    if (!file || !title || !authUserId || !email) {
        return NextResponse.json({ error: "Verplichte velden ontbreken (bestand, titel, gebruiker)." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        // Upload image to Supabase Storage bucket "artworks"
        const { data: artistUser, error: artistLookupError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (artistLookupError) {
            return NextResponse.json({ error: artistLookupError.message }, { status: 500 });
        }

        if (!artistUser?.id) {
            return NextResponse.json(
                { error: "Kunstenaar niet gevonden in gebruikerslijst." },
                { status: 404 },
            );
        }

        const addPermission = await checkManagedArtistPermission({
            supabase,
            artistUserId: Number(artistUser.id),
            permissionColumn: "can_add_artworks",
        });

        if (!addPermission.allowed) {
            return NextResponse.json({ error: addPermission.reason ?? "Actie niet toegestaan." }, { status: 403 });
        }

        const fileExt = file.name.split(".").pop() ?? "jpg";
        const filePath = `${authUserId}/${Date.now()}.${fileExt}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from("artworks")
            .upload(filePath, arrayBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        // Get public URL for the uploaded image
        const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(filePath);
        const imageUrl = urlData.publicUrl;

        // Insert artwork row
        const { data, error: insertError } = await supabase
            .from("artworks")
            .insert({
                title,
                description,
                images: imageUrl,
                user_id: artistUser.id,
                status: "pending",
                denial_reason: null,
            })
            .select()
            .single();

        if (insertError) {
            // Attempt to clean up the uploaded file on DB error
            await supabase.storage.from("artworks").remove([filePath]);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        const artworkImage = Array.isArray(data?.images)
            ? (data.images[0] ?? "")
            : (data?.images ?? "");

        return NextResponse.json({
            artwork: {
                id: data.id,
                title: data.title,
                description: data.description,
                imageUrl: artworkImage,
                status: (data.status ?? "pending") as ArtworkStatus,
            },
        });
    } catch (error) {
        console.error("Artworks POST error", error);
        return NextResponse.json({ error: "Serverfout bij het opslaan van het kunstwerk." }, { status: 500 });
    }
}

type DeleteBody = {
    artworkId?: number;
    email?: string;
};

export async function DELETE(request: Request) {
    let payload: DeleteBody;

    try {
        payload = (await request.json()) as DeleteBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!payload.artworkId || !payload.email) {
        return NextResponse.json({ error: "Missing artworkId or email." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const { data: artistUser, error: artistLookupError } = await supabase
            .from("users")
            .select("id")
            .eq("email", payload.email)
            .maybeSingle();

        if (artistLookupError) {
            return NextResponse.json({ error: artistLookupError.message }, { status: 500 });
        }

        if (!artistUser?.id) {
            return NextResponse.json({ error: "Kunstenaar niet gevonden." }, { status: 404 });
        }

        const editPermission = await checkManagedArtistPermission({
            supabase,
            artistUserId: Number(artistUser.id),
            permissionColumn: "can_edit_artworks",
        });

        if (!editPermission.allowed) {
            return NextResponse.json({ error: editPermission.reason ?? "Actie niet toegestaan." }, { status: 403 });
        }

        const { error: deleteError } = await supabase
            .from("artworks")
            .delete()
            .eq("id", payload.artworkId)
            .eq("user_id", artistUser.id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Artworks DELETE error", error);
        return NextResponse.json({ error: "Serverfout bij het verwijderen van kunstwerk." }, { status: 500 });
    }
}
