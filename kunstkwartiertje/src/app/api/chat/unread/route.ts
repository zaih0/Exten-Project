import { NextResponse } from "next/server";
import { getChatContext } from "src/utils/chatAccess";

export async function GET() {
    try {
        const context = await getChatContext();
        if ("error" in context) {
            return NextResponse.json({ error: context.error, unreadTotal: 0 }, { status: context.status });
        }

        const { count, error } = await context.supabase
            .from("chat")
            .select("id", { count: "exact", head: true })
            .eq("receiver_id", context.currentUser.id)
            .is("read_date", null);

        if (error) {
            if (error.code === "42P01") {
                return NextResponse.json(
                    { error: "Chat tabel ontbreekt. Maak public.chat aan en voer database/chat_hub.sql uit.", unreadTotal: 0 },
                    { status: 500 },
                );
            }
            return NextResponse.json({ error: error.message, unreadTotal: 0 }, { status: 500 });
        }

        return NextResponse.json({ unreadTotal: count ?? 0 });
    } catch (error) {
        console.error("Chat unread GET error", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Serverfout bij ophalen van ongelezen berichten.", unreadTotal: 0 },
            { status: 500 },
        );
    }
}
