"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message || "Inloggen is mislukt. Probeer opnieuw.");
      setLoading(false);
      return;
    }

    // Verwijs naar de hoofdpagina of een begeleider-dashboard route
    router.push("/");
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({ provider });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // OAuth redirect wordt door Supabase afgevangen
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Image
            src="/kunstkwartiertje-logo.png"
            alt="Kunstkwartiertje"
            width={300}
            height={200}
            className="mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-gray-900">Log in</h1>
        </div>

        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="email@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="password" className="sr-only">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              placeholder="Wachtwoord..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-between text-sm mt-2">
          <a
            href="/wachtwoord-vergeten"
            className="text-gray-600 hover:text-gray-900"
          >
            Wachtwoord vergeten?
          </a>
          <a href="/admin" className="text-gray-600 hover:text-gray-900">
            Admin?
          </a>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mt-4"
        >
          {loading ? "Loading..." : "Ga verder"}
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-300" />
          <span className="px-2 text-gray-500 text-sm">of</span>
          <div className="flex-grow border-t border-gray-300" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Image
              src="/google-logo.png"
              alt="Google"
              width={20}
              height={20}
              className="mr-2"
            />
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("apple")}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Image
              src="/apple-logo.png"
              alt="Apple"
              width={20}
              height={20}
              className="mr-2"
            />
            Continue with Apple
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          By clicking continue, you agree to our{" "}
          <a href="/terms" className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
