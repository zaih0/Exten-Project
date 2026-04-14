import { NextResponse } from "next/server";
import { authenticateAdminLogin, setAdminSessionCookie } from "src/utils/adminAuth";

type LoginBody = {
    email?: string;
    password?: string;
};

export async function POST(request: Request) {
    let payload: LoginBody;

    try {
        payload = (await request.json()) as LoginBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const result = await authenticateAdminLogin(payload.email ?? "", payload.password ?? "");
    if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (!("email" in result)) {
        return NextResponse.json({ error: "Admin account mist e-mail in admin_users." }, { status: 500 });
    }

    await setAdminSessionCookie(result.email);
    return NextResponse.json({ ok: true, email: result.email });
}
