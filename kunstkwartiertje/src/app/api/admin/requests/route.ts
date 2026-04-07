import { NextResponse } from "next/server";
import { createAdminClient } from "src/utils/supabase/admin";

type UpdateBody = {
  requestType?: "user" | "artwork";
  email?: string;
  artworkId?: number;
  status?: "approved" | "denied";
  denialReason?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestType = url.searchParams.get("type");

  try {
    const supabase = createAdminClient();

    if (requestType === "artworks") {
      const { data: artworks, error: artworksError } = await supabase
        .from("artworks")
        .select("id, user_id, title, description, images, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (artworksError) {
        return NextResponse.json({ error: artworksError.message }, { status: 500 });
      }

      const rows = artworks ?? [];
      const userIds = Array.from(
        new Set(rows.map((item) => String(item.user_id)).filter((value) => value.length > 0)),
      );

      const usersById = new Map<string, { email: string | null; username: string | null; type: string | null }>();

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, username, type")
          .in("id", userIds);

        if (usersError) {
          return NextResponse.json({ error: usersError.message }, { status: 500 });
        }

        for (const user of users ?? []) {
          usersById.set(String(user.id), {
            email: user.email ?? null,
            username: user.username ?? null,
            type: user.type ?? null,
          });
        }
      }

      const requests = rows.map((item) => {
        const owner = usersById.get(String(item.user_id));
        const imageUrl = Array.isArray(item.images) ? (item.images[0] ?? "") : (item.images ?? "");

        return {
          id: item.id,
          user_id: item.user_id,
          title: item.title ?? "Ongetiteld kunstwerk",
          description: item.description ?? "",
          imageUrl,
          status: item.status ?? "pending",
          created_at: item.created_at,
          artist_email: owner?.email ?? null,
          artist_username: owner?.username ?? null,
          artist_type: owner?.type ?? null,
        };
      });

      return NextResponse.json({ requests });
    }

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

  try {
    const supabase = createAdminClient();

    if (payload.requestType === "artwork") {
      if (!payload.artworkId || !payload.status) {
        return NextResponse.json({ error: "Missing artworkId or status." }, { status: 400 });
      }

      const denialReason = payload.denialReason?.trim();

      if (payload.status === "denied" && !denialReason) {
        return NextResponse.json({ error: "Missing denial reason for denied artwork." }, { status: 400 });
      }

      const artworkUpdatePayload =
        payload.status === "denied"
          ? { status: "denied", denial_reason: denialReason }
          : { status: "approved", denial_reason: null };

      const { error } = await supabase
        .from("artworks")
        .update(artworkUpdatePayload)
        .eq("id", payload.artworkId)
        .eq("status", "pending");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (!payload.email || !payload.status) {
      return NextResponse.json({ error: "Missing request email or status." }, { status: 400 });
    }

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