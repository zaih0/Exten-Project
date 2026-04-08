"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useFollowSummary from "src/app/components/profile/useFollowSummary";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";
import { createClient } from "src/utils/supabase/client";

type Artwork = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    price?: number | null;
};

type ArtistFeedback = {
    id: number;
    feedbackText: string;
    createdAt: string | null;
    authorName: string;
};

export default function ArtistProfile() {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [isLoadingArtworks, setIsLoadingArtworks] = useState(true);
    const [artworksError, setArtworksError] = useState<string | null>(null);
    const { username, role } = useCurrentUserProfile();
    const [profileUsername, setProfileUsername] = useState("");
    const [aboutMe, setAboutMe] = useState("Over mij...");
    const [profilePic, setProfilePic] = useState("");
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editUsername, setEditUsername] = useState("");
    const [editAboutMe, setEditAboutMe] = useState("");
    const [editProfilePic, setEditProfilePic] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [feedbackItems, setFeedbackItems] = useState<ArtistFeedback[]>([]);
    const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [currentEmail, setCurrentEmail] = useState<string | undefined>(undefined);
    const { followerCount, followingCount } = useFollowSummary({ targetEmail: currentEmail });

    const openEdit = () => {
        setEditUsername(profileUsername || username);
        setEditAboutMe(aboutMe);
        setEditProfilePic(profilePic);
        setProfileMessage(null);
        setProfileError(null);
        setIsEditOpen(true);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setExpandedImage(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (!profileUsername && username && username !== "Gebruiker") {
            setProfileUsername(username);
        }
    }, [username, profileUsername]);

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user?.email && isMounted) {
                setCurrentEmail(user.email);
            }

            if (!user?.email || !isMounted) return;

            const response = await fetch(
                `/api/profile?email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(role ?? "kunstenaar")}`,
                { method: "GET", cache: "no-store" },
            );

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as {
                        error?: string;
                        profile?: { username?: string; about_me?: string; profile_pic?: string };
                    };
                } catch {
                    return null;
                }
            })();

            if (!isMounted || !response.ok || !result?.profile) return;

            setProfileUsername(result.profile.username ?? username ?? "Gebruiker");
            setAboutMe(result.profile.about_me ?? "Over mij...");
            setProfilePic(result.profile.profile_pic ?? "");
        };

        void loadProfile();

        return () => {
            isMounted = false;
        };
    }, [role, username]);

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        setProfileError(null);
        setProfileMessage(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setProfileError("Je bent niet ingelogd.");
            setIsSavingProfile(false);
            return;
        }

        const response = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: user.email,
                role: role ?? "kunstenaar",
                username: editUsername,
                about_me: editAboutMe,
                profile_pic: editProfilePic,
            }),
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; pendingApproval?: boolean };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setProfileError(result?.error ?? "Opslaan mislukt.");
            setIsSavingProfile(false);
            return;
        }

        if (result?.pendingApproval) {
            setProfileMessage("Wijziging verzonden. Deze moet eerst door je begeleider worden goedgekeurd.");
            setIsSavingProfile(false);
            setIsEditOpen(false);
            return;
        }

        setProfileUsername(editUsername);
        setAboutMe(editAboutMe);
        setProfilePic(editProfilePic);
        setProfileMessage("Profiel opgeslagen.");
        setIsSavingProfile(false);
        setIsEditOpen(false);
    };

    const handleUploadPicture = async () => {
        if (!uploadFile) {
            setProfileError("Selecteer een afbeelding.");
            return;
        }

        setIsUploadingPicture(true);
        setProfileError(null);

        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            setProfileError("Je bent niet ingelogd.");
            setIsUploadingPicture(false);
            return;
        }

        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("email", user.email);

        const response = await fetch("/api/profile/picture", {
            method: "POST",
            body: formData,
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; imageUrl?: string; pendingApproval?: boolean };
            } catch {
                return null;
            }
        })();

        if (!response.ok || !result?.imageUrl) {
            setProfileError(result?.error ?? "Uploaden profielfoto mislukt.");
            setIsUploadingPicture(false);
            return;
        }

        setEditProfilePic(result.imageUrl);
        if (result.pendingApproval) {
            setProfileMessage("Nieuwe profielfoto is ingediend en wacht op goedkeuring van je begeleider.");
        }
        setIsUploadingPicture(false);
        setIsUploadOpen(false);
        setUploadFile(null);
    };

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

            const response = await fetch(`/api/artworks?email=${encodeURIComponent(user.email)}`, {
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

    useEffect(() => {
        let isMounted = true;

        const loadFeedback = async () => {
            setIsLoadingFeedback(true);
            setFeedbackError(null);

            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.email) {
                if (isMounted) {
                    setFeedbackItems([]);
                    setIsLoadingFeedback(false);
                }
                return;
            }

            const response = await fetch(`/api/artist/feedback?email=${encodeURIComponent(user.email)}`, {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; feedback?: ArtistFeedback[] };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok) {
                setFeedbackError(result?.error ?? "Kon feedback niet laden.");
                setIsLoadingFeedback(false);
                return;
            }

            setFeedbackItems(result?.feedback ?? []);
            setIsLoadingFeedback(false);
        };

        void loadFeedback();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <>
        <div
        className="flex flex-col min-h-screen items-center justify-center font-sans text-zinc-900"
        style={{
            backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
        }}
        >

        <div className="w-full max-w-5xl lg:max-w-6xl mx-auto p-4 md:p-8">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="h-32 md:h-48 w-full" style={{
                    "backgroundImage": "linear-gradient(to right, rgb(206, 177, 240), rgb(229, 198, 238))"
                }}></div>
                
                <div className="px-6 pb-6 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 mb-4">
                        
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 shrink-0">
                            <img 
                                className="w-full h-full object-cover" 
                                src={profilePic || "/profileImage.jpg"}
                                alt="Profile Picture" 
                            />
                        </div>
                        
                        <div className="grow text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profileUsername || username}</h1>
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600 md:justify-start">
                                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                                    {followerCount} volgers
                                </span>
                                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                                    {followingCount} gevolgd
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <button
                                type="button"
                                onClick={openEdit}
                                className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition"
                            >
                                Wijzig Profiel
                            </button>
                            <Link
                                href="/chat"
                                className="px-6 py-2 bg-black text-white font-medium rounded-full hover:bg-gray-900 transition"
                            >
                                Chat hub
                            </Link>
                            <Link
                                href="/profile/pickups"
                                className="px-6 py-2 bg-amber-100 text-amber-800 font-medium rounded-full hover:bg-amber-200 transition"
                            >
                                Pickup systeem
                            </Link>
                            <Link
                                href="/profile/artist/edit"
                                className="px-6 py-2 bg-violet-600 text-white font-medium rounded-full hover:bg-violet-700 transition"
                            >
                                Kunstwerken bewerken
                            </Link>
                        </div>

                    </div>
                    
                    <div className="mt-6 md:pl-2">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">About Me</h2>
                        <p className="text-gray-600 leading-relaxed">
                            {aboutMe || "Over mij..."}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <div className="mb-10 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl font-bold text-zinc-900">Feedback van je begeleider</h2>
                        <p className="text-sm text-zinc-600">
                            Deze feedback is alleen zichtbaar voor jou en je begeleider.
                        </p>
                    </div>

                    {isLoadingFeedback ? (
                        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                            Feedback laden...
                        </div>
                    ) : feedbackError ? (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {feedbackError}
                        </div>
                    ) : feedbackItems.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                            Je hebt nog geen feedback ontvangen.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {feedbackItems.map((item) => (
                                <div key={item.id} className="rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-zinc-900">{item.authorName}</p>
                                        <p className="text-xs text-zinc-500">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleString("nl-NL") : "Onbekende datum"}
                                        </p>
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{item.feedbackText}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
                        Nog geen kunstwerken. Voeg een kunstwerk toe via Wijzig Profiel.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {artworks.map((artwork) => (
                            <div
                                key={artwork.id}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden"
                            >
                                <div className="relative h-40 md:h-44 w-full overflow-hidden">
                                    <img
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                        src={artwork.imageUrl}
                                        alt={artwork.title}
                                        onClick={() => setExpandedImage(artwork.imageUrl)}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3">
                                        <h3 className="font-bold text-white text-lg">{artwork.title}</h3>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-sm text-gray-500 line-clamp-2">{artwork.description || "Geen beschrijving"}</p>
                                    {typeof artwork.price === "number" && (
                                        <p className="mt-2 text-sm font-semibold text-gray-700">€ {artwork.price.toFixed(2)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        </div>

        {isEditOpen && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget) setIsEditOpen(false);
                }}
            >
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                    <h2 className="text-lg font-bold text-gray-900">Profiel bewerken</h2>

                    {(profileError || profileMessage) && (
                        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${profileError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {profileError ?? profileMessage}
                        </p>
                    )}

                    <div className="mt-4 flex items-center gap-4">
                        <img
                            src={editProfilePic || profilePic || "/profileImage.jpg"}
                            alt="Profielfoto"
                            className="h-16 w-16 rounded-full object-cover ring-1 ring-gray-200"
                        />
                        <button
                            type="button"
                            onClick={() => setIsUploadOpen(true)}
                            className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200"
                        >
                            Upload profielfoto
                        </button>
                    </div>

                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                        Gebruikersnaam
                        <input
                            type="text"
                            value={editUsername}
                            onChange={(event) => setEditUsername(event.target.value)}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-gray-900 outline-none ring-violet-300 focus:ring"
                        />
                    </label>

                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                        Bio
                        <textarea
                            value={editAboutMe}
                            onChange={(event) => setEditAboutMe(event.target.value)}
                            rows={4}
                            className="rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none ring-violet-300 focus:ring"
                        />
                    </label>

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsEditOpen(false)}
                            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Annuleren
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSaveProfile()}
                            disabled={isSavingProfile}
                            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                        >
                            {isSavingProfile ? "Opslaan..." : "Opslaan"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isUploadOpen && (
            <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
                onClick={(event) => {
                    if (event.target === event.currentTarget) setIsUploadOpen(false);
                }}
            >
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                    <h3 className="text-lg font-bold text-gray-900">Profielfoto uploaden</h3>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                        className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsUploadOpen(false)}
                            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                        >
                            Sluiten
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleUploadPicture()}
                            disabled={isUploadingPicture || !uploadFile}
                            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                        >
                            {isUploadingPicture ? "Uploaden..." : "Upload"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {expandedImage && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setExpandedImage(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        setExpandedImage(null);
                    }
                }}
                aria-label="Sluit vergrote afbeelding"
            >
                <img
                    src={expandedImage}
                    alt="Vergroot kunstwerk"
                    className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                />
            </div>
        )}
        </>
    );
}