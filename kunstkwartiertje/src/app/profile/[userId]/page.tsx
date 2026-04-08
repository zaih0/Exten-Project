"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import FollowButton from "src/app/components/profile/FollowButton";
import useFollowSummary from "src/app/components/profile/useFollowSummary";

type PublicProfile = {
    userId: number;
    username: string;
    aboutMe: string;
    profilePic: string;
    role: string | null;
    email: string;
    status: string | null;
    blocked: boolean;
};

const roleLabel = (role: string | null) => {
    if (role === "admin") return "Admin";
    if (role === "ondernemer") return "Ondernemer";
    if (role === "kunstenaar") return "Artiest";
    if (role === "begeleider") return "Begeleider";
    return role ?? "Gebruiker";
};

export default function PublicProfilePage() {
    const params = useParams<{ userId: string }>();
    const userId = Number(params?.userId);
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { followerCount, followingCount } = useFollowSummary({
        targetUserId: Number.isFinite(userId) ? userId : undefined,
    });

    useEffect(() => {
        if (!Number.isFinite(userId)) {
            setError("Ongeldige profielpagina.");
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const loadProfile = async () => {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/profile/public?userId=${userId}`, {
                method: "GET",
                cache: "no-store",
            });

            const text = await response.text();
            const result = (() => {
                try {
                    return JSON.parse(text) as { error?: string; profile?: PublicProfile };
                } catch {
                    return null;
                }
            })();

            if (!isMounted) return;

            if (!response.ok || !result?.profile) {
                setError(result?.error ?? "Kon profiel niet laden.");
                setIsLoading(false);
                return;
            }

            setProfile(result.profile);
            setIsLoading(false);
        };

        void loadProfile();

        return () => {
            isMounted = false;
        };
    }, [userId]);

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-4xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Publiek profiel</p>
                        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Community profiel</h1>
                    </div>
                    <Link
                        href="/art_gallery"
                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                        Terug naar gallery
                    </Link>
                </div>

                {isLoading ? (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                        Profiel laden...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                ) : profile ? (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={profile.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}`}
                                        alt={profile.username}
                                        className="h-20 w-20 rounded-full object-cover ring-1 ring-zinc-200"
                                    />
                                    <div>
                                        <h2 className="text-2xl font-bold text-zinc-900">{profile.username}</h2>
                                        <p className="mt-1 text-sm text-zinc-600">{roleLabel(profile.role)}</p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-600">
                                            <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                                                {followerCount} volgers
                                            </span>
                                            <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                                                {followingCount} gevolgd
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <FollowButton targetUserId={profile.userId} />
                                    <Link
                                        href="/chat"
                                        className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                                    >
                                        Open chat hub
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                            <h3 className="text-lg font-semibold text-zinc-900">Over deze gebruiker</h3>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                                {profile.aboutMe || "Deze gebruiker heeft nog geen bio ingevuld."}
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
