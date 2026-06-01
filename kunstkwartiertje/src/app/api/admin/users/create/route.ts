import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAdminSession } from "src/utils/adminAuth";
import { createAdminClient } from "src/utils/supabase/admin";

type CreateAdminBody = {
    email?: string;
    password?: string;
    displayName?: string;
};

export async function POST(request: Request) {
    let payload: CreateAdminBody;

    try {
        payload = (await request.json()) as CreateAdminBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = payload.email?.trim().toLowerCase() ?? "";
    const password = payload.password ?? "";
    const displayName = payload.displayName?.trim() || null;

    if (!email || !password) {
        return NextResponse.json({ error: "E-mail en wachtwoord zijn verplicht." }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens bevatten." }, { status: 400 });
    }

    try {
        const auth = await requireAdminSession();
        if ("error" in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const supabase = createAdminClient();
        const passwordHash = await bcrypt.hash(password, 12);

        const { error } = await supabase.from("admin_users").insert({
            email,
            password_hash: passwordHash,
            display_name: displayName,
            is_active: true,
        });

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "Dit admin e-mailadres bestaat al." }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, message: "Admin account aangemaakt." });
    } catch (error) {
        console.error("Create admin user error", error);
        return NextResponse.json({ error: "Serverfout bij aanmaken adminaccount." }, { status: 500 });
    }
}
