import { Suspense } from "react";
import { DiscoverClient } from "./client";

export const dynamic = "force-dynamic";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="container py-10">Loading map...</div>}>
      <DiscoverClient />
    </Suspense>
  );
}
