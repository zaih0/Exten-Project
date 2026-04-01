"use client";

import { useState } from "react";
import Link from "next/link";

export default function AccompanistProfile() {
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
                                src="https://ui-avatars.com/api/?name=Accompanist+Name&background=random" 
                                alt="Profile Picture" 
                            />
                        </div>
                        
                        <div className="grow text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">accompanist Name</h1>
                            <br />
                        </div>
                        
                        <div className="flex gap-3 mt-4 md:mt-0">
                            <Link href="" className="px-6 py-2 bg-purple-600 text-white font-medium rounded-full hover:bg-purple-700 transition">
                                Account Aanmaken
                            </Link>
                            <button className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition">
                                Edit Profile
                            </button>
                        </div>

                    </div>
                    
                    <div className="mt-6 md:pl-2">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">About Me</h2>
                        <p className="text-gray-600 leading-relaxed">
                            About me...
                        </p>
                    </div>
                </div>
            </div>

            {/* Artists Section */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Mijn Artiesten</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-2 rounded-full transition" title="Pas account aan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Verwijder account">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+One&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">Artist One</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-2 rounded-full transition" title="Pas account aan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Verwijder account">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Two&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">Artist Two</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-2 rounded-full transition" title="Pas account aan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Verwijder account">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Three&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">Artist Three</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">description...</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-2 rounded-full transition" title="Pas account aan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Verwijder account">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Four&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">Artist Four</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-2 rounded-full transition" title="Pas account aan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Verwijder account">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Five&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">Artist Five</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition relative flex flex-col items-center text-center group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-2 rounded-full transition" title="Pas account aan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Verwijder account">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition cursor-pointer mt-1">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Six&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-600 transition">Artist Six</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">description...</p>
                    </div>

                </div>
            </div>

            {/* Pending Artworks Section */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Te Keuren Kunstwerken</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Artwork 1 */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="h-48 bg-gray-200 w-full flex items-center justify-center">
                            <span className="text-gray-400">Artwork Image</span>
                        </div>
                        <div className="p-5 flex-grow flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">Art name</h3>
                            <p className="text-sm text-purple-600 font-medium mb-3">Door: Artist One</p>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">Description...</p>
                            <div className="mt-auto flex gap-2">
                                <button className="flex-1 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition">
                                    Goedkeuren
                                </button>
                                <button className="flex-1 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition">
                                    Afkeuren
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Artwork 2 */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="h-48 bg-gray-200 w-full flex items-center justify-center">
                            <span className="text-gray-400">Artwork Image</span>
                        </div>
                        <div className="p-5 flex-grow flex flex-col">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">Art name</h3>
                            <p className="text-sm text-purple-600 font-medium mb-3">Door: Artist Two</p>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">Description...</p>
                            <div className="mt-auto flex gap-2">
                                <button className="flex-1 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition">
                                    Goedkeuren
                                </button>
                                <button className="flex-1 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition">
                                    Afkeuren
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        </div>
    );
}