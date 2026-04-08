"use client";

import { useCallback, useEffect, useState } from "react";

type FollowSummaryArgs = {
    targetUserId?: number;
    targetEmail?: string;
};

type FollowSummaryState = {
    followerCount: number;
    followingCount: number;
    canFollow: boolean;
    isFollowing: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    toggleFollow: () => Promise<boolean>;
};

export default function useFollowSummary(args: FollowSummaryArgs): FollowSummaryState {
    const { targetUserId, targetEmail } = args;
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [canFollow, setCanFollow] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        if (!targetUserId && !targetEmail) {
            setFollowerCount(0);
            setFollowingCount(0);
            setCanFollow(false);
            setIsFollowing(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (targetUserId) params.set("targetUserId", String(targetUserId));
        if (targetEmail) params.set("targetEmail", targetEmail);

        const response = await fetch(`/api/follows?${params.toString()}`, {
            method: "GET",
            cache: "no-store",
        });
        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as {
                    error?: string;
                    followerCount?: number;
                    followingCount?: number;
                    canFollow?: boolean;
                    isFollowing?: boolean;
                };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setError(result?.error ?? "Kon volggegevens niet laden.");
            setIsLoading(false);
            return;
        }

        setFollowerCount(result?.followerCount ?? 0);
        setFollowingCount(result?.followingCount ?? 0);
        setCanFollow(Boolean(result?.canFollow));
        setIsFollowing(Boolean(result?.isFollowing));
        setIsLoading(false);
    }, [targetEmail, targetUserId]);

    useEffect(() => {
        void fetchSummary();
    }, [fetchSummary]);

    const toggleFollow = useCallback(async () => {
        if (!targetUserId || !canFollow) {
            return false;
        }

        setError(null);
        const response = await fetch("/api/follows", {
            method: isFollowing ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId }),
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
            setError(result?.error ?? "Volgstatus aanpassen mislukt.");
            return false;
        }

        await fetchSummary();
        return true;
    }, [canFollow, fetchSummary, isFollowing, targetUserId]);

    return {
        followerCount,
        followingCount,
        canFollow,
        isFollowing,
        isLoading,
        error,
        refresh: fetchSummary,
        toggleFollow,
    };
}
