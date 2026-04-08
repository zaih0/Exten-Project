"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "src/utils/supabase/client";

type Artwork = {
    id: number;
    title: string;
    imageUrl: string;
    description: string;
    price?: number | null;
    status?: "pending" | "approved" | "denied";
    denialReason?: string | null;
};

export default function ArtistEditPage() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [isLoadingArtworks, setIsLoadingArtworks] = useState(true);
    const [artworksError, setArtworksError] = useState<string | null>(null);
    const [deletingArtworkId, setDeletingArtworkId] = useState<number | null>(null);
    const [savingArtworkId, setSavingArtworkId] = useState<number | null>(null);

    // Upload modal state
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadDescription, setUploadDescription] = useState("");
    const [uploadPrice, setUploadPrice] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadMessage, setUploadMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadArtworks = async () => {
            setIsLoadingArtworks(true);
            setArtworksError(null);

            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.email) {
                if (isMounted) {
                    setArtworks([]);
                    setIsLoadingArtworks(false);
                }
                return;
            }

            const response = await fetch(`/api/artworks?email=${encodeURIComponent(user.email)}&includeAll=true`, {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as {
                        error?: string;
                        artworks?: Artwork[];
                    };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok) {
                setArtworksError(result?.error ?? "Kon kunstwerken niet laden.");
                setIsLoadingArtworks(false);
                return;
            }

            setArtworks(result?.artworks ?? []);
            setIsLoadingArtworks(false);
        };

        void loadArtworks();

        return () => {
            isMounted = false;
        };
    }, []);

    const updateArtwork = (
        id: number,
        field: keyof Omit<Artwork, "id">,
        value: string,
    ) => {
        setArtworks((current) =>
            current.map((artwork) =>
                artwork.id === id ? { ...artwork, [field]: value } : artwork,
            ),
        );
    };

    const openUploadModal = () => {
        setUploadTitle("");
        setUploadDescription("");
        setUploadPrice("");
        setUploadFile(null);
        setUploadPreview(null);
        setUploadError(null);
        setIsUploadOpen(true);
    };

    const closeUploadModal = () => {
        if (isUploading) return;
        if (uploadPreview) URL.revokeObjectURL(uploadPreview);
        setIsUploadOpen(false);
    };

    const handleFileChange = (file: File | null) => {
        if (uploadPreview) URL.revokeObjectURL(uploadPreview);
        setUploadFile(file);
        setUploadPreview(file ? URL.createObjectURL(file) : null);
    };

    const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!uploadFile) {
            setUploadError("Selecteer een afbeelding.");
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadMessage(null);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setUploadError("Je bent niet ingelogd.");
            setIsUploading(false);
            return;
        }

        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("title", uploadTitle);
        formData.append("description", uploadDescription);
        formData.append("price", uploadPrice.trim());
        formData.append("userId", user.id);
        formData.append("email", user.email ?? "");

        const response = await fetch("/api/artworks", {
            method: "POST",
            body: formData,
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as {
                    error?: string;
                    artwork?: {
                        id: number;
                        title: string;
                        imageUrl: string;
                        description: string;
                        price?: number | null;
                        status?: "pending" | "approved" | "denied";
                        denialReason?: string | null;
                    };
                };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setUploadError(result?.error ?? "Uploaden mislukt. Probeer opnieuw.");
            setIsUploading(false);
            return;
        }

        if (result?.artwork) {
            setArtworks((current) => [
                ...current,
                {
                    id: result.artwork!.id,
                    title: result.artwork!.title,
                    imageUrl: result.artwork!.imageUrl,
                    description: result.artwork!.description ?? "",
                    price: result.artwork!.price ?? null,
                    status: result.artwork!.status ?? "pending",
                    denialReason: result.artwork!.denialReason ?? null,
                },
            ]);
        }

        setUploadMessage("Kunstwerk geüpload. Het wordt zichtbaar na goedkeuring door een admin.");

        setIsUploading(false);
        closeUploadModal();
    };

    const saveArtwork = async (artwork: Artwork) => {
        setSavingArtworkId(artwork.id);
        setArtworksError(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setArtworksError("Je bent niet ingelogd.");
            setSavingArtworkId(null);
            return;
        }

        const response = await fetch("/api/artworks", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                artworkId: artwork.id,
                email: user.email,
                title: artwork.title,
                description: artwork.description,
                imageUrl: artwork.imageUrl,
                price: artwork.price ?? null,
            }),
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; artwork?: Artwork };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setArtworksError(result?.error ?? "Kon kunstwerk niet opslaan.");
            setSavingArtworkId(null);
            return;
        }

        if (result?.artwork) {
            setArtworks((current) => current.map((item) => (item.id === artwork.id ? { ...item, ...result.artwork } : item)));
        }

        setUploadMessage("Kunstwerk opgeslagen.");
        setSavingArtworkId(null);
    };

    const removeArtwork = async (id: number) => {
        setDeletingArtworkId(id);
        setArtworksError(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setArtworksError("Je bent niet ingelogd.");
            setDeletingArtworkId(null);
            return;
        }

        const response = await fetch("/api/artworks", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ artworkId: id, email: user.email }),
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setArtworksError(result?.error ?? "Kon kunstwerk niet verwijderen.");
            setDeletingArtworkId(null);
            return;
        }

        setArtworks((current) => current.filter((artwork) => artwork.id !== id));
        setDeletingArtworkId(null);
    };

    return (
        <>
        <div
            className="flex min-h-screen items-start justify-center px-4 py-10 md:px-8"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
            }}
        >
            <div className="w-full max-w-5xl rounded-2xl border border-gray-100 bg-white/95 p-6 shadow-sm md:p-8">
                <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Kunstwerken bewerken</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Voeg kunstwerken toe, pas ze aan en verwijder ze.
                        </p>
                    </div>
                    <Link
                        href="/profile/artist"
                        className="inline-flex items-center justify-center rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                        Terug naar profiel
                    </Link>
                </div>

                <div className="space-y-8">
                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Kunstwerken</h2>
                            <button
                                type="button"
                                onClick={openUploadModal}
                                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Kunstwerk toevoegen
                            </button>
                        </div>

                        <div className="space-y-4">
                            {uploadMessage && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    {uploadMessage}
                                </div>
                            )}

                            {isLoadingArtworks ? (
                                <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                                    Kunstwerken laden...
                                </div>
                            ) : artworksError ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {artworksError}
                                </div>
                            ) : artworks.length === 0 ? (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                    Nog geen kunstwerken gevonden. Voeg je eerste werk toe.
                                </div>
                            ) : (
                                artworks.map((artwork) => (
                                    <article
                                        key={artwork.id}
                                        className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-12"
                                    >
                                        <div className="md:col-span-3">
                                            <img
                                                src={artwork.imageUrl}
                                                alt={artwork.title}
                                                className="h-28 w-full rounded-lg object-cover"
                                            />
                                        </div>

                                        <div className="md:col-span-8 grid gap-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-semibold text-gray-500">Moderatie status</span>
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                                                        artwork.status === "approved"
                                                            ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                            : artwork.status === "denied"
                                                                ? "bg-rose-100 text-rose-700 ring-rose-200"
                                                                : "bg-amber-100 text-amber-700 ring-amber-200"
                                                    }`}
                                                >
                                                    {artwork.status === "approved"
                                                        ? "Goedgekeurd"
                                                        : artwork.status === "denied"
                                                            ? "Afgewezen"
                                                            : "Wacht op goedkeuring"}
                                                </span>
                                            </div>

                                            {artwork.status === "denied" && artwork.denialReason && (
                                                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                                    Afwijsreden: {artwork.denialReason}
                                                </div>
                                            )}

                                            <input
                                                type="text"
                                                value={artwork.title}
                                                onChange={(event) =>
                                                    updateArtwork(
                                                        artwork.id,
                                                        "title",
                                                        event.target.value,
                                                    )
                                                }
                                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-violet-300 focus:ring"
                                                placeholder="Titel"
                                                required
                                            />
                                            <input
                                                type="text"
                                                value={artwork.imageUrl}
                                                onChange={(event) =>
                                                    updateArtwork(
                                                        artwork.id,
                                                        "imageUrl",
                                                        event.target.value,
                                                    )
                                                }
                                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-violet-300 focus:ring"
                                                placeholder="Afbeelding URL"
                                                required
                                            />
                                            <textarea
                                                value={artwork.description}
                                                onChange={(event) =>
                                                    updateArtwork(
                                                        artwork.id,
                                                        "description",
                                                        event.target.value,
                                                    )
                                                }
                                                rows={2}
                                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-violet-300 focus:ring"
                                                placeholder="Beschrijving"
                                                required
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={artwork.price ?? ""}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setArtworks((current) =>
                                                        current.map((item) =>
                                                            item.id === artwork.id
                                                                ? { ...item, price: value === "" ? null : Number(value) }
                                                                : item,
                                                        ),
                                                    );
                                                }}
                                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-violet-300 focus:ring"
                                                placeholder="Prijs (optioneel)"
                                            />
                                        </div>

                                        <div className="md:col-span-1 flex flex-col gap-2 md:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => void saveArtwork(artwork)}
                                                disabled={savingArtworkId === artwork.id}
                                                className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {savingArtworkId === artwork.id ? "Opslaan..." : "Opslaan"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void removeArtwork(artwork.id)}
                                                disabled={deletingArtworkId === artwork.id}
                                                className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {deletingArtworkId === artwork.id ? "Verwijderen..." : "Verwijder"}
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>

            {isUploadOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeUploadModal(); }}
                >
                    <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Kunstwerk toevoegen</h2>
                            <button
                                type="button"
                                onClick={closeUploadModal}
                                disabled={isUploading}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 disabled:opacity-50"
                                aria-label="Sluiten"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="space-y-4">
                            {/* File picker */}
                            <div>
                                <p className="mb-1.5 text-sm font-medium text-gray-700">Afbeelding</p>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const dropped = e.dataTransfer.files[0];
                                        if (dropped?.type.startsWith("image/")) handleFileChange(dropped);
                                    }}
                                    className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 text-center transition hover:border-violet-400 hover:bg-violet-50"
                                >
                                    {uploadPreview ? (
                                        <img
                                            src={uploadPreview}
                                            alt="Voorvertoning"
                                            className="max-h-48 w-full rounded-xl object-contain p-1"
                                        />
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 h-8 w-8 text-violet-400" aria-hidden="true">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            <p className="text-sm font-medium text-violet-600">Klik of sleep een afbeelding</p>
                                            <p className="mt-1 text-xs text-gray-400">PNG, JPG, WEBP — max 10 MB</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                                />
                            </div>

                            {/* Title */}
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                                Titel
                                <input
                                    type="text"
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    required
                                    placeholder="Naam van het kunstwerk"
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-gray-900 outline-none ring-violet-300 focus:ring"
                                />
                            </label>

                            {/* Description */}
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                                Beschrijving
                                <textarea
                                    value={uploadDescription}
                                    onChange={(e) => setUploadDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Vertel iets over dit werk..."
                                    className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none ring-violet-300 focus:ring"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                                Prijs (optioneel)
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={uploadPrice}
                                    onChange={(e) => setUploadPrice(e.target.value)}
                                    placeholder="Bijv. 120.00"
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-gray-900 outline-none ring-violet-300 focus:ring"
                                />
                            </label>

                            {uploadError && (
                                <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-600 ring-1 ring-rose-200">
                                    {uploadError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={closeUploadModal}
                                    disabled={isUploading}
                                    className="rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                                >
                                    Annuleren
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading || !uploadFile}
                                    className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isUploading ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                                            </svg>
                                            Uploaden...
                                        </>
                                    ) : "Toevoegen"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
