import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAppRoute =
    pathname.startsWith("/discover") ||
    pathname.startsWith("/submit") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/points") ||
    pathname.startsWith("/locations");

  if (!session?.user) {
    if (isAdminRoute || isAppRoute) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const status = session.user.status;
  const role = session.user.role;

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isAppRoute && status !== "APPROVED") {
    if (status === "PENDING") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
    if (status === "REJECTED" || status === "BANNED") {
      return NextResponse.redirect(new URL("/blocked", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\..*).*)",
  ],
};
