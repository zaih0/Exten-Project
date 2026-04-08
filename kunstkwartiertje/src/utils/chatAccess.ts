import { createAdminClient } from "src/utils/supabase/admin";
import { getAdminSession } from "src/utils/adminAuth";
import { createRequestClient } from "src/utils/supabase/request";
import { normalizeRole } from "src/utils/profileRoleTable";

export type ChatRole = "admin" | "begeleider" | "ondernemer" | "kunstenaar" | string;

export type ChatUserRecord = {
    id: number;
    email: string;
    username: string;
    type: ChatRole;
    status: string | null;
    blocked: boolean;
};

export type ChatContext = {
    supabase: ReturnType<typeof createAdminClient>;
    currentUser: ChatUserRecord;
};

const adminRoleAliases = ["admin", "administrator", "beheerder"];

export const normalizeChatRole = (role: string | null | undefined): ChatRole | null => {
    if (!role) return null;
    const value = role.toLowerCase();
    if (adminRoleAliases.includes(value)) return "admin";
    return normalizeRole(value);
};

const mapUserRow = (row: {
    id: number | string;
    email?: string | null;
    username?: string | null;
    type?: string | null;
    status?: string | null;
    blocked_status?: boolean | null;
}): ChatUserRecord => ({
    id: Number(row.id),
    email: row.email?.trim().toLowerCase() ?? "",
    username: row.username?.trim() || row.email?.split("@")[0] || "Gebruiker",
    type: normalizeChatRole(row.type) ?? (row.type ?? "onbekend"),
    status: row.status ?? null,
    blocked: Boolean(row.blocked_status),
});

const loadSessionEmail = async () => {
    const authClient = await createRequestClient();
    const {
        data: { user },
        error,
    } = await authClient.auth.getUser();

    if (!error && user?.email) {
        return {
            email: user.email.trim().toLowerCase(),
            error: null as string | null,
            viaAdminSession: false,
        };
    }

    const adminSession = await getAdminSession();
    if (adminSession?.email) {
        return {
            email: adminSession.email.trim().toLowerCase(),
            error: null as string | null,
            viaAdminSession: true,
        };
    }

    if (error) {
        return { email: null as string | null, error: error.message, viaAdminSession: false };
    }

    return {
        email: null as string | null,
        error: null as string | null,
        viaAdminSession: false,
    };
};

const ensureAdminUserRow = async (supabase: ReturnType<typeof createAdminClient>, email: string) => {
    const username = email.split("@")[0] || "admin";

    const { error } = await supabase.from("users").insert({
        email,
        username,
        type: "admin",
        status: "approved",
        blocked_status: false,
    });

    if (error && error.code !== "23505") {
        throw new Error(error.message);
    }
};

export const getChatContext = async (): Promise<
    | { error: string; status: number }
    | { supabase: ReturnType<typeof createAdminClient>; currentUser: ChatUserRecord }
> => {
    const session = await loadSessionEmail();
    if (session.error) return { error: session.error, status: 401 };
    if (!session.email) return { error: "Je bent niet ingelogd.", status: 401 };

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("users")
        .select("id, email, username, type, status, blocked_status")
        .eq("email", session.email)
        .order("id", { ascending: false })
        .limit(5);

    if (error) return { error: error.message, status: 500 };

    let userRow = (data ?? [])[0] ?? null;

    if (!userRow?.id && session.viaAdminSession) {
        try {
            await ensureAdminUserRow(supabase, session.email);
        } catch (insertError) {
            return {
                error: insertError instanceof Error ? insertError.message : "Kon admin gebruiker niet aanmaken.",
                status: 500,
            };
        }

        const { data: createdData, error: createdError } = await supabase
            .from("users")
            .select("id, email, username, type, status, blocked_status")
            .eq("email", session.email)
            .order("id", { ascending: false })
            .limit(5);

        if (createdError) return { error: createdError.message, status: 500 };
        userRow = (createdData ?? [])[0] ?? null;
    }

    if (!userRow?.id) return { error: "Gebruiker niet gevonden.", status: 404 };

    const currentUser = mapUserRow(userRow);
    if (currentUser.blocked) return { error: "Je account is geblokkeerd.", status: 403 };
    if (currentUser.status && currentUser.status !== "approved" && currentUser.type !== "admin") {
        return { error: "Je account heeft nog geen toegang tot chat.", status: 403 };
    }

    return { supabase, currentUser };
};

const loadApprovedUsersByIds = async (supabase: ReturnType<typeof createAdminClient>, userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds)).filter((id) => Number.isFinite(id));
    if (uniqueIds.length === 0) return [] as ChatUserRecord[];

    const { data, error } = await supabase
        .from("users")
        .select("id, email, username, type, status, blocked_status")
        .in("id", uniqueIds)
        .eq("blocked_status", false);

    if (error) throw new Error(error.message);

    return (data ?? [])
        .map((row) => mapUserRow(row))
        .filter((user) => user.id !== 0 && (user.status === "approved" || user.type === "admin"));
};

const getAllUsersByRole = async (
    supabase: ReturnType<typeof createAdminClient>,
    role: ChatRole | ChatRole[],
) => {
    const roles = Array.isArray(role) ? role : [role];
    const rawRoles = roles.flatMap((item) => (item === "admin" ? adminRoleAliases : [item]));

    const { data, error } = await supabase
        .from("users")
        .select("id, email, username, type, status, blocked_status")
        .in("type", rawRoles)
        .eq("blocked_status", false);

    if (error) throw new Error(error.message);

    return (data ?? [])
        .map((row) => mapUserRow(row))
        .filter((user) => user.id !== 0 && (user.status === "approved" || user.type === "admin"));
};

const getManagedArtistIds = async (supabase: ReturnType<typeof createAdminClient>, accompanistUserId: number) => {
    const { data, error } = await supabase
        .from("accompanist_artist_permissions")
        .select("artist_user_id")
        .eq("accompanist_user_id", accompanistUserId);

    if (error) {
        if (error.code === "42P01") return [] as number[];
        throw new Error(error.message);
    }

    return (data ?? [])
        .map((row: { artist_user_id: number | string }) => Number(row.artist_user_id))
        .filter((id) => Number.isFinite(id));
};

const getMutualFollowIds = async (
    supabase: ReturnType<typeof createAdminClient>,
    currentUserId: number,
    currentRole: ChatRole,
) => {
    const { data: outgoing, error: outgoingError } = await supabase
        .from("user_follows")
        .select("followed_user_id")
        .eq("follower_user_id", currentUserId);

    if (outgoingError) {
        if (outgoingError.code === "42P01") {
            throw new Error("Volgrelaties ontbreken. Voer database/chat_hub.sql uit.");
        }
        throw new Error(outgoingError.message);
    }

    const { data: incoming, error: incomingError } = await supabase
        .from("user_follows")
        .select("follower_user_id")
        .eq("followed_user_id", currentUserId);

    if (incomingError) {
        if (incomingError.code === "42P01") {
            throw new Error("Volgrelaties ontbreken. Voer database/chat_hub.sql uit.");
        }
        throw new Error(incomingError.message);
    }

    const outgoingSet = new Set(
        (outgoing ?? []).map((row: { followed_user_id: number | string }) => Number(row.followed_user_id)),
    );
    const mutualIds = (incoming ?? [])
        .map((row: { follower_user_id: number | string }) => Number(row.follower_user_id))
        .filter((id) => outgoingSet.has(id));

    const allowedTargetRoles =
        currentRole === "kunstenaar"
            ? new Set<ChatRole>(["ondernemer", "kunstenaar"])
            : new Set<ChatRole>(["kunstenaar"]);

    const mutualUsers = await loadApprovedUsersByIds(supabase, mutualIds);
    return mutualUsers.filter((user) => allowedTargetRoles.has(user.type)).map((user) => user.id);
};

export const getAllowedChatContacts = async (context: ChatContext) => {
    const { supabase, currentUser } = context;

    if (currentUser.type === "admin") {
        const { data, error } = await supabase
            .from("users")
            .select("id, email, username, type, status, blocked_status")
            .neq("id", currentUser.id);

        if (error) throw new Error(error.message);

        return (data ?? []).map((row) => mapUserRow(row));
    }

    const contacts = new Map<number, ChatUserRecord>();
    const addUsers = (users: ChatUserRecord[]) => {
        for (const user of users) {
            if (user.id !== currentUser.id) contacts.set(user.id, user);
        }
    };

    addUsers(await getAllUsersByRole(supabase, "admin"));

    if (currentUser.type === "begeleider") {
        addUsers(await getAllUsersByRole(supabase, "ondernemer"));
        addUsers(await loadApprovedUsersByIds(supabase, await getManagedArtistIds(supabase, currentUser.id)));
    }

    if (currentUser.type === "ondernemer") {
        addUsers(await getAllUsersByRole(supabase, "begeleider"));
        addUsers(await loadApprovedUsersByIds(supabase, await getMutualFollowIds(supabase, currentUser.id, "ondernemer")));
    }

    if (currentUser.type === "kunstenaar") {
        addUsers(await getAllUsersByRole(supabase, "begeleider"));
        addUsers(await loadApprovedUsersByIds(supabase, await getMutualFollowIds(supabase, currentUser.id, "kunstenaar")));
    }

    return Array.from(contacts.values()).sort((left, right) => left.username.localeCompare(right.username, "nl"));
};

export const canUsersChat = async (context: ChatContext, otherUserId: number) => {
    const contacts = await getAllowedChatContacts(context);
    return contacts.some((contact) => contact.id === otherUserId);
};

export const groupContactsByCategory = (contacts: ChatUserRecord[]) => ({
    admins: contacts.filter((contact) => contact.type === "admin"),
    entrepreneurs: contacts.filter((contact) => contact.type === "ondernemer"),
    artists: contacts.filter((contact) => contact.type === "kunstenaar"),
    accompanists: contacts.filter((contact) => contact.type === "begeleider"),
});
