'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from 'src/utils/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('begeleider');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setError('Vul alle velden in.');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('rate limit')) {
        setError('Te veel verzoeken: probeer het over 1 minuut opnieuw.');
      } else if (authError.message.includes('User already registered')) {
        setError('Account bestaat al');
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (!data?.user?.id) {
      setError('Kan geen gebruiker aanmaken. Probeer later nogmaals.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      username,
      email,
      password,
      type: role.toLowerCase(),
      blocked_status: false,
      phone_number: null,
    });

    if (insertError) {
      setError(`Fout bij opslaan van gebruikersgegevens: ${insertError.message}`);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image
            src="/kunstkwartiertje-logo.png"
            alt="logo"
            width={180}
            height={60}
            className="object-contain"
          />
        </div>

        {/* Title */}
        <h2 className="text-center text-lg font-semibold text-gray-900 mb-6">
          Registreren
        </h2>

        {/* Inputs */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Gebruikersnaam"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <input
            type="email"
            placeholder="email@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <input
            type="password"
            placeholder="Wachtwoord..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="begeleider">Begeleider</option>
            <option value="ondernemer">Ondernemer</option>
            <option value="kunstenaar">Kunstenaar</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <button
          type="button"
          onClick={handleRegister}
          disabled={loading}
          className="w-full mt-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900"
        >
          {loading ? 'Laden...' : 'Registreren'}
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="px-3 text-gray-500 text-sm">of</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="w-full py-3 rounded-lg bg-gray-200 text-gray-800 flex items-center justify-center gap-2 hover:bg-gray-300"
          >
            <Image src="/google-logo.png" alt="Google" width={20} height={20} />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('apple')}
            className="w-full py-3 rounded-lg bg-gray-200 text-gray-800 flex items-center justify-center gap-2 hover:bg-gray-300"
          >
            <Image src="/apple-logo.png" alt="Apple" width={20} height={20} />
            Continue with Apple
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By clicking continue, you agree to our <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"klant" | "artiest">("klant");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        console.log("Register payload:", { username, email, password, role });
        alert("Registered (demo)! Check console for submitted values");
    };

    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center font-sans text-zinc-900"
            style={{
                backgroundImage:
                    "radial-gradient(circle at 12% 18%, rgba(232, 121, 249, 0.34) 0%, rgba(196, 181, 253, 0.20) 30%, rgba(255,255,255,0) 62%), radial-gradient(circle at 86% 12%, rgba(168, 85, 247, 0.34) 0%, rgba(129, 140, 248, 0.18) 34%, rgba(255,255,255,0) 62%), radial-gradient(circle at 50% 92%, rgba(217, 70, 239, 0.26) 0%, rgba(139, 92, 246, 0.14) 38%, rgba(255,255,255,0) 68%), linear-gradient(135deg, rgba(250, 245, 255, 1) 0%, rgba(237, 233, 254, 1) 38%, rgba(243, 232, 255, 1) 68%, rgba(253, 242, 248, 1) 100%)",
            }}
        >
            <h1
                className="mb-5 text-center text-4xl font-extrabold tracking-tight"
                style={{
                    color: "#ffffff",
                    WebkitTextStroke: "2px rgb(147 51 234)",
                    textShadow:
                        "0 1px 0 rgba(147,51,234,0.25), 0 12px 30px rgba(147,51,234,0.20)",
                }}
            >
                Register voor een account
            </h1>

            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-white/88 p-6 shadow-xl backdrop-blur ring-1 ring-purple-200/80"
            >
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                />

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "klant" | "artiest")}
                    className="border border-purple-200 rounded px-4 py-2 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    required
                >
                    <option value="klant">Klant</option>
                    <option value="artiest">Artiest</option>
                </select>

                <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded px-4 py-2 hover:from-purple-700 hover:to-fuchsia-700 transition-colors"
                >
                    Register
                </button>
            </form>
        </div>
    );
}