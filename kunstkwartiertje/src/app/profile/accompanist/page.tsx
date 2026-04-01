"use client";

import { useState } from "react";

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
                        
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 flex-shrink-0">
                            <img 
                                className="w-full h-full object-cover" 
                                src="https://ui-avatars.com/api/?name=Accompanist+Name&background=random" 
                                alt="Profile Picture" 
                            />
                        </div>
                        
                        <div className="flex-grow text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">accompanist Name</h1>
                            <br />
                        </div>
                        
                        <div className="flex gap-3 mt-4 md:mt-0">
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

            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+One&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Artist One</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Two&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Artist Two</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Three&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Artist Three</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">description...</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Four&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Artist Four</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Five&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Artist Five</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">description...</p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition group cursor-pointer flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-transparent group-hover:border-blue-500 transition">
                            <img className="w-full h-full object-cover" src="https://ui-avatars.com/api/?name=Artist+Six&background=random" alt="Artist" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Artist Six</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">description...</p>
                    </div>

                </div>
            </div>
        </div>

        </div>
    );
}