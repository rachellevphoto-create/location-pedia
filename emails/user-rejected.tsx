import { render } from "@react-email/components";
import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, type EmailLocale } from "./_layout";

const TEXTS: Record<
  EmailLocale,
  {
    preview: string;
    greeting: (n: string) => string;
    body: string;
    reasonPrefix: (r: string) => string;
    footer: string;
  }
> = {
  he: {
    preview: "עדכון לגבי חשבון LocatePedia",
    greeting: (n) => `שלום ${n},`,
    body: "לא הצלחנו לאשר את חשבון LocatePedia שלכם בשלב זה.",
    reasonPrefix: (r) => `סיבה: ${r}`,
    footer: "אם נראה לכם שזו טעות, השיבו לאימייל הזה והצוות שלנו ייקח עוד מבט.",
  },
  en: {
    preview: "LocatePedia account update",
    greeting: (n) => `Hi ${n},`,
    body: "We were unable to approve your LocatePedia account at this time.",
    reasonPrefix: (r) => `Reason: ${r}`,
    footer:
      "If you believe this is a mistake, reply to this email and our team will take another look.",
  },
};

export function UserRejectedEmail({
  fullName,
  reason,
  locale = "he",
}: {
  fullName: string;
  reason?: string;
  locale?: EmailLocale;
}) {
  const t = TEXTS[locale];
  return (
    <EmailLayout preview={t.preview} locale={locale}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{t.greeting(fullName)}</Text>
      <Text>
        {t.body}
        {reason ? ` ${t.reasonPrefix(reason)}` : ""}
      </Text>
      <Text>{t.footer}</Text>
    </EmailLayout>
  );
}

export function renderUserRejectedEmail(props: {
  fullName: string;
  reason?: string;
  locale?: EmailLocale;
}) {
  return render(<UserRejectedEmail {...props} />);
}

export function userRejectedSubject(locale: EmailLocale) {
  return locale === "he" ? "עדכון לגבי חשבון LocatePedia" : "LocatePedia account update";
}
