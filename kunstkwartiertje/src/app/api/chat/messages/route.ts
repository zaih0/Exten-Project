import { NextResponse } from "next/server";
import { canUsersChat, getChatContext } from "src/utils/chatAccess";

type ChatRow = {
    id: number;
    sender_id: number | null;
    receiver_id: number | null;
    message: string | null;
    image_url: string | null;
    sent_date: string | null;
    read_date: string | null;
    created_at: string | null;
};

export async function GET(request: Request) {
    const url = new URL(request.url);
    const contactId = Number(url.searchParams.get("contactId"));

    if (!Number.isFinite(contactId)) {
        return NextResponse.json({ error: "Ongeldige contactId." }, { status: 400 });
    }

    try {
        const context = await getChatContext();
        if ("error" in context) {
            return NextResponse.json({ error: context.error }, { status: context.status });
        }

        const allowed = await canUsersChat(context, contactId);
        if (!allowed) {
            return NextResponse.json({ error: "Je mag deze chat niet openen." }, { status: 403 });
        }

        const { data, error } = await context.supabase
            .from("chat")
            .select("id, sender_id, receiver_id, message, image_url, sent_date, read_date, created_at")
            .or(
                `and(sender_id.eq.${context.currentUser.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${context.currentUser.id})`,
            )
            .order("sent_date", { ascending: true });

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Chat tabel ontbreekt. Maak public.chat aan en voer database/chat_hub.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const unreadIds = ((data ?? []) as ChatRow[])
            .filter((row) => row.sender_id === contactId && row.receiver_id === context.currentUser.id && !row.read_date)
            .map((row) => row.id);

        if (unreadIds.length > 0) {
            const { error: readError } = await context.supabase
                .from("chat")
                .update({ read_date: new Date().toISOString() })
                .in("id", unreadIds);

            if (readError) {
                return NextResponse.json({ error: readError.message }, { status: 500 });
            }
        }

        const messages = ((data ?? []) as ChatRow[]).map((row) => ({
            id: row.id,
            senderId: Number(row.sender_id),
            receiverId: Number(row.receiver_id),
            message: row.message ?? "",
            imageUrl: row.image_url ?? null,
            sentDate: row.sent_date ?? row.created_at ?? null,
            readDate:
                unreadIds.includes(row.id) && row.receiver_id === context.currentUser.id
                    ? new Date().toISOString()
                    : row.read_date ?? null,
        }));

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Chat messages GET error", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Serverfout bij ophalen van berichten." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: "Ongeldige formulierdata." }, { status: 400 });
    }

    const contactId = Number(formData.get("contactId"));
    const message = String(formData.get("message") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!Number.isFinite(contactId) || (!message && !file)) {
        return NextResponse.json({ error: "contactId en een bericht of foto zijn verplicht." }, { status: 400 });
    }

    try {
        const context = await getChatContext();
        if ("error" in context) {
            return NextResponse.json({ error: context.error }, { status: context.status });
        }

        // Enforce accompanist chat-send permission for artists
        if (context.currentUser.type === "kunstenaar") {
            const { data: perms, error: permError } = await context.supabase
                .from("accompanist_artist_permissions")
                .select("can_use_chat")
                .eq("artist_user_id", context.currentUser.id);

            if (!permError && perms && perms.length > 0) {
                const anyEnabled = (perms as Array<{ can_use_chat: boolean }>).some((p) => p.can_use_chat);
                if (!anyEnabled) {
                    return NextResponse.json(
                        { error: "Je begeleider heeft chat uitgeschakeld." },
                        { status: 403 },
                    );
                }
            }
        }

        const allowed = await canUsersChat(context, contactId);
        if (!allowed) {
            return NextResponse.json({ error: "Je mag geen bericht sturen naar dit contact." }, { status: 403 });
        }

        const sentDate = new Date().toISOString();
        let imageUrl: string | null = null;

        if (file) {
            const extension = file.name.split(".").pop() ?? "jpg";
            const filePath = `${context.currentUser.id}/${contactId}/${Date.now()}.${extension}`;
            const arrayBuffer = await file.arrayBuffer();

            const { error: uploadError } = await context.supabase.storage
                .from("chat-images")
                .upload(filePath, arrayBuffer, {
                    contentType: file.type || "image/jpeg",
                    upsert: false,
                });

            if (uploadError) {
                return NextResponse.json(
                    {
                        error:
                            uploadError.message ||
                            "Foto uploaden mislukt. Controleer of storage bucket chat-images bestaat.",
                    },
                    { status: 500 },
                );
            }

            const { data: publicUrlData } = context.supabase.storage.from("chat-images").getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
        }

        const { data, error } = await context.supabase
            .from("chat")
            .insert({
                sender_id: context.currentUser.id,
                receiver_id: contactId,
                message: message || null,
                image_url: imageUrl,
                sent_date: sentDate,
                read_date: null,
            })
            .select("id, sender_id, receiver_id, message, image_url, sent_date, read_date, created_at")
            .single();

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Chat tabel of kolommen ontbreken. Maak public.chat aan en voer database/chat_hub.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: {
                id: data.id,
                senderId: Number(data.sender_id),
                receiverId: Number(data.receiver_id),
                message: data.message ?? "",
                imageUrl: data.image_url ?? null,
                sentDate: data.sent_date ?? data.created_at ?? sentDate,
                readDate: data.read_date ?? null,
            },
        });
    } catch (error) {
        console.error("Chat messages POST error", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Serverfout bij versturen van bericht." }, { status: 500 });
    }
}
