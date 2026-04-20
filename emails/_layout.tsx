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

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container
          style={{
            maxWidth: 560,
            margin: "32px auto",
            background: "#ffffff",
            borderRadius: 12,
            padding: "32px",
          }}
        >
          <Section>
            <Text style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>PhotoLoc</Text>
          </Section>
          <Hr style={{ borderColor: "#eaecef", margin: "16px 0" }} />
          {children}
          <Hr style={{ borderColor: "#eaecef", margin: "24px 0" }} />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            PhotoLoc - Discover photography locations.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
