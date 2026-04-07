import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type UpdateBody = {
  email?: string;
  status?: "approved" | "denied";
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, email, username, type, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (error) {
    console.error("Admin requests GET error", error);
    return NextResponse.json(
      { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let payload: UpdateBody;

  try {
    payload = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.email || !payload.status) {
    return NextResponse.json({ error: "Missing request email or status." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const updatePayload =
      payload.status === "denied"
        ? { status: "denied", blocked_status: true }
        : { status: "approved", blocked_status: false };

    const { error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("email", payload.email)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin requests PATCH error", error);
    return NextResponse.json(
      { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}