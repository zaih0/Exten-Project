import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";
import { createRequestClient } from "src/utils/supabase/request";
import { normalizeRole } from "src/utils/profileRoleTable";

type FollowBody = {
    targetUserId?: number;
};

const getSessionUser = async (supabase: ReturnType<typeof createAdminClient>) => {
    const authClient = await createRequestClient();
    const {
        data: { user: authUser },
        error: authError,
    } = await authClient.auth.getUser();

    if (authError) {
        return { error: authError.message, status: 401 as const };
    }

    const email = authUser?.email?.trim().toLowerCase();
    if (!email) {
        return { error: "Je bent niet ingelogd.", status: 401 as const };
    }

    const { data: user, error } = await supabase
        .from("users")
        .select("id, email, type, blocked_status, status")
        .eq("email", email)
        .maybeSingle();

    if (error) {
        return { error: error.message, status: 500 as const };
    }

    if (!user?.id) {
        return { error: "Gebruiker niet gevonden.", status: 404 as const };
    }

    if (user.blocked_status) {
        return { error: "Je account is geblokkeerd.", status: 403 as const };
    }

    return {
        user: {
            id: Number(user.id),
            email,
            role: normalizeRole(user.type) ?? user.type ?? null,
        },
    };
};

const loadTargetUser = async (supabase: ReturnType<typeof createAdminClient>, params: { targetUserId?: number; targetEmail?: string | null }) => {
    const { targetUserId, targetEmail } = params;
    let query = supabase.from("users").select("id, email, type, username");

    if (typeof targetUserId === "number" && Number.isFinite(targetUserId)) {
        query = query.eq("id", targetUserId);
    } else if (targetEmail) {
        query = query.eq("email", targetEmail.trim().toLowerCase());
    } else {
        return { error: "targetUserId of targetEmail is verplicht.", status: 400 as const };
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
        return { error: error.message, status: 500 as const };
    }
    if (!data?.id) {
        return { error: "Doelgebruiker niet gevonden.", status: 404 as const };
    }

    return {
        user: {
            id: Number(data.id),
            email: data.email?.trim().toLowerCase() ?? "",
            role: normalizeRole(data.type) ?? data.type ?? null,
            username: data.username ?? data.email ?? "Gebruiker",
        },
    };
};

const canFollowRolePair = (currentRole: string | null, targetRole: string | null) => {
    return (
        (currentRole === "kunstenaar" && targetRole === "ondernemer") ||
        (currentRole === "kunstenaar" && targetRole === "kunstenaar") ||
        (currentRole === "ondernemer" && targetRole === "kunstenaar")
    );
};

const countFollowers = async (supabase: ReturnType<typeof createAdminClient>, userId: number) => {
    const { data, error } = await supabase
        .from("user_follows")
        .select("follower_user_id")
        .eq("followed_user_id", userId);

    if (error) {
        if (error.code === "42P01") {
            return { count: 0, error: "Volgtabel ontbreekt. Voer database/chat_hub.sql uit." };
        }
        return { count: 0, error: error.message };
    }

    const uniqueFollowerIds = new Set(
        (data ?? [])
            .map((row: { follower_user_id: number | string | null }) => Number(row.follower_user_id))
            .filter((value) => Number.isFinite(value)),
    );

    return { count: uniqueFollowerIds.size, error: null as string | null };
};

const countFollowing = async (supabase: ReturnType<typeof createAdminClient>, userId: number) => {
    const { data, error } = await supabase
        .from("user_follows")
        .select("followed_user_id")
        .eq("follower_user_id", userId);

    if (error) {
        if (error.code === "42P01") {
            return { count: 0, error: "Volgtabel ontbreekt. Voer database/chat_hub.sql uit." };
        }
        return { count: 0, error: error.message };
    }

    const uniqueFollowedIds = new Set(
        (data ?? [])
            .map((row: { followed_user_id: number | string | null }) => Number(row.followed_user_id))
            .filter((value) => Number.isFinite(value)),
    );

    return { count: uniqueFollowedIds.size, error: null as string | null };
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const targetUserIdParam = url.searchParams.get("targetUserId");
    const targetUserId = targetUserIdParam === null ? NaN : Number(targetUserIdParam);
    const targetEmail = url.searchParams.get("targetEmail");

    try {
        const supabase = createAdminClient();
        const sessionResult = await getSessionUser(supabase);
        if ("error" in sessionResult) {
            return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status });
        }

        const normalizedTargetEmail = targetEmail?.trim().toLowerCase() ?? null;
        const isSelfByEmail = Boolean(normalizedTargetEmail && normalizedTargetEmail === sessionResult.user.email);
        const hasTargetUserId = Number.isFinite(targetUserId) && targetUserId > 0;

        const targetResult =
            !hasTargetUserId && (isSelfByEmail || !normalizedTargetEmail)
                ? {
                      user: {
                          id: sessionResult.user.id,
                          email: sessionResult.user.email,
                          role: sessionResult.user.role,
                          username: sessionResult.user.email,
                      },
                  }
                : await loadTargetUser(supabase, {
                      targetUserId: hasTargetUserId ? targetUserId : undefined,
                      targetEmail: normalizedTargetEmail,
                  });

        if ("error" in targetResult) {
            return NextResponse.json({ error: targetResult.error }, { status: targetResult.status });
        }

        const [followersResult, followingResult] = await Promise.all([
            countFollowers(supabase, targetResult.user.id),
            countFollowing(supabase, targetResult.user.id),
        ]);

        if (followersResult.error) {
            return NextResponse.json({ error: followersResult.error }, { status: 500 });
        }
        if (followingResult.error) {
            return NextResponse.json({ error: followingResult.error }, { status: 500 });
        }

        const canFollow =
            sessionResult.user.id !== targetResult.user.id &&
            canFollowRolePair(sessionResult.user.role, targetResult.user.role);

        let isFollowing = false;
        if (canFollow) {
            const { data, error } = await supabase
                .from("user_follows")
                .select("id")
                .eq("follower_user_id", sessionResult.user.id)
                .eq("followed_user_id", targetResult.user.id)
                .maybeSingle();

            if (error && error.code !== "42P01") {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            isFollowing = Boolean(data?.id);
        }

        return NextResponse.json({
            targetUserId: targetResult.user.id,
            targetRole: targetResult.user.role,
            followerCount: followersResult.count,
            followingCount: followingResult.count,
            canFollow,
            isFollowing,
        });
    } catch (error) {
        console.error("Follows GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen van volggegevens." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    let payload: FollowBody;

    try {
        payload = (await request.json()) as FollowBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const targetUserId = Number(payload.targetUserId);
    if (!Number.isFinite(targetUserId)) {
        return NextResponse.json({ error: "targetUserId is verplicht." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const sessionResult = await getSessionUser(supabase);
        if ("error" in sessionResult) {
            return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status });
        }

        const targetResult = await loadTargetUser(supabase, { targetUserId });
        if ("error" in targetResult) {
            return NextResponse.json({ error: targetResult.error }, { status: targetResult.status });
        }

        if (!canFollowRolePair(sessionResult.user.role, targetResult.user.role)) {
            return NextResponse.json({ error: "Je kunt deze gebruiker niet volgen." }, { status: 403 });
        }

        if (sessionResult.user.id === targetResult.user.id) {
            return NextResponse.json({ error: "Je kunt jezelf niet volgen." }, { status: 400 });
        }

        const { error } = await supabase.from("user_follows").upsert(
            {
                follower_user_id: sessionResult.user.id,
                followed_user_id: targetResult.user.id,
            },
            { onConflict: "follower_user_id,followed_user_id" },
        );

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Volgtabel ontbreekt. Voer database/chat_hub.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Follows POST error", error);
        return NextResponse.json({ error: "Serverfout bij volgen." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    let payload: FollowBody;

    try {
        payload = (await request.json()) as FollowBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const targetUserId = Number(payload.targetUserId);
    if (!Number.isFinite(targetUserId)) {
        return NextResponse.json({ error: "targetUserId is verplicht." }, { status: 400 });
    }

    try {
        const supabase = createAdminClient();
        const sessionResult = await getSessionUser(supabase);
        if ("error" in sessionResult) {
            return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status });
        }

        const { error } = await supabase
            .from("user_follows")
            .delete()
            .eq("follower_user_id", sessionResult.user.id)
            .eq("followed_user_id", targetUserId);

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Volgtabel ontbreekt. Voer database/chat_hub.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Follows DELETE error", error);
        return NextResponse.json({ error: "Serverfout bij ontvolgen." }, { status: 500 });
    }
}
