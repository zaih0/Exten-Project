import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type RequestBody = {
  email?: string | null;
  username?: string | null;
  type?: string | null;
};

export async function POST(request: Request) {
  let payload: RequestBody;

  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.email) {
    return NextResponse.json({ error: "Missing required user fields." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("email, blocked_status")
      .eq("email", payload.email)
      .maybeSingle();

    if (lookupError) {
      console.error("Approval request lookup error", lookupError);
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    const requestPayload = {
      email: payload.email,
      username: payload.username ?? null,
      type: payload.type ?? null,
    };

    if (existingUser?.blocked_status) {
      return NextResponse.json(
        { error: "Je account is geblokkeerd. Neem contact op met een admin.", blocked: true },
        { status: 403 },
      );
    }

    const { error } = existingUser
      ? await supabase
          .from("users")
        .update(requestPayload)
          .eq("email", payload.email)
      : await supabase
          .from("users")
          .insert({ ...requestPayload, status: "pending", blocked_status: false });

    if (error) {
      console.error("Approval request upsert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Approval request route error", error);
    return NextResponse.json(
      { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}