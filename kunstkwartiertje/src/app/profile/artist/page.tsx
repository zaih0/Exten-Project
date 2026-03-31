"use client";

import { useEffect, useState } from "react";

export default function ArtistProfile() {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setExpandedImage(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
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
                                src= "/profileImage.jpg" 
                                alt="Profile Picture" 
                            />
                        </div>
                        
                        <div className="grow text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Artist Name</h1>
                            <br />
                        </div>
                        
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <button className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition">
                                Wijzig Profiel
                            </button>
                        </div>

                    </div>
                    
                    <div className="mt-6 md:pl-2">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">About Me</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Over mij.=wdinwdinwn.Hallo????
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden">
                        <div className="relative h-40 md:h-44 w-full overflow-hidden">
                            <img
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                src="/KW1.jpg"
                                alt="Kunstwerk 1"
                                onClick={() => setExpandedImage("/KW1.jpg")}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <h3 className="font-bold text-white text-lg">Kunstwerk 1</h3>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 line-clamp-2">Beschrijving</p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden">
                        <div className="relative h-40 md:h-44 w-full overflow-hidden">
                            <img
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                src="/KW2.jpg"
                                alt="Kunstwerk 2"
                                onClick={() => setExpandedImage("/KW2.jpg")}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <h3 className="font-bold text-white text-lg">Kunstwerk 2</h3>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 line-clamp-2">Beschrijving</p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden">
                        <div className="relative h-40 md:h-44 w-full overflow-hidden">
                            <img
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                src="/KW3.jpg"
                                alt="Kunstwerk 3"
                                onClick={() => setExpandedImage("/KW3.jpg")}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <h3 className="font-bold text-white text-lg">Kunstwerk 3</h3>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 line-clamp-2">Beschrijving</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden">
                        <div className="relative h-40 md:h-44 w-full overflow-hidden">
                            <img
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                src="/KW4.jpg"
                                alt="Kunstwerk 4"
                                onClick={() => setExpandedImage("/KW4.jpg")}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <h3 className="font-bold text-white text-lg">Kunstwerk 4</h3>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 line-clamp-2">Beschrijving</p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden">
                        <div className="relative h-40 md:h-44 w-full overflow-hidden">
                            <img
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                src="/KW1.jpg"
                                alt="Kunstwerk 5"
                                onClick={() => setExpandedImage("/KW1.jpg")}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <h3 className="font-bold text-white text-lg">Kunstwerk 5</h3>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 line-clamp-2">Beschrijving</p>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer overflow-hidden">
                        <div className="relative h-40 md:h-44 w-full overflow-hidden">
                            <img
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                src="/KW2.jpg"
                                alt="Kunstwerk 6"
                                onClick={() => setExpandedImage("/KW2.jpg")}
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <h3 className="font-bold text-white text-lg">Kunstwerk 6</h3>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 line-clamp-2">Beschrijving</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        </div>

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