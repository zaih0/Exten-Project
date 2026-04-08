"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AdminTabKey = "access" | "chat" | "kunst" | "users" | "allusers" | "resetpw" | "artworks" | "locations";
type RequestStatus = "pending" | "approved" | "denied";

type PendingRequest = {
    id: string | number;
    email: string | null;
    username: string | null;
    type: string | null;
    status: RequestStatus;
    created_at: string | null;
};

type ArtworkRequest = {
    id: number;
    user_id: string;
    title: string;
    description: string;
    imageUrl: string;
    status: RequestStatus;
    created_at: string | null;
    artist_email: string | null;
    artist_username: string | null;
    artist_type: string | null;
};

type DenyArtworkTarget = {
    id: number;
    title: string;
};

type AdminArtwork = {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    status: string;
    created_at: string | null;
    denialReason: string | null;
    artistName: string;
    artistEmail: string | null;
    locationName: string | null;
    locationAddress: string | null;
    isReserved: boolean;
};

type BlockedUser = {
    id: string | number;
    email: string | null;
    username: string | null;
    type: string | null;
    status: RequestStatus;
    created_at: string | null;
    blocked_status: boolean;
};

type PasswordChangeLog = {
    id: number;
    targetUserEmail: string | null;
    changedByEmail: string | null;
    changedAt: string | null;
};

const adminTabs: Array<{ key: AdminTabKey; label: string }> = [
    { key: "access", label: "Toegangsverzoeken" },
    { key: "chat", label: "Chat moderatie" },
    { key: "kunst", label: "Kunst moderatie" },
    { key: "users", label: "Geblokkeerde gebruikers" },
    { key: "allusers", label: "Alle gebruikers" },
    { key: "resetpw", label: "Wachtwoord herstellen" },
    { key: "artworks", label: "Kunstwerken beheren" },
    { key: "locations", label: "Locatiebeheer" },
];

const adminTabExamples: Record<AdminTabKey, string[]> = {
    access: [
        "Gebruiker vraagt toegang aan (nieuwe artiest/partner aanvraag).",
        "Toegang wordt geweigerd door ontbrekende verificatie/gegevens.",
        "Nieuwe gebruiker vraagt toegang na het invullen van aanvullende info.",
    ],
    chat: [
        "Mogelijke spam of herhaald ongewenst gedrag in berichten.",
        "Discussies met beledigingen/haatdragende taal die gemodereerd moeten worden.",
        "Verdachte links of pogingen tot phishing via chatberichten.",
    ],
    kunst: [
        "Inzending bevat mogelijk auteursrechtelijk beschermde content.",
        "Kunstwerk lijkt ongepast (bv. geweld/naaktheid) of mist context.",
        "Dubbele/repeteerde inzendingen die verwijderd/afgekeurd moeten worden.",
    ],
    users: [
        "Account is herhaaldelijk in overtreding en verdient verwijdering.",
        "Verdacht gedrag of misbruik (bv. ban-omzeiling).",
        "Rapporten van meerdere gebruikers die samen een actie vragen.",
    ],
    allusers: [],
    resetpw: [
        "Gebruiker wil een wachtwoordherstel aanvragen (normale flow).",
        "Herstel wordt geblokkeerd door risicovolle/potentieel frauduleuze activiteit.",
        "Wachtwoordherstel voor accounts die tijdelijk vergrendeld zijn.",
    ],
    artworks: [],
    locations: [],
};

const roleLabels: Record<string, string> = {
    begeleider: "Begeleider",
    ondernemer: "Ondernemer",
    kunstenaar: "Kunstenaar",
};

const formatRoleLabel = (role: string | null) => {
    if (!role) return "Onbekend";
    return roleLabels[role] ?? `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
};

const formatRequestDate = (value: string | null) => {
    if (!value) return "Onbekende datum";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Onbekende datum";

    return new Intl.DateTimeFormat("nl-NL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

export default function AdminPage() {
    const searchParams = useSearchParams();
    const forceLogin = searchParams.get("login") === "1";
    const [activeTab, setActiveTab] = useState<AdminTabKey>("access");
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [pendingArtworkRequests, setPendingArtworkRequests] = useState<ArtworkRequest[]>([]);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
    const [isLoadingArtworkRequests, setIsLoadingArtworkRequests] = useState(true);
    const [isLoadingBlockedUsers, setIsLoadingBlockedUsers] = useState(true);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingBlockedEmail, setProcessingBlockedEmail] = useState<string | null>(null);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [requestMessage, setRequestMessage] = useState<string | null>(null);
    const [artworkError, setArtworkError] = useState<string | null>(null);
    const [artworkMessage, setArtworkMessage] = useState<string | null>(null);
    const [blockedError, setBlockedError] = useState<string | null>(null);
    const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<BlockedUser[]>([]);
    const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(true);
    const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
    const [processingBlockEmail, setProcessingBlockEmail] = useState<string | null>(null);
    const [allUsersError, setAllUsersError] = useState<string | null>(null);
    const [allUsersMessage, setAllUsersMessage] = useState<string | null>(null);
    const [processingArtworkId, setProcessingArtworkId] = useState<number | null>(null);
    const [selectedArtwork, setSelectedArtwork] = useState<ArtworkRequest | null>(null);
    const [denyArtworkTarget, setDenyArtworkTarget] = useState<DenyArtworkTarget | null>(null);
    const [denyArtworkReason, setDenyArtworkReason] = useState("");
    const [passwordResetEmail, setPasswordResetEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
    const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
    const [passwordChangeLogs, setPasswordChangeLogs] = useState<PasswordChangeLog[]>([]);
    const [isLoadingPasswordLogs, setIsLoadingPasswordLogs] = useState(true);
    const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);
    const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
    const [adminLoginEmail, setAdminLoginEmail] = useState("");
    const [adminLoginPassword, setAdminLoginPassword] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [allArtworks, setAllArtworks] = useState<AdminArtwork[]>([]);
    const [isLoadingAllArtworks, setIsLoadingAllArtworks] = useState(true);
    const [allArtworksError, setAllArtworksError] = useState<string | null>(null);
    const [allArtworksMessage, setAllArtworksMessage] = useState<string | null>(null);
    const [editingArtwork, setEditingArtwork] = useState<AdminArtwork | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLocationName, setEditLocationName] = useState("");
    const [editLocationAddress, setEditLocationAddress] = useState("");
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [isSavingArtwork, setIsSavingArtwork] = useState(false);
    const [deletingArtwork, setDeletingArtwork] = useState<AdminArtwork | null>(null);
    const [isDeletingArtwork, setIsDeletingArtwork] = useState(false);
    const [artworkSearchQuery, setArtworkSearchQuery] = useState("");
    const notificationRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let isMounted = true;

        const setLoggedOutState = () => {
            if (!isMounted) return;
            setAuthStatus("unauthenticated");
            setCurrentAdminEmail(null);
            setIsLoadingRequests(false);
            setIsLoadingArtworkRequests(false);
            setIsLoadingBlockedUsers(false);
            setIsLoadingAllUsers(false);
            setIsLoadingPasswordLogs(false);
            setIsLoadingAllArtworks(false);
        };

        const loadAdminSession = async () => {
            const response = await fetch("/api/admin/auth/session", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { authenticated?: boolean; email?: string | null };
                } catch {
                    return null;
                }
            })();

            if (!response.ok || !result?.authenticated) {
                setLoggedOutState();
                return false;
            }

            if (!isMounted) return false;

            setAuthStatus("authenticated");
            setCurrentAdminEmail(result.email ?? null);
            setAuthError(null);
            return true;
        };

        const loadPasswordLogs = async () => {
            setIsLoadingPasswordLogs(true);

            const response = await fetch("/api/admin/users/password", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; logs?: PasswordChangeLog[] };
                } catch {
                    return null;
                }
            })();

            if (!response.ok) {
                setPasswordResetError(result?.error ?? "Kon auditlog niet ophalen.");
                setIsLoadingPasswordLogs(false);
                return;
            }

            setPasswordChangeLogs(result?.logs ?? []);
            setIsLoadingPasswordLogs(false);
        };

        const loadPendingRequests = async () => {
            setRequestError(null);

            const response = await fetch("/api/admin/requests", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; requests?: PendingRequest[] };
                } catch {
                    return null;
                }
            })();

            if (!response.ok) {
                console.error("Failed to load pending requests", result ?? responseText);
                setRequestError("Kon aanvragen niet ophalen.");
                setIsLoadingRequests(false);
                return;
            }

            setPendingRequests(result?.requests ?? []);
            setIsLoadingRequests(false);
        };

        const loadBlockedUsers = async () => {
            setBlockedError(null);

            const response = await fetch("/api/admin/blocked-users", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; users?: BlockedUser[] };
                } catch {
                    return null;
                }
            })();

            if (!response.ok) {
                console.error("Failed to load blocked users", result ?? responseText);
                setBlockedError("Kon geblokkeerde gebruikers niet ophalen.");
                setIsLoadingBlockedUsers(false);
                return;
            }

            setBlockedUsers(result?.users ?? []);
            setIsLoadingBlockedUsers(false);
        };

        const loadPendingArtworkRequests = async () => {
            setArtworkError(null);

            const response = await fetch("/api/admin/requests?type=artworks", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; requests?: ArtworkRequest[] };
                } catch {
                    return null;
                }
            })();

            if (!response.ok) {
                console.error("Failed to load pending artwork requests", result ?? responseText);
                setArtworkError("Kon kunstverzoeken niet ophalen.");
                setIsLoadingArtworkRequests(false);
                return;
            }

            setPendingArtworkRequests(result?.requests ?? []);
            setIsLoadingArtworkRequests(false);
        };

        const loadAllUsers = async () => {
            const response = await fetch("/api/admin/users", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; users?: BlockedUser[] };
                } catch {
                    return null;
                }
            })();

            if (!response.ok) {
                setIsLoadingAllUsers(false);
                return;
            }

            setAllUsers(result?.users ?? []);
            setIsLoadingAllUsers(false);
        };

        const loadAllArtworks = async () => {
            setIsLoadingAllArtworks(true);
            setAllArtworksError(null);

            const response = await fetch("/api/admin/artworks", {
                method: "GET",
                cache: "no-store",
            });

            const responseText = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(responseText) as { error?: string; artworks?: AdminArtwork[] };
                } catch {
                    return null;
                }
            })();

            if (!response.ok) {
                setAllArtworksError(result?.error ?? "Kon kunstwerken niet ophalen.");
                setIsLoadingAllArtworks(false);
                return;
            }

            setAllArtworks(result?.artworks ?? []);
            setAllArtworksError(null);
            setIsLoadingAllArtworks(false);
        };

        const refreshAll = () => {
            void loadPendingRequests();
            void loadPendingArtworkRequests();
            void loadBlockedUsers();
            void loadAllUsers();
            void loadPasswordLogs();
            void loadAllArtworks();
        };

        let interval: number | null = null;

        const handleFocus = () => {
            refreshAll();
        };

        void (async () => {
            if (forceLogin) {
                await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
                setLoggedOutState();
                return;
            }

            const isAuthenticated = await loadAdminSession();
            if (!isAuthenticated || !isMounted) return;

            refreshAll();
            interval = window.setInterval(() => {
                refreshAll();
            }, 15000);
            window.addEventListener("focus", handleFocus);
        })();

        return () => {
            isMounted = false;
            if (interval !== null) {
                window.clearInterval(interval);
            }
            window.removeEventListener("focus", handleFocus);
        };
    }, [forceLogin]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!notificationRef.current) return;

            if (event.target instanceof Node && !notificationRef.current.contains(event.target)) {
                setNotificationOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRequestDecision = async (
        requestEmail: string,
        nextStatus: Exclude<RequestStatus, "pending">,
    ) => {
        setProcessingId(requestEmail);
        setRequestError(null);
        setRequestMessage(null);

        const response = await fetch("/api/admin/requests", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: requestEmail, status: nextStatus }),
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
            console.error(`Failed to update request to ${nextStatus}`, result ?? responseText);
            setRequestError("Kon aanvraag niet bijwerken.");
            setProcessingId(null);
            return;
        }

        setPendingRequests((current) => current.filter((request) => request.email !== requestEmail));
        setRequestMessage(nextStatus === "approved" ? "Aanvraag goedgekeurd." : "Aanvraag afgewezen.");
        setProcessingId(null);

        if (nextStatus === "denied") {
            setBlockedUsers((current) => {
                if (current.some((user) => user.email === requestEmail)) return current;
                const deniedRequest = pendingRequests.find((request) => request.email === requestEmail);
                if (!deniedRequest) return current;

                return [
                    {
                        ...deniedRequest,
                        blocked_status: true,
                        status: "denied",
                    },
                    ...current,
                ];
            });
        }
    };

    const handleUnblockUser = async (email: string) => {
        setProcessingBlockedEmail(email);
        setBlockedError(null);
        setBlockedMessage(null);

        const response = await fetch("/api/admin/blocked-users", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
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
            console.error("Failed to unblock user", result ?? responseText);
            setBlockedError(result?.error ?? "Kon gebruiker niet deblokkeren.");
            setProcessingBlockedEmail(null);
            return;
        }

        setBlockedUsers((current) => current.filter((user) => user.email !== email));
        setBlockedMessage("Gebruiker is gedeblokkeerd.");
        setProcessingBlockedEmail(null);
    };

    const handleArtworkDecision = async (
        artworkId: number,
        nextStatus: Exclude<RequestStatus, "pending">,
        denialReasonInput?: string,
    ) => {
        const denialReason = denialReasonInput?.trim();

        if (nextStatus === "denied" && !denialReason) {
            setArtworkError("Een reden is verplicht bij afwijzen.");
            return;
        }

        setProcessingArtworkId(artworkId);
        setArtworkError(null);
        setArtworkMessage(null);

        const response = await fetch("/api/admin/requests", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ requestType: "artwork", artworkId, status: nextStatus, denialReason }),
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
            console.error(`Failed to update artwork request to ${nextStatus}`, result ?? responseText);
            setArtworkError("Kon kunstverzoek niet bijwerken.");
            setProcessingArtworkId(null);
            return;
        }

        setPendingArtworkRequests((current) => current.filter((request) => request.id !== artworkId));
        setSelectedArtwork((current) => (current?.id === artworkId ? null : current));
        if (nextStatus === "denied") {
            setDenyArtworkTarget(null);
            setDenyArtworkReason("");
        }
        setArtworkMessage(nextStatus === "approved" ? "Kunstwerk goedgekeurd." : "Kunstwerk afgewezen.");
        setProcessingArtworkId(null);
    };

    const openDenyArtworkModal = (artworkId: number, title: string) => {
        setArtworkError(null);
        setDenyArtworkReason("");
        setDenyArtworkTarget({ id: artworkId, title });
    };

    const closeDenyArtworkModal = () => {
        if (denyArtworkTarget && processingArtworkId === denyArtworkTarget.id) return;
        setDenyArtworkTarget(null);
        setDenyArtworkReason("");
    };

    const submitDenyArtwork = async () => {
        if (!denyArtworkTarget) return;
        await handleArtworkDecision(denyArtworkTarget.id, "denied", denyArtworkReason);
    };

    const handleBlockUser = async (email: string) => {
        setProcessingBlockEmail(email);
        setAllUsersError(null);
        setAllUsersMessage(null);

        const response = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
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
            setAllUsersError(result?.error ?? "Kon gebruiker niet blokkeren.");
            setProcessingBlockEmail(null);
            return;
        }

        setAllUsers((current) =>
            current.map((user) =>
                user.email === email ? { ...user, blocked_status: true, status: "denied" as const } : user,
            ),
        );
        setSelectedUser((current) =>
            current?.email === email ? { ...current, blocked_status: true, status: "denied" as const } : current,
        );
        setBlockedUsers((current) => {
            const blockedUser = allUsers.find((u) => u.email === email);
            if (!blockedUser || current.some((u) => u.email === email)) return current;
            return [{ ...blockedUser, blocked_status: true, status: "denied" as const }, ...current];
        });
        setAllUsersMessage("Gebruiker is geblokkeerd.");
        setProcessingBlockEmail(null);
    };

    const handlePreparePasswordReset = (email: string | null) => {
        if (!email) return;
        setPasswordResetEmail(email);
        setPasswordResetError(null);
        setPasswordResetMessage(null);
        setActiveTab("resetpw");
        setSelectedUser(null);
    };

    const handlePasswordReset = async () => {
        const email = passwordResetEmail.trim().toLowerCase();

        if (!email) {
            setPasswordResetError("Kies eerst een gebruiker.");
            return;
        }

        if (newPassword.length < 8) {
            setPasswordResetError("Nieuw wachtwoord moet minimaal 8 tekens bevatten.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordResetError("De wachtwoorden komen niet overeen.");
            return;
        }

        setIsResettingPassword(true);
        setPasswordResetError(null);
        setPasswordResetMessage(null);

        const response = await fetch("/api/admin/users/password", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: newPassword, changedByEmail: currentAdminEmail }),
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
            setPasswordResetError(result?.error ?? "Kon wachtwoord niet aanpassen.");
            setIsResettingPassword(false);
            return;
        }

        setPasswordResetMessage(result?.message ?? "Wachtwoord succesvol aangepast.");
        setNewPassword("");
        setConfirmNewPassword("");
        const logRefreshResponse = await fetch("/api/admin/users/password", {
            method: "GET",
            cache: "no-store",
        });
        const logRefreshText = await logRefreshResponse.text();
        const logRefreshResult = (() => {
            try {
                return JSON.parse(logRefreshText) as { logs?: PasswordChangeLog[] };
            } catch {
                return null;
            }
        })();
        if (logRefreshResponse.ok) {
            setPasswordChangeLogs(logRefreshResult?.logs ?? []);
        }
        setIsResettingPassword(false);
    };

    const openEditArtwork = (artwork: AdminArtwork) => {
        setEditingArtwork(artwork);
        setEditTitle(artwork.title);
        setEditDescription(artwork.description ?? "");
        setEditLocationName(artwork.locationName ?? "");
        setEditLocationAddress(artwork.locationAddress ?? "");
        setEditImageFile(null);
        setEditImagePreview(null);
        setAllArtworksError(null);
        setAllArtworksMessage(null);
    };

    const handleSaveArtwork = async () => {
        if (!editingArtwork) return;
        setIsSavingArtwork(true);
        setAllArtworksError(null);

        const formData = new FormData();
        formData.append("artworkId", String(editingArtwork.id));
        formData.append("title", editTitle);
        formData.append("description", editDescription);
        formData.append("locationName", editLocationName);
        formData.append("locationAddress", editLocationAddress);
        if (editImageFile) formData.append("file", editImageFile);

        const response = await fetch("/api/admin/artworks", {
            method: "PATCH",
            body: formData,
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as {
                    error?: string;
                    newImageUrl?: string | null;
                    locationName?: string | null;
                    locationAddress?: string | null;
                };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setAllArtworksError(result?.error ?? "Kon kunstwerk niet opslaan.");
            setIsSavingArtwork(false);
            return;
        }

        const newImageUrl = result?.newImageUrl ?? null;
        setAllArtworks((current) =>
            current.map((a) =>
                a.id === editingArtwork.id
                    ? {
                          ...a,
                          title: editTitle,
                          description: editDescription,
                          imageUrl: newImageUrl ?? a.imageUrl,
                          locationName: result?.locationName !== undefined ? result.locationName : a.locationName,
                          locationAddress:
                              result?.locationAddress !== undefined ? result.locationAddress : a.locationAddress,
                      }
                    : a,
            ),
        );
        setAllArtworksMessage("Kunstwerk bijgewerkt.");
        setEditingArtwork(null);
        setEditImageFile(null);
        setEditImagePreview(null);
        setIsSavingArtwork(false);
    };

    const handleDeleteArtwork = async () => {
        if (!deletingArtwork) return;
        setIsDeletingArtwork(true);
        setAllArtworksError(null);

        const response = await fetch("/api/admin/artworks", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artworkId: deletingArtwork.id }),
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
            setAllArtworksError(result?.error ?? "Kon kunstwerk niet verwijderen.");
            setIsDeletingArtwork(false);
            return;
        }

        setAllArtworks((current) => current.filter((a) => a.id !== deletingArtwork.id));
        setAllArtworksMessage("Kunstwerk verwijderd.");
        setDeletingArtwork(null);
        setIsDeletingArtwork(false);
    };

    const handleAdminLogin = async () => {
        setIsAuthenticating(true);
        setAuthError(null);

        const response = await fetch("/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: adminLoginEmail, password: adminLoginPassword }),
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
            setAuthError(result?.error ?? "Admin login mislukt.");
            setIsAuthenticating(false);
            return;
        }

        window.location.href = "/admin";
    };

    const handleAdminLogout = async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        window.location.href = "/admin";
    };

    const accountPendingCount = pendingRequests.length;
    const artworkPendingCount = pendingArtworkRequests.length;
    const pendingCount = accountPendingCount + artworkPendingCount;
    const blockedCount = blockedUsers.length;

    const filteredArtworks = allArtworks.filter(
        (artwork) =>
            artwork.title.toLowerCase().includes(artworkSearchQuery.toLowerCase()) ||
            artwork.artistName.toLowerCase().includes(artworkSearchQuery.toLowerCase()),
    );

    // Group artworks by location name for the Locatiebeheer tab
    const artworksWithLocation = allArtworks.filter((a) => a.isReserved);
    const locationGroups = Array.from(
        artworksWithLocation.reduce((map, artwork) => {
            const key = artwork.locationName ?? "(Geen locatie)";
            const group = map.get(key) ?? { locationName: artwork.locationName, artworks: [] as AdminArtwork[] };
            group.artworks.push(artwork);
            map.set(key, group);
            return map;
        }, new Map<string, { locationName: string | null; artworks: AdminArtwork[] }>()),
    ).map(([key, value]) => ({ key, ...value }));

    if (authStatus === "checking") {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 py-8" style={{ backgroundColor: "#faf5ff" }}>
                <div className="w-full max-w-md rounded-3xl border border-purple-200/70 bg-white p-8 shadow-xl shadow-purple-500/10">
                    <p className="text-sm font-medium text-purple-700">Admin omgeving laden...</p>
                </div>
            </div>
        );
    }

    if (authStatus !== "authenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 py-8" style={{ backgroundColor: "#faf5ff" }}>
                <div className="w-full max-w-md rounded-3xl border border-purple-200/70 bg-white p-8 shadow-xl shadow-purple-500/10">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-zinc-900">Admin login</h1>
                        <p className="mt-2 text-sm text-zinc-600">
                            Alleen accounts uit de tabel <span className="font-semibold">admin_users</span> krijgen toegang tot het adminpaneel.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="email"
                            value={adminLoginEmail}
                            onChange={(event) => setAdminLoginEmail(event.target.value)}
                            placeholder="admin@domein.nl"
                            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <input
                            type="password"
                            value={adminLoginPassword}
                            onChange={(event) => setAdminLoginPassword(event.target.value)}
                            placeholder="Wachtwoord"
                            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                    </div>

                    {authError && <p className="mt-4 text-sm text-rose-600">{authError}</p>}

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => void handleAdminLogin()}
                            disabled={isAuthenticating}
                            className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                            {isAuthenticating ? "Inloggen..." : "Inloggen als admin"}
                        </button>
                        <a
                            href="/login"
                            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                            Terug
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen px-6 py-8 font-sans"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
            }}
        >
            <div className="fixed right-6 top-6 z-50" ref={notificationRef}>
                <button
                    type="button"
                    onClick={() => setNotificationOpen((current) => !current)}
                    className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-200/60 bg-white/90 text-purple-700 shadow-lg shadow-purple-500/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                    aria-label="Toon toegangsverzoeken"
                    aria-expanded={notificationOpen}
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
                        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                        <path d="M10 20a2 2 0 0 0 4 0" />
                    </svg>
                    {pendingCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                            {pendingCount}
                        </span>
                    )}
                </button>

                {notificationOpen && (
                    <div className="mt-3 w-[24rem] rounded-3xl border border-purple-200/60 bg-white/95 p-4 shadow-2xl shadow-purple-500/15 backdrop-blur">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900">Aanvragen ter goedkeuring</p>
                                <p className="mt-1 text-xs text-zinc-600">
                                    {pendingCount === 0
                                        ? "Geen openstaande verzoeken."
                                        : `${pendingCount} openstaande ${pendingCount === 1 ? "aanvraag" : "aanvragen"}`}
                                </p>
                            </div>
                            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                                Pending
                            </span>
                            <button
                                type="button"
                                onClick={() => void handleAdminLogout()}
                                className="ml-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Uitloggen
                            </button>
                        </div>

                        {(requestError || requestMessage || artworkError || artworkMessage) && (
                            <div className="mt-3 space-y-2">
                                {(requestError || requestMessage) && (
                                    <div
                                        className={`rounded-2xl px-3 py-2 text-xs ${
                                            requestError
                                                ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                        }`}
                                    >
                                        {requestError ?? requestMessage}
                                    </div>
                                )}
                                {(artworkError || artworkMessage) && (
                                    <div
                                        className={`rounded-2xl px-3 py-2 text-xs ${
                                            artworkError
                                                ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                        }`}
                                    >
                                        {artworkError ?? artworkMessage}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                            {isLoadingRequests || isLoadingArtworkRequests ? (
                                <div className="rounded-2xl bg-purple-50/80 px-4 py-5 text-sm text-purple-700 ring-1 ring-purple-200/70">
                                    Aanvragen laden...
                                </div>
                            ) : pendingCount === 0 ? (
                                <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                    Zodra nieuwe registraties of kunstwerken binnenkomen, verschijnen ze hier automatisch.
                                </div>
                            ) : (
                                <>
                                    {pendingRequests.map((request) => {
                                        const requestKey = request.email ?? String(request.id);
                                        const isProcessing = processingId === request.email;

                                        return (
                                            <div
                                                key={`user-${requestKey}`}
                                                className="rounded-2xl border border-purple-200/60 bg-purple-50/45 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-900">
                                                            {request.username || request.email || "Nieuwe gebruiker"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-zinc-600">{request.email || "Geen e-mail"}</p>
                                                    </div>
                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-200">
                                                        Account · {formatRoleLabel(request.type)}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
                                                    <span>Aangemaakt {formatRequestDate(request.created_at)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab("access")}
                                                        className="font-semibold text-purple-700 transition hover:text-purple-900"
                                                    >
                                                        Bekijk
                                                    </button>
                                                </div>

                                                <div className="mt-4 flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => request.email && void handleRequestDecision(request.email, "denied")}
                                                        disabled={isProcessing || !request.email}
                                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        aria-label={`Weiger ${request.username || request.email || "aanvraag"}`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="M18 6 6 18" />
                                                            <path d="m6 6 12 12" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => request.email && void handleRequestDecision(request.email, "approved")}
                                                        disabled={isProcessing || !request.email}
                                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                        aria-label={`Keur ${request.username || request.email || "aanvraag"} goed`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="m5 12 5 5L20 7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {pendingArtworkRequests.map((artwork) => {
                                        const isProcessing = processingArtworkId === artwork.id;

                                        return (
                                            <div
                                                key={`artwork-${artwork.id}`}
                                                className="rounded-2xl border border-fuchsia-200/70 bg-fuchsia-50/45 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-zinc-900">{artwork.title}</p>
                                                        <p className="mt-1 text-xs text-zinc-600">
                                                            Door {artwork.artist_username || artwork.artist_email || "Onbekende artiest"}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200">
                                                        Kunstwerk
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
                                                    <span>Ingediend {formatRequestDate(artwork.created_at)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTab("kunst");
                                                            setSelectedArtwork(artwork);
                                                        }}
                                                        className="font-semibold text-fuchsia-700 transition hover:text-fuchsia-900"
                                                    >
                                                        Bekijk
                                                    </button>
                                                </div>

                                                <div className="mt-4 flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openDenyArtworkModal(artwork.id, artwork.title)}
                                                        disabled={isProcessing}
                                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        aria-label={`Weiger ${artwork.title}`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="M18 6 6 18" />
                                                            <path d="m6 6 12 12" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleArtworkDecision(artwork.id, "approved")}
                                                        disabled={isProcessing}
                                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                        aria-label={`Keur ${artwork.title} goed`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="m5 12 5 5L20 7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedArtwork && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedArtwork(null);
                    }}
                >
                    <div className="w-full max-w-2xl rounded-3xl border border-purple-200/60 bg-white p-6 shadow-2xl shadow-purple-500/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-zinc-900">{selectedArtwork.title}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Door {selectedArtwork.artist_username || selectedArtwork.artist_email || "Onbekende artiest"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedArtwork(null)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
                                aria-label="Sluiten"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        {selectedArtwork.imageUrl ? (
                            <img
                                src={selectedArtwork.imageUrl}
                                alt={selectedArtwork.title}
                                className="mt-4 max-h-[24rem] w-full rounded-xl object-cover ring-1 ring-purple-200/60"
                            />
                        ) : (
                            <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
                                Geen afbeelding beschikbaar.
                            </div>
                        )}

                        <div className="mt-4 grid gap-2">
                            <div className="rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 ring-1 ring-zinc-200">
                                {selectedArtwork.description || "Geen beschrijving opgegeven."}
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600 ring-1 ring-zinc-200">
                                <span>Ingediend</span>
                                <span className="font-semibold text-zinc-800">{formatRequestDate(selectedArtwork.created_at)}</span>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => openDenyArtworkModal(selectedArtwork.id, selectedArtwork.title)}
                                disabled={processingArtworkId === selectedArtwork.id}
                                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Weiger
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleArtworkDecision(selectedArtwork.id, "approved")}
                                disabled={processingArtworkId === selectedArtwork.id}
                                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Accepteer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {denyArtworkTarget && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) closeDenyArtworkModal();
                    }}
                >
                    <div className="w-full max-w-lg rounded-3xl border border-rose-200/70 bg-white p-6 shadow-2xl shadow-rose-500/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-base font-semibold text-zinc-900">Kunstwerk afwijzen</p>
                                <p className="mt-1 text-xs text-zinc-500">{denyArtworkTarget.title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDenyArtworkModal}
                                disabled={processingArtworkId === denyArtworkTarget.id}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 disabled:opacity-60"
                                aria-label="Sluiten"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        <label className="mt-4 block">
                            <span className="text-xs font-semibold text-zinc-700">Reden voor afwijzing</span>
                            <textarea
                                value={denyArtworkReason}
                                onChange={(event) => setDenyArtworkReason(event.target.value)}
                                rows={4}
                                placeholder="Geef duidelijk aan waarom dit kunstwerk niet is goedgekeurd."
                                className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 text-sm text-zinc-800 outline-none ring-rose-300 focus:ring"
                            />
                        </label>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeDenyArtworkModal}
                                disabled={processingArtworkId === denyArtworkTarget.id}
                                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60"
                            >
                                Annuleren
                            </button>
                            <button
                                type="button"
                                onClick={() => void submitDenyArtwork()}
                                disabled={processingArtworkId === denyArtworkTarget.id || !denyArtworkReason.trim()}
                                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processingArtworkId === denyArtworkTarget.id ? "Verwerken..." : "Afwijzen en versturen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingArtwork && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isSavingArtwork) setEditingArtwork(null);
                    }}
                >
                    <div className="w-full max-w-2xl rounded-3xl border border-purple-200/60 bg-white p-6 shadow-2xl shadow-purple-500/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-lg font-semibold text-zinc-900">Kunstwerk bewerken</p>
                                <p className="mt-1 text-xs text-zinc-500">Door {editingArtwork.artistName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (!isSavingArtwork) setEditingArtwork(null); }}
                                disabled={isSavingArtwork}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 disabled:opacity-60"
                                aria-label="Sluiten"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Photo section */}
                        <div className="mt-4">
                            <span className="text-xs font-semibold text-zinc-700">Foto</span>
                            <div className="relative mt-1 overflow-hidden rounded-xl ring-1 ring-purple-200/60">
                                {editImagePreview ? (
                                    <img
                                        src={editImagePreview}
                                        alt="Nieuwe foto voorvertoning"
                                        className="max-h-48 w-full object-cover"
                                    />
                                ) : editingArtwork.imageUrl ? (
                                    <img
                                        src={editingArtwork.imageUrl}
                                        alt={editingArtwork.title}
                                        className="max-h-48 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-24 items-center justify-center bg-zinc-50 text-sm text-zinc-400">
                                        Geen foto
                                    </div>
                                )}
                                <label
                                    htmlFor="edit-artwork-image"
                                    className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow ring-1 ring-purple-200 transition hover:bg-white"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    {editImagePreview ? "Andere foto" : "Foto wijzigen"}
                                </label>
                                <input
                                    id="edit-artwork-image"
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const chosen = e.target.files?.[0] ?? null;
                                        setEditImageFile(chosen);
                                        if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                        setEditImagePreview(chosen ? URL.createObjectURL(chosen) : null);
                                    }}
                                />
                            </div>
                            {editImagePreview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        URL.revokeObjectURL(editImagePreview);
                                        setEditImageFile(null);
                                        setEditImagePreview(null);
                                    }}
                                    className="mt-1.5 text-xs text-zinc-500 underline hover:text-zinc-700"
                                >
                                    Huidige foto behouden
                                </button>
                            )}
                        </div>

                        {allArtworksError && (
                            <div className="mt-4 rounded-md bg-rose-50 px-3 py-2.5 text-sm text-rose-600 ring-1 ring-rose-200">
                                {allArtworksError}
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <label className="block">
                                <span className="text-xs font-semibold text-zinc-700">Titel</span>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 focus:ring"
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold text-zinc-700">Beschrijving</span>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={4}
                                    className="mt-1 w-full rounded-xl border border-purple-200 px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 focus:ring"
                                />
                            </label>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-700">Locatie</span>
                                {!editingArtwork.isReserved && (
                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 ring-1 ring-zinc-200">
                                        Niet gereserveerd – locatie n.v.t.
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 grid gap-2 sm:grid-cols-2">
                                <input
                                    type="text"
                                    value={editLocationName}
                                    onChange={(e) => setEditLocationName(e.target.value)}
                                    placeholder="Locatienaam (bijv. Galerie Noord)"
                                    disabled={!editingArtwork.isReserved}
                                    className="w-full rounded-xl border border-purple-200 px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 placeholder:text-zinc-400 focus:ring disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                                />
                                <input
                                    type="text"
                                    value={editLocationAddress}
                                    onChange={(e) => setEditLocationAddress(e.target.value)}
                                    placeholder="Adres (bijv. Kerkstraat 1, Amsterdam)"
                                    disabled={!editingArtwork.isReserved}
                                    className="w-full rounded-xl border border-purple-200 px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 placeholder:text-zinc-400 focus:ring disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingArtwork(null)}
                                disabled={isSavingArtwork}
                                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60"
                            >
                                Annuleren
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSaveArtwork()}
                                disabled={isSavingArtwork || !editTitle.trim()}
                                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSavingArtwork ? "Opslaan..." : "Opslaan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deletingArtwork && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isDeletingArtwork) setDeletingArtwork(null);
                    }}
                >
                    <div className="w-full max-w-md rounded-3xl border border-rose-200/70 bg-white p-6 shadow-2xl shadow-rose-500/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-base font-semibold text-zinc-900">Kunstwerk verwijderen</p>
                                <p className="mt-1 text-xs text-zinc-500">{deletingArtwork.title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (!isDeletingArtwork) setDeletingArtwork(null); }}
                                disabled={isDeletingArtwork}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 disabled:opacity-60"
                                aria-label="Sluiten"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="mt-4 text-sm text-zinc-700">
                            Weet je zeker dat je <span className="font-semibold">{deletingArtwork.title}</span> wilt
                            verwijderen? Dit kan niet ongedaan worden gemaakt.
                        </p>

                        {allArtworksError && (
                            <div className="mt-3 rounded-md bg-rose-50 px-3 py-2.5 text-sm text-rose-600 ring-1 ring-rose-200">
                                {allArtworksError}
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingArtwork(null)}
                                disabled={isDeletingArtwork}
                                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60"
                            >
                                Annuleren
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDeleteArtwork()}
                                disabled={isDeletingArtwork}
                                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isDeletingArtwork ? "Verwijderen..." : "Verwijderen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedUser(null);
                    }}
                >
                    <div className="w-full max-w-md rounded-3xl border border-purple-200/60 bg-white p-6 shadow-2xl shadow-purple-500/20">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                                        selectedUser.blocked_status
                                            ? "bg-rose-100 text-rose-700"
                                            : "bg-purple-100 text-purple-700"
                                    }`}
                                >
                                    {(selectedUser.username ?? selectedUser.email ?? "?")[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-zinc-900">
                                        {selectedUser.username ?? "Onbekende gebruiker"}
                                    </p>
                                    <p className="text-xs text-zinc-500">{selectedUser.email ?? "Geen e-mail"}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200"
                                aria-label="Sluiten"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-5 space-y-2">
                            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5">
                                <span className="text-xs text-zinc-500">Rol</span>
                                <span className="text-xs font-semibold text-zinc-800">{formatRoleLabel(selectedUser.type)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5">
                                <span className="text-xs text-zinc-500">Status</span>
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                                        selectedUser.blocked_status
                                            ? "bg-rose-100 text-rose-700 ring-rose-200"
                                            : selectedUser.status === "approved"
                                                ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                : selectedUser.status === "pending"
                                                    ? "bg-amber-100 text-amber-700 ring-amber-200"
                                                    : "bg-zinc-100 text-zinc-600 ring-zinc-200"
                                    }`}
                                >
                                    {selectedUser.blocked_status
                                        ? "Geblokkeerd"
                                        : selectedUser.status === "approved"
                                            ? "Goedgekeurd"
                                            : selectedUser.status === "pending"
                                                ? "Wachtend"
                                                : "Geweigerd"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5">
                                <span className="text-xs text-zinc-500">Aangemeld op</span>
                                <span className="text-xs font-semibold text-zinc-800">
                                    {formatRequestDate(selectedUser.created_at)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
                            >
                                Sluiten
                            </button>
                            {!selectedUser.blocked_status ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handlePreparePasswordReset(selectedUser.email)}
                                        disabled={!selectedUser.email}
                                        className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Wachtwoord wijzigen
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedUser.email) void handleBlockUser(selectedUser.email);
                                        }}
                                        disabled={processingBlockEmail === selectedUser.email || !selectedUser.email}
                                        className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {processingBlockEmail === selectedUser.email ? "Bezig..." : "Blokkeer gebruiker"}
                                    </button>
                                </>
                            ) : (
                                <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                                    Geblokkeerd
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto w-full max-w-6xl">
                <div className="mb-6 rounded-xl border border-purple-200/35 bg-white/75 backdrop-blur">
                    <div className="flex min-h-16 items-center justify-between gap-4 px-6 py-4">
                        <div>
                            <span className="text-sm font-semibold text-zinc-900">Admin page Desktop</span>
                            <p className="mt-1 text-xs text-zinc-600">
                                Beheer toegangsverzoeken en moderatie vanaf één overzicht.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href="/admin/cms"
                                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700"
                            >
                                Open CMS editor
                            </a>
                            <div className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700">
                                {pendingCount} wachtend{pendingCount === 1 ? " verzoek" : "e verzoeken"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    <aside className="w-64 rounded-xl border border-purple-200/35 bg-white/75 p-4 backdrop-blur">
                        <div className="mb-3 text-xs font-semibold text-purple-700/80">Tabs</div>
                        <div role="tablist" className="flex flex-col gap-2">
                            {adminTabs.map((tab) => {
                                const isActive = tab.key === activeTab;
                                const badgeCount =
                                    tab.key === "access"
                                        ? accountPendingCount
                                        : tab.key === "kunst"
                                            ? artworkPendingCount
                                            : tab.key === "users"
                                                ? blockedCount
                                                : null;

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={
                                            isActive
                                                ? "flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3 py-2 text-left text-sm font-semibold text-white shadow-md"
                                                : "flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 text-left text-sm font-semibold text-purple-900/80 ring-1 ring-purple-200/70 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-300"
                                        }
                                    >
                                        <span>{tab.label}</span>
                                        {badgeCount !== null && badgeCount > 0 && (
                                            <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-purple-700">
                                                {badgeCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <main className="flex-1 rounded-xl border border-purple-200/35 bg-white/75 p-6 backdrop-blur">
                        <div className="space-y-4">
                            <div className="rounded-lg border border-purple-200/60 bg-white/60 p-4">
                                <div className="text-sm font-semibold text-purple-700/90">
                                    {adminTabs.find((tab) => tab.key === activeTab)?.label}
                                </div>
                                <div className="mt-1 text-xs text-zinc-600/80">
                                    {activeTab === "access"
                                        ? "Nieuwe gebruikers die nog goedkeuring nodig hebben."
                                        : activeTab === "chat"
                                            ? "Open de centrale chat hub om berichten met alle gebruikers te bekijken en beantwoorden."
                                        : activeTab === "kunst"
                                            ? "Nieuwe kunstwerken die nog goedkeuring nodig hebben."
                                        : activeTab === "users"
                                            ? "Overzicht van geblokkeerde gebruikers."
                                            : activeTab === "allusers"
                                                ? "Overzicht van alle geregistreerde gebruikers."
                                            : activeTab === "artworks"
                                                ? "Beheer alle geplaatste kunstwerken — bewerk titels, beschrijvingen of verwijder."
                                            : activeTab === "locations"
                                                ? "Overzicht van alle locaties waar gereserveerde kunstwerken zich bevinden."
                                        : "Voorbeelden van mogelijke situaties:"}
                                </div>

                                {activeTab === "chat" ? (
                                    <div className="mt-4 rounded-md bg-purple-50/70 px-4 py-4 ring-1 ring-purple-200/60">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-900">Centrale chat voor admins</p>
                                                <p className="mt-1 text-xs text-zinc-600">
                                                    In de chat hub kun je direct met ondernemers, artiesten en begeleiders praten. Berichten blijven bewaard en tonen verzend- en leesmomenten.
                                                </p>
                                            </div>
                                            <a
                                                href="/chat"
                                                className="inline-flex items-center justify-center rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                                            >
                                                Open chat hub
                                            </a>
                                        </div>
                                    </div>
                                ) : activeTab === "access" ? (
                                    <div className="mt-4 space-y-3">
                                        {isLoadingRequests ? (
                                            <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                Aanvragen laden...
                                            </div>
                                        ) : accountPendingCount === 0 ? (
                                            <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                Er staan momenteel geen toegangsverzoeken open.
                                            </div>
                                        ) : (
                                            pendingRequests.map((request) => {
                                                const requestKey = request.email ?? String(request.id);
                                                const isProcessing = processingId === request.email;

                                                return (
                                                    <div
                                                        key={requestKey}
                                                        className="rounded-md bg-purple-50/70 px-4 py-3 ring-1 ring-purple-200/60"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-zinc-900">
                                                                    {request.username || request.email || "Nieuwe gebruiker"}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-600">
                                                                    {request.email || "Geen e-mail"} · {formatRoleLabel(request.type)}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-500">
                                                                    Aangemeld op {formatRequestDate(request.created_at)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => request.email && void handleRequestDecision(request.email, "denied")}
                                                                    disabled={isProcessing || !request.email}
                                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    Weiger
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => request.email && void handleRequestDecision(request.email, "approved")}
                                                                    disabled={isProcessing || !request.email}
                                                                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    Accepteer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : activeTab === "kunst" ? (
                                    <div className="mt-4 space-y-3">
                                        {(artworkError || artworkMessage) && (
                                            <div
                                                className={`rounded-md px-3 py-3 text-sm ring-1 ${
                                                    artworkError
                                                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                }`}
                                            >
                                                {artworkError ?? artworkMessage}
                                            </div>
                                        )}

                                        {isLoadingArtworkRequests ? (
                                            <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                Kunstverzoeken laden...
                                            </div>
                                        ) : artworkPendingCount === 0 ? (
                                            <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                Er staan momenteel geen kunstverzoeken open.
                                            </div>
                                        ) : (
                                            pendingArtworkRequests.map((artwork) => {
                                                const isProcessingArtwork = processingArtworkId === artwork.id;

                                                return (
                                                    <div
                                                        key={artwork.id}
                                                        className="rounded-md bg-fuchsia-50/60 px-4 py-3 ring-1 ring-fuchsia-200/70"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-zinc-900">{artwork.title}</p>
                                                                <p className="mt-1 text-xs text-zinc-600">
                                                                    {artwork.artist_username || artwork.artist_email || "Onbekende artiest"}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-500">
                                                                    Ingediend op {formatRequestDate(artwork.created_at)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedArtwork(artwork)}
                                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200 transition hover:bg-fuchsia-50"
                                                                >
                                                                    Bekijk details
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDenyArtworkModal(artwork.id, artwork.title)}
                                                                    disabled={isProcessingArtwork}
                                                                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    Weiger
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleArtworkDecision(artwork.id, "approved")}
                                                                    disabled={isProcessingArtwork}
                                                                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    Accepteer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : activeTab === "users" ? (
                                    <div className="mt-4 space-y-3">
                                        {(blockedError || blockedMessage) && (
                                            <div
                                                className={`rounded-md px-3 py-3 text-sm ring-1 ${
                                                    blockedError
                                                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                }`}
                                            >
                                                {blockedError ?? blockedMessage}
                                            </div>
                                        )}

                                        {isLoadingBlockedUsers ? (
                                            <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                Geblokkeerde gebruikers laden...
                                            </div>
                                        ) : blockedCount === 0 ? (
                                            <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                Er zijn momenteel geen geblokkeerde gebruikers.
                                            </div>
                                        ) : (
                                            blockedUsers.map((user) => {
                                                const userKey = user.email ?? String(user.id);
                                                const isProcessingUnblock = processingBlockedEmail === user.email;

                                                return (
                                                    <div
                                                        key={userKey}
                                                        className="rounded-md bg-rose-50/60 px-4 py-3 ring-1 ring-rose-200/70"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-zinc-900">
                                                                    {user.username || user.email || "Geblokkeerde gebruiker"}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-600">
                                                                    {user.email || "Geen e-mail"} · {formatRoleLabel(user.type)}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-500">
                                                                    Geblokkeerd (status: {user.status})
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => user.email && void handleUnblockUser(user.email)}
                                                                disabled={!user.email || isProcessingUnblock}
                                                                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                Deblokkeer
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : activeTab === "allusers" ? (
                                    <div className="mt-4 space-y-3">
                                        {(allUsersError || allUsersMessage) && (
                                            <div
                                                className={`rounded-md px-3 py-3 text-sm ring-1 ${
                                                    allUsersError
                                                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                }`}
                                            >
                                                {allUsersError ?? allUsersMessage}
                                            </div>
                                        )}

                                        {isLoadingAllUsers ? (
                                            <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                Gebruikers laden...
                                            </div>
                                        ) : allUsers.length === 0 ? (
                                            <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                Er zijn nog geen geregistreerde gebruikers.
                                            </div>
                                        ) : (
                                            allUsers.map((user) => {
                                                const userKey = user.email ?? String(user.id);
                                                const isBlocked = user.blocked_status;
                                                const isProcessingBlock = processingBlockEmail === user.email;

                                                return (
                                                    <div
                                                        key={userKey}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => setSelectedUser(user)}
                                                        onKeyDown={(e) => e.key === "Enter" && setSelectedUser(user)}
                                                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-4 py-3 ring-1 transition ${
                                                            isBlocked
                                                                ? "bg-rose-50/60 ring-rose-200/70 hover:bg-rose-50"
                                                                : "bg-purple-50/70 ring-purple-200/60 hover:bg-purple-50"
                                                        }`}
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div
                                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                                                    isBlocked
                                                                        ? "bg-rose-100 text-rose-700"
                                                                        : "bg-purple-100 text-purple-700"
                                                                }`}
                                                            >
                                                                {(user.username ?? user.email ?? "?")[0].toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-zinc-900">
                                                                    {user.username ?? "Geen gebruikersnaam"}
                                                                </p>
                                                                <p className="truncate text-xs text-zinc-500">{user.email ?? "Geen e-mail"}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <span
                                                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                                                                    isBlocked
                                                                        ? "bg-rose-100 text-rose-700 ring-rose-200"
                                                                        : user.status === "approved"
                                                                            ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                                            : user.status === "pending"
                                                                                ? "bg-amber-100 text-amber-700 ring-amber-200"
                                                                                : "bg-zinc-100 text-zinc-600 ring-zinc-200"
                                                                }`}
                                                            >
                                                                {isBlocked
                                                                    ? "Geblokkeerd"
                                                                    : user.status === "approved"
                                                                        ? "Goedgekeurd"
                                                                        : user.status === "pending"
                                                                            ? "Wachtend"
                                                                            : "Geweigerd"}
                                                            </span>

                                                            {!isBlocked && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (user.email) void handleBlockUser(user.email);
                                                                    }}
                                                                    disabled={isProcessingBlock || !user.email}
                                                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-500 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    aria-label={`Blokkeer ${user.username ?? user.email ?? "gebruiker"}`}
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2.5"
                                                                        className="h-3.5 w-3.5"
                                                                        aria-hidden="true"
                                                                    >
                                                                        <path d="M18 6 6 18" />
                                                                        <path d="m6 6 12 12" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : activeTab === "resetpw" ? (
                                    <div className="mt-4 space-y-4">
                                        {(passwordResetError || passwordResetMessage) && (
                                            <div
                                                className={`rounded-md px-3 py-3 text-sm ring-1 ${
                                                    passwordResetError
                                                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                }`}
                                            >
                                                {passwordResetError ?? passwordResetMessage}
                                            </div>
                                        )}

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <label className="block">
                                                <span className="text-xs font-semibold text-zinc-700">Gebruiker</span>
                                                <select
                                                    value={passwordResetEmail}
                                                    onChange={(event) => setPasswordResetEmail(event.target.value)}
                                                    className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 focus:ring"
                                                >
                                                    <option value="">Selecteer een gebruiker</option>
                                                    {allUsers
                                                        .filter((user) => Boolean(user.email))
                                                        .map((user) => (
                                                            <option key={user.email ?? String(user.id)} value={user.email ?? ""}>
                                                                {user.username || user.email} {user.email ? `(${user.email})` : ""}
                                                            </option>
                                                        ))}
                                                </select>
                                            </label>

                                            <div className="rounded-xl border border-purple-200/60 bg-purple-50/60 px-4 py-3 text-sm text-zinc-700">
                                                Je ziet nooit het bestaande wachtwoord. Deze actie overschrijft alleen het huidige wachtwoord met een nieuw wachtwoord.
                                            </div>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <label className="block">
                                                <span className="text-xs font-semibold text-zinc-700">Nieuw wachtwoord</span>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(event) => setNewPassword(event.target.value)}
                                                    placeholder="Minimaal 8 tekens"
                                                    className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 focus:ring"
                                                />
                                            </label>

                                            <label className="block">
                                                <span className="text-xs font-semibold text-zinc-700">Bevestig wachtwoord</span>
                                                <input
                                                    type="password"
                                                    value={confirmNewPassword}
                                                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                                                    placeholder="Herhaal nieuw wachtwoord"
                                                    className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 focus:ring"
                                                />
                                            </label>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => void handlePasswordReset()}
                                                disabled={isResettingPassword || isLoadingAllUsers}
                                                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isResettingPassword ? "Bezig..." : "Wachtwoord aanpassen"}
                                            </button>
                                        </div>

                                        <div className="rounded-xl border border-purple-200/60 bg-white/70 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-zinc-900">Recente wijzigingen</p>
                                                    <p className="mt-1 text-xs text-zinc-600">
                                                        Deze log toont dat een wachtwoordwijziging heeft plaatsgevonden, nooit het wachtwoord zelf.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-2">
                                                {isLoadingPasswordLogs ? (
                                                    <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                        Auditlog laden...
                                                    </div>
                                                ) : passwordChangeLogs.length === 0 ? (
                                                    <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                        Er zijn nog geen wachtwoordwijzigingen gelogd.
                                                    </div>
                                                ) : (
                                                    passwordChangeLogs.map((log) => (
                                                        <div
                                                            key={log.id}
                                                            className="flex items-center justify-between gap-3 rounded-md bg-purple-50/70 px-3 py-3 ring-1 ring-purple-200/60"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-semibold text-zinc-900">
                                                                    {log.targetUserEmail ?? "Onbekende gebruiker"}
                                                                </p>
                                                                <p className="mt-1 text-xs text-zinc-600">
                                                                    Gewijzigd door {log.changedByEmail ?? "Admin"}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-semibold text-zinc-600">
                                                                {formatRequestDate(log.changedAt)}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : activeTab === "artworks" ? (
                                    <div className="mt-4 space-y-3">
                                        {(allArtworksError || allArtworksMessage) && (
                                            <div
                                                className={`rounded-md px-3 py-3 text-sm ring-1 ${
                                                    allArtworksError
                                                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                }`}
                                            >
                                                {allArtworksError ?? allArtworksMessage}
                                            </div>
                                        )}

                                        <input
                                            type="text"
                                            value={artworkSearchQuery}
                                            onChange={(e) => setArtworkSearchQuery(e.target.value)}
                                            placeholder="Zoek op titel of artiest..."
                                            className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-purple-300 focus:ring"
                                        />

                                        {isLoadingAllArtworks ? (
                                            <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                Kunstwerken laden...
                                            </div>
                                        ) : filteredArtworks.length === 0 ? (
                                            <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                {artworkSearchQuery
                                                    ? "Geen kunstwerken gevonden voor deze zoekopdracht."
                                                    : "Er zijn nog geen kunstwerken."}
                                            </div>
                                        ) : (
                                            filteredArtworks.map((artwork) => (
                                                <div
                                                    key={artwork.id}
                                                    className="flex items-center gap-4 rounded-md bg-purple-50/70 px-4 py-3 ring-1 ring-purple-200/60"
                                                >
                                                    {artwork.imageUrl ? (
                                                        <img
                                                            src={artwork.imageUrl}
                                                            alt={artwork.title}
                                                            className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-purple-200/60"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="1.5"
                                                                className="h-6 w-6 text-zinc-400"
                                                                aria-hidden="true"
                                                            >
                                                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                                                <circle cx="9" cy="9" r="2" />
                                                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-zinc-900">{artwork.title}</p>
                                                        <p className="truncate text-xs text-zinc-500">{artwork.artistName}</p>
                                                        {artwork.locationName && (
                                                            <p className="mt-0.5 truncate text-xs text-indigo-600">
                                                                📍 {artwork.locationName}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                                                                artwork.status === "approved"
                                                                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                                    : artwork.status === "pending"
                                                                        ? "bg-amber-100 text-amber-700 ring-amber-200"
                                                                        : "bg-rose-100 text-rose-700 ring-rose-200"
                                                            }`}
                                                        >
                                                            {artwork.status === "approved"
                                                                ? "Goedgekeurd"
                                                                : artwork.status === "pending"
                                                                    ? "Wachtend"
                                                                    : "Afgewezen"}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditArtwork(artwork)}
                                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-200 transition hover:bg-purple-50"
                                                        >
                                                            Bewerken
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAllArtworksError(null);
                                                                setAllArtworksMessage(null);
                                                                setDeletingArtwork(artwork);
                                                            }}
                                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50"
                                                        >
                                                            Verwijderen
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : activeTab === "locations" ? (
                                    <div className="mt-4 space-y-4">
                                        {(allArtworksError || allArtworksMessage) && (
                                            <div
                                                className={`rounded-md px-3 py-3 text-sm ring-1 ${
                                                    allArtworksError
                                                        ? "bg-rose-50 text-rose-600 ring-rose-200"
                                                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                }`}
                                            >
                                                {allArtworksError ?? allArtworksMessage}
                                            </div>
                                        )}

                                        {isLoadingAllArtworks ? (
                                            <div className="rounded-md bg-purple-50/70 px-3 py-3 text-sm text-purple-700 ring-1 ring-purple-200/60">
                                                Locaties laden...
                                            </div>
                                        ) : locationGroups.length === 0 ? (
                                            <div className="rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-600 ring-1 ring-zinc-200">
                                                Er zijn nog geen gereserveerde kunstwerken met een locatie.
                                            </div>
                                        ) : (
                                            locationGroups.map((group) => (
                                                <div
                                                    key={group.key}
                                                    className="rounded-xl border border-indigo-200/60 bg-indigo-50/40 p-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                className="h-4 w-4"
                                                                aria-hidden="true"
                                                            >
                                                                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                                                                <circle cx="12" cy="10" r="3" />
                                                            </svg>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-zinc-900">
                                                                {group.locationName ?? "Geen locatienaam"}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                {group.artworks[0]?.locationAddress ?? "Geen adres"}
                                                            </p>
                                                            {group.locationAddress && (
                                                                <a
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group.artworks[0]?.locationAddress ?? "")}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="mt-0.5 inline-text text-[11px] text-indigo-600 underline hover:text-indigo-800"
                                                                >
                                                                    Open in Google Maps
                                                                </a>
                                                            )}
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                                                            {group.artworks.length}{" "}
                                                            {group.artworks.length === 1 ? "kunstwerk" : "kunstwerken"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 space-y-2">
                                                        {group.artworks.map((artwork) => (
                                                            <div
                                                                key={artwork.id}
                                                                className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5 ring-1 ring-indigo-200/50"
                                                            >
                                                                {artwork.imageUrl ? (
                                                                    <img
                                                                        src={artwork.imageUrl}
                                                                        alt={artwork.title}
                                                                        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-indigo-200/60"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="1.5"
                                                                            className="h-5 w-5 text-zinc-400"
                                                                            aria-hidden="true"
                                                                        >
                                                                            <rect width="18" height="18" x="3" y="3" rx="2" />
                                                                            <circle cx="9" cy="9" r="2" />
                                                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-semibold text-zinc-900">
                                                                        {artwork.title}
                                                                    </p>
                                                                    <p className="truncate text-xs text-zinc-500">
                                                                        {artwork.artistName}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditArtwork(artwork)}
                                                                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50"
                                                                >
                                                                    Bewerken
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <ul className="mt-3 space-y-2 text-sm text-zinc-700/90">
                                        {adminTabExamples[activeTab].map((example) => (
                                            <li
                                                key={example}
                                                className="rounded-md bg-purple-50/70 px-3 py-2 ring-1 ring-purple-200/60"
                                            >
                                                {example}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                            </div>

                            <div className="h-12 rounded-lg bg-gradient-to-r from-purple-200/55 to-fuchsia-200/40 ring-1 ring-purple-300/25" />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
