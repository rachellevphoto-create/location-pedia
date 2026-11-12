"use server";

import bcrypt from "bcryptjs";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { redirect } from "@/i18n/navigation";
import { registerSchema } from "@/lib/validation";
import { sendWelcome } from "@/lib/email";

export type RegisterState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerAction(
  _prev: RegisterState | undefined,
  formData: FormData,
): Promise<RegisterState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k) fieldErrors[k] = issue.message;
    }
    return { error: "v:fixHighlightedFields", fieldErrors };
  }

  const { email, password, fullName, phone, teacherOrSchool, portfolioUrl } =
    parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return { error: "v:emailExists" };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      phone: phone || null,
      teacherOrSchool: teacherOrSchool || null,
      portfolioUrl: portfolioUrl || null,
    },
  });

  const locale = await getLocale();
  await sendWelcome(user.email, user.fullName, locale).catch(() => null);

  return redirect({ href: "/pending", locale: locale as "he" | "en" }) as never;
}
