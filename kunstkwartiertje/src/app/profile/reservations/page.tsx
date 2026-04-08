"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FollowButton from "src/app/components/profile/FollowButton";
import { createClient } from "src/utils/supabase/client";

type ReservedArtwork = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    artistUserId?: number;
    artistName?: string;
    pickupStatus?: "reserved" | "picked_up" | null;
    locationName?: string | null;
    locationAddress?: string | null;
};

export default function ReservedArtworksPage() {
    const [artworks, setArtworks] = useState<ReservedArtwork[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadReservedArtworks = async () => {
            setError(null);
            setIsLoading(true);

            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.email) {
                if (!isMounted) return;
                setError("Je bent niet ingelogd.");
                setIsLoading(false);
                return;
            }

            const response = await fetch(`/api/reservations?email=${encodeURIComponent(user.email)}`, {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; artworks?: ReservedArtwork[] };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok) {
                setError(result?.error ?? "Kon reserveringen niet laden.");
                setIsLoading(false);
                return;
            }

            setArtworks(result?.artworks ?? []);
            setIsLoading(false);
        };

        void loadReservedArtworks();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
            <div className="mx-auto w-full max-w-6xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-zinc-900">Mijn reserveringen</h1>
                    <div className="flex gap-2">
                        <Link
                            href="/profile/pickups"
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                            Pickup systeem
                        </Link>
                        <Link
                            href="/art_gallery"
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                            Terug naar gallery
                        </Link>
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Reserveringen laden...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                ) : artworks.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Je hebt nog geen gereserveerde kunstwerken.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {artworks.map((artwork) => (
                            <article
                                key={artwork.id}
                                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                            >
                                <div className="h-56 w-full bg-zinc-100">
                                    <img
                                        src={artwork.imageUrl || "/Schilderij1.png"}
                                        alt={artwork.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="p-4">
                                    <h2 className="text-base font-semibold text-zinc-900">{artwork.title}</h2>
                                    <p className="mt-1 text-xs font-medium text-zinc-500">
                                        {artwork.artistName || "Onbekende artiest"}
                                    </p>
                                    <div className="mt-2">
                                        <FollowButton targetUserId={artwork.artistUserId} />
                                    </div>
                                    <p className="mt-2 line-clamp-3 text-sm text-zinc-600">
                                        {artwork.description || "Geen beschrijving"}
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-zinc-700">
                                        Status: {artwork.pickupStatus === "picked_up" ? "Opgehaald" : "Gereserveerd"}
                                    </p>
                                    {(artwork.locationName || artwork.locationAddress) && (
                                        <p className="mt-1 text-xs text-zinc-500">
                                            Locatie: {artwork.locationName || artwork.locationAddress}
                                        </p>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
