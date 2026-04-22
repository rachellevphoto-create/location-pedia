import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { authConfig } from "@/lib/auth.config";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

const LOCALE_PREFIX_RE = /^\/(he|en)(?=\/|$)/;

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const localeMatch = pathname.match(LOCALE_PREFIX_RE);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const localePrefix = localeMatch ? `/${locale}` : "";
  const pathWithoutLocale = pathname.replace(LOCALE_PREFIX_RE, "") || "/";

  const isAdminRoute = pathWithoutLocale.startsWith("/admin");
  // /discover and /locations are public (guests can browse).
  const isAppRoute =
    pathWithoutLocale.startsWith("/submit") ||
    pathWithoutLocale.startsWith("/profile") ||
    pathWithoutLocale.startsWith("/points");

  const session = req.auth;

  if (!session?.user) {
    if (isAdminRoute || isAppRoute) {
      const url = req.nextUrl.clone();
      url.pathname = `${localePrefix}/login`;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return intlMiddleware(req);
  }

  const status = session.user.status;
  const role = session.user.role;

  if (isAdminRoute && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = `${localePrefix}/`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAppRoute && status !== "APPROVED") {
    const url = req.nextUrl.clone();
    if (status === "PENDING") {
      url.pathname = `${localePrefix}/pending`;
    } else if (status === "REJECTED" || status === "BANNED") {
      url.pathname = `${localePrefix}/blocked`;
    }
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Mirror the user's stored locale into the NEXT_LOCALE cookie when missing
  // or stale, so next-intl detects the right language on subsequent navigations.
  const userLocale = (session.user as { locale?: string | null }).locale;
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  const response = intlMiddleware(req);
  if (
    userLocale &&
    routing.locales.includes(userLocale as (typeof routing.locales)[number]) &&
    cookieLocale !== userLocale
  ) {
    response.cookies.set("NEXT_LOCALE", userLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
