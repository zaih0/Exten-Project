import { NextResponse } from "next/server";
import { getAllowedChatContacts, getChatContext, groupContactsByCategory } from "src/utils/chatAccess";

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

export async function GET() {
    try {
        const context = await getChatContext();
        if ("error" in context) {
            return NextResponse.json({ error: context.error }, { status: context.status });
        }

        const contacts = await getAllowedChatContacts(context);
        const contactIds = contacts.map((contact) => contact.id);

        const { data: rows, error } = await context.supabase
            .from("chat")
            .select("id, sender_id, receiver_id, message, image_url, sent_date, read_date, created_at")
            .or(`sender_id.eq.${context.currentUser.id},receiver_id.eq.${context.currentUser.id}`)
            .order("sent_date", { ascending: false });

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Chat tabel ontbreekt. Maak public.chat aan en voer database/chat_hub.sql uit." },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const lastMessageByContact = new Map<number, ChatRow>();
        const unreadCountByContact = new Map<number, number>();

        for (const row of (rows ?? []) as ChatRow[]) {
            const counterpartId = row.sender_id === context.currentUser.id ? Number(row.receiver_id) : Number(row.sender_id);
            if (!contactIds.includes(counterpartId)) continue;

            if (!lastMessageByContact.has(counterpartId)) {
                lastMessageByContact.set(counterpartId, row);
            }

            if (row.receiver_id === context.currentUser.id && !row.read_date) {
                unreadCountByContact.set(counterpartId, (unreadCountByContact.get(counterpartId) ?? 0) + 1);
            }
        }

        const payload = contacts.map((contact) => {
            const lastMessage = lastMessageByContact.get(contact.id);
            return {
                id: contact.id,
                email: contact.email,
                username: contact.username,
                role: contact.type,
                lastMessage: lastMessage?.message ?? (lastMessage?.image_url ? "📷 Foto" : null),
                lastMessageImageUrl: lastMessage?.image_url ?? null,
                lastMessageAt: lastMessage?.sent_date ?? lastMessage?.created_at ?? null,
                unreadCount: unreadCountByContact.get(contact.id) ?? 0,
            };
        });

        const groupedContacts = groupContactsByCategory(contacts);

        return NextResponse.json({
            currentUser: {
                id: context.currentUser.id,
                email: context.currentUser.email,
                username: context.currentUser.username,
                role: context.currentUser.type,
            },
            unreadTotal: Array.from(unreadCountByContact.values()).reduce((total, count) => total + count, 0),
            contacts: payload,
            categories: {
                admins: payload.filter((item) => groupedContacts.admins.some((contact) => contact.id === item.id)),
                entrepreneurs: payload.filter((item) =>
                    groupedContacts.entrepreneurs.some((contact) => contact.id === item.id),
                ),
                artists: payload.filter((item) => groupedContacts.artists.some((contact) => contact.id === item.id)),
                accompanists: payload.filter((item) =>
                    groupedContacts.accompanists.some((contact) => contact.id === item.id),
                ),
            },
        });
    } catch (error) {
        console.error("Chat contacts GET error", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Serverfout bij ophalen van chatcontacten." }, { status: 500 });
    }
}
