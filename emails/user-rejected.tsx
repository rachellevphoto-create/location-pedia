import { render } from "@react-email/components";
import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout";

export function UserRejectedEmail({
  fullName,
  reason,
}: {
  fullName: string;
  reason?: string;
}) {
  return (
    <EmailLayout preview="PhotoLoc account update">
      <Text style={{ fontSize: 18, fontWeight: 600 }}>Hi {fullName},</Text>
      <Text>
        We were unable to approve your PhotoLoc account at this time.
        {reason ? ` Reason: ${reason}` : ""}
      </Text>
      <Text>
        If you believe this is a mistake, reply to this email and our team will
        take another look.
      </Text>
    </EmailLayout>
  );
}

export function renderUserRejectedEmail(props: {
  fullName: string;
  reason?: string;
}) {
  return render(<UserRejectedEmail {...props} />);
}
