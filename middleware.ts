import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EXEMPT = ["/admin/login", "/api/admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (EXEMPT.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi  = pathname.startsWith("/api/admin");
  if (!(isAdminPage || isAdminApi)) return NextResponse.next();

  const authed = req.cookies.get("admin")?.value === "true";
  if (authed) return NextResponse.next();

  const loginUrl = new URL("/admin/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
