"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FollowButton from "src/app/components/profile/FollowButton";
import { createClient } from "src/utils/supabase/client";

type Artwork = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    price?: number | null;
    artistUserId?: number;
    artistProfilePic?: string | null;
    artistName?: string;
    pickupStatus?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
};

type ArtistGroup = {
    artistKey: string;
    artistName: string;
    artistUserId?: number;
    artistProfilePic?: string | null;
    artworks: Artwork[];
};

export default function Home() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
    const [isReserving, setIsReserving] = useState(false);
    const [reservationMessage, setReservationMessage] = useState<string | null>(null);
    const [reservationError, setReservationError] = useState<string | null>(null);
    const [reservedArtworkIds, setReservedArtworkIds] = useState<number[]>([]);

    const artworksByArtist = useMemo(() => {
        return artworks.reduce<ArtistGroup[]>((groups, artwork) => {
            const artistName = artwork.artistName?.trim() || "Onbekende artiest";
            const artistKey = artwork.artistUserId ? `artist-${artwork.artistUserId}` : `name-${artistName}`;
            const existingGroup = groups.find((group) => group.artistKey === artistKey);

            if (existingGroup) {
                existingGroup.artworks.push(artwork);
                return groups;
            }

            groups.push({
                artistKey,
                artistName,
                artistUserId: artwork.artistUserId,
                artistProfilePic: artwork.artistProfilePic ?? null,
                artworks: [artwork],
            });
            return groups;
        }, []);
    }, [artworks]);

    useEffect(() => {
        let isMounted = true;

        const loadArtworks = async () => {
            setError(null);

            const response = await fetch("/api/artworks", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; artworks?: Artwork[] };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok) {
                setError(result?.error ?? "Kon kunstwerken niet laden.");
                setIsLoading(false);
                return;
            }

            setArtworks(result?.artworks ?? []);
            setIsLoading(false);
        };

        void loadArtworks();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadReservedArtworks = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.email || !isMounted) return;

            const response = await fetch(`/api/reservations?email=${encodeURIComponent(user.email)}`, {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { artworks?: Artwork[] };
                } catch {
                    return null;
                }
            })();

            if (!isMounted || !response.ok) return;

            setReservedArtworkIds((result?.artworks ?? []).map((item) => item.id));
        };

        void loadReservedArtworks();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleReserveArtwork = async (artId: number) => {
        setReservationError(null);
        setReservationMessage(null);
        setIsReserving(true);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setReservationError("Je bent niet ingelogd.");
            setIsReserving(false);
            return;
        }

        const response = await fetch("/api/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, artId }),
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; message?: string };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setReservationError(result?.error ?? "Reserveren mislukt.");
            setIsReserving(false);
            return;
        }

        setReservedArtworkIds((previous) => (previous.includes(artId) ? previous : [...previous, artId]));
        setReservationMessage(result?.message ?? "Kunstwerk gereserveerd. Je vindt deze in je profiel.");
        setIsReserving(false);
    };

    return (
        <div className="min-h-screen bg-stone-200 px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-7xl rounded-3xl border border-stone-300 bg-stone-100/95 p-6 shadow-[0_12px_36px_rgba(38,25,13,0.18)] sm:p-8">
                <div className="mb-5 flex flex-col items-center text-center">
                    <h1 className="text-xl font-semibold tracking-[0.2em] text-stone-800 sm:text-2xl">Art gallery</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-700 sm:text-base">
                        Bekijk goedgekeurde kunstwerken uit de community.
                    </p>
                </div>

                {isLoading ? (
                    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Kunstwerken laden...
                    </div>
                ) : error ? (
                    <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                ) : artworks.length === 0 ? (
                    <div className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                        Nog geen goedgekeurde kunstwerken beschikbaar.
                    </div>
                ) : (
                    <div className="w-full space-y-8">
                        {artworksByArtist.map((artistGroup) => (
                            <section
                                key={artistGroup.artistKey}
                                className="rounded-2xl border border-stone-300 bg-gradient-to-b from-stone-50 to-stone-100 px-4 py-5 shadow-inner sm:px-5"
                            >
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={artistGroup.artistUserId ? `/profile/${artistGroup.artistUserId}` : "/art_gallery"}
                                            className="flex items-center gap-3 rounded-full border border-stone-300 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-50"
                                        >
                                            <img
                                                src={artistGroup.artistProfilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistGroup.artistName)}`}
                                                alt={artistGroup.artistName}
                                                className="h-11 w-11 rounded-full object-cover ring-1 ring-stone-200"
                                            />
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Profiel</p>
                                                <h2 className="text-base font-bold tracking-wide text-stone-900">
                                                    {artistGroup.artistName}
                                                </h2>
                                            </div>
                                        </Link>
                                        <FollowButton targetUserId={artistGroup.artistUserId} />
                                    </div>
                                </div>
                                <div className="flex gap-5 overflow-x-auto pb-3">
                                    {artistGroup.artworks.map((artwork) => (
                                        <button
                                            key={artwork.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedArtwork(artwork);
                                                setReservationError(null);
                                                setReservationMessage(null);
                                            }}
                                            className="w-[16.5rem] shrink-0 rounded-sm border border-[#aa9a75] bg-[#d9c8a0] p-2 text-left shadow-[0_10px_22px_rgba(54,40,24,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(54,40,24,0.38)]"
                                        >
                                            <div className="relative mb-2 aspect-[4/5] w-full overflow-hidden border border-[#8a7a56] bg-stone-100 shadow-inner">
                                                <img
                                                    src={artwork.imageUrl || "/Schilderij1.png"}
                                                    alt={artwork.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="bg-[#efe7d3] px-3 py-2 text-center">
                                                <h3 className="text-sm font-semibold tracking-wide text-stone-800">{artwork.title}</h3>
                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-700">
                                                    {artwork.description || "Geen beschrijving"}
                                                </p>
                                                {typeof artwork.price === "number" && (
                                                    <p className="mt-2 text-xs font-semibold text-stone-800">
                                                        € {artwork.price.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {selectedArtwork && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedArtwork(null);
                            setReservationError(null);
                            setReservationMessage(null);
                        }
                    }}
                >
                    <div className="w-full overflow-hidden rounded-t-3xl bg-[#f5ecdb] shadow-2xl sm:max-w-5xl sm:rounded-2xl">
                        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr]">
                            <div className="bg-[#121212] p-4 sm:p-6">
                                <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-md border border-stone-700 bg-black">
                                    <img
                                        src={selectedArtwork.imageUrl || "/Schilderij1.png"}
                                        alt={selectedArtwork.title}
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col justify-between p-5 sm:p-7">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Kunstwerk</p>
                                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">{selectedArtwork.title}</h3>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <Link
                                            href={selectedArtwork.artistUserId ? `/profile/${selectedArtwork.artistUserId}` : "/art_gallery"}
                                            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                                        >
                                            <img
                                                src={selectedArtwork.artistProfilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArtwork.artistName || "Onbekende artiest")}`}
                                                alt={selectedArtwork.artistName || "Onbekende artiest"}
                                                className="h-8 w-8 rounded-full object-cover ring-1 ring-stone-200"
                                            />
                                            <span>{selectedArtwork.artistName || "Onbekende artiest"}</span>
                                        </Link>
                                        <FollowButton targetUserId={selectedArtwork.artistUserId} />
                                    </div>
                                    <p className="mt-4 text-sm leading-relaxed text-stone-700">
                                        {selectedArtwork.description || "Geen beschrijving"}
                                    </p>
                                    {typeof selectedArtwork.price === "number" && (
                                        <p className="mt-3 text-base font-semibold text-stone-900">
                                            Prijs: € {selectedArtwork.price.toFixed(2)}
                                        </p>
                                    )}

                                    {(selectedArtwork.locationName || selectedArtwork.locationAddress) && (
                                        <div className="mt-4 rounded-lg border border-stone-300 bg-stone-50 p-3 text-sm text-stone-700">
                                            <p className="font-semibold text-stone-800">Huidige locatie</p>
                                            <p className="mt-1">{selectedArtwork.locationName || "Externe locatie"}</p>
                                            {selectedArtwork.locationAddress && (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedArtwork.locationAddress)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 inline-block text-sm font-medium text-violet-700 underline"
                                                >
                                                    Open in Google Maps
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {reservationError && (
                                        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                            {reservationError}
                                        </div>
                                    )}

                                    {reservationMessage && (
                                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                            {reservationMessage}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                    <Link
                                        href="/profile/reservations"
                                        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-sm font-medium text-stone-700 hover:bg-stone-100"
                                    >
                                        Bekijk reserveringen
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedArtwork(null);
                                            setReservationError(null);
                                            setReservationMessage(null);
                                        }}
                                        className="rounded-lg border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
                                    >
                                        Sluiten
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isReserving || reservedArtworkIds.includes(selectedArtwork.id)}
                                        onClick={() => void handleReserveArtwork(selectedArtwork.id)}
                                        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                                    >
                                        {reservedArtworkIds.includes(selectedArtwork.id)
                                            ? "Al gereserveerd"
                                            : isReserving
                                              ? "Reserveren..."
                                              : "Voeg toe aan reserveringen"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}