import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/nodemailer";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { UserRole, UserStatus } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const hasResend = !!process.env.RESEND_API_KEY;

const providers: any[] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const parsed = credentialsSchema.safeParse(creds);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!user || !user.passwordHash) return null;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        status: user.status,
        points: user.points,
        locale: user.locale,
      };
    },
  }),
];

if (hasResend) {
  providers.push(
    Email({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY!,
        },
      },
      from: process.env.EMAIL_FROM ?? "LocatePedia <noreply@example.com>",
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.id;
        token.role = (user as { role?: UserRole }).role ?? token.role;
        token.status = (user as { status?: UserStatus }).status ?? token.status;
        token.points = (user as { points?: number }).points ?? token.points;
        token.locale =
          (user as { locale?: string | null }).locale ?? token.locale;
        return token;
      }
      // Role, status and points live in the DB and change without the user
      // signing in again (admin approves / bans, points are spent). Re-read
      // them on every server-side auth() call so gating is never stale.
      if (token.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, points: true, locale: true },
        });
        if (!u) return null; // user deleted -> drop the session
        token.role = u.role;
        token.status = u.status;
        token.points = u.points;
        token.locale = u.locale;
      }
      return token;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    const err = new Error("UNAUTHENTICATED");
    (err as any).code = "UNAUTHENTICATED";
    throw err;
  }
  return session.user;
}

export async function requireApproved() {
  const user = await requireUser();
  if (user.status !== "APPROVED") {
    const err = new Error("NOT_APPROVED");
    (err as any).code = "NOT_APPROVED";
    throw err;
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireApproved();
  if (user.role !== "ADMIN") {
    const err = new Error("FORBIDDEN");
    (err as any).code = "FORBIDDEN";
    throw err;
  }
  return user;
}

/**
 * For server pages that need an APPROVED user. Redirects to login / pending /
 * blocked based on the user's current DB status (see the jwt callback).
 */
export async function requireApprovedPage(locale: string, nextPath: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login?next=/${locale}${nextPath}`);
  }
  const { status } = session.user;
  if (status === "PENDING") redirect(`/${locale}/pending`);
  if (status !== "APPROVED") redirect(`/${locale}/blocked`);
  return session.user;
}
