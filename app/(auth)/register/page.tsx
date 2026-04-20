import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "./form";

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join PhotoLoc</CardTitle>
        <CardDescription>
          Every account is reviewed by an admin to keep the community high-quality.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
