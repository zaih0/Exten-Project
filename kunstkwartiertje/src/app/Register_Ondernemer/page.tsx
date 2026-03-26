"use client";

import React from "react";
import {FormEvent, useState} from "react";
import { useRouter } from "next/navigation";

export default function RegisterOndernemer() {
    const [bedrijfNaam, setBedrijfNaam] = useState("");
    const [email, setEmail] = useState("");
    const [wachtwoord, setWachtwoord] = useState("");
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        console.log("Register payload:", { bedrijfNaam, email, wachtwoord });
        alert("Registered (demo)! Check console for submitted values");
    };
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black sm:px-6">
            <h1 className="mb-6 text-3xl font-bold">Register Ondernemer</h1>
            <form onSubmit={handleSubmit} className="my-6 flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-4 shadow-md sm:my-8 sm:gap-4 sm:p-4">
                <input
                    type="text"
                    placeholder="Bedrijfsnaam"
                    value={bedrijfNaam}
                    onChange={(e) => setBedrijfNaam(e.target.value)}
                    className="border border-gray-300 rounded px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-red-400"
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 rounded px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                />
                <input
                    type="password" 
                    placeholder="Wachtwoord"
                    value={wachtwoord}
                    onChange={(e) => setWachtwoord(e.target.value)}
                    className="border border-gray-300 rounded px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                />
                <button
                    type="submit"
                    className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                    Register
                </button>
            </form>
        </div>
    );
}

