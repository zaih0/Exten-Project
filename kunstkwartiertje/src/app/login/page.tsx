"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "src/utils/supabase/client";

const LoginPage = () => {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const approvalStatus = searchParams.get("approval");

  const approvalMessage = useMemo(() => {
    if (approvalStatus === "blocked") {
      return "Je account is geblokkeerd. Neem contact op met een admin.";
    }

    if (approvalStatus === "pending") {
      return "Je account wacht nog op goedkeuring door een admin.";
    }

    if (approvalStatus === "denied") {
      return "Je aanvraag is geweigerd. Neem contact op met een admin voor hulp.";
    }

    return "";
  }, [approvalStatus]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message || "Inloggen is mislukt. Probeer opnieuw.");
      setLoading(false);
      return;
    }

    if (!data?.user?.id) {
      setError('Login mislukt, probeer opnieuw.');
      setLoading(false);
      return;
    }

    const profileResponse = await fetch("/api/users/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: data.user.email ?? email }),
    });

    const profileResponseText = await profileResponse.text();
    const profileResult = (() => {
      try {
        return JSON.parse(profileResponseText) as {
          error?: string;
          status?: "pending" | "approved" | "denied" | null;
          blocked?: boolean;
        };
      } catch {
        return null;
      }
    })();

    if (!profileResponse.ok || !profileResult?.status) {
      if (profileResult?.blocked) {
        await supabase.auth.signOut();
        setError("Je account is geblokkeerd. Inloggen is niet toegestaan.");
        setLoading(false);
        return;
      }

      console.error("User profile lookup error:", profileResult ?? profileResponseText);
      await supabase.auth.signOut();
      setError(profileResult?.error || "Je goedkeuringsstatus kon niet worden gecontroleerd.");
      setLoading(false);
      return;
    }

    if (profileResult.blocked) {
      await supabase.auth.signOut();
      setError("Je account is geblokkeerd. Inloggen is niet toegestaan.");
      setLoading(false);
      return;
    }

    if (profileResult.status === "pending") {
      await supabase.auth.signOut();
      setError("Je account wacht nog op goedkeuring door een admin.");
      setLoading(false);
      return;
    }

    // Get role from auth metadata - try from the login response first
    let role = data.user?.user_metadata?.type;

    if (!role) {
      // If not available in login response, wait longer and fetch from session
      console.log('Role not found in login response, fetching from session...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !sessionUser) {
        console.error('Session error:', sessionError);
        setError('Kon gebruikersgegevens niet ophalen.');
        setLoading(false);
        return;
      }
      role = sessionUser.user_metadata?.type;
    }

    role = role || 'begeleider'; // Default fallback

    console.log('User authenticated:', data.user.id, 'Role:', role);
    console.log('User metadata:', data.user.user_metadata);

    let redirectPath = '/';
    if (role === 'begeleider') redirectPath = '/profile/accompanist';
    else if (role === 'ondernemer') redirectPath = '/profile/entrepreneur';
    else if (role === 'kunstenaar') redirectPath = '/profile/artist';

    console.log('Redirecting to:', redirectPath);

    try {
      // Try window.location.href first for more reliable navigation
      console.log('Using window.location.href for navigation');
      window.location.href = redirectPath;
    } catch (navError) {
      console.error('Navigation error:', navError);
      setError('Fout bij doorsturen naar profielpagina.');
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

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
          <a href="/admin?login=1" className="text-gray-600 hover:text-gray-900">
            Admin login
          </a>
        </div>

        {approvalMessage && !error && <p className="text-amber-600 text-sm">{approvalMessage}</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mt-4"
        >
          {loading ? "Loading..." : "Ga verder"}
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/register";
          }}
          className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100 mt-3"
        >
          Naar registreren
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
