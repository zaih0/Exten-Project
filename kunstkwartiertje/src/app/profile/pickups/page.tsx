"use client";

import { useEffect, useMemo, useState } from "react";
import FollowButton from "src/app/components/profile/FollowButton";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";
import { createClient } from "src/utils/supabase/client";

type PickupStatus = "pending_request" | "reserved" | "awaiting_artist_confirmation" | "picked_up" | null;

type EntrepreneurPickup = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    artistUserId?: number;
    artistName?: string;
    reservationStatus?: "pending" | "approved" | "rejected" | null;
    pickupStatus?: PickupStatus;
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
    reservationStatus?: "pending" | "approved" | "rejected" | null;
    pickupStatus?: PickupStatus;
    pickedUpAt?: string | null;
    locationName?: string | null;
    locationAddress?: string | null;
};

const formatPickupStatus = (status: PickupStatus | undefined) => {
    if (status === "picked_up") return "Opgehaald ✓";
    if (status === "awaiting_artist_confirmation") return "Wacht op bevestiging kunstenaar";
    if (status === "pending_request") return "In afwachting";
    return "Gereserveerd";
};

const formatReservationStatus = (status: "pending" | "approved" | "rejected" | null | undefined) => {
    if (status === "pending") return "In aanvraag";
    if (status === "approved") return "Toegewezen door kunstenaar";
    if (status === "rejected") return "Niet toegewezen";
    return "Toegewezen door kunstenaar";
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
    const [busyAssignmentKey, setBusyAssignmentKey] = useState<string | null>(null);
    const [busyConfirmKey, setBusyConfirmKey] = useState<string | null>(null);

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

    const handleAssignEntrepreneur = async (artId: number, entrepreneurUserId: number | undefined) => {
        if (!entrepreneurUserId) {
            setError("Ondernemer niet gevonden.");
            return;
        }

        const assignmentKey = `${artId}-${entrepreneurUserId}`;
        setBusyAssignmentKey(assignmentKey);
        setError(null);
        setMessage(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setError("Je bent niet ingelogd.");
            setBusyAssignmentKey(null);
            return;
        }

        const response = await fetch("/api/pickups", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: user.email,
                artId,
                entrepreneurUserId,
            }),
        });

        const text = await response.text();
        const result = (() => {
            try {
                return JSON.parse(text) as { error?: string; message?: string };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Toewijzen mislukt.");
            setBusyAssignmentKey(null);
            return;
        }

        setMessage(result?.message ?? "Ondernemer is toegewezen.");
        await loadData();
        setBusyAssignmentKey(null);
    };

    const handleConfirmPickup = async (artId: number, entrepreneurUserId: number | undefined) => {
        if (!entrepreneurUserId) {
            setError("Ondernemer niet gevonden.");
            return;
        }

        const confirmKey = `${artId}-${entrepreneurUserId}`;
        setBusyConfirmKey(confirmKey);
        setError(null);
        setMessage(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setError("Je bent niet ingelogd.");
            setBusyConfirmKey(null);
            return;
        }

        const response = await fetch("/api/pickups", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: user.email,
                artId,
                entrepreneurUserId,
                action: "confirm_pickup",
            }),
        });

        const text = await response.text();
        const result = (() => {
            try {
                return JSON.parse(text) as { error?: string; message?: string };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Bevestigen mislukt.");
            setBusyConfirmKey(null);
            return;
        }

        setMessage(result?.message ?? "Ophalen bevestigd.");
        await loadData();
        setBusyConfirmKey(null);
    };

    return (
        <div className={isArtistView ? "min-h-screen bg-zinc-50 p-4 md:p-8" : "min-h-screen bg-zinc-50 px-4 py-8 md:px-8 md:py-10"}>
            <div className={isArtistView ? "mx-auto w-full max-w-6xl rounded-none border border-zinc-200 bg-white p-5 shadow-sm md:p-8" : "mx-auto w-full max-w-6xl rounded-none border border-zinc-200 bg-white p-5 shadow-sm md:p-8 lg:p-10"}>
                <div className={isArtistView ? "mb-6" : "mb-8"}>
                    <h1 className={isArtistView ? "text-2xl font-bold text-zinc-900" : "text-3xl font-bold tracking-tight text-zinc-900"}>Pickup systeem</h1>
                    <p className="mt-1 text-sm text-zinc-600">
                        {isArtistView
                            ? "Bekijk reserveringsverzoeken en kies per kunstwerk welke ondernemer wordt toegewezen."
                            : "Bekijk je reserveringsaanvragen en beheer pickup van toegewezen kunstwerken."}
                    </p>
                </div>

                {(error || message) && (
                    <div
                        className={`mb-4 rounded-none px-4 py-3 text-sm ${
                            error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {error ?? message}
                    </div>
                )}

                {isLoading ? (
                    <div className="rounded-none border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        Pickup data laden...
                    </div>
                ) : !hasItems ? (
                    <div className="rounded-none border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Nog geen pickup items beschikbaar.
                    </div>
                ) : isArtistView ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {artistItems.map((item) => (
                            <article key={`${item.artId}-${item.entrepreneurUserId ?? item.entrepreneurName}`} className="overflow-hidden rounded-none border border-zinc-200 bg-white shadow-sm">
                                <div className="h-52 w-full bg-zinc-100">
                                    <img src={item.artworkImageUrl || "/Schilderij1.png"} alt={item.artworkTitle} className="h-full w-full object-cover" />
                                </div>
                                <div className="p-4">
                                    <h2 className="text-base font-semibold text-zinc-900">{item.artworkTitle}</h2>
                                    <p className="mt-1 text-sm text-zinc-600">Ondernemer: {item.entrepreneurName}</p>
                                    <div className="mt-2">
                                        <FollowButton targetUserId={item.entrepreneurUserId} />
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-600">Aanvraag: {formatReservationStatus(item.reservationStatus)}</p>
                                    <p className="mt-1 text-sm text-zinc-600">Pickup: {formatPickupStatus(item.pickupStatus)}</p>
                                    {item.reservationStatus === "pending" && (
                                        <button
                                            type="button"
                                            disabled={busyAssignmentKey === `${item.artId}-${item.entrepreneurUserId}`}
                                            onClick={() => void handleAssignEntrepreneur(item.artId, item.entrepreneurUserId)}
                                            className="mt-3 rounded-none bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                                        >
                                            {busyAssignmentKey === `${item.artId}-${item.entrepreneurUserId}` ? "Toewijzen..." : "Kies deze ondernemer"}
                                        </button>
                                    )}
                                    {item.pickupStatus === "awaiting_artist_confirmation" && (
                                        <button
                                            type="button"
                                            disabled={busyConfirmKey === `${item.artId}-${item.entrepreneurUserId}`}
                                            onClick={() => void handleConfirmPickup(item.artId, item.entrepreneurUserId)}
                                            className="mt-3 rounded-none bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-400"
                                        >
                                            {busyConfirmKey === `${item.artId}-${item.entrepreneurUserId}` ? "Bevestigen..." : "Bevestig ophalen"}
                                        </button>
                                    )}
                                    {item.pickedUpAt && (
                                        <p className="mt-1 text-xs text-zinc-500">Opgehaald op: {new Date(item.pickedUpAt).toLocaleString("nl-NL")}</p>
                                    )}
                                    {(item.locationName || item.locationAddress) && (
                                        <div className="mt-3 rounded-none border border-zinc-200 bg-zinc-50 p-3">
                                            <p className="text-sm font-medium text-zinc-800">Locatie</p>
                                            <p className="text-sm text-zinc-700">{item.locationName || "Externe locatie"}</p>
                                            {item.locationAddress && (
                                                <>
                                                    <p className="mt-1 text-xs text-zinc-500">{item.locationAddress}</p>
                                                    <iframe
                                                        title={`map-${item.artId}`}
                                                        className="mt-2 h-40 w-full rounded-none border border-zinc-200"
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
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {entrepreneurItems.map((item) => {
                            const location = locationInputs[item.id] ?? { name: "", address: "" };

                            return (
                                <article key={item.id} className="overflow-hidden rounded-none border border-zinc-200 bg-white shadow-sm">
                                    <div className="h-60 w-full bg-zinc-100">
                                        <img src={item.imageUrl || "/Schilderij1.png"} alt={item.title} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="space-y-2 p-5">
                                        <h2 className="text-base font-semibold text-zinc-900">{item.title}</h2>
                                        <p className="mt-1 text-sm text-zinc-600">Artiest: {item.artistName || "Onbekende artiest"}</p>
                                        <div className="mt-2">
                                            <FollowButton targetUserId={item.artistUserId} />
                                        </div>
                                        <p className="mt-2 text-sm text-zinc-600">Aanvraag: {formatReservationStatus(item.reservationStatus)}</p>
                                        <p className="mt-1 text-sm text-zinc-600">Pickup: {formatPickupStatus(item.pickupStatus)}</p>

                                        <div className="mt-4 grid grid-cols-1 gap-2">
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
                                                className="rounded-none border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 focus:placeholder:text-transparent"
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
                                                className="rounded-none border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-600 focus:placeholder:text-transparent"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                busyArtId === item.id ||
                                                item.pickupStatus === "picked_up" ||
                                                item.pickupStatus === "awaiting_artist_confirmation" ||
                                                item.reservationStatus !== "approved"
                                            }
                                            onClick={() => void handleMarkPickedUp(item.id)}
                                            className="mt-4 rounded-none bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                                        >
                                            {item.pickupStatus === "picked_up"
                                                ? "Opgehaald ✓"
                                                : item.pickupStatus === "awaiting_artist_confirmation"
                                                  ? "Wacht op bevestiging kunstenaar"
                                                  : item.reservationStatus !== "approved"
                                                    ? "Wacht op keuze van kunstenaar"
                                                    : busyArtId === item.id
                                                      ? "Bijwerken..."
                                                      : "Markeer als opgehaald"}
                                        </button>

                                        {(item.locationName || item.locationAddress) && (
                                            <div className="mt-4 rounded-none border border-zinc-200 bg-zinc-50 p-3">
                                                <p className="text-sm font-medium text-zinc-800">Huidige locatie</p>
                                                <p className="text-sm text-zinc-700">{item.locationName || "Externe locatie"}</p>
                                                {item.locationAddress && (
                                                    <iframe
                                                        title={`map-entrepreneur-${item.id}`}
                                                        className="mt-2 h-40 w-full rounded-none border border-zinc-200"
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
