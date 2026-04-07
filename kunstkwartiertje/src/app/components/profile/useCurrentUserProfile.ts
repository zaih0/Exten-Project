"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "src/utils/supabase/client";

type CurrentUserProfile = {
  username: string;
  role: string | null;
  isLoading: boolean;
};

const fallbackUsername = "Gebruiker";

export default function useCurrentUserProfile(): CurrentUserProfile {
  const [username, setUsername] = useState(fallbackUsername);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const applyUser = (user: User | null) => {
      if (!isMounted) return;

      if (!user) {
        setUsername(fallbackUsername);
        setRole(null);
        setIsLoading(false);
        return;
      }

      const metadataUsername =
        typeof user.user_metadata?.username === "string"
          ? user.user_metadata.username
          : null;
      const emailPrefix = user.email?.split("@")[0];

      setUsername(metadataUsername || emailPrefix || fallbackUsername);
      setRole(typeof user.user_metadata?.type === "string" ? user.user_metadata.type : null);
      setIsLoading(false);
    };

    const loadInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      applyUser(session?.user ?? null);
    };

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { username, role, isLoading };
}
