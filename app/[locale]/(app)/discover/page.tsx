import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { DiscoverClient } from "./client";

export const dynamic = "force-dynamic";

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Discover");
  const session = await auth();
  return (
    <Suspense
      fallback={
        <div className="container py-10">{t("loadingMap")}</div>
      }
    >
      <DiscoverClient loggedIn={!!session?.user} />
    </Suspense>
  );
}
