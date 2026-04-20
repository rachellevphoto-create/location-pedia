import { render } from "@react-email/components";
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout";

export function LocationApprovedEmail({
  fullName,
  title,
  slug,
  awardedPoints,
  baseUrl,
}: {
  fullName: string;
  title: string;
  slug: string;
  awardedPoints: boolean;
  baseUrl: string;
}) {
  return (
    <EmailLayout preview={`Approved: ${title}`}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>Hi {fullName},</Text>
      <Text>
        Your location <strong>{title}</strong> has been approved and is now
        public on PhotoLoc.
        {awardedPoints
          ? " You earned points for the contribution."
          : " No points were awarded for this entry."}
      </Text>
      <Button
        href={`${baseUrl}/locations/${slug}`}
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
        View location
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
}) {
  return render(<LocationApprovedEmail {...props} />);
}
