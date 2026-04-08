"use client";

import { useState } from "react";
import useFollowSummary from "src/app/components/profile/useFollowSummary";

type FollowButtonProps = {
    targetUserId?: number;
    className?: string;
};

export default function FollowButton({ targetUserId, className }: FollowButtonProps) {
    const { canFollow, isFollowing, isLoading, error, toggleFollow } = useFollowSummary({ targetUserId });
    const [isBusy, setIsBusy] = useState(false);
    const [sentMsg, setSentMsg] = useState(false);

    if (!targetUserId || (!canFollow && !isFollowing && isLoading)) {
        return null;
    }

    if (!canFollow) {
        return error ? <p className="text-xs text-rose-600">{error}</p> : null;
    }

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => {
                    setIsBusy(true);
                    setSentMsg(false);
                    void toggleFollow()
                        .then((nowFollowing) => {
                            if (nowFollowing) setSentMsg(true);
                        })
                        .finally(() => setIsBusy(false));
                }}
                disabled={isBusy || isLoading}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isFollowing
                        ? "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-100"
                        : "bg-black text-white hover:bg-zinc-800"
                } disabled:opacity-60`}
            >
                {isBusy || isLoading ? "Bezig..." : isFollowing ? "Ontvolgen" : "Volgen"}
            </button>
            {sentMsg && isFollowing && (
                <p className="mt-1 text-xs text-emerald-600">✓ Chatverzoek verzonden</p>
            )}
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
    );
}
