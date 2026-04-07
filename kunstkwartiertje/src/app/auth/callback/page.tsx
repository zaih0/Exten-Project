'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.push('/login');
        return;
      }

      if (data.session?.user) {
        const email = data.session.user.email;
        if (email) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('type')
            .eq('email', email)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError);
            router.push('/');
            return;
          }

          const role = userData.type;
          let redirectPath = '/';
          if (role === 'begeleider') redirectPath = '/profile/accompanist';
          else if (role === 'ondernemer') redirectPath = '/profile/entrepreneur';
          else if (role === 'kunstenaar') redirectPath = '/profile/artist';

          router.push(redirectPath);
        } else {
          router.push('/');
        }
      } else {
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}