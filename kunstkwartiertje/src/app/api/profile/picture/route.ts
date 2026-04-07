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
            .select("id, type")
            .eq("email", email)
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user?.id) {
            return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
        }

        if (String(user.type ?? "").toLowerCase() === "kunstenaar") {
            const { data: permissionRows, error: permissionError } = await supabase
                .from("accompanist_artist_permissions")
                .select("accompanist_user_id, can_edit_profile_pic")
                .eq("artist_user_id", Number(user.id));

            if (permissionError && permissionError.code !== "42P01") {
                return NextResponse.json({ error: permissionError.message }, { status: 500 });
            }

            if (permissionRows && permissionRows.length > 0) {
                const allowed = permissionRows.some(
                    (row: { can_edit_profile_pic?: boolean | null }) => Boolean(row.can_edit_profile_pic),
                );

                if (!allowed) {
                    return NextResponse.json(
                        { error: "Je begeleider heeft geen toestemming gegeven om je profielfoto te wijzigen." },
                        { status: 403 },
                    );
                }
            }

            const isManagedByAccompanist = Boolean(permissionRows && permissionRows.length > 0);

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
            const imageUrl = urlData.publicUrl;

            if (isManagedByAccompanist) {
                const { error: requestError } = await supabase
                    .from("artist_profile_change_requests")
                    .upsert(
                        {
                            artist_user_id: Number(user.id),
                            proposed_profile_pic: imageUrl,
                        },
                        { onConflict: "artist_user_id" },
                    );

                if (requestError) {
                    if (requestError.code === "42P01") {
                        return NextResponse.json(
                            {
                                error:
                                    "Tabel artist_profile_change_requests ontbreekt. Voer database/artist_profile_change_requests.sql uit.",
                            },
                            { status: 500 },
                        );
                    }
                    return NextResponse.json({ error: requestError.message }, { status: 500 });
                }

                return NextResponse.json({ imageUrl, pendingApproval: true });
            }

            return NextResponse.json({ imageUrl });
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
