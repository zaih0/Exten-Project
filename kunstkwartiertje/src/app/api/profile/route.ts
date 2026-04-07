import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { ensureRoleProfileRow, normalizeRole, resolveRoleTable } from "src/utils/profileRoleTable";

type ProfilePatchBody = {
    email?: string;
    username?: string;
    about_me?: string;
    profile_pic?: string;
};

const canManagedArtistEditProfileField = async (params: {
    supabase: any;
    artistUserId: number;
    permissionColumn: "can_edit_username" | "can_edit_about_me" | "can_edit_profile_pic";
}) => {
    const { supabase, artistUserId, permissionColumn } = params;

    const { data, error } = await supabase
        .from("accompanist_artist_permissions")
        .select(`accompanist_user_id, ${permissionColumn}`)
        .eq("artist_user_id", artistUserId);

    if (error) {
        if (error.code === "42P01") return { allowed: true, reason: null as string | null };
        return { allowed: false, reason: error.message };
    }

    if (!data || data.length === 0) return { allowed: true, reason: null as string | null };

    const hasPermission = data.some((row: Record<string, unknown>) => Boolean(row[permissionColumn]));
    if (!hasPermission) {
        return {
            allowed: false,
            reason: "Je begeleider heeft geen toestemming gegeven om dit onderdeel van je profiel te wijzigen.",
        };
    }

    return { allowed: true, reason: null as string | null };
};

const getManagedArtistLinks = async (supabase: any, artistUserId: number) => {
    const { data, error } = await supabase
        .from("accompanist_artist_permissions")
        .select("accompanist_user_id")
        .eq("artist_user_id", artistUserId);

    if (error) {
        if (error.code === "42P01") {
            return { links: [] as Array<{ accompanist_user_id: number }>, error: null as string | null };
        }
        return { links: [] as Array<{ accompanist_user_id: number }>, error: error.message };
    }

    return { links: (data ?? []) as Array<{ accompanist_user_id: number }>, error: null as string | null };
};

const loadUserAndRoleTable = async (supabase: any, email: string) => {
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email, username, type")
        .eq("email", email)
        .maybeSingle();

    if (userError) {
        return { error: userError.message, status: 500 };
    }

    if (!user) {
        return { error: "Gebruiker niet gevonden.", status: 404 };
    }

    const role = normalizeRole(user.type);
    const table = await resolveRoleTable(supabase, role);

    if (!table) {
        return { error: "Geen rolprofieltabel gevonden voor deze gebruiker.", status: 500 };
    }

    return { user, role, table };
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.trim();

    if (!email) {
        return NextResponse.json({ error: "Missing email query param." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const baseResult = await loadUserAndRoleTable(supabase, email);

        if ("error" in baseResult) {
            return NextResponse.json({ error: baseResult.error }, { status: baseResult.status });
        }

        const { user, role: resolvedRole, table } = baseResult;

        const ensureResult = await ensureRoleProfileRow({
            supabase,
            role: resolvedRole,
            userId: Number(user.id),
            username: user.username ?? null,
        });

        if (ensureResult.error) {
            return NextResponse.json({ error: ensureResult.error }, { status: 500 });
        }

        const { data: roleProfile, error: roleProfileError } = await supabase
            .from(table)
            .select("username, about_me, profile_pic")
            .eq("user_id", user.id)
            .maybeSingle();

        if (roleProfileError) {
            return NextResponse.json({ error: roleProfileError.message }, { status: 500 });
        }

        return NextResponse.json({
            profile: {
                username: roleProfile?.username ?? user.username ?? email.split("@")[0],
                about_me: roleProfile?.about_me ?? "",
                profile_pic: roleProfile?.profile_pic ?? "",
                role: resolvedRole,
            },
        });
    } catch (error) {
        console.error("Profile GET error", error);
        return NextResponse.json({ error: "Serverfout bij profiel ophalen." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    let payload: ProfilePatchBody;

    try {
        payload = (await request.json()) as ProfilePatchBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!payload.email) {
        return NextResponse.json({ error: "Missing email." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const baseResult = await loadUserAndRoleTable(supabase, payload.email);

        if ("error" in baseResult) {
            return NextResponse.json({ error: baseResult.error }, { status: baseResult.status });
        }

        const { user, role: resolvedRole, table } = baseResult;

        const ensureResult = await ensureRoleProfileRow({
            supabase,
            role: resolvedRole,
            userId: Number(user.id),
            username: user.username ?? null,
        });

        if (ensureResult.error) {
            return NextResponse.json({ error: ensureResult.error }, { status: 500 });
        }

        if (resolvedRole === "kunstenaar") {
            const managedLinksResult = await getManagedArtistLinks(supabase, Number(user.id));
            if (managedLinksResult.error) {
                return NextResponse.json({ error: managedLinksResult.error }, { status: 500 });
            }

            const isManagedByAccompanist = managedLinksResult.links.length > 0;

            if (typeof payload.username === "string") {
                const check = await canManagedArtistEditProfileField({
                    supabase,
                    artistUserId: Number(user.id),
                    permissionColumn: "can_edit_username",
                });
                if (!check.allowed) {
                    return NextResponse.json({ error: check.reason ?? "Actie niet toegestaan." }, { status: 403 });
                }
            }

            if (typeof payload.about_me === "string") {
                const check = await canManagedArtistEditProfileField({
                    supabase,
                    artistUserId: Number(user.id),
                    permissionColumn: "can_edit_about_me",
                });
                if (!check.allowed) {
                    return NextResponse.json({ error: check.reason ?? "Actie niet toegestaan." }, { status: 403 });
                }
            }

            if (typeof payload.profile_pic === "string") {
                const check = await canManagedArtistEditProfileField({
                    supabase,
                    artistUserId: Number(user.id),
                    permissionColumn: "can_edit_profile_pic",
                });
                if (!check.allowed) {
                    return NextResponse.json({ error: check.reason ?? "Actie niet toegestaan." }, { status: 403 });
                }
            }

            // For managed artists: queue profile changes for accompanist approval.
            if (isManagedByAccompanist) {
                const requestUpdatePayload: Record<string, string | number> = {
                    artist_user_id: Number(user.id),
                };

                if (typeof payload.username === "string") {
                    requestUpdatePayload.proposed_username = payload.username.trim();
                }
                if (typeof payload.about_me === "string") {
                    requestUpdatePayload.proposed_about_me = payload.about_me.trim();
                }
                if (typeof payload.profile_pic === "string") {
                    requestUpdatePayload.proposed_profile_pic = payload.profile_pic.trim();
                }

                if (Object.keys(requestUpdatePayload).length > 1) {
                    const { error: requestError } = await supabase
                        .from("artist_profile_change_requests")
                        .upsert(requestUpdatePayload, { onConflict: "artist_user_id" });

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
                }

                return NextResponse.json({ ok: true, pendingApproval: true });
            }
        }

        const roleUpdatePayload: Record<string, string | null> = {};

        if (typeof payload.username === "string") roleUpdatePayload.username = payload.username.trim();
        if (typeof payload.about_me === "string") roleUpdatePayload.about_me = payload.about_me.trim();
        if (typeof payload.profile_pic === "string") roleUpdatePayload.profile_pic = payload.profile_pic.trim();

        if (Object.keys(roleUpdatePayload).length > 0) {
            const { error: roleUpdateError } = await supabase
                .from(table)
                .update(roleUpdatePayload)
                .eq("user_id", user.id);

            if (roleUpdateError) {
                return NextResponse.json({ error: roleUpdateError.message }, { status: 500 });
            }
        }

        if (typeof payload.username === "string") {
            const { error: userUpdateError } = await supabase
                .from("users")
                .update({ username: payload.username.trim() })
                .eq("id", user.id);

            if (userUpdateError) {
                return NextResponse.json({ error: userUpdateError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Profile PATCH error", error);
        return NextResponse.json({ error: "Serverfout bij profiel opslaan." }, { status: 500 });
    }
}
