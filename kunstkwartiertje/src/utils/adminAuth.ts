import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "src/utils/supabase/admin";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_SECRET =
    process.env.ADMIN_SESSION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "local-admin-session-secret";

type AdminUserRow = {
    id?: number | string;
    email?: string | null;
    username?: string | null;
    password?: string | null;
    password_hash?: string | null;
    hashed_password?: string | null;
    is_active?: boolean | null;
    active?: boolean | null;
};

const normalizeEmail = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

const signPayload = (payload: string) => createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

const buildSessionValue = (email: string, expiresAt: number) => {
    const payload = `${email}.${expiresAt}`;
    return `${payload}.${signPayload(payload)}`;
};

const parseSessionValue = (value: string | undefined) => {
    if (!value) return null;

    const lastDot = value.lastIndexOf(".");
    if (lastDot === -1) return null;

    const payload = value.slice(0, lastDot);
    const signature = value.slice(lastDot + 1);
    const expected = signPayload(payload);

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

    const payloadSeparator = payload.lastIndexOf(".");
    if (payloadSeparator === -1) return null;

    const email = payload.slice(0, payloadSeparator);
    const expiresAtRaw = payload.slice(payloadSeparator + 1);
    const expiresAt = Number(expiresAtRaw);
    if (!email || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

    return { email: normalizeEmail(email), expiresAt };
};

const readAdminByIdentifier = async (identifier: string) => {
    const supabase = createAdminClient();

    const normalized = normalizeEmail(identifier);

    // 1) Try email first (case-insensitive)
    const { data: emailRows, error: emailError } = await supabase
        .from("admin_users")
        .select("*")
        .ilike("email", normalized)
        .limit(2);

    if (emailError) {
        if (emailError.code === "42P01") {
            return { error: "Tabel admin_users ontbreekt. Maak deze tabel eerst aan.", status: 500 as const };
        }
        return { error: emailError.message, status: 500 as const };
    }

    if ((emailRows ?? []).length > 1) {
        return {
            error: "Meerdere admin_users records hebben dit e-mailadres. Maak e-mail uniek in admin_users.",
            status: 500 as const,
        };
    }

    let data = (emailRows ?? [])[0] as AdminUserRow | undefined;

    // 2) Fallback: username login support (exact, case-insensitive)
    if (!data) {
        const { data: usernameRows, error: usernameError } = await supabase
            .from("admin_users")
            .select("*")
            .ilike("username", identifier.trim())
            .limit(2);

        if (usernameError) {
            return { error: usernameError.message, status: 500 as const };
        }

        if ((usernameRows ?? []).length > 1) {
            return {
                error: "Meerdere admin_users records hebben deze gebruikersnaam. Maak username uniek in admin_users.",
                status: 500 as const,
            };
        }

        data = (usernameRows ?? [])[0] as AdminUserRow | undefined;
    }

    if (!data) {
        return { error: "Admin account niet gevonden in admin_users.", status: 401 as const };
    }

    const admin = data;
    if (admin.is_active === false || admin.active === false) {
        return { error: "Admin account is gedeactiveerd.", status: 403 as const };
    }

    return { admin, status: 200 as const };
};

export const authenticateAdminLogin = async (emailInput: string, password: string) => {
    const identifier = emailInput.trim();
    if (!identifier || !password) {
        return { error: "E-mail/gebruikersnaam en wachtwoord zijn verplicht.", status: 400 as const };
    }

    const lookup = await readAdminByIdentifier(identifier);
    if ("error" in lookup) return lookup;

    const storedHash = lookup.admin.password_hash ?? lookup.admin.hashed_password ?? null;
    const storedPassword = lookup.admin.password ?? null;

    let isValid = false;
    if (storedHash) {
        try {
            isValid = await bcrypt.compare(password, storedHash);
        } catch {
            return { error: "Ongeldig password_hash formaat in admin_users.", status: 500 as const };
        }
    } else if (storedPassword) {
        const looksLikeBcrypt = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
        if (looksLikeBcrypt) {
            try {
                isValid = await bcrypt.compare(password, storedPassword);
            } catch {
                return { error: "Ongeldig bcrypt wachtwoordformaat in admin_users.password.", status: 500 as const };
            }
        } else {
            isValid = storedPassword === password;
        }
    } else {
        return {
            error: "admin_users heeft geen wachtwoordkolom. Gebruik password of password_hash.",
            status: 500 as const,
        };
    }

    if (!isValid) {
        return { error: "Ongeldige admin-inloggegevens.", status: 401 as const };
    }

    const email = normalizeEmail(lookup.admin.email ?? null);
    if (!email) {
        return { error: "Admin account mist e-mail in admin_users.", status: 500 as const };
    }

    return { email, status: 200 as const };
};

export const setAdminSessionCookie = async (email: string) => {
    const store = await cookies();
    const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
    store.set(ADMIN_SESSION_COOKIE, buildSessionValue(email, expiresAt), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(expiresAt),
    });
};

export const clearAdminSessionCookie = async () => {
    const store = await cookies();
    store.set(ADMIN_SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
    });
};

export const getAdminSession = async () => {
    const store = await cookies();
    const parsed = parseSessionValue(store.get(ADMIN_SESSION_COOKIE)?.value);
    if (!parsed?.email) return null;

    const lookup = await readAdminByIdentifier(parsed.email);
    if ("error" in lookup) return null;

    return { email: parsed.email };
};

export const requireAdminSession = async () => {
    const session = await getAdminSession();
    if (!session?.email) {
        return { error: "Admin login vereist.", status: 401 as const };
    }

    return { email: session.email, status: 200 as const };
};

export const unauthorizedAdminResponse = (message = "Admin login vereist.") =>
    NextResponse.json({ error: message }, { status: 401 });
