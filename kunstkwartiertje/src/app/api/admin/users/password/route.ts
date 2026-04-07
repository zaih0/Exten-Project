import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type PasswordResetBody = {
    email?: string;
    password?: string;
    changedByEmail?: string;
};

type PasswordChangeLogRow = {
    id: number;
    target_user_email: string | null;
    changed_by_email: string | null;
    changed_at: string | null;
};

const MIN_PASSWORD_LENGTH = 8;

export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("admin_password_change_logs")
            .select("id, target_user_email, changed_by_email, changed_at")
            .order("changed_at", { ascending: false })
            .limit(25);

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Audit tabel ontbreekt. Voer database/admin_password_change_logs.sql uit." },
                    { status: 500 },
                );
            }

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const logs = ((data ?? []) as PasswordChangeLogRow[]).map((item) => ({
            id: item.id,
            targetUserEmail: item.target_user_email,
            changedByEmail: item.changed_by_email,
            changedAt: item.changed_at,
        }));

        return NextResponse.json({ logs });
    } catch (error) {
        console.error("Admin password log GET error", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Serverfout bij auditlog ophalen." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    let payload: PasswordResetBody;

    try {
        payload = (await request.json()) as PasswordResetBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = payload.email?.trim().toLowerCase();
    const password = payload.password ?? "";
    const changedByEmail = payload.changedByEmail?.trim().toLowerCase() ?? null;

    if (!email) {
        return NextResponse.json({ error: "Missing user email." }, { status: 400 });
    }

    if (password.trim().length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Nieuw wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens bevatten.` },
            { status: 400 },
        );
    }

    try {
        const supabase = createAdminClient();
        const { data: userRow, error: userLookupError } = await supabase
            .from("users")
            .select("id, email")
            .eq("email", email)
            .maybeSingle();

        if (userLookupError) {
            return NextResponse.json({ error: userLookupError.message }, { status: 500 });
        }

        if (!userRow?.id) {
            return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
        }

        const { data: authUsersPage, error: authUsersError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

        if (authUsersError) {
            return NextResponse.json({ error: authUsersError.message }, { status: 500 });
        }

        const authUser = authUsersPage.users.find(
            (candidate) => candidate.email?.trim().toLowerCase() === email,
        );

        if (!authUser?.id) {
            return NextResponse.json(
                { error: "Auth gebruiker niet gevonden voor dit e-mailadres." },
                { status: 404 },
            );
        }

        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(authUser.id, {
            password,
        });

        if (authUpdateError) {
            return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
        }

        const { error: auditError } = await supabase.from("admin_password_change_logs").insert({
            target_user_email: email,
            changed_by_email: changedByEmail,
        });

        if (auditError) {
            if (auditError.code === "42P01") {
                return NextResponse.json(
                    { error: "Wachtwoord aangepast, maar audit tabel ontbreekt. Voer database/admin_password_change_logs.sql uit." },
                    { status: 500 },
                );
            }

            return NextResponse.json({ error: auditError.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            message: "Wachtwoord succesvol bijgewerkt. Het oude wachtwoord is niet ingezien of opgeslagen.",
        });
    } catch (error) {
        console.error("Admin password reset PATCH error", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Serverfout bij wachtwoord wijzigen." }, { status: 500 });
    }
}
