import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Windows + mixed-case routes: keep /Admin as canonical.
  if (pathname === "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/Admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin"],
};

