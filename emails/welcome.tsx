import { render } from "@react-email/components";
import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout";

export function WelcomeEmail({ fullName }: { fullName: string }) {
  return (
    <EmailLayout preview="Welcome to PhotoLoc - awaiting approval">
      <Text style={{ fontSize: 18, fontWeight: 600 }}>Welcome, {fullName}.</Text>
      <Text>
        Thanks for signing up. To keep our community high-quality, every new
        photographer is reviewed by an admin before joining. We will email you as
        soon as your account is approved.
      </Text>
    </EmailLayout>
  );
}

export function renderWelcomeEmail(props: { fullName: string }) {
  return render(<WelcomeEmail {...props} />);
}
