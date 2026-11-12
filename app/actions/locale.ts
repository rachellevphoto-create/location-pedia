"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setUserLocaleAction(locale: string) {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return { ok: false as const, error: "INVALID_LOCALE" };
  }

  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale },
    });
  }

  return { ok: true as const };
}
