import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type StatusBody = {
  email?: string;
};

export async function POST(request: Request) {
  let payload: StatusBody;

  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("users")
      .select("status, blocked_status")
      .eq("email", payload.email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ status: null, blocked: false });
    }

    return NextResponse.json({ status: data.status, blocked: Boolean(data.blocked_status) });
  } catch (error) {
    console.error("User status route error", error);
    return NextResponse.json(
      { error: "Server configuration missing. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }
}