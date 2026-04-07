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
