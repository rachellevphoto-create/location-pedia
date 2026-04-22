import { render } from "@react-email/components";
import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, type EmailLocale } from "./_layout";

const TEXTS: Record<
  EmailLocale,
  { preview: string; greeting: (n: string) => string; body: string }
> = {
  he: {
    preview: "ברוכים הבאים ל-LocatePedia - ממתין לאישור",
    greeting: (n) => `ברוך הבא, ${n}.`,
    body: "תודה על ההרשמה. כדי לשמור על קהילה איכותית, כל צלם חדש נבדק על ידי מנהל לפני קבלת גישה. נשלח לכם אימייל ברגע שהחשבון יאושר.",
  },
  en: {
    preview: "Welcome to LocatePedia - awaiting approval",
    greeting: (n) => `Welcome, ${n}.`,
    body: "Thanks for signing up. To keep our community high-quality, every new photographer is reviewed by an admin before joining. We will email you as soon as your account is approved.",
  },
};

export function WelcomeEmail({
  fullName,
  locale = "he",
}: {
  fullName: string;
  locale?: EmailLocale;
}) {
  const t = TEXTS[locale];
  return (
    <EmailLayout preview={t.preview} locale={locale}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{t.greeting(fullName)}</Text>
      <Text>{t.body}</Text>
    </EmailLayout>
  );
}

export function renderWelcomeEmail(props: {
  fullName: string;
  locale?: EmailLocale;
}) {
  return render(<WelcomeEmail {...props} />);
}

export function welcomeSubject(locale: EmailLocale) {
  return locale === "he"
    ? "ברוכים הבאים ל-LocatePedia - ממתין לאישור"
    : "Welcome to LocatePedia - awaiting approval";
}
