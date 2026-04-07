import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

export async function POST(request: Request) {
    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Ongeldige formulierdata." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const email = (formData.get("email") as string | null)?.trim();

    if (!file || !email) {
        return NextResponse.json({ error: "Bestand en email zijn verplicht." }, { status: 400 });
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

        const fileExt = file.name.split(".").pop() ?? "jpg";
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from("profile-pictures")
            .upload(filePath, arrayBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        const { data: urlData } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

        return NextResponse.json({ imageUrl: urlData.publicUrl });
    } catch (error) {
        console.error("Profile picture upload error", error);
        return NextResponse.json({ error: "Serverfout bij uploaden profielfoto." }, { status: 500 });
    }
}
