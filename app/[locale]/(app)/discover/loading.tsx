import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("Discover");
  return (
    <div className="container py-10 text-sm text-muted-foreground">
      {t("loadingMap")}
    </div>
  );
}
