import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireApprovedPage } from "@/lib/auth";
import { SubmitWizard } from "./wizard";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireApprovedPage(locale, "/submit");

  const t = await getTranslations("Submit");

  return (
    <div className="container max-w-6xl py-9">
      <header className="mb-7 space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="text-[15px] text-muted-foreground">{t("subtitle")}</p>
      </header>
      <SubmitWizard isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
