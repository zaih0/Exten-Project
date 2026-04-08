import { NextResponse } from "next/server";
import { getAdminSession } from "src/utils/adminAuth";

export async function GET() {
    const session = await getAdminSession();
    return NextResponse.json({
        authenticated: Boolean(session?.email),
        email: session?.email ?? null,
    });
}
