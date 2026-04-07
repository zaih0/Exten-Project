"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Artwork = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
};

export default function Home() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <div className="flex w-full max-w-6xl flex-col items-center justify-start px-6 py-6">
                <div className="relative mb-2 h-24 w-24 sm:h-28 sm:w-28">
                    <Image src="/logo.png" alt="Kunstkwartiertje logo" fill className="object-contain" priority />
                </div>

                <p className="mb-8 max-w-md text-center text-sm leading-relaxed text-gray-700">
                    Bekijk goedgekeurde kunstwerken uit de community.
                </p>

                {isLoading ? (
                    <div className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Kunstwerken laden...
                    </div>
                ) : error ? (
                    <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                ) : artworks.length === 0 ? (
                    <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        Nog geen goedgekeurde kunstwerken beschikbaar.
                    </div>
                ) : (
                    <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {artworks.map((artwork) => (
                            <div key={artwork.id} className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                <div className="relative mb-3 h-64 w-full overflow-hidden rounded-xl bg-gray-100">
                                    <img
                                        src={artwork.imageUrl || "/Schilderij1.png"}
                                        alt={artwork.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <h2 className="text-base font-semibold text-gray-800">{artwork.title}</h2>
                                <p className="mt-2 text-center text-xs leading-relaxed text-gray-600">
                                    {artwork.description || "Geen beschrijving"}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}