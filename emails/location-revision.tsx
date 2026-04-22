import { render } from "@react-email/components";
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, type EmailLocale } from "./_layout";

const TEXTS: Record<
  EmailLocale,
  {
    preview: (title: string) => string;
    greeting: (n: string) => string;
    body: (title: string) => React.ReactNode;
    cta: string;
  }
> = {
  he: {
    preview: (title) => `התבקש תיקון: ${title}`,
    greeting: (n) => `שלום ${n},`,
    body: (title) => (
      <>
        ההגשה שלכם <strong>{title}</strong> זקוקה לתיקון קטן לפני שניתן יהיה לפרסם אותה.
      </>
    ),
    cta: "עריכת ההגשה",
  },
  en: {
    preview: (title) => `Revision requested: ${title}`,
    greeting: (n) => `Hi ${n},`,
    body: (title) => (
      <>
        Your submission <strong>{title}</strong> needs a small revision before it can be published.
      </>
    ),
    cta: "Edit submission",
  },
};

export function LocationRevisionEmail({
  fullName,
  title,
  slug,
  feedback,
  baseUrl,
  locale = "he",
}: {
  fullName: string;
  title: string;
  slug: string;
  feedback: string;
  baseUrl: string;
  locale?: EmailLocale;
}) {
  const t = TEXTS[locale];
  return (
    <EmailLayout preview={t.preview(title)} locale={locale}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{t.greeting(fullName)}</Text>
      <Text>{t.body(title)}</Text>
      <Text style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
        {feedback}
      </Text>
      <Button
        href={`${baseUrl}/${locale}/submit?edit=${slug}`}
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

export function renderLocationRevisionEmail(props: {
  fullName: string;
  title: string;
  slug: string;
  feedback: string;
  baseUrl: string;
  locale?: EmailLocale;
}) {
  return render(<LocationRevisionEmail {...props} />);
}

export function locationRevisionSubject(locale: EmailLocale, title: string) {
  return locale === "he"
    ? `התבקש תיקון: ${title}`
    : `Revision requested: ${title}`;
}
