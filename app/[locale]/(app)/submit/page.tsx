import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SubmitWizard } from "./wizard";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login?next=/${locale}/submit`);
  if (session.user.status !== "APPROVED") redirect(`/${locale}/pending`);

  const t = await getTranslations("Submit");

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>
      <SubmitWizard isAdmin={session.user.role === "ADMIN"} />
    </div>
  );
}
