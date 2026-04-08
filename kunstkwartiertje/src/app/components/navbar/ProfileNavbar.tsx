"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSiteContent from "src/app/components/cms/useSiteContent";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";
import { createClient } from "src/utils/supabase/client";

const roleToProfilePath: Record<string, string> = {
  begeleider: "/profile/accompanist",
  ondernemer: "/profile/entrepreneur",
  kunstenaar: "/profile/artist",
};

const fallbackProfilePathFromPathname = (pathname: string): string => {
  if (pathname.startsWith("/profile/accompanist")) return "/profile/accompanist";
  if (pathname.startsWith("/profile/entrepreneur")) return "/profile/entrepreneur";
  if (pathname.startsWith("/profile/artist")) return "/profile/artist";
  return "/profile/artist";
};

export default function ProfileNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { username, role } = useCurrentUserProfile();
  const { content } = useSiteContent();
  const navbarLogoWidth = Number(content.branding.navbarLogoWidth) || 140;
  const navbarLogoHeight = Number(content.branding.navbarLogoHeight) || 42;
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const profilePath = useMemo(() => {
    if (role && roleToProfilePath[role]) return roleToProfilePath[role];
    return fallbackProfilePathFromPathname(pathname);
  }, [pathname, role]);

  const handleViewProfile = () => {
    setMenuOpen(false);
    router.push(profilePath);
  };

  const handleViewReservations = () => {
    setMenuOpen(false);
    router.push("/profile/reservations");
  };

  const handleViewPickups = () => {
    setMenuOpen(false);
    router.push("/profile/pickups");
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/art_gallery" className="flex items-center" aria-label="Ga naar art gallery">
          <Image
            src={content.branding.logoUrl || "/kunstkwartiertje-logo.png"}
            alt="Kunstkwartiertje"
            width={navbarLogoWidth}
            height={navbarLogoHeight}
            className="object-contain"
            style={{ width: `${navbarLogoWidth}px`, height: `${navbarLogoHeight}px` }}
            priority
          />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((previous) => !previous)}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-2.5 py-1.5 transition hover:bg-gray-50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="max-w-[12rem] truncate text-sm font-medium text-gray-800">{username}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleViewProfile}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
              >
                {content.navbar.viewProfileLabel}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleViewReservations}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
              >
                {content.navbar.reservationsLabel}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleViewPickups}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
              >
                {content.navbar.pickupsLabel}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
              >
                {content.navbar.logoutLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
