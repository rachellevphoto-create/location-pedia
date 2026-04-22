import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export type EmailLocale = "he" | "en";

const FOOTER: Record<EmailLocale, string> = {
  he: "LocatePedia - גילוי מיקומי צילום.",
  en: "LocatePedia - Discover photography locations.",
};

export function EmailLayout({
  preview,
  children,
  locale = "he",
}: {
  preview: string;
  children: React.ReactNode;
  locale?: EmailLocale;
}) {
  const dir = locale === "he" ? "rtl" : "ltr";
  return (
    <Html lang={locale} dir={dir}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f7f9",
          fontFamily:
            "Inter, 'Segoe UI', Arial, 'Noto Sans Hebrew', sans-serif",
          direction: dir,
        }}
      >
        <Container
          dir={dir}
          style={{
            maxWidth: 560,
            margin: "32px auto",
            background: "#ffffff",
            borderRadius: 12,
            padding: "32px",
            direction: dir,
            textAlign: dir === "rtl" ? "right" : "left",
          }}
        >
          <Section>
            <Text style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              LocatePedia
            </Text>
          </Section>
          <Hr style={{ borderColor: "#eaecef", margin: "16px 0" }} />
          {children}
          <Hr style={{ borderColor: "#eaecef", margin: "24px 0" }} />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            {FOOTER[locale]}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
