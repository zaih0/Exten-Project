"use client";

import { useEffect, useMemo, useState } from "react";
import FollowButton from "src/app/components/profile/FollowButton";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";
import { createClient } from "src/utils/supabase/client";

type EntrepreneurPickup = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    artistUserId?: number;
    artistName?: string;
    pickupStatus?: "reserved" | "picked_up" | null;
    pickedUpAt?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
};

type ArtistPickup = {
    artId: number;
    artworkTitle: string;
    artworkDescription: string;
    artworkImageUrl: string;
    entrepreneurUserId?: number;
    entrepreneurName: string;
    pickupStatus?: "reserved" | "picked_up" | null;
    pickedUpAt?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
};

export default function PickupSystemPage() {
    const { role } = useCurrentUserProfile();
    const [entrepreneurItems, setEntrepreneurItems] = useState<EntrepreneurPickup[]>([]);
    const [artistItems, setArtistItems] = useState<ArtistPickup[]>([]);
    const [locationInputs, setLocationInputs] = useState<Record<number, { name: string; address: string }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busyArtId, setBusyArtId] = useState<number | null>(null);

    const isArtistView = role === "kunstenaar";

    const hasItems = useMemo(() => {
        return isArtistView ? artistItems.length > 0 : entrepreneurItems.length > 0;
    }, [artistItems.length, entrepreneurItems.length, isArtistView]);

    const loadData = async () => {
        setError(null);
        setMessage(null);
        setIsLoading(true);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setError("Je bent niet ingelogd.");
            setIsLoading(false);
            return;
        }

        const endpoint = isArtistView
            ? `/api/pickups?email=${encodeURIComponent(user.email)}`
            : `/api/reservations?email=${encodeURIComponent(user.email)}`;

        const response = await fetch(endpoint, {
            method: "GET",
            cache: "no-store",
        });

        const text = await response.text();
        const result = (() => {
            try {
                return JSON.parse(text) as {
                    error?: string;
                    artworks?: EntrepreneurPickup[];
                    pickups?: ArtistPickup[];
                };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Kon pickup gegevens niet laden.");
            setIsLoading(false);
            return;
        }

        if (isArtistView) {
            setArtistItems(result?.pickups ?? []);
        } else {
            const artworks = result?.artworks ?? [];
            setEntrepreneurItems(artworks);

            const mappedInputs: Record<number, { name: string; address: string }> = {};
            for (const item of artworks) {
                mappedInputs[item.id] = {
                    name: item.locationName ?? "",
                    address: item.locationAddress ?? "",
                };
            }
            setLocationInputs(mappedInputs);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isArtistView]);

    const handleMarkPickedUp = async (artId: number) => {
        setBusyArtId(artId);
        setError(null);
        setMessage(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setError("Je bent niet ingelogd.");
            setBusyArtId(null);
            return;
        }

        const location = locationInputs[artId] ?? { name: "", address: "" };

        const response = await fetch("/api/reservations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: user.email,
                artId,
                pickupStatus: "picked_up",
                locationName: location.name,
                locationAddress: location.address,
            }),
        });

        const text = await response.text();
        const result = (() => {
            try {
                return JSON.parse(text) as { error?: string };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Pickup status bijwerken mislukt.");
            setBusyArtId(null);
            return;
        }

        setMessage("Kunstwerk is als opgehaald geregistreerd.");
        await loadData();
        setBusyArtId(null);
    };

    return (
        <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
            <div className="mx-auto w-full max-w-6xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-zinc-900">Pickup systeem</h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        {isArtistView
                            ? "Overzicht van reserveringen en pickup locaties voor jouw kunstwerken."
                            : "Beheer pickup status en locatie van jouw gereserveerde kunstwerken."}
                    </p>
                </div>

                {(error || message) && (
                    <div
                        className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                            error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {error ?? message}
                    </div>
                )}

                {isLoading ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Pickup data laden...
                    </div>
                ) : !hasItems ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Nog geen pickup items beschikbaar.
                    </div>
                ) : isArtistView ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {artistItems.map((item) => (
                            <article key={`${item.artId}-${item.entrepreneurName}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                                <div className="h-52 w-full bg-zinc-100">
                                    <img src={item.artworkImageUrl || "/Schilderij1.png"} alt={item.artworkTitle} className="h-full w-full object-cover" />
                                </div>
                                <div className="p-4">
                                    <h2 className="text-base font-semibold text-zinc-900">{item.artworkTitle}</h2>
                                    <p className="mt-1 text-sm text-zinc-600">Ondernemer: {item.entrepreneurName}</p>
                                    <div className="mt-2">
                                        <FollowButton targetUserId={item.entrepreneurUserId} />
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-600">Status: {item.pickupStatus === "picked_up" ? "Opgehaald" : "Gereserveerd"}</p>
                                    {item.pickedUpAt && (
                                        <p className="mt-1 text-xs text-zinc-500">Opgehaald op: {new Date(item.pickedUpAt).toLocaleString("nl-NL")}</p>
                                    )}
                                    {(item.locationName || item.locationAddress) && (
                                        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                                            <p className="text-sm font-medium text-zinc-800">Locatie</p>
                                            <p className="text-sm text-zinc-700">{item.locationName || "Externe locatie"}</p>
                                            {item.locationAddress && (
                                                <>
                                                    <p className="mt-1 text-xs text-zinc-500">{item.locationAddress}</p>
                                                    <iframe
                                                        title={`map-${item.artId}`}
                                                        className="mt-2 h-40 w-full rounded-md border border-zinc-200"
                                                        loading="lazy"
                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(item.locationAddress)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {entrepreneurItems.map((item) => {
                            const location = locationInputs[item.id] ?? { name: "", address: "" };

                            return (
                                <article key={item.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                                    <div className="h-52 w-full bg-zinc-100">
                                        <img src={item.imageUrl || "/Schilderij1.png"} alt={item.title} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="p-4">
                                        <h2 className="text-base font-semibold text-zinc-900">{item.title}</h2>
                                        <p className="mt-1 text-sm text-zinc-600">Artiest: {item.artistName || "Onbekende artiest"}</p>
                                        <div className="mt-2">
                                            <FollowButton targetUserId={item.artistUserId} />
                                        </div>
                                        <p className="mt-2 text-sm text-zinc-600">Status: {item.pickupStatus === "picked_up" ? "Opgehaald" : "Gereserveerd"}</p>

                                        <div className="mt-3 grid grid-cols-1 gap-2">
                                            <input
                                                type="text"
                                                value={location.name}
                                                onChange={(event) =>
                                                    setLocationInputs((previous) => ({
                                                        ...previous,
                                                        [item.id]: {
                                                            ...(previous[item.id] ?? { name: "", address: "" }),
                                                            name: event.target.value,
                                                        },
                                                    }))
                                                }
                                                placeholder="Locatienaam (bv. Bibliotheek Centrum)"
                                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 focus:placeholder:text-transparent"
                                            />
                                            <input
                                                type="text"
                                                value={location.address}
                                                onChange={(event) =>
                                                    setLocationInputs((previous) => ({
                                                        ...previous,
                                                        [item.id]: {
                                                            ...(previous[item.id] ?? { name: "", address: "" }),
                                                            address: event.target.value,
                                                        },
                                                    }))
                                                }
                                                placeholder="Adres voor kaartweergave"
                                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 focus:placeholder:text-transparent"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            disabled={busyArtId === item.id || item.pickupStatus === "picked_up"}
                                            onClick={() => void handleMarkPickedUp(item.id)}
                                            className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                                        >
                                            {item.pickupStatus === "picked_up"
                                                ? "Al opgehaald"
                                                : busyArtId === item.id
                                                  ? "Bijwerken..."
                                                  : "Markeer als opgehaald"}
                                        </button>

                                        {(item.locationName || item.locationAddress) && (
                                            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                                                <p className="text-sm font-medium text-zinc-800">Huidige locatie</p>
                                                <p className="text-sm text-zinc-700">{item.locationName || "Externe locatie"}</p>
                                                {item.locationAddress && (
                                                    <iframe
                                                        title={`map-entrepreneur-${item.id}`}
                                                        className="mt-2 h-40 w-full rounded-md border border-zinc-200"
                                                        loading="lazy"
                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(item.locationAddress)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
