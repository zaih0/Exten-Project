export const normalizeRole = (role: string | null | undefined) => {
    if (!role) return null;

    const value = role.toLowerCase();
    if (value === "kunstenaar" || value === "artist") return "kunstenaar";
    if (value === "begeleider" || value === "accompanist") return "begeleider";
    if (value === "ondernemer" || value === "entrepreneur") return "ondernemer";

    return value;
};

const roleToTable: Record<string, string> = {
    kunstenaar: "artist",
    begeleider: "accompanist",
    ondernemer: "entrepreneur",
};

export const getRoleTableByType = (role: string | null | undefined) => {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) return null;
    return roleToTable[normalizedRole] ?? null;
};

export const resolveRoleTable = async (supabase: any, role: string | null | undefined) => {
    const table = getRoleTableByType(role);
    if (!table) return null;

    const { error } = await supabase.from(table).select("user_id").limit(1);

    // 42P01 = undefined_table (Postgres)
    if (error && error.code === "42P01") return null;
    if (!error) return table;

    return null;
};

export const ensureRoleProfileRow = async (params: {
    supabase: any;
    role: string | null | undefined;
    userId: number;
    username: string | null;
}) => {
    const { supabase, role, userId, username } = params;
    const table = await resolveRoleTable(supabase, role);

    if (!table) {
        return { table: null, error: "No matching role table found." };
    }

    const { data: existingRow, error: existingError } = await supabase
        .from(table)
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (existingError) {
        return { table, error: existingError.message };
    }

    if (!existingRow) {
        const { error: insertError } = await supabase.from(table).insert({
            user_id: userId,
            username: username ?? null,
            about_me: null,
            profile_pic: null,
        });

        if (insertError) {
            return { table, error: insertError.message };
        }
    }

    return { table, error: null };
};
