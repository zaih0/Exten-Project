'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from 'src/utils/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  const safeNavigate = (path: string) => {
    router.replace(path);

    window.setTimeout(() => {
      if (window.location.pathname !== path) {
        window.location.assign(path);
      }
    }, 1500);
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        safeNavigate('/login');
        return;
      }

      if (data.session?.user) {
        const role = data.session.user.user_metadata?.type;
        let redirectPath = '/';

        if (role === 'begeleider') redirectPath = '/profile/accompanist';
        else if (role === 'ondernemer') redirectPath = '/profile/entrepreneur';
        else if (role === 'kunstenaar') redirectPath = '/profile/artist';

        safeNavigate(redirectPath);
      } else {
        safeNavigate('/login');
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