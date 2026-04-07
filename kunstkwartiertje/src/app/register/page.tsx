'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
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
  const [lastRegisterAttempt, setLastRegisterAttempt] = useState<number | null>(null);
  const [nextAllowedRegisterAt, setNextAllowedRegisterAt] = useState<number | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    const now = Date.now();

    if (nextAllowedRegisterAt && now < nextAllowedRegisterAt) {
      const waitSeconds = Math.ceil((nextAllowedRegisterAt - now) / 1000);
      setError(`Te veel aanvragen: wacht ${waitSeconds} seconden en probeer opnieuw.`);
      return;
    }

    if (lastRegisterAttempt && now - lastRegisterAttempt < 60000) {
      console.log('Rate limit check:', { lastRegisterAttempt, now, timeDifference: now - lastRegisterAttempt });
      setError('Wacht een minuut voordat je opnieuw probeert te registreren.');
      return;
    }

    if (!username || !email || !password) {
      setError('Vul alle velden in.');
      return;
    }

    setLoading(true);
    setError('');
    setLastRegisterAttempt(now);

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserError) {
      console.error('Supabase user lookup error', existingUserError);
      setError('Kan gebruikerscontrole niet voltooien, probeer opnieuw.');
      setLoading(false);
      return;
    }

    if (existingUser) {
      setError('Account bestaat al met dit e-mailadres.');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          type: role.toLowerCase(),
        }
      }
    });

    if (authError) {
      console.error('Supabase signUp error', authError);

      if (authError.status === 429 || authError.message.toLowerCase().includes('rate limit')) {
        setNextAllowedRegisterAt(Date.now() + 60000);
        setError('Te veel verzoeken: probeer het over 1 minuut opnieuw.');
      } else if (authError.message.toLowerCase().includes('already registered')) {
        setError('Account bestaat al');
      } else {
        setError(authError.message || 'Onverwachte fout bij registratie.');
      }

      setLoading(false);
      return;
    }

    console.log('Registration successful. User data:', data?.user);
    console.log('User metadata:', data?.user?.user_metadata);

    if (!data?.user?.id) {
      setError('Kan geen gebruiker aanmaken. Probeer later nogmaals.');
      setLoading(false);
      return;
    }

    // Note: User role is already stored in auth metadata, so we don't need to insert into users table
    // If you need additional user data (username, phone, etc.), you'll need to fix the users table schema
    // to use UUID for the id column instead of bigint

    console.log('User successfully registered with ID:', data.user.id, 'and role:', role.toLowerCase());

    startTransition(() => {
      router.push('/login');
    });
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
          disabled={loading || isPending}
          className="w-full mt-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-900"
        >
          {loading || isPending ? 'Laden...' : 'Registreren'}
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
