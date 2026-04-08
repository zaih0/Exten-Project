"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "src/utils/supabase/client";

type UnreadResponse = {
    unreadTotal?: number;
    error?: string;
};

export default function FloatingChatBubble() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [unreadTotal, setUnreadTotal] = useState(0);

    useEffect(() => {
        let isMounted = true;
        const supabase = createClient();

        const loadAuthAndUnread = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!isMounted) return;
            const loggedIn = Boolean(session?.user);
            setIsAuthenticated(loggedIn);

            if (!loggedIn) {
                setUnreadTotal(0);
                return;
            }

            const response = await fetch("/api/chat/unread", {
                method: "GET",
                cache: "no-store",
            });
            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as UnreadResponse;
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;
            if (!response.ok) {
                setUnreadTotal(0);
                return;
            }

            setUnreadTotal(result?.unreadTotal ?? 0);
        };

        void loadAuthAndUnread();
        const interval = window.setInterval(() => {
            void loadAuthAndUnread();
        }, 8000);

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            void loadAuthAndUnread();
        });

        return () => {
            isMounted = false;
            window.clearInterval(interval);
            subscription.unsubscribe();
        };
    }, []);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="fixed bottom-5 right-5 z-[70]">
            <Link
                href="/chat"
                className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition hover:-translate-y-0.5 ${
                    pathname === "/chat"
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
                }`}
                aria-label="Open chat hub"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-6 w-6"
                    aria-hidden="true"
                >
                    <path d="M7 10h10" />
                    <path d="M7 14h6" />
                    <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4A2.8 2.8 0 0 1 17.2 16H10l-4.6 4.2c-.5.5-1.4.1-1.4-.6V16A2.8 2.8 0 0 1 4 13.2z" />
                </svg>
                {unreadTotal > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                        {unreadTotal > 99 ? "99+" : unreadTotal}
                    </span>
                )}
            </Link>
        </div>
    );
}
