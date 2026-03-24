
"use client";

import { FormEvent, useState } from "react";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        console.log("Register payload:", { username, email, password });
        alert("Registered (demo)! Check console for submitted values");
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <h1 className="mb-6 text-3xl font-bold">Register</h1>

            <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border border-gray-300 rounded px-4 py-2"
                    required
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 rounded px-4 py-2"
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-gray-300 rounded px-4 py-2"
                    required
                />

                <button type="submit" className="bg-blue-500 text-white rounded px-4 py-2">
                    Register
                </button>
            </form>
        </div>
    );
}