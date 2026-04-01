"use client";

export default function ArtistProfilePage() {
    return (
        <div
            className="min-h-screen px-6 py-8 font-sans"
style={{
    backgroundImage:
        "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
}}
        >
            <div className="mx-auto w-full max-w-6xl rounded-full bg-linear-to-br from-purple-50/60 to-white/60 p-6 backdrop-blur">
                <div className="mb-6 rounded-full border border-purple-200/35 bg-white/75 backdrop-blur">
                    <div className="flex h-16 items-center px-6">
                        <span className="text-sm font-semibold text-zinc-900">
                            Artist profile page Desktop
                        </span>
                        <img className="rounded-full" src="/profileImage.jpg" alt="Artist profile desktop preview" />
                    </div>
                </div>

                <div className="flex gap-6">
                    <aside className="w-64 rounded-xl border border-purple-200/35 bg-white/75 p-4 backdrop-blur">
                        <div className="mb-3 text-xs font-semibold text-purple-700/80">
                            Artist profile sidebar
                        </div>
                    </aside>        
                    <main className="flex-1 rounded-xl border border-purple-200/35 bg-white/75 p-6 backdrop-blur">
                        <div className="space-y-4">
                            <div className="rounded-lg border border-purple-200/60 bg-white/60 p-4">
                                <div className="text-sm font-semibold text-purple-700/90">
                                    Artist profile content
                                </div>
                                <div className="mt-1 text-xs text-zinc-600/80">
                                    Voorbeelden van mogelijke situaties:
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
