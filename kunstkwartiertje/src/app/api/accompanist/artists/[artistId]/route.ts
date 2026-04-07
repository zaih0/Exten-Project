import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type ArtistProfilePatchBody = {
    accompanistEmail?: string;
    username?: string;
    aboutMe?: string;
    profilePic?: string;
    approvePendingChanges?: boolean;
    denyPendingChanges?: boolean;
};

const parseArtistId = async (context: { params: { artistId: string } | Promise<{ artistId: string }> }) => {
    const params = await Promise.resolve(context.params);
    const artistId = Number(params.artistId);
    if (!Number.isFinite(artistId)) return null;
    return artistId;
};

const verifyAccompanistArtistLink = async (supabase: any, accompanistEmail: string, artistUserId: number) => {
    const { data: accompanist, error: accompanistError } = await supabase
        .from("users")
        .select("id")
        .eq("email", accompanistEmail)
        .maybeSingle();

    if (accompanistError) {
        return { error: accompanistError.message, status: 500 as const };
    }

    if (!accompanist?.id) {
        return { error: "Begeleider niet gevonden.", status: 404 as const };
    }

    const { data: link, error: linkError } = await supabase
        .from("accompanist_artist_permissions")
        .select("artist_user_id")
        .eq("accompanist_user_id", Number(accompanist.id))
        .eq("artist_user_id", artistUserId)
        .maybeSingle();

    if (linkError) {
        if (linkError.code === "42P01") {
            return {
                error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit.",
                status: 500 as const,
            };
        }

        return { error: linkError.message, status: 500 as const };
    }

    if (!link) {
        return { error: "Deze artiest is niet gekoppeld aan jouw account.", status: 403 as const };
    }

    return { ok: true as const };
};

export async function GET(
    request: Request,
    context: { params: { artistId: string } | Promise<{ artistId: string }> },
) {
    const url = new URL(request.url);
    const accompanistEmail = url.searchParams.get("accompanistEmail")?.trim().toLowerCase();

    if (!accompanistEmail) {
        return NextResponse.json({ error: "Missing accompanistEmail query param." }, { status: 400 });
    }

    const artistId = await parseArtistId(context);
    if (!artistId) {
        return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const access = await verifyAccompanistArtistLink(supabase, accompanistEmail, artistId);
        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, email, username, status, blocked_status, type")
            .eq("id", artistId)
            .eq("type", "kunstenaar")
            .maybeSingle();

        if (userError) {
            return NextResponse.json({ error: userError.message }, { status: 500 });
        }

        if (!user) {
            return NextResponse.json({ error: "Artiest niet gevonden." }, { status: 404 });
        }

        const { data: profile, error: profileError } = await supabase
            .from("artist")
            .select("username, about_me, profile_pic")
            .eq("user_id", artistId)
            .maybeSingle();

        if (profileError && profileError.code !== "42P01") {
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        const { data: pendingChanges, error: pendingError } = await supabase
            .from("artist_profile_change_requests")
            .select("proposed_username, proposed_about_me, proposed_profile_pic, created_at")
            .eq("artist_user_id", artistId)
            .maybeSingle();

        if (pendingError && pendingError.code !== "42P01") {
            return NextResponse.json({ error: pendingError.message }, { status: 500 });
        }

        return NextResponse.json({
            artist: {
                id: user.id,
                email: user.email,
                username: profile?.username ?? user.username ?? "",
                aboutMe: profile?.about_me ?? "",
                profilePic: profile?.profile_pic ?? "",
                status: user.status ?? null,
                blocked: Boolean(user.blocked_status),
            },
            pendingProfileChanges: pendingChanges
                ? {
                      proposedUsername: pendingChanges.proposed_username ?? null,
                      proposedAboutMe: pendingChanges.proposed_about_me ?? null,
                      proposedProfilePic: pendingChanges.proposed_profile_pic ?? null,
                      createdAt: pendingChanges.created_at ?? null,
                  }
                : null,
        });
    } catch (error) {
        console.error("Accompanist artist GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van artiestprofiel." }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    context: { params: { artistId: string } | Promise<{ artistId: string }> },
) {
    let payload: ArtistProfilePatchBody;

    try {
        payload = (await request.json()) as ArtistProfilePatchBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const accompanistEmail = payload.accompanistEmail?.trim().toLowerCase();
    if (!accompanistEmail) {
        return NextResponse.json({ error: "Missing accompanistEmail." }, { status: 400 });
    }

    const artistId = await parseArtistId(context);
    if (!artistId) {
        return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const access = await verifyAccompanistArtistLink(supabase, accompanistEmail, artistId);
        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        if (payload.approvePendingChanges || payload.denyPendingChanges) {
            const { data: pendingChanges, error: pendingError } = await supabase
                .from("artist_profile_change_requests")
                .select("proposed_username, proposed_about_me, proposed_profile_pic")
                .eq("artist_user_id", artistId)
                .maybeSingle();

            if (pendingError) {
                if (pendingError.code === "42P01") {
                    return NextResponse.json(
                        {
                            error:
                                "Tabel artist_profile_change_requests ontbreekt. Voer database/artist_profile_change_requests.sql uit.",
                        },
                        { status: 500 },
                    );
                }

                return NextResponse.json({ error: pendingError.message }, { status: 500 });
            }

            if (!pendingChanges) {
                return NextResponse.json({ error: "Geen openstaande profielwijzigingen." }, { status: 404 });
            }

            if (payload.approvePendingChanges) {
                if (typeof pendingChanges.proposed_username === "string") {
                    const nextUsername = pendingChanges.proposed_username.trim();

                    const { error: userUpdateError } = await supabase
                        .from("users")
                        .update({ username: nextUsername })
                        .eq("id", artistId)
                        .eq("type", "kunstenaar");

                    if (userUpdateError) {
                        return NextResponse.json({ error: userUpdateError.message }, { status: 500 });
                    }

                    const { error: roleUsernameError } = await supabase
                        .from("artist")
                        .update({ username: nextUsername })
                        .eq("user_id", artistId);

                    if (roleUsernameError && roleUsernameError.code !== "42P01") {
                        return NextResponse.json({ error: roleUsernameError.message }, { status: 500 });
                    }
                }

                const profileUpdatePayload: Record<string, string> = {};
                if (typeof pendingChanges.proposed_about_me === "string") {
                    profileUpdatePayload.about_me = pendingChanges.proposed_about_me.trim();
                }
                if (typeof pendingChanges.proposed_profile_pic === "string") {
                    profileUpdatePayload.profile_pic = pendingChanges.proposed_profile_pic.trim();
                }

                if (Object.keys(profileUpdatePayload).length > 0) {
                    const { error: profileUpdateError } = await supabase
                        .from("artist")
                        .update(profileUpdatePayload)
                        .eq("user_id", artistId);

                    if (profileUpdateError && profileUpdateError.code !== "42P01") {
                        return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
                    }
                }
            }

            const { error: clearPendingError } = await supabase
                .from("artist_profile_change_requests")
                .delete()
                .eq("artist_user_id", artistId);

            if (clearPendingError && clearPendingError.code !== "42P01") {
                return NextResponse.json({ error: clearPendingError.message }, { status: 500 });
            }

            return NextResponse.json({ ok: true });
        }

        if (typeof payload.username === "string") {
            const nextUsername = payload.username.trim();

            const { error: userUpdateError } = await supabase
                .from("users")
                .update({ username: nextUsername })
                .eq("id", artistId)
                .eq("type", "kunstenaar");

            if (userUpdateError) {
                return NextResponse.json({ error: userUpdateError.message }, { status: 500 });
            }

            const { error: roleUsernameError } = await supabase
                .from("artist")
                .update({ username: nextUsername })
                .eq("user_id", artistId);

            if (roleUsernameError && roleUsernameError.code !== "42P01") {
                return NextResponse.json({ error: roleUsernameError.message }, { status: 500 });
            }
        }

        const profileUpdatePayload: Record<string, string> = {};
        if (typeof payload.aboutMe === "string") profileUpdatePayload.about_me = payload.aboutMe.trim();
        if (typeof payload.profilePic === "string") profileUpdatePayload.profile_pic = payload.profilePic.trim();

        if (Object.keys(profileUpdatePayload).length > 0) {
            const { error: profileUpdateError } = await supabase
                .from("artist")
                .update(profileUpdatePayload)
                .eq("user_id", artistId);

            if (profileUpdateError && profileUpdateError.code !== "42P01") {
                return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
            }
        }

        const { error: clearPendingError } = await supabase
            .from("artist_profile_change_requests")
            .delete()
            .eq("artist_user_id", artistId);

        if (clearPendingError && clearPendingError.code !== "42P01") {
            return NextResponse.json({ error: clearPendingError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Accompanist artist PATCH error", error);
        return NextResponse.json({ error: "Serverfout bij opslaan van artiestprofiel." }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    context: { params: { artistId: string } | Promise<{ artistId: string }> },
) {
    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Ongeldige formulierdata." }, { status: 400 });
    }

    const accompanistEmail = (formData.get("accompanistEmail") as string | null)?.trim().toLowerCase();
    const file = formData.get("file") as File | null;

    if (!accompanistEmail || !file) {
        return NextResponse.json({ error: "accompanistEmail en bestand zijn verplicht." }, { status: 400 });
    }

    const artistId = await parseArtistId(context);
    if (!artistId) {
        return NextResponse.json({ error: "Ongeldig artistId." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();

        const access = await verifyAccompanistArtistLink(supabase, accompanistEmail, artistId);
        if ("error" in access) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const fileExt = file.name.split(".").pop() ?? "jpg";
        const filePath = `${artistId}/${Date.now()}.${fileExt}`;
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

        const { error: profileUpdateError } = await supabase
            .from("artist")
            .update({ profile_pic: imageUrl })
            .eq("user_id", artistId);

        if (profileUpdateError && profileUpdateError.code !== "42P01") {
            return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
        }

        const { error: clearPendingError } = await supabase
            .from("artist_profile_change_requests")
            .delete()
            .eq("artist_user_id", artistId);

        if (clearPendingError && clearPendingError.code !== "42P01") {
            return NextResponse.json({ error: clearPendingError.message }, { status: 500 });
        }

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error("Accompanist artist picture POST error", error);
        return NextResponse.json({ error: "Serverfout bij uploaden profielfoto." }, { status: 500 });
    }
}
