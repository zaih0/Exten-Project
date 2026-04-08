import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "src/utils/adminAuth";

export async function POST() {
    await clearAdminSessionCookie();
    return NextResponse.json({ ok: true });
}
