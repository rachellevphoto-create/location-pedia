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
    withPoints: string;
    noPoints: string;
    cta: string;
  }
> = {
  he: {
    preview: (title) => `אושר: ${title}`,
    greeting: (n) => `שלום ${n},`,
    body: (title) => (
      <>
        המיקום שלך <strong>{title}</strong> אושר וכעת מופיע ל-LocatePedia.
      </>
    ),
    withPoints: " צברתם נקודות עבור התרומה.",
    noPoints: " לא הוענקו נקודות עבור הרשומה הזו.",
    cta: "צפייה במיקום",
  },
  en: {
    preview: (title) => `Approved: ${title}`,
    greeting: (n) => `Hi ${n},`,
    body: (title) => (
      <>
        Your location <strong>{title}</strong> has been approved and is now public on LocatePedia.
      </>
    ),
    withPoints: " You earned points for the contribution.",
    noPoints: " No points were awarded for this entry.",
    cta: "View location",
  },
};

export function LocationApprovedEmail({
  fullName,
  title,
  slug,
  awardedPoints,
  baseUrl,
  locale = "he",
}: {
  fullName: string;
  title: string;
  slug: string;
  awardedPoints: boolean;
  baseUrl: string;
  locale?: EmailLocale;
}) {
  const t = TEXTS[locale];
  return (
    <EmailLayout preview={t.preview(title)} locale={locale}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>{t.greeting(fullName)}</Text>
      <Text>
        {t.body(title)}
        {awardedPoints ? t.withPoints : t.noPoints}
      </Text>
      <Button
        href={`${baseUrl}/${locale}/locations/${slug}`}
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

export function renderLocationApprovedEmail(props: {
  fullName: string;
  title: string;
  slug: string;
  awardedPoints: boolean;
  baseUrl: string;
  locale?: EmailLocale;
}) {
  return render(<LocationApprovedEmail {...props} />);
}

export function locationApprovedSubject(locale: EmailLocale, title: string) {
  return locale === "he" ? `אושר: ${title}` : `Approved: ${title}`;
}
