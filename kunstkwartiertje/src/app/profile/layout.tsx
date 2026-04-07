import type { ReactNode } from "react";
import ProfileNavbar from "src/app/components/navbar/ProfileNavbar";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <ProfileNavbar />
      {children}
    </div>
  );
}
