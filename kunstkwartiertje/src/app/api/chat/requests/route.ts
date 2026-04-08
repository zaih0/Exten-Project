import { NextResponse } from "next/server";
import { getChatContext } from "src/utils/chatAccess";
import { normalizeRole } from "src/utils/profileRoleTable";

type RequestUser = {
    id: number;
    username: string;
    role: string;
    profilePic: string | null;
};

const canFollowRolePair = (currentRole: string | null, targetRole: string | null) => {
    return (
        (currentRole === "kunstenaar" && targetRole === "ondernemer") ||
        (currentRole === "kunstenaar" && targetRole === "kunstenaar") ||
        (currentRole === "ondernemer" && targetRole === "kunstenaar")
    );
};

export async function GET() {
    try {
        const context = await getChatContext();
        if ("error" in context) {
            return NextResponse.json({ error: context.error }, { status: context.status });
        }

        const { supabase, currentUser } = context;

        // Admins and accompanists don't use follow-based chat
        if (currentUser.type === "admin" || currentUser.type === "begeleider") {
            return NextResponse.json({ outgoing: [], incoming: [] });
        }

        const [outgoingResult, incomingResult] = await Promise.all([
            supabase.from("user_follows").select("followed_user_id").eq("follower_user_id", currentUser.id),
            supabase.from("user_follows").select("follower_user_id").eq("followed_user_id", currentUser.id),
        ]);

        if (outgoingResult.error) {
            if (outgoingResult.error.code === "42P01") {
                return NextResponse.json({ outgoing: [], incoming: [] });
            }
            return NextResponse.json({ error: outgoingResult.error.message }, { status: 500 });
        }
        if (incomingResult.error) {
            return NextResponse.json({ error: incomingResult.error.message }, { status: 500 });
        }

        const outgoingIds = new Set(
            (outgoingResult.data ?? []).map((r: { followed_user_id: number | string }) => Number(r.followed_user_id)),
        );
        const incomingIds = new Set(
            (incomingResult.data ?? []).map((r: { follower_user_id: number | string }) => Number(r.follower_user_id)),
        );

        // Pending = one-way only (not yet mutual)
        const outgoingPendingIds = [...outgoingIds].filter((id) => !incomingIds.has(id));
        const incomingPendingIds = [...incomingIds].filter((id) => !outgoingIds.has(id));

        const allPendingIds = [...new Set([...outgoingPendingIds, ...incomingPendingIds])];

        if (allPendingIds.length === 0) {
            return NextResponse.json({ outgoing: [], incoming: [] });
        }

        const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, username, type, email")
            .in("id", allPendingIds)
            .eq("blocked_status", false);

        if (usersError) {
            return NextResponse.json({ error: usersError.message }, { status: 500 });
        }

        const normalizedUsers = (users ?? []).map((u) => ({
            id: Number(u.id),
            username: (u.username as string | null) ?? (u.email as string | null) ?? "Gebruiker",
            role: normalizeRole(u.type as string) ?? (u.type as string) ?? "onbekend",
        }));

        // Fetch profile pics from role tables
        const artistUserIds = normalizedUsers.filter((u) => u.role === "kunstenaar").map((u) => u.id);
        const entrepreneurUserIds = normalizedUsers.filter((u) => u.role === "ondernemer").map((u) => u.id);

        type PicRow = { user_id: number | string; profile_pic: string | null };

        const [artistPicsResult, entrepreneurPicsResult] = await Promise.all([
            artistUserIds.length > 0
                ? supabase.from("artist").select("user_id, profile_pic").in("user_id", artistUserIds)
                : Promise.resolve({ data: [] as PicRow[], error: null }),
            entrepreneurUserIds.length > 0
                ? supabase.from("entrepreneur").select("user_id, profile_pic").in("user_id", entrepreneurUserIds)
                : Promise.resolve({ data: [] as PicRow[], error: null }),
        ]);

        const picMap = new Map<number, string | null>();
        for (const row of artistPicsResult.data ?? []) {
            picMap.set(Number(row.user_id), row.profile_pic ?? null);
        }
        for (const row of entrepreneurPicsResult.data ?? []) {
            picMap.set(Number(row.user_id), row.profile_pic ?? null);
        }

        const userMap = new Map<number, RequestUser>(
            normalizedUsers.map((u) => [
                u.id,
                {
                    id: u.id,
                    username: u.username,
                    role: u.role,
                    profilePic: picMap.get(u.id) ?? null,
                },
            ]),
        );

        const toRequest = (id: number): RequestUser | null => {
            const user = userMap.get(id);
            if (!user) return null;
            if (!canFollowRolePair(currentUser.type, user.role)) return null;
            return user;
        };

        return NextResponse.json({
            outgoing: outgoingPendingIds.map(toRequest).filter((u): u is RequestUser => u !== null),
            incoming: incomingPendingIds.map(toRequest).filter((u): u is RequestUser => u !== null),
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Onbekende fout" },
            { status: 500 },
        );
    }
}
