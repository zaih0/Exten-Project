"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";
import { createClient } from "src/utils/supabase/client";

type PendingProfileChanges = {
    proposedUsername: string | null;
    proposedAboutMe: string | null;
    proposedProfilePic: string | null;
    createdAt: string | null;
};

type ManagedArtist = {
    id: number;
    email: string;
    username: string;
    status: string | null;
    blocked: boolean;
    createdAt: string | null;
    aboutMe: string;
    profilePic: string;
    hasPendingProfileChanges?: boolean;
    pendingProfileChanges?: PendingProfileChanges | null;
    permissions: {
        canAddArtworks: boolean;
        canEditArtworks: boolean;
        canUseChat: boolean;
        canEditProfilePic: boolean;
        canEditUsername: boolean;
        canEditAboutMe: boolean;
    };
};

type ManagedArtwork = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    status: "pending" | "approved" | "denied";
    artistName: string;
    artistEmail: string | null;
};

export default function AccompanistProfile() {
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
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [managedArtists, setManagedArtists] = useState<ManagedArtist[]>([]);
    const [isLoadingManagedArtists, setIsLoadingManagedArtists] = useState(true);
    const [managementError, setManagementError] = useState<string | null>(null);
    const [managementMessage, setManagementMessage] = useState<string | null>(null);
    const [newArtistUsername, setNewArtistUsername] = useState("");
    const [newArtistEmail, setNewArtistEmail] = useState("");
    const [newArtistPassword, setNewArtistPassword] = useState("");
    const [isCreatingArtist, setIsCreatingArtist] = useState(false);
    const [updatingArtistId, setUpdatingArtistId] = useState<number | null>(null);
    const [artistAboutMeDrafts, setArtistAboutMeDrafts] = useState<Record<number, string>>({});
    const [savingAboutMeArtistId, setSavingAboutMeArtistId] = useState<number | null>(null);
    const [managedArtworks, setManagedArtworks] = useState<ManagedArtwork[]>([]);
    const [isLoadingManagedArtworks, setIsLoadingManagedArtworks] = useState(true);
    const [managedArtworksError, setManagedArtworksError] = useState<string | null>(null);
    const [pendingActionArtistId, setPendingActionArtistId] = useState<number | null>(null);
    const [incomingChangesMessage, setIncomingChangesMessage] = useState<string | null>(null);
    const [incomingChangesError, setIncomingChangesError] = useState<string | null>(null);

    const fetchManagedArtists = async (email: string) => {
        const response = await fetch(`/api/accompanist/artists?email=${encodeURIComponent(email)}`, {
            method: "GET",
            cache: "no-store",
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; artists?: ManagedArtist[] };
            } catch {
                return null;
            }
        })();

        return {
            ok: response.ok,
            error: result?.error ?? null,
            artists: result?.artists ?? [],
        };
    };

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

            if (!user?.email || !isMounted) return;

            const response = await fetch(
                `/api/profile?email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(role ?? "begeleider")}`,
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

    useEffect(() => {
        let isMounted = true;

        const loadManagedArtists = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const email = user?.email?.trim().toLowerCase() ?? null;
            if (!email || !isMounted) {
                if (isMounted) setIsLoadingManagedArtists(false);
                return;
            }

            setCurrentUserEmail(email);
            setManagementError(null);
            setIsLoadingManagedArtists(true);

            const result = await fetchManagedArtists(email);

            if (!isMounted) return;

            if (!result.ok) {
                setManagementError(result.error ?? "Kon artiestenlijst niet ophalen.");
                setIsLoadingManagedArtists(false);
                return;
            }

            setManagedArtists(result.artists);
            setArtistAboutMeDrafts(
                Object.fromEntries(result.artists.map((artist) => [artist.id, artist.aboutMe ?? ""])),
            );
            setIsLoadingManagedArtists(false);
        };

        void loadManagedArtists();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadManagedArtworks = async () => {
            setIsLoadingManagedArtworks(true);
            setManagedArtworksError(null);

            const response = await fetch("/api/admin/artworks", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as {
                        error?: string;
                        artworks?: ManagedArtwork[];
                    };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok) {
                setManagedArtworksError(result?.error ?? "Kon kunstwerken niet ophalen.");
                setIsLoadingManagedArtworks(false);
                return;
            }

            const artistEmails = new Set(
                managedArtists.map((artist) => artist.email.trim().toLowerCase()).filter((value) => value.length > 0),
            );

            const filtered = (result?.artworks ?? []).filter((artwork) => {
                const email = artwork.artistEmail?.trim().toLowerCase();
                if (!email) return false;
                return artistEmails.has(email);
            });

            setManagedArtworks(filtered);
            setIsLoadingManagedArtworks(false);
        };

        if (managedArtists.length === 0) {
            setManagedArtworks([]);
            setIsLoadingManagedArtworks(false);
            return () => {
                isMounted = false;
            };
        }

        void loadManagedArtworks();

        return () => {
            isMounted = false;
        };
    }, [managedArtists]);

    const pendingArtworks = managedArtworks.filter((artwork) => artwork.status === "pending");
    const approvedArtworks = managedArtworks.filter((artwork) => artwork.status === "approved");
    const pendingProfileArtists = managedArtists.filter((artist) => artist.pendingProfileChanges);

    const handleCreateArtistAccount = async () => {
        if (!currentUserEmail) {
            setManagementError("Je bent niet ingelogd als begeleider.");
            return;
        }

        if (!newArtistUsername.trim() || !newArtistEmail.trim() || newArtistPassword.length < 8) {
            setManagementError("Vul gebruikersnaam, e-mail en wachtwoord (min. 8 tekens) in.");
            return;
        }

        setIsCreatingArtist(true);
        setManagementError(null);
        setManagementMessage(null);

        const response = await fetch("/api/accompanist/artists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail: currentUserEmail,
                username: newArtistUsername,
                email: newArtistEmail,
                password: newArtistPassword,
            }),
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
            setManagementError(result?.error ?? "Artiestaccount aanmaken is mislukt.");
            setIsCreatingArtist(false);
            return;
        }

        const refreshResult = await fetchManagedArtists(currentUserEmail);

        if (refreshResult.ok) {
            setManagedArtists(refreshResult.artists);
            setArtistAboutMeDrafts(
                Object.fromEntries(refreshResult.artists.map((artist) => [artist.id, artist.aboutMe ?? ""])),
            );
        }

        setNewArtistUsername("");
        setNewArtistEmail("");
        setNewArtistPassword("");
        setManagementMessage("Artiestaccount aangemaakt. Stel nu de rechten in.");
        setIsCreatingArtist(false);
    };

    const handlePendingProfileDecision = async (artistId: number, decision: "approve" | "deny") => {
        if (!currentUserEmail) {
            setIncomingChangesError("Je bent niet ingelogd als begeleider.");
            return;
        }

        setPendingActionArtistId(artistId);
        setIncomingChangesError(null);
        setIncomingChangesMessage(null);
        setManagementError(null);

        const response = await fetch(`/api/accompanist/artists/${artistId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail: currentUserEmail,
                approvePendingChanges: decision === "approve",
                denyPendingChanges: decision === "deny",
            }),
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
            setIncomingChangesError(result?.error ?? "Kon profielwijziging niet verwerken.");
            setPendingActionArtistId(null);
            return;
        }

        const refreshResult = await fetchManagedArtists(currentUserEmail);

        if (!refreshResult.ok) {
            setIncomingChangesError(refreshResult.error ?? "Goedkeuring verwerkt, maar overzicht vernieuwen mislukte.");
            setPendingActionArtistId(null);
            return;
        }

        setManagedArtists(refreshResult.artists);
        setArtistAboutMeDrafts(
            Object.fromEntries(refreshResult.artists.map((artist) => [artist.id, artist.aboutMe ?? ""])),
        );
        setIncomingChangesMessage(
            decision === "approve" ? "Profielwijziging goedgekeurd." : "Profielwijziging afgewezen.",
        );
        setPendingActionArtistId(null);
    };

    const handleTogglePermission = async (
        artist: ManagedArtist,
        permissionKey:
            | "canAddArtworks"
            | "canEditArtworks"
            | "canUseChat"
            | "canEditProfilePic"
            | "canEditUsername"
            | "canEditAboutMe",
    ) => {
        if (!currentUserEmail) return;

        setUpdatingArtistId(artist.id);
        setManagementError(null);
        setManagementMessage(null);

        const nextPermissions = {
            canAddArtworks: artist.permissions.canAddArtworks,
            canEditArtworks: artist.permissions.canEditArtworks,
            canUseChat: artist.permissions.canUseChat,
            canEditProfilePic: artist.permissions.canEditProfilePic,
            canEditUsername: artist.permissions.canEditUsername,
            canEditAboutMe: artist.permissions.canEditAboutMe,
            [permissionKey]: !artist.permissions[permissionKey],
        };

        const response = await fetch("/api/accompanist/artists", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail: currentUserEmail,
                artistUserId: artist.id,
                canAddArtworks: nextPermissions.canAddArtworks,
                canEditArtworks: nextPermissions.canEditArtworks,
                canUseChat: nextPermissions.canUseChat,
                canEditProfilePic: nextPermissions.canEditProfilePic,
                canEditUsername: nextPermissions.canEditUsername,
                canEditAboutMe: nextPermissions.canEditAboutMe,
            }),
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
            setManagementError(result?.error ?? "Permissie bijwerken mislukt.");
            setUpdatingArtistId(null);
            return;
        }

        setManagedArtists((current) =>
            current.map((item) =>
                item.id === artist.id
                    ? {
                          ...item,
                          permissions: {
                              canAddArtworks: nextPermissions.canAddArtworks,
                              canEditArtworks: nextPermissions.canEditArtworks,
                              canUseChat: nextPermissions.canUseChat,
                              canEditProfilePic: nextPermissions.canEditProfilePic,
                              canEditUsername: nextPermissions.canEditUsername,
                              canEditAboutMe: nextPermissions.canEditAboutMe,
                          },
                      }
                    : item,
            ),
        );
        setManagementMessage("Rechten bijgewerkt.");
        setUpdatingArtistId(null);
    };

    const handleSaveArtistAboutMe = async (artist: ManagedArtist) => {
        if (!currentUserEmail) return;

        const draft = artistAboutMeDrafts[artist.id] ?? "";

        setSavingAboutMeArtistId(artist.id);
        setManagementError(null);
        setManagementMessage(null);

        const response = await fetch("/api/accompanist/artists", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail: currentUserEmail,
                artistUserId: artist.id,
                canAddArtworks: artist.permissions.canAddArtworks,
                canEditArtworks: artist.permissions.canEditArtworks,
                canUseChat: artist.permissions.canUseChat,
                canEditProfilePic: artist.permissions.canEditProfilePic,
                canEditUsername: artist.permissions.canEditUsername,
                canEditAboutMe: artist.permissions.canEditAboutMe,
                aboutMe: draft,
            }),
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
            setManagementError(result?.error ?? "About me bijwerken mislukt.");
            setSavingAboutMeArtistId(null);
            return;
        }

        setManagedArtists((current) =>
            current.map((item) => (item.id === artist.id ? { ...item, aboutMe: draft } : item)),
        );
        setManagementMessage("About me bijgewerkt.");
        setSavingAboutMeArtistId(null);
    };

    const openEditProfile = () => {
        setEditUsername(profileUsername || username);
        setEditAboutMe(aboutMe);
        setEditProfilePic(profilePic);
        setProfileMessage(null);
        setProfileError(null);
        setIsEditOpen(true);
    };

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
                role: role ?? "begeleider",
                username: editUsername,
                about_me: editAboutMe,
                profile_pic: editProfilePic,
            }),
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
            setProfileError(result?.error ?? "Opslaan mislukt.");
            setIsSavingProfile(false);
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
                return JSON.parse(responseText) as { error?: string; imageUrl?: string };
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
        setIsUploadingPicture(false);
        setIsUploadOpen(false);
        setUploadFile(null);
    };

    return (

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
                                src={profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUsername || username)}&background=random`}
                                alt="Profile Picture" 
                            />
                        </div>
                        
                        <div className="grow text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profileUsername || username}</h1>
                            <br />
                        </div>
                        
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <a href="#artists-rights" className="px-6 py-2 bg-purple-600 text-white font-medium rounded-full hover:bg-purple-700 transition">
                                Account Aanmaken
                            </a>
                            <Link href="/chat" className="px-6 py-2 bg-amber-100 text-amber-800 font-medium rounded-full hover:bg-amber-200 transition">
                                Chat hub
                            </Link>
                            <button type="button" onClick={openEditProfile} className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition">
                                Edit Profile
                            </button>
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

            {(profileError || profileMessage) && (
                <p className={`mb-4 rounded-lg px-3 py-2 text-sm ${profileError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {profileError ?? profileMessage}
                </p>
            )}

            <div id="artists-rights" className="mb-10 rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-zinc-900">Artiestenaccounts & rechten</h2>
                    <p className="text-sm text-zinc-600">
                        Maak artiestaccounts aan en beheer wat zij mogen doen op het platform.
                    </p>
                </div>

                {(managementError || managementMessage) && (
                    <p
                        className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                            managementError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {managementError ?? managementMessage}
                    </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <input
                        type="text"
                        value={newArtistUsername}
                        onChange={(event) => setNewArtistUsername(event.target.value)}
                        placeholder="Gebruikersnaam artiest"
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                    />
                    <input
                        type="email"
                        value={newArtistEmail}
                        onChange={(event) => setNewArtistEmail(event.target.value)}
                        placeholder="E-mail artiest"
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                    />
                    <input
                        type="password"
                        value={newArtistPassword}
                        onChange={(event) => setNewArtistPassword(event.target.value)}
                        placeholder="Tijdelijk wachtwoord"
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                    />
                    <button
                        type="button"
                        onClick={() => void handleCreateArtistAccount()}
                        disabled={isCreatingArtist}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                        {isCreatingArtist ? "Aanmaken..." : "Artiestaccount aanmaken"}
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    {isLoadingManagedArtists ? (
                        <div className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-200">
                            Artiesten laden...
                        </div>
                    ) : managedArtists.length === 0 ? (
                        <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                            Er zijn nog geen artiestaccounts gekoppeld aan jouw begeleider-profiel.
                        </div>
                    ) : (
                        managedArtists.map((artist) => (
                            <div
                                key={artist.id}
                                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900">
                                            {artist.username || artist.email}
                                        </p>
                                        <p className="text-xs text-zinc-500">{artist.email}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200">
                                        {artist.blocked ? "Geblokkeerd" : artist.status ?? "Onbekend"}
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                    {[
                                        { key: "canAddArtworks", label: "Kunstwerken toevoegen" },
                                        { key: "canEditArtworks", label: "Kunstwerken bewerken" },
                                        { key: "canUseChat", label: "Chat gebruiken (later)" },
                                        { key: "canEditProfilePic", label: "Profielfoto wijzigen" },
                                        { key: "canEditUsername", label: "Gebruikersnaam wijzigen" },
                                        { key: "canEditAboutMe", label: "About me wijzigen" },
                                    ].map((right) => {
                                        const permissionKey = right.key as
                                            | "canAddArtworks"
                                            | "canEditArtworks"
                                            | "canUseChat"
                                            | "canEditProfilePic"
                                            | "canEditUsername"
                                            | "canEditAboutMe";
                                        const enabled = artist.permissions[permissionKey];

                                        return (
                                            <button
                                                key={right.key}
                                                type="button"
                                                onClick={() => void handleTogglePermission(artist, permissionKey)}
                                                disabled={updatingArtistId === artist.id}
                                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                                                    enabled
                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                        : "border-zinc-300 bg-white text-zinc-700"
                                                } disabled:opacity-60`}
                                            >
                                                <span>{right.label}</span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                        enabled
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-zinc-100 text-zinc-500"
                                                    }`}
                                                >
                                                    {enabled ? "Aan" : "Uit"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-3">
                                    <label className="block text-xs font-semibold text-zinc-700">About me</label>
                                    <textarea
                                        value={artistAboutMeDrafts[artist.id] ?? artist.aboutMe ?? ""}
                                        onChange={(event) =>
                                            setArtistAboutMeDrafts((current) => ({
                                                ...current,
                                                [artist.id]: event.target.value,
                                            }))
                                        }
                                        rows={3}
                                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                                        placeholder="About me van deze artiest"
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveArtistAboutMe(artist)}
                                            disabled={savingAboutMeArtistId === artist.id}
                                            className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                                        >
                                            {savingAboutMeArtistId === artist.id ? "Opslaan..." : "About me opslaan"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mb-12 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-zinc-900">Binnenkomende profielwijzigingen</h2>
                    <p className="text-sm text-zinc-600">
                        Bekijk snel welke artiesten profielaanpassingen hebben ingestuurd en keur ze direct goed of af.
                    </p>
                </div>

                {(incomingChangesError || incomingChangesMessage) && (
                    <p
                        className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                            incomingChangesError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {incomingChangesError ?? incomingChangesMessage}
                    </p>
                )}

                {isLoadingManagedArtists ? (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Inkomende wijzigingen laden...
                    </div>
                ) : pendingProfileArtists.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Er zijn nu geen profielwijzigingen die op jouw beoordeling wachten.
                    </div>
                ) : (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {pendingProfileArtists.map((artist) => {
                            const pending = artist.pendingProfileChanges;

                            if (!pending) {
                                return null;
                            }

                            return (
                                <div
                                    key={artist.id}
                                    className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <img
                                                className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                                                src={
                                                    pending.proposedProfilePic ||
                                                    artist.profilePic ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.username || artist.email)}&background=random`
                                                }
                                                alt={artist.username || artist.email}
                                            />
                                            <div>
                                                <Link
                                                    href={`/profile/accompanist/artists/${artist.id}`}
                                                    className="text-sm font-semibold text-zinc-900 hover:text-violet-700"
                                                >
                                                    {artist.username || artist.email}
                                                </Link>
                                                <p className="text-xs text-zinc-500">{artist.email}</p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                            Wacht op beoordeling
                                        </span>
                                    </div>

                                    <div className="mt-4 space-y-3 text-sm text-zinc-700">
                                        {pending.createdAt && (
                                            <p className="text-xs text-zinc-500">
                                                Ingestuurd op {new Date(pending.createdAt).toLocaleString("nl-NL")}
                                            </p>
                                        )}

                                        {typeof pending.proposedUsername === "string" && pending.proposedUsername !== artist.username && (
                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-amber-100">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Gebruikersnaam</p>
                                                <p className="mt-1 text-xs text-zinc-500">Huidig: {artist.username || "-"}</p>
                                                <p className="text-sm font-medium text-zinc-900">Nieuw: {pending.proposedUsername || "-"}</p>
                                            </div>
                                        )}

                                        {typeof pending.proposedAboutMe === "string" && pending.proposedAboutMe !== artist.aboutMe && (
                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-amber-100">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">About me</p>
                                                <p className="mt-1 text-xs text-zinc-500 line-clamp-3">Huidig: {artist.aboutMe || "Nog geen about me ingevuld."}</p>
                                                <p className="mt-1 text-sm text-zinc-900 line-clamp-4">Nieuw: {pending.proposedAboutMe || "Leeg gemaakt"}</p>
                                            </div>
                                        )}

                                        {typeof pending.proposedProfilePic === "string" && pending.proposedProfilePic !== artist.profilePic && (
                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-amber-100">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Profielfoto</p>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <img
                                                        className="h-14 w-14 rounded-full object-cover ring-1 ring-zinc-200"
                                                        src={artist.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.username || artist.email)}&background=random`}
                                                        alt={`${artist.username || artist.email} huidige profielfoto`}
                                                    />
                                                    <span className="text-xs font-semibold text-zinc-400">→</span>
                                                    <img
                                                        className="h-14 w-14 rounded-full object-cover ring-1 ring-amber-200"
                                                        src={pending.proposedProfilePic}
                                                        alt={`${artist.username || artist.email} voorgestelde profielfoto`}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                        <Link
                                            href={`/profile/accompanist/artists/${artist.id}`}
                                            className="text-sm font-medium text-violet-700 hover:text-violet-800"
                                        >
                                            Open volledig profiel
                                        </Link>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handlePendingProfileDecision(artist.id, "deny")}
                                                disabled={pendingActionArtistId === artist.id}
                                                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                            >
                                                {pendingActionArtistId === artist.id ? "Verwerken..." : "Afwijzen"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handlePendingProfileDecision(artist.id, "approve")}
                                                disabled={pendingActionArtistId === artist.id}
                                                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                            >
                                                {pendingActionArtistId === artist.id ? "Verwerken..." : "Goedkeuren"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Artists Section */}
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Mijn Artiesten</h2>
                </div>
                {isLoadingManagedArtists ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Artiesten laden...
                    </div>
                ) : managedArtists.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        Nog geen artiesten gekoppeld.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {managedArtists.map((artist) => (
                            <div key={artist.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                                <Link href={`/profile/accompanist/artists/${artist.id}`} className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1 block">
                                    <img
                                        className="w-full h-full object-cover"
                                        src={
                                            artist.profilePic ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.username || artist.email)}&background=random`
                                        }
                                        alt={artist.username || artist.email}
                                    />
                                </Link>
                                <Link href={`/profile/accompanist/artists/${artist.id}`} className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">
                                    {artist.username || artist.email}
                                </Link>
                                <p className="text-sm text-gray-500 line-clamp-1 mt-1">{artist.email}</p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                    {artist.aboutMe || "Geen about me ingevuld."}
                                </p>
                                {artist.hasPendingProfileChanges && (
                                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                        Wacht op jouw goedkeuring
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending Artworks Section */}
            <div className="mt-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Te Keuren Kunstwerken</h2>
                </div>
                {isLoadingManagedArtworks ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Kunstwerken laden...
                    </div>
                ) : managedArtworksError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {managedArtworksError}
                    </div>
                ) : pendingArtworks.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        Geen te keuren kunstwerken.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingArtworks.map((artwork) => (
                            <div key={artwork.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="h-48 w-full overflow-hidden">
                                    <img src={artwork.imageUrl} alt={artwork.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                                </div>
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{artwork.title}</h3>
                                    <p className="text-sm text-purple-600 font-medium mb-3">Door: {artwork.artistName}</p>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{artwork.description || "Geen beschrijving"}</p>
                                    <div className="mt-auto">
                                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                            Wacht op admin goedkeuring
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved Artworks Section */}
            <div className="mt-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Gepubliceerde Kunstwerken</h2>
                </div>
                {isLoadingManagedArtworks ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Kunstwerken laden...
                    </div>
                ) : managedArtworksError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {managedArtworksError}
                    </div>
                ) : approvedArtworks.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        Geen gepubliceerde kunstwerken.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {approvedArtworks.map((artwork) => (
                            <div key={artwork.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="h-48 w-full overflow-hidden">
                                    <img src={artwork.imageUrl} alt={artwork.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                                </div>
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{artwork.title}</h3>
                                    <p className="text-sm text-purple-600 font-medium mb-3">Door: {artwork.artistName}</p>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{artwork.description || "Geen beschrijving"}</p>
                                    <div className="mt-auto">
                                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            Gepubliceerd
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {isEditOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setIsEditOpen(false); }}>
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                    <h2 className="text-lg font-bold text-gray-900">Profiel bewerken</h2>

                    <div className="mt-4 flex items-center gap-4">
                        <img src={editProfilePic || profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(editUsername || username)}&background=random`} alt="Profielfoto" className="h-16 w-16 rounded-full object-cover ring-1 ring-gray-200" />
                        <button type="button" onClick={() => setIsUploadOpen(true)} className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200">
                            Upload profielfoto
                        </button>
                    </div>

                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                        Gebruikersnaam
                        <input type="text" value={editUsername} onChange={(event) => setEditUsername(event.target.value)} className="rounded-xl border border-gray-200 px-4 py-2" />
                    </label>

                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-gray-700">
                        Bio
                        <textarea value={editAboutMe} onChange={(event) => setEditAboutMe(event.target.value)} rows={4} className="rounded-xl border border-gray-200 px-4 py-2" />
                    </label>

                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsEditOpen(false)} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Annuleren</button>
                        <button type="button" onClick={() => void handleSaveProfile()} disabled={isSavingProfile} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{isSavingProfile ? "Opslaan..." : "Opslaan"}</button>
                    </div>
                </div>
            </div>
        )}

        {isUploadOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setIsUploadOpen(false); }}>
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                    <h3 className="text-lg font-bold text-gray-900">Profielfoto uploaden</h3>
                    <input type="file" accept="image/*" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsUploadOpen(false)} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Sluiten</button>
                        <button type="button" onClick={() => void handleUploadPicture()} disabled={isUploadingPicture || !uploadFile} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{isUploadingPicture ? "Uploaden..." : "Upload"}</button>
                    </div>
                </div>
            </div>
        )}

        </div>
    );
}