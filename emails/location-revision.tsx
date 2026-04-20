import { render } from "@react-email/components";
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout";

export function LocationRevisionEmail({
  fullName,
  title,
  slug,
  feedback,
  baseUrl,
}: {
  fullName: string;
  title: string;
  slug: string;
  feedback: string;
  baseUrl: string;
}) {
  return (
    <EmailLayout preview={`Revision requested: ${title}`}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>Hi {fullName},</Text>
      <Text>
        Your submission <strong>{title}</strong> needs a small revision before
        it can be published.
      </Text>
      <Text style={{ background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
        {feedback}
      </Text>
      <Button
        href={`${baseUrl}/submit?edit=${slug}`}
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
        Edit submission
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
}) {
  return render(<LocationRevisionEmail {...props} />);
}
