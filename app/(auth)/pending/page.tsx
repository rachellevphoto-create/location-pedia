import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Awaiting approval</CardTitle>
        <CardDescription>
          Your account is being reviewed by our team. We&rsquo;ll email you the
          moment you&rsquo;re approved (usually within a day).
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Make sure your portfolio link and teacher/school field are filled out
        on your profile - that helps us approve faster.
      </CardContent>
    </Card>
  );
}
