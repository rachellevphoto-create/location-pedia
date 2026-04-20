import { render } from "@react-email/components";
import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout";

export function LocationRejectedEmail({
  fullName,
  title,
  reason,
}: {
  fullName: string;
  title: string;
  reason?: string;
}) {
  return (
    <EmailLayout preview={`Submission update: ${title}`}>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>Hi {fullName},</Text>
      <Text>
        Your submission <strong>{title}</strong> was not approved.
        {reason ? ` Reason: ${reason}` : ""}
      </Text>
      <Text>You can submit a new location any time.</Text>
    </EmailLayout>
  );
}

export function renderLocationRejectedEmail(props: {
  fullName: string;
  title: string;
  reason?: string;
}) {
  return render(<LocationRejectedEmail {...props} />);
}
