import { render } from "@react-email/components";
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, type EmailLocale } from "./_layout";

const TEXTS: Record<
  EmailLocale,
  {
    preview: string;
    greeting: (n: string) => string;
    body: string;
    cta: string;
  }
> = {
  he: {
    preview: "החשבון שלך ב-LocatePedia אושר",
    greeting: (n) => `אתם בפנים, ${n}.`,
    body: "החשבון שלכם ב-LocatePedia אושר. כעת ניתן לגלות ולהוסיף מיקומים.",
    cta: "פתחו את LocatePedia",
  },
  en: {
    preview: "Your LocatePedia account is approved",
    greeting: (n) => `You are in, ${n}.`,
    body: "Your LocatePedia account has been approved. You can now discover and submit locations.",
    cta: "Open LocatePedia",
  },
};

export function UserApprovedEmail({
  fullName,
  baseUrl,
  locale = "he",
}: {
  fullName: string;
  baseUrl: string;
  locale?: EmailLocale;
}) {
  const t = TEXTS[locale];
  return (
    <EmailLayout preview={t.preview} locale={locale}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{t.greeting(fullName)}</Text>
      <Text>{t.body}</Text>
      <Button
        href={`${baseUrl}/${locale}/discover`}
        style={{
          background: "#2563eb",
          color: "#fff",
          padding: "12px 18px",
          borderRadius: 8,
          textDecoration: "none",
          display: "inline-block",
          marginTop: 8,
        }}
      >
        {t.cta}
      </Button>
    </EmailLayout>
  );
}

export function renderUserApprovedEmail(props: {
  fullName: string;
  baseUrl: string;
  locale?: EmailLocale;
}) {
  return render(<UserApprovedEmail {...props} />);
}

export function userApprovedSubject(locale: EmailLocale) {
  return locale === "he"
    ? "החשבון שלך ב-LocatePedia אושר"
    : "Your LocatePedia account has been approved";
}
