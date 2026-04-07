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
        const user = data.session.user;
        const usernameFromMetadata =
          typeof user.user_metadata?.username === 'string'
            ? user.user_metadata.username
            : typeof user.user_metadata?.full_name === 'string'
              ? user.user_metadata.full_name
              : user.email?.split('@')[0] ?? null;

        const profileResponse = await fetch('/api/users/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email ?? null,
            username: usernameFromMetadata,
            type: typeof user.user_metadata?.type === 'string' ? user.user_metadata.type : null,
          }),
        });

        if (!profileResponse.ok) {
          const profileResponseText = await profileResponse.text();
          const profileResult = (() => {
            try {
              return JSON.parse(profileResponseText) as { error?: string; blocked?: boolean };
            } catch {
              return null;
            }
          })();

          console.error('Auth callback profile upsert error:', profileResult ?? profileResponseText);
          await supabase.auth.signOut();
          safeNavigate(profileResult?.blocked ? '/login?approval=blocked' : '/login');
          return;
        }

        const statusResponse = await fetch('/api/users/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email ?? null }),
        });

        const statusResponseText = await statusResponse.text();
        const statusResult = (() => {
          try {
            return JSON.parse(statusResponseText) as {
              error?: string;
              status?: 'pending' | 'approved' | 'denied' | null;
              blocked?: boolean;
            };
          } catch {
            return null;
          }
        })();

        if (!statusResponse.ok || !statusResult) {
          console.error('Auth callback profile lookup error:', statusResult ?? statusResponseText);
          await supabase.auth.signOut();
          safeNavigate('/login');
          return;
        }

        if (statusResult.blocked) {
          await supabase.auth.signOut();
          safeNavigate('/login?approval=blocked');
          return;
        }

        if (!statusResult.status) {
          await supabase.auth.signOut();
          safeNavigate('/login');
          return;
        }

        if (statusResult.status === 'pending') {
          await supabase.auth.signOut();
          safeNavigate('/login?approval=pending');
          return;
        }

        const role = user.user_metadata?.type;
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