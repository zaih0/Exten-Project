"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";

type Artwork = {
    id: number;
    title: string;
    imageUrl: string;
    description: string;
};

const initialArtworks: Artwork[] = [
    {
        id: 1,
        title: "Kunstwerk 1",
        imageUrl: "/KW1.jpg",
        description: "Beschrijving van dit werk.",
    },
    {
        id: 2,
        title: "Kunstwerk 2",
        imageUrl: "/KW2.jpg",
        description: "Beschrijving van dit werk.",
    },
    {
        id: 3,
        title: "Kunstwerk 3",
        imageUrl: "/KW3.jpg",
        description: "Beschrijving van dit werk.",
    },
];

export default function ArtistEditPage() {
    const { username } = useCurrentUserProfile();
    const [artistName, setArtistName] = useState("");
    const [hasCustomArtistName, setHasCustomArtistName] = useState(false);
    const [bio, setBio] = useState("Over mij...");
    const [profileImage, setProfileImage] = useState("/profileImage.jpg");
    const [artworks, setArtworks] = useState<Artwork[]>(initialArtworks);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (!hasCustomArtistName && username && username !== "Gebruiker") {
            setArtistName(username);
        }
    }, [username, hasCustomArtistName]);

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
        setIsSaved(false);
    };

    const addArtwork = () => {
        setArtworks((current) => [
            ...current,
            {
                id: Date.now(),
                title: "Nieuw kunstwerk",
                imageUrl: "/KW4.jpg",
                description: "Beschrijving...",
            },
        ]);
        setIsSaved(false);
    };

    const removeArtwork = (id: number) => {
        setArtworks((current) => current.filter((artwork) => artwork.id !== id));
        setIsSaved(false);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSaved(true);
    };

    return (
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
                        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Wijzig artiestprofiel</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Pas je profielgegevens en kunstwerken aan.
                        </p>
                    </div>
                    <Link
                        href="/profile/artist"
                        className="inline-flex items-center justify-center rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                        Terug naar profiel
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <section className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                            Artiestnaam
                            <input
                                type="text"
                                value={artistName}
                                onChange={(event) => {
                                    setHasCustomArtistName(true);
                                    setArtistName(event.target.value);
                                    setIsSaved(false);
                                }}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-gray-900 outline-none ring-violet-300 focus:ring"
                                required
                            />
                        </label>

                        <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
                            Profielfoto URL
                            <input
                                type="text"
                                value={profileImage}
                                onChange={(event) => {
                                    setProfileImage(event.target.value);
                                    setIsSaved(false);
                                }}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-gray-900 outline-none ring-violet-300 focus:ring"
                                required
                            />
                        </label>

                        <label className="md:col-span-2 flex flex-col gap-2 text-sm font-medium text-gray-700">
                            Over mij
                            <textarea
                                value={bio}
                                onChange={(event) => {
                                    setBio(event.target.value);
                                    setIsSaved(false);
                                }}
                                rows={4}
                                className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none ring-violet-300 focus:ring"
                                required
                            />
                        </label>
                    </section>

                    <section>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Kunstwerken</h2>
                            <button
                                type="button"
                                onClick={addArtwork}
                                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                            >
                                + Nieuw kunstwerk
                            </button>
                        </div>

                        <div className="space-y-4">
                            {artworks.map((artwork) => (
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
                                    </div>

                                    <div className="md:col-span-1 flex md:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeArtwork(artwork.id)}
                                            className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-200"
                                        >
                                            Verwijder
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="flex flex-col gap-3 border-t border-gray-100 pt-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={profileImage}
                                alt={artistName}
                                className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                            />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{artistName}</p>
                                <p className="text-xs text-gray-500">{artworks.length} kunstwerken</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {isSaved ? (
                                <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
                                    Profiel opgeslagen
                                </span>
                            ) : (
                                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
                                    Niet opgeslagen wijzigingen
                                </span>
                            )}
                            <button
                                type="submit"
                                className="rounded-full bg-gray-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-black"
                            >
                                Opslaan
                            </button>
                        </div>
                    </section>
                </form>
            </div>
        </div>
    );
}
