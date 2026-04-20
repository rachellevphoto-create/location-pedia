import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ThanksPage() {
  return (
    <div className="container max-w-xl py-16">
      <Card>
        <CardHeader>
          <CardTitle>Submission received</CardTitle>
          <CardDescription>
            Thanks for contributing to PhotoLoc. An admin will review your
            submission shortly. You will be notified by email when it goes live.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild>
            <Link href="/discover">Back to discover</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/submit">Submit another</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
