import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { ensureRoleProfileRow } from "src/utils/profileRoleTable";

type CreateArtistBody = {
    accompanistEmail?: string;
    username?: string;
    email?: string;
    password?: string;
};

type UpdatePermissionsBody = {
    accompanistEmail?: string;
    artistUserId?: number;
    canAddArtworks?: boolean;
    canEditArtworks?: boolean;
    canUseChat?: boolean;
    canEditProfilePic?: boolean;
    canEditUsername?: boolean;
    canEditAboutMe?: boolean;
    aboutMe?: string;
};

type PendingProfileChangeRow = {
    artist_user_id: number;
    proposed_username?: string | null;
    proposed_about_me?: string | null;
    proposed_profile_pic?: string | null;
    created_at?: string | null;
};

const getAccompanistByEmail = async (supabase: any, email: string) => {
    const { data, error } = await supabase
        .from("users")
        .select("id, email, type")
        .eq("email", email)
        .maybeSingle();

    if (error) {
        return { error: error.message, status: 500 as const };
    }

    if (!data?.id) {
        return { error: "Begeleider niet gevonden.", status: 404 as const };
    }

    return { accompanist: data, status: 200 as const };
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const accompanistEmail = url.searchParams.get("email")?.trim().toLowerCase();

    if (!accompanistEmail) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const accompResult = await getAccompanistByEmail(supabase, accompanistEmail);

        if ("error" in accompResult) {
            return NextResponse.json({ error: accompResult.error }, { status: accompResult.status });
        }

        const accompanistId = Number(accompResult.accompanist.id);

        const { data: links, error: linksError } = await supabase
            .from("accompanist_artist_permissions")
            .select(
                "artist_user_id, can_add_artworks, can_edit_artworks, can_use_chat, can_edit_profile_pic, can_edit_username, can_edit_about_me",
            )
            .eq("accompanist_user_id", accompanistId)
            .order("artist_user_id", { ascending: false });

        if (linksError) {
            if (linksError.code === "42P01") {
                return NextResponse.json(
                    { error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: linksError.message }, { status: 500 });
        }

        const artistIds = (links ?? [])
            .map((item: { artist_user_id: unknown }) => Number(item.artist_user_id))
            .filter((id: number) => Number.isFinite(id));

        if (artistIds.length === 0) {
            return NextResponse.json({ artists: [] });
        }

        const { data: artists, error: artistsError } = await supabase
            .from("users")
            .select("id, email, username, status, blocked_status, created_at")
            .in("id", artistIds)
            .eq("type", "kunstenaar")
            .order("created_at", { ascending: false });

        if (artistsError) {
            return NextResponse.json({ error: artistsError.message }, { status: 500 });
        }

        const { data: artistProfiles, error: artistProfilesError } = await supabase
            .from("artist")
            .select("user_id, about_me, profile_pic, username")
            .in("user_id", artistIds);

        if (artistProfilesError && artistProfilesError.code !== "42P01") {
            return NextResponse.json({ error: artistProfilesError.message }, { status: 500 });
        }

        const profileByUserId = new Map<number, { about_me?: string | null; profile_pic?: string | null; username?: string | null }>();
        for (const row of artistProfiles ?? []) {
            const profile = row as { user_id: number; about_me?: string | null; profile_pic?: string | null; username?: string | null };
            profileByUserId.set(Number(profile.user_id), {
                about_me: profile.about_me ?? null,
                profile_pic: profile.profile_pic ?? null,
                username: profile.username ?? null,
            });
        }

        const { data: pendingRows, error: pendingError } = await supabase
            .from("artist_profile_change_requests")
            .select("artist_user_id, proposed_username, proposed_about_me, proposed_profile_pic, created_at")
            .in("artist_user_id", artistIds);

        if (pendingError && pendingError.code !== "42P01") {
            return NextResponse.json({ error: pendingError.message }, { status: 500 });
        }

        const pendingByArtistId = new Map<
            number,
            {
                proposedUsername: string | null;
                proposedAboutMe: string | null;
                proposedProfilePic: string | null;
                createdAt: string | null;
            }
        >();

        for (const row of pendingRows ?? []) {
            const pending = row as PendingProfileChangeRow;
            pendingByArtistId.set(Number(pending.artist_user_id), {
                proposedUsername: pending.proposed_username ?? null,
                proposedAboutMe: pending.proposed_about_me ?? null,
                proposedProfilePic: pending.proposed_profile_pic ?? null,
                createdAt: pending.created_at ?? null,
            });
        }

        const permissionsByArtistId = new Map<
            number,
            {
                can_add_artworks: boolean;
                can_edit_artworks: boolean;
                can_use_chat: boolean;
                can_edit_profile_pic: boolean;
                can_edit_username: boolean;
                can_edit_about_me: boolean;
            }
        >();

        for (const row of links ?? []) {
            const item = row as {
                artist_user_id: number;
                can_add_artworks?: boolean | null;
                can_edit_artworks?: boolean | null;
                can_use_chat?: boolean | null;
                can_edit_profile_pic?: boolean | null;
                can_edit_username?: boolean | null;
                can_edit_about_me?: boolean | null;
            };

            permissionsByArtistId.set(Number(item.artist_user_id), {
                can_add_artworks: Boolean(item.can_add_artworks),
                can_edit_artworks: Boolean(item.can_edit_artworks),
                can_use_chat: Boolean(item.can_use_chat),
                can_edit_profile_pic: Boolean(item.can_edit_profile_pic),
                can_edit_username: Boolean(item.can_edit_username),
                can_edit_about_me: Boolean(item.can_edit_about_me),
            });
        }

        const payload = (artists ?? []).map((artist) => {
            const permission = permissionsByArtistId.get(Number(artist.id));
            const profile = profileByUserId.get(Number(artist.id));
            const pending = pendingByArtistId.get(Number(artist.id));

            return {
                id: artist.id,
                email: artist.email,
                username: profile?.username ?? artist.username,
                status: artist.status,
                blocked: Boolean(artist.blocked_status),
                createdAt: artist.created_at ?? null,
                aboutMe: profile?.about_me ?? "",
                profilePic: profile?.profile_pic ?? "",
                hasPendingProfileChanges: Boolean(pending),
                pendingProfileChanges: pending ?? null,
                permissions: {
                    canAddArtworks: permission?.can_add_artworks ?? false,
                    canEditArtworks: permission?.can_edit_artworks ?? false,
                    canUseChat: permission?.can_use_chat ?? false,
                    canEditProfilePic: permission?.can_edit_profile_pic ?? false,
                    canEditUsername: permission?.can_edit_username ?? false,
                    canEditAboutMe: permission?.can_edit_about_me ?? false,
                },
            };
        });

        return NextResponse.json({ artists: payload });
    } catch (error) {
        console.error("Accompanist artists GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van artiesten." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    let payload: CreateArtistBody;

    try {
        payload = (await request.json()) as CreateArtistBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const accompanistEmail = payload.accompanistEmail?.trim().toLowerCase();
    const username = payload.username?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password ?? "";

    if (!accompanistEmail || !username || !email || password.length < 8) {
        return NextResponse.json({ error: "Vul gebruikersnaam, e-mail en wachtwoord (min. 8 tekens) in." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const accompResult = await getAccompanistByEmail(supabase, accompanistEmail);

        if ("error" in accompResult) {
            return NextResponse.json({ error: accompResult.error }, { status: accompResult.status });
        }

        const accompanistId = Number(accompResult.accompanist.id);

        const { data: existingUser, error: existingError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (existingError) {
            return NextResponse.json({ error: existingError.message }, { status: 500 });
        }

        if (existingUser?.id) {
            return NextResponse.json({ error: "Er bestaat al een account met dit e-mailadres." }, { status: 409 });
        }

        const { data: authCreated, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username,
                type: "kunstenaar",
            },
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        const { data: insertedUser, error: insertError } = await supabase
            .from("users")
            .insert({
                email,
                username,
                type: "kunstenaar",
                status: "approved",
                blocked_status: false,
            })
            .select("id")
            .single();

        if (insertError) {
            if (authCreated?.user?.id) {
                await supabase.auth.admin.deleteUser(authCreated.user.id);
            }
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        const artistUserId = Number(insertedUser.id);

        const roleSync = await ensureRoleProfileRow({
            supabase,
            role: "kunstenaar",
            userId: artistUserId,
            username,
        });

        if (roleSync.error) {
            console.error("Role profile sync warning", roleSync.error);
        }

        const { error: permissionInsertError } = await supabase
            .from("accompanist_artist_permissions")
            .insert({
                accompanist_user_id: accompanistId,
                artist_user_id: artistUserId,
                can_add_artworks: false,
                can_edit_artworks: false,
                can_use_chat: false,
                can_edit_profile_pic: false,
                can_edit_username: false,
                can_edit_about_me: false,
            });

        if (permissionInsertError) {
            if (permissionInsertError.code === "42P01") {
                return NextResponse.json(
                    { error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: permissionInsertError.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Accompanist artists POST error", error);
        return NextResponse.json({ error: "Serverfout bij aanmaken van artiestaccount." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    let payload: UpdatePermissionsBody;

    try {
        payload = (await request.json()) as UpdatePermissionsBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const accompanistEmail = payload.accompanistEmail?.trim().toLowerCase();
    const artistUserId = Number(payload.artistUserId);

    if (!accompanistEmail || !Number.isFinite(artistUserId)) {
        return NextResponse.json({ error: "Missing accompanistEmail or artistUserId." }, { status: 400 });
    }

    if (
        typeof payload.canAddArtworks !== "boolean" ||
        typeof payload.canEditArtworks !== "boolean" ||
        typeof payload.canUseChat !== "boolean" ||
        typeof payload.canEditProfilePic !== "boolean" ||
        typeof payload.canEditUsername !== "boolean" ||
        typeof payload.canEditAboutMe !== "boolean"
    ) {
        return NextResponse.json({ error: "Alle permissievelden moeten true/false zijn." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const accompResult = await getAccompanistByEmail(supabase, accompanistEmail);

        if ("error" in accompResult) {
            return NextResponse.json({ error: accompResult.error }, { status: accompResult.status });
        }

        const accompanistId = Number(accompResult.accompanist.id);

        const { error } = await supabase
            .from("accompanist_artist_permissions")
            .upsert(
                {
                    accompanist_user_id: accompanistId,
                    artist_user_id: artistUserId,
                    can_add_artworks: payload.canAddArtworks,
                    can_edit_artworks: payload.canEditArtworks,
                    can_use_chat: payload.canUseChat,
                    can_edit_profile_pic: payload.canEditProfilePic,
                    can_edit_username: payload.canEditUsername,
                    can_edit_about_me: payload.canEditAboutMe,
                },
                { onConflict: "accompanist_user_id,artist_user_id" },
            );

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Permissietabel ontbreekt. Voer database/accompanist_artist_permissions.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (typeof payload.aboutMe === "string") {
            const { error: aboutError } = await supabase
                .from("artist")
                .update({ about_me: payload.aboutMe.trim() })
                .eq("user_id", artistUserId);

            if (aboutError && aboutError.code !== "42P01") {
                return NextResponse.json({ error: aboutError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Accompanist artists PATCH error", error);
        return NextResponse.json({ error: "Serverfout bij updaten van permissies." }, { status: 500 });
    }
}
