import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubmitWizard } from "./wizard";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/submit");
  if (session.user.status !== "APPROVED") redirect("/pending");

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Submit a location</h1>
        <p className="text-sm text-muted-foreground">
          High-quality, verified spots earn 50 points after admin approval.
        </p>
      </header>
      <SubmitWizard />
    </div>
  );
}
