"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { createClient } from "src/utils/supabase/client";

type ArtistProfile = {
    id: number;
    email: string;
    username: string;
    aboutMe: string;
    profilePic: string;
    status: string | null;
    blocked: boolean;
};

type PendingProfileChanges = {
    proposedUsername: string | null;
    proposedAboutMe: string | null;
    proposedProfilePic: string | null;
    createdAt: string | null;
};

type ArtistFeedback = {
    id: number;
    feedbackText: string;
    createdAt: string | null;
    authorName: string;
};

type ArtistChatMessage = {
    id: number;
    receiverId: number;
    receiverName: string;
    message: string;
    imageUrl: string | null;
    sentDate: string | null;
    readDate: string | null;
};

export default function AccompanistArtistProfilePage() {
    const params = useParams<{ artistId: string }>();
    const [accompanistEmail, setAccompanistEmail] = useState<string | null>(null);
    const [artist, setArtist] = useState<ArtistProfile | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editAboutMe, setEditAboutMe] = useState("");
    const [editProfilePic, setEditProfilePic] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [pendingChanges, setPendingChanges] = useState<PendingProfileChanges | null>(null);
    const [feedbackItems, setFeedbackItems] = useState<ArtistFeedback[]>([]);
    const [feedbackDraft, setFeedbackDraft] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDecidingPending, setIsDecidingPending] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ArtistChatMessage[]>([]);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editMessageDraft, setEditMessageDraft] = useState("");
    const [isSavingMessage, setIsSavingMessage] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadArtist = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const email = user?.email?.trim().toLowerCase() ?? null;
            if (!email || !isMounted) {
                if (isMounted) {
                    setError("Je bent niet ingelogd.");
                    setIsLoading(false);
                }
                return;
            }

            setAccompanistEmail(email);

            const response = await fetch(
                `/api/accompanist/artists/${encodeURIComponent(params.artistId)}?accompanistEmail=${encodeURIComponent(email)}`,
                { method: "GET", cache: "no-store" },
            );

            const feedbackResponse = await fetch(
                `/api/accompanist/artists/${encodeURIComponent(params.artistId)}/feedback?accompanistEmail=${encodeURIComponent(email)}`,
                { method: "GET", cache: "no-store" },
            );

            const [responseText, feedbackText] = await Promise.all([response.text(), feedbackResponse.text()]);

            const result = (() => {
                try {
                    return JSON.parse(responseText) as {
                        error?: string;
                        artist?: ArtistProfile;
                        pendingProfileChanges?: PendingProfileChanges | null;
                    };
                } catch {
                    return null;
                }
            })();
            const feedbackResult = (() => {
                try {
                    return JSON.parse(feedbackText) as { error?: string; feedback?: ArtistFeedback[] };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok || !result?.artist) {
                setError(result?.error ?? "Kon artiestprofiel niet ophalen.");
                setIsLoading(false);
                return;
            }

            setArtist(result.artist);
            setPendingChanges(result.pendingProfileChanges ?? null);
            setFeedbackItems(feedbackResult?.feedback ?? []);
            setEditUsername(result.artist.username ?? "");
            setEditAboutMe(result.artist.aboutMe ?? "");
            setEditProfilePic(result.artist.profilePic ?? "");
            setIsLoading(false);
        };

        void loadArtist();

        return () => {
            isMounted = false;
        };
    }, [params.artistId]);

    const handleSave = async () => {
        if (!accompanistEmail || !artist) return;

        setIsSaving(true);
        setError(null);
        setMessage(null);

        const response = await fetch(`/api/accompanist/artists/${artist.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail,
                username: editUsername,
                aboutMe: editAboutMe,
                profilePic: editProfilePic,
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
            setError(result?.error ?? "Opslaan mislukt.");
            setIsSaving(false);
            return;
        }

        setArtist((current: ArtistProfile | null) =>
            current
                ? {
                      ...current,
                      username: editUsername,
                      aboutMe: editAboutMe,
                      profilePic: editProfilePic,
                  }
                : current,
        );
        setMessage("Artiestprofiel bijgewerkt.");
        setIsSaving(false);
    };

    const handlePendingDecision = async (decision: "approve" | "deny") => {
        if (!artist || !accompanistEmail) return;

        setIsDecidingPending(true);
        setError(null);
        setMessage(null);

        const response = await fetch(`/api/accompanist/artists/${artist.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail,
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
            setError(result?.error ?? "Beslissing opslaan mislukt.");
            setIsDecidingPending(false);
            return;
        }

        if (decision === "approve" && pendingChanges) {
            const nextUsername = pendingChanges.proposedUsername ?? editUsername;
            const nextAboutMe = pendingChanges.proposedAboutMe ?? editAboutMe;
            const nextProfilePic = pendingChanges.proposedProfilePic ?? editProfilePic;
            setEditUsername(nextUsername);
            setEditAboutMe(nextAboutMe);
            setEditProfilePic(nextProfilePic);
            setArtist((current: ArtistProfile | null) =>
                current
                    ? {
                          ...current,
                          username: nextUsername,
                          aboutMe: nextAboutMe,
                          profilePic: nextProfilePic,
                      }
                    : current,
            );
            setMessage("Wijzigingsverzoek goedgekeurd en toegepast.");
        } else {
            setMessage("Wijzigingsverzoek afgewezen.");
        }

        setPendingChanges(null);
        setIsDecidingPending(false);
    };

    const handleUploadPicture = async () => {
        if (!accompanistEmail || !artist || !uploadFile) return;

        setIsUploading(true);
        setError(null);
        setMessage(null);

        const formData = new FormData();
        formData.append("accompanistEmail", accompanistEmail);
        formData.append("file", uploadFile);

        const response = await fetch(`/api/accompanist/artists/${artist.id}`, {
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
            setError(result?.error ?? "Uploaden profielfoto mislukt.");
            setIsUploading(false);
            return;
        }

        setEditProfilePic(result.imageUrl);
        setArtist((current: ArtistProfile | null) =>
            current ? { ...current, profilePic: result.imageUrl ?? current.profilePic } : current,
        );
        setUploadFile(null);
        setMessage("Profielfoto bijgewerkt.");
        setIsUploading(false);
    };

    const handleSubmitFeedback = async () => {
        if (!artist || !accompanistEmail || !feedbackDraft.trim()) return;

        setIsSubmittingFeedback(true);
        setError(null);
        setMessage(null);

        const response = await fetch(`/api/accompanist/artists/${artist.id}/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accompanistEmail,
                feedbackText: feedbackDraft,
            }),
        });

        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; feedback?: ArtistFeedback };
            } catch {
                return null;
            }
        })();

        if (!response.ok || !result?.feedback) {
            setError(result?.error ?? "Feedback opslaan mislukt.");
            setIsSubmittingFeedback(false);
            return;
        }

        setFeedbackItems((current: ArtistFeedback[]) => [result.feedback as ArtistFeedback, ...current]);
        setFeedbackDraft("");
        setMessage("Feedback opgeslagen. Alleen jij en deze artiest kunnen dit zien.");
        setIsSubmittingFeedback(false);
    };

    return (
        <div
            className="min-h-screen px-4 py-8 md:px-8"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
            }}
        >
            <div className="mx-auto w-full max-w-4xl rounded-2xl border border-gray-100 bg-white/95 p-6 shadow-sm md:p-8">
                <div className="mb-6 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Artiestprofiel beheren</h1>
                    <Link
                        href="/profile/accompanist"
                        className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                    >
                        Terug
                    </Link>
                </div>

                {isLoading ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Profiel laden...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                ) : artist ? (
                    <div className="space-y-5">
                        {message && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                {message}
                            </div>
                        )}

                        {pendingChanges && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">Openstaand wijzigingsverzoek</p>
                                        <p className="mt-1 text-xs text-amber-700">
                                            De artiest heeft profielwijzigingen ingediend en wacht op jouw goedkeuring.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void handlePendingDecision("deny")}
                                            disabled={isDecidingPending}
                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
                                        >
                                            {isDecidingPending ? "Bezig..." : "Afwijzen"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handlePendingDecision("approve")}
                                            disabled={isDecidingPending}
                                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                        >
                                            {isDecidingPending ? "Bezig..." : "Goedkeuren"}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-2 md:grid-cols-3">
                                    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-amber-200">
                                        <p className="text-[11px] font-semibold text-zinc-500">Nieuwe gebruikersnaam</p>
                                        <p className="mt-1 text-sm text-zinc-800">{pendingChanges.proposedUsername ?? "-"}</p>
                                    </div>
                                    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-amber-200 md:col-span-2">
                                        <p className="text-[11px] font-semibold text-zinc-500">Nieuwe about me</p>
                                        <p className="mt-1 line-clamp-3 text-sm text-zinc-800">{pendingChanges.proposedAboutMe ?? "-"}</p>
                                    </div>
                                </div>

                                {pendingChanges.proposedProfilePic && (
                                    <div className="mt-3">
                                        <p className="text-[11px] font-semibold text-zinc-500">Nieuwe profielfoto</p>
                                        <img
                                            src={pendingChanges.proposedProfilePic}
                                            alt="Voorgestelde profielfoto"
                                            className="mt-1 h-20 w-20 rounded-full object-cover ring-1 ring-amber-200"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-4 md:flex-row md:items-start">
                            <img
                                src={
                                    editProfilePic ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(editUsername || artist.email)}&background=random`
                                }
                                alt={editUsername || artist.email}
                                className="h-28 w-28 rounded-full object-cover ring-1 ring-gray-200"
                            />

                            <div className="w-full space-y-2">
                                <p className="text-xs font-semibold text-gray-700">Profielfoto wijzigen</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                        setUploadFile(event.target.files?.[0] ?? null)
                                    }
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleUploadPicture()}
                                    disabled={!uploadFile || isUploading}
                                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {isUploading ? "Uploaden..." : "Upload profielfoto"}
                                </button>
                            </div>
                        </div>

                        <label className="block text-sm font-medium text-gray-700">
                            Gebruikersnaam
                            <input
                                type="text"
                                value={editUsername}
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                    setEditUsername(event.target.value)
                                }
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                            />
                        </label>

                        <label className="block text-sm font-medium text-gray-700">
                            E-mail (alleen lezen)
                            <input
                                type="text"
                                value={artist.email}
                                readOnly
                                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500"
                            />
                        </label>

                        <label className="block text-sm font-medium text-gray-700">
                            About me
                            <textarea
                                value={editAboutMe}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                    setEditAboutMe(event.target.value)
                                }
                                rows={5}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                            />
                        </label>

                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                                {isSaving ? "Opslaan..." : "Wijzigingen opslaan"}
                            </button>
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-bold text-zinc-900">Privé feedback voor deze artiest</h2>
                                <p className="text-sm text-zinc-600">
                                    Alleen jij en deze artiest kunnen deze feedback zien.
                                </p>
                            </div>

                            <textarea
                                value={feedbackDraft}
                                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFeedbackDraft(event.target.value)}
                                rows={4}
                                placeholder="Schrijf feedback, tips of aandachtspunten voor deze artiest"
                                className="mt-4 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-zinc-800"
                            />

                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => void handleSubmitFeedback()}
                                    disabled={isSubmittingFeedback || feedbackDraft.trim().length === 0}
                                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {isSubmittingFeedback ? "Versturen..." : "Feedback opslaan"}
                                </button>
                            </div>

                            <div className="mt-4 space-y-3">
                                {feedbackItems.length === 0 ? (
                                    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                                        Nog geen privé feedback verstuurd.
                                    </div>
                                ) : (
                                    feedbackItems.map((item) => (
                                        <div key={item.id} className="rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-semibold text-zinc-900">{item.authorName}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleString("nl-NL") : "Onbekende datum"}
                                                </p>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{item.feedbackText}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
