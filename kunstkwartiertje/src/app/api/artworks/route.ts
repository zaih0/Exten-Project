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

        const { data, error } = await supabase
            .from("artworks")
            .select("id, title, description, images")
            .eq("user_id", artistUser.id)
            .order("id", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const artworks = (data ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            imageUrl: Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? ""),
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
