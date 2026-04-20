import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BlockedPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access restricted</CardTitle>
        <CardDescription>
          Your PhotoLoc account is not active. If you believe this is in error,
          contact an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
