import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Status is read fresh from the DB, so once an admin approves the user this
  // page sends them on without a new sign-in.
  const session = await auth();
  if (session?.user?.status === "APPROVED") redirect(`/${locale}/discover`);
  const t = await getTranslations("Auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("pendingTitle")}</CardTitle>
        <CardDescription>{t("pendingDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {t("pendingHelper")}
      </CardContent>
    </Card>
  );
}
