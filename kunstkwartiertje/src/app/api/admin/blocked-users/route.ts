import { NextResponse } from "next/server";
import { requireAdminSession } from "src/utils/adminAuth";
import { createAdminClient } from "src/utils/supabase/admin";

type UnblockBody = {
  email?: string;
};

export async function GET() {
  try {
    const auth = await requireAdminSession();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, type, status, created_at, blocked_status")
      .eq("blocked_status", true)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    console.error("Blocked users GET error", error);
    return NextResponse.json(
      { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let payload: UnblockBody;

  try {
    payload = (await request.json()) as UnblockBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.email) {
    return NextResponse.json({ error: "Missing user email." }, { status: 400 });
  }

  try {
    const auth = await requireAdminSession();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("users")
      .update({ blocked_status: false, status: "approved" })
      .eq("email", payload.email)
      .eq("blocked_status", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Blocked users PATCH error", error);
    return NextResponse.json(
      { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}