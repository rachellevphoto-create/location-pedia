"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
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
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { email, password, fullName, phone, teacherOrSchool, portfolioUrl } =
    parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
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

  await sendWelcome(user.email, user.fullName).catch(() => null);

  redirect("/pending");
}
