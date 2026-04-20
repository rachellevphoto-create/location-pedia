import { render } from "@react-email/components";
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout";

export function UserApprovedEmail({
  fullName,
  baseUrl,
}: {
  fullName: string;
  baseUrl: string;
}) {
  return (
    <EmailLayout preview="Your PhotoLoc account is approved">
      <Text style={{ fontSize: 18, fontWeight: 600 }}>You are in, {fullName}.</Text>
      <Text>
        Your PhotoLoc account has been approved. You can now discover and submit
        locations.
      </Text>
      <Button
        href={`${baseUrl}/discover`}
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
        Open PhotoLoc
      </Button>
    </EmailLayout>
  );
}

export function renderUserApprovedEmail(props: {
  fullName: string;
  baseUrl: string;
}) {
  return render(<UserApprovedEmail {...props} />);
}
