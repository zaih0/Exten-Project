import { NextResponse } from "next/server";
import { requireAdminSession } from "src/utils/adminAuth";
import { createAdminClient } from "src/utils/supabase/admin";

type AdminArtworkRow = {
    id: number;
    user_id: string;
    title: string;
    description: string;
    images: string | string[];
    status: string;
    created_at: string | null;
    denial_reason: string | null;
};

export async function GET() {
    try {
        const auth = await requireAdminSession();
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("artworks")
            .select("id, user_id, title, description, images, status, created_at, denial_reason")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = (data ?? []) as AdminArtworkRow[];
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
                usersById.set(String((user as { id: string }).id), {
                    username: (user as { username?: string | null }).username ?? null,
                    email: (user as { email?: string | null }).email ?? null,
                });
            }
        }

        const artworks = rows.map((item) => {
            const owner = usersById.get(String(item.user_id));
            return {
                id: item.id,
                title: item.title,
                description: item.description ?? "",
                imageUrl: Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? ""),
                status: item.status ?? "pending",
                created_at: item.created_at ?? null,
                denialReason: item.denial_reason ?? null,
                artistName: owner?.username ?? owner?.email ?? "Onbekende artiest",
                artistEmail: owner?.email ?? null,
                locationName: null as string | null,
                locationAddress: null as string | null,
                isReserved: false,
            };
        });

        // Enrich with location data from reserved_artworks
        if (artworks.length > 0) {
            const artIds = artworks.map((a) => a.id);
            const { data: reservations, error: reservationsError } = await supabase
                .from("reserved_artworks")
                .select("art_id, current_location_name, current_location_address")
                .in("art_id", artIds);

            if (reservationsError && reservationsError.code !== "42703") {
                return NextResponse.json({ error: reservationsError.message }, { status: 500 });
            }

            for (const r of reservations ?? []) {
                const row = r as {
                    art_id: number;
                    current_location_name?: string | null;
                    current_location_address?: string | null;
                };
                const a = artworks.find((x) => x.id === Number(row.art_id));
                if (a) {
                    a.locationName = row.current_location_name ?? null;
                    a.locationAddress = row.current_location_address ?? null;
                    a.isReserved = true;
                }
            }
        }

        return NextResponse.json({ artworks });
    } catch (err) {
        console.error("Admin artworks GET error", err);
        return NextResponse.json({ error: "Serverfout bij het ophalen van kunstwerken." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Ongeldige formulierdata." }, { status: 400 });
    }

    const artworkId = Number(formData.get("artworkId"));
    if (!artworkId || Number.isNaN(artworkId)) {
        return NextResponse.json({ error: "artworkId is verplicht." }, { status: 400 });
    }

    const title = (formData.get("title") as string | null)?.trim();
    const description = (formData.get("description") as string | null)?.trim() ?? "";
    const file = formData.get("file") as File | null;

    const updates: Record<string, string> = {};
    if (title) updates.title = title;
    if (formData.has("description")) updates.description = description;

    try {
        const auth = await requireAdminSession();
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabase = createAdminClient();

        // Handle image replacement
        if (file && file.size > 0) {
            // Fetch existing image path for cleanup
            const { data: existing } = await supabase
                .from("artworks")
                .select("images, user_id")
                .eq("id", artworkId)
                .maybeSingle();

            const userId = (existing as { user_id?: string } | null)?.user_id ?? "admin";
            const fileExt = file.name.split(".").pop() ?? "jpg";
            const filePath = `${userId}/${Date.now()}.${fileExt}`;
            const arrayBuffer = await file.arrayBuffer();

            const { error: uploadError } = await supabase.storage
                .from("artworks")
                .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

            if (uploadError) {
                return NextResponse.json({ error: uploadError.message }, { status: 500 });
            }

            const { data: urlData } = supabase.storage.from("artworks").getPublicUrl(filePath);
            updates.images = urlData.publicUrl;

            // Best-effort cleanup of old image
            if (existing) {
                const imageVal = (existing as { images?: string | string[] }).images;
                const oldUrl = Array.isArray(imageVal) ? imageVal[0] : imageVal;
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
                const bucketPrefix = `${supabaseUrl}/storage/v1/object/public/artworks/`;
                if (oldUrl && typeof oldUrl === "string" && oldUrl.startsWith(bucketPrefix)) {
                    const oldPath = oldUrl.slice(bucketPrefix.length);
                    await supabase.storage.from("artworks").remove([oldPath]);
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "Geen velden om bij te werken." }, { status: 400 });
        }

        const { error } = await supabase.from("artworks").update(updates).eq("id", artworkId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update location in reserved_artworks if location fields were provided
        let newLocationName: string | null | undefined;
        let newLocationAddress: string | null | undefined;

        if (formData.has("locationName") || formData.has("locationAddress")) {
            newLocationName = (formData.get("locationName") as string | null)?.trim() || null;
            newLocationAddress = (formData.get("locationAddress") as string | null)?.trim() || null;

            const { error: locError } = await supabase
                .from("reserved_artworks")
                .update({
                    current_location_name: newLocationName,
                    current_location_address: newLocationAddress,
                })
                .eq("art_id", artworkId);

            if (locError && locError.code !== "42703") {
                console.warn("Location update warning:", locError.message);
            }
        }

        return NextResponse.json({
            ok: true,
            newImageUrl: updates.images ?? null,
            locationName: newLocationName,
            locationAddress: newLocationAddress,
        });
    } catch (err) {
        console.error("Admin artworks PATCH error", err);
        return NextResponse.json({ error: "Serverfout bij het bijwerken van kunstwerk." }, { status: 500 });
    }
}

type DeleteBody = {
    artworkId?: number;
};

export async function DELETE(request: Request) {
    let payload: DeleteBody;

    try {
        payload = (await request.json()) as DeleteBody;
    } catch {
        return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
    }

    if (!payload.artworkId) {
        return NextResponse.json({ error: "artworkId is verplicht." }, { status: 400 });
    }

    try {
        const auth = await requireAdminSession();
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabase = createAdminClient();

        // Fetch first so we can clean up storage after deletion
        const { data: artwork, error: fetchError } = await supabase
            .from("artworks")
            .select("images")
            .eq("id", payload.artworkId)
            .maybeSingle();

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        const { error: deleteError } = await supabase
            .from("artworks")
            .delete()
            .eq("id", payload.artworkId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Best-effort storage cleanup
        if (artwork) {
            const imageVal = (artwork as { images?: string | string[] }).images;
            const imageUrl = Array.isArray(imageVal) ? imageVal[0] : imageVal;
            if (imageUrl && typeof imageUrl === "string") {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
                const bucketPrefix = `${supabaseUrl}/storage/v1/object/public/artworks/`;
                if (imageUrl.startsWith(bucketPrefix)) {
                    const filePath = imageUrl.slice(bucketPrefix.length);
                    await supabase.storage.from("artworks").remove([filePath]);
                }
            }
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Admin artworks DELETE error", err);
        return NextResponse.json({ error: "Serverfout bij het verwijderen van kunstwerk." }, { status: 500 });
    }
}
