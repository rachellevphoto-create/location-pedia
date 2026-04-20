import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page doesn't exist - or the location is still in review.
      </p>
      <Button asChild className="mt-4">
        <Link href="/discover">Back to discover</Link>
      </Button>
    </div>
  );
}
