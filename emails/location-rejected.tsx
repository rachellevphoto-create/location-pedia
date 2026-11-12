import { render } from "@react-email/components";
import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, type EmailLocale } from "./_layout";

const TEXTS: Record<
  EmailLocale,
  {
    preview: (title: string) => string;
    greeting: (n: string) => string;
    body: (title: string) => React.ReactNode;
    reasonPrefix: (r: string) => string;
    footer: string;
  }
> = {
  he: {
    preview: (title) => `עדכון הגשה: ${title}`,
    greeting: (n) => `שלום ${n},`,
    body: (title) => (
      <>
        ההגשה שלכם <strong>{title}</strong> לא אושרה.
      </>
    ),
    reasonPrefix: (r) => `סיבה: ${r}`,
    footer: "תמיד ניתן להגיש מיקום חדש.",
  },
  en: {
    preview: (title) => `Submission update: ${title}`,
    greeting: (n) => `Hi ${n},`,
    body: (title) => (
      <>
        Your submission <strong>{title}</strong> was not approved.
      </>
    ),
    reasonPrefix: (r) => `Reason: ${r}`,
    footer: "You can submit a new location any time.",
  },
};

export function LocationRejectedEmail({
  fullName,
  title,
  reason,
  locale = "he",
}: {
  fullName: string;
  title: string;
  reason?: string;
  locale?: EmailLocale;
}) {
  const t = TEXTS[locale];
  return (
    <EmailLayout preview={t.preview(title)} locale={locale}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{t.greeting(fullName)}</Text>
      <Text>
        {t.body(title)}
        {reason ? ` ${t.reasonPrefix(reason)}` : ""}
      </Text>
      <Text>{t.footer}</Text>
    </EmailLayout>
  );
}

export function renderLocationRejectedEmail(props: {
  fullName: string;
  title: string;
  reason?: string;
  locale?: EmailLocale;
}) {
  return render(<LocationRejectedEmail {...props} />);
}

export function locationRejectedSubject(locale: EmailLocale, title: string) {
  return locale === "he"
    ? `עדכון הגשה: ${title}`
    : `Submission update: ${title}`;
}
