import type { NextAuthConfig } from "next-auth";
import type { UserRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      points: number;
      locale?: string | null;
    } & import("next-auth").DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
    points?: number;
    locale?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    status?: UserStatus;
    points?: number;
    locale?: string | null;
    id?: string;
  }
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.id;
        token.role = (user as { role?: UserRole }).role ?? token.role;
        token.status = (user as { status?: UserStatus }).status ?? token.status;
        token.points = (user as { points?: number }).points ?? token.points;
        token.locale =
          (user as { locale?: string | null }).locale ?? token.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.points = (token.points as number) ?? 0;
        session.user.locale = (token.locale as string | null | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
